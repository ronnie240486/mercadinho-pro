import { gzipSync } from "node:zlib";
import type { Request, Response } from "express";
import {
  accountsPayable,
  cashMovements,
  cashSessions,
  categories,
  customers,
  inventoryCounts,
  loyaltyTransactions,
  priceHistories,
  productBatches,
  products,
  promotions,
  purchaseItems,
  purchases,
  saleItemBatchAllocations,
  saleItems,
  salePayments,
  saleReturnItems,
  saleReturns,
  sales,
  salesGoals,
  stockMovements,
  suppliers,
  users,
  whatsappOrderItems,
  whatsappOrders,
} from "../drizzle/schema";
import * as db from "./db";
import { decryptGoogleRefreshToken } from "./googleDriveBackupOAuth";
import { sdk } from "./_core/sdk";
import { hasOperationalPermission } from "./businessUtils";

type BackupTrigger = "manual" | "daily";

function dateStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "UTC");
}

export function createBackupFileName(date = new Date()) {
  return `mercadinho-pro-backup-${dateStamp(date)}.json.gz`;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function createBackupArchive() {
  const database = await db.getDb();
  if (!database) throw new Error("O banco de dados não está disponível para backup.");
  const [
    accountRows,
    cashMovementRows,
    cashSessionRows,
    categoryRows,
    customerRows,
    inventoryRows,
    loyaltyRows,
    priceHistoryRows,
    batchRows,
    productRows,
    promotionRows,
    purchaseItemRows,
    purchaseRows,
    allocationRows,
    saleItemRows,
    paymentRows,
    returnItemRows,
    returnRows,
    saleRows,
    goalRows,
    stockRows,
    supplierRows,
    userRows,
    whatsappItemRows,
    whatsappRows,
  ] = await Promise.all([
    database.select().from(accountsPayable),
    database.select().from(cashMovements),
    database.select().from(cashSessions),
    database.select().from(categories),
    database.select().from(customers),
    database.select().from(inventoryCounts),
    database.select().from(loyaltyTransactions),
    database.select().from(priceHistories),
    database.select().from(productBatches),
    database.select().from(products),
    database.select().from(promotions),
    database.select().from(purchaseItems),
    database.select().from(purchases),
    database.select().from(saleItemBatchAllocations),
    database.select().from(saleItems),
    database.select().from(salePayments),
    database.select().from(saleReturnItems),
    database.select().from(saleReturns),
    database.select().from(sales),
    database.select().from(salesGoals),
    database.select().from(stockMovements),
    database.select().from(suppliers),
    database.select().from(users),
    database.select().from(whatsappOrderItems),
    database.select().from(whatsappOrders),
  ]);

  const generatedAt = new Date();
  const content = JSON.stringify({
    format: "mercadinho-pro-backup-v1",
    generatedAt: generatedAt.toISOString(),
    tables: {
      accountsPayable: accountRows,
      cashMovements: cashMovementRows,
      cashSessions: cashSessionRows,
      categories: categoryRows,
      customers: customerRows,
      inventoryCounts: inventoryRows,
      loyaltyTransactions: loyaltyRows,
      priceHistories: priceHistoryRows,
      productBatches: batchRows,
      products: productRows,
      promotions: promotionRows,
      purchaseItems: purchaseItemRows,
      purchases: purchaseRows,
      saleItemBatchAllocations: allocationRows,
      saleItems: saleItemRows,
      salePayments: paymentRows,
      saleReturnItems: returnItemRows,
      saleReturns: returnRows,
      sales: saleRows,
      salesGoals: goalRows,
      stockMovements: stockRows,
      suppliers: supplierRows,
      users: userRows,
      whatsappOrderItems: whatsappItemRows,
      whatsappOrders: whatsappRows,
    },
  });
  const archive = gzipSync(Buffer.from(content, "utf8"));
  return { archive, fileName: createBackupFileName(generatedAt), generatedAt };
}

async function getGoogleAccessToken(encryptedRefreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
      refresh_token: decryptGoogleRefreshToken(encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error === "invalid_grant" ? "A autorização do Google Drive foi revogada." : "Não foi possível renovar o acesso ao Google Drive.");
  return payload.access_token;
}

async function uploadBackup(accessToken: string, folderId: string, fileName: string, archive: Buffer) {
  const form = new FormData();
  const fileContent = new Uint8Array(archive);
  form.append("metadata", new Blob([JSON.stringify({ name: fileName, parents: [folderId], mimeType: "application/gzip" })], { type: "application/json" }));
  form.append("file", new Blob([fileContent], { type: "application/gzip" }), fileName);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const payload = (await response.json()) as { id?: string; error?: unknown };
  if (!response.ok || !payload.id) throw new Error("O Google Drive não confirmou o envio da cópia.");
  return payload.id;
}

export async function runGoogleDriveBackup(userId: number, trigger: BackupTrigger) {
  const connection = await db.getGoogleDriveBackupConnection(userId);
  if (!connection || connection.status !== "active" || !connection.folderId) throw new Error("Conecte o Google Drive desta instalação antes de gerar uma cópia.");
  if (trigger === "daily" && (await db.hasGoogleDriveBackupSince(connection.id, startOfUtcDay()))) {
    return { skipped: true as const };
  }

  try {
    const [accessToken, backup] = await Promise.all([getGoogleAccessToken(connection.encryptedRefreshToken), createBackupArchive()]);
    const googleFileId = await uploadBackup(accessToken, connection.folderId, backup.fileName, backup.archive);
    await db.recordGoogleDriveBackupRun({ connectionId: connection.id, userId, trigger, status: "success", fileName: backup.fileName, googleFileId, sizeBytes: backup.archive.length });
    await db.updateGoogleDriveBackupResult({ connectionId: connection.id, status: "active", lastBackupStatus: "success", successfulAt: backup.generatedAt });
    return { skipped: false as const, fileName: backup.fileName, sizeBytes: backup.archive.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível concluir a cópia.";
    await db.recordGoogleDriveBackupRun({ connectionId: connection.id, userId, trigger, status: "failed", errorMessage: message });
    await db.updateGoogleDriveBackupResult({ connectionId: connection.id, status: message.includes("revogada") ? "revoked" : "error", lastBackupStatus: "failed", lastBackupError: message });
    throw error;
  }
}

async function requireManager(req: Request) {
  const user = await sdk.authenticateRequest(req);
  if (!hasOperationalPermission(user.role, ["admin", "manager"])) throw new Error("Você não possui permissão para baixar backup.");
  return user;
}

export async function downloadManualBackup(req: Request, res: Response) {
  try {
    await requireManager(req);
    const backup = await createBackupArchive();
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${backup.fileName}"`);
    res.status(200).send(backup.archive);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Não foi possível gerar a cópia manual." });
  }
}

export async function runScheduledGoogleDriveBackup(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    const connection = await db.getGoogleDriveBackupConnectionBySchedule(user.taskUid);
    if (!connection) {
      res.json({ ok: true, skipped: "orphan" });
      return;
    }
    const result = await runGoogleDriveBackup(connection.userId, "daily");
    res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao gerar backup.";
    res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}
