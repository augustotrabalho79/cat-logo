import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Plus, Pencil, Trash2, GripVertical, Image as ImageIcon, X } from "lucide-react";
import {
  getStoreSettings, saveStoreSettings, type StoreSettings,
  getBanners, saveBanner, deleteBanner, type Banner, type BannerPosition, bannerPositionLabel,
  getVendors, saveVendor, deleteVendor, type Vendor, type VendorRole,
  getNotificationSettings, saveNotificationSettings, type NotificationSettings,
  uploadImage,
} from "@/lib/api";
import { Btn, Field, TextInput, TextArea, Select } from "@/components/ui-prim";
import { SlideOver } from "@/components/SlideOver";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminSettings,
});

const TABS = [
  { id: "identidade", label: "Identidade da loja" },
  { id: "banners", label: "Banners" },
  { id: "vendedores", label: "Vendedores" },
  { id: "notificacoes", label: "Notificações" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function AdminSettings() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("identidade");

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin", replace: true });
  }, [isAdmin, loading, navigate]);

  if (loading || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 fade-in">
      <div className="label-eyebrow text-muted-foreground">Administração</div>
      <h1 className="mt-2 font-display text-4xl">Configurações</h1>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`label-btn -mb-px whitespace-nowrap border-b-2 px-4 py-3 ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "identidade" && <IdentityTab />}
        {tab === "banners" && <BannersTab />}
        {tab === "vendedores" && <VendorsTab />}
        {tab === "notificacoes" && <NotificationsTab />}
      </div>
    </div>
  );
}

/* ---------------- Identity ---------------- */
function IdentityTab() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [faviconPreview, setFaviconPreview] = useState<string | undefined>();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    getStoreSettings().then((d) => {
      setS(d);
      setLogoPreview(d.logoUrl);
      setFaviconPreview(d.faviconUrl);
    });
  }, []);

  if (!s) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, "brand-assets");
      setLogoPreview(url);
    } catch {
      setLogoPreview(URL.createObjectURL(file)); // Fallback preview local
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleFaviconUpload(file: File) {
    setUploadingFavicon(true);
    try {
      const url = await uploadImage(file, "brand-assets");
      setFaviconPreview(url);
    } catch {
      setFaviconPreview(URL.createObjectURL(file));
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function onSave() {
    if (!s) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await saveStoreSettings({ ...s, logoUrl: logoPreview, faviconUrl: faviconPreview });
      setSuccess("Configurações salvas com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`Erro ao salvar: ${e?.message ?? "tente novamente"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nome da loja">
          <TextInput value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        </Field>
        <Field label="Slogan">
          <TextInput value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} />
        </Field>
      </div>

      <Field label="Descrição">
        <TextArea value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
      </Field>

      <Field label="WhatsApp para receber pedidos">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">+</span>
          <TextInput
            value={(s as any).whatsapp ?? ""}
            onChange={(e) => setS({ ...s, whatsapp: e.target.value } as any)}
            placeholder="5581999999999 (com código do país)"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Número que receberá os pedidos dos clientes via WhatsApp. Inclua código do país (55) e DDD.
        </p>
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Logo">
          <FilePreview
            preview={logoPreview}
            uploading={uploadingLogo}
            onFile={handleLogoUpload}
            onClear={() => setLogoPreview(undefined)}
            hint="PNG ou SVG, fundo transparente"
          />
        </Field>
        <Field label="Favicon">
          <FilePreview
            preview={faviconPreview}
            uploading={uploadingFavicon}
            onFile={handleFaviconUpload}
            onClear={() => setFaviconPreview(undefined)}
            hint="32x32px recomendado"
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Cor primária">
          <div className="flex items-center gap-3">
            <input type="color" value={s.primaryColor} onChange={(e) => setS({ ...s, primaryColor: e.target.value })} className="h-10 w-16 cursor-pointer border border-border bg-background" />
            <TextInput value={s.primaryColor} onChange={(e) => setS({ ...s, primaryColor: e.target.value })} />
          </div>
        </Field>
        <Field label="Cor secundária">
          <div className="flex items-center gap-3">
            <input type="color" value={s.secondaryColor} onChange={(e) => setS({ ...s, secondaryColor: e.target.value })} className="h-10 w-16 cursor-pointer border border-border bg-background" />
            <TextInput value={s.secondaryColor} onChange={(e) => setS({ ...s, secondaryColor: e.target.value })} />
          </div>
        </Field>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
        </div>
        <Btn onClick={onSave} disabled={saving || uploadingLogo || uploadingFavicon}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Btn>
      </div>
    </div>
  );
}

function FilePreview({
  preview, onFile, onClear, hint, uploading,
}: {
  preview?: string;
  onFile: (f: File) => void;
  onClear: () => void;
  hint?: string;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && !uploading) onFile(f); }}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background text-xs text-muted-foreground transition hover:border-foreground ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <div className="h-5 w-5 animate-spin border-2 border-border border-t-foreground" />
            <span>Enviando…</span>
          </>
        ) : preview ? (
          <img src={preview} alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <>
            <Upload className="h-5 w-5" strokeWidth={1.5} />
            <span>Arraste ou clique para enviar</span>
            {hint && <span className="text-[10px] opacity-70">{hint}</span>}
          </>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </label>
      {preview && !uploading && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 border border-border bg-background p-1 hover:border-foreground"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/* ---------------- Banners ---------------- */
function BannersTab() {
  const [list, setList] = useState<Banner[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { getBanners().then((bs) => setList([...bs].sort((a, b) => a.order - b.order))); }, []);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(b: Banner) { setEditing(b); setOpen(true); }

  async function onToggleActive(b: Banner) {
    const next = { ...b, active: !b.active };
    setList((ls) => ls.map((x) => (x.id === b.id ? next : x)));
    await saveBanner(next);
  }
  async function onDelete(id: string) {
    await deleteBanner(id);
    setList((ls) => ls.filter((x) => x.id !== id));
    setConfirmId(null);
  }
  async function onSave(data: Partial<Banner>) {
    const saved: Banner = {
      id: editing?.id ?? `b${Date.now()}`,
      title: data.title ?? "",
      subtitle: data.subtitle,
      imageUrl: data.imageUrl,
      buttonText: data.buttonText,
      buttonLink: data.buttonLink,
      position: (data.position as BannerPosition) ?? "hero",
      order: data.order ?? list.length + 1,
      active: data.active ?? true,
    };
    await saveBanner(saved);
    setList((ls) => {
      const exists = ls.find((x) => x.id === saved.id);
      return (exists ? ls.map((x) => (x.id === saved.id ? saved : x)) : [...ls, saved]).sort((a, b) => a.order - b.order);
    });
    setOpen(false);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} banner(s) cadastrado(s)</p>
        <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Adicionar banner</Btn>
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <div key={b.id} className="flex items-center gap-4 border border-border bg-card p-3">
            <button className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Reordenar">
              <GripVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="flex h-20 w-32 shrink-0 items-center justify-center border border-border bg-muted">
              {b.imageUrl ? <img src={b.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate font-medium">{b.title || "Sem título"}</h4>
                <span className="label-eyebrow border border-border px-2 py-0.5">#{b.order}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{bannerPositionLabel[b.position]}</div>
              {b.subtitle && <div className="mt-1 truncate text-xs text-muted-foreground">{b.subtitle}</div>}
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={b.active} onChange={() => onToggleActive(b)} />
              <button onClick={() => openEdit(b)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
              </button>
              <button onClick={() => setConfirmId(b.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhum banner cadastrado.</div>
        )}
      </div>

      <BannerSlideOver open={open} onClose={() => setOpen(false)} initial={editing} onSave={onSave} />
      {confirmId && <ConfirmDialog title="Excluir banner?" onCancel={() => setConfirmId(null)} onConfirm={() => onDelete(confirmId)} />}
    </div>
  );
}

function BannerSlideOver({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: Banner | null; onSave: (b: Partial<Banner>) => void }) {
  const [form, setForm] = useState<Partial<Banner>>({});
  const [preview, setPreview] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setForm(initial ?? { title: "", position: "hero", order: 1, active: true });
      setPreview(initial?.imageUrl);
    }
  }, [open, initial]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Editar banner" : "Novo banner"}
      footer={
        <div className="flex justify-end gap-3">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave({ ...form, imageUrl: preview })}>Salvar</Btn>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Imagem do banner (recomendado 1440x600px)">
          <FilePreview preview={preview} onFile={(f) => setPreview(URL.createObjectURL(f))} onClear={() => setPreview(undefined)} />
        </Field>
        <Field label="Título">
          <TextInput value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Subtítulo">
          <TextInput value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto do botão">
            <TextInput value={form.buttonText ?? ""} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} placeholder="Opcional" />
          </Field>
          <Field label="Link do botão">
            <TextInput value={form.buttonLink ?? ""} onChange={(e) => setForm({ ...form, buttonLink: e.target.value })} placeholder="/produtos" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Posição">
            <Select value={form.position ?? "hero"} onChange={(e) => setForm({ ...form, position: e.target.value as BannerPosition })}>
              {(Object.keys(bannerPositionLabel) as BannerPosition[]).map((p) => (
                <option key={p} value={p}>{bannerPositionLabel[p]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem">
            <TextInput type="number" min={1} value={form.order ?? 1} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </Field>
        </div>
        <label className="flex items-center justify-between border border-border px-4 py-3">
          <span className="text-sm">Banner ativo</span>
          <ToggleSwitch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
        </label>
      </div>
    </SlideOver>
  );
}

/* ---------------- Vendors ---------------- */
function VendorsTab() {
  const [list, setList] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { getVendors().then(setList); }, []);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(v: Vendor) { setEditing(v); setOpen(true); }
  async function onDelete(id: string) {
    await deleteVendor(id);
    setList((ls) => ls.filter((x) => x.id !== id));
    setConfirmId(null);
  }
  async function onSave(data: Partial<Vendor>) {
    const saved: Vendor = {
      id: editing?.id ?? `v${Date.now()}`,
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      role: (data.role as VendorRole) ?? "vendedor",
      commission: data.commission,
      active: data.active ?? true,
      avatarUrl: data.avatarUrl,
    };
    await saveVendor(saved);
    setList((ls) => {
      const exists = ls.find((x) => x.id === saved.id);
      return exists ? ls.map((x) => (x.id === saved.id ? saved : x)) : [...ls, saved];
    });
    setOpen(false);
  }

  const roleLabel: Record<VendorRole, string> = { vendedor: "Vendedor", gerente: "Gerente", admin: "Admin" };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} vendedor(es) cadastrado(s)</p>
        <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Adicionar vendedor</Btn>
      </div>

      <div className="border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="label-eyebrow text-left text-muted-foreground">
              <th className="px-5 py-3"></th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Telefone</th>
              <th className="px-5 py-3">Função</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3">
                  <Avatar name={v.name} url={v.avatarUrl} />
                </td>
                <td className="px-5 py-3 font-medium">{v.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.email}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.phone}</td>
                <td className="px-5 py-3">{roleLabel[v.role]}</td>
                <td className="px-5 py-3">
                  <span className={`label-eyebrow px-2 py-1 ${v.active ? "bg-[var(--success)] text-white" : "bg-muted text-muted-foreground"}`}>
                    {v.active ? "ativo" : "inativo"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(v)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                    </button>
                    <button onClick={() => setConfirmId(v.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">Nenhum vendedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <VendorSlideOver open={open} onClose={() => setOpen(false)} initial={editing} onSave={onSave} />
      {confirmId && <ConfirmDialog title="Excluir vendedor?" onCancel={() => setConfirmId(null)} onConfirm={() => onDelete(confirmId)} />}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
  if (url) return <img src={url} alt={name} className="h-10 w-10 border border-border object-cover" />;
  return <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted text-xs font-medium">{initials}</div>;
}

function VendorSlideOver({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: Vendor | null; onSave: (v: Partial<Vendor>) => void }) {
  const [form, setForm] = useState<Partial<Vendor>>({});
  const [avatar, setAvatar] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setForm(initial ?? { name: "", email: "", phone: "", role: "vendedor", active: true });
      setAvatar(initial?.avatarUrl);
    }
  }, [open, initial]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Editar vendedor" : "Novo vendedor"}
      footer={
        <div className="flex justify-end gap-3">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave({ ...form, avatarUrl: avatar })}>Salvar</Btn>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden border border-border bg-muted">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Avatar</div>}
            </div>
          </div>
          <label className="label-btn inline-flex cursor-pointer items-center gap-2 border border-border px-3 py-2 hover:border-foreground">
            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            Enviar foto
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)); }} />
          </label>
          {avatar && <button type="button" onClick={() => setAvatar(undefined)} className="text-xs text-muted-foreground hover:text-[var(--sale)]">Remover</button>}
        </div>
        <Field label="Nome">
          <TextInput value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Telefone">
          <TextInput value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Função">
            <Select value={form.role ?? "vendedor"} onChange={(e) => setForm({ ...form, role: e.target.value as VendorRole })}>
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Comissão (%)">
            <TextInput type="number" min={0} max={100} step="0.1" value={form.commission ?? ""} onChange={(e) => setForm({ ...form, commission: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Opcional" />
          </Field>
        </div>
        <label className="flex items-center justify-between border border-border px-4 py-3">
          <span className="text-sm">Vendedor ativo</span>
          <ToggleSwitch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
        </label>
      </div>
    </SlideOver>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsTab() {
  const [s, setS] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getNotificationSettings().then(setS); }, []);
  if (!s) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  async function onSave() {
    if (!s) return;
    setSaving(true);
    await saveNotificationSettings(s);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <ToggleRow label="Receber email quando novo pedido chegar" checked={s.onNewOrder} onChange={(v) => setS({ ...s, onNewOrder: v })} />
      <ToggleRow label="Receber email quando produto ficar sem estoque" checked={s.onOutOfStock} onChange={(v) => setS({ ...s, onOutOfStock: v })} />
      <ToggleRow label="Receber email quando produto tiver baixo estoque" checked={s.onLowStock} onChange={(v) => setS({ ...s, onLowStock: v })} />
      <div className="grid gap-5 pt-4 md:grid-cols-2">
        <Field label="Limite de baixo estoque (unidades)">
          <TextInput type="number" min={1} value={s.lowStockThreshold} onChange={(e) => setS({ ...s, lowStockThreshold: Number(e.target.value) })} />
        </Field>
        <Field label="Email para notificações">
          <TextInput type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end pt-4">
        <Btn onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Btn>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between border border-border px-4 py-3">
      <span className="text-sm">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </label>
  );
}

/* ---------------- Shared ---------------- */
export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 border transition ${checked ? "border-foreground bg-foreground" : "border-border bg-background"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 transition ${checked ? "left-6 bg-background" : "left-0.5 bg-foreground"}`} />
    </button>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-sm bg-background p-8 fade-in">
        <h3 className="font-display text-xl">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm}>Excluir</Btn>
        </div>
      </div>
    </div>
  );
}
