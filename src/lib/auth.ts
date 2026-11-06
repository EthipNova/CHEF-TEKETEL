import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    !supabaseUrl.includes("your-supabase-project") &&
    supabaseAnonKey !== "your-supabase-anon-key"
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface PasswordChangeParams {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

// Development-only fallback configuration
// Strictly isolated from production builds.
const DEV_AUTH_KEY = "tk_dev_auth_session";

// Minimal policy: at least 8 chars, at least 1 letter, at least 1 number
export const validatePasswordPolicy = (password: string): { valid: boolean; reason?: string } => {
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one number." };
  }
  return { valid: true };
};

// SHA-256 helper for isolated dev mode hashing (no plaintext passwords stored)
const sha256Hex = async (str: string): Promise<string> => {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const authService = {
  isConfigured: isSupabaseConfigured,

  async getSession(): Promise<{ user: AuthUser | null; token?: string }> {
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) return { user: null };
      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email || "",
          role: data.session.user.role,
        },
        token: data.session.access_token,
      };
    }

    // In production, reject unconfigured backend
    if (import.meta.env.PROD) {
      return { user: null };
    }

    // Isolated development session check
    try {
      const raw = sessionStorage.getItem(DEV_AUTH_KEY);
      if (!raw) return { user: null };
      const parsed = JSON.parse(raw);
      if (parsed?.expiresAt && Date.now() > parsed.expiresAt) {
        sessionStorage.removeItem(DEV_AUTH_KEY);
        return { user: null };
      }
      return { user: parsed?.user ?? null };
    } catch {
      return { user: null };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Authentication failed. User record not found." };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          role: data.user.role,
        },
      };
    }

    // Block in production if auth provider is not configured
    if (import.meta.env.PROD) {
      return {
        success: false,
        error: "Production authentication provider is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    // Development-only isolated login
    // In dev mode without Supabase, initialize with a hashed credential in sessionStorage
    const DEV_HASH_STORAGE_KEY = "tk_dev_admin_cred_hash";
    let storedHash = localStorage.getItem(DEV_HASH_STORAGE_KEY);
    if (!storedHash) {
      // Default dev seed password: Admin123!
      storedHash = await sha256Hex("Admin123!");
      localStorage.setItem(DEV_HASH_STORAGE_KEY, storedHash);
    }

    const inputHash = await sha256Hex(password);
    if (cleanEmail === "admin@chefteketel.com" && inputHash === storedHash) {
      const devUser: AuthUser = {
        id: "dev-admin-id",
        email: cleanEmail,
        role: "admin",
      };
      // Store in sessionStorage (cleared on browser close, 8 hour expiry)
      sessionStorage.setItem(
        DEV_AUTH_KEY,
        JSON.stringify({
          user: devUser,
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        })
      );
      return { success: true, user: devUser };
    }

    return { success: false, error: "Invalid email or password." };
  },

  async changePassword(params: PasswordChangeParams): Promise<{ success: boolean; error?: string }> {
    const { currentPassword, newPassword, confirmPassword } = params;

    if (!currentPassword) {
      return { success: false, error: "Current password is required." };
    }

    if (!newPassword) {
      return { success: false, error: "New password is required." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "New password and confirmation do not match." };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: "New password must be different from current password." };
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return { success: false, error: policyCheck.reason };
    }

    if (supabase) {
      // 1. Re-authenticate current user to verify current password before updating
      const { data: sessionData } = await supabase.auth.getSession();
      const currentEmail = sessionData?.session?.user?.email;

      if (!currentEmail) {
        return { success: false, error: "User session not found. Please log in again." };
      }

      const reauth = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (reauth.error) {
        return { success: false, error: "Current password is incorrect." };
      }

      // 2. Submit the password update to Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // 3. Invalidate other active sessions where supported
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {
        // scope 'others' supported in modern supabase-js
      }

      return { success: true };
    }

    // Development-only isolated password update
    if (import.meta.env.PROD) {
      return {
        success: false,
        error: "Production authentication backend is not configured.",
      };
    }

    const DEV_HASH_STORAGE_KEY = "tk_dev_admin_cred_hash";
    let storedHash = localStorage.getItem(DEV_HASH_STORAGE_KEY);
    if (!storedHash) {
      storedHash = await sha256Hex("Admin123!");
      localStorage.setItem(DEV_HASH_STORAGE_KEY, storedHash);
    }

    const currentHash = await sha256Hex(currentPassword);
    if (currentHash !== storedHash) {
      return { success: false, error: "Current password is incorrect." };
    }

    const newHash = await sha256Hex(newPassword);
    localStorage.setItem(DEV_HASH_STORAGE_KEY, newHash);
    return { success: true };
  },

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem(DEV_AUTH_KEY);
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          callback({
            id: session.user.id,
            email: session.user.email || "",
            role: session.user.role,
          });
        } else {
          callback(null);
        }
      });
      return () => {
        sub.subscription.unsubscribe();
      };
    }

    // In dev fallback mode, observe window storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DEV_AUTH_KEY) {
        authService.getSession().then(({ user }) => callback(user));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  },
};

