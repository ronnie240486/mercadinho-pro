import { and, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accountsPayable,
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
  salePayments,
  saleReturnItems,
  saleReturns,
  sales,
  stockMovements,
  suppliers,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { applyStockMovement, calculateCashBalance, calculateSaleTotals, formatBatchConsumption, normalizeBarcodeCode, requireBatchCoverage, type PaymentMethod } from "./businessUtils";
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

export async function createCustomer(input: { name: string; document?: string; phone?: string; email?: string; notes?: string }) {
  const db = await requireDb();
  await db.insert(customers).values({ ...input, name: input.name.trim() });
  return { success: true } as const;
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
  items: Array<{ productId: number; quantity: number; unitCost: number }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Inclua ao menos um produto na compra.");
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
      await tx.insert(purchaseItems).values({ purchaseId: purchase.id, productId: product.id, productName: product.name, quantity: decimal(item.quantity, 3), unitCost: decimal(item.unitCost), totalAmount: decimal(item.quantity * item.unitCost) });
      await tx.update(products).set({ stockQuantity: decimal(currentQuantity, 3), costPrice: decimal(item.unitCost) }).where(eq(products.id, product.id));
      await tx.insert(stockMovements).values({ productId: product.id, supplierId: input.supplierId, purchaseId: purchase.id, userId: input.userId, type: "entry", quantity: decimal(item.quantity, 3), unitCost: decimal(item.unitCost), previousQuantity: decimal(previousQuantity, 3), currentQuantity: decimal(currentQuantity, 3), reason: `Compra ${purchaseCode}` });
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
  notes?: string;
  items: Array<{ productId: number; quantity: number }>;
  payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
}) {
  const db = await requireDb();
  if (!input.items.length) throw new Error("Adicione ao menos um item para concluir a venda.");
  const cash = await getOpenCashSession();
  if (!cash) throw new Error("Abra o caixa antes de finalizar uma venda.");
  const productIds = Array.from(new Set(input.items.map(item => item.productId)));
  const productRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.active, true)));
  if (productRows.length !== productIds.length) throw new Error("Um ou mais produtos não estão disponíveis.");
  const productsById = new Map(productRows.map(product => [product.id, product]));
  const activePromotions = await listActivePromotions();
  const promotionsByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion]));
  const detailedItems = input.items.map(item => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("Produto não encontrado.");
    const promotion = promotionsByProductId.get(product.id);
    return { ...item, product, unitPrice: promotion ? toNumber(promotion.promotionalPrice) : toNumber(product.salePrice), costPrice: toNumber(product.costPrice) };
  });
  const totals = calculateSaleTotals(detailedItems, input.discountAmount);
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
    await tx.insert(saleItems).values(detailedItems.map(item => ({
      saleId: sale.id,
      productId: item.product.id,
      productName: item.product.name,
      quantity: decimal(item.quantity, 3),
      unitPrice: decimal(item.unitPrice),
      costPrice: decimal(item.costPrice),
      totalAmount: decimal(Math.round(item.quantity * item.unitPrice * 100) / 100),
    })));
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
  const db = await requireDb(); const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1); if (!sale || sale.status !== "completed") throw new Error("Venda não está disponível para cancelamento."); const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId)); const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, saleId));
  await db.transaction(async tx => { await tx.update(sales).set({ status: "cancelled", cancelledAt: new Date(), notes: `${sale.notes || ""}\nCancelada: ${reason}`.trim() }).where(eq(sales.id, saleId)); for (const item of items) { const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1); if (!product) continue; const previous = toNumber(product.stockQuantity), next = previous + toNumber(item.quantity); await tx.update(products).set({ stockQuantity: decimal(next, 3) }).where(eq(products.id, product.id)); await tx.insert(stockMovements).values({ productId: product.id, saleId, userId, type: "cancellation", quantity: decimal(toNumber(item.quantity), 3), previousQuantity: decimal(previous, 3), currentQuantity: decimal(next, 3), reason: `Cancelamento ${sale.code}: ${reason}` }); } if (sale.cashSessionId) await tx.insert(cashMovements).values(payments.map(payment => ({ cashSessionId: sale.cashSessionId!, saleId, userId, type: "cancellation" as const, paymentMethod: payment.method, amount: decimal(-toNumber(payment.amount)), description: `Cancelamento ${sale.code}` }))); }); return { success: true } as const;
}

export async function listSaleItemsForReturn(saleId: number) { const db = await requireDb(); return db.select({ id: saleItems.id, productId: saleItems.productId, productName: saleItems.productName, quantity: saleItems.quantity, totalAmount: saleItems.totalAmount }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(saleItems.saleId, saleId), eq(sales.status, "completed"))); }

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
  return { salesTodayAmount: toNumber(salesToday?.total), salesTodayCount: Number(salesToday?.count ?? 0), topProducts, lowStockItems, latestCashMovements, lossCount: Number(losses?.count ?? 0), lossQuantity: toNumber(losses?.quantity), expiringBatches, inventoryCount: Number(inventorySummary?.count ?? 0), inventoryDivergence: toNumber(inventorySummary?.divergence), grossMarginToday: toNumber(marginSummary?.margin), marginByProduct, reportDate: today };
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
  return db.select({ id: accountsPayable.id, description: accountsPayable.description, dueDate: accountsPayable.dueDate, amount: accountsPayable.amount, paidAmount: accountsPayable.paidAmount, status: accountsPayable.status, supplierName: suppliers.legalName }).from(accountsPayable).leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id)).orderBy(accountsPayable.dueDate).limit(100);
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
