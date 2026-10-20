import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { uploadThumbnails } from "./storage-thumbs.server";

describe("uploadThumbnails", () => {
  it("sube la miniatura de 160px y la de 320px en WebP, con el mismo nombre", async () => {
    const uploads: { bucket: string; path: string; buf: Buffer; opts: Record<string, unknown> }[] =
      [];
    const fake = {
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, buf: Buffer, opts: Record<string, unknown>) => {
            uploads.push({ bucket, path, buf, opts });
            return { error: null };
          },
        }),
      },
    };
    const source = await sharp({
      create: { width: 900, height: 600, channels: 3, background: "#e55" },
    })
      .jpeg()
      .toBuffer();

    const n = await uploadThumbnails(fake, "store-images", "yupoo/abc.jpg", source);

    expect(n).toBe(2);
    expect(uploads.map((u) => u.path)).toEqual([
      "yupoo/thumbnails/abc.jpg",
      "yupoo/thumbnails-md/abc.jpg",
    ]);
    const [sm, md] = await Promise.all(uploads.map((u) => sharp(u.buf).metadata()));
    expect(sm!.format).toBe("webp");
    expect(sm!.width).toBe(160);
    expect(md!.width).toBe(320);
    expect(uploads[0]!.opts["contentType"]).toBe("image/webp");
  });

  it("no rompe si la imagen es inválida", async () => {
    const fake = { storage: { from: () => ({ upload: async () => ({ error: null }) }) } };
    expect(await uploadThumbnails(fake, "b", "x/y.webp", Buffer.from("no es imagen"))).toBe(0);
  });
});
