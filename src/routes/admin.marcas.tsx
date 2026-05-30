import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Instagram } from "lucide-react";
import { getBrands, saveBrand, deleteBrand, getProducts, type Brand, type Product } from "@/lib/api";
import { SlideOver } from "@/components/SlideOver";
import { Btn, Field, TextInput, TextArea } from "@/components/ui-prim";
import { ToggleSwitch } from "@/routes/admin.configuracoes";

export const Route = createFileRoute("/admin/marcas")({
  component: AdminBrands,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type BrandForm = {
  name: string; slug: string; tagline: string; description: string;
  primaryColor: string; secondaryColor: string;
  website?: string; instagram?: string; active: boolean;
};

const emptyForm: BrandForm = {
  name: "", slug: "", tagline: "", description: "",
  primaryColor: "#0f0f0f", secondaryColor: "#e6e4dd",
  website: "", instagram: "", active: true,
};

function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);

  useEffect(() => {
    getBrands().then(setBrands);
    getProducts().then(setProducts);
  }, []);

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(b: Brand) {
    setEditing(b);
    setForm({
      name: b.name, slug: b.slug, tagline: b.tagline, description: b.description ?? "",
      primaryColor: b.primaryColor, secondaryColor: b.secondaryColor ?? "#e6e4dd",
      website: "", instagram: "", active: true,
    });
    setOpen(true);
  }
  async function onSave() {
    await saveBrand({ ...form, id: editing?.id });
    setOpen(false);
  }
  async function onDelete(id: string) {
    await deleteBrand(id);
    setBrands((bs) => bs.filter((b) => b.id !== id));
    setConfirmId(null);
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
        <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nova marca</Btn>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => {
          const count = productCount(b.id);
          return (
            <div key={b.id} className="group relative border border-border bg-card transition hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
              <div className="h-[200px] w-full" style={{ background: `linear-gradient(135deg, ${b.secondaryColor ?? "#e6e4dd"}, ${b.primaryColor})` }} />
              <div className="-mt-10 px-5">
                <div className="inline-flex h-16 w-16 items-center justify-center border border-border bg-background font-display text-2xl">
                  {b.name.charAt(0)}
                </div>
              </div>
              <div className="px-5 pb-5 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl">{b.name}</h3>
                  <span className="label-eyebrow bg-[var(--success)] px-2 py-0.5 text-white">ativo</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="label-eyebrow border border-border px-2 py-1">{count} produto{count === 1 ? "" : "s"}</span>
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 border border-border" style={{ background: b.primaryColor }} title={b.primaryColor} />
                    <span className="h-4 w-4 border border-border" style={{ background: b.secondaryColor }} title={b.secondaryColor} />
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-end gap-2 border-t border-border bg-background/95 p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <button onClick={() => openEdit(b)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                </button>
                <button onClick={() => setConfirmId(b.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar marca" : "Nova marca"}
        footer={
          <div className="flex justify-end gap-3">
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn onClick={onSave}>Salvar</Btn>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Nome">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          </Field>
          <Field label="Slug">
            <TextInput value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
          </Field>
          <Field label="Tagline">
            <TextInput value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Logo">
            <div className="flex h-32 items-center justify-center border border-dashed border-border text-xs text-muted-foreground">
              Arraste uma imagem ou clique para enviar
            </div>
          </Field>
          <Field label="Banner">
            <div className="flex h-32 items-center justify-center border border-dashed border-border text-xs text-muted-foreground">
              Arraste uma imagem ou clique para enviar
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor primária">
              <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-full border border-border bg-background" />
            </Field>
            <Field label="Cor secundária">
              <input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="h-10 w-full border border-border bg-background" />
            </Field>
          </div>
          <Field label="Website">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <TextInput value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://exemplo.com" />
            </div>
          </Field>
          <Field label="Instagram">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <TextInput value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@marca" />
            </div>
          </Field>
          <label className="flex items-center justify-between border border-border px-4 py-3">
            <span className="text-sm">Marca ativa</span>
            <ToggleSwitch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </label>
        </div>
      </SlideOver>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm bg-background p-8 fade-in">
            <h3 className="font-display text-xl">Excluir marca?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
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
