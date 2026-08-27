import { describe, expect, it } from "vitest";
import { allocateBatchConsumption, allocateBatchRestoration, applyStockMovement, calculateCashBalance, calculateLoyaltyRedemption, calculateSaleTotals, formatBatchConsumption, hasOperationalPermission, normalizeBarcodeCode, requireBatchCoverage, resolveAccountPayableStatus } from "./businessUtils";

describe("regras comerciais", () => {
  it("calcula subtotal, desconto e total de uma venda", () => {
    expect(calculateSaleTotals([{ quantity: 2, unitPrice: 7.5 }, { quantity: 1, unitPrice: 3.25 }], 1.25)).toEqual({ subtotal: 18.25, discountAmount: 1.25, totalAmount: 17 });
  });

  it("impede descontos superiores ao subtotal", () => {
    expect(() => calculateSaleTotals([{ quantity: 1, unitPrice: 4 }], 4.01)).toThrow("desconto");
  });

  it("converte pontos e limita crédito de fidelidade ao valor da venda", () => {
    expect(calculateLoyaltyRedemption("points", 200, 150, 1.2)).toEqual({ points: 120, creditAmount: 0, discountAmount: 1.2 });
    expect(calculateLoyaltyRedemption("credit", 8, 6, 4.5)).toEqual({ points: 0, creditAmount: 4.5, discountAmount: 4.5 });
    expect(() => calculateLoyaltyRedemption("points", 10, 11, 5)).toThrow("pontos suficientes");
  });

  it("não permite estoque negativo", () => {
    expect(applyStockMovement(10, -3)).toBe(7);
    expect(() => applyStockMovement(2, -2.001)).toThrow("Estoque insuficiente");
  });

  it("concilia somente dinheiro físico no saldo esperado do caixa", () => {
    expect(calculateCashBalance(50, [{ type: "sale", amount: 20, paymentMethod: "cash" }, { type: "sale", amount: 30, paymentMethod: "pix" }, { type: "supply", amount: 15 }, { type: "withdrawal", amount: 10 }])).toBe(75);
  });

  it("estorna somente pagamentos e devoluções em dinheiro físico", () => {
    expect(calculateCashBalance(100, [
      { type: "sale", amount: 30, paymentMethod: "cash" },
      { type: "sale", amount: 40, paymentMethod: "pix" },
      { type: "cancellation", amount: 30, paymentMethod: "cash" },
      { type: "cancellation", amount: 40, paymentMethod: "pix" },
      { type: "return", amount: 15, paymentMethod: "cash" },
      { type: "return", amount: 10, paymentMethod: "debit" },
    ])).toBe(85);
  });

  it("classifica contas abertas vencidas sem alterar contas já baixadas", () => {
    expect(resolveAccountPayableStatus("open", "2026-08-26", "2026-08-27")).toBe("overdue");
    expect(resolveAccountPayableStatus("open", "2026-08-27", "2026-08-27")).toBe("open");
    expect(resolveAccountPayableStatus("paid", "2026-08-01", "2026-08-27")).toBe("paid");
  });

  it("reconhece os papéis autorizados para a operação", () => {
    expect(hasOperationalPermission("stockist", ["admin", "stockist"])).toBe(true);
    expect(hasOperationalPermission("operator", ["admin", "stockist"])).toBe(false);
  });

  it("normaliza espaços inseridos na leitura do código de barras", () => {
    expect(normalizeBarcodeCode("  789 1234 5678 90  ")).toBe("7891234567890");
  });

  it("consome primeiro os lotes com menor saldo de validade disponível", () => {
    expect(allocateBatchConsumption([2, 5, 4], 6)).toEqual([2, 4, 0]);
  });

  it("impede baixas por lote sem quantidade positiva", () => {
    expect(() => allocateBatchConsumption([3], 0)).toThrow("saída");
  });

  it("impede venda ou perda maior do que o saldo nos lotes rastreados", () => {
    expect(() => requireBatchCoverage([1, 2], 3.001)).toThrow("lotes");
    expect(requireBatchCoverage([1, 2], 3)).toEqual([1, 2]);
  });

  it("restaura a parcela correta dos lotes em devoluções sucessivas", () => {
    expect(allocateBatchRestoration([2, 5], 0, 3)).toEqual([2, 1]);
    expect(allocateBatchRestoration([2, 5], 3, 2)).toEqual([0, 2]);
    expect(() => allocateBatchRestoration([2, 5], 0, 8)).toThrow("ultrapassa");
  });

  it("registra todos os lotes distribuídos em uma perda sem lote selecionado", () => {
    const allocation = requireBatchCoverage([1, 2], 3);
    expect(formatBatchConsumption([{ id: 1, code: "A", quantity: allocation[0] }, { id: 2, code: "B", quantity: allocation[1] }])).toBe("Lotes: A (1.000), B (2.000)");
  });
});
