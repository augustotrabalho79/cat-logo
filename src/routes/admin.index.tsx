import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Tag, ImageOff, AlertTriangle } from "lucide-react";
import { getProducts, getBrands, type Product, type Brand } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub: string; icon: typeof Package }) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="label-eyebrow text-muted-foreground">{label}</div>
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="mt-4 font-display text-4xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
    getBrands().then(setBrands);
  }, []);

  const noPhoto = products.filter((p) => !p.images || p.images.length === 0).length;
  const lowStock = products.filter((p) => (p.variants ?? []).some((v) => v.stock > 0 && v.stock < 5)).length;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
      <div className="label-eyebrow text-muted-foreground">Visão geral</div>
      <h1 className="mt-2 font-display text-4xl">Dashboard</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Total produtos" value={products.length} sub="No catálogo" icon={Package} />
        <StatCard label="Marcas cadastradas" value={brands.length} sub="Curadoria ativa" icon={Tag} />
        <StatCard label="Sem foto" value={noPhoto} sub="Requerem atenção" icon={ImageOff} />
        <StatCard label="Baixo estoque" value={lowStock} sub="< 5 unidades" icon={AlertTriangle} />
      </div>

      <div className="mt-12 border border-border bg-card p-8">
        <div className="label-eyebrow text-muted-foreground">Início rápido</div>
        <h2 className="mt-2 font-display text-2xl">Comece pelos fundamentos</h2>
        <ol className="mt-6 space-y-4">
          {[
            { n: "01", t: "Cadastre as marcas", d: "Crie cada marca com nome, tagline, paleta e descrição." },
            { n: "02", t: "Defina as categorias", d: "Estruture sua árvore: camisas, calças, vestidos, acessórios." },
            { n: "03", t: "Adicione produtos", d: "Importe fotos, descrições, variantes de cor e tamanho." },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-5 border-t border-border pt-4">
              <div className="font-display text-3xl text-muted-foreground">{s.n}</div>
              <div>
                <div className="text-sm font-medium">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
