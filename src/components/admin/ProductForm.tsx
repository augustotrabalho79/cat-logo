import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X, Upload, GripVertical } from "lucide-react";
import {
  getBrands,
  getCategories,
  getProductBySlug,
  getProducts,
  saveProduct,
  uploadImage,
  type Brand,
  type Category,
  type Product,
  type Variant,
} from "@/lib/api";
import { Field, TextInput, TextArea, Select, Btn } from "@/components/ui-prim";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type Status = "rascunho" | "publicado" | "esgotado";

export function ProductForm({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gender, setGender] = useState<Product["gender"]>("unissex");
  const [season, setSeason] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>("rascunho");
  const [isNew, setIsNew] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    getBrands().then(setBrands);
    getCategories().then(setCats);
    if (productId) {
      getProducts().then((all) => {
        const p = all.find((x) => x.id === productId);
        if (!p) return;
        setName(p.name); setSlug(p.slug); setDescription(p.description ?? ""); setBrandId(p.brandId);
        setCategoryId(p.categoryId ?? ""); setGender(p.gender); setTags(p.tags);
        setBasePrice(p.basePrice); setSalePrice(p.salePrice ?? "");
        setVariants(p.variants ?? []); setStatus(p.status); setIsNew(p.isNew); setIsFeatured(!!p.isFeatured);
      });
    }
  }, [productId]);

  function addTag() {
    const parts = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length) {
      setTags(Array.from(new Set([...tags, ...parts])));
      setTagInput("");
    }
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }

  function addVariant() {
    setVariants([...variants, { size: "M", colorName: "", color: "#000000", sku: "", stock: 0 }]);
  }
  function updateVariant(i: number, patch: Partial<Variant>) {
    setVariants(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeVariant(i: number) { setVariants(variants.filter((_, idx) => idx !== i)); }

  async function onUpload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const url = await uploadImage(f, "products");
      setImages((imgs) => [...imgs, url || URL.createObjectURL(f)]);
    }
  }

  async function save(nextStatus?: Status) {
    const finalStatus = nextStatus ?? status;
    await saveProduct({
      id: productId, name, slug, description, brandId, categoryId, gender, season, tags,
      basePrice: Number(basePrice) || 0, salePrice: salePrice === "" ? null : Number(salePrice),
      images, variants, status: finalStatus, isNew, isFeatured,
    });
    navigate({ to: "/admin/produtos" });
  }

  return (
    <div className="pb-32 fade-in">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="label-eyebrow text-muted-foreground">{productId ? "Editar produto" : "Novo produto"}</div>
        <h1 className="mt-2 font-display text-4xl">{name || "Sem título"}</h1>

        <Section title="Informações básicas">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nome">
              <TextInput value={name} onChange={(e) => { setName(e.target.value); if (!productId) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="Slug">
              <TextInput value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </Field>
          </div>
          <Field label="Descrição">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Marca">
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— Selecionar —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— Selecionar —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Gênero">
              <Select value={gender} onChange={(e) => setGender(e.target.value as Product["gender"])}>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="unissex">Unissex</option>
                <option value="infantil">Infantil</option>
              </Select>
            </Field>
          </div>
          <Field label="Estação">
            <TextInput value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Outono / Inverno 2026" />
          </Field>
          <Field label="Tags (separe por vírgula)">
            <div className="flex gap-2">
              <TextInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="linho, verão"
              />
              <Btn type="button" variant="outline" onClick={addTag}>Adicionar</Btn>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="label-eyebrow inline-flex items-center gap-1 border border-border px-2 py-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-[var(--sale)]"><X className="h-3 w-3" strokeWidth={1.5} /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </Section>

        <Section title="Preços">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Preço base (R$)">
              <TextInput type="number" min={0} step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value === "" ? "" : Number(e.target.value))} />
            </Field>
            <Field label="Preço promocional (R$)">
              <TextInput type="number" min={0} step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Opcional" />
            </Field>
          </div>
        </Section>

        <Section title="Fotos">
          <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm text-muted-foreground hover:border-foreground">
            <Upload className="h-5 w-5" strokeWidth={1.5} />
            Arraste imagens ou clique para enviar
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} />
          </label>
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
              {images.map((src, i) => (
                <div key={i} className="group relative aspect-square border border-border bg-muted">
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                  <button className="absolute left-1 top-1 cursor-grab bg-background/80 p-1 opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 bg-background/80 p-1 opacity-0 group-hover:opacity-100">
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Variantes">
          <div className="border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="label-eyebrow text-left text-muted-foreground">
                  <th className="px-3 py-2">Tamanho</th>
                  <th className="px-3 py-2">Cor (nome)</th>
                  <th className="px-3 py-2">Cor</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Estoque</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <select value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} className="border border-border bg-background px-2 py-1.5 text-sm">
                        {["S","M","G","GG","XGG"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.colorName} onChange={(e) => updateVariant(i, { colorName: e.target.value })} className="w-full border border-border bg-background px-2 py-1.5 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="color" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} className="h-9 w-12 border border-border bg-background" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="w-full border border-border bg-background px-2 py-1.5 text-sm font-mono" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className="w-20 border border-border bg-background px-2 py-1.5 text-sm" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeVariant(i)} className="p-1 text-[var(--sale)] hover:opacity-70"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
                    </td>
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma variante adicionada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Btn variant="outline" type="button" onClick={addVariant} className="mt-4">
            <Plus className="h-4 w-4" strokeWidth={1.5} /> Adicionar variante
          </Btn>
        </Section>

        <Section title="Status">
          <div className="grid gap-3 md:grid-cols-3">
            {(["rascunho", "publicado", "esgotado"] as Status[]).map((s) => (
              <label key={s} className={`cursor-pointer border p-4 ${status === s ? "border-foreground" : "border-border hover:border-foreground/40"}`}>
                <input type="radio" name="status" className="sr-only" checked={status === s} onChange={() => setStatus(s)} />
                <div className="label-eyebrow text-muted-foreground">Estado</div>
                <div className="mt-1 font-display text-xl capitalize">{s}</div>
              </label>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <Toggle label="Produto novo" checked={isNew} onChange={setIsNew} />
            <Toggle label="Destaque" checked={isFeatured} onChange={setIsFeatured} />
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/admin/produtos" className="label-btn text-muted-foreground hover:text-foreground">Cancelar</Link>
          <div className="flex gap-3">
            <Btn variant="outline" type="button" onClick={() => save("rascunho")}>Salvar rascunho</Btn>
            <Btn type="button" onClick={() => save("publicado")}>Publicar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between border border-border px-4 py-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 border transition ${checked ? "border-foreground bg-foreground" : "border-border bg-background"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 bg-background transition ${checked ? "left-6 bg-background" : "left-0.5 bg-foreground"}`} />
      </button>
    </label>
  );
}
