import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import { PageHeader } from "@/components/PageHeader";
import { QueryAlert } from "@/components/QueryAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { resolveEffectivePrice } from "@/lib/effectivePrice";
import { trpc } from "@/lib/trpc";
import { Barcode, CheckCircle2, Loader2, PackageSearch, Search, Tag, Warehouse } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProductResult = {
  id: number;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  unit: string;
  salePrice: string | number;
  stockQuantity: string | number;
};

export default function PriceCheck() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const { data: products, isFetching: isSearching, error: productsError, refetch } = trpc.catalog.products.list.useQuery({ search }, { enabled: search.trim().length >= 2 });
  const { data: activePromotions, isLoading: promotionsLoading, error: promotionsError, refetch: refetchPromotions } = trpc.pricing.active.useQuery();

  const selectProduct = (product: ProductResult) => {
    setSelectedProduct(product);
    setSearch(product.barcode || product.internalCode || product.name);
  };

  const scanProduct = trpc.catalog.products.scan.useMutation({
    onSuccess: product => {
      if (!product) {
        toast.error("Nenhum produto ativo foi encontrado para este código.");
        return;
      }
      selectProduct(product);
      toast.success(`Preço de ${product.name} encontrado.`);
    },
    onError: error => toast.error(error.message),
  });

  const lookupBarcode = () => {
    const code = search.trim();
    if (code.length < 3) {
      toast.error("Informe ou leia um código de barras válido.");
      return;
    }
    scanProduct.mutate({ code });
  };

  const scanFromCamera = (code: string) => {
    setSearch(code);
    scanProduct.mutate({ code });
  };

  const { promotion: activePromotion, price: effectivePrice } = selectedProduct ? resolveEffectivePrice(selectedProduct.id, selectedProduct.salePrice, activePromotions) : { promotion: undefined, price: 0 };

  return <div className="mx-auto max-w-[1120px]">
    <PageHeader eyebrow="Operação" title="Conferência de preço" description="Consulte o valor vigente da etiqueta de gôndola sem iniciar uma venda. Use o leitor, a câmera ou a busca por nome e código." />

    <section className="overflow-hidden rounded-2xl border border-[#e3dcc6] bg-white shadow-[0_12px_32px_rgba(37,59,48,0.07)]">
      <div className="bg-[#101a20] px-5 py-5 text-white sm:px-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d8aa21]/15 text-[#f3bd32]"><Tag className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3bd32]">Consulta independente</p><h2 className="mt-1 font-serif text-xl font-semibold">Valor certo para a gôndola</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">A consulta considera promoções ativas e não cria carrinho, venda, movimento de caixa ou baixa de estoque.</p></div>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        {(productsError || promotionsError) ? <QueryAlert message="Não foi possível carregar todos os dados da conferência. Tente novamente antes de usar o preço exibido." onRetry={() => { void refetch(); void refetchPromotions(); }} /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b9a93]" /><Input autoFocus value={search} onChange={event => { setSearch(event.target.value); setSelectedProduct(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); lookupBarcode(); } }} placeholder="Escaneie ou busque por nome e código" className="h-13 rounded-xl border-[#cfd9d1] bg-[#fbfcfa] pl-12 pr-11 text-base shadow-none focus-visible:ring-[#b78311]" /><Barcode className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /></div>
          <Button type="button" onClick={lookupBarcode} disabled={scanProduct.isPending} className="h-13 rounded-xl bg-[#b78311] px-5 font-bold text-white hover:bg-[#956b0d]">{scanProduct.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Barcode className="mr-2 h-4 w-4" />}Consultar</Button>
          <BarcodeScannerButton onDetected={scanFromCamera} label="Câmera" />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Leitor USB ou Bluetooth: mantenha o campo ativo, escaneie o código e use Enter para consultar. A busca por texto começa com dois caracteres.</p>

        {search.trim().length >= 2 && !selectedProduct ? <div className="mt-4 overflow-hidden rounded-xl border border-[#e1e8e1] bg-white">{isSearching ? <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Pesquisando produtos...</div> : products?.length ? products.map(product => <button type="button" onClick={() => selectProduct(product)} key={product.id} className="flex w-full items-center justify-between gap-4 border-b border-[#edf0ed] px-4 py-3 text-left last:border-0 hover:bg-[#fffaf0]"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#294239]">{product.name}</span><span className="mt-0.5 block text-xs text-slate-500">{product.barcode || product.internalCode || "Sem código"} · {formatQuantity(product.stockQuantity)} {product.unit}</span></span><strong className="shrink-0 text-sm text-[#8b6100]">{formatCurrency(product.salePrice)}</strong></button>) : <div className="px-4 py-6 text-sm text-slate-500">Nenhum produto ativo corresponde à busca.</div>}</div> : null}

        <div className="mt-6 min-h-[300px] rounded-2xl border border-dashed border-[#cbd8cd] bg-[#fafcf9] p-4 sm:p-6">
          {selectedProduct ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch"><div className="rounded-2xl border border-[#e5e9e5] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff2ca] text-[#9b6b00]"><PackageSearch className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Produto encontrado</p><h2 className="mt-1 break-words font-serif text-2xl font-semibold text-[#17332c]">{selectedProduct.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedProduct.barcode || selectedProduct.internalCode || "Sem código informado"} · vendido por {selectedProduct.unit}</p></div></div><div className="mt-7 border-t border-[#edf0ed] pt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Preço vigente</p>{promotionsLoading ? <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Conferindo promoções ativas...</div> : <><strong className="mt-2 block font-serif text-4xl tracking-tight text-[#17332c]">{formatCurrency(effectivePrice)}</strong><p className="mt-2 text-sm text-slate-500">por {selectedProduct.unit}</p></>}</div></div><aside className={`rounded-2xl p-5 ${activePromotion ? "border border-[#ddc165] bg-[#fff9e8]" : "border border-[#dce5dd] bg-[#f4f8f4]"}`}><p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${activePromotion ? "text-[#896000]" : "text-[#517060]"}`}>{activePromotion ? "Promoção vigente" : "Preço regular"}</p>{activePromotion ? <><h3 className="mt-2 font-serif text-xl font-semibold text-[#5c430a]">{activePromotion.name}</h3><p className="mt-2 text-sm leading-6 text-[#725e2b]">De {formatCurrency(selectedProduct.salePrice)} por <strong>{formatCurrency(activePromotion.promotionalPrice)}</strong>.</p><p className="mt-3 text-xs text-[#80682d]">O valor promocional já está considerado no preço vigente.</p></> : <><h3 className="mt-2 font-serif text-xl font-semibold text-[#294239]">Sem promoção ativa</h3><p className="mt-2 text-sm leading-6 text-[#5f7265]">A etiqueta deve indicar o preço de venda cadastrado.</p></>}<div className="mt-5 flex items-center gap-2 border-t border-black/5 pt-4 text-sm text-[#486154]"><Warehouse className="h-4 w-4 text-[#698373]" /><span>Estoque atual: <strong>{formatQuantity(selectedProduct.stockQuantity)} {selectedProduct.unit}</strong></span></div></aside></div> : <div className="flex min-h-[250px] flex-col items-center justify-center px-4 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff2ca] text-[#9b6b00]"><Tag className="h-6 w-6" /></span><h2 className="mt-5 font-serif text-xl font-semibold text-[#17332c]">Pronto para conferir um preço.</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Leia um código de barras ou procure o produto pelo nome. O valor será apresentado aqui sem alterar a operação da loja.</p><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e8f4ea] px-3 py-1.5 text-xs font-semibold text-[#2d7455]"><CheckCircle2 className="h-3.5 w-3.5" />Nenhuma venda será registrada</span></div>}
        </div>
      </div>
    </section>
  </div>;
}
