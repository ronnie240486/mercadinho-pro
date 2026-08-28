import { describe, expect, it } from "vitest";
import { CUSTOM_UNIT_VALUE, isFractionalProductUnit, isKnownProductUnit, normalizeProductUnit, normalizeSaleQuantity } from "./productUnits";

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

  it("identifica as unidades que admitem venda fracionada", () => {
    expect(isFractionalProductUnit("kg")).toBe(true);
    expect(isFractionalProductUnit("ML")).toBe(true);
    expect(isFractionalProductUnit("UN")).toBe(false);
    expect(isFractionalProductUnit("CX-12")).toBe(false);
  });

  it("normaliza frações com três casas e bloqueia frações em embalagens", () => {
    expect(normalizeSaleQuantity("0,375", "KG")).toBe(0.375);
    expect(normalizeSaleQuantity(2.9999, "L")).toBe(3);
    expect(normalizeSaleQuantity("3", "UN")).toBe(3);
    expect(() => normalizeSaleQuantity("1.5", "PCT")).toThrow("quantidades inteiras");
  });
});
