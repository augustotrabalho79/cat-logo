import {
  createContext, useCallback, useContext,
  useEffect, useState, type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "client";

export type AuthUser = {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  brandId?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isBrandAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SUPER_ADMIN_EMAIL = "augustocross87@gmail.com";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Mapeia role do Supabase (super_admin|brand_admin) para o tipo legado (admin|client) */
function mapRole(dbRole: string | undefined): UserRole {
  return dbRole === "super_admin" ? "admin" : "client";
}

async function fetchUserProfile(uid: string, email: string): Promise<AuthUser> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, name, role, brand_id, active")
      .eq("id", uid)
      .maybeSingle();
    if (!error && data) {
      return {
        uid,
        email: data.email ?? email,
        role: mapRole(data.role),
        name: data.name ?? undefined,
        brandId: data.brand_id ?? undefined,
      };
    }
  } catch {
    // ignore — fallback abaixo
  }

  // Fallback: super admin identificado pelo email
  return {
    uid,
    email,
    role: email === SUPER_ADMIN_EMAIL ? "admin" : "client",
  };
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sessão atual ao montar
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email ?? "");
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listener de mudanças (login, logout, refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email ?? "");
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login falhou.");
    const profile = await fetchUserProfile(data.user.id, data.user.email ?? email);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";
  const isBrandAdmin = user?.role === "client" && !!user?.brandId;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isBrandAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
