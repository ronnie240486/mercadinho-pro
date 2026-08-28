import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderUrl, normalizeWhatsAppNumber } from "./whatsappOrder";

describe("pedido por WhatsApp", () => {
  it("normaliza o número e cria mensagem com retirada, itens e pagamento", () => {
    const url = buildWhatsAppOrderUrl("(11) 99999-0000", { code: "W-001", customerName: "Ana", fulfillment: "pickup", paymentLabel: "Pix", totalAmount: 8.5, items: [{ name: "Café", quantity: 1, unit: "UN", totalAmount: 8.5 }] });

    expect(normalizeWhatsAppNumber("(11) 99999-0000")).toBe("11999990000");
    expect(decodeURIComponent(url)).toContain("Pedido W-001");
    expect(decodeURIComponent(url)).toContain("Pagamento: Pix");
  });

  it("exige telefone da loja antes do envio", () => {
    expect(() => buildWhatsAppOrderUrl("", { code: "W-001", customerName: "Ana", fulfillment: "pickup", paymentLabel: "Dinheiro", totalAmount: 1, items: [] })).toThrow("Configure o número");
  });
});
