import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getProducts, getBrandById, formatBRL, type Product } from "@/lib/api";

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Load products (and warm brand cache) when modal first opens
  useEffect(() => {
    if (open && allProducts.length === 0) {
      getProducts().then(setAllProducts).catch(console.error);
    }
  }, [open, allProducts.length]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const results = useMemo<Product[]>(() => {
    if (!debounced) return [];
    return allProducts.filter((p) => {
      const brand = getBrandById(p.brandId)?.name.toLowerCase() ?? "";
      return (
        p.name.toLowerCase().includes(debounced) ||
        brand.includes(debounced) ||
        p.tags.some((t) => t.toLowerCase().includes(debounced))
      );
    });
  }, [debounced, allProducts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 p-4 pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-2xl border border-border bg-background fade-in rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produtos, marcas, tags…"
            className="flex-1 bg-transparent text-base outline-none"
          />
          <button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {debounced && results.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{debounced}"
            </div>
          )}
          {results.map((p) => {
            const brand = getBrandById(p.brandId);
            return (
              <Link
                key={p.id}
                to="/produtos/$slug"
                params={{ slug: p.slug }}
                onClick={onClose}
                className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted"
              >
                <div
                  className="h-14 w-12 shrink-0 border border-border"
                  style={{ background: `linear-gradient(135deg, ${brand?.secondaryColor ?? "#e6e4dd"}, #fafaf7)` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="label-eyebrow text-muted-foreground">{brand?.name}</div>
                  <div className="truncate text-sm">{p.name}</div>
                </div>
                <div className="text-sm">{formatBRL(p.salePrice ?? p.basePrice)}</div>
              </Link>
            );
          })}
          {!debounced && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Comece a digitar para buscar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
