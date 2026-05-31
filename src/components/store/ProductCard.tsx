import { Link } from "@tanstack/react-router";
import { type Product, getBrandById, formatBRL } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const brand = getBrandById(product.brandId);
  const isSold = product.status === "esgotado";
  const onSale = product.salePrice != null;

  return (
    <Link
      to="/produtos/$slug"
      params={{ slug: product.slug }}
      className="group block fade-in"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <div
          className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"
          style={{ background: `linear-gradient(135deg, ${brand?.secondaryColor ?? "#e6e4dd"}, #fafaf7)` }}
        />
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(315deg, ${brand?.primaryColor ?? "#0f0f0f"}22, #fafaf7)` }}
        />

        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.isNew && (
            <span className="label-eyebrow bg-foreground px-2 py-1 text-background">Novo</span>
          )}
          {onSale && (
            <span className="label-eyebrow bg-[var(--sale)] px-2 py-1 text-white">Promo</span>
          )}
          {isSold && (
            <span className="label-eyebrow bg-muted-foreground px-2 py-1 text-background">Esgotado</span>
          )}
        </div>

      </div>

      <div className="mt-3 space-y-1">
        <div className="label-eyebrow text-muted-foreground">{brand?.name}</div>
        <div className="text-sm text-foreground">{product.name}</div>
        <div className="flex items-baseline gap-2 text-sm">
          {onSale ? (
            <>
              <span className="text-muted-foreground line-through">{formatBRL(product.basePrice)}</span>
              <span className="text-[var(--sale)]">{formatBRL(product.salePrice!)}</span>
            </>
          ) : (
            <span className="text-foreground">{formatBRL(product.basePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] w-full shimmer" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-16 shimmer" />
        <div className="h-4 w-3/4 shimmer" />
        <div className="h-4 w-1/3 shimmer" />
      </div>
    </div>
  );
}
