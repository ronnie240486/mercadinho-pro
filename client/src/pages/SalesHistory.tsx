import { PageHeader } from "@/components/PageHeader";
import { QueryAlert } from "@/components/QueryAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatQuantity, toNumber } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Ban, CornerUpLeft, History, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SelectedSale = { id: number; code: string; totalAmount: string; status: "completed" | "cancelled" } | null;
type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "voucher" | "other";

const refundMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "voucher", label: "Vale" },
  { value: "other", label: "Outro" },
];

export default function SalesHistory() {
  const [selectedSale, setSelectedSale] = useState<SelectedSale>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const canManageSensitiveOperations = user?.role === "admin" || user?.role === "manager";
  const { data: sales, isLoading, error, refetch } = trpc.sales.listRecent.useQuery();
  const { data: returnItems, isLoading: loadingItems } = trpc.sales.itemsForReturn.useQuery({ saleId: selectedSale?.id ?? 1 }, { enabled: returnOpen && Boolean(selectedSale) });
  const cancelSale = trpc.sales.cancel.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.sales.listRecent.invalidate(), utils.catalog.products.list.invalidate(), utils.cash.status.invalidate(), utils.cash.movements.invalidate(), utils.dashboard.summary.invalidate(), utils.reports.overview.invalidate()]);
      setCancelOpen(false);
      setSelectedSale(null);
      setReason("");
      toast.success("Venda cancelada com estorno de estoque e caixa registrado.");
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const createReturn = trpc.sales.createReturn.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.sales.listRecent.invalidate(), utils.catalog.products.list.invalidate(), utils.cash.status.invalidate(), utils.cash.movements.invalidate(), utils.dashboard.summary.invalidate(), utils.reports.overview.invalidate()]);
      setReturnOpen(false);
      setSelectedSale(null);
      setReason("");
      setQuantities({});
      toast.success(`Devolução ${result.code} registrada: ${formatCurrency(result.totalAmount)}.`);
    },
    onError: mutationError => toast.error(mutationError.message),
  });

  useEffect(() => {
    if (!returnItems) return;
    setQuantities(Object.fromEntries(returnItems.map(item => [item.id, "0"])));
  }, [returnItems]);

  const selectedTotal = useMemo(() => (returnItems ?? []).reduce((total, item) => {
    const availableQuantity = Math.max(0, toNumber(item.quantity) - toNumber(item.returnedQuantity));
    const requestedQuantity = Math.min(Math.max(Number(quantities[item.id]) || 0, 0), availableQuantity);
    const amount = toNumber(item.quantity) > 0 ? toNumber(item.totalAmount) * (requestedQuantity / toNumber(item.quantity)) : 0;
    return total + amount;
  }, 0), [quantities, returnItems]);

  const openReturn = (sale: NonNullable<SelectedSale>) => {
    setSelectedSale(sale);
    setReason("");
    setRefundMethod("cash");
    setQuantities({});
    setReturnOpen(true);
  };
  const openCancel = (sale: NonNullable<SelectedSale>) => {
    setSelectedSale(sale);
    setReason("");
    setCancelOpen(true);
  };
  const submitReturn = () => {
    if (!selectedSale) return;
    const items = Object.entries(quantities).map(([saleItemId, quantity]) => ({ saleItemId: Number(saleItemId), quantity: Number(quantity) })).filter(item => item.quantity > 0);
    if (!items.length) {
      toast.error("Informe a quantidade devolvida de ao menos um item.");
      return;
    }
    createReturn.mutate({ saleId: selectedSale.id, reason, refundMethod, items });
  };

  return <div className="mx-auto max-w-[1480px]">
    <PageHeader eyebrow="Operação" title="Histórico de vendas" description="Consulte vendas concluídas e registre cancelamentos ou devoluções com impacto rastreável no estoque, nos lotes e no caixa." />
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_10px_28px_rgba(16,24,32,0.06)]">
      <div className="hidden grid-cols-[150px_1fr_150px_140px_240px] gap-4 border-b border-[#e5e8ec] bg-[#f7f8fa] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 lg:grid"><span>Venda</span><span>Data</span><span>Total</span><span>Status</span><span>Ações</span></div>
      {error ? <div className="p-5"><QueryAlert message="Não foi possível carregar o histórico de vendas." onRetry={() => refetch()} /></div> : isLoading ? <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando vendas...</div> : sales?.length ? <div>{sales.map(sale => <article key={sale.id} className="grid gap-3 border-b border-[#edf0f2] px-5 py-4 last:border-0 lg:grid-cols-[150px_1fr_150px_140px_240px] lg:items-center lg:gap-4"><div><p className="text-sm font-bold text-[#101820]">{sale.code}</p><p className="mt-1 text-xs text-slate-500 lg:hidden">{new Date(sale.createdAt).toLocaleString("pt-BR")}</p></div><span className="hidden text-sm text-slate-600 lg:block">{new Date(sale.createdAt).toLocaleString("pt-BR")}</span><span className="text-sm font-semibold text-[#101820]">{formatCurrency(sale.totalAmount)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${sale.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{sale.status === "completed" ? "Concluída" : "Cancelada"}</span><div className="flex flex-wrap gap-2">{sale.status === "completed" && canManageSensitiveOperations ? <><Button size="sm" onClick={() => openReturn(sale)} className="h-9 rounded-lg bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Devolver</Button><Button size="sm" variant="outline" onClick={() => openCancel(sale)} className="h-9 rounded-lg border-[#d8dde3] text-slate-700"><Ban className="mr-1.5 h-3.5 w-3.5" />Cancelar</Button></> : sale.status === "completed" ? <span className="text-xs leading-5 text-slate-500">Cancelamento e devolução exigem gerente ou administrador.</span> : <span className="text-xs text-slate-500">Sem novas ações</span>}</div></article>)}</div> : <div className="flex min-h-[360px] flex-col items-center justify-center px-5 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0c5] text-[#a36c00]"><History className="h-6 w-6" /></span><h2 className="mt-5 font-serif text-xl font-semibold text-[#101820]">Nenhuma venda registrada.</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">As vendas concluídas no PDV aparecerão aqui com seus dados operacionais.</p></div>}
    </section>
    <Dialog open={returnOpen} onOpenChange={isOpen => !isOpen && setReturnOpen(false)}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#101820]">Registrar devolução</DialogTitle><DialogDescription>Venda {selectedSale?.code}. Informe somente os itens efetivamente retornados e o meio de reembolso.</DialogDescription></DialogHeader>{loadingItems ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando itens da venda...</div> : <div className="space-y-4 pt-2"><div className="overflow-hidden rounded-xl border border-[#dfe3e8]">{returnItems?.map(item => { const available = Math.max(0, toNumber(item.quantity) - toNumber(item.returnedQuantity)); return <div key={item.id} className="grid gap-2 border-b border-[#edf0f2] p-3 last:border-0 sm:grid-cols-[1fr_130px]"><div><p className="text-sm font-semibold text-[#101820]">{item.productName}</p><p className="mt-1 text-xs text-slate-500">Vendido: {formatQuantity(item.quantity)} · Já devolvido: {formatQuantity(item.returnedQuantity)} · Disponível: {formatQuantity(available)}</p></div><label><span className="sr-only">Quantidade a devolver</span><Input type="number" min="0" max={available} step="0.001" value={quantities[item.id] ?? "0"} disabled={available === 0} onChange={event => setQuantities(current => ({ ...current, [item.id]: event.target.value }))} className="h-10 rounded-lg" /></label></div>; })}</div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Reembolso por</span><select value={refundMethod} onChange={event => setRefundMethod(event.target.value as PaymentMethod)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{refundMethods.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Motivo</span><Input required minLength={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex.: produto avariado" className="h-11 rounded-xl" /></label></div><div className="flex items-center justify-between rounded-xl bg-[#fff6da] p-4"><span className="flex items-center gap-2 text-sm font-semibold text-[#101820]"><ReceiptText className="h-4 w-4 text-[#a36c00]" />Estimativa antes do desconto original</span><strong className="font-serif text-xl text-[#101820]">{formatCurrency(selectedTotal)}</strong></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setReturnOpen(false)} className="h-11 rounded-xl">Voltar</Button><Button onClick={submitReturn} disabled={createReturn.isPending || reason.trim().length < 3} className="h-11 rounded-xl bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]">{createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar devolução</Button></div></div>}</DialogContent></Dialog>
    <Dialog open={cancelOpen} onOpenChange={isOpen => !isOpen && setCancelOpen(false)}><DialogContent className="rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#101820]">Cancelar venda</DialogTitle><DialogDescription>Venda {selectedSale?.code}. Esta ação estorna todos os itens, lotes e pagamentos da venda de uma única vez.</DialogDescription></DialogHeader><label className="mt-2 block"><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Motivo do cancelamento</span><Input autoFocus required minLength={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex.: venda lançada em duplicidade" className="h-11 rounded-xl" /></label><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCancelOpen(false)} className="h-11 rounded-xl">Voltar</Button><Button onClick={() => selectedSale && cancelSale.mutate({ saleId: selectedSale.id, reason })} disabled={cancelSale.isPending || reason.trim().length < 3} className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">{cancelSale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar cancelamento</Button></div></DialogContent></Dialog>
  </div>;
}
