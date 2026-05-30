import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { getProducts, getBrands, type Product, type Brand } from "@/lib/api";

export const Route = createFileRoute("/_store/")({
  head: () => ({
    meta: [
      { title: "Casa Branca — Moda autoral" },
      { name: "description", content: "Curadoria minimalista de marcas brasileiras de moda autoral." },
    ],
  }),
  component: Home,
});

function Home() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
    getBrands().then(setBrands);
  }, []);

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-24 md:grid-cols-2 md:items-center md:py-32">
          <div>
            <div className="label-eyebrow text-muted-foreground">Coleção 2026</div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
              Peças que respiram,<br /> formas que permanecem.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Curadoria de marcas brasileiras de moda autoral. Tecidos honestos, recortes precisos, nada supérfluo.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/produtos" className="label-btn inline-flex items-center bg-foreground px-6 py-3 text-background hover:opacity-90">
                Ver Produtos
              </Link>
              <Link to="/marcas" className="label-btn inline-flex items-center border border-foreground px-6 py-3 text-foreground hover:bg-foreground hover:text-background">
                Ver Marcas
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] w-full" style={{ background: "linear-gradient(160deg, #e6e4dd, #fafaf7 60%, #d9c7a3)" }}>
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div className="label-eyebrow text-foreground">Editorial Vol. 04</div>
              <div className="label-eyebrow text-foreground">Outono / Inverno</div>
            </div>
          </div>
        </div>
      </section>

      {/* Novidades */}
      <section className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="label-eyebrow text-muted-foreground">Novidades</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Recém-chegados</h2>
          </div>
          <Link to="/produtos" className="label-nav text-foreground hover:underline">Ver tudo</Link>
        </div>
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="flex gap-6 pb-2 md:grid md:grid-cols-3 md:gap-8">
            {products
              ? products.map((p) => (
                  <div key={p.id} className="w-72 shrink-0 md:w-auto">
                    <ProductCard product={p} />
                  </div>
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-72 shrink-0 md:w-auto">
                    <ProductCardSkeleton />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Marcas */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="mb-8">
            <div className="label-eyebrow text-muted-foreground">Curadoria</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Nossas Marcas</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {brands.map((b) => (
              <Link
                key={b.id}
                to="/marcas/$slug"
                params={{ slug: b.slug }}
                className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden p-8 transition"
                style={{ background: `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor ?? "#fafaf7"})` }}
              >
                <div className="absolute inset-0 bg-foreground/0 transition group-hover:bg-foreground/10" />
                <div className="relative">
                  <div className="font-display text-3xl text-background mix-blend-difference">{b.name}</div>
                  <div className="label-eyebrow mt-2 text-background/90 mix-blend-difference">{b.tagline}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
