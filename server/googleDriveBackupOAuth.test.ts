import { describe, expect, it } from "vitest";
import { decryptGoogleRefreshToken, encryptGoogleRefreshToken } from "./googleDriveBackupOAuth";

describe("proteção da conexão Google Drive", () => {
  it("protege o token de renovação e permite recuperá-lo apenas no servidor", () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "segredo-de-teste-para-backup";
    const token = "refresh-token-de-teste";
    const encrypted = encryptGoogleRefreshToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptGoogleRefreshToken(encrypted)).toBe(token);
    process.env.JWT_SECRET = originalSecret;
  });
});
