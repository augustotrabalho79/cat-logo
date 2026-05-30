import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { firebaseConfig } from "@/lib/firebase";

export type UserRole = "admin" | "vendor";
export type AuthUser = { uid: string; email: string; role: UserRole; idToken: string };

const PROJECT_ID = firebaseConfig.projectId;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const API_KEY = firebaseConfig.apiKey;
const STORAGE_KEY = "auth:user";

// Login via REST API (contorna o SDK que falha com network-request-failed em alguns ambientes)
async function restSignIn(email: string, password: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message ?? "UNKNOWN";
    const err = new Error(code) as Error & { code: string };
    err.code = code;
    throw err;
  }
  return { uid: data.localId as string, email: data.email as string, idToken: data.idToken as string };
}

async function fetchRole(uid: string, idToken: string): Promise<UserRole> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!res.ok) return "vendor";
    const data = await res.json();
    return (data?.fields?.role?.stringValue as UserRole) ?? "vendor";
  } catch {
    return "vendor";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const cred = await restSignIn(email, password);
      const role = await fetchRole(cred.uid, cred.idToken);
      const u: AuthUser = { ...cred, role };
      setUser(u);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
      return u;
    },
    [],
  );

  const logout = useCallback(async () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
