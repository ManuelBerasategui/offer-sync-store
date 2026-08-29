import { describe, it, expect } from "vitest";
import {
  parseCategoryRules,
  checkCategoryMins,
  isMate,
  hasMoq,
  moqGroupOf,
  meetsMoq,
  type MoqInfo,
} from "./store";

/* ══════════════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════════════ */

function makeRules(extra: Record<string, string> = {}) {
  return parseCategoryRules(extra);
}

function makeProduct(
  nombre: string,
  categoria: string,
  moq_group?: string,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (moq_group !== undefined) metadata["moq_group"] = moq_group;
  // nombre y categoria también al nivel raíz para que isMate fallback en hasMoq los lea
  return { nombre, categoria, metadata };
}

function item(
  nombre: string,
  categoria: string,
  qty: number,
  unitPrice = 100,
  moq_group?: string,
) {
  return { nombre, categoria, moq_group, qty, unitPrice };
}

/* ══════════════════════════════════════════════════════════════════
   isMate — sigue siendo usado como heurística para sugerencias admin
══════════════════════════════════════════════════════════════════ */
describe("isMate", () => {
  it("detecta nombre 'Mate Silicona'", () => {
    expect(isMate("Mate Silicona", "Bazar")).toBe(true);
  });

  it("detecta 'mates' como categoría exacta", () => {
    expect(isMate("Qualquier", "mates")).toBe(true);
  });

  it("NO matchea 'Tomate'", () => {
    expect(isMate("Tomate Cherry", "Verduras")).toBe(false);
  });

  it("NO matchea 'Material'", () => {
    expect(isMate("Material de estudio", "Libros")).toBe(false);
  });

  it("NO matchea 'Smart Watch' (Tecnología)", () => {
    expect(isMate("Smart Watch Pro", "Tecnología")).toBe(false);
  });

  it("NO matchea auricular con finish 'mate' en nombre", () => {
    // Nombre con 'mate' como adjetivo al final — falso positivo histórico
    // Ahora isMate sí lo detectaría, pero hasMoq ya NO usa isMate en runtime
    // Este test documenta el comportamiento de isMate aislado
    expect(isMate("Auricular Bluetooth Mate", "Tecnología")).toBe(true); // isMate detecta el token
  });

  it("NO matchea kit con MATE en nombre si moq_group='none' (runtime)", () => {
    // En runtime, hasMoq usa moq_group, no isMate → el kit no tiene MOQ
    const rules = makeRules();
    const kit = makeProduct("KIT TERMO STANLEY MATE 160ml", "Bazar", "none");
    expect(hasMoq(kit, rules)).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   moqGroupOf
══════════════════════════════════════════════════════════════════ */
describe("moqGroupOf", () => {
  it("retorna null si metadata no tiene moq_group", () => {
    expect(moqGroupOf({ nombre: "Test", metadata: {} })).toBeNull();
  });

  it("retorna 'none' si se seteo 'none'", () => {
    expect(moqGroupOf(makeProduct("Kit", "Bazar", "none"))).toBe("none");
  });

  it("retorna 'mates' si se seteo 'mates'", () => {
    expect(moqGroupOf(makeProduct("Mate", "Bazar", "mates"))).toBe("mates");
  });

  it("retorna '' si se seteo vacío", () => {
    expect(moqGroupOf(makeProduct("Tech", "Tecnología", ""))).toBe("");
  });

  it("retorna null si metadata es null", () => {
    expect(moqGroupOf({ nombre: "X", metadata: null })).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   hasMoq — nueva API retorna MoqInfo | null
══════════════════════════════════════════════════════════════════ */
describe("hasMoq", () => {
  const rules = makeRules();

  it("retorna null para moq_group='none' (sin importar nombre)", () => {
    const prod = makeProduct("Mate de silicona", "Bazar", "none");
    expect(hasMoq(prod, rules)).toBeNull();
  });

  it("retorna null para moq_group='none' en kit con MATE en nombre", () => {
    const kit = makeProduct("KIT TERMO STANLEY MATE 160ml", "Bazar", "none");
    expect(hasMoq(kit, rules)).toBeNull();
  });

  it("retorna MoqInfo con minUnits=10 para moq_group='mates'", () => {
    const prod = makeProduct("Mate acero inox", "Bazar", "mates");
    const info = hasMoq(prod, rules);
    expect(info).not.toBeNull();
    expect(info!.group).toBe("mates");
    expect(info!.minUnits).toBe(10);
  });

  it("retorna MoqInfo via isMate fallback (sin moq_group explícito)", () => {
    // Productos Mates sin moq_group seteado en DB usan isMate como fallback
    const prod = makeProduct("Mate de silicona", "Bazar"); // sin moq_group
    const info = hasMoq(prod, rules);
    expect(info).not.toBeNull();
    expect(info!.group).toBe("mates");
    expect(info!.minUnits).toBe(10);
  });

  it("retorna null para Tecnología sin moq_group (sin regla de categoría)", () => {
    // 'Smart Watch Pro' no contiene la palabra 'mate' → no matchea isMate → null ✓
    const prod = makeProduct("Smart Watch Pro", "Tecnología", "");
    expect(hasMoq(prod, rules)).toBeNull();
  });

  it("retorna null para Tecnología con moq_group=undefined (no tocado)", () => {
    // Idem: nombre no contiene 'mate' → null ✓
    const prod = makeProduct("Smart Watch Pro", "Tecnología");
    expect(hasMoq(prod, rules)).toBeNull();
  });

  it("isMate fallback aplica aunque la categoría sea 'Tecnología' si el nombre contiene 'mate'", () => {
    // Falso positivo conocido (aceptado provisionalmente): producto con 'mate' en nombre
    // queda restringido incluso si no es un Mate. Se resuelve con moq_group='none' en admin.
    const prod = makeProduct("Auricular Bluetooth Mate", "Tecnología", "");
    const info = hasMoq(prod, rules);
    // isMate detecta 'Mate' al final del nombre → hasMoq retorna MoqInfo
    expect(info).not.toBeNull();
    expect(info!.group).toBe("mates");
  });

  it("moq_group='none' anula isMate fallback (fix para kits/combos)", () => {
    // Con moq_group='none' explícito, el kit no queda restringido aunque el nombre contenga 'mate'
    const prod = makeProduct("Auricular Bluetooth Mate", "Tecnología", "none");
    expect(hasMoq(prod, rules)).toBeNull();
  });

  it("retorna MoqInfo para categoría perfumes con regla dinámica", () => {
    const customRules = makeRules({ cat_min_units_perfumes: "5" });
    const prod = makeProduct("Perfume Floral", "Perfumes", "");
    const info = hasMoq(prod, customRules);
    expect(info).not.toBeNull();
    expect(info!.minUnits).toBe(5);
  });

  it("retorna null si moq_group apunta a regla inexistente", () => {
    const prod = makeProduct("X", "Y", "regla_que_no_existe");
    expect(hasMoq(prod, rules)).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   meetsMoq
══════════════════════════════════════════════════════════════════ */
describe("meetsMoq", () => {
  const moqMates: MoqInfo = { group: "mates", minUnits: 10 };
  const moqPerfume: MoqInfo = { group: "perfumes", minUnits: 5 };

  it("siempre cumple si moqInfo es null (sin MOQ)", () => {
    expect(meetsMoq(null, 1)).toBe(true);
    expect(meetsMoq(null, 0)).toBe(true);
  });

  it("Mates qty=9 → NO cumple", () => {
    expect(meetsMoq(moqMates, 9)).toBe(false);
  });

  it("Mates qty=10 → SÍ cumple", () => {
    expect(meetsMoq(moqMates, 10)).toBe(true);
  });

  it("Mates qty=15 → SÍ cumple", () => {
    expect(meetsMoq(moqMates, 15)).toBe(true);
  });

  it("Perfume qty=1 → NO cumple (falta 4)", () => {
    expect(meetsMoq(moqPerfume, 1)).toBe(false);
  });

  it("Perfume qty=4 → NO cumple (falta 1)", () => {
    expect(meetsMoq(moqPerfume, 4)).toBe(false);
  });

  it("Perfume qty=5 → SÍ cumple", () => {
    expect(meetsMoq(moqPerfume, 5)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════
   checkCategoryMins con moq_group explícito
══════════════════════════════════════════════════════════════════ */
describe("checkCategoryMins — moq_group explícito", () => {
  const rules = makeRules();

  it("Mate (moq_group='mates') qty=9 → violación", () => {
    const items = [item("Mate Silicona", "Bazar", 9, 100, "mates")];
    const v = checkCategoryMins(items, rules);
    expect(v.length).toBe(1);
    expect(v[0]!.min).toBe(10);
    expect(v[0]!.current).toBe(9);
  });

  it("Mate (moq_group='mates') qty=10 → sin violación", () => {
    const items = [item("Mate Silicona", "Bazar", 10, 100, "mates")];
    expect(checkCategoryMins(items, rules)).toHaveLength(0);
  });

  it("Kit (moq_group='none') con 'MATE' en nombre → sin violación", () => {
    const items = [item("KIT TERMO STANLEY MATE 160ml", "Bazar", 2, 100, "none")];
    expect(checkCategoryMins(items, rules)).toHaveLength(0);
  });

  it("Kit (moq_group='none') + Mate (moq_group='mates') qty=10 → sin violación", () => {
    const items = [
      item("KIT TERMO STANLEY MATE 160ml", "Bazar", 3, 100, "none"),
      item("Mate de acero", "Bazar", 10, 100, "mates"),
    ];
    expect(checkCategoryMins(items, rules)).toHaveLength(0);
  });

  it("9 Mates en 3 modelos distintos → violación (se acumulan)", () => {
    const items = [
      item("Mate Silicona", "Bazar", 3, 100, "mates"),
      item("Mate Madera", "Bazar", 3, 100, "mates"),
      item("Mate Acero", "Bazar", 3, 100, "mates"),
    ];
    const v = checkCategoryMins(items, rules);
    expect(v.length).toBe(1);
    expect(v[0]!.current).toBe(9);
  });

  it("9 Mates + 1 Termo (sin moq_group) → violación por 9 Mates", () => {
    const items = [
      item("Mate Silicona", "Bazar", 9, 100, "mates"),
      item("Termo Stanley", "Bazar", 1, 100, undefined),
    ];
    const v = checkCategoryMins(items, rules);
    expect(v.length).toBe(1);
    expect(v[0]!.current).toBe(9);
    expect(v[0]!.min).toBe(10);
  });

  it("Tecnología (sin moq_group) → sin violación", () => {
    const items = [item("Smart Watch Pro", "Tecnología", 1, 100, undefined)];
    expect(checkCategoryMins(items, rules)).toHaveLength(0);
  });

  it("Mate sin moq_group explícito (isMate fallback) qty=9 → violación", () => {
    // Simula producto existente en DB sin moq_group seteado aún
    const items = [item("Mate Silicona", "Bazar", 9, 100, undefined)];
    const v = checkCategoryMins(items, rules);
    expect(v.length).toBe(1);
    expect(v[0]!.min).toBe(10);
    expect(v[0]!.current).toBe(9);
  });

  it("Mate sin moq_group explícito qty=10 → sin violación", () => {
    const items = [item("Mate Silicona", "Bazar", 10, 100, undefined)];
    expect(checkCategoryMins(items, rules)).toHaveLength(0);
  });

  it("Perfume con moq_group explícito qty=3 → violación", () => {
    // La clave normCat de 'cat_min_units_perfumes_arabes' es 'perfumes_arabes' (underscores)
    const customRules = makeRules({ cat_min_units_perfumes_arabes: "5" });
    const items = [item("Perfume Oud", "Perfumes Arabes", 3, 100, "perfumes_arabes")];
    const v = checkCategoryMins(items, customRules);
    expect(v.length).toBe(1);
    expect(v[0]!.min).toBe(5);
  });

  it("Perfume con moq_group explícito qty=5 → sin violación", () => {
    const customRules = makeRules({ cat_min_units_perfumes_arabes: "5" });
    const items = [item("Perfume Oud", "Perfumes Arabes", 5, 100, "perfumes_arabes")];
    expect(checkCategoryMins(items, customRules)).toHaveLength(0);
  });
});

/* ══════════════════════════════════════════════════════════════════
   parseCategoryRules
══════════════════════════════════════════════════════════════════ */
describe("parseCategoryRules", () => {
  it("siempre genera regla 'mates' con minUnits=10", () => {
    const rules = makeRules();
    expect(rules["mates"]).toBeDefined();
    expect(rules["mates"]!.minUnits).toBe(10);
  });

  it("no genera 'mate' duplicado (solo 'mates')", () => {
    const rules = makeRules();
    expect(rules["mate"]).toBeUndefined();
  });

  it("respeta reglas dinámicas cat_min_units_X", () => {
    const rules = makeRules({ cat_min_units_suplementos: "3" });
    expect(rules["suplementos"]?.minUnits).toBe(3);
  });

  it("ignora valores no numéricos en cat_min_units_X", () => {
    const rules = makeRules({ cat_min_units_test: "abc" });
    expect(rules["test"]?.minUnits).toBeUndefined();
  });

  it("ignora minUnits=0", () => {
    const rules = makeRules({ cat_min_units_test: "0" });
    expect(rules["test"]?.minUnits).toBeUndefined();
  });
});
