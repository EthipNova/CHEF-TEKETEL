export type Lang = "en" | "am" | "sid";

export interface Tri {
  en: string;
  am: string;
  sid: string;
}

export type OrderType = "dine_in" | "takeaway";
export type PaymentMethod = "cash" | "telebirr" | "bank_transfer";
export type PaymentStatus =
  | "awaiting_proof"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled";

/* ---------------- Database Schema Models ---------------- */

export interface DbCategory {
  id: string;
  name: Tri;
  description: Tri;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbSubcategory {
  id: string;
  category_id: string;
  name: Tri;
  description: Tri;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbFoodItem {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: Tri;
  description: Tri;
  image_url: string | null;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbFoodVariation {
  id: string;
  food_item_id: string;
  name: Tri;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_note: string | null;
  order_type: OrderType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  subtotal: number;
  total: number;
  payment_proof_path: string | null;
  payment_verified_by: string | null;
  payment_verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  food_item_id: string | null;
  variation_id: string | null;
  food_name_snapshot: Tri;
  variation_name_snapshot: Tri | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at?: string;
}

export interface DbOrderStatusHistory {
  id: string;
  order_id: string;
  old_order_status: OrderStatus | null;
  new_order_status: OrderStatus | null;
  old_payment_status: PaymentStatus | null;
  new_payment_status: PaymentStatus | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface DbAdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/* ---------------- Application UI Models & View Models ---------------- */

export interface OptionChoice {
  id: string;
  name: Tri;
  priceDelta: number;
}

export interface OptionGroup {
  id: string;
  title: Tri;
  required?: boolean;
  choices: OptionChoice[];
}

export interface FoodItem {
  id: string;
  name: Tri;
  description: Tri;
  price: number;
  categoryId?: string;
  subcategoryId?: string;
  image: string;
  available: boolean;
  popular?: boolean;
  options?: OptionGroup[];
  variations?: DbFoodVariation[];
}

export interface Category {
  id: string;
  name: Tri;
  image: string;
  description?: Tri;
  sortOrder?: number;
  isActive?: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: Tri;
  description?: Tri;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SelectedOption {
  groupTitle: Tri;
  choiceName: Tri;
  priceDelta: number;
  variationId?: string;
}

export interface CartItem {
  lineId: string;
  foodId: string;
  name: Tri;
  image: string;
  unitPrice: number;
  quantity: number;
  options: SelectedOption[];
  variationId?: string;
}

export interface OrderLine {
  foodId: string;
  name: Tri;
  quantity: number;
  unitPrice: number;
  options: SelectedOption[];
  lineTotal: number;
  variationId?: string;
  variationName?: Tri | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  customerName?: string;
  notes?: string;
  items: OrderLine[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentScreenshot?: string;
  paymentProofPath?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface CafeSettings {
  brandName: Tri;
  tagline: Tri;
  logo: string;
  telebirrNumber: string;
  telebirrName: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  paymentInstructions: Tri;
  orderIntake: boolean;
  currency: string;
  taxRate: number;
}

export const isMainDish = (f: FoodItem): boolean =>
  !f.categoryId || f.categoryId === "cat-mains" || f.categoryId === "main";
