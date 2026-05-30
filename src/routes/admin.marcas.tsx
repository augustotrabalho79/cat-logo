import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getBrands, saveBrand, deleteBrand, type Brand } from "@/lib/api";
import { SlideOver } from "@/components/SlideOver";
import { Btn, Field, TextInput, TextArea } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/marcas")({
  component: AdminBrands,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", slug: "", tagline: "", description: "", primaryColor: "#0f0f0f", secondaryColor: "#e6e4dd" });

  useEffect(() => { getBrands().then(setBrands); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", slug: "", tagline: "", description: "", primaryColor: "#0f0f0f", secondaryColor: "#e6e4dd" });
    setOpen(true);
  }
  function openEdit(b: Brand) {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, tagline: b.tagline, description: b.description ?? "", primaryColor: b.primaryColor, secondaryColor: b.secondaryColor ?? "#e6e4dd" });
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

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-muted-foreground">Curadoria</div>
          <h1 className="mt-2 font-display text-4xl">Marcas</h1>
        </div>
        <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nova marca</Btn>
      </div>

      <div className="mt-8 border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="label-eyebrow text-left text-muted-foreground">
              <th className="px-5 py-3">Logo</th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Tagline</th>
              <th className="px-5 py-3">Cor primária</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center border border-border bg-background font-display">{b.name.charAt(0)}</div>
                </td>
                <td className="px-5 py-4 font-medium">{b.name}</td>
                <td className="px-5 py-4 text-muted-foreground">{b.tagline}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 border border-border" style={{ background: b.primaryColor }} />
                    <span className="font-mono text-xs">{b.primaryColor}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(b)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                    </button>
                    <button onClick={() => setConfirmId(b.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
