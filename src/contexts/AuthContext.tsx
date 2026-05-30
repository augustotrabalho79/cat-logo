import {
  createContext, useCallback, useContext,
  useEffect, useState, type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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

async function fetchUserProfile(uid: string, email: string): Promise<AuthUser> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid,
        email: data.email ?? email,
        role: (data.role as UserRole) ?? "client",
        name: data.name ?? undefined,
        brandId: data.brandId ?? undefined,
      };
    }
  } catch {
    // Firestore inacessível — fallback por email
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
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await fetchUserProfile(fbUser.uid, fbUser.email!);
          setUser(profile);
        } catch {
          setUser({ uid: fbUser.uid, email: fbUser.email!, role: "client" });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(cred.user.uid, cred.user.email!);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
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
