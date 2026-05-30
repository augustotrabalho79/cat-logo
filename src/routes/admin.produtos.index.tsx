import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getProducts, deleteProduct, getBrandById, formatBRL, type Product } from "@/lib/api";
import { Btn } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/produtos/")({
  component: AdminProdutos,
});

const tabs = [
  { id: "todos", label: "Todos" },
  { id: "publicado", label: "Publicados" },
  { id: "rascunho", label: "Rascunhos" },
  { id: "esgotado", label: "Esgotados" },
] as const;

function statusBadge(s: Product["status"]) {
  const map = {
    publicado: "bg-[var(--success)] text-white",
    rascunho: "bg-muted text-foreground",
    esgotado: "bg-[var(--sale)] text-white",
  } as const;
  return <span className={`label-eyebrow px-2 py-1 ${map[s]}`}>{s}</span>;
}

function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("todos");

  useEffect(() => { getProducts().then(setProducts); }, []);

  const filtered = useMemo(
    () => (tab === "todos" ? products : products.filter((p) => p.status === tab)),
    [products, tab]
  );

  async function onDelete(id: string) {
    await deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
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

      <div className="mt-6 border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="label-eyebrow text-left text-muted-foreground">
              <th className="px-5 py-3">Foto</th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Marca</th>
              <th className="px-5 py-3">Preço</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const brand = getBrandById(p.brandId);
              return (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="h-12 w-12 border border-border" style={{ background: `linear-gradient(135deg, ${brand?.secondaryColor}, ${brand?.primaryColor})` }} />
                  </td>
                  <td className="px-5 py-4 font-medium">{p.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{brand?.name}</td>
                  <td className="px-5 py-4">
                    {p.salePrice
                      ? <><span className="text-muted-foreground line-through">{formatBRL(p.basePrice)}</span> <span className="text-[var(--sale)]">{formatBRL(p.salePrice)}</span></>
                      : formatBRL(p.basePrice)}
                  </td>
                  <td className="px-5 py-4">{statusBadge(p.status)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to="/admin/produtos/$id/editar" params={{ id: p.id }} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 hover:border-foreground">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
                      </Link>
                      <button onClick={() => onDelete(p.id)} className="label-btn inline-flex items-center gap-1 border border-border px-3 py-1.5 text-[var(--sale)] hover:border-[var(--sale)]">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Nenhum produto nesta seleção.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
