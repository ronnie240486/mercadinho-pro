import { PageHeader } from "@/components/PageHeader";
import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import { QueryAlert } from "@/components/QueryAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatQuantity, toNumber } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Banknote, Barcode, CreditCard, Loader2, Minus, PackageSearch, Plus, Search, ShoppingBag, Trash2, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "voucher" | "other";
type CartItem = { id: number; name: string; barcode: string | null; unit: string; salePrice: number; stockQuantity: number; quantity: number };

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" }, { value: "debit", label: "Débito" }, { value: "credit", label: "Crédito" }, { value: "pix", label: "PIX" },
];

export default function Pdv() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [discount, setDiscount] = useState("0");
  const utils = trpc.useUtils();
  const { data: cashSession, isLoading: cashLoading, error: cashError, refetch: refetchCash } = trpc.cash.status.useQuery(undefined, { refetchInterval: 15000 });
  const { data: customers } = trpc.catalog.customers.list.useQuery();
  const { data: foundProducts, isFetching: searchLoading } = trpc.catalog.products.list.useQuery({ search }, { enabled: search.trim().length >= 2 });
  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.quantity * item.salePrice, 0), [cart]);
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = Math.round((subtotal - safeDiscount) * 100) / 100;
  const createSale = trpc.sales.create.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.dashboard.summary.invalidate(), utils.catalog.products.list.invalidate(), utils.cash.status.invalidate(), utils.sales.listRecent.invalidate()]);
      setCart([]); setSearch(""); setCustomerId(""); setDiscount("0");
      toast.success(`Venda ${result.code} concluída: ${formatCurrency(result.totalAmount)}.`);
    },
    onError: error => toast.error(error.message),
  });

  const addProduct = (product: NonNullable<typeof foundProducts>[number]) => {
    const stockQuantity = toNumber(product.stockQuantity);
    if (stockQuantity <= 0) { toast.error("Este produto está sem estoque disponível."); return; }
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= stockQuantity) { toast.error("Quantidade indisponível em estoque."); return current; }
        return current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { id: product.id, name: product.name, barcode: product.barcode, unit: product.unit, salePrice: toNumber(product.salePrice), stockQuantity, quantity: 1 }];
    });
    setSearch("");
  };

  const updateQuantity = (productId: number, delta: number) => setCart(current => current.flatMap(item => {
    if (item.id !== productId) return [item];
    const next = item.quantity + delta;
    if (next <= 0) return [];
    if (next > item.stockQuantity) { toast.error("Quantidade indisponível em estoque."); return [item]; }
    return [{ ...item, quantity: next }];
  }));

  const scanProduct = trpc.catalog.products.scan.useMutation({
    onSuccess: product => {
      if (!product) { toast.error("Nenhum produto ativo foi encontrado para este código."); return; }
      addProduct(product);
      toast.success(`${product.name} adicionado ao carrinho.`);
    },
    onError: error => toast.error(error.message),
  });
  const scanCurrentInput = () => {
    const code = search.trim();
    if (code.length < 3) { toast.error("Leia ou informe um código de barras válido."); return; }
    scanProduct.mutate({ code });
  };
  const scanFromCamera = (code: string) => {
    setSearch(code);
    scanProduct.mutate({ code });
  };

  const finalizeSale = () => {
    if (!cashSession) { toast.error("Abra o caixa antes de finalizar uma venda."); return; }
    if (!cart.length) { toast.error("Adicione produtos ao carrinho antes de finalizar."); return; }
    createSale.mutate({ customerId: customerId ? Number(customerId) : null, discountAmount: safeDiscount, items: cart.map(item => ({ productId: item.id, quantity: item.quantity })), payments: [{ method: paymentMethod, amount: total }] });
  };

  return <div className="mx-auto max-w-[1480px]"><PageHeader eyebrow="Operação" title="Frente de caixa" description="Registre uma nova venda, encontre itens por nome ou código de barras e conclua pelo meio de pagamento adequado." action={cashLoading ? <span className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Verificando caixa</span> : <span className={`rounded-lg px-3 py-2 text-xs font-bold ${cashSession ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{cashSession ? "Caixa aberto" : "Caixa fechado"}</span>} />
    {cashError ? <QueryAlert message="Não foi possível consultar o caixa. A finalização de vendas está temporariamente indisponível." onRetry={() => refetchCash()} /> : null}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_390px]"><article className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_10px_28px_rgba(37,59,48,0.06)] sm:p-6"><div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-800/60" /><Input autoFocus value={search} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); scanCurrentInput(); } }} onChange={event => setSearch(event.target.value)} placeholder="Escaneie ou busque por nome e código" className="h-14 rounded-xl border-[#cfd9d1] bg-[#fbfcfa] pl-12 pr-12 text-base shadow-none placeholder:text-slate-400 focus-visible:ring-emerald-700" /><Barcode className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /></div><BarcodeScannerButton onDetected={scanFromCamera} label="Câmera" /></div><p className="mt-2 text-xs text-slate-500">Leitor USB/Bluetooth: deixe este campo ativo, escaneie o código e pressione Enter automaticamente.</p>
      {search.trim().length >= 2 ? <div className="mt-3 overflow-hidden rounded-xl border border-[#e1e8e1] bg-white">{searchLoading ? <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Pesquisando produtos...</div> : foundProducts?.length ? foundProducts.map(product => <button onClick={() => addProduct(product)} key={product.id} className="flex w-full items-center justify-between gap-4 border-b border-[#edf0ed] px-4 py-3 text-left last:border-0 hover:bg-[#f3f8f3]"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#294239]">{product.name}</span><span className="mt-0.5 block text-xs text-slate-500">{product.barcode || product.internalCode || "Sem código"} · {formatQuantity(product.stockQuantity)} {product.unit}</span></span><strong className="shrink-0 text-sm text-emerald-800">{formatCurrency(product.salePrice)}</strong></button>) : <p className="px-4 py-4 text-sm text-slate-500">Nenhum produto encontrado.</p>}</div> : null}
      <div className="mt-5 flex min-h-[370px] flex-col rounded-2xl border border-dashed border-[#cbd8cd] bg-[#fafcf9] px-3 py-4 sm:px-5">{cart.length ? <div className="space-y-2">{cart.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">{item.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#294239]">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{formatCurrency(item.salePrice)} por {item.unit}</p></div><div className="flex items-center gap-1 rounded-lg border border-[#dce5dd] p-0.5"><Button onClick={() => updateQuantity(item.id, -1)} variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-600 hover:bg-[#f0f5f0]"><Minus className="h-3.5 w-3.5" /></Button><span className="w-7 text-center text-sm font-semibold text-[#294239]">{formatQuantity(item.quantity)}</span><Button onClick={() => updateQuantity(item.id, 1)} variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-600 hover:bg-[#f0f5f0]"><Plus className="h-3.5 w-3.5" /></Button></div><p className="w-20 text-right text-sm font-bold text-[#17332c]">{formatCurrency(item.salePrice * item.quantity)}</p></div>)}</div> : <div className="m-auto flex flex-col items-center justify-center px-5 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f3e9] text-emerald-800"><PackageSearch className="h-6 w-6" /></span><h2 className="mt-5 font-serif text-xl font-semibold text-[#17332c]">O carrinho está aguardando itens.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Pesquise um produto acima ou utilize um leitor de código de barras para adicioná-lo à venda.</p></div>}</div>
    </article><aside className="rounded-2xl border border-[#dce6dd] bg-[#173f32] p-5 text-white shadow-[0_16px_36px_rgba(23,63,50,0.18)] sm:p-6"><div className="flex items-start justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100/60">Venda atual</p><h2 className="mt-1 font-serif text-xl font-semibold">Novo atendimento</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><ShoppingBag className="h-5 w-5" /></span></div><label className="mt-5 block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-emerald-50/80"><UserRoundPlus className="h-4 w-4" />Cliente</span><select value={customerId} onChange={event => setCustomerId(event.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none"><option className="text-slate-900" value="">Consumidor final</option>{customers?.map(customer => <option className="text-slate-900" key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-emerald-50/80">Desconto (R$)</span><Input value={discount} type="number" min="0" max={subtotal} step="0.01" onChange={event => setDiscount(event.target.value)} className="h-11 border-white/15 bg-white/5 text-white placeholder:text-emerald-50/40" /></label><div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-emerald-50/70"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-emerald-50/70"><span>Desconto</span><span>- {formatCurrency(safeDiscount)}</span></div><div className="flex items-end justify-between pt-2"><span className="font-medium text-emerald-50/80">Total</span><strong className="font-serif text-3xl tracking-tight">{formatCurrency(total)}</strong></div></div><div className="mt-6 grid grid-cols-2 gap-2">{paymentOptions.map(option => <Button key={option.value} onClick={() => setPaymentMethod(option.value)} variant="outline" className={`h-11 rounded-xl border-white/15 text-xs hover:text-white ${paymentMethod === option.value ? "bg-[#d8f0df] text-[#164e3d] hover:bg-[#d8f0df]" : "bg-white/5 text-white hover:bg-white/10"}`}>{option.value === "cash" ? <Banknote className="mr-1 h-4 w-4" /> : option.value === "debit" || option.value === "credit" ? <CreditCard className="mr-1 h-4 w-4" /> : null}{option.label}</Button>)}</div><Button onClick={finalizeSale} disabled={!cart.length || !cashSession || createSale.isPending} className="mt-5 h-12 w-full rounded-xl bg-[#d8f0df] text-sm font-bold text-[#164e3d] hover:bg-[#c7e8d0] disabled:bg-white/20 disabled:text-white/40">{createSale.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}Finalizar venda</Button><Button onClick={() => setCart([])} disabled={!cart.length} variant="ghost" className="mt-2 h-10 w-full rounded-xl text-emerald-50/70 hover:bg-white/5 hover:text-white"><Trash2 className="mr-2 h-4 w-4" />Cancelar atendimento</Button></aside></section>
  </div>;
}
