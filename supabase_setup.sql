-- ==============================================================================
-- CHEF TEKETEL - Supabase Foundation Setup & Migrations
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Storage Buckets Creation
-- ------------------------------------------------------------------------------

-- Create private bucket for customer payment screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880, -- 5 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Create public bucket for menu food dish images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-images',
  'food-images',
  true,
  5242880, -- 5 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ------------------------------------------------------------------------------
-- 2. Storage Row-Level Security Policies
-- ------------------------------------------------------------------------------

-- Allow public read access to food-images
DROP POLICY IF EXISTS "Public food images access" ON storage.objects;
CREATE POLICY "Public food images access" ON storage.objects
  FOR SELECT USING (bucket_id = 'food-images');

-- Allow authenticated active admins to manage food-images
DROP POLICY IF EXISTS "Admin food images management" ON storage.objects;
CREATE POLICY "Admin food images management" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'food-images' AND
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    bucket_id = 'food-images' AND
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true)
  );

-- Allow anonymous & authenticated customers to upload payment proofs
DROP POLICY IF EXISTS "Customer upload payment proofs" ON storage.objects;
CREATE POLICY "Customer upload payment proofs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Allow active admins to view payment proofs
DROP POLICY IF EXISTS "Admin view payment proofs" ON storage.objects;
CREATE POLICY "Admin view payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true)
  );

-- ------------------------------------------------------------------------------
-- 3. Server-Side Atomic Checkout Function (submit_order RPC)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_order(
  p_order_type public.order_type,
  p_customer_name text,
  p_customer_note text,
  p_payment_method public.payment_method,
  p_payment_proof_path text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_food_id uuid;
  v_var_id uuid;
  v_qty integer;
  v_food_price numeric(12,2);
  v_food_name jsonb;
  v_food_available boolean;
  v_var_price_delta numeric(12,2);
  v_var_name jsonb;
  v_var_available boolean;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_initial_pay_status public.payment_status;
BEGIN
  -- 1. Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- 2. Determine initial payment status
  IF p_payment_method = 'cash' THEN
    v_initial_pay_status := 'awaiting_proof';
  ELSIF p_payment_proof_path IS NOT NULL AND trim(p_payment_proof_path) <> '' THEN
    v_initial_pay_status := 'pending_verification';
  ELSE
    v_initial_pay_status := 'awaiting_proof';
  END IF;

  -- 3. Obtain next concurrency-safe order number
  v_order_number := public.generate_order_number();

  -- 4. Create base order row with 0 total initially
  INSERT INTO public.orders (
    order_number,
    customer_name,
    customer_note,
    order_type,
    payment_method,
    payment_status,
    order_status,
    subtotal,
    total,
    payment_proof_path
  ) VALUES (
    v_order_number,
    NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_note), ''),
    p_order_type,
    p_payment_method,
    v_initial_pay_status,
    'pending',
    0,
    0,
    NULLIF(trim(p_payment_proof_path), '')
  ) RETURNING id INTO v_order_id;

  -- 5. Process each item, reading current server prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_food_id := (v_item->>'food_item_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 1);
    v_var_id := NULLIF(v_item->>'variation_id', '')::uuid;

    IF v_qty < 1 OR v_qty > 100 THEN
      RAISE EXCEPTION 'Invalid quantity % for item %', v_qty, v_food_id;
    END IF;

    -- Lookup live food item from database
    SELECT price, name, is_available
    INTO v_food_price, v_food_name, v_food_available
    FROM public.food_items
    WHERE id = v_food_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Food item % was not found in the database.', v_food_id;
    END IF;

    IF NOT v_food_available THEN
      RAISE EXCEPTION 'Dish is currently unavailable for ordering.';
    END IF;

    v_unit_price := v_food_price;
    v_var_name := NULL;

    -- Lookup live variation if specified
    IF v_var_id IS NOT NULL THEN
      SELECT price_delta, name, is_available
      INTO v_var_price_delta, v_var_name, v_var_available
      FROM public.food_variations
      WHERE id = v_var_id AND food_item_id = v_food_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variation % does not belong to food %.', v_var_id, v_food_id;
      END IF;

      IF NOT v_var_available THEN
        RAISE EXCEPTION 'Selected variation is currently unavailable.';
      END IF;

      v_unit_price := v_unit_price + v_var_price_delta;
    END IF;

    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    -- Insert order item with historical snapshots
    INSERT INTO public.order_items (
      order_id,
      food_item_id,
      variation_id,
      food_name_snapshot,
      variation_name_snapshot,
      unit_price,
      quantity,
      line_total
    ) VALUES (
      v_order_id,
      v_food_id,
      v_var_id,
      v_food_name,
      v_var_name,
      v_unit_price,
      v_qty,
      v_line_total
    );
  END LOOP;

  v_total := v_subtotal;

  -- 6. Update order with verified server totals
  UPDATE public.orders
  SET subtotal = v_subtotal, total = v_total
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total', v_total
  );
END;
$$;

-- Grant execution to anonymous and authenticated users
REVOKE ALL ON FUNCTION public.submit_order(public.order_type, text, text, public.payment_method, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_order(public.order_type, text, text, public.payment_method, text, jsonb) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. Initial Admin User Provisioning Helper
-- ------------------------------------------------------------------------------

-- Ensure any existing authenticated users in auth.users are recognized in admin_users
INSERT INTO public.admin_users (id, email, full_name, is_active)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Administrator'), true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- ------------------------------------------------------------------------------
-- 5. Seed Initial Categories and Food Items (If tables are empty)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_cat_mains uuid;
  v_cat_breakfast uuid;
  v_cat_hot uuid;
  v_cat_cold uuid;
  v_cat_pastries uuid;
  v_food_tibs uuid;
  v_food_doro uuid;
  v_food_combo uuid;
  v_food_burger uuid;
  v_food_chechebsa uuid;
  v_food_firfir uuid;
  v_food_macchiato uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories) THEN
    -- Categories
    INSERT INTO public.categories (name, description, image_url, sort_order, is_active)
    VALUES ('{"en": "Main Dishes", "am": "ዋና ምግቦች", "sid": "Qixxeessa Nyaata"}'::jsonb, '{"en": "Authentic Ethiopian traditional and contemporary main meals.", "am": "ባህላዊና ዘመናዊ ዋና ምግቦች።", "sid": "Qixxeessa Nyaata."}'::jsonb, 'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/beef-tibs-0916369d-1793793258345.webp', 1, true)
    RETURNING id INTO v_cat_mains;

    INSERT INTO public.categories (name, description, image_url, sort_order, is_active)
    VALUES ('{"en": "Breakfast", "am": "ቁርስ", "sid": "Maalimmata"}'::jsonb, '{"en": "Morning energizers and traditional breakfasts.", "am": "ጣፋጭ የቁርስ አማራጮች።", "sid": "Maalimmata."}'::jsonb, 'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/chechebsa-f6614dab-1793793258671.webp', 2, true)
    RETURNING id INTO v_cat_breakfast;

    INSERT INTO public.categories (name, description, image_url, sort_order, is_active)
    VALUES ('{"en": "Cafe & Hot Drinks", "am": "ቡናና ሙቅ መጠጦች", "sid": "Bunaa & Hoqqaa"}'::jsonb, '{"en": "Traditional coffee, espresso and herbal teas.", "am": "ትኩስ መጠጦች።", "sid": "Bunaa & Hoqqaa."}'::jsonb, 'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/macchiato-e52ee519-1793793259052.webp', 3, true)
    RETURNING id INTO v_cat_hot;

    INSERT INTO public.categories (name, description, image_url, sort_order, is_active)
    VALUES ('{"en": "Cold Beverages", "am": "ቀዝቃዛ መጠጦች", "sid": "Qoqqowaa Dhugaatii"}'::jsonb, '{"en": "Fresh squeezed fruit juices and iced drinks.", "am": "ትኩስ ፍራፍሬ ጁስ።", "sid": "Juusee."}'::jsonb, 'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/fresh-juice-3d960c5d-1793793261831.webp', 4, true)
    RETURNING id INTO v_cat_cold;

    INSERT INTO public.categories (name, description, image_url, sort_order, is_active)
    VALUES ('{"en": "Pastries & Snacks", "am": "ፓስትሪና መክሰስ", "sid": "Paastirii & Meksa"}'::jsonb, '{"en": "Freshly baked pastries, croissants and desserts.", "am": "ትኩስ ዳቦዎችና ኬኮች።", "sid": "Keekke."}'::jsonb, 'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/pastry-1c9003ef-1793793262605.webp', 5, true)
    RETURNING id INTO v_cat_pastries;

    -- Food Items: Mains
    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_mains,
      '{"en": "Beef Tibs", "am": "የበሬ ጥብስ", "sid": "Hoolaa Tibsaa"}'::jsonb,
      '{"en": "Sizzling cubed beef sautéed with rosemary, onion and green chili.", "am": "በሮዝመሪና በአረንጓዴ ቃሪያ የተጠበሰ የበሬ ስጋ።", "sid": "Roozmerii fi qaariya waliin waadamu hoolaa fooni."}'::jsonb,
      320.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/beef-tibs-0916369d-1793793258345.webp',
      true,
      true,
      1
    ) RETURNING id INTO v_food_tibs;

    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_mains,
      '{"en": "Special Doro Wat", "am": "ልዩ ዶሮ ወጥ", "sid": "Addunyaa Lanchoo Wote"}'::jsonb,
      '{"en": "Slow-cooked chicken stew in rich berbere sauce served with boiled egg and injera.", "am": "በበርበሬ የተዘጋጀ የዶሮ ወጥ ከእንቁላል ጋር።", "sid": "Barbaree waliin lallabame lanchoo wote, kuulayya waliin."}'::jsonb,
      380.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/doro-wat-3253c3b3-1793793259002.webp',
      true,
      true,
      2
    ) RETURNING id INTO v_food_doro;

    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_mains,
      '{"en": "Beyaynetu Combo", "am": "በያይነቱ", "sid": "Baayyanneetoo"}'::jsonb,
      '{"en": "Injera platter with colourful lentil, chickpea, cabbage and vegetable stews.", "am": "እንጀራ ከተለያዩ ምስርና አትክልት ወጦች ጋር።", "sid": "Injeraa misira fi kuduraa wote waliin."}'::jsonb,
      300.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/injera-combo-f51c8dd1-1793793262980.webp',
      true,
      false,
      3
    ) RETURNING id INTO v_food_combo;

    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_mains,
      '{"en": "Gourmet Burger", "am": "ጎርሜት በርገር", "sid": "Goorameetee Beergarii"}'::jsonb,
      '{"en": "Pure beef patty with cheddar cheese, crisp lettuce and ripe tomatoes on brioche.", "am": "በቺዝ፣ ሰላጣና ቲማቲም የተጣመረ በርገር።", "sid": "Fooma, chiizii, saalaaxxaa fi tamaatimii waliin."}'::jsonb,
      350.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/gourmet-burger-a66ed585-1793793258897.webp',
      true,
      false,
      4
    ) RETURNING id INTO v_food_burger;

    -- Food Items: Breakfast
    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_breakfast,
      '{"en": "Chechebsa", "am": "ጨጨብሳ", "sid": "Ceecebsa"}'::jsonb,
      '{"en": "Shredded flatbread tossed in spiced clarified butter (kibe) and pure honey.", "am": "በቅመም ቅቤና ማር የተቀላቀለ ጨጨብሳ።", "sid": "Qoricha buutera fi damma waliin walaame qitta."}'::jsonb,
      150.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/chechebsa-f6614dab-1793793258671.webp',
      true,
      true,
      5
    ) RETURNING id INTO v_food_chechebsa;

    -- Food Items: Hot Drinks
    INSERT INTO public.food_items (category_id, name, description, price, image_url, is_available, is_featured, sort_order)
    VALUES (
      v_cat_hot,
      '{"en": "Teketel Macchiato", "am": "ተከተል ማኪያቶ", "sid": "Maakkiyaatoo Teketel"}'::jsonb,
      '{"en": "Rich double-shot espresso layered with silky textured milk.", "am": "ጥሩ ኤስፕሬሶ ከለስላሳ ወተት ጋር።", "sid": "Espireesoo mi''aawaa aannan waliin."}'::jsonb,
      70.00,
      'https://dala-prod-public-storage.s3.eu-west-1.amazonaws.com/generated-images/5f42c66b-302b-427c-8939-4503376c61ec/macchiato-e52ee519-1793793259052.webp',
      true,
      true,
      6
    ) RETURNING id INTO v_food_macchiato;

    -- Food Variations
    -- Tibs variations
    INSERT INTO public.food_variations (food_item_id, name, price_delta, is_available, sort_order)
    VALUES
      (v_food_tibs, '{"en": "Medium Spice", "am": "መካከለኛ ቅመም", "sid": "Giddugaleessa"}'::jsonb, 0, true, 1),
      (v_food_tibs, '{"en": "Extra Spicy (Awaze)", "am": "በአዋዜ የተጠበሰ", "sid": "Qoricha Awaze"}'::jsonb, 0, true, 2),
      (v_food_tibs, '{"en": "Extra Meat Portion", "am": "ተጨማሪ ስጋ", "sid": "Dabalata Fooni"}'::jsonb, 80.00, true, 3);

    -- Burger variations
    INSERT INTO public.food_variations (food_item_id, name, price_delta, is_available, sort_order)
    VALUES
      (v_food_burger, '{"en": "Double Patty", "am": "ድርብ ስጋ", "sid": "Diriba Fooma"}'::jsonb, 100.00, true, 1),
      (v_food_burger, '{"en": "Extra Cheddar Cheese", "am": "ተጨማሪ ቺዝ", "sid": "Dabalata Chiizii"}'::jsonb, 30.00, true, 2),
      (v_food_burger, '{"en": "Crispy French Fries Side", "am": "ጥብስ ድንች", "sid": "Dinnicha Waadamaa"}'::jsonb, 50.00, true, 3);

    -- Macchiato variations
    INSERT INTO public.food_variations (food_item_id, name, price_delta, is_available, sort_order)
    VALUES
      (v_food_macchiato, '{"en": "Large Size", "am": "ትልቅ መጠን", "sid": "Guddaa"}'::jsonb, 20.00, true, 1),
      (v_food_macchiato, '{"en": "Soy Milk", "am": "የሶያ ወተት", "sid": "Aannan Sooyaa"}'::jsonb, 15.00, true, 2);

  END IF;
END $$;

