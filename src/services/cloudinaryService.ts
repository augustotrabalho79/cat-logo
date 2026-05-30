/**
 * cloudinaryService.ts
 * Serviço centralizado para upload e gestão de imagens no Cloudinary.
 *
 * IMPORTANTE:
 * - Blob URLs são usadas APENAS como preview temporário no UI.
 * - Nunca salvar blob URL no Firestore.
 * - Apenas secure_url deve ser persistida.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
};

export type UploadProgress = {
  percent: number;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
  result?: CloudinaryUploadResult;
};

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de um arquivo para o Cloudinary.
 * Retorna o objeto completo com secure_url, public_id, dimensões etc.
 * NÃO retorna blob URL — apenas a URL permanente do Cloudinary.
 *
 * @param file - Arquivo de imagem
 * @param folder - Pasta no Cloudinary (ex: "logos", "banners", "products")
 * @param onProgress - Callback com progresso (0-100)
 */
export async function uploadImage(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  // Validações
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 15MB.");
  }
  if (!CLOUD_NAME || CLOUD_NAME === "undefined") {
    throw new Error("Cloudinary não configurado. Verifique VITE_CLOUDINARY_CLOUD_NAME.");
  }
  if (!UPLOAD_PRESET || UPLOAD_PRESET === "undefined") {
    throw new Error("Upload preset não configurado. Verifique VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", `catalogo-saas/${folder}`);

    const xhr = new XMLHttpRequest();

    // Progresso
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({
            public_id: data.public_id,
            secure_url: data.secure_url,
            width: data.width ?? 0,
            height: data.height ?? 0,
            format: data.format ?? "",
            resource_type: data.resource_type ?? "image",
          });
        } else {
          reject(new Error(data.error?.message ?? `Erro no upload (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error("Resposta inválida do Cloudinary."));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de rede ao enviar imagem."));
    xhr.ontimeout = () => reject(new Error("Upload demorou muito. Tente novamente."));
    xhr.timeout = 60000; // 60s

    xhr.open("POST", `${BASE_URL}/image/upload`);
    xhr.send(formData);
  });
}

/** Retorna APENAS a secure_url (string) — função simplificada */
export async function uploadImageUrl(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const result = await uploadImage(file, folder, onProgress);
  return result.secure_url;
}

// ─── URL OTIMIZADA ────────────────────────────────────────────────────────────

/**
 * Gera URL otimizada com transformações do Cloudinary.
 */
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
  if (!url || url.startsWith("blob:") || !url.includes("cloudinary.com")) return url;

  const {
    width,
    height,
    crop = "fill",
    quality = "auto",
    format = "auto",
  } = options ?? {};

  const transforms = [
    `f_${format}`,
    `q_${quality}`,
    width && `w_${width}`,
    height && `h_${height}`,
    (width || height) && `c_${crop}`,
  ]
    .filter(Boolean)
    .join(",");

  return url.replace("/upload/", `/upload/${transforms}/`);
}

// ─── VALIDAÇÃO ────────────────────────────────────────────────────────────────

/** Verifica se uma URL é do Cloudinary (e não blob:) */
export function isCloudinaryUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  return url.includes("cloudinary.com") || url.includes("res.cloudinary.com");
}

/** Verifica se o Cloudinary está configurado corretamente */
export function isCloudinaryConfigured(): boolean {
  return (
    !!CLOUD_NAME &&
    CLOUD_NAME !== "undefined" &&
    !!UPLOAD_PRESET &&
    UPLOAD_PRESET !== "undefined"
  );
}
