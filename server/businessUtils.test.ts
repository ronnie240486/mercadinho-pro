import { describe, expect, it } from "vitest";
import { applyStockMovement, calculateCashBalance, calculateSaleTotals, hasOperationalPermission } from "./businessUtils";

describe("regras comerciais", () => {
  it("calcula subtotal, desconto e total de uma venda", () => {
    expect(calculateSaleTotals([{ quantity: 2, unitPrice: 7.5 }, { quantity: 1, unitPrice: 3.25 }], 1.25)).toEqual({ subtotal: 18.25, discountAmount: 1.25, totalAmount: 17 });
  });

  it("impede descontos superiores ao subtotal", () => {
    expect(() => calculateSaleTotals([{ quantity: 1, unitPrice: 4 }], 4.01)).toThrow("desconto");
  });

  it("não permite estoque negativo", () => {
    expect(applyStockMovement(10, -3)).toBe(7);
    expect(() => applyStockMovement(2, -2.001)).toThrow("Estoque insuficiente");
  });

  it("concilia somente dinheiro físico no saldo esperado do caixa", () => {
    expect(calculateCashBalance(50, [{ type: "sale", amount: 20, paymentMethod: "cash" }, { type: "sale", amount: 30, paymentMethod: "pix" }, { type: "supply", amount: 15 }, { type: "withdrawal", amount: 10 }])).toBe(75);
  });

  it("reconhece os papéis autorizados para a operação", () => {
    expect(hasOperationalPermission("stockist", ["admin", "stockist"])).toBe(true);
    expect(hasOperationalPermission("operator", ["admin", "stockist"])).toBe(false);
  });
});
