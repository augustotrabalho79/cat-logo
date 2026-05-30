import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBrands, getProducts, type Brand, type Product } from "@/lib/api";
import { ProductCard } from "@/components/store/ProductCard";

export const Route = createFileRoute("/_store/marcas/$slug")({
  component: BrandPage,
});

function BrandPage() {
  const { slug } = Route.useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getBrands().then((bs) => setBrand(bs.find((b) => b.slug === slug) ?? null));
    getProducts().then(setProducts);
  }, [slug]);

  if (!brand) return <div className="mx-auto max-w-[1400px] px-6 py-16"><div className="h-72 shimmer" /></div>;

  const brandProducts = products.filter((p) => p.brandId === brand.id);

  return (
    <div className="fade-in">
      <div className="relative h-72 w-full md:h-96" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor ?? "#fafaf7"})` }} />

      <div className="mx-auto max-w-[1400px] px-6">
        <div className="-mt-20 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-6">
            <div className="flex h-32 w-32 items-center justify-center border border-border bg-background font-display text-3xl">
              {brand.name.charAt(0)}
            </div>
            <div className="pb-2">
              <h1 className="font-display text-4xl md:text-5xl">{brand.name}</h1>
              <div className="label-eyebrow mt-2 text-muted-foreground">{brand.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="label-eyebrow text-muted-foreground">Paleta</div>
            <div className="h-7 w-7 border border-border" style={{ background: brand.primaryColor }} />
            <div className="h-7 w-7 border border-border" style={{ background: brand.secondaryColor ?? "#fafaf7" }} />
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-foreground/80">{brand.description}</p>

        <div className="mt-16 mb-6 flex items-end justify-between border-b border-border pb-4">
          <h2 className="font-display text-2xl">Produtos da marca</h2>
          <div className="text-sm text-muted-foreground">{brandProducts.length} peças</div>
        </div>

        <div className="grid grid-cols-2 gap-6 pb-20 md:grid-cols-3 md:gap-8">
          {brandProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
