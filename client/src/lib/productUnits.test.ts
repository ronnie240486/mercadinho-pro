import { describe, expect, it } from "vitest";
import { CUSTOM_UNIT_VALUE, isKnownProductUnit, normalizeProductUnit } from "./productUnits";

describe("unidades comerciais de produto", () => {
  it("mantém siglas comerciais padronizadas", () => {
    expect(isKnownProductUnit("un")).toBe(true);
    expect(isKnownProductUnit("PCT")).toBe(true);
    expect(isKnownProductUnit("kg")).toBe(true);
    expect(isKnownProductUnit("L")).toBe(true);
  });

  it("normaliza uma sigla personalizada válida", () => {
    expect(normalizeProductUnit(CUSTOM_UNIT_VALUE, "cx-12")).toBe("CX-12");
  });

  it("rejeita sigla personalizada ausente ou inválida", () => {
    expect(() => normalizeProductUnit(CUSTOM_UNIT_VALUE, "")).toThrow("Selecione uma unidade comercial");
    expect(() => normalizeProductUnit(CUSTOM_UNIT_VALUE, "m²")).toThrow("sigla personalizada");
  });
});
