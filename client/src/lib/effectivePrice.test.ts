import { describe, expect, it } from "vitest";
import { resolveEffectivePrice } from "./effectivePrice";

describe("resolveEffectivePrice", () => {
  it("mantém o preço regular quando não há promoção ativa para o produto", () => {
    const result = resolveEffectivePrice(11, "12.50", [{ productId: 15, name: "Oferta", promotionalPrice: "9.90" }]);

    expect(result.price).toBe(12.5);
    expect(result.promotion).toBeUndefined();
  });

  it("prioriza a promoção ativa do próprio produto", () => {
    const result = resolveEffectivePrice(11, "12.50", [{ productId: 11, name: "Oferta do dia", promotionalPrice: "9.90" }]);

    expect(result.price).toBe(9.9);
    expect(result.promotion?.name).toBe("Oferta do dia");
  });
});
