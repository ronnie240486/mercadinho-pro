export function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));
}

export function formatQuantity(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(toNumber(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
