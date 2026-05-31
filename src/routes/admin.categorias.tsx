import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getCategories, saveCategory, deleteCategory, type Category } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SlideOver } from "@/components/SlideOver";
import { Btn, Field, TextInput, Select } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/categorias")({
  component: AdminCategorias,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function AdminCategorias() {
  const { user, isAdmin, loading } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "🏷️", parentId: "", order: 1 });

  const brandId = isAdmin ? undefined : user?.brandId || undefined;

  useEffect(() => {
    if (loading) return;
    getCategories(brandId).then(setCats);
  }, [user, isAdmin, loading]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", slug: "", icon: "🏷️", parentId: "", order: cats.length + 1 });
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, icon: c.icon, parentId: c.parentId ?? "", order: c.order });
    setOpen(true);
  }
  async function onSave() {
    await saveCategory({ ...form, id: editing?.id, parentId: form.parentId || null }, brandId);
    const updated = await getCategories(brandId);
    setCats(updated);
    setOpen(false);
  }
  async function onDelete(id: string) {
    await deleteCategory(id);
    setCats((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-muted-foreground">Estrutura</div>
          <h1 className="mt-2 font-display text-4xl">Categorias</h1>
        </div>
        <Btn onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nova categoria</Btn>
      </div>

      <div className="mt-8 border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="label-eyebrow text-left text-muted-foreground">
              <th className="px-5 py-3">Ícone</th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Categoria pai</th>
              <th className="px-5 py-3">Ordem</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const parent = cats.find((p) => p.id === c.parentId);
              return (
                <tr key={c.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 text-xl">{c.icon}</td>
                  <td className="px-5 py-4 font-medium">{c.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{parent?.name ?? "—"}</td>
                  <td className="px-5 py-4">{c.order}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                      </button>
                      <button onClick={() => onDelete(c.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
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
          <Field label="Ícone (emoji)">
            <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </Field>
          <Field label="Categoria pai">
            <Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">— Nenhuma —</option>
              {cats.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem">
            <TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </Field>
        </div>
      </SlideOver>
    </div>
  );
}
