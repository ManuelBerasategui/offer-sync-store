import { describe, expect, it } from "vitest";
import {
  MAX_EXTRA_IMAGES,
  extraImagesOf,
  galleryPhotoLink,
  galleryWhatsappMessage,
  parseFotoParam,
  priceListOf,
  sanitizeExtraImages,
  sanitizePriceList,
} from "./product-gallery";

describe("sanitizeExtraImages", () => {
  it("keeps only http(s) urls, dedupes and drops the main image", () => {
    const res = sanitizeExtraImages(
      [
        "https://x.supabase.co/a.webp",
        "https://x.supabase.co/a.webp",
        "javascript:alert(1)",
        "data:image/png;base64,AAA",
        "https://x.supabase.co/main.webp",
        42,
        " https://x.supabase.co/b.webp ",
      ],
      "https://x.supabase.co/main.webp",
    );
    expect(res).toEqual(["https://x.supabase.co/a.webp", "https://x.supabase.co/b.webp"]);
  });

  it("caps the amount of photos", () => {
    const many = Array.from({ length: 100 }, (_, i) => `https://x.co/${i}.webp`);
    expect(sanitizeExtraImages(many)).toHaveLength(MAX_EXTRA_IMAGES);
  });

  it("returns [] for non arrays", () => {
    expect(sanitizeExtraImages("https://x.co/a.webp")).toEqual([]);
  });
});

describe("extraImagesOf", () => {
  it("reads top-level or metadata", () => {
    expect(extraImagesOf({ extra_images: ["a"] })).toEqual(["a"]);
    expect(extraImagesOf({ metadata: { extra_images: ["b"] } })).toEqual(["b"]);
    expect(extraImagesOf({})).toEqual([]);
  });
});

describe("price list", () => {
  it("cleans control chars and empty lines", () => {
    expect(sanitizePriceList("1/2 Docena x $15.000\u0007\n\n  1 Docena x $13.000  \n")).toBe(
      "1/2 Docena x $15.000\n1 Docena x $13.000",
    );
  });

  it("keeps html as plain text (rendered escaped by React)", () => {
    expect(priceListOf({ price_list: "<b>x</b>" })).toEqual(["<b>x</b>"]);
  });

  it("reads from metadata and handles missing", () => {
    expect(priceListOf({ metadata: { price_list: "a\nb" } })).toEqual(["a", "b"]);
    expect(priceListOf({})).toEqual([]);
    expect(priceListOf({ price_list: 5 })).toEqual([]);
  });
});

describe("galleryWhatsappMessage", () => {
  const link = galleryPhotoLink("https://tienda.com", "abc-1", 4);

  it("builds the photo link (1-based)", () => {
    expect(link).toBe("https://tienda.com/producto/abc-1?foto=5");
  });

  it("adds the link to the chosen photo", () => {
    expect(galleryWhatsappMessage("Hola.", 4, 34, link)).toBe(
      "Hola. Quiero este modelo: https://tienda.com/producto/abc-1?foto=5",
    );
  });

  it("leaves the message alone with one photo, bad index or no link", () => {
    expect(galleryWhatsappMessage("Hola.", 0, 1, link)).toBe("Hola.");
    expect(galleryWhatsappMessage("Hola.", 9, 3, link)).toBe("Hola.");
    expect(galleryWhatsappMessage("Hola.", 1, 3)).toBe("Hola.");
  });
});

describe("parseFotoParam", () => {
  it("accepts small positive integers", () => {
    expect(parseFotoParam("21")).toBe(21);
    expect(parseFotoParam(3)).toBe(3);
  });

  it("rejects junk", () => {
    expect(parseFotoParam("0")).toBeUndefined();
    expect(parseFotoParam("-1")).toBeUndefined();
    expect(parseFotoParam("2.5")).toBeUndefined();
    expect(parseFotoParam("999")).toBeUndefined();
    expect(parseFotoParam("abc")).toBeUndefined();
    expect(parseFotoParam(undefined)).toBeUndefined();
  });
});
