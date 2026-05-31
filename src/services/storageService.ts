/**
 * storageService.ts
 * Upload e gestão de imagens via Supabase Storage (bucket "images").
 *
 * REGRAS:
 *  - Bucket público: SELECT é aberto, INSERT/UPDATE/DELETE exige authenticated
 *  - Blob URLs são apenas preview local — NUNCA persistir blob no DB
 *  - Apenas publicUrl do Storage deve ser salva no DB
 */

import { supabase } from "@/lib/supabase";

const BUCKET = "images";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_PREFIXES = [
  "brand-assets",
  "product-images",
  "banners",
  "avatars",
  "uploads",
] as const;

export type StorageUploadResult = {
  path: string;        // ex: "product-images/1717...-foto.jpg"
  publicUrl: string;   // URL pública (CDN do Supabase)
  width: number;       // 0 — não calculado client-side
  height: number;      // 0
  format: string;      // extensão
  resource_type: "image";
};

// ─── HELPERS INTERNOS ────────────────────────────────────────────────────────

function safeFolder(folder?: string): string {
  if (!folder) return "uploads";
  const f = folder.replace(/[^a-z0-9\-_/]/gi, "").replace(/^\/+|\/+$/g, "");
  if (!f) return "uploads";
  const prefix = f.split("/")[0];
  if (!(ALLOWED_PREFIXES as readonly string[]).includes(prefix)) return "uploads";
  return f;
}

function buildObjectPath(file: File, folder?: string): string {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stem = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "file";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${safeFolder(folder)}/${ts}-${rand}-${stem}.${ext}`;
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

export async function uploadImage(
  file: File,
  folder?: string,
  _onProgress?: (percent: number) => void, // supabase-js v2 ainda não expõe progresso
): Promise<StorageUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande. Máximo: 15 MB.");
  }

  const path = buildObjectPath(file, folder);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000", // 1 ano (paths já são únicos por timestamp)
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    const msg = error.message ?? "Erro desconhecido";
    if (/not authenticated|jwt|permission/i.test(msg)) {
      throw new Error("Você precisa estar logado para enviar imagens.");
    }
    if (/exceeded|too large/i.test(msg)) {
      throw new Error("Imagem excedeu o limite de 15 MB.");
    }
    throw new Error(`Falha ao enviar imagem: ${msg}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: pub.publicUrl,
    width: 0,
    height: 0,
    format: (file.name.split(".").pop() ?? "").toLowerCase(),
    resource_type: "image",
  };
}

/** Versão simplificada: retorna apenas a publicUrl. */
export async function uploadImageUrl(
  file: File,
  folder?: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const r = await uploadImage(file, folder, onProgress);
  return r.publicUrl;
}

// ─── URL OTIMIZADA ────────────────────────────────────────────────────────────
// Supabase Storage suporta transformações via query string em planos pagos
// (?width=400&height=400&resize=cover&quality=auto). Em planos gratuitos
// o param é ignorado e a imagem original é servida. Sem custo extra de chamar.

export function getOptimizedUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb";
    quality?: "auto" | number;
    format?: "auto" | "webp" | "jpg" | "png";
  },
): string {
  if (!url || url.startsWith("blob:")) return url;
  if (!isStorageUrl(url)) return url;

  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options ?? {};
  const params = new URLSearchParams();
  if (width)  params.set("width", String(width));
  if (height) params.set("height", String(height));
  if (width || height) {
    params.set("resize", crop === "fit" ? "contain" : crop === "scale" ? "fill" : "cover");
  }
  if (quality && quality !== "auto") params.set("quality", String(quality));
  if (format && format !== "auto") params.set("format", format);

  const q = params.toString();
  if (!q) return url;
  return url.includes("?") ? `${url}&${q}` : `${url}?${q}`;
}

// ─── VALIDAÇÃO ────────────────────────────────────────────────────────────────

export function isStorageUrl(url: string | undefined): boolean {
  if (!url || url.startsWith("blob:")) return false;
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
      || url.includes(".supabase.co/storage/")
      || url.includes(".supabase.in/storage/");
}

/** Mantido como alias por compatibilidade. */
export const isCloudinaryUrl = isStorageUrl;

export function isStorageConfigured(): boolean {
  return true; // Supabase está configurado no client global
}
