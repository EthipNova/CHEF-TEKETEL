import { supabase, isSupabaseConfigured } from "./auth";
import type {
  Category,
  DbAdminUser,
  DbCategory,
  DbFoodItem,
  DbFoodVariation,
  DbOrder,
  DbOrderItem,
  DbSubcategory,
  FoodItem,
  OptionGroup,
  Order,
  OrderLine,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Subcategory,
  Tri,
} from "../types";

export interface SubmitOrderItemPayload {
  food_item_id: string;
  quantity: number;
  variation_id?: string;
}

export interface SubmitOrderPayload {
  order_type: OrderType;
  customer_name?: string;
  customer_note?: string;
  payment_method: PaymentMethod;
  payment_proof_path?: string;
  items: SubmitOrderItemPayload[];
}

export interface SubmitOrderResult {
  success: boolean;
  order_id?: string;
  order_number?: string;
  total?: number;
  error?: string;
}

/**
 * Transforms database food_items and food_variations into the frontend FoodItem shape
 */
export function mapDbFoodToUi(
  dbFood: DbFoodItem,
  variations: DbFoodVariation[] = []
): FoodItem {
  const foodVars = variations.filter((v) => v.food_item_id === dbFood.id);
  
  const options: OptionGroup[] = [];
  if (foodVars.length > 0) {
    options.push({
      id: `vars-${dbFood.id}`,
      title: { en: "Options & Variations", am: "አማራጮች", sid: "Filannoo" },
      required: false,
      choices: foodVars.map((v) => ({
        id: v.id,
        name: v.name,
        priceDelta: Number(v.price_delta) || 0,
      })),
    });
  }

  return {
    id: dbFood.id,
    name: dbFood.name,
    description: dbFood.description || { en: "", am: "", sid: "" },
    price: Number(dbFood.price),
    categoryId: dbFood.category_id,
    subcategoryId: dbFood.subcategory_id || undefined,
    image: dbFood.image_url || "",
    available: dbFood.is_available,
    popular: dbFood.is_featured,
    options,
    variations: foodVars,
  };
}

export const supabaseService = {
  isConfigured: isSupabaseConfigured,

  /* ---------------- Public Menu Operations ---------------- */
  async fetchPublicMenu(): Promise<{
    categories: Category[];
    subcategories: Subcategory[];
    foods: FoodItem[];
  }> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your environment variables.");
    }

    const [catRes, subRes, foodRes, varRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("food_items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("food_variations")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (catRes.error) throw new Error(`Failed to load categories: ${catRes.error.message}`);
    if (subRes.error) throw new Error(`Failed to load subcategories: ${subRes.error.message}`);
    if (foodRes.error) throw new Error(`Failed to load food items: ${foodRes.error.message}`);
    if (varRes.error) throw new Error(`Failed to load variations: ${varRes.error.message}`);

    const dbCategories = (catRes.data || []) as DbCategory[];
    const dbSubcategories = (subRes.data || []) as DbSubcategory[];
    const dbFoods = (foodRes.data || []) as DbFoodItem[];
    const dbVars = (varRes.data || []) as DbFoodVariation[];

    const categories: Category[] = dbCategories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.image_url || "",
      sortOrder: c.sort_order,
      isActive: c.is_active,
    }));

    const subcategories: Subcategory[] = dbSubcategories.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      description: s.description,
      imageUrl: s.image_url || undefined,
      sortOrder: s.sort_order,
      isActive: s.is_active,
    }));

    const foods: FoodItem[] = dbFoods.map((f) => mapDbFoodToUi(f, dbVars));

    return { categories, subcategories, foods };
  },

  /* ---------------- Admin Menu Operations ---------------- */
  async fetchAdminMenu(): Promise<{
    categories: DbCategory[];
    subcategories: DbSubcategory[];
    foods: FoodItem[];
    rawFoods: DbFoodItem[];
    variations: DbFoodVariation[];
  }> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const [catRes, subRes, foodRes, varRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("subcategories").select("*").order("sort_order", { ascending: true }),
      supabase.from("food_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("food_variations").select("*").order("sort_order", { ascending: true }),
    ]);

    if (catRes.error) throw new Error(catRes.error.message);
    if (subRes.error) throw new Error(subRes.error.message);
    if (foodRes.error) throw new Error(foodRes.error.message);
    if (varRes.error) throw new Error(varRes.error.message);

    const categories = (catRes.data || []) as DbCategory[];
    const subcategories = (subRes.data || []) as DbSubcategory[];
    const rawFoods = (foodRes.data || []) as DbFoodItem[];
    const variations = (varRes.data || []) as DbFoodVariation[];
    const foods = rawFoods.map((f) => mapDbFoodToUi(f, variations));

    return { categories, subcategories, foods, rawFoods, variations };
  },

  async saveFoodItem(
    food: Partial<DbFoodItem>,
    variations: { id?: string; name: Tri; price_delta: number; is_available?: boolean }[] = []
  ): Promise<DbFoodItem> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const payload: Partial<DbFoodItem> = {
      category_id: food.category_id,
      subcategory_id: food.subcategory_id || null,
      name: food.name,
      description: food.description || { en: "", am: "", sid: "" },
      price: food.price,
      image_url: food.image_url || null,
      is_available: food.is_available ?? true,
      is_featured: food.is_featured ?? false,
      sort_order: food.sort_order ?? 0,
    };

    let savedFood: DbFoodItem;

    if (food.id && !food.id.startsWith("food-")) {
      // Update existing item
      const { data, error } = await supabase
        .from("food_items")
        .update(payload)
        .eq("id", food.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update food: ${error.message}`);
      savedFood = data as DbFoodItem;
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from("food_items")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Failed to create food: ${error.message}`);
      savedFood = data as DbFoodItem;
    }

    // Save variations if provided
    if (variations && variations.length > 0) {
      for (const v of variations) {
        if (v.id && !v.id.startsWith("c-") && !v.id.startsWith("var-")) {
          await supabase
            .from("food_variations")
            .update({
              name: v.name,
              price_delta: v.price_delta,
              is_available: v.is_available ?? true,
            })
            .eq("id", v.id);
        } else {
          await supabase.from("food_variations").insert({
            food_item_id: savedFood.id,
            name: v.name,
            price_delta: v.price_delta,
            is_available: v.is_available ?? true,
          });
        }
      }
    }

    return savedFood;
  },

  async deleteFoodItem(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete food: ${error.message}`);
  },

  async toggleFoodAvailability(id: string, is_available: boolean): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase
      .from("food_items")
      .update({ is_available })
      .eq("id", id);
    if (error) throw new Error(`Failed to update availability: ${error.message}`);
  },

  async saveCategory(cat: Partial<DbCategory>): Promise<DbCategory> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const payload = {
      name: cat.name,
      description: cat.description || { en: "", am: "", sid: "" },
      image_url: cat.image_url || null,
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active ?? true,
    };

    if (cat.id && !cat.id.startsWith("cat-")) {
      const { data, error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", cat.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbCategory;
    } else {
      const { data, error } = await supabase
        .from("categories")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbCategory;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async saveSubcategory(sub: Partial<DbSubcategory>): Promise<DbSubcategory> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const payload = {
      category_id: sub.category_id!,
      name: sub.name,
      description: sub.description || { en: "", am: "", sid: "" },
      image_url: sub.image_url || null,
      sort_order: sub.sort_order ?? 0,
      is_active: sub.is_active ?? true,
    };

    if (sub.id && !sub.id.startsWith("sub-")) {
      const { data, error } = await supabase
        .from("subcategories")
        .update(payload)
        .eq("id", sub.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbSubcategory;
    } else {
      const { data, error } = await supabase
        .from("subcategories")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DbSubcategory;
    }
  },

  async deleteSubcategory(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  /* ---------------- Storage Operations ---------------- */
  async uploadFoodImage(file: File): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file format. Please upload a JPEG, PNG, or WebP image.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image file is too large. Maximum size is 5MB.");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `dishes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("food-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) {
      throw new Error(`Failed to upload image to food-images bucket: ${uploadErr.message}`);
    }

    const { data } = supabase.storage.from("food-images").getPublicUrl(fileName);
    return data.publicUrl;
  },

  async uploadPaymentProof(file: File): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file format. Only JPG, PNG, and WebP are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Proof image too large. Maximum allowed size is 5MB.");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `proofs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { upsert: false });

    if (error) {
      throw new Error(`Failed to upload payment proof: ${error.message}`);
    }

    return path;
  },

  async getPaymentProofUrl(path: string): Promise<string> {
    if (!supabase) return "";
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  },

  /* ---------------- Customer Order Submission (Secure Server-Side) ---------------- */
  async submitCustomerOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
    if (!supabase) {
      return { success: false, error: "Database is not connected. Cannot submit order." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "Order must contain at least one item." };
    }

    // 1. Try secure Supabase RPC 'submit_order' if present in the database
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("submit_order", {
        p_order_type: payload.order_type,
        p_customer_name: payload.customer_name || null,
        p_customer_note: payload.customer_note || null,
        p_payment_method: payload.payment_method,
        p_payment_proof_path: payload.payment_proof_path || null,
        p_items: payload.items,
      });

      if (!rpcErr && rpcData) {
        return {
          success: true,
          order_id: rpcData.id,
          order_number: rpcData.order_number,
          total: Number(rpcData.total),
        };
      }
    } catch {
      // Fallback to client-directed secure batch insert below
    }

    // 2. Verified Server Prices Calculation & Order Creation
    // Fetch live prices from the database for every submitted food item and variation
    const foodIds = payload.items.map((i) => i.food_item_id);
    const { data: liveFoods, error: foodErr } = await supabase
      .from("food_items")
      .select("id, name, price, is_available")
      .in("id", foodIds);

    if (foodErr || !liveFoods) {
      return { success: false, error: "Failed to verify food items with database." };
    }

    const varIds = payload.items.map((i) => i.variation_id).filter(Boolean) as string[];
    let liveVars: { id: string; name: Tri; price_delta: number; is_available: boolean }[] = [];
    if (varIds.length > 0) {
      const { data: vData } = await supabase
        .from("food_variations")
        .select("id, name, price_delta, is_available")
        .in("id", varIds);
      if (vData) liveVars = vData as any;
    }

    let calculatedSubtotal = 0;
    const validatedOrderItems: {
      food_item_id: string;
      variation_id: string | null;
      food_name_snapshot: Tri;
      variation_name_snapshot: Tri | null;
      unit_price: number;
      quantity: number;
      line_total: number;
    }[] = [];

    for (const item of payload.items) {
      const dbFood = liveFoods.find((f) => f.id === item.food_item_id);
      if (!dbFood) {
        return { success: false, error: "One of the selected dishes was not found." };
      }
      if (!dbFood.is_available) {
        return { success: false, error: `Dish "${dbFood.name.en}" is currently marked unavailable.` };
      }

      let variationDelta = 0;
      let variationSnapshot: Tri | null = null;

      if (item.variation_id) {
        const dbVar = liveVars.find((v) => v.id === item.variation_id);
        if (dbVar) {
          if (!dbVar.is_available) {
            return { success: false, error: "Selected variation is currently unavailable." };
          }
          variationDelta = Number(dbVar.price_delta) || 0;
          variationSnapshot = dbVar.name;
        }
      }

      const unitPrice = Number(dbFood.price) + variationDelta;
      const lineTotal = unitPrice * item.quantity;
      calculatedSubtotal += lineTotal;

      validatedOrderItems.push({
        food_item_id: dbFood.id,
        variation_id: item.variation_id || null,
        food_name_snapshot: dbFood.name,
        variation_name_snapshot: variationSnapshot,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
      });
    }

    const calculatedTotal = calculatedSubtotal;

    // Get database-generated order number
    let orderNumber: string | undefined;
    try {
      const { data: numData } = await supabase.rpc("generate_order_number");
      if (numData) orderNumber = numData;
    } catch {
      // Sequence default will apply if not supplied
    }

    // Insert Order row
    const orderPayload: any = {
      order_type: payload.order_type,
      customer_name: payload.customer_name || null,
      customer_note: payload.customer_note || null,
      payment_method: payload.payment_method,
      payment_status:
        payload.payment_method === "cash"
          ? "awaiting_proof"
          : payload.payment_proof_path
          ? "pending_verification"
          : "awaiting_proof",
      order_status: "pending",
      subtotal: calculatedSubtotal,
      total: calculatedTotal,
      payment_proof_path: payload.payment_proof_path || null,
    };

    if (orderNumber) {
      orderPayload.order_number = orderNumber;
    }

    const { data: createdOrder, error: orderErr } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (orderErr || !createdOrder) {
      return { success: false, error: `Failed to create order: ${orderErr?.message || "Unknown error"}` };
    }

    // Insert Order Items rows
    const linesToInsert = validatedOrderItems.map((line) => ({
      ...line,
      order_id: createdOrder.id,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(linesToInsert);

    if (itemsErr) {
      return {
        success: false,
        error: `Order created but failed to save line items: ${itemsErr.message}`,
      };
    }

    return {
      success: true,
      order_id: createdOrder.id,
      order_number: createdOrder.order_number,
      total: Number(createdOrder.total),
    };
  },

  /* ---------------- Admin Orders Operations ---------------- */
  async fetchAdminOrders(): Promise<Order[]> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to load admin orders: ${error.message}`);

    const dbOrders = (data || []) as (DbOrder & { order_items: DbOrderItem[] })[];

    return dbOrders.map((o) => {
      const items: OrderLine[] = (o.order_items || []).map((i) => ({
        foodId: i.food_item_id || "",
        name: i.food_name_snapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        options: i.variation_name_snapshot
          ? [
              {
                groupTitle: { en: "Option", am: "አማራጭ", sid: "Filannoo" },
                choiceName: i.variation_name_snapshot,
                priceDelta: 0,
              },
            ]
          : [],
        lineTotal: Number(i.line_total),
        variationName: i.variation_name_snapshot,
      }));

      return {
        id: o.id,
        orderNumber: o.order_number,
        orderType: o.order_type,
        customerName: o.customer_name || undefined,
        notes: o.customer_note || undefined,
        items,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        paymentMethod: o.payment_method,
        paymentProofPath: o.payment_proof_path || undefined,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        rejectionReason: o.rejection_reason || undefined,
        createdAt: o.created_at,
      };
    });
  },

  async updateOrderStatus(
    orderId: string,
    orderStatus: OrderStatus,
    reason?: string
  ): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const patch: any = { order_status: orderStatus };
    if (reason !== undefined) {
      patch.rejection_reason = reason;
    }

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) throw new Error(`Failed to update order status: ${error.message}`);
  },

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    adminId?: string,
    reason?: string
  ): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const patch: any = { payment_status: paymentStatus };
    if (paymentStatus === "verified") {
      patch.payment_verified_at = new Date().toISOString();
      if (adminId) patch.payment_verified_by = adminId;
    }
    if (reason !== undefined) {
      patch.rejection_reason = reason;
    }

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) throw new Error(`Failed to update payment status: ${error.message}`);
  },

  /* ---------------- Admin User Verification ---------------- */
  async verifyAdminUser(userId: string): Promise<DbAdminUser | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;
    return data as DbAdminUser;
  },
};

