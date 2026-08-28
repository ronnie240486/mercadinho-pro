import { afterEach, describe, expect, it } from "vitest";
import { createPurchase, setDbForTests } from "./db";

const product = { id: 1, name: "Leite", active: true, stockQuantity: "10.000", costPrice: "4.00" };

function queryResult(result: unknown) {
  const chain: any = { where: () => chain, orderBy: () => chain, limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return { from: () => chain };
}

function createDatabase() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const transactionResults = [[{ id: 9 }], [{ id: 14 }]];
  const tx = {
    select: () => queryResult(transactionResults.shift() ?? []),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) }),
  };
  return { inserts, updates, select: () => queryResult([product]), transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) };
}

afterEach(() => setDbForTests(null));

describe("lotes no recebimento de compras", () => {
  it("cria lote ligado à compra, fornecedor e movimentação quando o item informa validade", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    await expect(createPurchase({ userId: 7, supplierId: 5, items: [{ productId: 1, quantity: 6, unitCost: 5.25, batchCode: "LT-240", expirationDate: "2026-12-31" }] })).resolves.toMatchObject({ success: true, totalAmount: 31.5 });

    expect(database.inserts.some(entry => (entry.values as { purchaseId?: number; supplierId?: number; code?: string; expirationDate?: string }).purchaseId === 9 && (entry.values as { supplierId?: number }).supplierId === 5 && (entry.values as { code?: string }).code === "LT-240" && (entry.values as { expirationDate?: string }).expirationDate === "2026-12-31")).toBe(true);
    expect(database.inserts.some(entry => (entry.values as { batchId?: number }).batchId === 14)).toBe(true);
    expect(database.updates.some(entry => (entry.values as { stockQuantity?: string }).stockQuantity === "16.000")).toBe(true);
  });

  it("mantém o recebimento normal quando o item não exige lote e bloqueia validade inválida", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    await expect(createPurchase({ userId: 7, supplierId: 5, items: [{ productId: 1, quantity: 2, unitCost: 5 }] })).resolves.toMatchObject({ success: true, totalAmount: 10 });
    expect(database.inserts.some(entry => (entry.values as { batchId?: number | null }).batchId === null)).toBe(true);

    await expect(createPurchase({ userId: 7, supplierId: 5, items: [{ productId: 1, quantity: 2, unitCost: 5, expirationDate: "31-12-2026" }] })).rejects.toThrow("validade");
  });
});
