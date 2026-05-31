import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X, Upload, GripVertical, Star, Copy, ExternalLink } from "lucide-react";
import {
  getBrands,
  getCategories,
  getProducts,
  saveProduct,
  uploadImage,
  formatBRL,
  type Brand,
  type Category,
  type Product,
  type Variant,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Field, TextInput, TextArea, Select, Btn } from "@/components/ui-prim";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type Status = "rascunho" | "publicado" | "esgotado";
const MAX_PHOTOS = 8;

export function ProductForm({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gender, setGender] = useState<Product["gender"]>("unissex");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>("rascunho");
  const [isNew, setIsNew] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getBrands().then(setBrands);
    // categorias filtradas pela marca do usuário
    getCategories(isAdmin ? undefined : user?.brandId || undefined).then(setCats);
    if (productId) {
      getProducts(isAdmin ? undefined : { brandId: user?.brandId || undefined }).then((all) => {
        const p = all.find((x) => x.id === productId);
        if (!p) return;
        setName(p.name); setSlug(p.slug); setDescription(p.description ?? ""); setBrandId(p.brandId);
        setCategoryId(p.categoryId ?? ""); setGender(p.gender); setTags(p.tags);
        setBasePrice(p.basePrice); setSalePrice(p.salePrice ?? "");
        setImages(p.images ?? []);
        setVariants(p.variants ?? []); setStatus(p.status); setIsNew(p.isNew); setIsFeatured(!!p.isFeatured);
      });
    } else if (!isAdmin && user?.brandId) {
      // brand_admin: pré-seleciona a própria marca ao criar novo produto
      setBrandId(user.brandId);
    }
  }, [productId, isAdmin, user?.brandId]);

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
  function duplicateVariant(i: number) {
    setVariants([...variants.slice(0, i + 1), { ...variants[i] }, ...variants.slice(i + 1)]);
  }

  async function onUpload(files: FileList | null) {
    if (!files || images.length >= MAX_PHOTOS) return;
    const available = MAX_PHOTOS - images.length;
    const slice = Array.from(files).slice(0, available);
    setUploadError("");
    setUploading(true);
    for (const f of slice) {
      try {
        const url = await uploadImage(f, "product-images");
        setImages((imgs) => [...imgs, url]);
      } catch (err: any) {
        setUploadError(err?.message ?? "Erro ao enviar imagem. Verifique o arquivo e tente novamente.");
        break;
      }
    }
    setUploading(false);
  }

  function setAsCover(i: number) {
    if (i === 0) return;
    setImages((imgs) => [imgs[i], ...imgs.filter((_, idx) => idx !== i)]);
  }

  async function save(nextStatus?: Status) {
    setSaveError("");
    setSaving(true);
    try {
      const finalStatus = nextStatus ?? status;
      await saveProduct({
        id: productId, name, slug, description, brandId, categoryId, gender, tags,
        basePrice: Number(basePrice) || 0, salePrice: salePrice === "" ? null : Number(salePrice),
        images, variants, status: finalStatus, isNew, isFeatured,
      });
      navigate({ to: "/admin/produtos" });
    } catch (err: any) {
      setSaveError(err?.message ?? "Erro ao salvar produto. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const brand = brands.find((b) => b.id === brandId);

  return (
    <div className="pb-32 fade-in">
      <div className="mx-auto grid max-w-7xl gap-8 p-6 md:p-10 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
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
            <div className={`grid gap-5 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              {isAdmin && (
                <Field label="Marca">
                  <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                    <option value="">— Selecionar —</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              )}
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

          <Section title="Fotos" right={<span className="text-xs text-muted-foreground">{images.length}/{MAX_PHOTOS} fotos</span>}>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (!uploading) onUpload(e.dataTransfer.files); }}
              className={`flex h-44 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm text-muted-foreground hover:border-foreground ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              {uploading ? (
                <>
                  <div className="h-6 w-6 animate-spin border-2 border-border border-t-foreground" />
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" strokeWidth={1.5} />
                  <span>Arraste fotos aqui ou clique para selecionar</span>
                  <span className="text-[10px]">PNG, JPG até 5MB cada</span>
                </>
              )}
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} disabled={images.length >= MAX_PHOTOS || uploading} />
            </label>
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((src, i) => (
                  <div key={i} className="group relative h-[150px] w-full border border-border bg-muted">
                    {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                    {i === 0 && (
                      <span className="absolute left-1 top-1 label-eyebrow bg-foreground px-1.5 py-0.5 text-background">CAPA</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 p-1 opacity-0 transition group-hover:opacity-100">
                      <button title="Reordenar" className="cursor-grab p-1 hover:text-foreground">
                        <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button title="Definir como capa" onClick={() => setAsCover(i)} className="p-1 hover:text-foreground">
                        <Star className="h-3.5 w-3.5" strokeWidth={1.5} fill={i === 0 ? "currentColor" : "none"} />
                      </button>
                      <button title="Remover" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="p-1 hover:text-[var(--sale)]">
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Variantes">
            <div className="overflow-x-auto border border-border bg-card">
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
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 shrink-0 border border-border" style={{ background: v.color }} />
                          <input type="color" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} className="h-8 w-10 border border-border bg-background" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="w-full border border-border bg-background px-2 py-1.5 text-sm font-mono" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className="w-20 border border-border bg-background px-2 py-1.5 text-sm" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => duplicateVariant(i)} title="Copiar linha" className="p-1 text-muted-foreground hover:text-foreground">
                            <Copy className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <button onClick={() => removeVariant(i)} title="Remover" className="p-1 text-[var(--sale)] hover:opacity-70">
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {variants.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma variante adicionada.</td></tr>
                  )}
                </tbody>
                {variants.length > 0 && (
                  <tfoot className="border-t border-border bg-muted/30">
                    <tr className="text-sm">
                      <td colSpan={4} className="px-3 py-2 text-right font-medium">Estoque total</td>
                      <td className="px-3 py-2 font-medium">{totalStock} un.</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
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

        {/* Sticky preview sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 border border-border bg-card">
            <div className="label-eyebrow border-b border-border px-4 py-3 text-muted-foreground">Prévia</div>
            <div className="aspect-[3/4] w-full border-b border-border bg-muted">
              {images[0] ? (
                <img src={images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: brand ? `linear-gradient(135deg, ${brand.secondaryColor}, ${brand.primaryColor})` : "var(--muted)" }}
                />
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="label-eyebrow text-muted-foreground">{brand?.name ?? "—"}</div>
              <div className="font-display text-lg">{name || "Sem título"}</div>
              <div className="text-sm">
                {salePrice !== "" && Number(salePrice) > 0 ? (
                  <>
                    <span className="text-muted-foreground line-through">{formatBRL(Number(basePrice) || 0)}</span>{" "}
                    <span className="text-[var(--sale)]">{formatBRL(Number(salePrice))}</span>
                  </>
                ) : (
                  formatBRL(Number(basePrice) || 0)
                )}
              </div>
              <div className="pt-2">
                <span className={`label-eyebrow px-2 py-1 ${status === "publicado" ? "bg-[var(--success)] text-white" : status === "esgotado" ? "bg-[var(--sale)] text-white" : "bg-muted text-foreground"}`}>
                  {status}
                </span>
              </div>
              {slug && status === "publicado" ? (
                <a
                  href={`/produtos/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="label-btn mt-3 flex items-center justify-center gap-2 border border-border py-2 hover:border-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> Ver prévia completa
                </a>
              ) : (
                <button
                  disabled
                  className="label-btn mt-3 flex w-full items-center justify-center gap-2 border border-border py-2 text-muted-foreground opacity-60"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> Ver prévia completa
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background">
        {saveError && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-600">{saveError}</div>
        )}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/admin/produtos" className="label-btn text-muted-foreground hover:text-foreground">Cancelar</Link>
          <div className="flex gap-3">
            <Btn variant="outline" type="button" onClick={() => save("rascunho")} disabled={saving || uploading}>
              {saving ? "Salvando…" : "Salvar rascunho"}
            </Btn>
            <Btn type="button" onClick={() => save("publicado")} disabled={saving || uploading}>
              {saving ? "Salvando…" : "Publicar"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {right}
      </div>
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
        <span className={`absolute top-0.5 h-4 w-4 transition ${checked ? "left-6 bg-background" : "left-0.5 bg-foreground"}`} />
      </button>
    </label>
  );
}
