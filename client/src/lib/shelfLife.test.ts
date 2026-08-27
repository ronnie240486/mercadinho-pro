import { describe, expect, it } from "vitest";
import { getShelfLifeInfo } from "./shelfLife";

describe("getShelfLifeInfo", () => {
  const today = new Date("2026-08-27T12:00:00");

  it("prioriza lotes vencidos, que vencem hoje e que vencem nos próximos sete dias", () => {
    expect(getShelfLifeInfo("2026-08-26", today).label).toBe("Vencido");
    expect(getShelfLifeInfo("2026-08-27", today).label).toBe("Vence hoje");
    expect(getShelfLifeInfo("2026-09-02", today).label).toBe("6 dia(s)");
  });

  it("mantém a informação neutra quando a validade não foi registrada", () => {
    expect(getShelfLifeInfo(null, today).days).toBeNull();
  });
});
