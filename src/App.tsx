import { useState } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { ClipboardList, History, KeyRound, LayoutDashboard, Loader2, LockKeyhole, LogOut, Settings, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { AppProvider, LanguageSwitcher, useAuth, useLang } from "./context/AppContext";
import { CustomerMenu } from "./components/CustomerMenu";
import { CartView, CheckoutView, ConfirmationView, StatusView } from "./components/CustomerFlow";
import { AdminDashboard, AdminOrders, OrderHistory } from "./components/AdminOrders";
import { FoodsManager, SettingsManager } from "./components/AdminManage";
import { AdminSecurity } from "./components/AdminSecurity";

const AdminLogin: React.FC = () => {
  const { t } = useLang();
  const { login, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw) {
      toast.error(t("requiredField"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await login(email, pw);
      if (!res.success) {
        toast.error(res.error || t("invalidCreds"));
      } else {
        toast.success(t("adminPortal"));
      }
    } catch {
      toast.error(t("invalidCreds"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#123D2B] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#D4AF37] text-[#123D2B]">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-wide">{t("adminPortal")}</h1>
          <p className="mt-1 text-sm text-white/60">{t("loginSub")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3.5 rounded-3xl bg-white p-6 shadow-2xl">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("email")}</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@chefteketel.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#123D2B]/40"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("password")}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#123D2B]/40"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123D2B] py-3 font-semibold text-white transition hover:bg-[#1a5740] active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockKeyhole className="h-4 w-4" />
            )}
            {t("signIn")}
          </button>

          {isConfigured ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-emerald-700 font-medium pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secured with Supabase Auth
            </p>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center text-[11px] text-amber-800">
              <p className="font-semibold">Development Authentication</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Admin: admin@chefteketel.com</p>
            </div>
          )}
        </form>
        <div className="mt-4 flex items-center justify-center">
          <LanguageSwitcher tone="dark" />
        </div>
      </div>
    </div>
  );
};

const NAV = [
  { to: "/admin", label: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "orders", icon: ClipboardList, end: false },
  { to: "/admin/history", label: "history", icon: History, end: false },
  { to: "/admin/foods", label: "mainDishes", icon: UtensilsCrossed, end: false },
  { to: "/admin/security", label: "security", icon: KeyRound, end: false },
  { to: "/admin/settings", label: "settings", icon: Settings, end: false },
];

const AdminLayout: React.FC = () => {
  const { t } = useLang();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const itemCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? "bg-[#D4AF37] text-[#123D2B] shadow-sm"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-[100dvh] bg-[#F6F8F6]">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col bg-[#123D2B] p-4 text-white lg:flex">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#D4AF37] text-[#123D2B]">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-[0.12em]">CHEF TEKETEL</p>
              <p className="text-[10px] uppercase tracking-wider text-[#D4AF37]/90">Admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={itemCls}>
                <n.icon className="h-4 w-4" /> {t(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            <LanguageSwitcher tone="dark" />
            <button
              onClick={() => {
                logout();
                navigate("/order");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> {t("logout")}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#123D2B]/8 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#123D2B] text-[#D4AF37]">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-[#123D2B]">CHEF TEKETEL</span>
            </div>
            <div className="hidden text-sm text-slate-400 lg:block">{t("adminPortal")}</div>
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <LanguageSwitcher tone="light" />
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/order");
                }}
                className="hidden items-center gap-1.5 rounded-full bg-[#123D2B]/5 px-3 py-1.5 text-xs font-semibold text-[#123D2B] hover:bg-[#123D2B]/10 lg:flex"
              >
                <LogOut className="h-3.5 w-3.5" /> {t("logout")}
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-6">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="history" element={<OrderHistory />} />
              <Route path="foods" element={<FoodsManager />} />
              <Route path="categories" element={<Navigate to="/admin/foods" replace />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="settings" element={<SettingsManager />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>

          {/* Bottom nav (mobile) */}
          <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[#123D2B]/10 bg-white px-1 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium ${
                    isActive ? "text-[#123D2B]" : "text-slate-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon className={`h-5 w-5 ${isActive ? "text-[#123D2B]" : "text-slate-400"}`} />
                    <span className="truncate">{t(n.label)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

const AdminGate: React.FC = () => {
  const { isAuth, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#123D2B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#D4AF37] text-[#123D2B]">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
        </div>
      </div>
    );
  }

  return isAuth ? <AdminLayout /> : <AdminLogin />;
};

const App = () => (
  <AppProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/order" replace />} />
        <Route path="/order" element={<CustomerMenu />} />
        <Route path="/order/cart" element={<CartView />} />
        <Route path="/order/checkout" element={<CheckoutView />} />
        <Route path="/order/confirmation" element={<ConfirmationView />} />
        <Route path="/order/status" element={<StatusView />} />
        <Route path="/admin/*" element={<AdminGate />} />
        <Route path="*" element={<Navigate to="/order" replace />} />
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </BrowserRouter>
  </AppProvider>
);

export default App;
