import { afterEach, describe, expect, it } from "vitest";
import { cancelSale, setDbForTests } from "./db";

function queryResult(result: unknown) {
  const chain: any = {
    where: () => chain,
    orderBy: () => chain,
    limit: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return { from: () => chain };
}

function createDatabase(options: { historicalBatchTrace?: boolean } = {}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const databaseSelections = [
    [{ id: 10, code: "V-001", status: "completed", cashSessionId: 5, notes: null }],
    [{ id: 5, status: "open", openingAmount: "20.00" }],
    [],
    [],
    [{ id: 51, productId: 1, productName: "Arroz", quantity: "2.000" }],
    [{ method: "cash", amount: "10.00" }],
    [],
    ...(options.historicalBatchTrace ? [[{ id: 401 }]] : []),
  ];
  const transactionSelections = [
    [{ id: 1, stockQuantity: "4.000" }],
    [{ batchId: 3, quantity: "2.000" }],
    [{ id: 3, code: "L-001", availableQuantity: "1.000", status: "depleted" }],
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

describe("cancelamento de venda", () => {
  it("restaura produto e lote e grava reembolso com valor positivo", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    await expect(cancelSale(10, 7, "Venda em duplicidade")).resolves.toEqual({ success: true });

    expect(database.updates.some(entry => (entry.values as { availableQuantity?: string }).availableQuantity === "3.000")).toBe(true);
    expect(database.updates.some(entry => (entry.values as { stockQuantity?: string }).stockQuantity === "6.000")).toBe(true);
    const cashEntry = database.inserts.at(-1)?.values as Array<{ type: string; amount: string; paymentMethod: string }>;
    expect(cashEntry).toEqual([expect.objectContaining({ type: "cancellation", amount: "10.00", paymentMethod: "cash" })]);
  });

  it("bloqueia venda histórica rastreada por lote sem alocações registradas", async () => {
    const database = createDatabase({ historicalBatchTrace: true });
    setDbForTests(database as never);

    await expect(cancelSale(10, 7, "Venda em duplicidade")).rejects.toThrow("distribuição de lotes");
  });
});
