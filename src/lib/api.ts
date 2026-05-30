import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Brand = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  primaryColor: string;
  secondaryColor?: string;
  description?: string;
};

export type Variant = {
  size: string;
  colorName: string;
  color: string;
  sku: string;
  stock: number;
};

export type ProductStatus = "publicado" | "rascunho" | "esgotado";

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
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  order: number;
};

export type StoreSettings = {
  name: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  whatsapp: string;
  primaryBg: string;
  primaryText: string;
  borderColor: string;
  accentColor: string;
  promoColor: string;
};

export const defaultTheme = {
  primaryBg: "#fafaf7",
  primaryText: "#0f0f0f",
  borderColor: "#e6e4dd",
  accentColor: "#0f0f0f",
  promoColor: "#16a34a",
};

const defaultStoreSettings: StoreSettings = {
  name: "Casa Branca",
  tagline: "Curadoria de moda atemporal",
  description:
    "Casa Branca reúne marcas brasileiras autorais com foco em peças minimalistas e duradouras.",
  primaryColor: "#0f0f0f",
  secondaryColor: "#e6e4dd",
  whatsapp: "5581999999999",
  ...defaultTheme,
};

export type BannerPosition =
  | "hero"
  | "novidades"
  | "entre-categorias"
  | "rodape"
  | "lateral";

export type Banner = {
  id: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export function isStockControlled(
  variants: Variant[] | undefined,
  status: ProductStatus,
): boolean {
  if (!variants || variants.length === 0) return false;
  const total = variants.reduce((s, v) => s + (v.stock || 0), 0);
  return total === 0 || status === "esgotado";
}

// ─── Brand cache (synchronous getBrandById for components) ───────────────────

let _brandsCache: Brand[] = [];

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  const snap = await getDocs(collection(db, "brands"));
  _brandsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand);
  return _brandsCache;
}

export function getBrandById(id: string): Brand | undefined {
  return _brandsCache.find((b) => b.id === id);
}

export async function saveBrand(
  data: Partial<Brand> & { name: string },
): Promise<string> {
  const { id, ...rest } = data as Brand;
  if (id) {
    await setDoc(doc(db, "brands", id), rest, { merge: true });
    _brandsCache = _brandsCache.map((b) =>
      b.id === id ? { ...b, ...rest } : b,
    );
    return id;
  }
  const ref = await addDoc(collection(db, "brands"), rest);
  _brandsCache = [..._brandsCache, { id: ref.id, ...rest }];
  return ref.id;
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteDoc(doc(db, "brands", id));
  _brandsCache = _brandsCache.filter((b) => b.id !== id);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(
    query(collection(db, "categories"), orderBy("order")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function saveCategory(data: Partial<Category>): Promise<string> {
  const { id, ...rest } = data as Category;
  if (id) {
    await setDoc(doc(db, "categories", id), rest, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "categories"), rest);
  return ref.id;
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  gender?: string;
  featured?: boolean;
}): Promise<Product[]> {
  // Load brands in parallel to warm the synchronous cache
  const [snap] = await Promise.all([
    getDocs(collection(db, "products")),
    getBrands(),
  ]);

  let products = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Product,
  );

  if (filters?.status)
    products = products.filter((p) => p.status === filters.status);
  if (filters?.brandId)
    products = products.filter((p) => p.brandId === filters.brandId);
  if (filters?.categoryId)
    products = products.filter((p) => p.categoryId === filters.categoryId);
  if (filters?.gender)
    products = products.filter((p) => p.gender === filters.gender);
  if (filters?.featured) products = products.filter((p) => p.isFeatured);

  // Featured products appear first
  return products.sort(
    (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
  );
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const snap = await getDocs(
    query(collection(db, "products"), where("slug", "==", slug)),
  );
  if (snap.empty) return undefined;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Product;
}

export async function saveProduct(data: Partial<Product>): Promise<string> {
  const { id, ...rest } = data as Product;
  rest.status = computeProductStatus(rest.variants ?? [], rest.status);
  if (id) {
    await setDoc(doc(db, "products", id), rest, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "products"), rest);
  return ref.id;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ─── Image Upload (Cloudinary) ────────────────────────────────────────────────

export async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  );
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  const json = await res.json();
  if (!json.secure_url)
    throw new Error(json.error?.message ?? "Falha no upload da imagem");
  return json.secure_url as string;
}

// ─── Store Settings ───────────────────────────────────────────────────────────

export async function getStoreSettings(): Promise<StoreSettings> {
  const snap = await getDoc(doc(db, "config", "store"));
  if (!snap.exists()) return defaultStoreSettings;
  return { ...defaultStoreSettings, ...snap.data() } as StoreSettings;
}

export async function saveStoreSettings(data: StoreSettings): Promise<void> {
  await setDoc(doc(db, "config", "store"), data);
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function getBanners(): Promise<Banner[]> {
  const snap = await getDocs(
    query(collection(db, "banners"), orderBy("order")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Banner);
}

export async function saveBanner(data: Partial<Banner>): Promise<string> {
  const { id, ...rest } = data as Banner;
  if (id) {
    await setDoc(doc(db, "banners", id), rest, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "banners"), rest);
  return ref.id;
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "banners", id));
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vendor);
}

export async function saveVendor(data: Partial<Vendor>): Promise<string> {
  const { id, ...rest } = data as Vendor;
  if (id) {
    await setDoc(doc(db, "vendors", id), rest, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "vendors"), rest);
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

// ─── Notification Settings ────────────────────────────────────────────────────

const defaultNotificationSettings: NotificationSettings = {
  onNewOrder: true,
  onOutOfStock: true,
  onLowStock: false,
  lowStockThreshold: 5,
  email: "",
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const snap = await getDoc(doc(db, "config", "notifications"));
  if (!snap.exists()) return defaultNotificationSettings;
  return {
    ...defaultNotificationSettings,
    ...snap.data(),
  } as NotificationSettings;
}

export async function saveNotificationSettings(
  data: NotificationSettings,
): Promise<void> {
  await setDoc(doc(db, "config", "notifications"), data);
}
