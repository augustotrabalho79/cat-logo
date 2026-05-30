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

export type UserRole = "admin" | "vendor";
export type AuthUser = { uid: string; email: string; role: UserRole };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(uid: string): Promise<UserRole> {
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data()?.role as UserRole) ?? "vendor";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const role = await fetchRole(fbUser.uid);
        setUser({ uid: fbUser.uid, email: fbUser.email!, role });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const role = await fetchRole(cred.user.uid);
      const u: AuthUser = { uid: cred.user.uid, email: cred.user.email!, role };
      setUser(u);
      return u;
    },
    [],
  );

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
