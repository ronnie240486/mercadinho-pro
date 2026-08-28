import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accountsPayable,
  googleDriveBackupConnections,
  googleDriveBackupRuns,
  loyaltyTransactions,
  salesGoals,
  cashMovements,
  cashSessions,
  categories,
  customers,
  inventoryCounts,
  priceHistories,
  products,
  productBatches,
  promotions,
  purchaseItems,
  purchases,
  saleItems,
  saleItemBatchAllocations,
  salePayments,
  saleReturnItems,
  saleReturns,
  sales,
  stockMovements,
  suppliers,
  type InsertUser,
  users,
  whatsappOrderItems,
  whatsappOrders,
} from "../drizzle/schema";
import { allocateBatchRestoration, applyStockMovement, calculateCashBalance, calculateLoyaltyRedemption, calculateSaleTotals, calculateSuggestedReplenishment, formatBatchConsumption, normalizeBarcodeCode, requireBatchCoverage, resolveAccountPayableStatus, type PaymentMethod } from "./businessUtils";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Falha ao conectar:", error);
      _db = null;
    }
  }
  return _db;
}

export function setDbForTests(database: ReturnType<typeof drizzle> | null) {
  _db = database;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("O banco de dados não está disponível no momento.");
  return db;
}

function decimal(value: number, digits = 2) {
  if (!Number.isFinite(value)) throw new Error("Valor numérico inválido.");
  return value.toFixed(digits);
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

async function consumeProductBatches(tx: any, productId: number, quantity: number) {
  const batches = await tx
    .select()
    .from(productBatches)
    .where(and(eq(productBatches.productId, productId), eq(productBatches.status, "active"), sql`${productBatches.availableQuantity} > 0`))
    .orderBy(sql`case when ${productBatches.expirationDate} is null then 1 else 0 end`, productBatches.expirationDate);
  if (!batches.length) return [];
  const allocation = requireBatchCoverage(batches.map((batch: { availableQuantity: string | number | null }) => toNumber(batch.availableQuantity)), quantity);
  const consumedBatches: Array<{ id: number; code: string | null; quantity: number }> = [];
  for (const [index, batch] of batches.entries()) {
    const quantityFromBatch = allocation[index] ?? 0;
    if (quantityFromBatch <= 0) continue;
    const availableQuantity = applyStockMovement(toNumber(batch.availableQuantity), -quantityFromBatch);
    await tx.update(productBatches).set({ availableQuantity: decimal(availableQuantity, 3), status: availableQuantity === 0 ? "depleted" : "active" }).where(eq(productBatches.id, batch.id));
    consumedBatches.push({ id: batch.id, code: batch.code, quantity: quantityFromBatch });
  }
  return consumedBatches;
}

async function restoreBatchAllocation(tx: any, batchId: number, quantity: number) {
  const [batch] = await tx.select().from(productBatches).where(eq(productBatches.id, batchId)).limit(1);
  if (!batch) throw new Error("O lote associado à venda não foi encontrado para restauração.");
  const availableQuantity = Math.round((toNumber(batch.availableQuantity) + quantity) * 1000) / 1000;
  await tx
    .update(productBatches)
    .set({ availableQuantity: decimal(availableQuantity, 3), status: batch.status === "depleted" ? "active" : batch.status })
    .where(eq(productBatches.id, batch.id));
  return { code: batch.code, availableQuantity };
}

function sliceBatchAllocation(
  allocations: Array<{ batchId: number; quantity: string | number }>,
  alreadyRestoredQuantity: number,
  requestedQuantity: number,
) {
  const quantitiesToRestore = allocateBatchRestoration(allocations.map(item => toNumber(item.quantity)), alreadyRestoredQuantity, requestedQuantity);
  return allocations
    .map((allocation, index) => ({ batchId: allocation.batchId, quantity: quantitiesToRestore[index] ?? 0 }))
    .filter(allocation => allocation.quantity > 0);
}

async function requireBatchRestorationTrace(db: any, saleId: number, items: Array<{ id: number; productId: number }>) {
  for (const item of items) {
    const allocations = await db.select({ id: saleItemBatchAllocations.id }).from(saleItemBatchAllocations).where(eq(saleItemBatchAllocations.saleItemId, item.id));
    if (allocations.length) continue;
    const [trackedMovement] = await db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(and(eq(stockMovements.saleId, saleId), eq(stockMovements.productId, item.productId), sql`${stockMovements.batchId} is not null`))
      .limit(1);
    if (trackedMovement) {
      throw new Error("Esta venda histórica não possui a distribuição de lotes necessária para um estorno seguro. Registre a devolução manualmente pelo estoque.");
    }
  }
}

async function reverseSaleLoyalty(tx: any, sale: { id: number; customerId: number | null; totalAmount: string | number }, userId: number, returnedAmount: number, description: string) {
  if (!sale.customerId || returnedAmount <= 0) return;
  const [customer] = await tx.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1);
  if (!customer) return;
  const movements: Array<{ type: "earn" | "redeem" | "adjustment" | "reversal"; points: number; creditAmount: string | number }> = await tx.select({ type: loyaltyTransactions.type, points: loyaltyTransactions.points, creditAmount: loyaltyTransactions.creditAmount }).from(loyaltyTransactions).where(eq(loyaltyTransactions.saleId, sale.id));
  const totalAmount = toNumber(sale.totalAmount);
  if (totalAmount <= 0) return;
  const originalPointsEffect = movements.filter(movement => movement.type !== "reversal").reduce((total, movement) => total + movement.points, 0);
  const originalCreditEffect = movements.filter(movement => movement.type !== "reversal").reduce((total, movement) => total + toNumber(movement.creditAmount), 0);
  const existingPointsReversal = movements.filter(movement => movement.type === "reversal").reduce((total, movement) => total + movement.points, 0);
  const existingCreditReversal = movements.filter(movement => movement.type === "reversal").reduce((total, movement) => total + toNumber(movement.creditAmount), 0);
  const ratio = Math.min(1, returnedAmount / totalAmount);
  const targetPointsReversal = -Math.round(originalPointsEffect * ratio);
  const targetCreditReversal = -Math.round(originalCreditEffect * ratio * 100) / 100;
  const points = targetPointsReversal - existingPointsReversal;
  const creditAmount = Math.round((targetCreditReversal - existingCreditReversal) * 100) / 100;
  if (points === 0 && creditAmount === 0) return;
  const nextPoints = customer.loyaltyPointsBalance + points;
  const nextCredit = Math.round((toNumber(customer.loyaltyCreditBalance) + creditAmount) * 100) / 100;
  if (nextPoints < 0 || nextCredit < 0) throw new Error("A fidelidade desta venda já foi utilizada em outra operação e não pode ser estornada automaticamente.");
  await tx.update(customers).set({ loyaltyPointsBalance: nextPoints, loyaltyCreditBalance: decimal(nextCredit) }).where(eq(customers.id, customer.id));
  await tx.insert(loyaltyTransactions).values({ customerId: customer.id, saleId: sale.id, userId, type: "reversal", points, creditAmount: decimal(creditAmount), description });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("O identificador do usuário é obrigatório.");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getDashboardSummary() {
  const db = await requireDb();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [today] = await db
    .select({
      totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      salesCount: sql<number>`count(${sales.id})`,
    })
    .from(sales)
    .where(and(eq(sales.status, "completed"), gte(sales.createdAt, startOfToday)));
  const [lowStock] = await db
    .select({ count: sql<number>`count(${products.id})` })
    .from(products)
    .where(and(eq(products.active, true), sql`${products.minimumStock} > 0`, sql`${products.stockQuantity} <= ${products.minimumStock}`));
  const [activeProducts] = await db
    .select({ count: sql<number>`count(${products.id})` })
    .from(products)
    .where(eq(products.active, true));
  const openCash = await getOpenCashSession();

  return {
    todaySalesAmount: toNumber(today?.totalAmount),
    todaySalesCount: Number(today?.salesCount ?? 0),
    lowStockCount: Number(lowStock?.count ?? 0),
    activeProductCount: Number(activeProducts?.count ?? 0),
    cashStatus: openCash ? "open" : "closed",
    cashBalance: openCash?.expectedBalance ?? 0,
  };
}

export async function listCriticalStockProducts() {
  const db = await requireDb();
  const criticalProducts = await db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      stockQuantity: products.stockQuantity,
      minimumStock: products.minimumStock,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), sql`${products.minimumStock} > 0`, sql`${products.stockQuantity} <= ${products.minimumStock}`))
    .orderBy(sql`${products.stockQuantity} - ${products.minimumStock}`)
    .limit(12);

  return criticalProducts.map(product => {
    const stockQuantity = toNumber(product.stockQuantity);
    const minimumStock = toNumber(product.minimumStock);
    return {
      ...product,
      stockQuantity,
      minimumStock,
      suggestedQuantity: calculateSuggestedReplenishment(stockQuantity, minimumStock),
    };
  });
}

export async function listProducts(search?: string) {
  const db = await requireDb();
  const needle = search?.trim();
  const searchCondition = needle
    ? or(like(products.name, `%${needle}%`), like(products.barcode, `%${needle}%`), like(products.internalCode, `%${needle}%`))
    : undefined;
  return db
    .select({
      id: products.id,
      barcode: products.barcode,
      internalCode: products.internalCode,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unit: products.unit,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      stockQuantity: products.stockQuantity,
      minimumStock: products.minimumStock,
      active: products.active,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), searchCondition))
    .orderBy(products.name)
    .limit(100);
}

export async function findProductByCode(code: string) {
  const db = await requireDb();
  const normalizedCode = normalizeBarcodeCode(code);
  const result = await db
    .select({
      id: products.id,
      barcode: products.barcode,
      internalCode: products.internalCode,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unit: products.unit,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      stockQuantity: products.stockQuantity,
      minimumStock: products.minimumStock,
      active: products.active,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), or(eq(products.barcode, normalizedCode), eq(products.internalCode, normalizedCode))))
    .limit(1);
  return result[0] ?? null;
}

export async function createProduct(input: {
  barcode?: string;
  internalCode?: string;
  name: string;
  description?: string;
  categoryId?: number | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
}) {
  const db = await requireDb();
  await db.insert(products).values({
    barcode: input.barcode || null,
    internalCode: input.internalCode || null,
    name: input.name.trim(),
    description: input.description || null,
    categoryId: input.categoryId ?? null,
    unit: input.unit.trim().toUpperCase(),
    costPrice: decimal(input.costPrice),
    salePrice: decimal(input.salePrice),
    minimumStock: decimal(input.minimumStock, 3),
  });
  return { success: true } as const;
}

export async function importProducts(input: {
  items: Array<{
    name: string;
    barcode?: string;
    internalCode?: string;
    categoryName?: string;
    unit: string;
    costPrice: number;
    salePrice: number;
    minimumStock: number;
  }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Inclua ao menos um produto válido para importar.");
  if (input.items.length > 500) throw new Error("A importação aceita até 500 produtos por vez.");
  const normalizedItems = input.items.map(item => ({
    ...item,
    name: item.name.trim(),
    barcode: item.barcode?.trim() || undefined,
    internalCode: item.internalCode?.trim() || undefined,
    categoryName: item.categoryName?.trim() || undefined,
    unit: item.unit.trim().toUpperCase(),
  }));
  const codes = normalizedItems.flatMap(item => [item.barcode, item.internalCode].filter((code): code is string => Boolean(code)));
  if (new Set(codes).size !== codes.length) throw new Error("Há códigos de barras ou internos repetidos no próprio arquivo.");
  const existingProducts = await db.select({ barcode: products.barcode, internalCode: products.internalCode }).from(products);
  const existingCodes = new Set(existingProducts.flatMap(item => [item.barcode, item.internalCode].filter((code): code is string => Boolean(code))));
  const duplicatedExistingCode = codes.find(code => existingCodes.has(code));
  if (duplicatedExistingCode) throw new Error(`O código ${duplicatedExistingCode} já pertence a um produto cadastrado.`);

  await db.transaction(async tx => {
    const categoriesByName = new Map((await tx.select().from(categories)).map(category => [category.name.trim().toLocaleLowerCase("pt-BR"), category]));
    for (const categoryName of Array.from(new Set(normalizedItems.map(item => item.categoryName).filter((name): name is string => Boolean(name))))) {
      const key = categoryName.toLocaleLowerCase("pt-BR");
      if (categoriesByName.has(key)) continue;
      await tx.insert(categories).values({ name: categoryName });
      const [createdCategory] = await tx.select().from(categories).where(eq(categories.name, categoryName)).orderBy(desc(categories.id)).limit(1);
      if (!createdCategory) throw new Error(`Não foi possível criar a categoria ${categoryName}.`);
      categoriesByName.set(key, createdCategory);
    }
    await tx.insert(products).values(normalizedItems.map(item => ({
      barcode: item.barcode ?? null,
      internalCode: item.internalCode ?? null,
      name: item.name,
      categoryId: item.categoryName ? categoriesByName.get(item.categoryName.toLocaleLowerCase("pt-BR"))?.id ?? null : null,
      unit: item.unit,
      costPrice: decimal(item.costPrice),
      salePrice: decimal(item.salePrice),
      minimumStock: decimal(item.minimumStock, 3),
    })));
  });
  return { success: true, importedCount: normalizedItems.length } as const;
}

export async function updateProduct(input: {
  id: number;
  userId: number;
  barcode?: string;
  internalCode?: string;
  name: string;
  description?: string;
  categoryId?: number | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
  active: boolean;
}) {
  const db = await requireDb();
  const [previousProduct] = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
  if (!previousProduct) throw new Error("Produto não encontrado.");
  await db
    .update(products)
    .set({
      barcode: input.barcode || null,
      internalCode: input.internalCode || null,
      name: input.name.trim(),
      description: input.description || null,
      categoryId: input.categoryId ?? null,
      unit: input.unit.trim().toUpperCase(),
      costPrice: decimal(input.costPrice),
      salePrice: decimal(input.salePrice),
      minimumStock: decimal(input.minimumStock, 3),
      active: input.active,
    })
    .where(eq(products.id, input.id));
  if (toNumber(previousProduct.salePrice) !== input.salePrice) {
    await db.insert(priceHistories).values({ productId: input.id, userId: input.userId, previousSalePrice: previousProduct.salePrice, newSalePrice: decimal(input.salePrice), reason: "Alteração no cadastro do produto" });
  }
  return { success: true } as const;
}

export async function listCategories() {
  const db = await requireDb();
  return db.select().from(categories).where(eq(categories.active, true)).orderBy(categories.name);
}

export async function createCategory(input: { name: string; description?: string }) {
  const db = await requireDb();
  await db.insert(categories).values({ name: input.name.trim(), description: input.description || null });
  return { success: true } as const;
}

export async function listSuppliers() {
  const db = await requireDb();
  return db.select().from(suppliers).where(eq(suppliers.active, true)).orderBy(suppliers.legalName);
}

export async function createSupplier(input: {
  legalName: string;
  tradeName?: string;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const db = await requireDb();
  await db.insert(suppliers).values({ ...input, legalName: input.legalName.trim() });
  return { success: true } as const;
}

export async function listCustomers() {
  const db = await requireDb();
  return db.select().from(customers).where(eq(customers.active, true)).orderBy(customers.name);
}

export async function createCustomer(input: { name: string; document?: string; phone?: string; email?: string; notes?: string; loyaltyMode?: "points" | "credit" }) {
  const db = await requireDb();
  await db.insert(customers).values({ ...input, name: input.name.trim() });
  return { success: true } as const;
}

export async function updateCustomerLoyaltyMode(customerId: number, loyaltyMode: "points" | "credit") {
  const db = await requireDb();
  const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.active, true))).limit(1);
  if (!customer) throw new Error("Cliente não encontrado.");
  await db.update(customers).set({ loyaltyMode }).where(eq(customers.id, customerId));
  return { success: true } as const;
}

export async function listLoyaltyTransactions(customerId?: number) {
  const db = await requireDb();
  return db.select({ id: loyaltyTransactions.id, customerId: loyaltyTransactions.customerId, customerName: customers.name, saleId: loyaltyTransactions.saleId, type: loyaltyTransactions.type, points: loyaltyTransactions.points, creditAmount: loyaltyTransactions.creditAmount, description: loyaltyTransactions.description, createdAt: loyaltyTransactions.createdAt }).from(loyaltyTransactions).innerJoin(customers, eq(loyaltyTransactions.customerId, customers.id)).where(customerId ? eq(loyaltyTransactions.customerId, customerId) : undefined).orderBy(desc(loyaltyTransactions.createdAt)).limit(100);
}

export async function adjustCustomerLoyalty(input: { customerId: number; userId: number; points?: number; creditAmount?: number; description: string }) {
  const db = await requireDb();
  const [customer] = await db.select().from(customers).where(and(eq(customers.id, input.customerId), eq(customers.active, true))).limit(1);
  if (!customer) throw new Error("Cliente não encontrado.");
  const points = Math.trunc(input.points ?? 0);
  const creditAmount = Math.round((input.creditAmount ?? 0) * 100) / 100;
  if (customer.loyaltyMode === "points" && creditAmount !== 0) throw new Error("Este cliente utiliza a modalidade de pontos.");
  if (customer.loyaltyMode === "credit" && points !== 0) throw new Error("Este cliente utiliza a modalidade de crédito.");
  if (points === 0 && creditAmount === 0) throw new Error("Informe um ajuste de pontos ou crédito.");
  const nextPoints = customer.loyaltyPointsBalance + points;
  const nextCredit = Math.round((toNumber(customer.loyaltyCreditBalance) + creditAmount) * 100) / 100;
  if (nextPoints < 0 || nextCredit < 0) throw new Error("O ajuste não pode deixar o saldo de fidelidade negativo.");
  await db.transaction(async tx => {
    await tx.update(customers).set({ loyaltyPointsBalance: nextPoints, loyaltyCreditBalance: decimal(nextCredit) }).where(eq(customers.id, customer.id));
    await tx.insert(loyaltyTransactions).values({ customerId: customer.id, userId: input.userId, type: "adjustment", points, creditAmount: decimal(creditAmount), description: input.description.trim() });
  });
  return { success: true, pointsBalance: nextPoints, creditBalance: nextCredit } as const;
}

export async function listStockMovements() {
  const db = await requireDb();
  return db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      previousQuantity: stockMovements.previousQuantity,
      currentQuantity: stockMovements.currentQuantity,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
      productName: products.name,
      supplierName: suppliers.tradeName,
      batchCode: productBatches.code,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(suppliers, eq(stockMovements.supplierId, suppliers.id))
    .leftJoin(productBatches, eq(stockMovements.batchId, productBatches.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(100);
}

export async function recordStockMovement(input: {
  productId: number;
  supplierId?: number | null;
  userId: number;
  type: "entry" | "outbound" | "adjustment_in" | "adjustment_out" | "return";
  quantity: number;
  unitCost?: number;
  reason?: string;
}) {
  const db = await requireDb();
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.active) throw new Error("Produto não encontrado ou inativo.");
  const incoming = input.type === "entry" || input.type === "adjustment_in" || input.type === "return";
  const delta = incoming ? input.quantity : -input.quantity;
  const previousQuantity = toNumber(product.stockQuantity);
  const currentQuantity = applyStockMovement(previousQuantity, delta);

  await db.transaction(async tx => {
    const consumedBatches = !incoming ? await consumeProductBatches(tx, product.id, input.quantity) : [];
    const batchSummary = formatBatchConsumption(consumedBatches);
    await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3) }).where(eq(products.id, product.id));
    await tx.insert(stockMovements).values({
      productId: product.id,
      supplierId: input.supplierId ?? null,
      batchId: consumedBatches[0]?.id ?? null,
      userId: input.userId,
      type: input.type,
      quantity: decimal(delta, 3),
      unitCost: input.unitCost === undefined ? null : decimal(input.unitCost),
      previousQuantity: decimal(previousQuantity, 3),
      currentQuantity: decimal(currentQuantity, 3),
      reason: [input.reason, batchSummary].filter(Boolean).join(" · ") || null,
    });
  });
  return { success: true, currentQuantity };
}

export async function listProductBatches() {
  const db = await requireDb();
  return db
    .select({ id: productBatches.id, code: productBatches.code, expirationDate: productBatches.expirationDate, initialQuantity: productBatches.initialQuantity, availableQuantity: productBatches.availableQuantity, status: productBatches.status, createdAt: productBatches.createdAt, productId: products.id, productName: products.name, unit: products.unit, supplierName: suppliers.tradeName })
    .from(productBatches)
    .innerJoin(products, eq(productBatches.productId, products.id))
    .leftJoin(suppliers, eq(productBatches.supplierId, suppliers.id))
    .where(and(eq(productBatches.status, "active"), sql`${productBatches.availableQuantity} > 0`))
    .orderBy(productBatches.expirationDate, products.name)
    .limit(200);
}

export async function receiveProductBatch(input: { productId: number; supplierId?: number | null; userId: number; batchCode?: string; expirationDate?: string; quantity: number; unitCost?: number }) {
  const db = await requireDb();
  if (input.expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expirationDate)) throw new Error("A validade deve estar no formato AAAA-MM-DD.");
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.active) throw new Error("Produto não encontrado ou inativo.");
  const previousQuantity = toNumber(product.stockQuantity);
  const currentQuantity = applyStockMovement(previousQuantity, input.quantity);
  const batchCode = input.batchCode?.trim() || `L-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  await db.transaction(async tx => {
    await tx.insert(productBatches).values({ productId: product.id, supplierId: input.supplierId ?? null, code: batchCode, expirationDate: input.expirationDate || null, initialQuantity: decimal(input.quantity, 3), availableQuantity: decimal(input.quantity, 3) });
    const [batch] = await tx.select({ id: productBatches.id }).from(productBatches).where(and(eq(productBatches.productId, product.id), eq(productBatches.code, batchCode))).orderBy(desc(productBatches.id)).limit(1);
    if (!batch) throw new Error("Não foi possível registrar o lote recebido.");
    await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3), ...(input.unitCost === undefined ? {} : { costPrice: decimal(input.unitCost) }) }).where(eq(products.id, product.id));
    await tx.insert(stockMovements).values({ productId: product.id, supplierId: input.supplierId ?? null, batchId: batch.id, userId: input.userId, type: "entry", quantity: decimal(input.quantity, 3), unitCost: input.unitCost === undefined ? null : decimal(input.unitCost), previousQuantity: decimal(previousQuantity, 3), currentQuantity: decimal(currentQuantity, 3), reason: `Recebimento do lote ${batchCode}` });
  });
  return { success: true, currentQuantity, batchCode };
}

export async function listInventoryCounts() {
  const db = await requireDb();
  return db.select({ id: inventoryCounts.id, systemQuantity: inventoryCounts.systemQuantity, countedQuantity: inventoryCounts.countedQuantity, differenceQuantity: inventoryCounts.differenceQuantity, reason: inventoryCounts.reason, createdAt: inventoryCounts.createdAt, productName: products.name, unit: products.unit }).from(inventoryCounts).innerJoin(products, eq(inventoryCounts.productId, products.id)).orderBy(desc(inventoryCounts.createdAt)).limit(100);
}

export async function recordInventoryCount(input: { productId: number; userId: number; countedQuantity: number; reason?: string }) {
  const db = await requireDb();
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.active) throw new Error("Produto não encontrado ou inativo.");
  const systemQuantity = toNumber(product.stockQuantity);
  const differenceQuantity = Math.round((input.countedQuantity - systemQuantity) * 1000) / 1000;
  await db.transaction(async tx => {
    const consumedBatches = differenceQuantity < 0 ? await consumeProductBatches(tx, product.id, Math.abs(differenceQuantity)) : [];
    const batchSummary = formatBatchConsumption(consumedBatches) ? ` · ${formatBatchConsumption(consumedBatches)}` : "";
    await tx.update(products).set({ stockQuantity: decimal(input.countedQuantity, 3) }).where(eq(products.id, product.id));
    await tx.insert(inventoryCounts).values({ productId: product.id, userId: input.userId, systemQuantity: decimal(systemQuantity, 3), countedQuantity: decimal(input.countedQuantity, 3), differenceQuantity: decimal(differenceQuantity, 3), reason: input.reason || null });
    if (differenceQuantity !== 0) await tx.insert(stockMovements).values({ productId: product.id, batchId: consumedBatches[0]?.id ?? null, userId: input.userId, type: differenceQuantity > 0 ? "adjustment_in" : "adjustment_out", quantity: decimal(differenceQuantity, 3), previousQuantity: decimal(systemQuantity, 3), currentQuantity: decimal(input.countedQuantity, 3), reason: `Inventário${batchSummary}` });
  });
  return { success: true, differenceQuantity };
}

export async function listPriceHistories() {
  const db = await requireDb();
  return db.select({ id: priceHistories.id, previousSalePrice: priceHistories.previousSalePrice, newSalePrice: priceHistories.newSalePrice, reason: priceHistories.reason, createdAt: priceHistories.createdAt, productName: products.name }).from(priceHistories).innerJoin(products, eq(priceHistories.productId, products.id)).orderBy(desc(priceHistories.createdAt)).limit(100);
}

export async function listPromotions() {
  const db = await requireDb();
  return db.select({ id: promotions.id, productId: promotions.productId, name: promotions.name, promotionalPrice: promotions.promotionalPrice, startsOn: promotions.startsOn, endsOn: promotions.endsOn, active: promotions.active, productName: products.name, salePrice: products.salePrice }).from(promotions).innerJoin(products, eq(promotions.productId, products.id)).orderBy(desc(promotions.createdAt)).limit(100);
}

export async function listActivePromotions() {
  const db = await requireDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.select({ productId: promotions.productId, name: promotions.name, promotionalPrice: promotions.promotionalPrice }).from(promotions).where(and(eq(promotions.active, true), sql`${promotions.startsOn} <= ${today}`, sql`${promotions.endsOn} >= ${today}`));
}

export async function listWhatsappOrders() {
  const db = await requireDb();
  return db.select({ id: whatsappOrders.id, code: whatsappOrders.code, customerName: whatsappOrders.customerName, customerPhone: whatsappOrders.customerPhone, fulfillment: whatsappOrders.fulfillment, paymentMethod: whatsappOrders.paymentMethod, status: whatsappOrders.status, totalAmount: whatsappOrders.totalAmount, createdAt: whatsappOrders.createdAt }).from(whatsappOrders).orderBy(desc(whatsappOrders.createdAt)).limit(50);
}

export async function createWhatsappOrder(input: {
  userId: number;
  customerName: string;
  customerPhone?: string;
  fulfillment: "pickup" | "delivery";
  deliveryAddress?: string;
  paymentMethod: "cash" | "debit" | "credit" | "pix";
  notes?: string;
  items: Array<{ productId: number; quantity: number }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Inclua ao menos um produto no pedido.");
  if (input.fulfillment === "delivery" && !input.deliveryAddress?.trim()) throw new Error("Informe o endereço para entrega.");
  const quantitiesByProduct = new Map<number, number>();
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("A quantidade do pedido deve ser positiva.");
    quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
  }
  const normalizedItems = Array.from(quantitiesByProduct, ([productId, quantity]) => ({ productId, quantity }));
  const productIds = normalizedItems.map(item => item.productId);
  const productRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.active, true)));
  if (productRows.length !== productIds.length) throw new Error("Um ou mais produtos não estão disponíveis.");
  const productsById = new Map(productRows.map(product => [product.id, product]));
  const activePromotions = await listActivePromotions();
  const promotionsByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion]));
  const detailedItems = normalizedItems.map(item => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("Produto não encontrado.");
    if (item.quantity > toNumber(product.stockQuantity) + 0.0009) throw new Error(`Estoque insuficiente para ${product.name}.`);
    const promotion = promotionsByProductId.get(product.id);
    const unitPrice = promotion ? toNumber(promotion.promotionalPrice) : toNumber(product.salePrice);
    return { ...item, product, unitPrice, totalAmount: Math.round(item.quantity * unitPrice * 100) / 100 };
  });
  const totalAmount = Math.round(detailedItems.reduce((total, item) => total + item.totalAmount, 0) * 100) / 100;
  const code = `W-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  await db.transaction(async tx => {
    await tx.insert(whatsappOrders).values({ code, customerName: input.customerName.trim(), customerPhone: input.customerPhone?.trim() || null, fulfillment: input.fulfillment, deliveryAddress: input.fulfillment === "delivery" ? input.deliveryAddress?.trim() || null : null, paymentMethod: input.paymentMethod, notes: input.notes?.trim() || null, totalAmount: decimal(totalAmount), createdByUserId: input.userId });
    const [order] = await tx.select({ id: whatsappOrders.id }).from(whatsappOrders).where(eq(whatsappOrders.code, code)).limit(1);
    if (!order) throw new Error("Não foi possível registrar o pedido.");
    await tx.insert(whatsappOrderItems).values(detailedItems.map(item => ({ whatsappOrderId: order.id, productId: item.product.id, productName: item.product.name, quantity: decimal(item.quantity, 3), unit: item.product.unit, unitPrice: decimal(item.unitPrice), totalAmount: decimal(item.totalAmount) })));
  });
  return { success: true, code, totalAmount, fulfillment: input.fulfillment, paymentMethod: input.paymentMethod, customerName: input.customerName.trim(), customerPhone: input.customerPhone?.trim() || "", deliveryAddress: input.fulfillment === "delivery" ? input.deliveryAddress?.trim() || "" : "", notes: input.notes?.trim() || "", items: detailedItems.map(item => ({ name: item.product.name, quantity: item.quantity, unit: item.product.unit, unitPrice: item.unitPrice, totalAmount: item.totalAmount })) } as const;
}

export async function markWhatsappOrderSent(orderCode: string) {
  const db = await requireDb();
  await db.update(whatsappOrders).set({ status: "sent" }).where(eq(whatsappOrders.code, orderCode));
  return { success: true } as const;
}

export async function createPromotion(input: { productId: number; name: string; promotionalPrice: number; startsOn: string; endsOn: string }) {
  const db = await requireDb();
  if (input.endsOn < input.startsOn) throw new Error("A data final da promoção deve ser posterior à inicial.");
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.active) throw new Error("Produto não encontrado ou inativo.");
  if (input.promotionalPrice > toNumber(product.salePrice)) throw new Error("O preço promocional não pode ser maior que o preço regular.");
  await db.insert(promotions).values({ ...input, name: input.name.trim(), promotionalPrice: decimal(input.promotionalPrice) });
  return { success: true } as const;
}

export async function registerStockLoss(input: { productId: number; batchId?: number | null; userId: number; quantity: number; reason: string }) {
  const db = await requireDb();
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.active) throw new Error("Produto não encontrado ou inativo.");
  const previousQuantity = toNumber(product.stockQuantity);
  const currentQuantity = applyStockMovement(previousQuantity, -input.quantity);
  await db.transaction(async tx => {
    let consumedBatches: Array<{ id: number; code: string | null; quantity: number }> = [];
    if (input.batchId) {
      const [batch] = await tx.select().from(productBatches).where(and(eq(productBatches.id, input.batchId), eq(productBatches.productId, product.id))).limit(1);
      if (!batch || batch.status !== "active") throw new Error("Lote não encontrado ou indisponível.");
      const remainingQuantity = applyStockMovement(toNumber(batch.availableQuantity), -input.quantity);
      await tx.update(productBatches).set({ availableQuantity: decimal(remainingQuantity, 3), status: remainingQuantity === 0 ? "discarded" : "active" }).where(eq(productBatches.id, batch.id));
      consumedBatches = [{ id: batch.id, code: batch.code, quantity: input.quantity }];
    } else {
      consumedBatches = await consumeProductBatches(tx, product.id, input.quantity);
    }
    await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3) }).where(eq(products.id, product.id));
    await tx.insert(stockMovements).values({ productId: product.id, batchId: consumedBatches[0]?.id ?? null, userId: input.userId, type: "loss", quantity: decimal(-input.quantity, 3), previousQuantity: decimal(previousQuantity, 3), currentQuantity: decimal(currentQuantity, 3), reason: [input.reason.trim(), formatBatchConsumption(consumedBatches)].filter(Boolean).join(" · ") });
  });
  return { success: true, currentQuantity };
}

export async function createPurchase(input: {
  userId: number;
  supplierId: number;
  notes?: string;
  items: Array<{ productId: number; quantity: number; unitCost: number; batchCode?: string; expirationDate?: string }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Inclua ao menos um produto na compra.");
  if (input.items.some(item => item.expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.expirationDate))) throw new Error("A validade deve estar no formato AAAA-MM-DD.");
  const productIds = Array.from(new Set(input.items.map(item => item.productId)));
  const productRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.active, true)));
  if (productRows.length !== productIds.length) throw new Error("Um ou mais produtos da compra não estão disponíveis.");
  const productsById = new Map(productRows.map(product => [product.id, product]));
  const totalAmount = input.items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
  const purchaseCode = `C-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  await db.transaction(async tx => {
    await tx.insert(purchases).values({ code: purchaseCode, supplierId: input.supplierId, receivedByUserId: input.userId, totalAmount: decimal(totalAmount), notes: input.notes || null });
    const [purchase] = await tx.select({ id: purchases.id }).from(purchases).where(eq(purchases.code, purchaseCode)).limit(1);
    if (!purchase) throw new Error("Não foi possível registrar a compra.");
    for (const item of input.items) {
      const product = productsById.get(item.productId);
      if (!product) throw new Error("Produto não encontrado.");
      const previousQuantity = toNumber(product.stockQuantity);
      const currentQuantity = applyStockMovement(previousQuantity, item.quantity);
      let batchId: number | null = null;
      const shouldTrackBatch = Boolean(item.batchCode?.trim() || item.expirationDate);
      if (shouldTrackBatch) {
        const batchCode = item.batchCode?.trim() || `L-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        await tx.insert(productBatches).values({ productId: product.id, purchaseId: purchase.id, supplierId: input.supplierId, code: batchCode, expirationDate: item.expirationDate || null, initialQuantity: decimal(item.quantity, 3), availableQuantity: decimal(item.quantity, 3) });
        const [batch] = await tx.select({ id: productBatches.id }).from(productBatches).where(and(eq(productBatches.productId, product.id), eq(productBatches.code, batchCode))).orderBy(desc(productBatches.id)).limit(1);
        if (!batch) throw new Error("Não foi possível registrar o lote recebido.");
        batchId = batch.id;
      }
      await tx.insert(purchaseItems).values({ purchaseId: purchase.id, productId: product.id, productName: product.name, quantity: decimal(item.quantity, 3), unitCost: decimal(item.unitCost), totalAmount: decimal(item.quantity * item.unitCost) });
      await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3), costPrice: decimal(item.unitCost) }).where(eq(products.id, product.id));
      await tx.insert(stockMovements).values({ productId: product.id, supplierId: input.supplierId, purchaseId: purchase.id, batchId, userId: input.userId, type: "entry", quantity: decimal(item.quantity, 3), unitCost: decimal(item.unitCost), previousQuantity: decimal(previousQuantity, 3), currentQuantity: decimal(currentQuantity, 3), reason: `Compra ${purchaseCode}${shouldTrackBatch ? ` · Lote ${item.batchCode?.trim() || "gerado"}` : ""}` });
    }
  });
  return { success: true, code: purchaseCode, totalAmount: Math.round(totalAmount * 100) / 100 };
}

export async function getOpenCashSession() {
  const db = await requireDb();
  const [session] = await db.select().from(cashSessions).where(eq(cashSessions.status, "open")).orderBy(desc(cashSessions.openedAt)).limit(1);
  if (!session) return null;
  const movements = await db.select({ type: cashMovements.type, amount: cashMovements.amount, paymentMethod: cashMovements.paymentMethod }).from(cashMovements).where(eq(cashMovements.cashSessionId, session.id));
  return { ...session, expectedBalance: calculateCashBalance(toNumber(session.openingAmount), movements.map(item => ({ type: item.type, amount: toNumber(item.amount), paymentMethod: item.paymentMethod }))) };
}

export async function openCashSession(input: { userId: number; openingAmount: number; notes?: string }) {
  const db = await requireDb();
  const existing = await getOpenCashSession();
  if (existing) throw new Error("Já existe um caixa aberto.");
  await db.insert(cashSessions).values({ openedByUserId: input.userId, openingAmount: decimal(input.openingAmount), notes: input.notes || null });
  return { success: true } as const;
}

export async function recordCashMovement(input: {
  userId: number;
  type: "supply" | "withdrawal" | "adjustment";
  amount: number;
  description?: string;
}) {
  const db = await requireDb();
  const session = await getOpenCashSession();
  if (!session) throw new Error("Abra o caixa antes de registrar uma movimentação.");
  await db.insert(cashMovements).values({
    cashSessionId: session.id,
    userId: input.userId,
    type: input.type,
    amount: decimal(input.amount),
    description: input.description || null,
  });
  return { success: true } as const;
}

export async function closeCashSession(input: { userId: number; actualClosingAmount: number; notes?: string }) {
  const db = await requireDb();
  const session = await getOpenCashSession();
  if (!session) throw new Error("Não existe caixa aberto para fechar.");
  const difference = Math.round((input.actualClosingAmount - session.expectedBalance) * 100) / 100;
  await db
    .update(cashSessions)
    .set({
      status: "closed",
      closedByUserId: input.userId,
      closedAt: new Date(),
      expectedClosingAmount: decimal(session.expectedBalance),
      actualClosingAmount: decimal(input.actualClosingAmount),
      differenceAmount: decimal(difference),
      notes: input.notes || session.notes,
    })
    .where(eq(cashSessions.id, session.id));
  return { success: true, expectedBalance: session.expectedBalance, difference };
}

export async function listCashMovements() {
  const db = await requireDb();
  const session = await getOpenCashSession();
  if (!session) return { session: null, movements: [] };
  const movements = await db.select().from(cashMovements).where(eq(cashMovements.cashSessionId, session.id)).orderBy(desc(cashMovements.createdAt));
  return { session, movements };
}

export async function createSale(input: {
  userId: number;
  customerId?: number | null;
  discountAmount: number;
  loyaltyRedemption?: { points?: number; creditAmount?: number };
  notes?: string;
  items: Array<{ productId: number; quantity: number }>;
  payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Adicione ao menos um item para concluir a venda.");
  const cash = await getOpenCashSession();
  if (!cash) throw new Error("Abra o caixa antes de finalizar uma venda.");
  const normalizedItems = Array.from(
    input.items.reduce((itemsByProduct, item) => {
      itemsByProduct.set(item.productId, (itemsByProduct.get(item.productId) ?? 0) + item.quantity);
      return itemsByProduct;
    }, new Map<number, number>()),
    ([productId, quantity]) => ({ productId, quantity }),
  );
  const productIds = normalizedItems.map(item => item.productId);
  const productRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.active, true)));
  if (productRows.length !== productIds.length) throw new Error("Um ou mais produtos não estão disponíveis.");
  const productsById = new Map(productRows.map(product => [product.id, product]));
  const activePromotions = await listActivePromotions();
  const promotionsByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion]));
  const detailedItems = normalizedItems.map(item => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("Produto não encontrado.");
    const promotion = promotionsByProductId.get(product.id);
    return { ...item, product, unitPrice: promotion ? toNumber(promotion.promotionalPrice) : toNumber(product.salePrice), costPrice: toNumber(product.costPrice) };
  });
  const [customer] = input.customerId ? await db.select().from(customers).where(and(eq(customers.id, input.customerId), eq(customers.active, true))).limit(1) : [null];
  if (input.customerId && !customer) throw new Error("Cliente não encontrado ou inativo.");
  const requestedPoints = Math.max(0, Math.trunc(input.loyaltyRedemption?.points ?? 0));
  const requestedCredit = Math.max(0, Math.round((input.loyaltyRedemption?.creditAmount ?? 0) * 100) / 100);
  if (customer?.loyaltyMode === "points" && requestedCredit > 0) throw new Error("Este cliente utiliza a modalidade de pontos.");
  if (customer?.loyaltyMode === "credit" && requestedPoints > 0) throw new Error("Este cliente utiliza a modalidade de crédito.");
  if (!customer && (requestedPoints > 0 || requestedCredit > 0)) throw new Error("Selecione um cliente para usar fidelidade.");
  const subtotalBeforeLoyalty = calculateSaleTotals(detailedItems, input.discountAmount).totalAmount;
  const loyaltyBenefit = customer ? calculateLoyaltyRedemption(customer.loyaltyMode, customer.loyaltyMode === "points" ? customer.loyaltyPointsBalance : toNumber(customer.loyaltyCreditBalance), customer.loyaltyMode === "points" ? requestedPoints : requestedCredit, subtotalBeforeLoyalty) : { points: 0, creditAmount: 0, discountAmount: 0 };
  const totals = calculateSaleTotals(detailedItems, input.discountAmount + loyaltyBenefit.discountAmount);
  const paymentsTotal = Math.round(input.payments.reduce((total, payment) => total + payment.amount, 0) * 100) / 100;
  if (!input.payments.length || Math.abs(paymentsTotal - totals.totalAmount) > 0.009) {
    throw new Error("O total dos pagamentos deve ser igual ao total da venda.");
  }

  const saleCode = `V-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  await db.transaction(async tx => {
    for (const item of detailedItems) {
      const available = toNumber(item.product.stockQuantity);
      applyStockMovement(available, -item.quantity);
    }
    await tx.insert(sales).values({
      code: saleCode,
      customerId: input.customerId ?? null,
      cashSessionId: cash.id,
      operatorUserId: input.userId,
      subtotal: decimal(totals.subtotal),
      discountAmount: decimal(totals.discountAmount),
      totalAmount: decimal(totals.totalAmount),
      notes: input.notes || null,
    });
    const [sale] = await tx.select({ id: sales.id }).from(sales).where(eq(sales.code, saleCode)).limit(1);
    if (!sale) throw new Error("Não foi possível registrar a venda.");
    if (customer) {
      const earnedPoints = customer.loyaltyMode === "points" ? Math.floor(totals.totalAmount) : 0;
      const earnedCredit = customer.loyaltyMode === "credit" ? Math.floor(totals.totalAmount) / 100 : 0;
      const nextPoints = customer.loyaltyPointsBalance - loyaltyBenefit.points + earnedPoints;
      const nextCredit = Math.round((toNumber(customer.loyaltyCreditBalance) - loyaltyBenefit.creditAmount + earnedCredit) * 100) / 100;
      await tx.update(customers).set({ loyaltyPointsBalance: nextPoints, loyaltyCreditBalance: decimal(nextCredit) }).where(eq(customers.id, customer.id));
      if (loyaltyBenefit.points > 0 || loyaltyBenefit.creditAmount > 0) {
        await tx.insert(loyaltyTransactions).values({ customerId: customer.id, saleId: sale.id, userId: input.userId, type: "redeem", points: -loyaltyBenefit.points, creditAmount: decimal(-loyaltyBenefit.creditAmount), description: `Uso de fidelidade na venda ${saleCode}` });
      }
      if (earnedPoints > 0 || earnedCredit > 0) {
        await tx.insert(loyaltyTransactions).values({ customerId: customer.id, saleId: sale.id, userId: input.userId, type: "earn", points: earnedPoints, creditAmount: decimal(earnedCredit), description: `Acúmulo de fidelidade na venda ${saleCode}` });
      }
    }
    await tx.insert(saleItems).values(detailedItems.map(item => ({
      saleId: sale.id,
      productId: item.product.id,
      productName: item.product.name,
      quantity: decimal(item.quantity, 3),
      unitPrice: decimal(item.unitPrice),
      costPrice: decimal(item.costPrice),
      totalAmount: decimal(Math.round(item.quantity * item.unitPrice * 100) / 100),
    })));
    const recordedItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    const saleItemsByProductId = new Map(recordedItems.map(item => [item.productId, item]));
    await tx.insert(salePayments).values(input.payments.map(payment => ({
      saleId: sale.id,
      method: payment.method,
      amount: decimal(payment.amount),
      reference: payment.reference || null,
    })));
    await tx.insert(cashMovements).values(input.payments.map(payment => ({
      cashSessionId: cash.id,
      saleId: sale.id,
      userId: input.userId,
      type: "sale" as const,
      paymentMethod: payment.method,
      amount: decimal(payment.amount),
      description: `Venda ${saleCode}`,
    })));
    for (const item of detailedItems) {
      const previousQuantity = toNumber(item.product.stockQuantity);
      const currentQuantity = applyStockMovement(previousQuantity, -item.quantity);
      const consumedBatches = await consumeProductBatches(tx, item.product.id, item.quantity);
      const recordedItem = saleItemsByProductId.get(item.product.id);
      if (!recordedItem) throw new Error("Não foi possível vincular o item aos lotes consumidos.");
      if (consumedBatches.length) {
        await tx.insert(saleItemBatchAllocations).values(consumedBatches.map(batch => ({ saleItemId: recordedItem.id, batchId: batch.id, quantity: decimal(batch.quantity, 3) })));
      }
      const batchSummary = formatBatchConsumption(consumedBatches) ? ` · ${formatBatchConsumption(consumedBatches)}` : "";
      await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3) }).where(eq(products.id, item.product.id));
      await tx.insert(stockMovements).values({
        productId: item.product.id,
        saleId: sale.id,
        batchId: consumedBatches[0]?.id ?? null,
        userId: input.userId,
        type: "sale",
        quantity: decimal(-item.quantity, 3),
        previousQuantity: decimal(previousQuantity, 3),
        currentQuantity: decimal(currentQuantity, 3),
        reason: `Venda ${saleCode}${batchSummary}`,
      });
    }
  });
  return { success: true, code: saleCode, totalAmount: totals.totalAmount };
}

export async function listRecentSales() {
  const db = await requireDb();
  return db.select().from(sales).orderBy(desc(sales.createdAt)).limit(100);
}

export async function cancelSale(saleId: number, userId: number, reason: string) {
  const db = await requireDb();
  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!sale || sale.status !== "completed") throw new Error("Venda não está disponível para cancelamento.");
  const openCashSession = await getOpenCashSession();
  if (sale.cashSessionId && (!openCashSession || openCashSession.id !== sale.cashSessionId)) {
    throw new Error("Esta venda pertence a um caixa já fechado. Use o fluxo de devolução para registrar o reembolso no caixa atual.");
  }
  const [existingReturn] = await db.select({ id: saleReturns.id }).from(saleReturns).where(eq(saleReturns.saleId, saleId)).limit(1);
  if (existingReturn) throw new Error("Esta venda já possui devolução registrada. Conclua os retornos pelo histórico de devoluções.");
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, saleId));
  await requireBatchRestorationTrace(db, saleId, items);

  await db.transaction(async tx => {
    await tx.update(sales).set({ status: "cancelled", cancelledAt: new Date(), notes: `${sale.notes || ""}\nCancelada: ${reason}`.trim() }).where(eq(sales.id, saleId));
    await reverseSaleLoyalty(tx, sale, userId, toNumber(sale.totalAmount), `Estorno de fidelidade no cancelamento ${sale.code}`);
    for (const item of items) {
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product) throw new Error("O produto de uma venda cancelada não foi encontrado.");
      const previousQuantity = toNumber(product.stockQuantity);
      const currentQuantity = applyStockMovement(previousQuantity, toNumber(item.quantity));
      const allocations = await tx.select({ batchId: saleItemBatchAllocations.batchId, quantity: saleItemBatchAllocations.quantity }).from(saleItemBatchAllocations).where(eq(saleItemBatchAllocations.saleItemId, item.id));
      const restoredBatches: Array<{ id: number; code: string | null; quantity: number }> = [];
      for (const allocation of allocations) {
        const restored = await restoreBatchAllocation(tx, allocation.batchId, toNumber(allocation.quantity));
        restoredBatches.push({ id: allocation.batchId, code: restored.code, quantity: toNumber(allocation.quantity) });
      }
      await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3) }).where(eq(products.id, product.id));
      await tx.insert(stockMovements).values({
        productId: product.id,
        saleId,
        batchId: restoredBatches[0]?.id ?? null,
        userId,
        type: "cancellation",
        quantity: decimal(toNumber(item.quantity), 3),
        previousQuantity: decimal(previousQuantity, 3),
        currentQuantity: decimal(currentQuantity, 3),
        reason: [`Cancelamento ${sale.code}: ${reason}`, formatBatchConsumption(restoredBatches)].filter(Boolean).join(" · "),
      });
    }
    if (sale.cashSessionId && payments.length) {
      await tx.insert(cashMovements).values(payments.map(payment => ({
        cashSessionId: sale.cashSessionId!,
        saleId,
        userId,
        type: "cancellation" as const,
        paymentMethod: payment.method,
        amount: decimal(toNumber(payment.amount)),
        description: `Cancelamento ${sale.code}: ${reason}`,
      })));
    }
  });
  return { success: true } as const;
}

export async function listSaleItemsForReturn(saleId: number) {
  const db = await requireDb();
  return db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: saleItems.productName,
      quantity: saleItems.quantity,
      totalAmount: saleItems.totalAmount,
      returnedQuantity: sql<string>`coalesce(sum(${saleReturnItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .leftJoin(saleReturnItems, eq(saleReturnItems.saleItemId, saleItems.id))
    .where(and(eq(saleItems.saleId, saleId), eq(sales.status, "completed")))
    .groupBy(saleItems.id, saleItems.productId, saleItems.productName, saleItems.quantity, saleItems.totalAmount);
}

export async function createSaleReturn(input: {
  saleId: number;
  userId: number;
  reason: string;
  refundMethod: PaymentMethod;
  items: Array<{ saleItemId: number; quantity: number }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Selecione ao menos um item para devolver.");
  const [sale] = await db.select().from(sales).where(eq(sales.id, input.saleId)).limit(1);
  if (!sale || sale.status !== "completed") throw new Error("A venda não está disponível para devolução.");
  const cashSession = await getOpenCashSession();
  if (!cashSession) throw new Error("Abra o caixa antes de registrar uma devolução.");
  const requestedItems = Array.from(input.items.reduce((itemsBySaleItem, item) => {
    itemsBySaleItem.set(item.saleItemId, (itemsBySaleItem.get(item.saleItemId) ?? 0) + item.quantity);
    return itemsBySaleItem;
  }, new Map<number, number>()), ([saleItemId, quantity]) => ({ saleItemId, quantity }));
  if (requestedItems.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0)) throw new Error("A quantidade devolvida deve ser positiva.");
  const saleItemIds = requestedItems.map(item => item.saleItemId);
  const originalItems = await db.select().from(saleItems).where(and(eq(saleItems.saleId, sale.id), inArray(saleItems.id, saleItemIds)));
  if (originalItems.length !== saleItemIds.length) throw new Error("Um ou mais itens não pertencem à venda selecionada.");
  await requireBatchRestorationTrace(db, sale.id, originalItems);
  const previouslyReturned = await db.select({ saleItemId: saleReturnItems.saleItemId, quantity: saleReturnItems.quantity }).from(saleReturnItems).where(inArray(saleReturnItems.saleItemId, saleItemIds));
  const [previousReturnAmount] = await db.select({ amount: sql<string>`coalesce(sum(${saleReturns.totalAmount}), 0)` }).from(saleReturns).where(eq(saleReturns.saleId, sale.id));
  const returnedBySaleItemId = new Map<number, number>();
  for (const item of previouslyReturned) returnedBySaleItemId.set(item.saleItemId, (returnedBySaleItemId.get(item.saleItemId) ?? 0) + toNumber(item.quantity));
  const requestedBySaleItemId = new Map(requestedItems.map(item => [item.saleItemId, item.quantity]));
  const saleItemsById = new Map(originalItems.map(item => [item.id, item]));
  const discountFactor = toNumber(sale.subtotal) > 0 ? toNumber(sale.totalAmount) / toNumber(sale.subtotal) : 0;
  const returnDetails = requestedItems.map(requested => {
    const original = saleItemsById.get(requested.saleItemId);
    if (!original) throw new Error("Item de venda não encontrado.");
    const originalQuantity = toNumber(original.quantity);
    const returnedQuantity = returnedBySaleItemId.get(original.id) ?? 0;
    if (requested.quantity + returnedQuantity > originalQuantity + 0.0009) throw new Error(`A quantidade devolvida de ${original.productName} excede o saldo vendido.`);
    const lineAmount = Math.round((toNumber(original.totalAmount) * (requested.quantity / originalQuantity) * discountFactor) * 100) / 100;
    return { ...requested, original, returnedQuantity, amount: lineAmount };
  });
  const totalAmount = Math.round(returnDetails.reduce((total, item) => total + item.amount, 0) * 100) / 100;
  if (totalAmount <= 0) throw new Error("O valor calculado para a devolução é inválido.");
  const returnCode = `D-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  await db.transaction(async tx => {
    await tx.insert(saleReturns).values({ code: returnCode, saleId: sale.id, cashSessionId: cashSession.id, userId: input.userId, totalAmount: decimal(totalAmount), refundMethod: input.refundMethod, reason: input.reason.trim() });
    const [saleReturn] = await tx.select({ id: saleReturns.id }).from(saleReturns).where(eq(saleReturns.code, returnCode)).limit(1);
    if (!saleReturn) throw new Error("Não foi possível registrar a devolução.");
    await reverseSaleLoyalty(tx, sale, input.userId, toNumber(previousReturnAmount?.amount) + totalAmount, `Estorno proporcional de fidelidade na devolução ${returnCode}`);
    for (const detail of returnDetails) {
      const [product] = await tx.select().from(products).where(eq(products.id, detail.original.productId)).limit(1);
      if (!product) throw new Error("O produto da devolução não foi encontrado.");
      const allocations = await tx.select({ batchId: saleItemBatchAllocations.batchId, quantity: saleItemBatchAllocations.quantity }).from(saleItemBatchAllocations).where(eq(saleItemBatchAllocations.saleItemId, detail.original.id));
      const batchesToRestore = allocations.length ? sliceBatchAllocation(allocations, detail.returnedQuantity, detail.quantity) : [];
      const restoredBatches: Array<{ id: number; code: string | null; quantity: number }> = [];
      for (const allocation of batchesToRestore) {
        const restored = await restoreBatchAllocation(tx, allocation.batchId, allocation.quantity);
        restoredBatches.push({ id: allocation.batchId, code: restored.code, quantity: allocation.quantity });
      }
      const previousQuantity = toNumber(product.stockQuantity);
      const currentQuantity = applyStockMovement(previousQuantity, detail.quantity);
      await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3) }).where(eq(products.id, product.id));
      await tx.insert(saleReturnItems).values({ saleReturnId: saleReturn.id, saleItemId: detail.original.id, productId: product.id, quantity: decimal(detail.quantity, 3), amount: decimal(detail.amount) });
      await tx.insert(stockMovements).values({ productId: product.id, saleId: sale.id, batchId: restoredBatches[0]?.id ?? null, userId: input.userId, type: "return", quantity: decimal(detail.quantity, 3), previousQuantity: decimal(previousQuantity, 3), currentQuantity: decimal(currentQuantity, 3), reason: [`Devolução ${returnCode}: ${input.reason.trim()}`, formatBatchConsumption(restoredBatches)].filter(Boolean).join(" · ") });
    }
    await tx.insert(cashMovements).values({ cashSessionId: cashSession.id, saleId: sale.id, userId: input.userId, type: "return", paymentMethod: input.refundMethod, amount: decimal(totalAmount), description: `Devolução ${returnCode}: ${input.reason.trim()}` });
  });
  return { success: true, code: returnCode, totalAmount } as const;
}

export async function getReportsOverview() {
  const db = await requireDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const [salesToday] = await db.select({ total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`, count: sql<number>`count(${sales.id})` }).from(sales).where(and(eq(sales.status, "completed"), gte(sales.createdAt, start)));
  const topProducts = await db
    .select({ productName: saleItems.productName, quantity: sql<string>`coalesce(sum(${saleItems.quantity}), 0)`, revenue: sql<string>`coalesce(sum(${saleItems.totalAmount}), 0)` })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(sales.status, "completed"))
    .groupBy(saleItems.productName)
    .orderBy(desc(sql`sum(${saleItems.quantity})`))
    .limit(10);
  const lowStockItems = await db
    .select({ id: products.id, name: products.name, stockQuantity: products.stockQuantity, minimumStock: products.minimumStock, unit: products.unit })
    .from(products)
    .where(and(eq(products.active, true), sql`${products.minimumStock} > 0`, sql`${products.stockQuantity} <= ${products.minimumStock}`))
    .orderBy(products.stockQuantity)
    .limit(10);
  const latestCashMovements = await db
    .select({ id: cashMovements.id, type: cashMovements.type, amount: cashMovements.amount, paymentMethod: cashMovements.paymentMethod, description: cashMovements.description, createdAt: cashMovements.createdAt })
    .from(cashMovements)
    .orderBy(desc(cashMovements.createdAt))
    .limit(10);
  const [losses] = await db.select({ quantity: sql<string>`coalesce(sum(abs(${stockMovements.quantity})), 0)`, count: sql<number>`count(${stockMovements.id})` }).from(stockMovements).where(eq(stockMovements.type, "loss"));
  const expiringBatches = await db.select({ id: productBatches.id, productName: products.name, code: productBatches.code, expirationDate: productBatches.expirationDate, availableQuantity: productBatches.availableQuantity, unit: products.unit }).from(productBatches).innerJoin(products, eq(productBatches.productId, products.id)).where(and(eq(productBatches.status, "active"), sql`${productBatches.expirationDate} is not null`, sql`${productBatches.expirationDate} <= ${nextWeek}`)).orderBy(productBatches.expirationDate).limit(10);
  const [inventorySummary] = await db.select({ count: sql<number>`count(${inventoryCounts.id})`, divergence: sql<string>`coalesce(sum(abs(${inventoryCounts.differenceQuantity})), 0)` }).from(inventoryCounts);
  const [marginSummary] = await db.select({ margin: sql<string>`coalesce(sum(${saleItems.totalAmount} - (${saleItems.costPrice} * ${saleItems.quantity})), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(sales.status, "completed"), gte(sales.createdAt, start)));
  const marginByProduct = await db.select({ productName: saleItems.productName, revenue: sql<string>`coalesce(sum(${saleItems.totalAmount}), 0)`, margin: sql<string>`coalesce(sum(${saleItems.totalAmount} - (${saleItems.costPrice} * ${saleItems.quantity})), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(sales.status, "completed"), gte(sales.createdAt, start))).groupBy(saleItems.productName).orderBy(desc(sql`sum(${saleItems.totalAmount} - (${saleItems.costPrice} * ${saleItems.quantity}))`)).limit(10);
  const categoryPerformance = await db.select({ categoryName: sql<string>`coalesce(${categories.name}, 'Sem categoria')`, revenue: sql<string>`coalesce(sum(${saleItems.totalAmount}), 0)`, quantity: sql<string>`coalesce(sum(${saleItems.quantity}), 0)`, margin: sql<string>`coalesce(sum(${saleItems.totalAmount} - (${saleItems.costPrice} * ${saleItems.quantity})), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(sales.status, "completed"), gte(sales.createdAt, start))).groupBy(categories.id, categories.name).orderBy(desc(sql`sum(${saleItems.totalAmount})`)).limit(12);
  return { salesTodayAmount: toNumber(salesToday?.total), salesTodayCount: Number(salesToday?.count ?? 0), topProducts, lowStockItems, latestCashMovements, lossCount: Number(losses?.count ?? 0), lossQuantity: toNumber(losses?.quantity), expiringBatches, inventoryCount: Number(inventorySummary?.count ?? 0), inventoryDivergence: toNumber(inventorySummary?.divergence), grossMarginToday: toNumber(marginSummary?.margin), marginByProduct, categoryPerformance, reportDate: today };
}

export async function listRecentActivity() {
  const db = await requireDb();
  const [recentSales, recentStock, recentCash] = await Promise.all([
    db.select({ id: sales.id, code: sales.code, totalAmount: sales.totalAmount, createdAt: sales.createdAt }).from(sales).orderBy(desc(sales.createdAt)).limit(5),
    db.select({ id: stockMovements.id, type: stockMovements.type, quantity: stockMovements.quantity, productName: products.name, createdAt: stockMovements.createdAt }).from(stockMovements).innerJoin(products, eq(stockMovements.productId, products.id)).orderBy(desc(stockMovements.createdAt)).limit(5),
    db.select({ id: cashMovements.id, type: cashMovements.type, amount: cashMovements.amount, createdAt: cashMovements.createdAt }).from(cashMovements).orderBy(desc(cashMovements.createdAt)).limit(5),
  ]);
  return [
    ...recentSales.map(item => ({ id: `sale-${item.id}`, kind: "sale" as const, title: `Venda ${item.code}`, detail: decimal(toNumber(item.totalAmount)), createdAt: item.createdAt })),
    ...recentStock.map(item => ({ id: `stock-${item.id}`, kind: "stock" as const, title: item.productName, detail: `${item.type} · ${decimal(toNumber(item.quantity), 3)}`, createdAt: item.createdAt })),
    ...recentCash.map(item => ({ id: `cash-${item.id}`, kind: "cash" as const, title: item.type === "withdrawal" ? "Sangria de caixa" : item.type === "supply" ? "Suprimento de caixa" : "Movimentação de caixa", detail: decimal(toNumber(item.amount)), createdAt: item.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);
}

export async function listUsers() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "admin" | "manager" | "operator" | "stockist") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return { success: true } as const;
}

export async function listAccountsPayable() {
  const db = await requireDb();
  const today = new Date().toISOString().slice(0, 10);
  await db.update(accountsPayable).set({ status: "overdue" }).where(and(eq(accountsPayable.status, "open"), sql`${accountsPayable.dueDate} < ${today}`));
  const accounts = await db.select({ id: accountsPayable.id, description: accountsPayable.description, dueDate: accountsPayable.dueDate, amount: accountsPayable.amount, paidAmount: accountsPayable.paidAmount, status: accountsPayable.status, supplierName: suppliers.legalName }).from(accountsPayable).leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id)).orderBy(accountsPayable.dueDate).limit(100);
  return accounts.map(account => ({ ...account, status: resolveAccountPayableStatus(account.status, account.dueDate, today) }));
}

export async function createAccountPayable(input: { supplierId?: number | null; description: string; dueDate: string; amount: number; notes?: string }) {
  const db = await requireDb();
  await db.insert(accountsPayable).values({ supplierId: input.supplierId ?? null, description: input.description.trim(), dueDate: input.dueDate, amount: decimal(input.amount), notes: input.notes || null });
  return { success: true } as const;
}

export async function payAccountPayable(id: number) {
  const db = await requireDb();
  const [account] = await db.select().from(accountsPayable).where(eq(accountsPayable.id, id)).limit(1);
  if (!account || account.status === "paid" || account.status === "cancelled") throw new Error("Conta indisponível para baixa.");
  await db.update(accountsPayable).set({ status: "paid", paidAmount: account.amount, paidAt: new Date() }).where(eq(accountsPayable.id, id));
  return { success: true } as const;
}

export async function listSalesGoals() {
  const db = await requireDb();
  const goals = await db.select().from(salesGoals).orderBy(desc(salesGoals.createdAt));
  return Promise.all(goals.map(async goal => {
    const startDate = new Date(`${goal.startsOn}T00:00:00.000Z`);
    const endDate = new Date(`${goal.endsOn}T23:59:59.999Z`);
    const [progress] = await db.select({ amount: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`, salesCount: sql<number>`count(${sales.id})` }).from(sales).where(and(eq(sales.status, "completed"), gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)));
    const targetAmount = toNumber(goal.targetAmount);
    const currentAmount = toNumber(progress?.amount);
    return { ...goal, currentAmount, salesCount: Number(progress?.salesCount ?? 0), progressPercent: targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10) : 0 };
  }));
}

export async function createSalesGoal(input: { name: string; startsOn: string; endsOn: string; targetAmount: number }) {
  if (input.endsOn < input.startsOn) throw new Error("A data final da meta deve ser igual ou posterior à data inicial.");
  const db = await requireDb();
  await db.insert(salesGoals).values({ ...input, targetAmount: decimal(input.targetAmount) });
  return { success: true } as const;
}
export async function listLoyaltyBalances() {
  const db = await requireDb();
  return db.select({ customerId: customers.id, name: customers.name, loyaltyMode: customers.loyaltyMode, pointsBalance: customers.loyaltyPointsBalance, creditBalance: customers.loyaltyCreditBalance }).from(customers).where(eq(customers.active, true)).orderBy(customers.name).limit(100);
}

export async function getGoogleDriveBackupConnection(userId: number) {
  const db = await requireDb();
  const [connection] = await db
    .select()
    .from(googleDriveBackupConnections)
    .where(eq(googleDriveBackupConnections.userId, userId))
    .limit(1);
  return connection ?? null;
}

export async function upsertGoogleDriveBackupConnection(input: {
  userId: number;
  encryptedRefreshToken: string;
  googleEmail?: string | null;
  folderId?: string | null;
  folderName?: string;
}) {
  const db = await requireDb();
  const existing = await getGoogleDriveBackupConnection(input.userId);
  const payload = {
    encryptedRefreshToken: input.encryptedRefreshToken,
    googleEmail: input.googleEmail ?? null,
    folderId: input.folderId ?? null,
    folderName: input.folderName ?? "Mercadinho Pro - Backups",
    status: "active" as const,
    lastBackupError: null,
  };
  if (existing) {
    await db.update(googleDriveBackupConnections).set(payload).where(eq(googleDriveBackupConnections.id, existing.id));
  } else {
    await db.insert(googleDriveBackupConnections).values({ userId: input.userId, ...payload });
  }
  return getGoogleDriveBackupConnection(input.userId);
}

export async function listGoogleDriveBackupRuns(userId: number) {
  const db = await requireDb();
  return db
    .select({
      id: googleDriveBackupRuns.id,
      trigger: googleDriveBackupRuns.trigger,
      status: googleDriveBackupRuns.status,
      fileName: googleDriveBackupRuns.fileName,
      sizeBytes: googleDriveBackupRuns.sizeBytes,
      errorMessage: googleDriveBackupRuns.errorMessage,
      createdAt: googleDriveBackupRuns.createdAt,
    })
    .from(googleDriveBackupRuns)
    .where(eq(googleDriveBackupRuns.userId, userId))
    .orderBy(desc(googleDriveBackupRuns.createdAt))
    .limit(20);
}

export async function getGoogleDriveBackupConnectionBySchedule(taskUid: string) {
  const db = await requireDb();
  const [connection] = await db
    .select()
    .from(googleDriveBackupConnections)
    .where(eq(googleDriveBackupConnections.scheduleCronTaskUid, taskUid))
    .limit(1);
  return connection ?? null;
}

export async function setGoogleDriveBackupSchedule(userId: number, taskUid: string) {
  const db = await requireDb();
  await db
    .update(googleDriveBackupConnections)
    .set({ scheduleCronTaskUid: taskUid })
    .where(eq(googleDriveBackupConnections.userId, userId));
}

export async function recordGoogleDriveBackupRun(input: {
  connectionId: number;
  userId: number;
  trigger: "manual" | "daily";
  status: "success" | "failed";
  fileName?: string | null;
  googleFileId?: string | null;
  sizeBytes?: number | null;
  errorMessage?: string | null;
}) {
  const db = await requireDb();
  await db.insert(googleDriveBackupRuns).values({
    connectionId: input.connectionId,
    userId: input.userId,
    trigger: input.trigger,
    status: input.status,
    fileName: input.fileName ?? null,
    googleFileId: input.googleFileId ?? null,
    sizeBytes: input.sizeBytes ?? null,
    errorMessage: input.errorMessage ?? null,
  });
}

export async function updateGoogleDriveBackupResult(input: {
  connectionId: number;
  status: "active" | "error" | "revoked";
  lastBackupStatus: "success" | "failed";
  lastBackupError?: string | null;
  successfulAt?: Date;
}) {
  const db = await requireDb();
  await db
    .update(googleDriveBackupConnections)
    .set({
      status: input.status,
      lastBackupAt: input.successfulAt,
      lastBackupStatus: input.lastBackupStatus,
      lastBackupError: input.lastBackupError ?? null,
    })
    .where(eq(googleDriveBackupConnections.id, input.connectionId));
}

export async function hasGoogleDriveBackupSince(connectionId: number, since: Date) {
  const db = await requireDb();
  const [run] = await db
    .select({ id: googleDriveBackupRuns.id })
    .from(googleDriveBackupRuns)
    .where(and(eq(googleDriveBackupRuns.connectionId, connectionId), eq(googleDriveBackupRuns.trigger, "daily"), eq(googleDriveBackupRuns.status, "success"), gte(googleDriveBackupRuns.createdAt, since)))
    .limit(1);
  return Boolean(run);
}
