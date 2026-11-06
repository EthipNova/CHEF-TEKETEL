import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Banknote, Check, ChevronLeft, Clock, Copy, CreditCard, Image as ImageIcon, Loader2, MapPin, Minus, Plus, ShoppingBag, Smartphone, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatETB, LanguageSwitcher, useCart, useLang, useStore } from "../context/AppContext";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../data";
import type { Order, OrderType, PaymentMethod } from "../types";
import { supabaseService } from "../lib/supabaseService";
import { supabase } from "../lib/auth";

const Header: React.FC<{ title: string; back: string }> = ({ title, back }) => (
  <header className="sticky top-0 z-30 bg-[#123D2B] text-white shadow-lg">
    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <Link to={back} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <LanguageSwitcher tone="dark" />
    </div>
  </header>
);

const EmptyCart: React.FC = () => {
  const { t } = useLang();
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-[#E8F3EE]">
        <ShoppingBag className="h-9 w-9 text-[#123D2B]/50" />
      </div>
      <p className="mt-4 text-lg font-semibold text-[#123D2B]">{t("emptyCart")}</p>
      <Link to="/order" className="mt-4 rounded-full bg-[#123D2B] px-6 py-2.5 text-sm font-semibold text-white active:scale-95">
        {t("browseMenu")}
      </Link>
    </div>
  );
};

export const CartView: React.FC = () => {
  const { tr, t } = useLang();
  const { items, setQty, remove, clear, subtotal } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#F6F8F6]">
        <Header title={t("yourCart")} back="/order" />
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6] pb-32">
      <Header title={t("yourCart")} back="/order" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{items.length} {t("items")}</span>
          <button onClick={clear} className="text-xs font-semibold text-rose-500 hover:underline">{t("clearCart")}</button>
        </div>

        <div className="space-y-2.5">
          {items.map((it) => (
            <motion.div
              key={it.lineId}
              layout
              className="flex items-center gap-3 rounded-2xl border border-[#123D2B]/8 bg-white p-3 shadow-sm"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#E8F3EE]">
                {it.image ? (
                  <img src={it.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#123D2B]/30 font-bold">CT</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-[#123D2B]">{tr(it.name)}</h4>
                {it.options.length > 0 && (
                  <p className="truncate text-[11px] text-slate-400">
                    {it.options.map((o) => tr(o.choiceName)).join(", ")}
                  </p>
                )}
                <p className="font-bold text-[#123D2B]">{formatETB(it.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(it.lineId, it.quantity - 1)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-[#E8F3EE] text-[#123D2B]"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-[#123D2B]">{it.quantity}</span>
                <button
                  onClick={() => setQty(it.lineId, it.quantity + 1)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-[#123D2B] text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(it.lineId)} className="ml-1 text-slate-300 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{t("subtotal")}</span>
            <span className="font-semibold text-[#123D2B]">{formatETB(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold text-[#123D2B]">
            <span>{t("total")}</span>
            <span>{formatETB(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl px-4 pb-4">
        <button
          onClick={() => navigate("/order/checkout")}
          className="flex w-full items-center justify-between rounded-2xl bg-[#123D2B] px-5 py-3.5 font-semibold text-white shadow-2xl active:scale-[0.99]"
        >
          <span>{t("proceedCheckout")}</span>
          <span className="text-[#D4AF37]">{formatETB(subtotal)}</span>
        </button>
      </div>
    </div>
  );
};

const AccountRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { t } = useLang();
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} ${t("copied")}`);
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-sm border border-slate-100">
      <div>
        <span className="text-[10px] text-slate-400 block">{label}</span>
        <span className="text-xs font-bold text-[#123D2B]">{value}</span>
      </div>
      <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-[#123D2B] px-2.5 py-1.5 text-[11px] font-semibold text-white active:scale-95">
        <Copy className="h-3 w-3" /> {t("copy")}
      </button>
    </div>
  );
};

export const CheckoutView: React.FC = () => {
  const { t, tr } = useLang();
  const { items, subtotal, clear } = useCart();
  const { settings, refreshOrders } = useStore();
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (maximum 5MB).");
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!settings.orderIntake) {
      toast.error(t("orderIntakeOff"));
      return;
    }
    if (items.length === 0) {
      toast.error(t("emptyCart"));
      return;
    }
    if ((method === "telebirr" || method === "bank_transfer") && !proofFile) {
      toast.error(t("pleaseUpload"));
      return;
    }

    setSubmitting(true);
    try {
      let uploadedProofPath: string | undefined;

      // Upload payment proof if provided
      if (proofFile) {
        try {
          uploadedProofPath = await supabaseService.uploadPaymentProof(proofFile);
        } catch (uploadErr: any) {
          toast.error(`Payment proof upload failed: ${uploadErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      // Submit order payload to Supabase
      const payload = {
        order_type: orderType,
        customer_name: name.trim() || undefined,
        customer_note: notes.trim() || undefined,
        payment_method: method,
        payment_proof_path: uploadedProofPath,
        items: items.map((i) => ({
          food_item_id: i.foodId,
          quantity: i.quantity,
          variation_id: i.variationId || (i.options[0]?.variationId),
        })),
      };

      const result = await supabaseService.submitCustomerOrder(payload);

      if (!result.success || !result.order_id) {
        toast.error(result.error || "Failed to submit order to database.");
        setSubmitting(false);
        return;
      }

      // Order created successfully in Supabase
      clear();
      await refreshOrders();
      toast.success(t("orderConfirmed"));
      navigate(`/order/confirmation?id=${result.order_id}&num=${encodeURIComponent(result.order_number || "")}`);
    } catch (err: any) {
      console.error("Order submission error:", err);
      toast.error(err.message || "An unexpected error occurred while placing your order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#F6F8F6]">
        <Header title={t("proceedCheckout")} back="/order" />
        <EmptyCart />
      </div>
    );
  }

  const methods: { key: PaymentMethod; icon: React.ReactNode }[] = [
    { key: "cash", icon: <Banknote className="h-4 w-4" /> },
    { key: "telebirr", icon: <Smartphone className="h-4 w-4" /> },
    { key: "bank_transfer", icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6] pb-32">
      <Header title={t("proceedCheckout")} back="/order/cart" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {/* Order Type */}
        <section className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[#123D2B]">{t("orderType")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["dine_in", "takeaway"] as OrderType[]).map((ot) => (
              <button
                key={ot}
                type="button"
                onClick={() => setOrderType(ot)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                  orderType === ot
                    ? "border-[#123D2B] bg-[#E8F3EE] text-[#123D2B] font-bold"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {ot === "dine_in" ? <MapPin className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                {t(ot === "dine_in" ? "dineIn" : "takeaway")}
              </button>
            ))}
          </div>
        </section>

        {/* Customer Information */}
        <section className="space-y-3 rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("yourName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("specialInstructions")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#123D2B]/40"
            />
          </div>
        </section>

        {/* Payment Methods */}
        <section className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[#123D2B]">{t("paymentMethod")}</p>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-medium transition ${
                  method === m.key
                    ? "border-[#123D2B] bg-[#E8F3EE] text-[#123D2B] font-bold"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {m.icon}
                {t(PAYMENT_METHOD_LABEL[m.key].en.toLowerCase() === "cash" ? "cash" : m.key === "telebirr" ? "telebirr" : "bankTransfer")}
              </button>
            ))}
          </div>

          {method === "cash" && (
            <p className="mt-3 rounded-xl bg-[#F6F8F6] p-3 text-xs text-slate-500 leading-relaxed">
              {t("cashNote")}
            </p>
          )}

          {method !== "cash" && (
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-relaxed text-slate-500">{tr(settings.paymentInstructions)}</p>
              <div className="space-y-2">
                {method === "telebirr" ? (
                  <>
                    <AccountRow label={t("telebirrNumber")} value={settings.telebirrNumber} />
                    <AccountRow label={t("telebirrName")} value={settings.telebirrName} />
                  </>
                ) : (
                  <>
                    <AccountRow label={t("bankName")} value={settings.bankName} />
                    <AccountRow label={t("bankAccount")} value={settings.bankAccount} />
                    <AccountRow label={t("bankAccountName")} value={settings.bankAccountName} />
                  </>
                )}
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#123D2B]/25 bg-[#F6F8F6] py-4 text-center active:scale-[0.99] hover:bg-slate-50">
                {previewUrl ? (
                  <div className="space-y-1">
                    <img src={previewUrl} alt="receipt" className="max-h-32 rounded-lg object-contain mx-auto shadow-sm" />
                    <span className="text-[11px] text-emerald-700 font-semibold block">Click to change receipt</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-[#123D2B]/50" />
                    <span className="text-xs font-medium text-[#123D2B]">{t("uploadReceipt")}</span>
                    <span className="text-[10px] text-slate-400">{t("uploadHint")}</span>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
              </label>
            </div>
          )}
        </section>

        {/* Total Summary */}
        <div className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-base font-bold text-[#123D2B]">
            <span>{t("total")}</span>
            <span>{formatETB(subtotal)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Prices verified directly against database records.</p>
        </div>
      </div>

      {/* Floating Submit Button */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl px-4 pb-4">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex w-full items-center justify-between rounded-2xl bg-[#123D2B] px-5 py-3.5 font-semibold text-white shadow-2xl active:scale-[0.99] disabled:opacity-70 hover:bg-[#1a5740]"
        >
          <span className="flex items-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />}
            {submitting ? "Placing Order..." : t("submitOrder")}
          </span>
          <span className="text-[#D4AF37]">{formatETB(subtotal)}</span>
        </button>
      </div>
    </div>
  );
};

export const ConfirmationView: React.FC = () => {
  const { t, tr } = useLang();
  const { orders } = useStore();
  const [params] = useSearchParams();
  const id = params.get("id");
  const numParam = params.get("num");

  const [liveOrder, setLiveOrder] = useState<Order | null>(null);
  const [fetching, setFetching] = useState<boolean>(true);

  // Find order from store or directly fetch from Supabase
  useEffect(() => {
    let mounted = true;
    const storeMatch = orders.find((o) => o.id === id);
    if (storeMatch) {
      setLiveOrder(storeMatch);
      setFetching(false);
      return;
    }

    if (id && supabase) {
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (mounted && data) {
            setLiveOrder({
              id: data.id,
              orderNumber: data.order_number,
              orderType: data.order_type,
              customerName: data.customer_name || undefined,
              notes: data.customer_note || undefined,
              items: (data.order_items || []).map((i: any) => ({
                foodId: i.food_item_id,
                name: i.food_name_snapshot,
                quantity: i.quantity,
                unitPrice: Number(i.unit_price),
                options: i.variation_name_snapshot
                  ? [{ groupTitle: { en: "Option", am: "አማራጭ", sid: "Filannoo" }, choiceName: i.variation_name_snapshot, priceDelta: 0 }]
                  : [],
                lineTotal: Number(i.line_total),
              })),
              subtotal: Number(data.subtotal),
              total: Number(data.total),
              paymentMethod: data.payment_method,
              paymentProofPath: data.payment_proof_path || undefined,
              paymentStatus: data.payment_status,
              orderStatus: data.order_status,
              createdAt: data.created_at,
            });
          }
          if (mounted) setFetching(false);
        });
    } else {
      setFetching(false);
    }

    return () => {
      mounted = false;
    };
  }, [id, orders]);

  const displayOrderNumber = liveOrder?.orderNumber || numParam || "CT-ORDER";

  if (!fetching && !liveOrder && !numParam) {
    return (
      <div className="min-h-[100dvh] bg-[#F6F8F6]">
        <Header title={t("orderConfirmed")} back="/order" />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-slate-500">
          {t("noOrders")}{" "}
          <Link to="/order" className="mt-4 block font-semibold text-[#123D2B]">
            {t("backToMenu")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6] pb-10">
      <Header title={t("orderConfirmed")} back="/order" />
      <div className="mx-auto max-w-md px-4 py-6">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#123D2B] text-[#D4AF37] shadow-lg">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
        </motion.div>
        <h2 className="mt-4 text-center text-xl font-bold text-[#123D2B]">{t("orderConfirmed")}</h2>
        <p className="mt-1 text-center text-sm text-slate-500">{t("orderConfirmedSub")}</p>

        <div className="mt-5 rounded-2xl bg-[#123D2B] p-5 text-center text-white shadow-lg">
          <p className="text-[11px] uppercase tracking-widest text-[#D4AF37]">{t("orderNumber")}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-wider">{displayOrderNumber}</p>
          {liveOrder && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px]">
                <Clock className="h-3 w-3" /> {tr(ORDER_STATUS_LABEL[liveOrder.orderStatus])}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/20 px-2.5 py-1 text-[11px] text-[#D4AF37]">
                {tr(PAYMENT_STATUS_LABEL[liveOrder.paymentStatus])}
              </span>
            </div>
          )}
        </div>

        {liveOrder && (
          <div className="mt-4 space-y-2 rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t("orderType")}</span>
              <span className="font-medium text-[#123D2B]">{t(liveOrder.orderType === "dine_in" ? "dineIn" : "takeaway")}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t("paymentMethod")}</span>
              <span className="font-medium text-[#123D2B]">{tr(PAYMENT_METHOD_LABEL[liveOrder.paymentMethod])}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-2 space-y-1">
              {liveOrder.items.map((line, i) => (
                <div key={i} className="flex justify-between py-0.5 text-sm">
                  <span className="text-[#123D2B]">
                    {line.quantity}× {tr(line.name)}
                  </span>
                  <span className="font-medium text-[#123D2B]">{formatETB(line.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-[#123D2B]">
              <span>{t("total")}</span>
              <span>{formatETB(liveOrder.total)}</span>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-400">{t("trackNote")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/order" className="rounded-xl border border-[#123D2B]/15 py-2.5 text-center text-sm font-semibold text-[#123D2B] active:scale-95 hover:bg-[#E8F3EE]">
            {t("orderMore")}
          </Link>
          <Link
            to={`/order/status?id=${id || ""}`}
            className="rounded-xl bg-[#123D2B] py-2.5 text-center text-sm font-semibold text-white active:scale-95 hover:bg-[#1a5740]"
          >
            {t("paymentStatus")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export const StatusView: React.FC = () => {
  const { t, tr } = useLang();
  const { orders } = useStore();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [liveOrder, setLiveOrder] = useState<Order | null>(null);

  useEffect(() => {
    const storeMatch = orders.find((o) => o.id === id);
    if (storeMatch) {
      setLiveOrder(storeMatch);
      return;
    }
    if (id && supabase) {
      supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setLiveOrder({
              id: data.id,
              orderNumber: data.order_number,
              orderType: data.order_type,
              items: [],
              subtotal: Number(data.subtotal),
              total: Number(data.total),
              paymentMethod: data.payment_method,
              paymentStatus: data.payment_status,
              orderStatus: data.order_status,
              createdAt: data.created_at,
            });
          }
        });
    }
  }, [id, orders]);

  if (!liveOrder) {
    return (
      <div className="min-h-[100dvh] bg-[#F6F8F6]">
        <Header title={t("paymentStatus")} back="/order" />
        <div className="py-24 text-center text-slate-500">{t("noOrders")}</div>
      </div>
    );
  }

  const steps = ["pending", "confirmed", "completed"];
  const current = steps.indexOf(liveOrder.orderStatus);

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6]">
      <Header title={t("orderStatus")} back="/order" />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl bg-[#123D2B] p-4 text-center text-white shadow-lg">
          <p className="text-[11px] uppercase tracking-widest text-[#D4AF37]">{t("orderNumber")}</p>
          <p className="text-2xl font-bold tracking-wider">{liveOrder.orderNumber}</p>
        </div>
        <div className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-3 rounded-xl border p-3.5 shadow-sm transition ${
                current >= i ? "border-[#123D2B]/20 bg-white" : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                  current >= i ? "bg-[#123D2B] text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#123D2B]">{tr(ORDER_STATUS_LABEL[s as keyof typeof ORDER_STATUS_LABEL])}</p>
                <p className="text-[11px] text-slate-400">
                  {s === "pending"
                    ? "Order received by kitchen"
                    : s === "confirmed"
                    ? "Kitchen is preparing your order"
                    : "Ready / Delivered"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
