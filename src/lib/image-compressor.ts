/**
 * Utilidad de compresión y redimensionado de imágenes en el navegador.
 * Convierte cualquier imagen a WebP optimizado (máx 1200x1200px, calidad 82%)
 * reduciendo el peso en más del 90% antes de subirla a Supabase Storage.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface CompressedResult {
  file: File;
  base64: string;
  originalSize: number;
  compressedSize: number;
  savingsPct: number;
  width: number;
  height: number;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedResult> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo cargar la imagen para compresión."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escala manteniendo aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
          reject(new Error("No se pudo inicializar el contexto de canvas."));
          return;
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Error al generar el archivo comprimido WebP."));
              return;
            }

            const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
            const newFileName = `${cleanBaseName}.webp`;
            const compressedFile = new File([blob], newFileName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            const base64 = canvas.toDataURL("image/webp", quality);
            const compressedSize = blob.size;
            const savingsPct =
              originalSize > 0
                ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
                : 0;

            resolve({
              file: compressedFile,
              base64,
              originalSize,
              compressedSize,
              savingsPct,
              width,
              height,
            });
          },
          "image/webp",
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
