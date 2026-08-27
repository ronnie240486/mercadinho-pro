import { afterEach, describe, expect, it } from "vitest";
import { createSaleReturn, setDbForTests } from "./db";

function queryResult(result: unknown) {
  const chain: any = {
    where: () => chain,
    orderBy: () => chain,
    limit: async () => result,
    groupBy: () => chain,
    leftJoin: () => chain,
    innerJoin: () => chain,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return { from: () => chain };
}

function createDatabase() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const databaseSelections = [
    [{ id: 10, code: "V-001", status: "completed", subtotal: "20.00", totalAmount: "18.00" }],
    [{ id: 5, status: "open", openingAmount: "20.00" }],
    [],
    [{ id: 51, saleId: 10, productId: 1, productName: "Arroz", quantity: "4.000", totalAmount: "20.00" }],
    [],
  ];
  const transactionSelections = [
    [{ id: 99 }],
    [{ id: 1, stockQuantity: "4.000" }],
    [],
  ];
  const tx = {
    select: () => queryResult(transactionSelections.shift() ?? []),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) }),
  };
  return {
    inserts,
    updates,
    select: () => queryResult(databaseSelections.shift() ?? []),
    transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  };
}

afterEach(() => setDbForTests(null));

describe("devolução parcial de venda", () => {
  it("restaura o estoque e calcula reembolso proporcional ao desconto original", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    const result = await createSaleReturn({ saleId: 10, userId: 7, reason: "Produto avariado", refundMethod: "cash", items: [{ saleItemId: 51, quantity: 1 }] });

    expect(result).toMatchObject({ success: true, totalAmount: 4.5 });
    expect(database.updates.some(entry => (entry.values as { stockQuantity?: string }).stockQuantity === "5.000")).toBe(true);
    expect(database.inserts.some(entry => (entry.values as { amount?: string }).amount === "4.50")).toBe(true);
    const cashEntry = database.inserts.at(-1)?.values as { type: string; paymentMethod: string; amount: string };
    expect(cashEntry).toEqual(expect.objectContaining({ type: "return", paymentMethod: "cash", amount: "4.50" }));
  });
});
