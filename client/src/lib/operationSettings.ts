export type OperationSettings = {
  stationName: string;
  receiptWidth: "58" | "80";
  drawerOnPrint: boolean;
  scaleMode: "manual" | "connected";
  whatsappNumber: string;
};

export const defaultOperationSettings: OperationSettings = {
  stationName: "Caixa principal",
  receiptWidth: "80",
  drawerOnPrint: false,
  scaleMode: "manual",
  whatsappNumber: "",
};

export function getOperationSettingsKey(stationName: string) {
  const normalized = stationName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `mercadinho-pro-operation-settings:${normalized || "caixa-principal"}`;
}

export function loadOperationSettings(stationName = defaultOperationSettings.stationName): OperationSettings {
  try {
    const stored = localStorage.getItem(getOperationSettingsKey(stationName));
    if (!stored) return { ...defaultOperationSettings, stationName };
    const parsed = JSON.parse(stored) as Partial<OperationSettings>;
    return {
      stationName,
      receiptWidth: parsed.receiptWidth === "58" ? "58" : "80",
      drawerOnPrint: Boolean(parsed.drawerOnPrint),
      scaleMode: parsed.scaleMode === "connected" ? "connected" : "manual",
      whatsappNumber: typeof parsed.whatsappNumber === "string" ? parsed.whatsappNumber : "",
    };
  } catch {
    return { ...defaultOperationSettings, stationName };
  }
}

export function saveOperationSettings(settings: OperationSettings) {
  localStorage.setItem(getOperationSettingsKey(settings.stationName), JSON.stringify(settings));
}

export function listOperationStations() {
  const prefix = "mercadinho-pro-operation-settings:";
  const stations: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const parsed = JSON.parse(localStorage.getItem(key) || "{}") as Partial<OperationSettings>;
    if (typeof parsed.stationName === "string" && parsed.stationName.trim()) stations.push(parsed.stationName);
  }
  return Array.from(new Set(stations));
}
