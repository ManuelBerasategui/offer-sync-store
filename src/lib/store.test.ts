/**
 * Tests unitarios para la lógica de MOQ (Minimum Order Quantity).
 *
 * Criterios de aceptación cubiertos:
 *   1. 9 Mates + 1 Termo en el carrito → NO deja avanzar al checkout (violación)
 *   2. 1 Termo (sin Mates) → SÍ deja avanzar (sin violación)
 *   3. 10 Mates en el carrito → sin violación
 *   4. Bajar de 10 a 9 Mates → violación generada en tiempo real (lógica pura)
 *   5. isMate reconoce nombres de Mates ("Mate Bombilla")
 *   6. isMate no confunde Termos ("Termo Stanley")
 *   7. hasMoq retorna true para un Mate
 *   8. hasMoq retorna false para un Termo
 *   9. Un producto con cat_min_units dinámica también tiene MOQ
 */

import { describe, it, expect } from "vitest";
import {
  isMate,
  hasMoq,
  parseCategoryRules,
  checkCategoryMins,
} from "./store";

// ─── Fixture de config mínima (sin reglas dinámicas extra) ───────────────────
const BASE_CONFIG = {};

// Config con una categoría dinámica (Indumentaria: mín 3 unidades)
const CONFIG_WITH_INDUMENTARIA = {
  cat_min_units_Indumentaria: "3",
};

const RULES = parseCategoryRules(BASE_CONFIG);
const RULES_WITH_INDUMENTARIA = parseCategoryRules(CONFIG_WITH_INDUMENTARIA);

// ─── isMate ──────────────────────────────────────────────────────────────────

describe("isMate", () => {
  it("reconoce 'Mate Bombilla' en categoria Bazar", () => {
    expect(isMate("Mate Bombilla", "Bazar")).toBe(true);
  });

  it("reconoce 'Mate Imperial' en categoria Bazar", () => {
    expect(isMate("Mate Imperial", "Bazar")).toBe(true);
  });

  it("reconoce 'mate' al inicio del nombre (minúsculas)", () => {
    expect(isMate("mate artesanal madera", "Bazar")).toBe(true);
  });

  it("reconoce 'mates' como plural en el nombre", () => {
    expect(isMate("Set de mates x6", "Bazar")).toBe(true);
  });

  it("NO confunde 'Termo Stanley' con un Mate", () => {
    expect(isMate("Termo Stanley", "Bazar")).toBe(false);
  });

  it("NO confunde 'Tomate' con un Mate", () => {
    expect(isMate("Salsa de Tomate", "Bazar")).toBe(false);
  });

  it("NO confunde 'Material' con un Mate", () => {
    expect(isMate("Material escolar", "Bazar")).toBe(false);
  });

  it("reconoce categoria 'Mates' directamente (por si alguna vez existe)", () => {
    expect(isMate("Cualquier nombre", "Mates")).toBe(true);
  });

  it("reconoce categoria 'mate' directamente", () => {
    expect(isMate("Cualquier nombre", "mate")).toBe(true);
  });
});

// ─── hasMoq ──────────────────────────────────────────────────────────────────

describe("hasMoq", () => {
  it("retorna true para un producto Mate (categoria Bazar)", () => {
    expect(hasMoq({ nombre: "Mate Bombilla", categoria: "Bazar" }, RULES)).toBe(true);
  });

  it("retorna false para un Termo (sin MOQ propio)", () => {
    expect(hasMoq({ nombre: "Termo Stanley", categoria: "Bazar" }, RULES)).toBe(false);
  });

  it("retorna false para un producto genérico sin regla", () => {
    expect(hasMoq({ nombre: "Bolso viajero", categoria: "Accesorios" }, RULES)).toBe(false);
  });

  it("retorna true para producto con regla dinámica cat_min_units (Indumentaria)", () => {
    expect(hasMoq({ nombre: "Remera básica", categoria: "Indumentaria" }, RULES_WITH_INDUMENTARIA)).toBe(true);
  });

  it("retorna false para producto sin regla dinámica (Indumentaria rules, pero categoría distinta)", () => {
    expect(hasMoq({ nombre: "Auriculares BT", categoria: "Electrónica" }, RULES_WITH_INDUMENTARIA)).toBe(false);
  });
});

// ─── checkCategoryMins — criterios de aceptación del carrito ─────────────────

describe("checkCategoryMins — Mates (categoria=Bazar)", () => {
  /**
   * Criterio 1: 9 Mates + 1 Termo → NO deja avanzar (violación de Mates)
   */
  it("AC1: 9 Mates + 1 Termo → violación de Mates", () => {
    const items = [
      { nombre: "Mate Imperial", categoria: "Bazar", qty: 9, unitPrice: 5000 },
      { nombre: "Termo Stanley", categoria: "Bazar", qty: 1, unitPrice: 15000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    expect(violations.length).toBeGreaterThan(0);
    const mateViolation = violations.find((v) => v.category.toLowerCase() === "mates");
    expect(mateViolation).toBeDefined();
    expect(mateViolation?.type).toBe("units");
    expect(mateViolation?.min).toBe(10);
    expect(mateViolation?.current).toBe(9);
  });

  /**
   * Criterio 2: 1 Termo (sin Mates) → SÍ deja avanzar (sin violación)
   */
  it("AC2: 1 Termo (sin Mates) → sin violación", () => {
    const items = [
      { nombre: "Termo Stanley", categoria: "Bazar", qty: 1, unitPrice: 15000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    expect(violations.length).toBe(0);
  });

  /**
   * Criterio 3: 10 Mates → sin violación (mínimo exacto cumplido)
   */
  it("AC3: 10 Mates → sin violación", () => {
    const items = [
      { nombre: "Mate Imperial", categoria: "Bazar", qty: 10, unitPrice: 5000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    const mateViolation = violations.find((v) => v.category.toLowerCase() === "mates");
    expect(mateViolation).toBeUndefined();
  });

  /**
   * Criterio 4: Bajar de 10 a 9 Mates → violación en tiempo real (lógica pura)
   * checkCategoryMins es una función pura: llamarla con qty=9 produce violación,
   * y con qty=10 no. Esto simula el recálculo en tiempo real del carrito.
   */
  it("AC4: bajar de 10 a 9 Mates → violación generada (recálculo puro)", () => {
    const withTen = checkCategoryMins(
      [{ nombre: "Mate Imperial", categoria: "Bazar", qty: 10, unitPrice: 5000 }],
      RULES,
    );
    const withNine = checkCategoryMins(
      [{ nombre: "Mate Imperial", categoria: "Bazar", qty: 9, unitPrice: 5000 }],
      RULES,
    );
    expect(withTen.find((v) => v.category.toLowerCase() === "mates")).toBeUndefined();
    expect(withNine.find((v) => v.category.toLowerCase() === "mates")).toBeDefined();
  });

  /**
   * El Termo no genera violación incluso cuando hay una regla de Mates activa.
   */
  it("Termo no genera violación de Mates", () => {
    const items = [
      { nombre: "Termo Stanley", categoria: "Bazar", qty: 1, unitPrice: 15000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    expect(violations.length).toBe(0);
  });

  /**
   * Mates combinados de distintos modelos se suman (mínimo agregado).
   */
  it("Mates de distintos modelos se suman al mínimo agregado", () => {
    const items = [
      { nombre: "Mate Bombilla", categoria: "Bazar", qty: 5, unitPrice: 4000 },
      { nombre: "Mate Imperial", categoria: "Bazar", qty: 5, unitPrice: 5000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    const mateViolation = violations.find((v) => v.category.toLowerCase() === "mates");
    // 5 + 5 = 10 → cumple mínimo
    expect(mateViolation).toBeUndefined();
  });

  it("5 Mates de modelo A + 4 de modelo B = 9 → violación", () => {
    const items = [
      { nombre: "Mate Bombilla", categoria: "Bazar", qty: 5, unitPrice: 4000 },
      { nombre: "Mate Imperial", categoria: "Bazar", qty: 4, unitPrice: 5000 },
    ];
    const violations = checkCategoryMins(items, RULES);
    const mateViolation = violations.find((v) => v.category.toLowerCase() === "mates");
    expect(mateViolation).toBeDefined();
    expect(mateViolation?.current).toBe(9);
  });
});

// ─── checkCategoryMins — reglas dinámicas (no Mates) ─────────────────────────

describe("checkCategoryMins — reglas dinámicas (Indumentaria)", () => {
  it("2 unidades de Indumentaria con mínimo 3 → violación", () => {
    const items = [
      { nombre: "Remera básica", categoria: "Indumentaria", qty: 2, unitPrice: 8000 },
    ];
    const violations = checkCategoryMins(items, RULES_WITH_INDUMENTARIA);
    const v = violations.find((v) => v.category.toLowerCase() === "indumentaria");
    expect(v).toBeDefined();
    expect(v?.min).toBe(3);
    expect(v?.current).toBe(2);
  });

  it("3 unidades de Indumentaria con mínimo 3 → sin violación", () => {
    const items = [
      { nombre: "Remera básica", categoria: "Indumentaria", qty: 3, unitPrice: 8000 },
    ];
    const violations = checkCategoryMins(items, RULES_WITH_INDUMENTARIA);
    const v = violations.find((v) => v.category.toLowerCase() === "indumentaria");
    expect(v).toBeUndefined();
  });
});
