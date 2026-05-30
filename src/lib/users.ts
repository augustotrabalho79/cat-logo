// Gerenciamento de usuários (super admin apenas)
import {
  collection, doc, getDocs, setDoc, updateDoc,
  deleteDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseConfig } from "@/lib/firebase";

export type ClientUser = {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "client";
  brandId?: string;
  active: boolean;
  createdAt?: unknown;
  createdBy?: string;
  phone?: string;
  notes?: string;
};

// ─── Listar todos os usuários ──────────────────────────────────────────────────

export async function getAllUsers(): Promise<ClientUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as ClientUser));
}

// ─── Buscar um usuário específico ─────────────────────────────────────────────

export async function getUserById(uid: string): Promise<ClientUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as ClientUser;
}

// ─── Criar novo usuário (Firebase Auth REST + Firestore) ──────────────────────

export async function createClientUser(data: {
  email: string;
  password: string;
  name: string;
  brandId?: string;
  phone?: string;
  notes?: string;
  adminUid: string;
}): Promise<string> {
  // Cria usuário no Firebase Auth via REST (não desloga o admin atual)
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        returnSecureToken: false,
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    const code = json?.error?.message ?? "UNKNOWN";
    throw new Error(code);
  }
  const uid = json.localId as string;

  // Salva metadados no Firestore
  await setDoc(doc(db, "users", uid), {
    email: data.email,
    name: data.name,
    role: "client",
    brandId: data.brandId ?? null,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    active: true,
    createdBy: data.adminUid,
    createdAt: serverTimestamp(),
  });

  return uid;
}

// ─── Atualizar usuário ────────────────────────────────────────────────────────

export async function updateClientUser(
  uid: string,
  data: Partial<Omit<ClientUser, "uid" | "email" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── Resetar senha via REST ───────────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    },
  );
}

// ─── Definir nova senha diretamente (sem e-mail) ──────────────────────────────

export async function setUserPassword(
  uid: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localId: uid, password: newPassword }),
    },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json?.error?.message ?? "Erro ao alterar senha");
  }
}

// ─── Desativar usuário (sem deletar do Auth) ──────────────────────────────────

export async function deactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active: false, updatedAt: serverTimestamp() });
}

export async function activateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active: true, updatedAt: serverTimestamp() });
}
