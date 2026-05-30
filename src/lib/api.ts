/**
 * api.ts — Camada de dados principal (Firebase Firestore + Cloudinary)
 * Regras:
 *  - nunca salvar undefined no Firestore (usar cleanForFirestore)
 *  - nunca salvar blob: URLs (apenas secure_url do Cloudinary)
 *  - sempre adicionar createdAt/updatedAt nos documentos
 *  - filtrar por brandId quando o usuário for brand_admin
 */

import {
  collection, doc, getDocs, getDoc, addDoc, setDoc,
  deleteDoc, query, orderBy, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { cleanForFirestore } from "@/lib/utils";

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

/** Garante que a URL seja do Cloudinary (ou string vazia) — nunca blob: */
function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:")) return undefined; // rejeita blob URLs
  return url;
}

// ─── BRAND CACHE ──────────────────────────────────────────────────────────────

let _brandsCache: Brand[] = [];

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

// ─── BRANDS ───────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  const snap = await getDocs(collection(db, "brands"));
  _brandsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand);
  return _brandsCache;
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const q = query(collection(db, "brands"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  // Normaliza active: campo ausente em marcas antigas = tratar como ativo
  return { active: true, id: d.id, ...d.data() } as Brand;
}

export function getBrandById(id: string): Brand | undefined {
  return _brandsCache.find((b) => b.id === id);
}

export async function saveBrand(
  data: Partial<Brand> & { name: string },
  adminUid?: string,
): Promise<string> {
  const { id, ...rest } = data as Brand;

  // Nunca salvar blob URLs
  if (rest.logoUrl) rest.logoUrl = sanitizeImageUrl(rest.logoUrl);
  if (rest.bannerUrl) rest.bannerUrl = sanitizeImageUrl(rest.bannerUrl);

  const now = serverTimestamp();

  if (id) {
    const payload = cleanForFirestore({ ...rest, updatedAt: now });
    await setDoc(doc(db, "brands", id), payload, { merge: true });
    _brandsCache = _brandsCache.map((b) => b.id === id ? { ...b, ...rest, id } : b);
    return id;
  }

  const payload = cleanForFirestore({
    ...rest,
    active: rest.active !== false,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUid ?? null,
  });
  const ref = await addDoc(collection(db, "brands"), payload);
  _brandsCache = [..._brandsCache, { id: ref.id, ...rest, active: true }];
  return ref.id;
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteDoc(doc(db, "brands", id));
  _brandsCache = _brandsCache.filter((b) => b.id !== id);
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function getCategories(brandId?: string): Promise<Category[]> {
  const constraints: any[] = [orderBy("order")];
  if (brandId) constraints.push(where("brandId", "==", brandId));

  const snap = await getDocs(query(collection(db, "categories"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function saveCategory(data: Partial<Category>, brandId?: string): Promise<string> {
  const { id, ...rest } = data as Category;
  const payload = cleanForFirestore({
    ...rest,
    brandId: rest.brandId ?? brandId ?? null,
    updatedAt: serverTimestamp(),
  });

  if (id) {
    await setDoc(doc(db, "categories", id), payload, { merge: true });
    return id;
  }

  const ref = await addDoc(collection(db, "categories"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  gender?: string;
  featured?: boolean;
}): Promise<Product[]> {
  const [snap] = await Promise.all([
    getDocs(collection(db, "products")),
    getBrands(),
  ]);

  let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);

  if (filters?.status) products = products.filter((p) => p.status === filters.status);
  if (filters?.brandId) products = products.filter((p) => p.brandId === filters.brandId);
  if (filters?.categoryId) products = products.filter((p) => p.categoryId === filters.categoryId);
  if (filters?.gender) products = products.filter((p) => p.gender === filters.gender);
  if (filters?.featured) products = products.filter((p) => p.isFeatured);

  return products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const snap = await getDocs(query(collection(db, "products"), where("slug", "==", slug)));
  if (snap.empty) return undefined;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Product;
}

export async function saveProduct(data: Partial<Product>): Promise<string> {
  const { id, ...rest } = data as Product;

  // Nunca salvar blob URLs nas imagens
  if (rest.images) {
    rest.images = rest.images.filter((url) => !url.startsWith("blob:"));
  }

  rest.status = computeProductStatus(rest.variants ?? [], rest.status);

  const now = serverTimestamp();

  if (id) {
    const payload = cleanForFirestore({ ...rest, updatedAt: now });
    await setDoc(doc(db, "products", id), payload, { merge: true });
    return id;
  }

  const payload = cleanForFirestore({ ...rest, createdAt: now, updatedAt: now });
  const ref = await addDoc(collection(db, "products"), payload);
  return ref.id;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ─── CLOUDINARY UPLOAD ────────────────────────────────────────────────────────
// Delega para o cloudinaryService dedicado

export { uploadImageUrl as uploadImage } from "@/services/cloudinaryService";

// ─── STORE SETTINGS (global) ─────────────────────────────────────────────────

const defaultStoreSettings: StoreSettings = {
  name: "Catálogo",
  tagline: "Curadoria de moda",
  description: "",
  primaryColor: "#0f0f0f",
  secondaryColor: "#e6e4dd",
  whatsapp: "",
};

export async function getStoreSettings(brandId?: string): Promise<StoreSettings> {
  const docId = brandId ? `store-${brandId}` : "store";
  const snap = await getDoc(doc(db, "config", docId));
  if (!snap.exists()) return defaultStoreSettings;
  return { ...defaultStoreSettings, ...snap.data() } as StoreSettings;
}

export async function saveStoreSettings(data: StoreSettings, brandId?: string): Promise<void> {
  const docId = brandId ? `store-${brandId}` : "store";
  // Nunca salvar blob URLs
  const clean = cleanForFirestore({
    ...data,
    logoUrl: sanitizeImageUrl(data.logoUrl),
    faviconUrl: sanitizeImageUrl(data.faviconUrl),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", docId), clean);
}

// ─── BANNERS ──────────────────────────────────────────────────────────────────

export async function getBanners(brandId?: string): Promise<Banner[]> {
  const constraints: any[] = [orderBy("order")];
  if (brandId) constraints.push(where("brandId", "==", brandId));

  const snap = await getDocs(query(collection(db, "banners"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Banner);
}

export async function saveBanner(data: Partial<Banner>): Promise<string> {
  const { id, ...rest } = data as Banner;
  // Nunca salvar blob URLs
  if (rest.imageUrl) rest.imageUrl = sanitizeImageUrl(rest.imageUrl);
  const clean = cleanForFirestore({ ...rest, updatedAt: serverTimestamp() });

  if (id) {
    await setDoc(doc(db, "banners", id), clean, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "banners"), {
    ...clean,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "banners", id));
}

// ─── VENDORS ──────────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vendor);
}

export async function saveVendor(data: Partial<Vendor>): Promise<string> {
  const { id, ...rest } = data as Vendor;
  const clean = cleanForFirestore({ ...rest, updatedAt: serverTimestamp() });

  if (id) {
    await setDoc(doc(db, "vendors", id), clean, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "vendors"), {
    ...clean,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
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
  const snap = await getDoc(doc(db, "config", "notifications"));
  if (!snap.exists()) return defaultNotifications;
  return { ...defaultNotifications, ...snap.data() } as NotificationSettings;
}

export async function saveNotificationSettings(data: NotificationSettings): Promise<void> {
  await setDoc(doc(db, "config", "notifications"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
