/**
 * cloudinaryService.ts
 * Upload e gestão de imagens no Cloudinary via upload UNSIGNED.
 *
 * REGRAS:
 * - Upload envia APENAS: file + upload_preset  (sem api_key, sem signature)
 * - Blob URLs são apenas preview local — NUNCA salvar blob no Firestore
 * - Apenas secure_url deve ser persistida no Firestore
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
};

/**
 * Faz upload UNSIGNED para o Cloudinary.
 * Envia SOMENTE file + upload_preset — sem api_key, sem signature.
 * Retorna secure_url permanente.
 */
export async function uploadImage(
  file: File,
  _folder?: string,             // reservado para compatibilidade, não enviado na requisição
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  // Validações locais
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 15 MB.");
  }

  // Diagnóstico de configuração
  if (!CLOUD_NAME || CLOUD_NAME === "undefined") {
    throw new Error(
      "Cloudinary não configurado: VITE_CLOUDINARY_CLOUD_NAME está vazio. " +
      "Verifique as variáveis de ambiente no Vercel."
    );
  }
  if (!UPLOAD_PRESET || UPLOAD_PRESET === "undefined") {
    throw new Error(
      "Cloudinary não configurado: VITE_CLOUDINARY_UPLOAD_PRESET está vazio. " +
      "Verifique as variáveis de ambiente no Vercel."
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  return new Promise((resolve, reject) => {
    // FormData com APENAS file e upload_preset (unsigned)
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    // NÃO adicionar: api_key, signature, timestamp, folder

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as Record<string, any>;
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({
            public_id: data.public_id ?? "",
            secure_url: data.secure_url,
            width: data.width ?? 0,
            height: data.height ?? 0,
            format: data.format ?? "",
            resource_type: data.resource_type ?? "image",
          });
        } else {
          // Mensagem de erro detalhada com diagnóstico
          const msg = data?.error?.message ?? "Erro desconhecido";
          let hint = "";
          if (msg.includes("whitelisted") || msg.includes("unsigned")) {
            hint = ` — O preset "${UPLOAD_PRESET}" está como "Signed". Acesse Cloudinary → Settings → Upload presets → "${UPLOAD_PRESET}" → mude para "Unsigned".`;
          } else if (msg.includes("Unknown") || msg.includes("api_key") || msg.includes("API key")) {
            hint = ` — Verifique se o Cloud Name "${CLOUD_NAME}" está correto no Cloudinary.`;
          } else if (msg.includes("preset") && msg.includes("not found")) {
            hint = ` — O preset "${UPLOAD_PRESET}" não existe. Crie-o em Cloudinary → Settings → Upload presets.`;
          }
          reject(new Error(`Cloudinary ${xhr.status}: ${msg}${hint}`));
        }
      } catch {
        reject(new Error(`Resposta inválida do Cloudinary (${xhr.status}). Tente novamente.`));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de rede ao enviar imagem. Verifique sua conexão."));
    xhr.ontimeout = () => reject(new Error("Upload demorou mais de 60s. Tente uma imagem menor."));
    xhr.timeout = 60_000;

    xhr.open("POST", endpoint);
    xhr.send(formData);
  });
}

/** Versão simplificada — retorna apenas a secure_url */
export async function uploadImageUrl(
  file: File,
  folder?: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const result = await uploadImage(file, folder, onProgress);
  return result.secure_url;
}

// ─── URL OTIMIZADA ────────────────────────────────────────────────────────────

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
  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options ?? {};
  const transforms = [
    `f_${format}`, `q_${quality}`,
    width && `w_${width}`,
    height && `h_${height}`,
    (width || height) && `c_${crop}`,
  ].filter(Boolean).join(",");
  return url.replace("/upload/", `/upload/${transforms}/`);
}

// ─── VALIDAÇÃO ────────────────────────────────────────────────────────────────

export function isCloudinaryUrl(url: string | undefined): boolean {
  if (!url || url.startsWith("blob:")) return false;
  return url.includes("cloudinary.com") || url.includes("res.cloudinary.com");
}

export function isCloudinaryConfigured(): boolean {
  return (
    !!CLOUD_NAME && CLOUD_NAME !== "undefined" &&
    !!UPLOAD_PRESET && UPLOAD_PRESET !== "undefined"
  );
}
