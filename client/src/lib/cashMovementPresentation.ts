export type CashMovementType = "sale" | "supply" | "withdrawal" | "adjustment" | "cancellation" | "return";

const labels: Record<CashMovementType, string> = {
  sale: "Venda",
  supply: "Suprimento",
  withdrawal: "Sangria",
  adjustment: "Ajuste",
  cancellation: "Cancelamento",
  return: "Devolução",
};

export function getCashMovementPresentation(type: CashMovementType) {
  const isOutflow = type === "withdrawal" || type === "cancellation" || type === "return";
  return { label: labels[type], isOutflow, sign: isOutflow ? "−" : "+" };
}
