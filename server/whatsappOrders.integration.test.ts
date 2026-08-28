import { afterEach, describe, expect, it } from "vitest";
import { createWhatsappOrder, setDbForTests } from "./db";

const product = { id: 1, name: "Feijão", unit: "KG", active: true, stockQuantity: "8.000", salePrice: "7.50", costPrice: "5.00" };

function queryResult(result: unknown) {
  const chain: any = { where: () => chain, orderBy: () => chain, limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return { from: () => chain };
}

function createDatabase() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const selections = [[product], []];
  const transactionSelections = [[{ id: 12 }]];
  const tx = {
    select: () => queryResult(transactionSelections.shift() ?? []),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); } }),
  };
  return { inserts, updates, select: () => queryResult(selections.shift() ?? []), update: () => ({ set: () => ({ where: async () => undefined }) }), transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) };
}

afterEach(() => setDbForTests(null));

describe("pedidos por WhatsApp", () => {
  it("registra itens ao preço vigente sem baixar estoque ou movimentar caixa", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    const result = await createWhatsappOrder({ userId: 7, customerName: "Maria", customerPhone: "11999990000", fulfillment: "delivery", deliveryAddress: "Rua das Flores, 10", paymentMethod: "pix", items: [{ productId: 1, quantity: 1.5 }] });

    expect(result).toMatchObject({ success: true, totalAmount: 11.25, fulfillment: "delivery", paymentMethod: "pix" });
    expect(database.inserts).toHaveLength(2);
    expect(database.inserts.some(entry => Array.isArray(entry.values) && (entry.values as Array<{ whatsappOrderId?: number; quantity?: string }>)[0]?.whatsappOrderId === 12 && (entry.values as Array<{ quantity?: string }>)[0]?.quantity === "1.500")).toBe(true);
    expect(database.updates).toHaveLength(0);
  });

  it("exige endereço quando o pedido é para entrega", async () => {
    const database = createDatabase();
    setDbForTests(database as never);

    await expect(createWhatsappOrder({ userId: 7, customerName: "Maria", fulfillment: "delivery", paymentMethod: "cash", items: [{ productId: 1, quantity: 1 }] })).rejects.toThrow("endereço");
  });
});
