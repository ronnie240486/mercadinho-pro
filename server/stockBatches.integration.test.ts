import { afterEach, describe, expect, it } from "vitest";
import { receiveProductBatch, recordStockMovement, registerStockLoss, setDbForTests } from "./db";

const product = { id: 1, active: true, stockQuantity: "10.000", costPrice: "4.00" };

function queryResult(result: unknown) {
  const chain: any = { where: () => chain, orderBy: () => chain, limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return { from: () => chain };
}

function createDatabase(options: { batches?: Array<{ id: number; code: string | null; availableQuantity: string; status: "active" }>; insertedBatch?: { id: number } } = {}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const tx = {
    select: () => queryResult(options.batches ?? (options.insertedBatch ? [options.insertedBatch] : [])),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) }),
  };
  return {
    inserts,
    updates,
    select: () => queryResult([product]),
    transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  };
}

afterEach(() => setDbForTests(null));

describe("operações de estoque por lote", () => {
  it("recebe um lote e cria a movimentação de entrada ligada ao lote", async () => {
    const database = createDatabase({ insertedBatch: { id: 8 } });
    setDbForTests(database as never);

    const result = await receiveProductBatch({ productId: 1, userId: 7, batchCode: "L-001", expirationDate: "2026-12-31", quantity: 5, unitCost: 6 });

    expect(result).toMatchObject({ success: true, currentQuantity: 15, batchCode: "L-001" });
    expect(database.inserts).toHaveLength(2);
    expect(database.updates.some(entry => (entry.values as { stockQuantity?: string }).stockQuantity === "15.000")).toBe(true);
  });

  it("distribui uma perda sem lote selecionado e registra todos os lotes no histórico", async () => {
    const database = createDatabase({ batches: [{ id: 2, code: "A", availableQuantity: "1.000", status: "active" }, { id: 3, code: "B", availableQuantity: "2.000", status: "active" }] });
    setDbForTests(database as never);

    const result = await registerStockLoss({ productId: 1, userId: 7, quantity: 3, reason: "Vencimento" });

    expect(result).toMatchObject({ success: true, currentQuantity: 7 });
    const movement = database.inserts.at(-1)?.values as { reason?: string; batchId?: number };
    expect(movement.reason).toContain("Lotes: A (1.000), B (2.000)");
    expect(movement.batchId).toBe(2);
  });

  it("consome lotes em uma saída e falha quando os lotes rastreados não cobrem a baixa", async () => {
    const successfulDatabase = createDatabase({ batches: [{ id: 2, code: "A", availableQuantity: "2.000", status: "active" }] });
    setDbForTests(successfulDatabase as never);
    await expect(recordStockMovement({ productId: 1, userId: 7, type: "outbound", quantity: 2, reason: "Uso interno" })).resolves.toMatchObject({ success: true, currentQuantity: 8 });

    const insufficientDatabase = createDatabase({ batches: [{ id: 2, code: "A", availableQuantity: "1.000", status: "active" }] });
    setDbForTests(insufficientDatabase as never);
    await expect(recordStockMovement({ productId: 1, userId: 7, type: "outbound", quantity: 2, reason: "Uso interno" })).rejects.toThrow("lotes");
  });
});
