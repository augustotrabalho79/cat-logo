import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getProducts, deleteProduct, saveProduct, getBrandById, getProductStock, formatBRL, type Product } from "@/lib/api";

export const Route = createFileRoute("/admin/produtos/")({
  component: AdminProdutos,
});

const tabs = [
  { id: "todos", label: "Todos" },
  { id: "publicado", label: "Publicados" },
  { id: "rascunho", label: "Rascunhos" },
  { id: "esgotado", label: "Esgotados" },
] as const;
type Status = Product["status"];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative h-5 w-9 border transition ${checked ? "border-foreground bg-foreground" : "border-border bg-background"}`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 transition ${checked ? "left-5 bg-background" : "left-0.5 bg-foreground"}`} />
    </button>
  );
}

function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { getProducts().then(setProducts); }, []);

  const filtered = useMemo(
    () => (tab === "todos" ? products : products.filter((p) => p.status === tab)),
    [products, tab]
  );

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => {
      const n = new Set(s);
      if (allSelected) filtered.forEach((p) => n.delete(p.id));
      else filtered.forEach((p) => n.add(p.id));
      return n;
    });
  }

  async function onDelete(id: string) {
    await deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  async function patchProduct(p: Product, patch: Partial<Product>) {
    const next = { ...p, ...patch };
    setProducts((ps) => ps.map((x) => (x.id === p.id ? next : x)));
    await saveProduct(next);
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (action === "excluir") {
      if (!confirm(`Excluir ${ids.length} produto(s)?`)) return;
      for (const id of ids) await deleteProduct(id);
      setProducts((ps) => ps.filter((p) => !selected.has(p.id)));
    } else if (action === "publicar" || action === "rascunho") {
      const status: Status = action === "publicar" ? "publicado" : "rascunho";
      setProducts((ps) => ps.map((p) => (selected.has(p.id) ? { ...p, status } : p)));
      for (const id of ids) {
        const p = products.find((x) => x.id === id);
        if (p) await saveProduct({ ...p, status });
      }
    }
    setSelected(new Set());
  }

  function statusBadge(s: Status) {
    const map: Record<Status, string> = {
      publicado: "bg-[var(--success)] text-white",
      rascunho: "bg-muted text-foreground",
      esgotado: "bg-[var(--sale)] text-white",
    };
    return <span className={`label-eyebrow px-2 py-1 ${map[s]}`}>{s}</span>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-muted-foreground">Catálogo</div>
          <h1 className="mt-2 font-display text-4xl">Produtos</h1>
        </div>
        <Link to="/admin/produtos/novo" className="label-btn inline-flex items-center gap-2 bg-foreground px-4 py-2.5 text-background hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Novo produto
        </Link>
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`label-btn -mb-px border-b-2 px-4 py-3 ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex items-center justify-between border border-foreground bg-foreground/5 px-4 py-3">
          <span className="text-sm">{selected.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => { if (e.target.value) { bulkAction(e.target.value); e.target.value = ""; } }}
              className="border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Ações em massa</option>
              <option value="publicar">Publicar selecionados</option>
              <option value="rascunho">Colocar como rascunho</option>
              <option value="excluir">Excluir selecionados</option>
            </select>
            <button onClick={() => setSelected(new Set())} className="label-btn text-muted-foreground hover:text-foreground">Limpar</button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="label-eyebrow text-left text-muted-foreground">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-foreground" />
              </th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Destaque</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const brand = getBrandById(p.brandId);
              const stock = getProductStock(p);
              const cover = p.images?.[0];
              return (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 accent-foreground" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-[50px] w-[50px] border border-border" style={{ background: cover ? undefined : `linear-gradient(135deg, ${brand?.secondaryColor}, ${brand?.primaryColor})` }}>
                      {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{brand?.name}</td>
                  <td className="px-4 py-3">
                    {p.salePrice
                      ? <><span className="text-muted-foreground line-through">{formatBRL(p.basePrice)}</span> <span className="text-[var(--sale)]">{formatBRL(p.salePrice)}</span></>
                      : formatBRL(p.basePrice)}
                  </td>
                  <td className="px-4 py-3">
                    {stock === 0 ? <span className="text-[var(--sale)]">Esgotado</span> : <span>{stock} un.</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch checked={!!p.isFeatured} onChange={(v) => patchProduct(p, { isFeatured: v })} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => patchProduct(p, { status: e.target.value as Status })}
                      className="border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="rascunho">rascunho</option>
                      <option value="publicado">publicado</option>
                      <option value="esgotado">esgotado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to="/admin/produtos/$id/editar" params={{ id: p.id }} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                      </Link>
                      <button onClick={() => onDelete(p.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">Nenhum produto nesta seleção.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
