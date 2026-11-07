import { describe, expect, it } from "vitest";
import {
  MAX_EXTRA_IMAGES,
  extraImagesOf,
  galleryWhatsappMessage,
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
  it("adds the chosen photo number", () => {
    expect(galleryWhatsappMessage("Hola.", 4, 34)).toBe(
      "Hola. Me interesa el modelo de la foto 5 (de 34).",
    );
  });

  it("leaves the message alone with one photo or bad index", () => {
    expect(galleryWhatsappMessage("Hola.", 0, 1)).toBe("Hola.");
    expect(galleryWhatsappMessage("Hola.", 9, 3)).toBe("Hola.");
  });
});
