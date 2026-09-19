import React, { useState, useEffect } from "react";
import { imageUrl, FALLBACK_IMAGE } from "@/lib/store";

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  rawSrc?: string | null | undefined;
  src?: string | null | undefined;
  fallback?: string | undefined;
  alt?: string | null | undefined;
}

function resolveSafeImageUrl(raw?: string | null, fallback = FALLBACK_IMAGE): string {
  if (!raw || typeof raw !== "string") return fallback;
  const processed = imageUrl(raw);
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
  className,
  onError,
  ...rest
}: SafeImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    resolveSafeImageUrl(rawSrc || src, fallback),
  );

  useEffect(() => {
    setResolvedSrc(resolveSafeImageUrl(rawSrc || src, fallback));
  }, [rawSrc, src, fallback]);

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? undefined}
      className={className}
      onError={(e) => {
        if (resolvedSrc !== fallback) {
          setResolvedSrc(fallback);
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}
