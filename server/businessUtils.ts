export const operationalRoles = ["user", "admin", "manager", "operator", "stockist"] as const;
export type OperationalRole = (typeof operationalRoles)[number];

export const paymentMethods = ["cash", "debit", "credit", "pix", "voucher", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type LoyaltyMode = "points" | "credit";

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

export function calculateLoyaltyRedemption(mode: LoyaltyMode, availableBalance: number, requestedAmount: number, maximumDiscount: number) {
  if (!Number.isFinite(availableBalance) || !Number.isFinite(requestedAmount) || !Number.isFinite(maximumDiscount) || availableBalance < 0 || requestedAmount < 0 || maximumDiscount < 0) {
    throw new Error("Os valores de fidelidade são inválidos.");
  }
  if (mode === "points") {
    const requestedPoints = Math.trunc(requestedAmount);
    if (requestedPoints > availableBalance) throw new Error("O cliente não possui pontos suficientes.");
    const points = Math.min(requestedPoints, Math.floor(maximumDiscount * 100));
    return { points, creditAmount: 0, discountAmount: Math.round((points / 100) * 100) / 100 };
  }
  const requestedCredit = Math.round(requestedAmount * 100) / 100;
  if (requestedCredit > availableBalance + 0.0001) throw new Error("O cliente não possui crédito suficiente.");
  const creditAmount = Math.min(requestedCredit, Math.round(maximumDiscount * 100) / 100);
  return { points: 0, creditAmount, discountAmount: creditAmount };
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

export function allocateBatchRestoration(allocatedQuantities: number[], previouslyRestoredQuantity: number, requestedQuantity: number) {
  if (!Number.isFinite(previouslyRestoredQuantity) || previouslyRestoredQuantity < 0 || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error("As quantidades de restauração de lote são inválidas.");
  }
  let toSkip = previouslyRestoredQuantity;
  let remaining = requestedQuantity;
  const restoration = allocatedQuantities.map(allocatedQuantity => {
    if (!Number.isFinite(allocatedQuantity) || allocatedQuantity < 0) throw new Error("A quantidade alocada no lote é inválida.");
    const availableInSlice = Math.max(allocatedQuantity - toSkip, 0);
    toSkip = Math.max(toSkip - allocatedQuantity, 0);
    const quantity = Math.min(availableInSlice, remaining);
    remaining = Math.round((remaining - quantity) * 1000) / 1000;
    return quantity;
  });
  if (remaining > 0) throw new Error("A devolução ultrapassa a quantidade originalmente movimentada nos lotes.");
  return restoration;
}

export function formatBatchConsumption(batches: Array<{ id: number; code: string | null; quantity: number }>) {
  if (!batches.length) return "";
  return `Lotes: ${batches.map(batch => `${batch.code || batch.id} (${batch.quantity.toFixed(3)})`).join(", ")}`;
}

export function calculateCashBalance(
  openingAmount: number,
  movements: Array<{ type: "sale" | "supply" | "withdrawal" | "adjustment" | "cancellation" | "return"; amount: number; paymentMethod?: PaymentMethod | null }>,
) {
  const balance = movements.reduce((total, movement) => {
    if (["sale", "cancellation", "return"].includes(movement.type) && movement.paymentMethod && movement.paymentMethod !== "cash") {
      return total;
    }
    const direction = movement.type === "withdrawal" || movement.type === "cancellation" || movement.type === "return" ? -1 : 1;
    return total + direction * movement.amount;
  }, openingAmount);
  return Math.round(balance * 100) / 100;
}

export function resolveAccountPayableStatus(status: "open" | "paid" | "overdue" | "cancelled", dueDate: string, today: string) {
  return status === "open" && dueDate < today ? "overdue" : status;
}
