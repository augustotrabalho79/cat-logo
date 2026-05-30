import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus, Pencil, UserX, UserCheck, KeyRound, X, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUsers, createClientUser, updateClientUser,
  deactivateUser, activateUser, setUserPassword,
  type ClientUser,
} from "@/lib/users";
import { getBrands, type Brand } from "@/lib/api";
import { SlideOver } from "@/components/SlideOver";
import { Btn, Field, TextInput, TextArea, Select } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<ClientUser | null>(null);
  const [pwdModal, setPwdModal] = useState<ClientUser | null>(null);
  const [confirmUser, setConfirmUser] = useState<{ user: ClientUser; action: "activate" | "deactivate" } | null>(null);

  // Apenas admin pode acessar
  useEffect(() => {
    if (user && user.role !== "admin") navigate({ to: "/admin" });
  }, [user, navigate]);

  useEffect(() => {
    async function load() {
      const [u, b] = await Promise.all([getAllUsers(), getBrands()]);

      // Se o admin logado não tiver documento completo, completa automaticamente
      if (user) {
        const adminDoc = u.find((x) => x.uid === user.uid);
        if (adminDoc && (!adminDoc.email || !adminDoc.name)) {
          await updateClientUser(user.uid, {
            email: user.email,
            name: user.name || "Administrador",
            role: "admin",
            active: true,
          });
          // Atualiza localmente
          const updated = u.map((x) =>
            x.uid === user.uid
              ? { ...x, email: user.email, name: user.name || "Administrador" }
              : x,
          );
          setUsers(updated);
        } else {
          setUsers(u);
        }
      } else {
        setUsers(u);
      }
      setBrands(b);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  function getBrandName(brandId?: string) {
    if (!brandId) return "—";
    return brands.find((b) => b.id === brandId)?.name ?? "—";
  }

  async function handleToggleActive(u: ClientUser) {
    if (u.role === "admin") return;
    if (u.active) {
      await deactivateUser(u.uid);
    } else {
      await activateUser(u.uid);
    }
    setUsers((prev) => prev.map((x) => x.uid === u.uid ? { ...x, active: !u.active } : x));
    setConfirmUser(null);
  }

  function openNew() { setEditing(null); setSlideOpen(true); }
  function openEdit(u: ClientUser) { setEditing(u); setSlideOpen(true); }

  function onSaved(u: ClientUser, isNew: boolean) {
    setUsers((prev) => isNew ? [...prev, u] : prev.map((x) => x.uid === u.uid ? u : x));
    setSlideOpen(false);
  }

  const adminUser = users.find((u) => u.role === "admin");
  const clientUsers = users.filter((u) => u.role !== "admin");

  return (
    <div className="p-6 md:p-10 fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="label-eyebrow text-muted-foreground">Administração</p>
          <h1 className="mt-1 font-display text-4xl">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os acessos dos seus clientes ao painel.
          </p>
        </div>
        <Btn onClick={openNew}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Novo cliente
        </Btn>
      </div>

      {/* Meu perfil */}
      {adminUser && (
        <section className="mb-8">
          <p className="label-eyebrow mb-3 text-muted-foreground">Minha conta</p>
          <div className="border border-border bg-card p-5 flex items-center gap-4">
            <Avatar name={adminUser.name || adminUser.email || "Admin"} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{adminUser.name || "—"}</span>
                <span className="label-eyebrow border border-foreground bg-foreground text-background px-2 py-0.5">SUPER ADMIN</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{adminUser.email}</p>
            </div>
            <button
              onClick={() => openEdit(adminUser)}
              className="label-btn inline-flex items-center gap-2 border border-border px-3 py-2 hover:border-foreground"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar perfil
            </button>
          </div>
        </section>
      )}

      {/* Clientes */}
      <section>
        <p className="label-eyebrow mb-3 text-muted-foreground">
          Clientes ({clientUsers.length})
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 border border-border shimmer" />)}
          </div>
        ) : clientUsers.length === 0 ? (
          <div className="border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado. Clique em "Novo cliente" para começar.
          </div>
        ) : (
          <div className="border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="label-eyebrow text-left text-muted-foreground">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Telefone</th>
                  <th className="px-5 py-3">Marca vinculada</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientUsers.map((u) => (
                  <tr key={u.uid} className={`border-b border-border last:border-b-0 ${!u.active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name || u.email || u.uid?.slice(0, 2)} />
                        <span className="font-medium">{u.name || u.email || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.phone || "—"}</td>
                    <td className="px-5 py-3">{getBrandName(u.brandId)}</td>
                    <td className="px-5 py-3">
                      <span className={`label-eyebrow px-2 py-1 ${u.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {u.active ? "ativo" : "inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          title="Editar"
                          className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setPwdModal(u)}
                          title="Alterar senha"
                          className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground"
                        >
                          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setConfirmUser({ user: u, action: u.active ? "deactivate" : "activate" })}
                          title={u.active ? "Desativar" : "Ativar"}
                          className={`label-btn inline-flex items-center gap-1 border px-3 py-1.5 ${u.active ? "border-border text-red-500 hover:border-red-400" : "border-border text-green-600 hover:border-green-400"}`}
                        >
                          {u.active
                            ? <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />
                            : <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SlideOver criar/editar */}
      <UserSlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        editing={editing}
        brands={brands}
        adminUid={user?.uid ?? ""}
        onSaved={onSaved}
      />

      {/* Modal alterar senha */}
      {pwdModal && (
        <PasswordModal
          user={pwdModal}
          onClose={() => setPwdModal(null)}
        />
      )}

      {/* Confirm ativar/desativar */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm bg-background p-8 fade-in">
            <h3 className="font-display text-xl">
              {confirmUser.action === "deactivate" ? "Desativar cliente?" : "Ativar cliente?"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmUser.action === "deactivate"
                ? `${confirmUser.user.name || confirmUser.user.email} não conseguirá mais fazer login.`
                : `${confirmUser.user.name || confirmUser.user.email} poderá fazer login novamente.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Btn variant="ghost" onClick={() => setConfirmUser(null)}>Cancelar</Btn>
              <Btn
                variant={confirmUser.action === "deactivate" ? "danger" : undefined}
                onClick={() => handleToggleActive(confirmUser.user)}
              >
                {confirmUser.action === "deactivate" ? "Desativar" : "Ativar"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SlideOver criar/editar usuário ───────────────────────────────────────────

function UserSlideOver({
  open, onClose, editing, brands, adminUid, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: ClientUser | null;
  brands: Brand[];
  adminUid: string;
  onSaved: (u: ClientUser, isNew: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", brandId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setShowPwd(false);
      if (editing) {
        setForm({
          name: editing.name ?? "",
          email: editing.email ?? "",
          password: "",
          phone: editing.phone ?? "",
          brandId: editing.brandId ?? "",
          notes: editing.notes ?? "",
        });
      } else {
        setForm({ name: "", email: "", password: "", phone: "", brandId: "", notes: "" });
      }
    }
  }, [open, editing]);

  async function onSave() {
    setError("");
    setSaving(true);
    try {
      if (editing) {
        // Editar
        await updateClientUser(editing.uid, {
          name: form.name,
          phone: form.phone || undefined,
          brandId: form.brandId || undefined,
          notes: form.notes || undefined,
        });
        onSaved({ ...editing, ...form, brandId: form.brandId || undefined }, false);
      } else {
        // Criar novo
        if (!form.password || form.password.length < 6) {
          setError("Senha deve ter pelo menos 6 caracteres.");
          setSaving(false);
          return;
        }
        const uid = await createClientUser({
          email: form.email,
          password: form.password,
          name: form.name,
          brandId: form.brandId || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
          adminUid,
        });
        onSaved({
          uid,
          email: form.email,
          name: form.name,
          role: "client",
          brandId: form.brandId || undefined,
          phone: form.phone || undefined,
          active: true,
        }, true);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Erro desconhecido";
      if (msg.includes("EMAIL_EXISTS")) setError("Este e-mail já está cadastrado.");
      else if (msg.includes("WEAK_PASSWORD")) setError("Senha muito fraca. Use pelo menos 6 caracteres.");
      else setError(`Erro: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  const isAdmin = editing?.role === "admin";

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={editing ? (isAdmin ? "Meu perfil" : `Editar — ${editing.name || editing.email}`) : "Novo cliente"}
      footer={
        <div className="flex justify-end gap-3">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={onSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nome completo">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do cliente"
          />
        </Field>

        <Field label="E-mail">
          <TextInput
            type="email"
            value={form.email}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="cliente@email.com"
          />
          {editing && (
            <p className="mt-1 text-xs text-muted-foreground">E-mail não pode ser alterado após criação.</p>
          )}
        </Field>

        {!editing && (
          <Field label="Senha inicial">
            <div className="relative">
              <TextInput
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        )}

        <Field label="Telefone">
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(81) 99999-9999"
          />
        </Field>

        {!isAdmin && (
          <Field label="Marca vinculada">
            <Select
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              O cliente só conseguirá editar a marca vinculada a ele.
            </p>
          </Field>
        )}

        <Field label="Observações internas">
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notas sobre este cliente (visível só para você)"
          />
        </Field>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    </SlideOver>
  );
}

// ─── Modal alterar senha ───────────────────────────────────────────────────────

function PasswordModal({ user, onClose }: { user: ClientUser; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSave() {
    if (pwd.length < 6) { setError("Mínimo 6 caracteres."); return; }
    setSaving(true);
    try {
      await setUserPassword(user.uid, pwd);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-sm bg-background p-8 fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl">Alterar senha</h3>
            <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
        </div>

        {success ? (
          <p className="mt-6 text-sm text-green-600">✅ Senha alterada com sucesso!</p>
        ) : (
          <>
            <div className="mt-6">
              <Field label="Nova senha">
                <div className="relative">
                  <TextInput
                    type={showPwd ? "text" : "password"}
                    value={pwd}
                    onChange={(e) => { setPwd(e.target.value); setError(""); }}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
              <Btn onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name?: string }) {
  const safe = name ?? "?";
  const initials = safe === "?"
    ? "?"
    : safe.split(" ").map((s) => s?.[0] ?? "").filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-muted text-xs font-medium">
      {initials}
    </div>
  );
}
