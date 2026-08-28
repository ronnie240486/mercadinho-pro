export type ThermalReceipt = {
  code: string;
  issuedAt: Date;
  paymentLabel: string;
  subtotal: number;
  discount: number;
  total: number;
  items: Array<{ name: string; quantity: number; unit: string; unitPrice: number; total: number }>;
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function quantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
}

export function buildThermalReceiptHtml(receipt: ThermalReceipt, width: "58" | "80" = "80") {
  const rows = receipt.items.map(item => `<div class="item"><strong>${escapeHtml(item.name)}</strong><span>${quantity(item.quantity)} ${escapeHtml(item.unit)} × ${money(item.unitPrice)}</span><b>${money(item.total)}</b></div>`).join("");
  const issuedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(receipt.issuedAt);
  const printableWidth = Number(width) - 6;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Comprovante ${escapeHtml(receipt.code)}</title><style>@page{size:${width}mm auto;margin:3mm}*{box-sizing:border-box}body{width:${printableWidth}mm;margin:0;color:#101820;font-family:Arial,sans-serif;font-size:10px}.center{text-align:center}.brand{font-size:14px;font-weight:800;letter-spacing:.4px}.muted{color:#53615e}.rule{border-top:1px dashed #26332e;margin:8px 0}.item{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:4px 0}.item strong{grid-column:1/-1;font-size:10px}.item span{color:#53615e}.item b{text-align:right}.line{display:flex;justify-content:space-between;padding:2px 0}.total{font-size:14px;font-weight:800;padding-top:5px}.foot{margin-top:10px;font-size:9px}.print-note{font-size:8px;color:#53615e;margin-top:8px}</style></head><body><div class="center"><div class="brand">MERCADINHO PRO</div><div class="muted">COMPROVANTE DE VENDA</div></div><div class="rule"></div><div><b>Venda:</b> ${escapeHtml(receipt.code)}<br><span class="muted">${issuedAt}</span></div><div class="rule"></div>${rows}<div class="rule"></div><div class="line"><span>Subtotal</span><span>${money(receipt.subtotal)}</span></div>${receipt.discount > 0 ? `<div class="line"><span>Descontos</span><span>- ${money(receipt.discount)}</span></div>` : ""}<div class="line total"><span>TOTAL</span><span>${money(receipt.total)}</span></div><div class="rule"></div><div class="line"><span>Pagamento</span><b>${escapeHtml(receipt.paymentLabel)}</b></div><div class="center foot">Obrigado pela preferência.</div><div class="center print-note">Documento não fiscal</div><script>window.addEventListener('afterprint',()=>window.close())</script></body></html>`;
}

export function printThermalReceipt(receipt: ThermalReceipt, width: "58" | "80" = "80") {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=420,height=640");
  if (!printWindow) throw new Error("Não foi possível abrir a impressão. Verifique se o navegador bloqueou a nova janela.");
  printWindow.document.open();
  printWindow.document.write(buildThermalReceiptHtml(receipt, width));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 150);
}
