/**
 * api.ts — Camada de dados (Supabase Postgres + Cloudinary)
 * Mantém a mesma API pública da versão Firestore para minimizar mudanças no frontend.
 *
 * Mapeamentos:
 *   DB snake_case (logo_url, brand_id...) ↔ TS camelCase (logoUrl, brandId...)
 *   profiles.role: super_admin → "admin" | brand_admin → "client"
 */

import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type Brand = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  website?: string;
  instagram?: string;
  whatsapp?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
};

export type ProductStatus = "publicado" | "rascunho" | "esgotado";

export type Variant = {
  size: string;
  colorName: string;
  color: string;
  sku: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  basePrice: number;
  salePrice: number | null;
  status: ProductStatus;
  isNew: boolean;
  isFeatured?: boolean;
  gender: "masculino" | "feminino" | "unissex" | "infantil";
  tags: string[];
  description?: string;
  images?: string[];
  variants?: Variant[];
  categoryId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  order: number;
  brandId?: string;
};

export type BannerPosition = "hero" | "novidades" | "entre-categorias" | "rodape" | "lateral";

export type Banner = {
  id: string;
  brandId?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  position: BannerPosition;
  order: number;
  active: boolean;
};

export const bannerPositionLabel: Record<BannerPosition, string> = {
  hero: "Hero principal",
  novidades: "Seção novidades",
  "entre-categorias": "Entre categorias",
  rodape: "Rodapé da home",
  lateral: "Lateral produtos",
};

export type VendorRole = "vendedor" | "gerente" | "admin";

export type Vendor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: VendorRole;
  commission?: number;
  active: boolean;
  avatarUrl?: string;
};

export type NotificationSettings = {
  onNewOrder: boolean;
  onOutOfStock: boolean;
  onLowStock: boolean;
  lowStockThreshold: number;
  email: string;
};

export type StoreSettings = {
  name: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  whatsapp?: string;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getProductStock(p: Product): number {
  return (p.variants ?? []).reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function getLowStockCount(products: Product[], threshold = 5): number {
  return products.filter((p) => {
    const stock = getProductStock(p);
    return stock > 0 && stock <= threshold;
  }).length;
}

export function computeProductStatus(
  variants: Variant[],
  current: ProductStatus = "publicado",
): ProductStatus {
  const totalStock = (variants ?? []).reduce((s, v) => s + (v.stock || 0), 0);
  if (totalStock === 0) return "esgotado";
  if (current === "esgotado") return "publicado";
  return current;
}

export function isStockControlled(variants: Variant[] | undefined, status: ProductStatus): boolean {
  if (!variants || variants.length === 0) return false;
  const total = variants.reduce((s, v) => s + (v.stock || 0), 0);
  return total === 0 || status === "esgotado";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:")) return undefined;
  return url;
}

// ─── MAPEADORES ROW <→ TS ──────────────────────────────────────────────────────

type BrandRow = {
  id: string; name: string; slug: string; tagline: string | null;
  description: string | null; logo_url: string | null; banner_url: string | null;
  primary_color: string | null; secondary_color: string | null;
  website: string | null; instagram: string | null; whatsapp: string | null;
  active: boolean; created_at: string; updated_at: string;
};

function rowToBrand(r: BrandRow): Brand {
  return {
    id: r.id, name: r.name, slug: r.slug, tagline: r.tagline ?? "",
    description: r.description ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    bannerUrl: r.banner_url ?? undefined,
    primaryColor: r.primary_color ?? "#0f0f0f",
    secondaryColor: r.secondary_color ?? undefined,
    website: r.website ?? undefined,
    instagram: r.instagram ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    active: r.active,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function brandToRow(b: Partial<Brand>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.name !== undefined) row.name = b.name;
  if (b.slug !== undefined) row.slug = b.slug;
  if (b.tagline !== undefined) row.tagline = b.tagline;
  if (b.description !== undefined) row.description = b.description;
  if (b.logoUrl !== undefined) row.logo_url = sanitizeImageUrl(b.logoUrl);
  if (b.bannerUrl !== undefined) row.banner_url = sanitizeImageUrl(b.bannerUrl);
  if (b.primaryColor !== undefined) row.primary_color = b.primaryColor;
  if (b.secondaryColor !== undefined) row.secondary_color = b.secondaryColor;
  if (b.website !== undefined) row.website = b.website;
  if (b.instagram !== undefined) row.instagram = b.instagram;
  if (b.whatsapp !== undefined) row.whatsapp = b.whatsapp;
  if (b.active !== undefined) row.active = b.active;
  return row;
}

type ProductRow = {
  id: string; brand_id: string; category_id: string | null;
  name: string; slug: string; description: string | null;
  base_price: number | string; sale_price: number | string | null;
  status: ProductStatus;
  gender: "masculino" | "feminino" | "unissex" | "infantil";
  is_new: boolean; is_featured: boolean;
  tags: string[]; images: unknown; variants: unknown;
  created_at: string; updated_at: string;
};

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id, brandId: r.brand_id,
    categoryId: r.category_id ?? undefined,
    name: r.name, slug: r.slug,
    description: r.description ?? undefined,
    basePrice: Number(r.base_price ?? 0),
    salePrice: r.sale_price == null ? null : Number(r.sale_price),
    status: r.status, gender: r.gender,
    isNew: r.is_new, isFeatured: r.is_featured,
    tags: r.tags ?? [],
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    variants: Array.isArray(r.variants) ? (r.variants as Variant[]) : [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function productToRow(p: Partial<Product>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.brandId !== undefined) row.brand_id = p.brandId;
  if (p.categoryId !== undefined) row.category_id = p.categoryId || null;
  if (p.name !== undefined) row.name = p.name;
  if (p.slug !== undefined) row.slug = p.slug;
  if (p.description !== undefined) row.description = p.description;
  if (p.basePrice !== undefined) row.base_price = p.basePrice;
  if (p.salePrice !== undefined) row.sale_price = p.salePrice;
  if (p.status !== undefined) row.status = p.status;
  if (p.gender !== undefined) row.gender = p.gender;
  if (p.isNew !== undefined) row.is_new = p.isNew;
  if (p.isFeatured !== undefined) row.is_featured = p.isFeatured;
  if (p.tags !== undefined) row.tags = p.tags;
  if (p.images !== undefined) {
    row.images = (p.images ?? []).filter((u) => !u.startsWith("blob:"));
  }
  if (p.variants !== undefined) row.variants = p.variants ?? [];
  return row;
}

type CategoryRow = {
  id: string; brand_id: string | null;
  name: string; slug: string; icon: string;
  order_index: number;
  created_at: string; updated_at: string;
};

function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    brandId: r.brand_id ?? undefined,
    name: r.name, slug: r.slug,
    icon: r.icon ?? "🏷️",
    order: r.order_index,
    parentId: null, // schema simplificado — sem hierarquia por enquanto
  };
}

function categoryToRow(c: Partial<Category>, brandId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (c.name !== undefined) row.name = c.name;
  if (c.slug !== undefined) row.slug = c.slug;
  if (c.icon !== undefined) row.icon = c.icon;
  if (c.order !== undefined) row.order_index = c.order;
  const bid = c.brandId ?? brandId;
  if (bid !== undefined) row.brand_id = bid;
  return row;
}

// ─── BRAND CACHE ──────────────────────────────────────────────────────────────

let _brandsCache: Brand[] = [];

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── BRANDS ───────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  _brandsCache = (data ?? []).map(rowToBrand);
  return _brandsCache;
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBrand(data) : null;
}

export function getBrandById(id: string): Brand | undefined {
  return _brandsCache.find((b) => b.id === id);
}

export async function saveBrand(
  data: Partial<Brand> & { name: string },
  _adminUid?: string,
): Promise<string> {
  const { id, ...rest } = data;
  const row = brandToRow(rest);

  if (id) {
    const { error } = await supabase.from("brands").update(row).eq("id", id);
    if (error) throw error;
    _brandsCache = _brandsCache.map((b) => (b.id === id ? { ...b, ...rest } : b));
    return id;
  }

  if (row.active === undefined) row.active = true;
  const { data: inserted, error } = await supabase
    .from("brands").insert(row).select().single();
  if (error) throw error;
  const brand = rowToBrand(inserted);
  _brandsCache = [..._brandsCache, brand];
  return brand.id;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
  _brandsCache = _brandsCache.filter((b) => b.id !== id);
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function getCategories(brandId?: string): Promise<Category[]> {
  let q = supabase.from("categories").select("*").order("order_index");
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToCategory);
}

export async function saveCategory(
  data: Partial<Category>,
  brandId?: string,
): Promise<string> {
  const { id, ...rest } = data;
  const row = categoryToRow(rest, brandId);

  if (id) {
    const { error } = await supabase.from("categories").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }

  const { data: inserted, error } = await supabase
    .from("categories").insert(row).select().single();
  if (error) throw error;
  return inserted.id;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  gender?: string;
  featured?: boolean;
}): Promise<Product[]> {
  let q = supabase.from("products").select("*");
  if (filters?.brandId)   q = q.eq("brand_id", filters.brandId);
  if (filters?.status)    q = q.eq("status", filters.status);
  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.gender)     q = q.eq("gender", filters.gender);
  if (filters?.featured)   q = q.eq("is_featured", true);

  const [{ data, error }] = await Promise.all([q, getBrands()]);
  if (error) throw error;

  const products = (data ?? []).map(rowToProduct);
  return products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data, error } = await supabase
    .from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data) : undefined;
}

export async function saveProduct(data: Partial<Product>): Promise<string> {
  const { id, ...rest } = data;
  rest.status = computeProductStatus(rest.variants ?? [], rest.status);
  const row = productToRow(rest);

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }

  const { data: inserted, error } = await supabase
    .from("products").insert(row).select().single();
  if (error) throw error;
  return inserted.id;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ─── CLOUDINARY UPLOAD ────────────────────────────────────────────────────────

export { uploadImageUrl as uploadImage } from "@/services/cloudinaryService";

// ─── STORE SETTINGS ──────────────────────────────────────────────────────────
// Armazenado em configs.settings (jsonb).
//   configs.brand_id = NULL → settings global ({ store, notifications })
//   configs.brand_id = X    → settings da marca ({ store })

const defaultStoreSettings: StoreSettings = {
  name: "Catálogo",
  tagline: "Curadoria de moda",
  description: "",
  primaryColor: "#0f0f0f",
  secondaryColor: "#e6e4dd",
  whatsapp: "",
};

async function fetchConfigRow(brandId?: string) {
  let q = supabase.from("configs").select("id, settings");
  q = brandId ? q.eq("brand_id", brandId) : q.is("brand_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data as { id: string; settings: Record<string, unknown> } | null;
}

export async function getStoreSettings(brandId?: string): Promise<StoreSettings> {
  const row = await fetchConfigRow(brandId);
  const stored = (row?.settings?.store ?? {}) as Partial<StoreSettings>;
  return { ...defaultStoreSettings, ...stored };
}

export async function saveStoreSettings(data: StoreSettings, brandId?: string): Promise<void> {
  const existing = await fetchConfigRow(brandId);
  const next = {
    ...(existing?.settings ?? {}),
    store: {
      ...data,
      logoUrl: sanitizeImageUrl(data.logoUrl),
      faviconUrl: sanitizeImageUrl(data.faviconUrl),
    },
  };

  if (existing) {
    const { error } = await supabase
      .from("configs").update({ settings: next }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("configs").insert({ brand_id: brandId ?? null, settings: next });
    if (error) throw error;
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

const defaultNotifications: NotificationSettings = {
  onNewOrder: true,
  onOutOfStock: true,
  onLowStock: false,
  lowStockThreshold: 5,
  email: "",
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await fetchConfigRow();
  const stored = (row?.settings?.notifications ?? {}) as Partial<NotificationSettings>;
  return { ...defaultNotifications, ...stored };
}

export async function saveNotificationSettings(data: NotificationSettings): Promise<void> {
  const existing = await fetchConfigRow();
  const next = { ...(existing?.settings ?? {}), notifications: data };

  if (existing) {
    const { error } = await supabase
      .from("configs").update({ settings: next }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("configs").insert({ brand_id: null, settings: next });
    if (error) throw error;
  }
}

// ─── BANNERS (stub — feature suspensa) ────────────────────────────────────────
// Schema atual não inclui banners. UI fica funcional mostrando "Nenhum banner".

export async function getBanners(_brandId?: string): Promise<Banner[]> {
  return [];
}

export async function saveBanner(_data: Partial<Banner>): Promise<string> {
  throw new Error("Banners temporariamente desabilitados nesta versão.");
}

export async function deleteBanner(_id: string): Promise<void> {
  throw new Error("Banners temporariamente desabilitados nesta versão.");
}

// ─── VENDORS (stub — feature suspensa) ────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  return [];
}

export async function saveVendor(_data: Partial<Vendor>): Promise<string> {
  throw new Error("Vendedores temporariamente desabilitados nesta versão.");
}

export async function deleteVendor(_id: string): Promise<void> {
  throw new Error("Vendedores temporariamente desabilitados nesta versão.");
}
