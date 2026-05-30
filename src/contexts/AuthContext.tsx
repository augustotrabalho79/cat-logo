import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SUPER_ADMIN_EMAIL = "augustocross87@gmail.com";

async function fetchUserProfile(uid: string, email: string): Promise<AuthUser> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid,
        email,
        role: (data.role as UserRole) ?? "client",
        name: data.name,
        brandId: data.brandId,
      };
    }
  } catch {
    // Se não conseguir ler Firestore, usa defaults baseado no email
  }
  // Super admin fallback por email
  return {
    uid,
    email,
    role: email === SUPER_ADMIN_EMAIL ? "admin" : "client",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser.uid, fbUser.email!);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    // Usa Firebase SDK — necessário para Firestore Rules funcionarem
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(cred.user.uid, cred.user.email!);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
