// API real — Firebase Firestore + Cloudinary
import {
  collection, doc, getDocs, addDoc, updateDoc, setDoc,
  deleteDoc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, db } from "./firebase";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type Brand = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  primaryColor: string;
  secondaryColor?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
};

export type Variant = {
  id?: string;
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
  status: "publicado" | "rascunho" | "esgotado";
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

// ─── UTILS ────────────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getBrandById(id: string, brands: Brand[]): Brand | undefined {
  return brands.find((b) => b.id === id);
}

function docToObj<T>(d: any): T {
  return { id: d.id, ...d.data() } as T;
}

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
  return snap.docs.map((d) => docToObj<Brand>(d));
}

export async function saveBrand(data: Partial<Brand> & { id?: string }): Promise<string> {
  const { id, ...rest } = data;
  const payload = { ...rest, updatedAt: serverTimestamp() };
  if (id) {
    await updateDoc(doc(db, "brands", id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, "brands"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteDoc(doc(db, "brands", id));
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(db, "categories"), orderBy("order")));
  return snap.docs.map((d) => docToObj<Category>(d));
}

export async function saveCategory(data: Partial<Category> & { id?: string }): Promise<string> {
  const { id, ...rest } = data;
  const payload = { ...rest, updatedAt: serverTimestamp() };
  if (id) {
    await updateDoc(doc(db, "categories", id), payload);
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
  status?: string;
  brandId?: string;
  categoryId?: string;
  gender?: string;
}): Promise<Product[]> {
  const constraints: any[] = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  if (filters?.brandId) constraints.push(where("brandId", "==", filters.brandId));
  if (filters?.categoryId) constraints.push(where("categoryId", "==", filters.categoryId));
  if (filters?.gender) constraints.push(where("gender", "==", filters.gender));
  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(query(collection(db, "products"), ...constraints));

  const products = await Promise.all(
    snap.docs.map(async (d) => {
      const product = docToObj<Product>(d);
      // carregar variantes da subcoleção
      const varSnap = await getDocs(collection(db, "products", d.id, "variants"));
      product.variants = varSnap.docs.map((v) => docToObj<Variant>(v));
      return product;
    })
  );
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const q = query(collection(db, "products"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return undefined;
  const d = snap.docs[0];
  const product = docToObj<Product>(d);
  const varSnap = await getDocs(collection(db, "products", d.id, "variants"));
  product.variants = varSnap.docs.map((v) => docToObj<Variant>(v));
  return product;
}

export async function saveProduct(data: Partial<Product> & { id?: string }): Promise<string> {
  const { id, variants, ...rest } = data;
  const payload = { ...rest, updatedAt: serverTimestamp() };

  let productId = id;
  if (productId) {
    await updateDoc(doc(db, "products", productId), payload);
  } else {
    const ref = await addDoc(collection(db, "products"), {
      ...payload,
      createdAt: serverTimestamp(),
      views: 0,
    });
    productId = ref.id;
  }

  // salvar variantes na subcoleção
  if (variants && productId) {
    const varRef = collection(db, "products", productId, "variants");
    // deletar antigas e recriar
    const existing = await getDocs(varRef);
    await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
    await Promise.all(
      variants.map((v) => addDoc(varRef, { ...v, updatedAt: serverTimestamp() }))
    );
  }

  return productId!;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ─── UPLOAD (Cloudinary) ──────────────────────────────────────────────────────

export async function uploadImage(
  file: File,
  folder: "brand-assets" | "product-images"
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Erro no upload");
  }

  const data = await res.json();
  return data.secure_url as string;
}

// ─── TIPOS NOVOS ──────────────────────────────────────────────────────────────

export type StoreSettings = {
  name: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
};

export type BannerPosition = "hero" | "novidades" | "entre-categorias" | "rodape" | "lateral";

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

// ─── STORE SETTINGS ───────────────────────────────────────────────────────────

const SETTINGS_DOC = "config/store";

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const snap = await getDocs(collection(db, "config"));
    const d = snap.docs.find((x) => x.id === "store");
    if (d) return d.data() as StoreSettings;
  } catch {}
  return {
    name: "Casa Branca",
    tagline: "Curadoria de moda atemporal",
    description: "Casa Branca reúne marcas brasileiras autorais.",
    primaryColor: "#0f0f0f",
    secondaryColor: "#e6e4dd",
  };
}

export async function saveStoreSettings(data: StoreSettings): Promise<void> {
  await setDoc(doc(db, "config", "store"), { ...data, updatedAt: serverTimestamp() });
}

// ─── BANNERS ──────────────────────────────────────────────────────────────────

export async function getBanners(): Promise<Banner[]> {
  const snap = await getDocs(query(collection(db, "banners"), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Banner));
}

export async function saveBanner(data: Partial<Banner> & { id?: string }): Promise<string> {
  const { id, ...rest } = data;
  if (id) {
    await updateDoc(doc(db, "banners", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, "banners"), { ...rest, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "banners", id));
}

// ─── VENDORS ──────────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
}

export async function saveVendor(data: Partial<Vendor> & { id?: string }): Promise<string> {
  const { id, ...rest } = data;
  if (id) {
    await updateDoc(doc(db, "vendors", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, "vendors"), { ...rest, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const snap = await getDocs(collection(db, "config"));
    const d = snap.docs.find((x) => x.id === "notifications");
    if (d) return d.data() as NotificationSettings;
  } catch {}
  return {
    onNewOrder: true,
    onOutOfStock: true,
    onLowStock: false,
    lowStockThreshold: 5,
    email: "",
  };
}

export async function saveNotificationSettings(data: NotificationSettings): Promise<void> {
  await setDoc(doc(db, "config", "notifications"), { ...data, updatedAt: serverTimestamp() });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getProductStock(p: Product): number {
  return (p.variants ?? []).reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function getLowStockCount(threshold = 5): number {
  return 0; // calculado dinamicamente via Firestore em produção
}
