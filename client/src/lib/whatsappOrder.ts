export type WhatsAppMessageOrder = {
  code: string;
  customerName: string;
  customerPhone?: string;
  fulfillment: "pickup" | "delivery";
  deliveryAddress?: string;
  paymentLabel: string;
  notes?: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; unit: string; totalAmount: number }>;
};

export function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function buildWhatsAppOrderUrl(number: string, order: WhatsAppMessageOrder) {
  const phone = normalizeWhatsAppNumber(number);
  if (phone.length < 10) throw new Error("Configure o número do WhatsApp da loja antes de enviar o pedido.");
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
  const lines = [
    `*Pedido ${order.code}*`,
    `Cliente: ${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ""}`,
    `Tipo: ${order.fulfillment === "delivery" ? "Entrega" : "Retirada na loja"}`,
    ...(order.fulfillment === "delivery" && order.deliveryAddress ? [`Endereço: ${order.deliveryAddress}`] : []),
    "",
    "*Itens*",
    ...order.items.map(item => `• ${quantity.format(item.quantity)} ${item.unit} — ${item.name}: ${money.format(item.totalAmount)}`),
    "",
    `*Total: ${money.format(order.totalAmount)}*`,
    `Pagamento: ${order.paymentLabel}`,
    ...(order.notes ? [`Observações: ${order.notes}`] : []),
  ];
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
