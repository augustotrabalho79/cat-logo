import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBrandBySlug, getProducts, getCategories, type Brand, type Product, type Category, formatBRL } from "@/lib/api";
import { Heart, ShoppingBag, Search, ChevronLeft, Instagram, Phone } from "lucide-react";

export const Route = createFileRoute("/catalogo/$slug")({
  component: CatalogPage,
});

function CatalogPage() {
  const { slug } = Route.useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const b = await getBrandBySlug(slug);
      if (!b || !b.active) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBrand(b);
      const [prods, cats] = await Promise.all([
        getProducts({ brandId: b.id, status: "publicado" }),
        getCategories(b.id),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    }
    load().catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return <CatalogSkeleton />;

  if (notFound || !brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-4xl">Catálogo não encontrado</p>
        <p className="text-sm text-muted-foreground">O link pode estar errado ou a marca foi desativada.</p>
        <Link to="/" className="text-xs uppercase tracking-widest underline underline-offset-4">Voltar ao início</Link>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Aplica tema da marca
  const style = {
    "--brand-primary": brand.primaryColor ?? "#0f0f0f",
    "--brand-secondary": brand.secondaryColor ?? "#e6e4dd",
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-background fade-in">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-8 object-contain" />
          ) : (
            <span className="font-display text-xl">{brand.name}</span>
          )}
          <div className="flex items-center gap-3">
            {brand.whatsapp && (
              <a
                href={`https://wa.me/${brand.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:border-foreground"
                style={{ borderColor: brand.primaryColor }}
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                Pedir via WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {brand.bannerUrl ? (
        <div className="relative h-56 w-full md:h-80 overflow-hidden">
          <img src={brand.bannerUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-foreground/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-background text-center px-6">
            <h1 className="font-display text-4xl md:text-6xl drop-shadow">{brand.name}</h1>
            {brand.tagline && <p className="mt-2 text-sm opacity-90">{brand.tagline}</p>}
          </div>
        </div>
      ) : (
        <div
          className="relative h-48 w-full md:h-72 flex flex-col items-center justify-center text-center px-6"
          style={{ background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"} 0%, ${brand.primaryColor} 100%)` }}
        >
          <h1 className="font-display text-4xl md:text-6xl" style={{ color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
            {brand.name}
          </h1>
          {brand.tagline && <p className="mt-2 text-sm text-white/80">{brand.tagline}</p>}
        </div>
      )}

      {/* Busca + Categorias */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* Busca */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          {/* Categorias */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest transition ${!selectedCategory ? "bg-foreground text-background" : "border border-border hover:border-foreground"}`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-widest transition ${selectedCategory === c.id ? "bg-foreground text-background" : "border border-border hover:border-foreground"}`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Produtos */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl text-muted-foreground">Nenhum produto encontrado</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4">
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {filtered.map((p) => (
                <CatalogProductCard key={p.id} product={p} brand={brand} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs uppercase tracking-widest text-muted-foreground">
          <span>{brand.name}</span>
          <div className="flex items-center gap-4">
            {brand.instagram && (
              <a href={`https://instagram.com/${brand.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1">
                <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />
                {brand.instagram}
              </a>
            )}
            {brand.whatsapp && (
              <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function CatalogProductCard({ product: p, brand }: { product: Product; brand: Brand }) {
  const cover = p.images?.[0];
  const hasPromo = p.salePrice && p.salePrice < p.basePrice;

  return (
    <div className="group relative border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Imagem */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={p.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"}, ${brand.primaryColor})` }}
          />
        )}
        {p.isNew && (
          <span className="absolute left-2 top-2 bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-widest text-background">
            Novo
          </span>
        )}
        {hasPromo && (
          <span className="absolute right-2 top-2 bg-red-500 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white">
            Promo
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
        <div className="mt-2 flex items-center gap-2">
          {hasPromo ? (
            <>
              <span className="text-sm font-medium text-red-500">{formatBRL(p.salePrice!)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatBRL(p.basePrice)}</span>
            </>
          ) : (
            <span className="text-sm font-medium">{formatBRL(p.basePrice)}</span>
          )}
        </div>
        {p.variants && p.variants.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set(p.variants.map((v) => v.size))].slice(0, 5).map((s) => (
              <span key={s} className="border border-border px-1.5 py-0.5 text-[10px] uppercase">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border shimmer" />
      <div className="h-56 shimmer md:h-80" />
      <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(8)].map((_, i) => <div key={i} className="aspect-square shimmer" />)}
      </div>
    </div>
  );
}
