import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { getProducts, getBrands, type Product, type Brand } from "@/lib/api";

export const Route = createFileRoute("/_store/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — Casa Branca" }] }),
  component: ProdutosPage,
});

const sizes = ["S", "M", "G", "GG", "XGG"];
const colors = [
  { name: "Preto", v: "#0f0f0f" },
  { name: "Off-white", v: "#fafaf7" },
  { name: "Areia", v: "#d9c7a3" },
  { name: "Caqui", v: "#8B6914" },
  { name: "Marfim", v: "#f5efe0" },
];

function ProdutosPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [gender, setGender] = useState<string>("todos");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [sort, setSort] = useState("novidades");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts);
    getBrands().then(setBrands);
  }, []);

  const filtered = useMemo(() => {
    if (!products) return null;
    let list = [...products];
    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brandId));
    if (gender !== "todos") list = list.filter((p) => p.gender === gender);
    if (minP) list = list.filter((p) => (p.salePrice ?? p.basePrice) >= Number(minP));
    if (maxP) list = list.filter((p) => (p.salePrice ?? p.basePrice) <= Number(maxP));
    if (sort === "menor") list.sort((a, b) => (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice));
    if (sort === "maior") list.sort((a, b) => (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice));
    return list;
  }, [products, selectedBrands, gender, minP, maxP, sort]);

  function toggle(arr: string[], v: string, set: (a: string[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }
  function clear() {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setGender("todos");
    setMinP("");
    setMaxP("");
  }

  const Filters = (
    <div className="space-y-8">
      <FilterBlock title="Categoria">
        <div className="space-y-2 text-sm">
          {["Camisas", "Calças", "Vestidos", "Acessórios"].map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="checkbox" className="accent-foreground" /> {c}
            </label>
          ))}
        </div>
      </FilterBlock>
      <FilterBlock title="Marca">
        <div className="space-y-2 text-sm">
          {brands.map((b) => (
            <label key={b.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-foreground"
                checked={selectedBrands.includes(b.id)}
                onChange={() => toggle(selectedBrands, b.id, setSelectedBrands)}
              />
              {b.name}
            </label>
          ))}
        </div>
      </FilterBlock>
      <FilterBlock title="Tamanho">
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const on = selectedSizes.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggle(selectedSizes, s, setSelectedSizes)}
                className={`label-btn h-9 w-10 border ${on ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </FilterBlock>
      <FilterBlock title="Cor">
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const on = selectedColors.includes(c.name);
            return (
              <button
                key={c.name}
                title={c.name}
                onClick={() => toggle(selectedColors, c.name, setSelectedColors)}
                className={`h-7 w-7 border ${on ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background" : "border-border"}`}
                style={{ background: c.v }}
              />
            );
          })}
        </div>
      </FilterBlock>
      <FilterBlock title="Gênero">
        <div className="space-y-2 text-sm">
          {["todos", "masculino", "feminino", "unissex", "infantil"].map((g) => (
            <label key={g} className="flex items-center gap-2 capitalize">
              <input type="radio" name="gen" checked={gender === g} onChange={() => setGender(g)} className="accent-foreground" />
              {g}
            </label>
          ))}
        </div>
      </FilterBlock>
      <FilterBlock title="Faixa de preço">
        <div className="flex items-center gap-2">
          <input value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="Mín" className="w-full border border-border bg-background px-2 py-1.5 text-sm" />
          <span className="text-muted-foreground">—</span>
          <input value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="Máx" className="w-full border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
      </FilterBlock>
      <button onClick={clear} className="label-btn w-full border border-border py-2.5 hover:border-foreground">Limpar filtros</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-muted-foreground">Catálogo</div>
          <h1 className="mt-2 font-display text-4xl">Produtos</h1>
        </div>
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-60 shrink-0 md:block">{Filters}</aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between border-y border-border py-3">
            <button onClick={() => setMobileOpen(true)} className="label-btn md:hidden">Filtros</button>
            <div className="text-sm text-muted-foreground">{filtered?.length ?? "…"} produtos encontrados</div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="label-btn border border-border bg-background px-3 py-1.5">
              <option value="novidades">Novidades</option>
              <option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8">
            {filtered
              ? filtered.map((p) => <ProductCard key={p.id} product={p} />)
              : Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-background p-6 fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl">Filtros</h3>
              <button onClick={() => setMobileOpen(false)} className="label-btn">Fechar</button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-eyebrow mb-3 text-foreground">{title}</div>
      {children}
    </div>
  );
}
