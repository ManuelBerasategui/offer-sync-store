import React, { useState, useEffect } from "react";
import { imageUrl, thumbnailUrl, FALLBACK_IMAGE } from "@/lib/store";

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  rawSrc?: string | null | undefined;
  src?: string | null | undefined;
  fallback?: string | undefined;
  alt?: string | null | undefined;
  thumb?: boolean;
}

function resolveSafeImageUrl(raw?: string | null, fallback = FALLBACK_IMAGE, isThumb = false): string {
  if (!raw || typeof raw !== "string") return fallback;
  const processed = isThumb ? thumbnailUrl(raw) : imageUrl(raw);
  if (!processed) return fallback;
  if (processed.startsWith("data:image/")) return processed;
  if (processed.startsWith("/api/img?")) return processed;
  if (processed.startsWith("/") && !processed.startsWith("//")) return processed;
  try {
    const u = new URL(processed);
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.href;
    }
  } catch {
    // URL inválida
  }
  return fallback;
}

export function SafeImage({
  rawSrc,
  src,
  fallback = FALLBACK_IMAGE,
  alt = "",
  thumb = false,
  className,
  onError,
  ...rest
}: SafeImageProps) {
  const targetRaw = rawSrc || src;
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    resolveSafeImageUrl(targetRaw, fallback, thumb),
  );

  useEffect(() => {
    setResolvedSrc(resolveSafeImageUrl(targetRaw, fallback, thumb));
  }, [targetRaw, fallback, thumb]);

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? undefined}
      className={className}
      onError={(e) => {
        // Si falló la miniatura, intentar con la imagen de tamaño completo antes del fallback
        if (thumb) {
          const fullSafe = resolveSafeImageUrl(targetRaw, fallback, false);
          if (resolvedSrc !== fullSafe) {
            setResolvedSrc(fullSafe);
            return;
          }
        }
        if (resolvedSrc !== fallback) {
          setResolvedSrc(fallback);
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}
