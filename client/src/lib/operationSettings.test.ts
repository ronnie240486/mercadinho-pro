import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOperationSettings, getOperationSettingsKey, listOperationStations, loadOperationSettings, saveOperationSettings } from "./operationSettings";

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
  };
}

beforeEach(() => vi.stubGlobal("localStorage", createLocalStorage()));
afterEach(() => vi.unstubAllGlobals());

describe("perfil local de operação", () => {
  it("gera chaves isoladas para estações com nomes diferentes", () => {
    expect(getOperationSettingsKey("Caixa 1")).toBe("mercadinho-pro-operation-settings:caixa-1");
    expect(getOperationSettingsKey("Caixa 2")).toBe("mercadinho-pro-operation-settings:caixa-2");
  });

  it("normaliza variações de nome da estação na chave local", () => {
    expect(getOperationSettingsKey("  Balcão São João  ")).toBe("mercadinho-pro-operation-settings:balcao-sao-joao");
  });

  it("mantém WhatsApp e largura de papel separados entre instalações", () => {
    saveOperationSettings({ ...defaultOperationSettings, stationName: "Caixa 1", receiptWidth: "58", whatsappNumber: "5511999990001" });
    saveOperationSettings({ ...defaultOperationSettings, stationName: "Caixa 2", receiptWidth: "80", whatsappNumber: "5511999990002" });

    expect(loadOperationSettings("Caixa 1")).toMatchObject({ stationName: "Caixa 1", receiptWidth: "58", whatsappNumber: "5511999990001" });
    expect(loadOperationSettings("Caixa 2")).toMatchObject({ stationName: "Caixa 2", receiptWidth: "80", whatsappNumber: "5511999990002" });
    expect(listOperationStations()).toEqual(["Caixa 1", "Caixa 2"]);
  });
});
