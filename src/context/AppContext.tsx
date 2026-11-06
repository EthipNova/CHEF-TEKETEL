import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, Category, CafeSettings, FoodItem, Lang, Order, SelectedOption, Subcategory, Tri, DbFoodVariation, DbCategory, DbSubcategory } from "../types";
import { DEFAULT_SETTINGS, DICT } from "../data";
import { authService, AuthUser, PasswordChangeParams } from "../lib/auth";
import { supabaseService } from "../lib/supabaseService";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ---------------- Language ---------------- */
interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tr: (v: Tri | undefined) => string;
}
const LanguageContext = createContext<LangCtx | null>(null);

/* ---------------- Store ---------------- */
interface StoreCtx {
  foods: FoodItem[];
  categories: Category[];
  subcategories: Subcategory[];
  settings: CafeSettings;
  orders: Order[];
  loading: boolean;
  ordersLoading: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  saveFood: (f: FoodItem, variations?: DbFoodVariation[]) => Promise<void>;
  deleteFood: (id: string) => Promise<void>;
  toggleFoodAvailability: (id: string, isAvailable: boolean) => Promise<void>;
  saveCategory: (c: Category | Partial<DbCategory>) => Promise<DbCategory>;
  deleteCategory: (id: string) => Promise<void>;
  saveSubcategory: (s: Subcategory | Partial<DbSubcategory>) => Promise<DbSubcategory>;
  deleteSubcategory: (id: string) => Promise<void>;
  saveSettings: (s: CafeSettings) => void;
  addOrder: (o: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => Promise<void>;
  newOrderNumber: () => Promise<string>;
}
const StoreContext = createContext<StoreCtx | null>(null);

/* ---------------- Cart ---------------- */
interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, "lineId">) => void;
  setQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}
const CartContext = createContext<CartCtx | null>(null);

/* ---------------- Admin auth ---------------- */
export interface AuthCtx {
  isAuth: boolean;
  user: AuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  isAdminVerified: boolean;
  login: (email: string, pw: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (params: PasswordChangeParams) => Promise<{ success: boolean; error?: string }>;
}
const AuthContext = createContext<AuthCtx | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => read<Lang>("tk_lang", "en"));
  const [settings, setSettings] = useState<CafeSettings>(() => read("tk_settings", DEFAULT_SETTINGS));
  const [items, setItems] = useState<CartItem[]>(() => read<CartItem[]>("tk_cart", []));

  // Live Database State (Supabase as Single Source of Truth)
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Secure Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Clean any legacy insecure plaintext auth flag from localStorage
  useEffect(() => {
    localStorage.removeItem("tk_auth");
  }, []);

  // Check admin verification against admin_users table
  const checkAdminStatus = useCallback(async (authUser: AuthUser | null): Promise<boolean> => {
    if (!authUser) {
      setIsAdminVerified(false);
      return false;
    }

    if (!supabaseService.isConfigured()) {
      // Dev mode fallback
      setIsAdminVerified(true);
      return true;
    }

    try {
      const adminRecord = await supabaseService.verifyAdminUser(authUser.id);
      const active = Boolean(adminRecord && adminRecord.is_active);
      setIsAdminVerified(active);
      return active;
    } catch {
      setIsAdminVerified(false);
      return false;
    }
  }, []);

  // Initialize and listen to auth state changes
  useEffect(() => {
    let mounted = true;
    authService.getSession().then(async ({ user }) => {
      if (mounted) {
        setUser(user);
        setIsAuth(Boolean(user));
        if (user) {
          await checkAdminStatus(user);
        }
        setAuthLoading(false);
      }
    });

    const unsubscribe = authService.onAuthStateChange(async (authUser) => {
      if (mounted) {
        setUser(authUser);
        setIsAuth(Boolean(authUser));
        if (authUser) {
          await checkAdminStatus(authUser);
        } else {
          setIsAdminVerified(false);
        }
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [checkAdminStatus]);

  // Fetch Public Menu from Supabase
  const refreshMenu = useCallback(async () => {
    setMenuLoading(true);
    setError(null);
    try {
      if (!supabaseService.isConfigured()) {
        throw new Error("Supabase is not configured. Please check your .env configuration.");
      }
      const data = await supabaseService.fetchPublicMenu();
      setCategories(data.categories);
      setSubcategories(data.subcategories);
      setFoods(data.foods);
    } catch (err: any) {
      console.error("Error loading menu from Supabase:", err);
      setError(err?.message || "Failed to load menu from database.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  // Initial menu load
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);

  // Fetch Admin Orders from Supabase when authenticated
  const refreshOrders = useCallback(async () => {
    if (!isAuth) return;
    setOrdersLoading(true);
    try {
      const liveOrders = await supabaseService.fetchAdminOrders();
      setOrders(liveOrders);
    } catch (err: any) {
      console.error("Error loading orders from Supabase:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) {
      refreshOrders();
    }
  }, [isAuth, refreshOrders]);

  // Client storage persistence for UI settings, cart, and language
  const persist = (key: string, value: unknown) => write(key, value);
  useEffect(() => persist("tk_settings", settings), [settings]);
  useEffect(() => persist("tk_cart", items), [items]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write("tk_lang", l);
  }, []);

  const t = useCallback((key: string) => DICT[key]?.[lang] ?? key, [lang]);
  const tr = useCallback((v: Tri | undefined) => (v ? v[lang] || v.en : ""), [lang]);

  const langValue = useMemo<LangCtx>(() => ({ lang, setLang, t, tr }), [lang, setLang, t, tr]);

  const storeValue = useMemo<StoreCtx>(
    () => ({
      foods,
      categories,
      subcategories,
      settings,
      orders,
      loading: menuLoading,
      ordersLoading,
      error,
      refreshMenu,
      refreshOrders,
      saveFood: async (f, variations) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        await supabaseService.saveFoodItem(
          {
            id: f.id,
            category_id: f.categoryId || (categories[0]?.id ?? ""),
            subcategory_id: f.subcategoryId || null,
            name: f.name,
            description: f.description,
            image_url: f.image || null,
            price: f.price,
            is_available: f.available,
            is_featured: f.popular ?? false,
          },
          variations
        );
        await refreshMenu();
      },
      deleteFood: async (id) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        await supabaseService.deleteFoodItem(id);
        await refreshMenu();
      },
      toggleFoodAvailability: async (id, isAvailable) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        await supabaseService.toggleFoodAvailability(id, isAvailable);
        setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, available: isAvailable } : f)));
      },
      saveCategory: async (c) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        const result = await supabaseService.saveCategory({
          id: c.id,
          name: c.name,
          description: c.description,
          image_url: "image" in c ? c.image : (c as any).image_url,
          sort_order: (c as any).sortOrder ?? (c as any).sort_order ?? 0,
          is_active: (c as any).isActive ?? (c as any).is_active ?? true,
        });
        await refreshMenu();
        return result;
      },
      deleteCategory: async (id) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        await supabaseService.deleteCategory(id);
        await refreshMenu();
      },
      saveSubcategory: async (s) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        const catId = "categoryId" in s ? s.categoryId : s.category_id;
        const result = await supabaseService.saveSubcategory({
          id: s.id,
          category_id: catId!,
          name: s.name,
          description: s.description,
          image_url: (s as any).imageUrl || (s as any).image_url,
          sort_order: (s as any).sortOrder ?? (s as any).sort_order ?? 0,
          is_active: (s as any).isActive ?? (s as any).is_active ?? true,
        });
        await refreshMenu();
        return result;
      },
      deleteSubcategory: async (id) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        await supabaseService.deleteSubcategory(id);
        await refreshMenu();
      },
      saveSettings: (s) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        setSettings(s);
      },
      addOrder: (o) => setOrders((prev) => [o, ...prev]),
      updateOrder: async (id, patch) => {
        if (!isAuth) throw new Error("Unauthorized: Admin authentication required.");
        if (patch.orderStatus) {
          await supabaseService.updateOrderStatus(id, patch.orderStatus, patch.rejectionReason);
        }
        if (patch.paymentStatus) {
          await supabaseService.updatePaymentStatus(
            id,
            patch.paymentStatus,
            user?.id,
            patch.rejectionReason
          );
        }
        await refreshOrders();
      },
      newOrderNumber: async () => {
        try {
          const res = await supabaseService.submitCustomerOrder;
          // When called directly, retrieve sequence or timestamp fallback
          return `CT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        } catch {
          return `CT-${Date.now()}`;
        }
      },
    }),
    [foods, categories, subcategories, settings, orders, menuLoading, ordersLoading, error, refreshMenu, refreshOrders, isAuth, user]
  );

  const cartValue = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      add: (item) => {
        const optKey = JSON.stringify(item.options.map((o) => o.choiceName.en).sort());
        setItems((prev) => {
          const existing = prev.find(
            (p) => p.foodId === item.foodId && JSON.stringify(p.options.map((o) => o.choiceName.en).sort()) === optKey
          );
          if (existing) {
            return prev.map((p) =>
              p.lineId === existing.lineId ? { ...p, quantity: p.quantity + item.quantity } : p
            );
          }
          return [...prev, { ...item, lineId: uid("ln") }];
        });
      },
      setQty: (lineId, qty) =>
        setItems((prev) =>
          qty <= 0 ? prev.filter((p) => p.lineId !== lineId) : prev.map((p) => (p.lineId === lineId ? { ...p, quantity: qty } : p))
        ),
      remove: (lineId) => setItems((prev) => prev.filter((p) => p.lineId !== lineId)),
      clear: () => setItems([]),
    };
  }, [items]);

  const authValue = useMemo<AuthCtx>(
    () => ({
      isAuth,
      user,
      loading: authLoading,
      isConfigured: authService.isConfigured(),
      isAdminVerified,
      login: async (email, pw) => {
        const res = await authService.signIn(email, pw);
        if (res.success && res.user) {
          setUser(res.user);
          setIsAuth(true);
          const active = await checkAdminStatus(res.user);
          if (!active && supabaseService.isConfigured()) {
            return {
              success: false,
              error: "Access denied: Your account is not registered or active in the admin_users table.",
            };
          }
        }
        return res;
      },
      logout: async () => {
        await authService.signOut();
        setUser(null);
        setIsAuth(false);
        setIsAdminVerified(false);
      },
      changePassword: async (params) => {
        return authService.changePassword(params);
      },
    }),
    [isAuth, user, authLoading, isAdminVerified, checkAdminStatus]
  );

  return (
    <LanguageContext.Provider value={langValue}>
      <StoreContext.Provider value={storeValue}>
        <CartContext.Provider value={cartValue}>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </CartContext.Provider>
      </StoreContext.Provider>
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const c = useContext(LanguageContext);
  if (!c) throw new Error("useLang must be used within AppProvider");
  return c;
};

export const useStore = () => {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within AppProvider");
  return c;
};

export const useCart = () => {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used within AppProvider");
  return c;
};

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used within AppProvider");
  return c;
};

export const LanguageSwitcher: React.FC<{ tone?: "light" | "dark" }> = ({ tone = "dark" }) => {
  const { lang, setLang } = useLang();
  const base = "px-2 py-0.5 text-xs font-bold rounded-full transition";
  const lightActive = "bg-[#123D2B] text-white shadow-sm";
  const lightIdle = "text-[#123D2B]/60 hover:text-[#123D2B]";
  const darkActive = "bg-[#D4AF37] text-[#123D2B] shadow-sm";
  const darkIdle = "text-white/70 hover:text-white";

  const active = tone === "dark" ? darkActive : lightActive;
  const idle = tone === "dark" ? darkIdle : lightIdle;
  const border = tone === "dark" ? "border-white/15 bg-white/5" : "border-[#123D2B]/15 bg-white";

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border p-1 ${border}`}>
      {(["en", "am", "sid"] as Lang[]).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} className={`${base} ${lang === l ? active : idle}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export const formatETB = (n: number) => `${n.toLocaleString("en-US")} ETB`;
export type { SelectedOption };
