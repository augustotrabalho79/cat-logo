import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Instagram, ToggleLeft, ToggleRight, Copy, Check } from "lucide-react";
import { getBrands, saveBrand, deleteBrand, getProducts, uploadImage, type Brand, type Product } from "@/lib/api";
import { SlideOver } from "@/components/SlideOver";
import { Btn, Field, TextInput, TextArea } from "@/components/ui-prim";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/marcas")({
  component: AdminBrands,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type BrandForm = {
  name: string; slug: string; tagline: string; description: string;
  primaryColor: string; secondaryColor: string;
  website: string; instagram: string; active: boolean;
};

const emptyForm: BrandForm = {
  name: "", slug: "", tagline: "", description: "",
  primaryColor: "#0f0f0f", secondaryColor: "#e6e4dd",
  website: "", instagram: "", active: true,
};

function AdminBrands() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();

  useEffect(() => {
    Promise.all([getBrands(), getProducts()])
      .then(([b, p]) => { setBrands(b); setProducts(p); })
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setLogoPreview(undefined);
    setBannerPreview(undefined);
    setOpen(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    setForm({
      name: b.name ?? "",
      slug: b.slug ?? "",
      tagline: b.tagline ?? "",
      description: b.description ?? "",
      primaryColor: b.primaryColor ?? "#0f0f0f",
      secondaryColor: b.secondaryColor ?? "#e6e4dd",
      website: b.website ?? "",
      instagram: b.instagram ?? "",
      active: b.active !== false,
    });
    setLogoPreview(b.logoUrl);
    setBannerPreview(b.bannerUrl);
    setFormError("");
    setFormSuccess("");
    setOpen(true);
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, "logos");
      setLogoPreview(url);
    } catch (e: any) {
      setFormError(`Erro no upload do logo: ${e.message}`);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleBannerUpload(file: File) {
    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, "banners");
      setBannerPreview(url);
    } catch (e: any) {
      setFormError(`Erro no upload do banner: ${e.message}`);
    } finally {
      setUploadingBanner(false);
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/catalogo/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  async function onSave() {
    if (!form.name.trim()) { setFormError("Nome da marca é obrigatório."); return; }
    if (!form.slug.trim()) { setFormError("Slug é obrigatório."); return; }
    if (uploadingLogo || uploadingBanner) { setFormError("Aguarde o upload terminar."); return; }

    setFormError("");
    setFormSuccess("");
    setSaving(true);

    try {
      const payload: Partial<Brand> & { name: string } = {
        ...form,
        slug: form.slug || slugify(form.name),
        id: editing?.id,
        logoUrl: logoPreview,
        bannerUrl: bannerPreview,
      };
      const savedId = await saveBrand(payload, user?.uid);

      const savedBrand: Brand = {
        id: savedId,
        ...payload,
        active: form.active,
      } as Brand;

      if (editing) {
        setBrands((bs) => bs.map((b) => b.id === editing.id ? savedBrand : b));
        setFormSuccess("Marca atualizada com sucesso!");
      } else {
        setBrands((bs) => [savedBrand, ...bs]);
        setFormSuccess("Marca criada com sucesso!");
      }

      setTimeout(() => { setOpen(false); setFormSuccess(""); }, 1200);
    } catch (err: any) {
      console.error("Erro ao salvar marca:", err);
      if (err?.code === "permission-denied") {
        setFormError("Sem permissão. Verifique se está logado.");
      } else {
        setFormError(`Erro: ${err?.message ?? "tente novamente"}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteBrand(id);
      setBrands((bs) => bs.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert(`Erro ao excluir: ${err?.message}`);
    }
    setConfirmId(null);
  }

  async function onToggleActive(b: Brand) {
    const newActive = !(b as any).active;
    try {
      await saveBrand({ ...b, active: newActive } as any);
      setBrands((bs) => bs.map((x) => x.id === b.id ? { ...x, active: newActive } as any : x));
    } catch (err: any) {
      alert(`Erro: ${err?.message}`);
    }
  }

  function productCount(brandId: string) {
    return products.filter((p) => p.brandId === brandId).length;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-muted-foreground">Curadoria</div>
          <h1 className="mt-2 font-display text-4xl">Marcas</h1>
        </div>
        <Btn onClick={openNew}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Nova marca
        </Btn>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 border border-border shimmer" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="mt-16 border border-dashed border-border p-16 text-center">
          <p className="font-display text-2xl text-muted-foreground">Nenhuma marca cadastrada</p>
          <p className="mt-2 text-sm text-muted-foreground">Clique em "Nova marca" para começar.</p>
          <div className="mt-6">
            <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nova marca</Btn>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const count = productCount(b.id);
            const isActive = (b as any).active !== false;
            return (
              <div key={b.id} className={`group relative border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md ${!isActive ? "opacity-60" : ""}`}>
                <div className="h-[160px] w-full" style={{ background: `linear-gradient(135deg, ${b.secondaryColor ?? "#e6e4dd"} 0%, ${b.primaryColor} 100%)` }} />
                <div className="-mt-8 px-5">
                  <div className="inline-flex h-14 w-14 items-center justify-center border border-border bg-background font-display text-xl shadow-sm">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl leading-tight">{b.name}</h3>
                    <span className={`label-eyebrow shrink-0 px-2 py-0.5 ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {isActive ? "ativo" : "inativo"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{b.tagline || "Sem tagline"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="label-eyebrow border border-border px-2 py-1 text-muted-foreground">
                      {count} produto{count !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-4 w-4 border border-border" style={{ background: b.primaryColor }} title={b.primaryColor} />
                      <span className="h-4 w-4 border border-border" style={{ background: b.secondaryColor }} title={b.secondaryColor} />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between gap-2 border-t border-border bg-background/95 p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => copyLink(b.slug)}
                      title="Copiar link público"
                      className="label-btn inline-flex items-center gap-1 border border-border px-2 py-1.5 hover:border-foreground"
                    >
                      {copiedSlug === b.slug
                        ? <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={1.5} />
                        : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    </button>
                    <a
                      href={`/catalogo/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver catálogo"
                      className="label-btn inline-flex items-center gap-1 border border-border px-2 py-1.5 hover:border-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(b)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                    </button>
                    <button onClick={() => onToggleActive(b)} title={isActive ? "Desativar" : "Ativar"} className="label-btn inline-flex items-center gap-1 border border-border px-2 py-1.5 hover:border-foreground">
                      {isActive ? <ToggleRight className="h-3.5 w-3.5 text-green-600" strokeWidth={1.5} /> : <ToggleLeft className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />}
                    </button>
                    <button onClick={() => setConfirmId(b.id)} className="label-btn inline-flex items-center gap-1 border border-border px-2 py-1.5 text-red-500 hover:border-red-400">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SlideOver */}
      <SlideOver
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? `Editar — ${editing.name}` : "Nova marca"}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              {formSuccess && <p className="text-xs text-green-600">{formSuccess}</p>}
            </div>
            <div className="flex gap-3">
              <Btn variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Btn>
              <Btn onClick={onSave} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Btn>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Nome *">
            <TextInput
              value={form.name}
              placeholder="Ex: Atelier Branco"
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: f.slug && f.slug !== slugify(f.name) ? f.slug : slugify(name),
                }));
              }}
            />
          </Field>

          <Field label="Slug *">
            <TextInput
              value={form.slug}
              placeholder="ex: atelier-branco"
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL pública: /catalogo/<strong>{form.slug || "slug-da-marca"}</strong>
            </p>
          </Field>

          <Field label="Tagline">
            <TextInput
              value={form.tagline}
              placeholder="Frase curta da marca"
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </Field>

          <Field label="Descrição">
            <TextArea
              value={form.description}
              placeholder="Sobre a marca..."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor primária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer border border-border bg-background"
                />
                <TextInput
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  placeholder="#0f0f0f"
                />
              </div>
            </Field>
            <Field label="Cor secundária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer border border-border bg-background"
                />
                <TextInput
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  placeholder="#e6e4dd"
                />
              </div>
            </Field>
          </div>

          {/* Upload Logo */}
          <Field label="Logo da marca">
            <UploadArea
              preview={logoPreview}
              uploading={uploadingLogo}
              onFile={handleLogoUpload}
              onClear={() => setLogoPreview(undefined)}
              hint="PNG ou SVG com fundo transparente"
            />
          </Field>

          {/* Upload Banner */}
          <Field label="Banner / Capa">
            <UploadArea
              preview={bannerPreview}
              uploading={uploadingBanner}
              onFile={handleBannerUpload}
              onClear={() => setBannerPreview(undefined)}
              hint="Recomendado: 1440x400px"
              wide
            />
          </Field>

          <Field label="Website">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <TextInput
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://site.com"
              />
            </div>
          </Field>

          <Field label="Instagram">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <TextInput
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@marca"
              />
            </div>
          </Field>

          <label className="flex items-center justify-between border border-border px-4 py-3 cursor-pointer">
            <span className="text-sm">Marca ativa (visível no catálogo)</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative h-6 w-11 border transition ${form.active ? "border-foreground bg-foreground" : "border-border bg-background"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 transition ${form.active ? "left-6 bg-background" : "left-0.5 bg-foreground"}`} />
            </button>
          </label>

          {/* Link público */}
          {form.slug && (
            <div className="border border-border bg-muted-bg p-3">
              <p className="label-eyebrow mb-1 text-muted-foreground">Link público do catálogo</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-muted-foreground break-all">
                  {window.location.origin}/catalogo/{form.slug}
                </code>
                <button
                  type="button"
                  onClick={() => copyLink(form.slug)}
                  className="shrink-0 border border-border p-1.5 hover:border-foreground"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {form.name && (
            <div className="border border-border p-4">
              <p className="label-eyebrow mb-2 text-muted-foreground">Preview</p>
              <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${form.secondaryColor}, ${form.primaryColor})` }} />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center border border-border bg-background font-display text-sm">
                  {form.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-display text-lg">{form.name}</span>
              </div>
            </div>
          )}
        </div>
      </SlideOver>

      {/* Confirm delete */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm bg-background p-8 fade-in">
            <h3 className="font-display text-xl">Excluir marca?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Os produtos vinculados perderão a referência.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Btn variant="ghost" onClick={() => setConfirmId(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => onDelete(confirmId)}>Excluir</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UploadArea ───────────────────────────────────────────────────────────────

function UploadArea({
  preview, onFile, onClear, hint, uploading, wide,
}: {
  preview?: string;
  onFile: (f: File) => void;
  onClear: () => void;
  hint?: string;
  uploading?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="relative">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && !uploading) onFile(f); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background text-xs text-muted-foreground transition hover:border-foreground ${wide ? "h-32" : "h-24"} ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <div className="h-5 w-5 animate-spin border-2 border-border border-t-foreground" />
            <span>Enviando para Cloudinary…</span>
          </>
        ) : preview ? (
          <img src={preview} alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <>
            <span className="text-lg">↑</span>
            <span>Arraste ou clique para enviar</span>
            {hint && <span className="text-[10px] opacity-70">{hint}</span>}
          </>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
      {preview && !uploading && (
        <button type="button" onClick={onClear} className="absolute right-2 top-2 border border-border bg-background p-1 text-xs hover:border-foreground">✕</button>
      )}
    </div>
  );
}
