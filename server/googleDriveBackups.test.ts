import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { createBackupArchive, createBackupFileName } from "./googleDriveBackups";

describe("arquivos de backup", () => {
  it("gera um nome único e reconhecível para a cópia compactada", () => {
    expect(createBackupFileName(new Date("2026-08-28T05:00:00.000Z"))).toBe("mercadinho-pro-backup-2026-08-28_05-00-00-000UTC.json.gz");
  });

  it("mantém a estrutura de recuperação no arquivo compactado", async () => {
    const backup = await createBackupArchive();
    const content = JSON.parse(gunzipSync(backup.archive).toString("utf8")) as {
      format: string;
      tables: { products: unknown[]; sales: unknown[]; whatsappOrders: unknown[] };
    };
    expect(backup.archive.length).toBeGreaterThan(0);
    expect(content.format).toBe("mercadinho-pro-backup-v1");
    expect(Array.isArray(content.tables.products)).toBe(true);
    expect(Array.isArray(content.tables.sales)).toBe(true);
    expect(Array.isArray(content.tables.whatsappOrders)).toBe(true);
  });
});
