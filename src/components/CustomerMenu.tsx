import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MapPin, Minus, Plus, RefreshCw, Search, ShoppingBag, Star, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { formatETB, LanguageSwitcher, useCart, useLang, useStore } from "../context/AppContext";
import type { FoodItem, SelectedOption } from "../types";

const MenuHeader: React.FC = () => {
  const { tr } = useLang();
  const { settings } = useStore();
  return (
    <header className="sticky top-0 z-30 bg-[#123D2B] text-white shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#D4AF37] text-[#123D2B]">
            <UtensilsCrossed className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-[0.14em]">{tr(settings.brandName)}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#D4AF37]/90">Cafe &amp; Restaurant</p>
          </div>
        </div>
        <LanguageSwitcher tone="dark" />
      </div>
    </header>
  );
};

const FoodCard: React.FC<{ food: FoodItem; onOpen: (f: FoodItem) => void }> = ({ food, onOpen }) => {
  const { tr, t } = useLang();
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => food.available && onOpen(food)}
      disabled={!food.available}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#123D2B]/8 bg-white text-left shadow-sm transition hover:shadow-md active:scale-[0.99] disabled:opacity-60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E8F3EE]">
        {food.image ? (
          <img
            src={food.image}
            alt={tr(food.name)}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#E8F3EE] text-[#123D2B]/30">
            <UtensilsCrossed className="h-8 w-8" />
          </div>
        )}
        {food.popular && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#D4AF37] px-2 py-0.5 text-[10px] font-bold text-[#123D2B] shadow-sm">
            <Star className="h-3 w-3 fill-[#123D2B]" /> {t("popular")}
          </span>
        )}
        {!food.available && (
          <span className="absolute inset-0 grid place-items-center bg-[#123D2B]/60 text-xs font-semibold text-white">
            {t("unavailable")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 font-semibold text-[#123D2B]">{tr(food.name)}</h3>
        <p className="line-clamp-2 text-xs leading-snug text-slate-500">{tr(food.description)}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-[#123D2B]">{formatETB(food.price)}</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#123D2B] text-white transition group-hover:bg-[#1a5740]">
            <Plus className="h-4 w-4" />
          </span>
        </div>
      </div>
    </motion.button>
  );
};

const FoodModal: React.FC<{ food: FoodItem; onClose: () => void }> = ({ food, onClose }) => {
  const { tr, t } = useLang();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    food.options?.forEach((g) => {
      if (g.required && g.choices[0]) init[g.id] = g.choices[0].id;
    });
    return init;
  });

  const chosenOptions: SelectedOption[] = useMemo(() => {
    const out: SelectedOption[] = [];
    food.options?.forEach((g) => {
      const choiceId = selected[g.id];
      const choice = g.choices.find((c) => c.id === choiceId);
      if (choice) {
        out.push({
          groupTitle: g.title,
          choiceName: choice.name,
          priceDelta: choice.priceDelta,
          variationId: choice.id,
        });
      }
    });
    return out;
  }, [food, selected]);

  const unitPrice = food.price + chosenOptions.reduce((s, o) => s + o.priceDelta, 0);

  const handleAdd = () => {
    const missing = food.options?.some((g) => g.required && !selected[g.id]);
    if (missing) {
      toast.error(t("requiredField"));
      return;
    }

    const matchedVariationId = chosenOptions.find((o) => o.variationId)?.variationId;

    add({
      foodId: food.id,
      name: food.name,
      image: food.image,
      unitPrice,
      quantity: qty,
      options: chosenOptions,
      variationId: matchedVariationId,
    });
    toast.success(`${tr(food.name)} ${t("addToCart").toLowerCase()}`);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#06120c]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[#E8F3EE]">
          {food.image ? (
            <img src={food.image} alt={tr(food.name)} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[#123D2B]/30">
              <UtensilsCrossed className="h-12 w-12" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#123D2B] shadow-sm active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-[#123D2B]">{tr(food.name)}</h2>
              <span className="whitespace-nowrap rounded-full bg-[#E8F3EE] px-2.5 py-1 text-sm font-bold text-[#123D2B]">
                {formatETB(food.price)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{tr(food.description)}</p>
          </div>

          {food.options?.map((g) => (
            <div key={g.id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#123D2B]/70">
                {tr(g.title)}
                {g.required && <span className="text-rose-500"> *</span>}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {g.choices.map((c) => {
                  const active = selected[g.id] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelected((p) => ({ ...p, [g.id]: active && !g.required ? "" : c.id }))
                      }
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                        active
                          ? "border-[#123D2B] bg-[#E8F3EE] font-semibold text-[#123D2B]"
                          : "border-slate-200 text-slate-600 hover:border-[#123D2B]/40"
                      }`}
                    >
                      <span>{tr(c.name)}</span>
                      {c.priceDelta > 0 && <span className="text-xs text-[#123D2B]/70">+{c.priceDelta} ETB</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-2xl bg-[#E8F3EE]/70 p-3">
            <span className="text-sm font-semibold text-[#123D2B]">{t("quantity")}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#123D2B] shadow-sm active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-bold text-[#123D2B]">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#123D2B] text-white shadow-sm active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-between rounded-2xl bg-[#123D2B] px-4 py-3.5 font-semibold text-white transition hover:bg-[#1a5740] active:scale-[0.99]"
          >
            <span>{t("addToCart")}</span>
            <span className="text-[#D4AF37]">{formatETB(unitPrice * qty)}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FloatingCart: React.FC = () => {
  const { count, subtotal } = useCart();
  const { t } = useLang();
  const navigate = useNavigate();
  if (count === 0) return null;
  return (
    <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-5xl px-4 pb-4">
      <button
        onClick={() => navigate("/order/cart")}
        className="flex w-full items-center justify-between rounded-2xl bg-[#123D2B] px-5 py-3.5 text-white shadow-2xl transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#D4AF37] px-1 text-[10px] font-bold text-[#123D2B]">
              {count}
            </span>
          </span>
          {t("viewCart")}
        </span>
        <span className="font-bold text-[#D4AF37]">{formatETB(subtotal)}</span>
      </button>
    </motion.div>
  );
};

export const CustomerMenu: React.FC = () => {
  const { tr, t } = useLang();
  const { foods, categories, subcategories, settings, loading, error, refreshMenu } = useStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);

  // Available subcategories for the selected category
  const visibleSubcategories = useMemo(() => {
    if (activeCategory === "all") return [];
    return subcategories.filter((s) => s.categoryId === activeCategory);
  }, [subcategories, activeCategory]);

  // Filter food items based on category, subcategory, search, and availability
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((f) => {
      // Category filter
      if (activeCategory !== "all" && f.categoryId !== activeCategory) {
        return false;
      }
      // Subcategory filter
      if (activeSubcategory !== "all" && f.subcategoryId !== activeSubcategory) {
        return false;
      }
      // Text search
      if (q) {
        const match = [f.name.en, f.name.am, f.name.sid, f.description.en, f.description.am, f.description.sid]
          .filter(Boolean)
          .some((text) => text.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [foods, activeCategory, activeSubcategory, search]);

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6] pb-28">
      <MenuHeader />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-[#123D2B] px-4 pb-8 pt-6 text-white">
        {settings.logo && (
          <img src={settings.logo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#123D2B] via-[#123D2B]/80 to-[#123D2B]/40" />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" /> {t("welcomeTo")} {tr(settings.brandName)}
          </span>
          <h1 className="mt-3 max-w-md text-2xl font-bold leading-tight sm:text-3xl">{t("scanQr")}</h1>
          <p className="mt-1.5 max-w-md text-sm text-white/70">{tr(settings.tagline)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" /> Open · 7:00 - 22:00
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <MapPin className="h-3.5 w-3.5" /> Table service &amp; takeaway
            </span>
          </div>
        </div>
      </section>

      {/* Sticky Search and Category Filters */}
      <div className="sticky top-[57px] z-20 border-b border-[#123D2B]/8 bg-[#F6F8F6]/95 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-2.5 px-4 py-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchFood")}
              className="w-full rounded-full border border-[#123D2B]/10 bg-white py-2 pl-9 pr-4 text-sm text-[#123D2B] outline-none focus:border-[#123D2B]/40 shadow-sm"
            />
          </div>

          {/* Categories bar if categories exist */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setActiveSubcategory("all");
                }}
                className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                  activeCategory === "all"
                    ? "bg-[#123D2B] text-white shadow-sm"
                    : "bg-white text-[#123D2B]/70 hover:bg-[#E8F3EE] border border-slate-200"
                }`}
              >
                {t("all")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(c.id);
                    setActiveSubcategory("all");
                  }}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    activeCategory === c.id
                      ? "bg-[#123D2B] text-white shadow-sm"
                      : "bg-white text-[#123D2B]/70 hover:bg-[#E8F3EE] border border-slate-200"
                  }`}
                >
                  {tr(c.name)}
                </button>
              ))}
            </div>
          )}

          {/* Subcategories bar if category is selected and has subcategories */}
          {visibleSubcategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveSubcategory("all")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition ${
                  activeSubcategory === "all"
                    ? "bg-[#D4AF37] text-[#123D2B] font-bold"
                    : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {t("all")}
              </button>
              {visibleSubcategories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSubcategory(s.id)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition ${
                    activeSubcategory === s.id
                      ? "bg-[#D4AF37] text-[#123D2B] font-bold"
                      : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tr(s.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#123D2B]">
              {activeCategory === "all"
                ? t("mainDishes")
                : tr(categories.find((c) => c.id === activeCategory)?.name) || t("mainDishes")}
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} {t("items")}
            </p>
          </div>
          <button
            onClick={() => refreshMenu()}
            title="Refresh menu"
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#123D2B] shadow-sm hover:bg-[#E8F3EE] active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#123D2B]" : "text-slate-500"}`} />
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3">
                <div className="aspect-[4/3] rounded-xl bg-slate-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-4 w-16 rounded bg-slate-100" />
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 text-rose-400" />
            <h3 className="font-bold text-rose-800">Unable to load menu</h3>
            <p className="mt-1 text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => refreshMenu()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#123D2B]/15 bg-white py-16 text-center px-4">
            <UtensilsCrossed className="mb-3 h-10 w-10 text-[#123D2B]/30" />
            <p className="font-semibold text-[#123D2B]">{t("noResults")}</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              {foods.length === 0
                ? "No dishes have been added to the database yet. You can add dishes through the Admin Portal or by running the database seed script in the Supabase SQL Editor."
                : "No dishes matched your filter or search query."}
            </p>
          </div>
        )}

        {/* Dishes Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((f) => (
              <FoodCard key={f.id} food={f} onOpen={setActiveFood} />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>{activeFood && <FoodModal food={activeFood} onClose={() => setActiveFood(null)} />}</AnimatePresence>
      <FloatingCart />
    </div>
  );
};
