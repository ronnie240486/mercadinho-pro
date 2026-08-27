import { afterEach, describe, expect, it } from "vitest";
import { createAccountPayable, listAccountsPayable, payAccountPayable, setDbForTests } from "./db";

function queryResult(result: unknown) {
  const chain: any = { where: () => chain, leftJoin: () => chain, orderBy: () => chain, limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return { from: () => chain };
}

function createDatabase(selections: unknown[]) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  return {
    inserts,
    updates,
    select: () => queryResult(selections.shift() ?? []),
    insert: (table: unknown) => ({ values: async (values: unknown) => { inserts.push({ table, values }); } }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { updates.push({ table, values }); } }) }),
  };
}

afterEach(() => setDbForTests(null));

describe("contas a pagar", () => {
  it("registra lançamento e baixa integral da conta", async () => {
    const database = createDatabase([[{ id: 4, amount: "56.80", status: "open" }]]);
    setDbForTests(database as never);
    await createAccountPayable({ description: "Compra de bebidas", dueDate: "2026-09-10", amount: 56.8 });
    await payAccountPayable(4);
    expect(database.inserts).toHaveLength(1);
    expect(database.updates.at(-1)?.values).toEqual(expect.objectContaining({ status: "paid", paidAmount: "56.80" }));
  });

  it("identifica conta vencida ao listar os compromissos", async () => {
    const database = createDatabase([[{ id: 8, description: "Fornecedor", dueDate: "2020-01-01", amount: "10.00", paidAmount: "0.00", status: "overdue", supplierName: "Distribuidora" }]]);
    setDbForTests(database as never);
    const accounts = await listAccountsPayable();
    expect(accounts[0]).toEqual(expect.objectContaining({ status: "overdue", supplierName: "Distribuidora" }));
  });
});
