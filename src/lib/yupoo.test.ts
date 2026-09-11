import { describe, it, expect } from "vitest";
import {
  toYupooHighRes,
  getYupooPhotoId,
  extractAlbumCover,
  prioritizeCoverImage,
  translateChineseToSpanish,
} from "./products.functions";

describe("translateChineseToSpanish", () => {
  it("no modifica texto que no contiene caracteres chinos", async () => {
    expect(await translateChineseToSpanish("Camiseta Nike Barcelona")).toBe("Camiseta Nike Barcelona");
    expect(await translateChineseToSpanish("")).toBe("");
  });

  it("traduce títulos en chino a español", async () => {
    const res = await translateChineseToSpanish("26-27切尔西二客S—2XL");
    expect(res).toContain("Chelsea");
    // No debe contener caracteres chinos residuales
    expect(/[\u4e00-\u9fa5]/.test(res)).toBe(false);
  });
});

describe("Yupoo cover image helpers", () => {
  it("toYupooHighRes convierte thumbnails a resolución big", () => {
    expect(toYupooHighRes("https://photo.yupoo.com/seller/12345/small.jpg")).toBe(
      "https://photo.yupoo.com/seller/12345/big.jpg"
    );
    expect(toYupooHighRes("//photo.yupoo.com/seller/12345/medium.png")).toBe(
      "https://photo.yupoo.com/seller/12345/big.png"
    );
    expect(toYupooHighRes("https://photo.yupoo.com/seller/12345/square.jpeg")).toBe(
      "https://photo.yupoo.com/seller/12345/big.jpeg"
    );
    expect(toYupooHighRes("https://photo.yupoo.com/seller/12345/thumb.webp")).toBe(
      "https://photo.yupoo.com/seller/12345/big.webp"
    );
    expect(toYupooHighRes("https://photo.yupoo.com/seller/12345/big.jpg")).toBe(
      "https://photo.yupoo.com/seller/12345/big.jpg"
    );
  });

  it("getYupooPhotoId extrae el ID de la foto correctamente", () => {
    expect(getYupooPhotoId("https://photo.yupoo.com/nikefactory/a1b2c3d4/medium.jpg")).toBe("a1b2c3d4");
    expect(getYupooPhotoId("//photo.yupoo.com/nikefactory/98765432/big.jpg")).toBe("98765432");
  });

  it("extractAlbumCover extrae la portada desde og:image en el HTML", () => {
    const html = `
      <html>
        <head>
          <title>Remera Nike</title>
          <meta property="og:image" content="//photo.yupoo.com/nikefactory/cover123/medium.jpg" />
        </head>
        <body>Contenido</body>
      </html>
    `;
    expect(extractAlbumCover(html)).toBe("https://photo.yupoo.com/nikefactory/cover123/big.jpg");
  });

  it("prioritizeCoverImage mueve la foto de portada al índice 0 cuando está en otra posición", () => {
    const images = [
      "https://photo.yupoo.com/nikefactory/hombro1/big.jpg", // foto del hombro (índice 0)
      "https://photo.yupoo.com/nikefactory/cuello2/big.jpg", // foto del cuello (índice 1)
      "https://photo.yupoo.com/nikefactory/portada3/big.jpg", // foto de portada oficial Yupoo (índice 2)
      "https://photo.yupoo.com/nikefactory/espalda4/big.jpg", // espalda (índice 3)
    ];

    // La portada enviada por Yupoo en thumbnail medium.jpg
    const coverUrl = "https://photo.yupoo.com/nikefactory/portada3/medium.jpg";

    const reordered = prioritizeCoverImage(images, coverUrl);

    // Debe ser la primera foto
    expect(reordered[0]).toBe("https://photo.yupoo.com/nikefactory/portada3/big.jpg");
    // Las demás fotos deben conservarse
    expect(reordered).toContain("https://photo.yupoo.com/nikefactory/hombro1/big.jpg");
    expect(reordered).toContain("https://photo.yupoo.com/nikefactory/cuello2/big.jpg");
    expect(reordered).toContain("https://photo.yupoo.com/nikefactory/espalda4/big.jpg");
    expect(reordered).toHaveLength(4);
  });

  it("prioritizeCoverImage antepone la portada en alta resolución si no estaba en la lista", () => {
    const images = [
      "https://photo.yupoo.com/nikefactory/hombro1/big.jpg",
      "https://photo.yupoo.com/nikefactory/cuello2/big.jpg",
    ];
    const coverUrl = "//photo.yupoo.com/nikefactory/nueva_portada/small.jpg";

    const reordered = prioritizeCoverImage(images, coverUrl);

    expect(reordered[0]).toBe("https://photo.yupoo.com/nikefactory/nueva_portada/big.jpg");
    expect(reordered).toHaveLength(3);
  });

  it("prioritizeCoverImage no altera el orden si ya es la primera foto", () => {
    const images = [
      "https://photo.yupoo.com/nikefactory/portada1/big.jpg",
      "https://photo.yupoo.com/nikefactory/hombro2/big.jpg",
    ];
    const coverUrl = "https://photo.yupoo.com/nikefactory/portada1/big.jpg";

    const reordered = prioritizeCoverImage(images, coverUrl);

    expect(reordered[0]).toBe("https://photo.yupoo.com/nikefactory/portada1/big.jpg");
    expect(reordered[1]).toBe("https://photo.yupoo.com/nikefactory/hombro2/big.jpg");
  });
});
