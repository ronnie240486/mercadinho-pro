export type ShelfLifeInfo = { label: string; tone: string; days: number | null };

export function getShelfLifeInfo(value: string | null, referenceDate = new Date()): ShelfLifeInfo {
  if (!value) return { label: "Sem validade", tone: "bg-slate-100 text-slate-700", days: null };
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  const days = Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return { label: "Vencido", tone: "bg-rose-100 text-rose-800", days };
  if (days === 0) return { label: "Vence hoje", tone: "bg-amber-100 text-amber-800", days };
  if (days <= 7) return { label: `${days} dia(s)`, tone: "bg-amber-100 text-amber-800", days };
  return { label: value.split("-").reverse().join("/"), tone: "bg-emerald-100 text-emerald-800", days };
}
