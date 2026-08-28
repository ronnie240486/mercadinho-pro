export type OperationSettings = {
  receiptWidth: "58" | "80";
  drawerOnPrint: boolean;
  scaleMode: "manual" | "connected";
  whatsappNumber: string;
};

const SETTINGS_KEY = "mercadinho-pro-operation-settings";

export const defaultOperationSettings: OperationSettings = {
  receiptWidth: "80",
  drawerOnPrint: false,
  scaleMode: "manual",
  whatsappNumber: "",
};

export function loadOperationSettings(): OperationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultOperationSettings;
    const parsed = JSON.parse(stored) as Partial<OperationSettings>;
    return {
      receiptWidth: parsed.receiptWidth === "58" ? "58" : "80",
      drawerOnPrint: Boolean(parsed.drawerOnPrint),
      scaleMode: parsed.scaleMode === "connected" ? "connected" : "manual",
      whatsappNumber: typeof parsed.whatsappNumber === "string" ? parsed.whatsappNumber : "",
    };
  } catch {
    return defaultOperationSettings;
  }
}

export function saveOperationSettings(settings: OperationSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
