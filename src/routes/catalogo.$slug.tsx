import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  getBrandBySlug, getProducts, getCategories,
  type Brand, type Product, type Category, formatBRL,
} from "@/lib/api";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/store/CartDrawer";
import {
  ShoppingBag, Search, Instagram, Phone,
  X, ChevronLeft, ChevronRight, Plus, Minus, Check,
} from "lucide-react";

export const Route = createFileRoute("/catalogo/$slug")({
  component: CatalogPage,
});

// ── Página principal ───────────────────────────────────────────────────────────

function CatalogPage() {
  const { slug } = Route.useParams();
  const cart = useCart(slug);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const b = await getBrandBySlug(slug);
      // active === false: marca explicitamente desativada pelo admin
      // active undefined: marca antiga sem campo → tratar como ativa
      if (!b || b.active === false) { setNotFound(true); setLoading(false); return; }
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

  const handleAddToCart = useCallback((item: CartItem) => {
    cart.addItem(item);
    setDetailProduct(null);
    setFeedbackMsg(`"${item.productName}" adicionado!`);
    setTimeout(() => setFeedbackMsg(null), 2500);
  }, [cart]);

  const openDetail = useCallback((p: Product) => setDetailProduct(p), []);
  const closeDetail = useCallback(() => setDetailProduct(null), []);

  if (loading) return <CatalogSkeleton />;

  if (notFound || !brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-4xl">Catálogo não encontrado</p>
        <p className="text-sm text-muted-foreground">
          O link pode estar errado ou a marca foi desativada.
        </p>
        <Link to="/" className="text-xs uppercase tracking-widest underline underline-offset-4">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const style = {
    "--brand-primary": brand.primaryColor ?? "#0f0f0f",
    "--brand-secondary": brand.secondaryColor ?? "#e6e4dd",
  } as React.CSSProperties;

  const catalogUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div style={style} className="min-h-screen bg-background fade-in">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-8 object-contain" />
          ) : (
            <span className="font-display text-xl">{brand.name}</span>
          )}

          <div className="flex items-center gap-2">
            {brand.whatsapp && (
              <a
                href={`https://wa.me/${brand.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:border-foreground transition"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                Contato
              </a>
            )}
            <button
              onClick={() => cart.setOpen(true)}
              className="relative flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:border-foreground transition"
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Pedido</span>
              {cart.count > 0 && (
                <span className="flex h-4 w-4 items-center justify-center bg-foreground text-[9px] font-bold text-background">
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero banner ── */}
      {brand.bannerUrl ? (
        <div className="relative h-56 w-full overflow-hidden md:h-80">
          <img src={brand.bannerUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-foreground/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-background">
            <h1 className="font-display text-4xl drop-shadow md:text-6xl">{brand.name}</h1>
            {brand.tagline && <p className="mt-2 text-sm opacity-90">{brand.tagline}</p>}
          </div>
        </div>
      ) : (
        <div
          className="relative flex h-48 w-full flex-col items-center justify-center px-6 text-center md:h-72"
          style={{
            background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"} 0%, ${brand.primaryColor} 100%)`,
          }}
        >
          <h1
            className="font-display text-4xl md:text-6xl"
            style={{ color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
          >
            {brand.name}
          </h1>
          {brand.tagline && <p className="mt-2 text-sm text-white/80">{brand.tagline}</p>}
        </div>
      )}

      {/* ── Busca + Categorias ── */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="relative min-w-48 flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos…"
              className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground transition"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                  !selectedCategory
                    ? "bg-foreground text-background"
                    : "border border-border hover:border-foreground"
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                    selectedCategory === c.id
                      ? "bg-foreground text-background"
                      : "border border-border hover:border-foreground"
                  }`}
                >
                  {c.icon && <span>{c.icon}</span>}
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grade de produtos ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-32">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl text-muted-foreground">Nenhum produto encontrado</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {filtered.map((p) => (
                <CatalogProductCard
                  key={p.id}
                  product={p}
                  brand={brand}
                  onSelect={() => openDetail(p)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-12 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs uppercase tracking-widest text-muted-foreground md:flex-row">
          <span>{brand.name}</span>
          <div className="flex items-center gap-4">
            {brand.instagram && (
              <a
                href={`https://instagram.com/${brand.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition"
              >
                <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />
                {brand.instagram}
              </a>
            )}
            {brand.whatsapp && (
              <a
                href={`https://wa.me/${brand.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* ── Botão flutuante de carrinho (mobile) ── */}
      {cart.count > 0 && (
        <button
          onClick={() => cart.setOpen(true)}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 bg-foreground px-4 py-3 text-xs font-medium uppercase tracking-widest text-background shadow-lg transition hover:opacity-90 md:hidden"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
          Ver pedido · {cart.count} {cart.count === 1 ? "item" : "itens"}
        </button>
      )}

      {/* ── Toast de feedback ── */}
      {feedbackMsg && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 bg-foreground px-4 py-2.5 text-xs uppercase tracking-widest text-background shadow-lg md:bottom-8">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span className="max-w-[220px] truncate">{feedbackMsg}</span>
        </div>
      )}

      {/* ── Modal de detalhe do produto ── */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          brand={brand}
          onClose={closeDetail}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── Cart Drawer ── */}
      <CartDrawer cart={cart} brand={brand} catalogUrl={catalogUrl} />
    </div>
  );
}

// ── Card de produto ────────────────────────────────────────────────────────────

function CatalogProductCard({
  product: p,
  brand,
  onSelect,
}: {
  product: Product;
  brand: Brand;
  onSelect: () => void;
}) {
  const cover = p.images?.[0];
  const hasPromo = p.salePrice != null && p.salePrice < p.basePrice;
  const isEsgotado = p.status === "esgotado";

  return (
    <div
      className="group relative cursor-pointer border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* Imagem */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={p.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"}, ${brand.primaryColor})`,
            }}
          />
        )}
        {p.isNew && !isEsgotado && (
          <span className="absolute left-2 top-2 bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-widest text-background">
            Novo
          </span>
        )}
        {hasPromo && !isEsgotado && (
          <span className="absolute right-2 top-2 bg-red-500 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white">
            Promo
          </span>
        )}
        {isEsgotado && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="bg-muted-foreground px-3 py-1 text-[10px] uppercase tracking-widest text-background">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
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
              <span key={s} className="border border-border px-1.5 py-0.5 text-[10px] uppercase">
                {s}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 group-hover:opacity-100 transition">
          Ver detalhes →
        </p>
      </div>
    </div>
  );
}

// ── Modal de detalhes do produto ───────────────────────────────────────────────

function ProductDetailModal({
  product,
  brand,
  onClose,
  onAddToCart,
}: {
  product: Product;
  brand: Brand;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}) {
  const images = (product.images ?? []).filter(Boolean);
  const variants = product.variants ?? [];

  const [imgIdx, setImgIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedColorName, setSelectedColorName] = useState("");
  const [qty, setQty] = useState(1);
  const [addError, setAddError] = useState("");

  // Fechar com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Tamanhos únicos
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

  // Cores disponíveis (filtradas pelo tamanho selecionado)
  const colorsMap = new Map<string, { color: string; colorName: string; stock: number }>();
  variants.forEach((v) => {
    if (!selectedSize || v.size === selectedSize) {
      const prev = colorsMap.get(v.color);
      colorsMap.set(v.color, {
        color: v.color,
        colorName: v.colorName,
        stock: (prev?.stock ?? 0) + v.stock,
      });
    }
  });
  const colors = [...colorsMap.values()];

  // Estoque para a combinação selecionada
  const selectedVariant = variants.find(
    (v) =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor),
  );
  const stockCombo = selectedVariant?.stock ?? null;

  const price = product.salePrice ?? product.basePrice;
  const hasPromo = product.salePrice != null && product.salePrice < product.basePrice;
  const isEsgotado = product.status === "esgotado";

  function handleSelectSize(s: string) {
    setSelectedSize(s);
    setSelectedColor("");
    setSelectedColorName("");
    setAddError("");
  }

  function handleSelectColor(c: { color: string; colorName: string }) {
    setSelectedColor(c.color);
    setSelectedColorName(c.colorName);
    setAddError("");
  }

  function handleAdd() {
    setAddError("");
    if (sizes.length > 0 && !selectedSize) { setAddError("Selecione um tamanho."); return; }
    if (colors.length > 0 && !selectedColor) { setAddError("Selecione uma cor."); return; }
    if (stockCombo !== null && qty > stockCombo) {
      setAddError(`Apenas ${stockCombo} unidade${stockCombo !== 1 ? "s" : ""} disponível.`);
      return;
    }
    onAddToCart({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      image: images[0],
      selectedSize: selectedSize || undefined,
      selectedColor: selectedColor || undefined,
      selectedColorName: selectedColorName || undefined,
      quantity: qty,
      unitPrice: price,
      sku: selectedVariant?.sku,
    });
  }

  function prevImg() { setImgIdx((i) => (i - 1 + images.length) % images.length); }
  function nextImg() { setImgIdx((i) => (i + 1) % images.length); }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer / Modal */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-background shadow-2xl fade-in overflow-y-auto">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <p className="label-eyebrow text-muted-foreground">Detalhes do produto</p>
          <button onClick={onClose} className="p-1 hover:opacity-70" aria-label="Fechar">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Galeria de imagens */}
        <div className="relative shrink-0 aspect-[4/3] w-full overflow-hidden bg-muted md:aspect-square">
          {images.length > 0 ? (
            <>
              <img
                src={images[imgIdx]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 p-2 hover:bg-background transition"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 p-2 hover:bg-background transition"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"}, ${brand.primaryColor})`,
              }}
            />
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.isNew && !isEsgotado && (
              <span className="label-eyebrow bg-foreground px-2 py-1 text-background">Novo</span>
            )}
            {hasPromo && !isEsgotado && (
              <span className="label-eyebrow bg-red-500 px-2 py-1 text-white">Promo</span>
            )}
            {isEsgotado && (
              <span className="label-eyebrow bg-muted-foreground px-2 py-1 text-background">Esgotado</span>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-5 py-3">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden border-2 transition ${
                  i === imgIdx ? "border-foreground" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col gap-5 p-5">

          {/* Nome + Preço */}
          <div>
            <h2 className="font-display text-2xl leading-tight">{product.name}</h2>
            <div className="mt-2 flex items-baseline gap-3">
              {hasPromo ? (
                <>
                  <span className="font-display text-2xl text-red-500">{formatBRL(product.salePrice!)}</span>
                  <span className="text-sm text-muted-foreground line-through">{formatBRL(product.basePrice)}</span>
                </>
              ) : (
                <span className="font-display text-2xl">{formatBRL(product.basePrice)}</span>
              )}
            </div>
          </div>

          {/* Descrição */}
          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {/* Tamanhos */}
          {sizes.length > 0 && (
            <div>
              <p className="label-eyebrow mb-2 text-muted-foreground">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSelectSize(s)}
                    className={`min-w-10 border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                      selectedSize === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cores */}
          {colors.length > 0 && (
            <div>
              <p className="label-eyebrow mb-2 text-muted-foreground">
                Cor{selectedColorName ? ` — ${selectedColorName}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    title={c.colorName}
                    onClick={() => handleSelectColor(c)}
                    className={`relative h-8 w-8 border-2 transition ${
                      selectedColor === c.color ? "border-foreground" : "border-transparent hover:border-foreground/40"
                    }`}
                    style={{ background: c.color }}
                  >
                    {selectedColor === c.color && (
                      <Check
                        className="absolute inset-0 m-auto h-4 w-4"
                        strokeWidth={2.5}
                        style={{ color: isColorLight(c.color) ? "#000" : "#fff" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info de estoque */}
          {stockCombo !== null && selectedSize && selectedColor && (
            <p className={`text-xs ${stockCombo <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
              {stockCombo === 0
                ? "Esta variante está esgotada."
                : `${stockCombo} unidade${stockCombo !== 1 ? "s" : ""} disponíve${stockCombo !== 1 ? "is" : "l"}`}
            </p>
          )}

          {/* Quantidade */}
          <div>
            <p className="label-eyebrow mb-2 text-muted-foreground">Quantidade</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center border border-border hover:border-foreground transition"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <span className="w-6 text-center text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center border border-border hover:border-foreground transition"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {addError && <p className="text-xs text-red-500">{addError}</p>}

          {/* Botão adicionar */}
          <button
            onClick={handleAdd}
            disabled={isEsgotado || (stockCombo !== null && stockCombo === 0)}
            className="flex items-center justify-center gap-2 bg-foreground px-4 py-3.5 text-xs uppercase tracking-widest text-background transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            {isEsgotado ? "Produto esgotado" : "Adicionar ao pedido"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border shimmer" />
      <div className="h-56 shimmer md:h-80" />
      <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square shimmer" />
            <div className="h-4 w-3/4 shimmer" />
            <div className="h-4 w-1/3 shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isColorLight(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return true;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
