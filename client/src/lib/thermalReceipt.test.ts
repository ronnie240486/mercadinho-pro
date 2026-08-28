import { describe, expect, it } from "vitest";
import { buildThermalReceiptHtml } from "./thermalReceipt";

describe("comprovante térmico", () => {
  it("inclui itens, total e meio de pagamento com largura de 80 mm", () => {
    const html = buildThermalReceiptHtml({ code: "V-001", issuedAt: new Date("2026-08-28T12:00:00Z"), paymentLabel: "Pix", subtotal: 12, discount: 2, total: 10, items: [{ name: "Arroz", quantity: 2, unit: "KG", unitPrice: 6, total: 12 }] }, "80");

    expect(html).toContain("size:80mm auto");
    expect(html).toContain("Arroz");
    expect(html).toContain("Pagamento");
    expect(html).toContain("Pix");
    expect(html).toContain("R$ 10,00");
  });

  it("escapa dados do produto antes de montar o documento de impressão", () => {
    const html = buildThermalReceiptHtml({ code: "V-002", issuedAt: new Date(), paymentLabel: "Dinheiro", subtotal: 1, discount: 0, total: 1, items: [{ name: "<item>", quantity: 1, unit: "UN", unitPrice: 1, total: 1 }] }, "58");

    expect(html).toContain("&lt;item&gt;");
    expect(html).not.toContain("<strong><item>");
  });
});
