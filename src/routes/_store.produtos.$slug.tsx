import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Ruler, X } from "lucide-react";
import { getProductBySlug, getProducts, getBrandById, formatBRL, type Product } from "@/lib/api";
import { useWishlist } from "@/hooks/use-wishlist";
import { ProductCard } from "@/components/store/ProductCard";

export const Route = createFileRoute("/_store/produtos/$slug")({
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [sizeGuide, setSizeGuide] = useState(false);
  const { has, toggle } = useWishlist();

  useEffect(() => {
    getProductBySlug(slug).then((p) => {
      if (!p) return;
      setProduct(p);
      setColor(p.variants?.[0]?.color ?? null);
    });
    getProducts().then((all) => setRelated(all.filter((p) => p.slug !== slug).slice(0, 3)));
  }, [slug]);

  if (!product) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-[3/4] shimmer" />
          <div className="space-y-4">
            <div className="h-4 w-24 shimmer" />
            <div className="h-10 w-3/4 shimmer" />
            <div className="h-6 w-1/3 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const brand = getBrandById(product.brandId);
  const wished = has(product.id);
  const uniqColors = Array.from(new Map((product.variants ?? []).map((v) => [v.color, v])).values());
  const thumbs = [brand?.secondaryColor ?? "#e6e4dd", brand?.primaryColor ?? "#0f0f0f", "#d9c7a3", "#fafaf7"];

  return (
    <div className="fade-in">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <nav className="label-eyebrow mb-8 text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link> &nbsp;/&nbsp;{" "}
          <Link to="/produtos" className="hover:text-foreground">Produtos</Link> &nbsp;/&nbsp; {product.name}
        </nav>

        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <div
              className="group relative aspect-[3/4] w-full overflow-hidden bg-muted"
              style={{ background: `linear-gradient(135deg, ${thumbs[activeImg]}, #fafaf7)` }}
            >
              <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {thumbs.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square border ${i === activeImg ? "border-foreground" : "border-border"}`}
                  style={{ background: `linear-gradient(135deg, ${c}, #fafaf7)` }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="label-eyebrow text-muted-foreground">{brand?.name}</div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3 text-lg">
              {product.salePrice ? (
                <>
                  <span className="text-muted-foreground line-through">{formatBRL(product.basePrice)}</span>
                  <span className="text-[var(--sale)]">{formatBRL(product.salePrice)}</span>
                </>
              ) : (
                <span>{formatBRL(product.basePrice)}</span>
              )}
            </div>

            <div className="mt-8">
              <div className="label-eyebrow mb-2 text-muted-foreground">Cor</div>
              <div className="flex gap-2">
                {uniqColors.map((v) => (
                  <button
                    key={v.color}
                    onClick={() => setColor(v.color)}
                    title={v.colorName}
                    className={`h-8 w-8 border ${color === v.color ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background" : "border-border"}`}
                    style={{ background: v.color }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="label-eyebrow text-muted-foreground">Tamanho</div>
                <button onClick={() => setSizeGuide(true)} className="label-btn inline-flex items-center gap-1 text-foreground hover:underline">
                  <Ruler className="h-3.5 w-3.5" strokeWidth={1.5} /> Guia de medidas
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["S", "M", "G", "GG", "XGG"].map((s) => {
                  const variant = product.variants?.find((v) => v.size === s);
                  const out = !variant || variant.stock === 0;
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      disabled={out}
                      onClick={() => setSize(s)}
                      className={`label-btn h-11 min-w-12 border px-3 ${
                        out
                          ? "cursor-not-allowed border-border text-muted-foreground line-through"
                          : on
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => toggle(product.id)}
              className="label-btn mt-8 flex w-full items-center justify-center gap-2 border border-foreground py-4 text-foreground transition hover:bg-foreground hover:text-background"
            >
              <Heart className="h-4 w-4" strokeWidth={1.5} fill={wished ? "currentColor" : "none"} />
              {wished ? "Salvo na wishlist" : "Adicionar à wishlist"}
            </button>

            <div className="my-10 border-t border-border" />

            <p className="text-sm leading-relaxed text-foreground/80">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="label-eyebrow border border-border px-2.5 py-1 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-24">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl md:text-3xl">Complete o look</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </div>

      {sizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setSizeGuide(false)}>
          <div className="w-full max-w-lg bg-background p-8 fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-display text-2xl">Guia de medidas</h3>
              <button onClick={() => setSizeGuide(false)}><X className="h-5 w-5" strokeWidth={1.5} /></button>
            </div>
            <table className="mt-6 w-full text-sm">
              <thead className="border-b border-border">
                <tr className="label-eyebrow text-muted-foreground">
                  <th className="py-2 text-left">Tamanho</th><th className="text-left">Busto</th><th className="text-left">Cintura</th><th className="text-left">Quadril</th>
                </tr>
              </thead>
              <tbody>
                {[["S", "82–86", "62–66", "88–92"], ["M", "87–91", "67–71", "93–97"], ["G", "92–96", "72–76", "98–102"], ["GG", "97–101", "77–81", "103–107"], ["XGG", "102–106", "82–86", "108–112"]].map((r) => (
                  <tr key={r[0]} className="border-b border-border">{r.map((c, i) => <td key={i} className="py-2">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
