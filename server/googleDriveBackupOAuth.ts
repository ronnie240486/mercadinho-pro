import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { hasOperationalPermission } from "./businessUtils";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

const STATE_COOKIE = "google_drive_backup_state";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const BACKUP_FOLDER_NAME = "Mercadinho Pro - Backups";

function requireGoogleDriveConfiguration() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("A conexão com Google Drive ainda não foi configurada.");
  return { clientId, clientSecret };
}

function getRedirectUri(req: Request) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string" ? forwardedProtocol.split(",")[0].trim() : req.protocol;
  return `${protocol}://${req.get("host")}/api/google-drive/callback`;
}

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Chave de proteção indisponível para a conexão com Google Drive.");
  return createHash("sha256").update(secret).digest();
}

export function encryptGoogleRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGoogleRefreshToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Token de conexão inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

async function requireManager(req: Request) {
  const user = await sdk.authenticateRequest(req);
  if (!hasOperationalPermission(user.role, ["admin", "manager"])) throw new Error("Você não possui permissão para configurar backups.");
  return user;
}

async function googleRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Não foi possível concluir a comunicação com o Google Drive.");
  return response.json() as Promise<Record<string, unknown>>;
}

export function registerGoogleDriveBackupOAuthRoutes(app: Express) {
  app.get("/api/google-drive/connect", async (req, res) => {
    try {
      await requireManager(req);
      const { clientId } = requireGoogleDriveConfiguration();
      const state = randomBytes(32).toString("base64url");
      res.cookie(STATE_COOKIE, state, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: 10 * 60 * 1000 });
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(req),
        response_type: "code",
        scope: OAUTH_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : "Não foi possível iniciar a conexão com Google Drive." });
    }
  });

  app.get("/api/google-drive/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax" });
    if (!code || !state || state !== expectedState) {
      res.redirect(302, "/backups?googleDrive=invalid-state");
      return;
    }

    try {
      const user = await requireManager(req);
      const { clientId, clientSecret } = requireGoogleDriveConfiguration();
      const tokenResponse = await googleRequest("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: getRedirectUri(req), grant_type: "authorization_code" }),
      });
      const accessToken = typeof tokenResponse.access_token === "string" ? tokenResponse.access_token : "";
      const refreshToken = typeof tokenResponse.refresh_token === "string" ? tokenResponse.refresh_token : "";
      if (!accessToken || !refreshToken) throw new Error("O Google não retornou a autorização necessária para o backup.");

      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const userInfo = await googleRequest("https://www.googleapis.com/oauth2/v3/userinfo", { headers });
      const folder = await googleRequest("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
      });
      const folderId = typeof folder.id === "string" ? folder.id : null;
      if (!folderId) throw new Error("O Google Drive não confirmou a pasta de backup.");

      await db.upsertGoogleDriveBackupConnection({
        userId: user.id,
        encryptedRefreshToken: encryptGoogleRefreshToken(refreshToken),
        googleEmail: typeof userInfo.email === "string" ? userInfo.email : null,
        folderId,
        folderName: BACKUP_FOLDER_NAME,
      });
      res.redirect(302, "/backups?googleDrive=connected");
    } catch {
      res.redirect(302, "/backups?googleDrive=error");
    }
  });
}
