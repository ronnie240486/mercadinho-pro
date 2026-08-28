import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Usuários autenticados no sistema. Os papéis são aplicados nas rotas de
 * operação para limitar acesso a recursos sensíveis, como fechamento de caixa.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "manager", "operator", "stockist"])
    .default("user")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull().unique(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("categories_active_idx").on(table.active)],
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    barcode: varchar("barcode", { length: 64 }).unique(),
    internalCode: varchar("internalCode", { length: 48 }).unique(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    unit: varchar("unit", { length: 12 }).default("UN").notNull(),
    costPrice: decimal("costPrice", { precision: 12, scale: 2 }).default("0.00").notNull(),
    salePrice: decimal("salePrice", { precision: 12, scale: 2 }).default("0.00").notNull(),
    stockQuantity: decimal("stockQuantity", { precision: 12, scale: 3 }).default("0.000").notNull(),
    minimumStock: decimal("minimumStock", { precision: 12, scale: 3 }).default("0.000").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("products_name_idx").on(table.name),
    index("products_category_idx").on(table.categoryId),
    index("products_active_idx").on(table.active),
  ],
);

export const priceHistories = mysqlTable(
  "priceHistories",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id),
    previousSalePrice: decimal("previousSalePrice", { precision: 12, scale: 2 }).notNull(),
    newSalePrice: decimal("newSalePrice", { precision: 12, scale: 2 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("price_histories_product_idx").on(table.productId), index("price_histories_created_idx").on(table.createdAt)],
);

export const promotions = mysqlTable(
  "promotions",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    promotionalPrice: decimal("promotionalPrice", { precision: 12, scale: 2 }).notNull(),
    startsOn: varchar("startsOn", { length: 10 }).notNull(),
    endsOn: varchar("endsOn", { length: 10 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("promotions_product_idx").on(table.productId), index("promotions_period_idx").on(table.startsOn, table.endsOn)],
);

export const suppliers = mysqlTable(
  "suppliers",
  {
    id: int("id").autoincrement().primaryKey(),
    legalName: varchar("legalName", { length: 180 }).notNull(),
    tradeName: varchar("tradeName", { length: 180 }),
    document: varchar("document", { length: 32 }),
    contactName: varchar("contactName", { length: 140 }),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("suppliers_name_idx").on(table.legalName)],
);

export const purchases = mysqlTable(
  "purchases",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    supplierId: int("supplierId").notNull().references(() => suppliers.id),
    receivedByUserId: int("receivedByUserId").notNull().references(() => users.id),
    status: mysqlEnum("status", ["completed", "cancelled"]).default("completed").notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("purchases_created_at_idx").on(table.createdAt), index("purchases_supplier_idx").on(table.supplierId)],
);

export const purchaseItems = mysqlTable(
  "purchaseItems",
  {
    id: int("id").autoincrement().primaryKey(),
    purchaseId: int("purchaseId").notNull().references(() => purchases.id, { onDelete: "cascade" }),
    productId: int("productId").notNull().references(() => products.id),
    productName: varchar("productName", { length: 180 }).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("purchase_items_purchase_idx").on(table.purchaseId), index("purchase_items_product_idx").on(table.productId)],
);

export const whatsappOrders = mysqlTable(
  "whatsappOrders",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    customerName: varchar("customerName", { length: 180 }).notNull(),
    customerPhone: varchar("customerPhone", { length: 32 }),
    fulfillment: mysqlEnum("fulfillment", ["pickup", "delivery"]).default("pickup").notNull(),
    deliveryAddress: varchar("deliveryAddress", { length: 500 }),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "debit", "credit", "pix"]).notNull(),
    status: mysqlEnum("status", ["draft", "sent", "confirmed", "cancelled"]).default("draft").notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("whatsapp_orders_created_at_idx").on(table.createdAt), index("whatsapp_orders_status_idx").on(table.status)],
);

export const whatsappOrderItems = mysqlTable(
  "whatsappOrderItems",
  {
    id: int("id").autoincrement().primaryKey(),
    whatsappOrderId: int("whatsappOrderId").notNull().references(() => whatsappOrders.id, { onDelete: "cascade" }),
    productId: int("productId").notNull().references(() => products.id),
    productName: varchar("productName", { length: 180 }).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 12 }).notNull(),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("whatsapp_order_items_order_idx").on(table.whatsappOrderId), index("whatsapp_order_items_product_idx").on(table.productId)],
);

export const productBatches = mysqlTable(
  "productBatches",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id),
    purchaseId: int("purchaseId").references(() => purchases.id, { onDelete: "set null" }),
    supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
    code: varchar("code", { length: 80 }),
    expirationDate: varchar("expirationDate", { length: 10 }),
    initialQuantity: decimal("initialQuantity", { precision: 12, scale: 3 }).notNull(),
    availableQuantity: decimal("availableQuantity", { precision: 12, scale: 3 }).notNull(),
    status: mysqlEnum("status", ["active", "depleted", "expired", "discarded"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("product_batches_product_idx").on(table.productId),
    index("product_batches_expiration_idx").on(table.expirationDate),
    index("product_batches_status_idx").on(table.status),
  ],
);

export const customers = mysqlTable(
  "customers",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    document: varchar("document", { length: 32 }),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    notes: text("notes"),
    loyaltyMode: mysqlEnum("loyaltyMode", ["points", "credit"]).default("points").notNull(),
    loyaltyPointsBalance: int("loyaltyPointsBalance").default(0).notNull(),
    loyaltyCreditBalance: decimal("loyaltyCreditBalance", { precision: 12, scale: 2 }).default("0.00").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("customers_name_idx").on(table.name)],
);

export const cashSessions = mysqlTable(
  "cashSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    openedByUserId: int("openedByUserId").notNull().references(() => users.id),
    closedByUserId: int("closedByUserId").references(() => users.id),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    openingAmount: decimal("openingAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    expectedClosingAmount: decimal("expectedClosingAmount", { precision: 12, scale: 2 }),
    actualClosingAmount: decimal("actualClosingAmount", { precision: 12, scale: 2 }),
    differenceAmount: decimal("differenceAmount", { precision: 12, scale: 2 }),
    openedAt: timestamp("openedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
    notes: text("notes"),
  },
  table => [
    index("cash_sessions_status_idx").on(table.status),
    index("cash_sessions_opened_at_idx").on(table.openedAt),
  ],
);

export const sales = mysqlTable(
  "sales",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    customerId: int("customerId").references(() => customers.id, { onDelete: "set null" }),
    cashSessionId: int("cashSessionId").references(() => cashSessions.id, { onDelete: "set null" }),
    operatorUserId: int("operatorUserId").notNull().references(() => users.id),
    status: mysqlEnum("status", ["completed", "cancelled"]).default("completed").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0.00").notNull(),
    discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    cancelledAt: timestamp("cancelledAt"),
  },
  table => [
    index("sales_created_at_idx").on(table.createdAt),
    index("sales_operator_idx").on(table.operatorUserId),
    index("sales_cash_session_idx").on(table.cashSessionId),
  ],
);

export const saleItems = mysqlTable(
  "saleItems",
  {
    id: int("id").autoincrement().primaryKey(),
    saleId: int("saleId").notNull().references(() => sales.id, { onDelete: "cascade" }),
    productId: int("productId").notNull().references(() => products.id),
    productName: varchar("productName", { length: 180 }).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("sale_items_sale_idx").on(table.saleId), index("sale_items_product_idx").on(table.productId)],
);

export const saleItemBatchAllocations = mysqlTable(
  "saleItemBatchAllocations",
  {
    id: int("id").autoincrement().primaryKey(),
    saleItemId: int("saleItemId").notNull().references(() => saleItems.id, { onDelete: "cascade" }),
    batchId: int("batchId").notNull().references(() => productBatches.id),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("sale_item_batch_allocations_item_idx").on(table.saleItemId), index("sale_item_batch_allocations_batch_idx").on(table.batchId)],
);

export const salePayments = mysqlTable(
  "salePayments",
  {
    id: int("id").autoincrement().primaryKey(),
    saleId: int("saleId").notNull().references(() => sales.id, { onDelete: "cascade" }),
    method: mysqlEnum("method", ["cash", "debit", "credit", "pix", "voucher", "other"]).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    reference: varchar("reference", { length: 120 }),
  },
  table => [index("sale_payments_sale_idx").on(table.saleId)],
);

export const saleReturns = mysqlTable("saleReturns", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  saleId: int("saleId").notNull().references(() => sales.id),
  cashSessionId: int("cashSessionId").references(() => cashSessions.id, { onDelete: "set null" }),
  userId: int("userId").notNull().references(() => users.id),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  refundMethod: mysqlEnum("refundMethod", ["cash", "debit", "credit", "pix", "voucher", "other"]).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("sale_returns_sale_idx").on(table.saleId), index("sale_returns_created_idx").on(table.createdAt)]);

export const saleReturnItems = mysqlTable("saleReturnItems", {
  id: int("id").autoincrement().primaryKey(),
  saleReturnId: int("saleReturnId").notNull().references(() => saleReturns.id, { onDelete: "cascade" }),
  saleItemId: int("saleItemId").notNull().references(() => saleItems.id),
  productId: int("productId").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
}, table => [index("sale_return_items_return_idx").on(table.saleReturnId), index("sale_return_items_sale_item_idx").on(table.saleItemId)]);

export const accountsPayable = mysqlTable("accountsPayable", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseId: int("purchaseId").references(() => purchases.id, { onDelete: "set null" }),
  description: varchar("description", { length: 180 }).notNull(),
  dueDate: varchar("dueDate", { length: 10 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["open", "paid", "overdue", "cancelled"]).default("open").notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("accounts_payable_due_idx").on(table.dueDate), index("accounts_payable_status_idx").on(table.status)]);

export const salesGoals = mysqlTable("salesGoals", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  startsOn: varchar("startsOn", { length: 10 }).notNull(),
  endsOn: varchar("endsOn", { length: 10 }).notNull(),
  targetAmount: decimal("targetAmount", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("sales_goals_period_idx").on(table.startsOn, table.endsOn)]);

export const loyaltyTransactions = mysqlTable("loyaltyTransactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customers.id),
  saleId: int("saleId").references(() => sales.id, { onDelete: "set null" }),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["earn", "redeem", "adjustment", "reversal"]).notNull(),
  points: int("points").notNull(),
  creditAmount: decimal("creditAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("loyalty_transactions_customer_idx").on(table.customerId), index("loyalty_transactions_created_idx").on(table.createdAt)]);

export const stockMovements = mysqlTable(
  "stockMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id),
    supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
    purchaseId: int("purchaseId").references(() => purchases.id, { onDelete: "set null" }),
    batchId: int("batchId").references(() => productBatches.id, { onDelete: "set null" }),
    saleId: int("saleId").references(() => sales.id, { onDelete: "set null" }),
    userId: int("userId").notNull().references(() => users.id),
    type: mysqlEnum("type", ["entry", "outbound", "loss", "sale", "adjustment_in", "adjustment_out", "return", "cancellation"]).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
    previousQuantity: decimal("previousQuantity", { precision: 12, scale: 3 }).notNull(),
    currentQuantity: decimal("currentQuantity", { precision: 12, scale: 3 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("stock_movements_product_idx").on(table.productId),
    index("stock_movements_purchase_idx").on(table.purchaseId),
    index("stock_movements_batch_idx").on(table.batchId),
    index("stock_movements_created_at_idx").on(table.createdAt),
    index("stock_movements_type_idx").on(table.type),
  ],
);

export const inventoryCounts = mysqlTable(
  "inventoryCounts",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id),
    userId: int("userId").notNull().references(() => users.id),
    systemQuantity: decimal("systemQuantity", { precision: 12, scale: 3 }).notNull(),
    countedQuantity: decimal("countedQuantity", { precision: 12, scale: 3 }).notNull(),
    differenceQuantity: decimal("differenceQuantity", { precision: 12, scale: 3 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("inventory_counts_product_idx").on(table.productId), index("inventory_counts_created_idx").on(table.createdAt)],
);

export const cashMovements = mysqlTable(
  "cashMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    cashSessionId: int("cashSessionId").notNull().references(() => cashSessions.id, { onDelete: "cascade" }),
    saleId: int("saleId").references(() => sales.id, { onDelete: "set null" }),
    userId: int("userId").notNull().references(() => users.id),
    type: mysqlEnum("type", ["sale", "supply", "withdrawal", "adjustment", "cancellation", "return"]).notNull(),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "debit", "credit", "pix", "voucher", "other"]),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("cash_movements_session_idx").on(table.cashSessionId),
    index("cash_movements_created_at_idx").on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type ProductBatch = typeof productBatches.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
