import React, { useState } from "react";
import { KeyRound, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useLang } from "../context/AppContext";

export const AdminSecurity: React.FC = () => {
  const { t } = useLang();
  const { user, changePassword, isConfigured } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Policy validation indicators
  const hasMinLen = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const matches = Boolean(newPassword && newPassword === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error(t("requiredField") + ": " + t("currentPassword"));
      return;
    }

    if (!hasMinLen || !hasLetter || !hasNumber) {
      toast.error(t("passwordPolicyHint"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update password.");
      } else {
        toast.success(t("passwordChanged"));
        // Clear sensitive fields from state immediately
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("An unexpected error occurred while updating password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-[#123D2B]">{t("security")}</h1>
        <p className="text-sm text-slate-500">Manage administrator account credentials and session security.</p>
      </div>

      {/* Auth Provider Status Card */}
      <div className="rounded-2xl border border-[#123D2B]/8 bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            )}
            <h2 className="font-bold text-sm text-[#123D2B]">
              {isConfigured ? "Production Auth Backend (Supabase)" : "Development Authentication"}
            </h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isConfigured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isConfigured ? "Active & Verified" : "Local Dev Session"}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Authenticated user: <span className="font-semibold text-[#123D2B]">{user?.email || "Unknown"}</span>
        </p>
        {!isConfigured && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
            {t("devAuthNotice")}
          </p>
        )}
      </div>

      {/* Change Password Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#123D2B]/8 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <KeyRound className="h-5 w-5 text-[#123D2B]" />
          <h2 className="font-bold text-[#123D2B]">{t("changePassword")}</h2>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("currentPassword")}</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#123D2B]/40"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("newPassword")}</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#123D2B]/40"
            required
          />
        </div>

        {/* Real-time policy requirements list */}
        <div className="rounded-xl bg-[#F6F8F6] p-3 space-y-1.5 text-xs">
          <p className="font-semibold text-slate-600 mb-1">Password requirements:</p>
          <div className="flex items-center gap-1.5">
            {hasMinLen ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-slate-300" />
            )}
            <span className={hasMinLen ? "text-emerald-700 font-medium" : "text-slate-500"}>
              At least 8 characters
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasLetter ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-slate-300" />
            )}
            <span className={hasLetter ? "text-emerald-700 font-medium" : "text-slate-500"}>
              Contains letters (a-z, A-Z)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasNumber ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-slate-300" />
            )}
            <span className={hasNumber ? "text-emerald-700 font-medium" : "text-slate-500"}>
              Contains at least one number (0-9)
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#123D2B]/70">{t("confirmPassword")}</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
              confirmPassword && !matches
                ? "border-rose-300 focus:border-rose-400"
                : "border-slate-200 focus:border-[#123D2B]/40"
            }`}
            required
          />
          {confirmPassword && !matches && (
            <p className="mt-1 text-xs text-rose-500">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123D2B] py-3 font-semibold text-white transition hover:bg-[#1a5740] active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Updating...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> {t("changePassword")}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

