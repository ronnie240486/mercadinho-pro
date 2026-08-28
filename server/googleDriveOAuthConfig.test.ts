import { describe, expect, it } from "vitest";

describe("configuração OAuth do Google Drive", () => {
  it("é aceita pelo endpoint OAuth sem expor as credenciais", async () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "refresh_token",
        refresh_token: "mercadinho-pro-oauth-validation-no-token",
      }),
    });

    const payload = (await response.json()) as { error?: string };
    expect(payload.error).not.toBe("invalid_client");
    expect(response.status).toBe(400);
  }, 15_000);
});
