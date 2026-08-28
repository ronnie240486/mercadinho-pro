import { describe, expect, it } from "vitest";
import { getCashMovementPresentation } from "./cashMovementPresentation";

describe("getCashMovementPresentation", () => {
  it("apresenta devolução como saída financeira", () => {
    expect(getCashMovementPresentation("return")).toEqual({ label: "Devolução", isOutflow: true, sign: "−" });
  });

  it("mantém vendas e suprimentos como entradas", () => {
    expect(getCashMovementPresentation("sale")).toMatchObject({ isOutflow: false, sign: "+" });
    expect(getCashMovementPresentation("supply")).toMatchObject({ isOutflow: false, sign: "+" });
  });
});
