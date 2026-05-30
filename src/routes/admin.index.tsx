import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Package, Tag, ImageOff, AlertTriangle, Users,
  ArrowRight, Settings2, Layers,
} from "lucide-react";
import { getProducts, getBrands, type Product, type Brand } from "@/lib/api";
import { getAllUsers } from "@/lib/users";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises: Promise<any>[] = [
      getProducts().then(setProducts),
      getBrands().then(setBrands),
    ];
    if (isAdmin) {
      promises.push(getAllUsers().then((u) => setUserCount(u.filter((x) => x.role !== "admin").length)));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [isAdmin]);

  const noPhoto = products.filter((p) => !p.images || p.images.length === 0).length;
  const lowStock = products.filter((p) => (p.variants ?? []).some((v) => v.stock > 0 && v.stock < 5)).length;
  const publishedProducts = products.filter((p) => p.status === "publicado").length;

  const adminCards = [
    { label: "Marcas cadastradas", value: brands.length, sub: `${brands.length > 0 ? "Gerenciar →" : "Cadastre a primeira"}`, icon: Tag, to: "/admin/marcas", warn: false },
    { label: "Clientes", value: userCount, sub: "Acessos criados", icon: Users, to: "/admin/usuarios", warn: false },
    { label: "Produtos publicados", value: publishedProducts, sub: `de ${products.length} no total`, icon: Package, to: "/admin/produtos", warn: false },
    { label: "Precisam de atenção", value: noPhoto + lowStock, sub: `${noPhoto} sem foto · ${lowStock} baixo estoque`, icon: AlertTriangle, to: "/admin/produtos", warn: noPhoto + lowStock > 0 },
  ];

  const clientCards = [
    { label: "Produtos publicados", value: publishedProducts, sub: `de ${products.length} no total`, icon: Package, to: "/admin/produtos", warn: false },
    { label: "Sem foto", value: noPhoto, sub: "Produtos sem imagem", icon: ImageOff, to: "/admin/produtos", warn: noPhoto > 0 },
    { label: "Baixo estoque", value: lowStock, sub: "Menos de 5 unidades", icon: AlertTriangle, to: "/admin/produtos", warn: lowStock > 0 },
  ];

  const cards = isAdmin ? adminCards : clientCards;

  const quickLinks = isAdmin
    ? [
        { to: "/admin/marcas", icon: Tag, label: "Nova marca", desc: "Cadastre uma marca com identidade visual" },
        { to: "/admin/usuarios", icon: Users, label: "Novo cliente", desc: "Crie acesso para um cliente" },
        { to: "/admin/produtos", icon: Package, label: "Produtos", desc: "Gerencie o catálogo completo" },
        { to: "/admin/configuracoes", icon: Settings2, label: "Configurações", desc: "Logo, cores, banners e WhatsApp" },
      ]
    : [
        { to: "/admin/produtos", icon: Package, label: "Produtos", desc: "Adicione e edite produtos do seu catálogo" },
        { to: "/admin/categorias", icon: Layers, label: "Categorias", desc: "Organize as categorias do catálogo" },
        { to: "/admin/configuracoes", icon: Settings2, label: "Configurações", desc: "Identidade visual e preferências" },
      ];

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="label-eyebrow text-muted-foreground">Visão geral</p>
        <h1 className="mt-1 font-display text-4xl">Dashboard</h1>
        {isAdmin && (
          <p className="mt-1 text-sm text-amber-600 font-medium">⚡ Super Admin</p>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 border border-border shimmer" />)}
        </div>
      ) : (
        <div className={`grid gap-4 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {cards.map(({ label, value, sub, icon: Icon, to, warn }) => (
            <Link key={label} to={to} className={`group border p-6 transition hover:-translate-y-0.5 hover:shadow-sm ${warn ? "border-amber-300 bg-amber-50" : "border-border bg-card hover:border-foreground"}`}>
              <div className="flex items-start justify-between">
                <span className="label-eyebrow text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${warn ? "text-amber-500" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </div>
              <div className="mt-4 font-display text-4xl">{value}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{sub}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-10">
        <p className="label-eyebrow mb-4 text-muted-foreground">Acesso rápido</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-start gap-3 border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground hover:shadow-sm"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background transition group-hover:border-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting started (só aparece quando não há marcas ou produtos) */}
      {isAdmin && brands.length === 0 && (
        <div className="mt-10 border border-dashed border-border p-8">
          <p className="label-eyebrow text-muted-foreground">Primeiros passos</p>
          <h2 className="mt-2 font-display text-2xl">Bem-vindo ao painel</h2>
          <div className="mt-6 space-y-4">
            {[
              { n: "01", label: "Cadastre uma marca", desc: "Crie a identidade visual da primeira marca.", to: "/admin/marcas" },
              { n: "02", label: "Adicione produtos", desc: "Importe fotos, preços e variantes.", to: "/admin/produtos" },
              { n: "03", label: "Crie o acesso do cliente", desc: "Gere login para o dono da marca.", to: "/admin/usuarios" },
            ].map((s) => (
              <Link key={s.n} to={s.to} className="flex items-start gap-5 border-t border-border pt-4 group hover:opacity-80">
                <div className="font-display text-3xl text-muted-foreground">{s.n}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
