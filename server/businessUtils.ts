export const operationalRoles = ["user", "admin", "manager", "operator", "stockist"] as const;
export type OperationalRole = (typeof operationalRoles)[number];

export const paymentMethods = ["cash", "debit", "credit", "pix", "voucher", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export function hasOperationalPermission(role: OperationalRole, allowedRoles: readonly OperationalRole[]) {
  return allowedRoles.includes(role);
}

export function normalizeBarcodeCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function calculateSaleTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountAmount = 0,
) {
  const subtotalCents = items.reduce((total, item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error("Os itens da venda devem ter quantidade positiva e preço válido.");
    }
    return total + Math.round(item.quantity * item.unitPrice * 100);
  }, 0);
  const discountCents = Math.round(discountAmount * 100);

  if (!Number.isFinite(discountAmount) || discountCents < 0 || discountCents > subtotalCents) {
    throw new Error("O desconto informado é inválido para esta venda.");
  }

  return {
    subtotal: subtotalCents / 100,
    discountAmount: discountCents / 100,
    totalAmount: (subtotalCents - discountCents) / 100,
  };
}

export function applyStockMovement(previousQuantity: number, delta: number) {
  if (!Number.isFinite(previousQuantity) || !Number.isFinite(delta)) {
    throw new Error("A quantidade de estoque é inválida.");
  }

  const nextQuantity = Math.round((previousQuantity + delta) * 1000) / 1000;
  if (nextQuantity < 0) {
    throw new Error("Estoque insuficiente para concluir esta operação.");
  }
  return nextQuantity;
}

export function allocateBatchConsumption(availableQuantities: number[], requestedQuantity: number) {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) throw new Error("A quantidade de saída deve ser positiva.");
  let remaining = requestedQuantity;
  return availableQuantities.map(availableQuantity => {
    if (!Number.isFinite(availableQuantity) || availableQuantity < 0) throw new Error("A quantidade disponível do lote é inválida.");
    const consumedQuantity = Math.min(remaining, availableQuantity);
    remaining = Math.round((remaining - consumedQuantity) * 1000) / 1000;
    return consumedQuantity;
  });
}

export function requireBatchCoverage(availableQuantities: number[], requestedQuantity: number) {
  const allocation = allocateBatchConsumption(availableQuantities, requestedQuantity);
  const allocatedQuantity = Math.round(allocation.reduce((total, quantity) => total + quantity, 0) * 1000) / 1000;
  if (allocatedQuantity < requestedQuantity) throw new Error("O saldo disponível nos lotes não cobre esta baixa de estoque.");
  return allocation;
}

export function formatBatchConsumption(batches: Array<{ id: number; code: string | null; quantity: number }>) {
  if (!batches.length) return "";
  return `Lotes: ${batches.map(batch => `${batch.code || batch.id} (${batch.quantity.toFixed(3)})`).join(", ")}`;
}

export function calculateCashBalance(
  openingAmount: number,
  movements: Array<{ type: "sale" | "supply" | "withdrawal" | "adjustment" | "cancellation"; amount: number; paymentMethod?: PaymentMethod | null }>,
) {
  const balance = movements.reduce((total, movement) => {
    if (movement.type === "sale" && movement.paymentMethod && movement.paymentMethod !== "cash") {
      return total;
    }
    const direction = movement.type === "withdrawal" || movement.type === "cancellation" ? -1 : 1;
    return total + direction * movement.amount;
  }, openingAmount);
  return Math.round(balance * 100) / 100;
}
