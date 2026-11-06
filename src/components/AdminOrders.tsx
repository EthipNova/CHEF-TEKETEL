import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CircleCheck, ClipboardList, Eye, ImageIcon, Receipt, RefreshCw, Search, TrendingUp, Clock, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatETB, useLang, useStore } from "../context/AppContext";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../data";
import type { Order, OrderStatus, PaymentStatus } from "../types";
import { supabaseService } from "../lib/supabaseService";

const orderTone: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  completed: "bg-[#123D2B] text-white",
  cancelled: "bg-slate-200 text-slate-600",
};
const payTone: Record<PaymentStatus, string> = {
  awaiting_proof: "bg-slate-100 text-slate-600",
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  refunded: "bg-blue-100 text-blue-700",
};

const isToday = (iso: string) => {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
};

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${className}`}>
    {children}
  </span>
);

export const OrderDetailModal: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
  const { t, tr } = useLang();
  const { updateOrder } = useStore();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [updating, setUpdating] = useState(false);

  // Signed URL for private payment proofs
  const [proofUrl, setProofUrl] = useState<string>("");
  const [loadingProof, setLoadingProof] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (order.paymentProofPath) {
      setLoadingProof(true);
      supabaseService.getPaymentProofUrl(order.paymentProofPath).then((url) => {
        if (mounted) {
          setProofUrl(url);
          setLoadingProof(false);
        }
      });
    } else if (order.paymentScreenshot) {
      setProofUrl(order.paymentScreenshot);
    }
    return () => {
      mounted = false;
    };
  }, [order.paymentProofPath, order.paymentScreenshot]);

  const patch = async (p: Partial<Order>) => {
    setUpdating(true);
    try {
      await updateOrder(order.id, p);
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const doReject = async () => {
    if (!reason.trim()) {
      toast.error(t("requiredField"));
      return;
    }
    await patch({
      orderStatus: "rejected",
      paymentStatus: order.paymentMethod === "cash" ? order.paymentStatus : "rejected",
      rejectionReason: reason.trim(),
    });
    toast.success(t("confirmReject"));
    onClose();
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
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-400">{t("orderDetail")}</p>
            <h2 className="text-xl font-extrabold text-[#123D2B]">{order.orderNumber}</h2>
            <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Badge className={orderTone[order.orderStatus]}>{tr(ORDER_STATUS_LABEL[order.orderStatus])}</Badge>
          <Badge className={payTone[order.paymentStatus]}>{tr(PAYMENT_STATUS_LABEL[order.paymentStatus])}</Badge>
          <Badge className="bg-[#E8F3EE] text-[#123D2B]">{t(order.orderType === "dine_in" ? "dineIn" : "takeaway")}</Badge>
        </div>

        <div className="rounded-xl bg-[#F6F8F6] p-3 text-sm space-y-1">
          <p className="flex justify-between">
            <span className="text-slate-500">{t("customer")}</span>
            <span className="font-medium text-[#123D2B]">{order.customerName || t("guest")}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-slate-500">{t("paymentMethod")}</span>
            <span className="font-medium text-[#123D2B]">{tr(PAYMENT_METHOD_LABEL[order.paymentMethod])}</span>
          </p>
          {order.notes && <p className="mt-1 border-t border-dashed border-slate-200 pt-1 text-xs text-slate-500">📝 {order.notes}</p>}
          {order.rejectionReason && (
            <p className="mt-1 border-t border-dashed border-rose-200 pt-1 text-xs font-semibold text-rose-600">
              ❌ Reason: {order.rejectionReason}
            </p>
          )}
        </div>

        <div className="mt-3 space-y-1 rounded-xl border border-[#123D2B]/8 p-3">
          {order.items.map((line, i) => (
            <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-50 last:border-none">
              <span className="text-[#123D2B]">
                <span className="font-bold">{line.quantity}×</span> {tr(line.name)}
                {line.options.length > 0 && (
                  <span className="block text-[11px] text-slate-400">
                    {line.options.map((o) => tr(o.choiceName)).join(" · ")}
                  </span>
                )}
              </span>
              <span className="font-semibold text-[#123D2B]">{formatETB(line.lineTotal)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-[#123D2B]">
            <span>{t("total")}</span>
            <span>{formatETB(order.total)}</span>
          </div>
        </div>

        {/* Payment Proof Section */}
        {order.paymentMethod !== "cash" && (
          <div className="mt-3 rounded-xl border border-[#123D2B]/8 p-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#123D2B]">
              <ImageIcon className="h-3.5 w-3.5" /> {t("paymentProof")}
            </p>

            {loadingProof && (
              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#123D2B]" /> Loading secure proof...
              </div>
            )}

            {!loadingProof && proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg hover:opacity-95">
                <img src={proofUrl} alt="proof" className="max-h-52 w-full object-contain bg-slate-50 rounded-lg border border-slate-100" />
                <span className="text-[10px] text-slate-400 block mt-1 text-center">Click to open full size</span>
              </a>
            ) : !loadingProof ? (
              <p className="text-xs text-slate-400">{t("noProof")}</p>
            ) : null}

            {order.paymentStatus !== "verified" && proofUrl && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  disabled={updating}
                  onClick={async () => {
                    await patch({ paymentStatus: "verified" });
                    toast.success(t("verifyPayment"));
                  }}
                  className="rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                >
                  {t("verifyPayment")}
                </button>
                <button
                  disabled={updating}
                  onClick={async () => {
                    await patch({ paymentStatus: "rejected" });
                    toast.success(t("rejectPayment"));
                  }}
                  className="rounded-lg bg-rose-500 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                >
                  {t("rejectPayment")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions / Transitions */}
        {rejecting ? (
          <div className="mt-4 space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={t("rejectionPlaceholder")}
              className="w-full resize-none rounded-xl border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejecting(false);
                  setReason("");
                }}
                className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={doReject}
                className="rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {t("confirmReject")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {order.orderStatus === "pending" && (
              <button
                disabled={updating}
                onClick={async () => {
                  await patch({ orderStatus: "confirmed" });
                  toast.success(t("confirmOrder"));
                }}
                className="rounded-xl bg-[#123D2B] py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {t("confirmOrder")}
              </button>
            )}
            {order.orderStatus === "confirmed" && (
              <button
                disabled={updating}
                onClick={async () => {
                  await patch({ orderStatus: "completed" });
                  toast.success(t("completeOrder"));
                  onClose();
                }}
                className="rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {t("completeOrder")}
              </button>
            )}
            {(order.orderStatus === "pending" || order.orderStatus === "confirmed") && (
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-500 active:scale-95"
              >
                {t("rejectOrder")}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; accent?: string }> = ({
  icon,
  label,
  value,
  accent,
}) => (
  <div className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm">
    <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent || "bg-[#E8F3EE] text-[#123D2B]"}`}>{icon}</div>
    <p className="mt-2 text-2xl font-extrabold text-[#123D2B]">{value}</p>
    <p className="text-[11px] text-slate-500">{label}</p>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { t, tr } = useLang();
  const { orders, refreshOrders, ordersLoading } = useStore();
  const [detail, setDetail] = useState<Order | null>(null);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.orderStatus === "pending").length,
      awaiting: orders.filter((o) => o.paymentStatus === "pending_verification").length,
      completed: orders.filter((o) => o.orderStatus === "completed").length,
      revenue: orders
        .filter((o) => o.orderStatus === "completed" && isToday(o.createdAt))
        .reduce((s, o) => s + o.total, 0),
    }),
    [orders]
  );

  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#123D2B]">{t("dashboard")}</h1>
          <p className="text-sm text-slate-500">Live Supabase Database Orders</p>
        </div>
        <button
          onClick={() => refreshOrders()}
          title="Refresh orders"
          className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#123D2B] shadow-sm hover:bg-[#E8F3EE] active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin text-[#123D2B]" : "text-slate-500"}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label={t("totalOrders")} value={String(stats.total)} />
        <StatCard icon={<Clock className="h-5 w-5" />} label={t("pending")} value={String(stats.pending)} accent="bg-amber-100 text-amber-700" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label={t("awaitingVerification")} value={String(stats.awaiting)} accent="bg-blue-100 text-blue-700" />
        <StatCard icon={<CircleCheck className="h-5 w-5" />} label={t("completed")} value={String(stats.completed)} accent="bg-emerald-100 text-emerald-700" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label={t("todaysRevenue")} value={formatETB(stats.revenue)} accent="bg-[#D4AF37]/20 text-[#8a6d1f]" />
      </div>

      <div className="rounded-2xl border border-[#123D2B]/8 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-[#123D2B]">{t("recentOrders")}</h2>
          <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#123D2B]/70 hover:underline">
            {t("viewAll")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">{t("noOrders")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((o) => (
              <button
                key={o.id}
                onClick={() => setDetail(o)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F6F8F6] transition"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#123D2B]">{o.orderNumber}</p>
                  <p className="truncate text-xs text-slate-400">
                    {o.customerName || t("guest")} · {new Date(o.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={orderTone[o.orderStatus]}>{tr(ORDER_STATUS_LABEL[o.orderStatus])}</Badge>
                  <span className="font-bold text-[#123D2B]">{formatETB(o.total)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

const Filters: React.FC<{
  status: string;
  setStatus: (s: string) => void;
  search: string;
  setSearch: (s: string) => void;
}> = ({ status, setStatus, search, setSearch }) => {
  const { t, tr } = useLang();
  const keys: OrderStatus[] = ["pending", "confirmed", "completed", "rejected"];
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchOrders")}
          className="w-full rounded-full border border-[#123D2B]/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#123D2B]/40 shadow-sm"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["all", ...keys].map((k) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === k ? "bg-[#123D2B] text-white shadow-sm" : "bg-white text-[#123D2B]/70 hover:bg-[#E8F3EE] border border-slate-200"
            }`}
          >
            {k === "all" ? t("all") : tr(ORDER_STATUS_LABEL[k as OrderStatus])}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AdminOrders: React.FC = () => {
  const { t, tr } = useLang();
  const { orders, refreshOrders, ordersLoading } = useStore();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (status === "all" || o.orderStatus === status) &&
        (!q || o.orderNumber.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q))
    );
  }, [orders, status, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#123D2B]">{t("orders")}</h1>
        <button
          onClick={() => refreshOrders()}
          title="Refresh orders"
          className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#123D2B] shadow-sm hover:bg-[#E8F3EE] active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin text-[#123D2B]" : "text-slate-500"}`} />
        </button>
      </div>

      <Filters status={status} setStatus={setStatus} search={search} setSearch={setSearch} />

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[#123D2B]/15 bg-white py-16 text-center text-sm text-slate-400">
          <ClipboardList className="mb-2 h-7 w-7 text-[#123D2B]/25" />
          {t("noOrders")}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((o) => (
            <motion.button
              key={o.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setDetail(o)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#123D2B]/8 bg-white p-3.5 text-left shadow-sm hover:shadow-md transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#123D2B]">{o.orderNumber}</span>
                  <Badge className={payTone[o.paymentStatus]}>{tr(PAYMENT_STATUS_LABEL[o.paymentStatus])}</Badge>
                </div>
                <p className="truncate text-xs text-slate-400 mt-0.5">
                  {o.customerName || t("guest")} · {o.items.length} {t("items")} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={orderTone[o.orderStatus]}>{tr(ORDER_STATUS_LABEL[o.orderStatus])}</Badge>
                <span className="whitespace-nowrap font-bold text-[#123D2B]">{formatETB(o.total)}</span>
                <Eye className="h-4 w-4 text-slate-300" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

export const OrderHistory: React.FC = () => {
  const { t, tr } = useLang();
  const { orders } = useStore();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);

  const archived = useMemo(
    () =>
      orders.filter(
        (o) =>
          ["completed", "rejected", "cancelled"].includes(o.orderStatus) &&
          (!search.trim() || o.orderNumber.toLowerCase().includes(search.toLowerCase()))
      ),
    [orders, search]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-[#123D2B]">{t("history")}</h1>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchOrders")}
          className="w-full rounded-full border border-[#123D2B]/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#123D2B]/40 shadow-sm"
        />
      </div>
      {archived.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[#123D2B]/15 bg-white py-16 text-sm text-slate-400">
          {t("noOrders")}
        </div>
      ) : (
        <div className="grid gap-2">
          {archived.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#123D2B]/8 bg-white p-3.5 shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#123D2B]">{o.orderNumber}</span>
                  <Badge className={orderTone[o.orderStatus]}>{tr(ORDER_STATUS_LABEL[o.orderStatus])}</Badge>
                </div>
                <p className="truncate text-xs text-slate-400 mt-0.5">
                  {o.customerName || t("guest")} · {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#123D2B]">{formatETB(o.total)}</span>
                <button
                  onClick={() => setDetail(o)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#F6F8F6] text-[#123D2B] active:scale-95 hover:bg-[#E8F3EE]"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};
