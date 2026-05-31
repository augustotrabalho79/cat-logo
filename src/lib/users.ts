/**
 * users.ts — Gestão de usuários (super admin)
 * Implementação Supabase. Mantém o tipo ClientUser legado (role: admin|client)
 * para minimizar mudanças no frontend; faz mapeamento com o DB (super_admin|brand_admin).
 */

import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ??
  "https://xlsujjgfvklthdwrafrx.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3VqamdmdmtsdGhkd3JhZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODgzOTMsImV4cCI6MjA5NTc2NDM5M30.2N2sFOhnmXNK_UDIyH1M1R1KMan23ho-5WBGmx94Uno";

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

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  role: "super_admin" | "brand_admin";
  brand_id: string | null;
  active: boolean;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

function rowToUser(r: ProfileRow): ClientUser {
  return {
    uid: r.id,
    email: r.email ?? "",
    name: r.name ?? "",
    role: r.role === "super_admin" ? "admin" : "client",
    active: r.active !== false,
    brandId: r.brand_id ?? undefined,
    phone: r.phone ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

// ─── Listar todos os usuários ──────────────────────────────────────────────────

export async function getAllUsers(): Promise<ClientUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, brand_id, active, phone, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToUser);
}

// ─── Buscar um usuário específico ─────────────────────────────────────────────

export async function getUserById(uid: string): Promise<ClientUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, brand_id, active, phone, notes, created_at")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToUser(data) : null;
}

// ─── Criar novo usuário ────────────────────────────────────────────────────────
// IMPORTANTE: supabase.auth.signUp() loga o novo usuário na sessão atual,
// deslogando o super_admin que está criando. Para evitar isso, usamos
// uma instância separada do cliente Supabase (sem persistSession) apenas
// para o signUp — assim o usuário admin atual continua logado.

export async function createClientUser(data: {
  email: string;
  password: string;
  name: string;
  brandId?: string;
  phone?: string;
  notes?: string;
  adminUid: string;
}): Promise<string> {
  // Cliente isolado para signUp sem afetar sessão atual
  const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signUpData, error: signUpError } = await tmp.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (signUpError) {
    if (/already/i.test(signUpError.message)) throw new Error("EMAIL_EXISTS");
    if (/weak|password/i.test(signUpError.message)) throw new Error("WEAK_PASSWORD");
    throw new Error(signUpError.message);
  }

  const uid = signUpData.user?.id;
  if (!uid) throw new Error("Não foi possível criar o usuário.");

  // O trigger handle_new_user já criou a row em profiles com role='brand_admin'.
  // Agora atualizamos com name/brand_id/phone/notes via update (super_admin pode).
  const { error: updErr } = await supabase
    .from("profiles")
    .update({
      name: data.name,
      brand_id: data.brandId ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
    })
    .eq("id", uid);
  if (updErr) throw updErr;

  return uid;
}

// ─── Atualizar usuário ────────────────────────────────────────────────────────

export async function updateClientUser(
  uid: string,
  data: Partial<Omit<ClientUser, "uid" | "email" | "createdAt">>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.brandId !== undefined) row.brand_id = data.brandId || null;
  if (data.phone !== undefined) row.phone = data.phone || null;
  if (data.notes !== undefined) row.notes = data.notes || null;
  if (data.active !== undefined) row.active = data.active;
  if (data.role !== undefined) {
    row.role = data.role === "admin" ? "super_admin" : "brand_admin";
  }

  const { error } = await supabase.from("profiles").update(row).eq("id", uid);
  if (error) throw error;
}

// ─── Resetar senha por e-mail ─────────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ─── Definir nova senha (não suportado no client-side puro) ───────────────────
// Mantido só pra compatibilidade — frontend deve preferir sendPasswordReset.
// Alterar senha de outro usuário exige service_role (Admin API) → backend dedicado.

export async function setUserPassword(
  _uid: string,
  _newPassword: string,
): Promise<void> {
  throw new Error(
    "Alteração direta de senha não está disponível no client-side. " +
    "Use a opção 'Enviar e-mail de redefinição'.",
  );
}

// ─── Desativar/ativar usuário ──────────────────────────────────────────────────

export async function deactivateUser(uid: string): Promise<void> {
  const { error } = await supabase
    .from("profiles").update({ active: false }).eq("id", uid);
  if (error) throw error;
}

export async function activateUser(uid: string): Promise<void> {
  const { error } = await supabase
    .from("profiles").update({ active: true }).eq("id", uid);
  if (error) throw error;
}
