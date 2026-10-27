import { describe, expect, it } from "vitest";
import { parseStoragePublicUrl, thumbObjectPaths } from "./thumb-paths";
import { thumbnailUrl } from "./store";

const BASE = "https://dybzgnmghisqapdzgknv.supabase.co/storage/v1/object/public/";

describe("thumbObjectPaths", () => {
  it("usa la misma carpeta y el mismo nombre de archivo", () => {
    expect(thumbObjectPaths("products/abc.webp")).toEqual({
      sm: "products/thumbnails/abc.webp",
      md: "products/thumbnails-md/abc.webp",
    });
    expect(thumbObjectPaths("yupoo/x.jpg").md).toBe("yupoo/thumbnails-md/x.jpg");
  });

  it("coincide con la URL que pide la tienda (thumbnailUrl)", () => {
    for (const objectPath of ["products/abc.webp", "banners/promo/xyz.webp", "yupoo/id.jpg"]) {
      const raw = `${BASE}store-images/${objectPath}`;
      const paths = thumbObjectPaths(objectPath);
      for (const size of ["sm", "md"] as const) {
        const proxied = thumbnailUrl(raw, size);
        const target = decodeURIComponent(proxied.replace("/api/img?url=", ""));
        expect(target).toBe(`${BASE}store-images/${paths[size]}`);
      }
    }
  });
});

describe("parseStoragePublicUrl", () => {
  it("separa bucket y ruta", () => {
    expect(parseStoragePublicUrl(`${BASE}store-images/products/abc.webp`)).toEqual({
      bucket: "store-images",
      objectPath: "products/abc.webp",
    });
  });

  it("ignora URLs que no son de Storage, miniaturas y rutas raras", () => {
    expect(parseStoragePublicUrl("https://drive.google.com/file/d/123/view")).toBeNull();
    expect(parseStoragePublicUrl(`${BASE}store-images/products/thumbnails/abc.webp`)).toBeNull();
    expect(parseStoragePublicUrl(`${BASE}store-images/products/thumbnails-md/abc.webp`)).toBeNull();
    expect(parseStoragePublicUrl(`${BASE}store-images/..%2F..%2Fsecret`)).toBeNull();
    expect(parseStoragePublicUrl("no es una url")).toBeNull();
  });
});
