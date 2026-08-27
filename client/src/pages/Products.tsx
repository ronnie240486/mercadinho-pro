import { PageHeader, PrimaryAction } from "@/components/PageHeader";
import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import { QueryAlert } from "@/components/QueryAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatQuantity, toNumber } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { BadgePlus, Download, Loader2, PackagePlus, Search, SlidersHorizontal } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type ProductForm = {
  name: string;
  barcode: string;
  internalCode: string;
  categoryId: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
};

type EditableProduct = {
  id: number;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  categoryId: number | null;
  unit: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
};

const initialForm: ProductForm = { name: "", barcode: "", internalCode: "", categoryId: "", unit: "UN", costPrice: "", salePrice: "", minimumStock: "" };

export default function Products() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [barcodeFeedback, setBarcodeFeedback] = useState("");
  const utils = trpc.useUtils();
  const { data: products, isLoading, error, refetch } = trpc.catalog.products.list.useQuery({ search });
  const { data: categories } = trpc.catalog.categories.list.useQuery();

  const completeSave = async (message: string) => {
    await Promise.all([utils.catalog.products.list.invalidate(), utils.dashboard.summary.invalidate()]);
    setForm(initialForm);
    setBarcodeFeedback("");
    setEditingId(null);
    setOpen(false);
    toast.success(message);
  };
  const createProduct = trpc.catalog.products.create.useMutation({ onSuccess: () => completeSave("Produto cadastrado com sucesso."), onError: error => toast.error(error.message) });
  const updateProduct = trpc.catalog.products.update.useMutation({ onSuccess: () => completeSave("Produto atualizado com sucesso."), onError: error => toast.error(error.message) });

  const updateForm = (field: keyof ProductForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  const captureBarcode = (barcode: string) => { updateForm("barcode", barcode); setBarcodeFeedback(`Código ${barcode} capturado. Confira e continue o cadastro.`); };
  const startCreate = () => { setEditingId(null); setForm(initialForm); setBarcodeFeedback(""); setOpen(true); };
  const startEdit = (product: EditableProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      barcode: product.barcode ?? "",
      internalCode: product.internalCode ?? "",
      categoryId: product.categoryId?.toString() ?? "",
      unit: product.unit,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      minimumStock: product.minimumStock,
    });
    setBarcodeFeedback("");
    setOpen(true);
  };
  const exportProducts = () => {
    const header = ["Produto", "Código de barras", "Código interno", "Categoria", "Unidade", "Estoque", "Estoque mínimo", "Custo", "Preço de venda"];
    const rows = (products ?? []).map(product => [product.name, product.barcode ?? "", product.internalCode ?? "", product.categoryName ?? "", product.unit, product.stockQuantity, product.minimumStock, product.costPrice, product.salePrice]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "catalogo-de-produtos.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Catálogo exportado em CSV.");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { name: form.name, barcode: form.barcode || undefined, internalCode: form.internalCode || undefined, categoryId: form.categoryId ? Number(form.categoryId) : null, unit: form.unit, costPrice: Number(form.costPrice), salePrice: Number(form.salePrice), minimumStock: Number(form.minimumStock) };
    if (editingId) updateProduct.mutate({ ...payload, id: editingId, active: true });
    else createProduct.mutate(payload);
  };

  return <div className="mx-auto max-w-[1480px]">
    <PageHeader eyebrow="Catálogo" title="Produtos" description="Centralize os dados de venda e estoque de cada item da loja, com códigos, custos, preços e níveis mínimos." action={<PrimaryAction onClick={startCreate}><PackagePlus className="mr-2 h-4 w-4" />Novo produto</PrimaryAction>} />
    <section className="rounded-2xl border border-white/80 bg-white shadow-[0_10px_28px_rgba(37,59,48,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[#e5ebe5] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto, código ou código de barras" className="h-11 rounded-xl bg-[#fbfcfa] pl-10 text-sm" /></div>
        <div className="flex gap-2"><Button onClick={() => toast.info("A busca por nome e códigos já está disponível. Os filtros avançados serão o próximo incremento.")} variant="outline" className="h-11 rounded-xl border-[#d7e0d8] bg-white text-slate-600"><SlidersHorizontal className="mr-2 h-4 w-4" />Filtros</Button><Button onClick={exportProducts} variant="outline" className="h-11 rounded-xl border-[#d7e0d8] bg-white text-slate-600"><Download className="mr-2 h-4 w-4" />Exportar</Button></div>
      </div>
      <div className="hidden grid-cols-[minmax(200px,2fr)_1fr_110px_120px_120px_110px] gap-4 border-b border-[#e5ebe5] bg-[#f8faf7] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 lg:grid"><span>Produto</span><span>Categoria</span><span>Estoque</span><span>Custo</span><span>Venda</span><span>Ação</span></div>
      {error ? <div className="p-5"><QueryAlert message="Não foi possível carregar o catálogo de produtos." onRetry={() => refetch()} /></div> : isLoading ? <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando catálogo...</div> : products?.length ? <div>{products.map(product => {
        const isLow = toNumber(product.minimumStock) > 0 && toNumber(product.stockQuantity) <= toNumber(product.minimumStock);
        return <div key={product.id} className="grid gap-2 border-b border-[#edf0ed] px-5 py-4 last:border-0 lg:grid-cols-[minmax(200px,2fr)_1fr_110px_120px_120px_110px] lg:items-center lg:gap-4"><div><p className="text-sm font-semibold text-[#294239]">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.barcode || product.internalCode || "Sem código"}</p></div><span className="text-sm text-slate-600">{product.categoryName || "Sem categoria"}</span><span className={`text-sm font-semibold ${isLow ? "text-amber-700" : "text-[#294239]"}`}>{formatQuantity(product.stockQuantity)} {product.unit}</span><span className="text-sm text-slate-600">{formatCurrency(product.costPrice)}</span><span className="text-sm font-semibold text-[#294239]">{formatCurrency(product.salePrice)}</span><button onClick={() => startEdit(product)} className={`w-fit rounded-lg px-2 py-1 text-xs font-semibold ${isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{isLow ? "Estoque baixo" : "Editar"}</button></div>;
      })}</div> : <div className="flex min-h-[390px] flex-col items-center justify-center px-5 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f3e9] text-emerald-800"><BadgePlus className="h-6 w-6" /></span><h2 className="mt-5 font-serif text-xl font-semibold text-[#17332c]">{search ? "Nenhum produto encontrado." : "Seu catálogo ainda está vazio."}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{search ? "Tente buscar por outro nome, código interno ou código de barras." : "Comece pelo produto mais vendido. Depois, informe custos, preço de venda, código e estoque mínimo para operar com segurança."}</p><Button onClick={startCreate} className="mt-6 h-11 rounded-xl bg-[#164e3d] px-5 text-white hover:bg-[#0f4032]"><PackagePlus className="mr-2 h-4 w-4" />Cadastrar primeiro produto</Button></div>}
    </section>
    <Dialog open={open} onOpenChange={isOpen => !isOpen && setOpen(false)}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#17332c]">{editingId ? "Editar produto" : "Cadastrar produto"}</DialogTitle><DialogDescription>Preencha os dados básicos para disponibilizar o item no estoque e no PDV.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4 pt-2 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Nome do produto</span><Input required value={form.name} onChange={event => updateForm("name", event.target.value)} placeholder="Ex.: Arroz tipo 1, 5 kg" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Código de barras</span><div className="flex gap-2"><Input autoFocus value={form.barcode} onKeyDown={event => { if (event.key === "Enter" && event.currentTarget.value.trim()) { event.preventDefault(); captureBarcode(event.currentTarget.value.trim()); } }} onChange={event => { updateForm("barcode", event.target.value); setBarcodeFeedback(""); }} placeholder="Use o leitor ou digite" className="h-11 rounded-xl" /><BarcodeScannerButton onDetected={captureBarcode} label="Câmera" /></div><p aria-live="polite" className="mt-1.5 min-h-5 text-xs text-emerald-800">{barcodeFeedback || "Campo pronto para leitor USB/Bluetooth. Após a leitura, o Enter confirma o código."}</p></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Código interno</span><Input value={form.internalCode} onChange={event => updateForm("internalCode", event.target.value)} placeholder="Opcional" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Categoria</span><select value={form.categoryId} onChange={event => updateForm("categoryId", event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Sem categoria</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Unidade</span><Input required value={form.unit} onChange={event => updateForm("unit", event.target.value)} placeholder="UN" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Preço de custo</span><Input required type="number" min="0" step="0.01" value={form.costPrice} onChange={event => updateForm("costPrice", event.target.value)} placeholder="0,00" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Preço de venda</span><Input required type="number" min="0" step="0.01" value={form.salePrice} onChange={event => updateForm("salePrice", event.target.value)} placeholder="0,00" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">Estoque mínimo</span><Input required type="number" min="0" step="0.001" value={form.minimumStock} onChange={event => updateForm("minimumStock", event.target.value)} placeholder="0" className="h-11 rounded-xl" /></label><div className="flex items-end justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-xl">Cancelar</Button><Button disabled={createProduct.isPending || updateProduct.isPending} className="h-11 rounded-xl bg-[#164e3d] text-white hover:bg-[#0f4032]">{(createProduct.isPending || updateProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Salvar alterações" : "Salvar produto"}</Button></div></form></DialogContent></Dialog>
  </div>;
}
