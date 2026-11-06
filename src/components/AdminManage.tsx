import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Pencil, Plus, Save, Trash2, X, UtensilsCrossed, Store, KeyRound, ShieldCheck, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang, useStore } from "../context/AppContext";
import { supabaseService } from "../lib/supabaseService";
import type { DbFoodVariation, FoodItem, OptionGroup, Tri } from "../types";

const emptyTri: Tri = { en: "", am: "", sid: "" };
const tri = (s: string): Tri => ({ en: s, am: s, sid: s });
const LANGS: { key: keyof Tri; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "am", label: "አማ" },
  { key: "sid", label: "SID" },
];

const TriField: React.FC<{ label: string; value: Tri; onChange: (v: Tri) => void; area?: boolean }> = ({ label, value, onChange, area }) => {
  const [active, setActive] = useState<keyof Tri>("en");
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-[#123D2B]/70">{label}</label>
        <div className="inline-flex overflow-hidden rounded-full border border-[#123D2B]/10">
          {LANGS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setActive(l.key)}
              className={`px-2 py-0.5 text-[10px] font-bold ${active === l.key ? "bg-[#123D2B] text-white" : "text-[#123D2B]/50"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {area ? (
        <textarea
          rows={2}
          value={value[active] || ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40"
        />
      ) : (
        <input
          value={value[active] || ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40"
        />
      )}
    </div>
  );
};

/* ---------------- Variations / Options Editor ---------------- */
const OptionEditor: React.FC<{ value: OptionGroup[]; onChange: (v: OptionGroup[]) => void }> = ({ value, onChange }) => {
  const { t } = useLang();
  const update = (idx: number, patch: Partial<OptionGroup>) =>
    onChange(value.map((g, i) => (i === idx ? { ...g, ...patch } : g)));

  return (
    <div className="space-y-2 rounded-xl bg-[#F6F8F6] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#123D2B]/70">{t("variations")}</span>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              { id: `g-${Date.now()}`, title: { en: "Options", am: "አማራጮች", sid: "Filannoo" }, required: false, choices: [] },
            ])
          }
          className="inline-flex items-center gap-1 rounded-full bg-[#123D2B] px-2.5 py-1 text-[10px] font-bold text-white active:scale-95"
        >
          <Plus className="h-3 w-3" /> {t("addOptionGroup")}
        </button>
      </div>

      {value.map((g, gi) => (
        <div key={g.id} className="rounded-lg border border-[#123D2B]/10 bg-white p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={g.title.en}
              onChange={(e) =>
                update(gi, {
                  title: { ...g.title, en: e.target.value, am: e.target.value, sid: e.target.value },
                })
              }
              placeholder={t("optionTitle")}
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-[#123D2B]/40"
            />
            <label className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <input type="checkbox" checked={!!g.required} onChange={(e) => update(gi, { required: e.target.checked })} /> req
            </label>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== gi))}
              className="text-rose-400 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 pl-2 border-l-2 border-[#123D2B]/10">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <input
                  value={c.name.en}
                  onChange={(e) =>
                    update(gi, {
                      choices: g.choices.map((x, i) => (i === ci ? { ...x, name: tri(e.target.value) } : x)),
                    })
                  }
                  placeholder={t("choiceName")}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#123D2B]/40"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">+</span>
                  <input
                    type="number"
                    value={c.priceDelta}
                    onChange={(e) =>
                      update(gi, {
                        choices: g.choices.map((x, i) => (i === ci ? { ...x, priceDelta: Number(e.target.value) || 0 } : x)),
                      })
                    }
                    placeholder="ETB"
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#123D2B]/40"
                  />
                  <span className="text-[10px] text-slate-400">ETB</span>
                </div>
                <button
                  type="button"
                  onClick={() => update(gi, { choices: g.choices.filter((_, i) => i !== ci) })}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update(gi, {
                  choices: [...g.choices, { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: emptyTri, priceDelta: 0 }],
                })
              }
              className="text-[10px] font-semibold text-[#123D2B] hover:underline"
            >
              + {t("addChoice")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------- Food Modal Form with Dual Image Handling ---------------- */
const FoodForm: React.FC<{ initial: FoodItem | null; onClose: () => void }> = ({ initial, onClose }) => {
  const { t } = useLang();
  const { categories, subcategories, saveFood } = useStore();

  const [form, setForm] = useState<FoodItem>(
    initial ?? {
      id: `food-${Date.now()}`,
      name: emptyTri,
      description: emptyTri,
      price: 0,
      categoryId: categories[0]?.id || "",
      subcategoryId: undefined,
      image: "",
      available: true,
      popular: false,
      options: [],
    }
  );

  // Dual Image Handling State
  const [imageMode, setImageMode] = useState<"upload" | "url">(initial?.image && !initial.image.includes("food-images") ? "url" : "upload");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initial?.image || "");
  const [saving, setSaving] = useState(false);

  // Filter subcategories for the selected category
  const filteredSubcategories = useMemo(() => {
    if (!form.categoryId) return [];
    return subcategories.filter((s) => s.categoryId === form.categoryId);
  }, [subcategories, form.categoryId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file format. Please upload JPEG, PNG, or WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    setFileToUpload(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImagePreview(url);
    setForm((prev) => ({ ...prev, image: url }));
  };

  const save = async () => {
    if (!form.name.en.trim() || !form.price) {
      toast.error(t("requiredField"));
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = form.image;

      // If user selected a file to upload from their computer
      if (imageMode === "upload" && fileToUpload) {
        try {
          finalImageUrl = await supabaseService.uploadFoodImage(fileToUpload);
        } catch (uploadErr: any) {
          toast.error(`Image upload failed: ${uploadErr.message}`);
          setSaving(false);
          return;
        }
      }

      // Convert options to food_variations rows for database
      const variationsToSave: DbFoodVariation[] = [];
      form.options?.forEach((g) => {
        g.choices.forEach((c) => {
          variationsToSave.push({
            id: c.id,
            food_item_id: form.id,
            name: c.name,
            price_delta: c.priceDelta,
            is_available: true,
            sort_order: 0,
          });
        });
      });

      await saveFood(
        {
          ...form,
          image: finalImageUrl,
          name: { ...form.name, am: form.name.am || form.name.en, sid: form.name.sid || form.name.en },
          description: {
            ...form.description,
            am: form.description.am || form.description.en,
            sid: form.description.sid || form.description.en,
          },
        },
        variationsToSave
      );

      toast.success(t("foodSaved"));
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save dish to database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#06120c]/60 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#123D2B]">{initial ? t("editFood") : t("addFood")}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <TriField label={t("dishName")} value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TriField label={t("dishDesc")} value={form.description} onChange={(description) => setForm({ ...form, description })} area />

          {/* Category & Subcategory Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("category")}</label>
              <select
                value={form.categoryId || ""}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: undefined })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40 bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">Subcategory</label>
              <select
                value={form.subcategoryId || ""}
                onChange={(e) => setForm({ ...form, subcategoryId: e.target.value || undefined })}
                disabled={filteredSubcategories.length === 0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40 bg-white disabled:opacity-50"
              >
                <option value="">None</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("priceEtb")}</label>
            <input
              type="number"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40"
              placeholder="e.g. 280"
            />
          </div>

          {/* Dual Image Handling: Upload vs URL with Live Preview */}
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#123D2B]/80">{t("foodImage")}</label>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
                    imageMode === "upload" ? "bg-[#123D2B] text-white font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="h-3 w-3" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
                    imageMode === "url" ? "bg-[#123D2B] text-white font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LinkIcon className="h-3 w-3" /> Image URL
                </button>
              </div>
            </div>

            {imageMode === "upload" ? (
              <div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#123D2B]/20 bg-white py-3 px-4 text-center transition hover:border-[#123D2B]/40">
                  <Upload className="h-5 w-5 text-[#123D2B]/60" />
                  <span className="mt-1 text-xs font-medium text-[#123D2B]">Click to browse from your computer</span>
                  <span className="text-[10px] text-slate-400">JPEG, PNG, or WebP (max 5MB)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="hidden" />
                </label>
              </div>
            ) : (
              <div>
                <input
                  value={form.image}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40 bg-white"
                />
              </div>
            )}

            {/* Live Image Preview */}
            {imagePreview && (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                <p className="mb-1 text-[10px] font-semibold text-slate-400 px-1">Image Preview:</p>
                <img
                  src={imagePreview}
                  alt="preview"
                  className="h-28 w-full rounded-lg object-cover"
                  onError={() => toast.error("Could not load preview from image URL.")}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, available: !form.available })}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                form.available ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
              }`}
            >
              {form.available ? `✓ ${t("available")}` : t("unavailable")}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, popular: !form.popular })}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                form.popular ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#8a6d1f]" : "border-slate-200 text-slate-500"
              }`}
            >
              {t("popular")}
            </button>
          </div>

          <OptionEditor value={form.options || []} onChange={(options) => setForm({ ...form, options })} />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#123D2B] py-3 font-semibold text-white active:scale-[0.99] disabled:opacity-60 hover:bg-[#1a5740]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving to Supabase..." : t("save")}
        </button>
      </motion.div>
    </motion.div>
  );
};

/* ---------------- Foods Manager List ---------------- */
export const FoodsManager: React.FC = () => {
  const { t, tr } = useLang();
  const { foods, categories, deleteFood, toggleFoodAvailability } = useStore();
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const displayedFoods = useMemo(() => {
    if (selectedCat === "all") return foods;
    return foods.filter((f) => f.categoryId === selectedCat);
  }, [foods, selectedCat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#123D2B]">{t("mainDishes")}</h1>
          <p className="text-sm text-slate-500">
            {displayedFoods.length} {t("items")} (Live Supabase)
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#123D2B] px-4 py-2 text-sm font-semibold text-white active:scale-95 hover:bg-[#1a5740] shadow-sm"
        >
          <Plus className="h-4 w-4" /> {t("addFood")}
        </button>
      </div>

      {/* Category filter tabs if categories exist */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setSelectedCat("all")}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedCat === "all" ? "bg-[#123D2B] text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCat === c.id ? "bg-[#123D2B] text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {tr(c.name)}
            </button>
          ))}
        </div>
      )}

      {displayedFoods.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[#123D2B]/15 bg-white py-16 text-sm text-slate-400">
          <UtensilsCrossed className="mb-2 h-8 w-8 text-[#123D2B]/30" />
          <p>{t("noFoods")}</p>
          <p className="mt-1 text-xs text-slate-400">Click &quot;Add Food&quot; above to create dishes in Supabase.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {displayedFoods.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-[#123D2B]/8 bg-white p-2.5 shadow-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#E8F3EE]">
                {f.image ? (
                  <img src={f.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#123D2B]/30">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#123D2B]">{tr(f.name)}</p>
                <p className="text-xs text-slate-400">
                  {f.price} ETB · {f.available ? t("available") : t("unavailable")}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await toggleFoodAvailability(f.id, !f.available);
                    toast.success(f.available ? "Marked as unavailable" : "Marked as available");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update availability.");
                  }
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                  f.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {f.available ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(f);
                  setOpen(true);
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#F6F8F6] text-[#123D2B] active:scale-95 hover:bg-[#E8F3EE]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete ${tr(f.name)}?`)) {
                    try {
                      await deleteFood(f.id);
                      toast.success(t("delete"));
                    } catch (err: any) {
                      toast.error(err.message || "Failed to delete dish.");
                    }
                  }
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 active:scale-95 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>{open && <FoodForm initial={editing} onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  );
};

/* ---------------- Settings ---------------- */
export const SettingsManager: React.FC = () => {
  const { t } = useLang();
  const { settings, saveSettings } = useStore();
  const [form, setForm] = useState(settings);
  const field = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40";

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-[#123D2B]" />
        <h1 className="text-xl font-extrabold text-[#123D2B]">{t("settings")}</h1>
      </div>

      <section className="space-y-3 rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
        <TriField label={t("brandName")} value={form.brandName} onChange={(brandName) => setForm({ ...form, brandName })} />
        <TriField label={t("tagline")} value={form.tagline} onChange={(tagline) => setForm({ ...form, tagline })} area />
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("logo")}</label>
          <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className={field} />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#123D2B]">{t("paymentMethod")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t("telebirrNumber")}</label>
            <input value={form.telebirrNumber} onChange={(e) => setForm({ ...form, telebirrNumber: e.target.value })} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t("telebirrName")}</label>
            <input value={form.telebirrName} onChange={(e) => setForm({ ...form, telebirrName: e.target.value })} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t("bankName")}</label>
            <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t("bankAccount")}</label>
            <input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} className={field} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">{t("bankAccountName")}</label>
            <input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} className={field} />
          </div>
        </div>
        <TriField label={t("paymentInstructions")} value={form.paymentInstructions} onChange={(paymentInstructions) => setForm({ ...form, paymentInstructions })} area />
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-[#123D2B] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t("security")}
          </p>
          <p className="text-xs text-slate-400">Update admin password and session credentials</p>
        </div>
        <Link
          to="/admin/security"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#123D2B]/5 px-3 py-1.5 text-xs font-semibold text-[#123D2B] hover:bg-[#123D2B]/10"
        >
          <KeyRound className="h-3.5 w-3.5" /> {t("changePassword")}
        </Link>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-[#123D2B]">{t("orderIntake")}</p>
          <p className="text-xs text-slate-400">Control incoming customer orders</p>
        </div>
        <button
          onClick={() => setForm({ ...form, orderIntake: !form.orderIntake })}
          className={`relative h-7 w-12 rounded-full transition ${form.orderIntake ? "bg-[#123D2B]" : "bg-slate-300"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${form.orderIntake ? "left-6" : "left-1"}`} />
        </button>
      </section>

      <button
        onClick={() => {
          saveSettings(form);
          toast.success(t("settingsSaved"));
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#123D2B] py-3 font-semibold text-white active:scale-[0.99] hover:bg-[#1a5740]"
      >
        <Save className="h-4 w-4" /> {t("save")}
      </button>
      <p className="text-center text-[11px] text-slate-400">
        <UtensilsCrossed className="mr-1 inline h-3 w-3" />
        CHEF TEKETEL · Database Powered
      </p>
    </div>
  );
};
