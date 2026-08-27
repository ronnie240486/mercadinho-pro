import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportPreview, parseProductCsv } from "@/lib/productCsvImport";
import { formatCurrency, toNumber } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import JsBarcode from "jsbarcode";
import { CheckSquare, FileSpreadsheet, FileUp, Loader2, Printer, ScanBarcode, Square } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character] ?? character);
}

export default function Utilities() {
  const { data: products } = trpc.catalog.products.list.useQuery();
  const utils = trpc.useUtils();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [copies, setCopies] = useState("1");
  const importProducts = trpc.catalog.products.import.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.catalog.products.list.invalidate(), utils.catalog.categories.list.invalidate(), utils.dashboard.summary.invalidate()]);
      setCsv("");
      setPreview(null);
      toast.success(`${result.importedCount} produto(s) importado(s) com sucesso.`);
    },
    onError: error => toast.error(error.message),
  });

  const selectedProducts = useMemo(() => (products ?? []).filter(product => selectedProductIds.has(product.id)), [products, selectedProductIds]);
  const updatePreview = (content: string) => {
    setCsv(content);
    setPreview(parseProductCsv(content));
  };
  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { toast.error("Envie um CSV de até 1,5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => updatePreview(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Não foi possível ler este arquivo.");
    reader.readAsText(file, "UTF-8");
  };
  const toggleProduct = (productId: number) => setSelectedProductIds(current => {
    const next = new Set(current);
    if (next.has(productId)) next.delete(productId); else next.add(productId);
    return next;
  });
  const selectAll = () => setSelectedProductIds(new Set((products ?? []).filter(product => product.barcode || product.internalCode).map(product => product.id)));
  const printLabels = () => {
    if (!selectedProducts.length) { toast.error("Selecione ao menos um produto com código para imprimir."); return; }
    const copiesPerProduct = Math.max(1, Math.min(100, Math.floor(Number(copies) || 1)));
    const printableProducts = selectedProducts.filter(product => product.barcode || product.internalCode);
    if (!printableProducts.length) { toast.error("Os produtos selecionados não possuem código de barras nem código interno."); return; }
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) { toast.error("Permita janelas pop-up para imprimir etiquetas."); return; }
    const labels = printableProducts.flatMap(product => Array.from({ length: copiesPerProduct }, () => {
      const code = product.barcode || product.internalCode || "";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try { JsBarcode(svg, code, { format: "CODE128", displayValue: true, fontSize: 10, margin: 0, height: 34, width: 1.15, lineColor: "#101820" }); }
      catch { return `<article class="label"><strong>${escapeHtml(product.name)}</strong><span class="price">${formatCurrency(product.salePrice)}</span><small>Código indisponível: ${escapeHtml(code)}</small></article>`; }
      return `<article class="label"><strong>${escapeHtml(product.name)}</strong><span class="price">${formatCurrency(product.salePrice)}</span>${svg.outerHTML}</article>`;
    })).join("");
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><title>Etiquetas — Mercadinho Pro</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#101820;margin:0}.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.label{min-height:42mm;border:1px solid #bac1c9;border-radius:3mm;padding:3.5mm;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}.label strong{font-size:10pt;line-height:1.2}.price{font-size:17pt;font-weight:800;color:#a36c00;margin:2mm 0 1mm}.label svg{width:100%;height:auto;max-height:13mm}.label small{font-size:8pt}</style></head><body><main class="sheet">${labels}</main><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
    printWindow.document.close();
  };

  return <div className="mx-auto max-w-[1200px]">
    <PageHeader eyebrow="Produtividade" title="Importação e etiquetas" description="Importe o catálogo com uma prévia antes de gravar e gere etiquetas de preço com código de barras para os produtos selecionados." />
    <section className="grid gap-6 xl:grid-cols-2">
      <article className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_10px_28px_rgba(16,24,32,0.06)] sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0c5] text-[#a36c00]"><FileSpreadsheet className="h-5 w-5" /></span><h2 className="mt-4 font-serif text-xl font-semibold text-[#101820]">Importar catálogo CSV</h2><p className="mt-2 text-sm leading-6 text-slate-500">Envie um arquivo ou cole os dados. A primeira linha pode usar os campos <strong>Nome; Código de barras; Código interno; Categoria; Unidade; Custo; Preço de venda; Estoque mínimo</strong>. Também aceitamos o formato simples: nome; código; venda; mínimo.</p><label className="mt-5 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#d3b25a] bg-[#fffaf0] px-4 text-sm font-semibold text-[#a36c00] hover:bg-[#fff0c5]"><FileUp className="h-4 w-4" />Selecionar arquivo CSV<Input type="file" accept=".csv,text/csv,text/plain" onChange={loadFile} className="sr-only" /></label><textarea value={csv} onChange={event => updatePreview(event.target.value)} placeholder="Nome;Código de barras;Categoria;Unidade;Custo;Preço de venda;Estoque mínimo&#10;Arroz tipo 1;7891234567890;Mercearia;PCT;18,50;24,90;5" className="mt-4 min-h-32 w-full rounded-xl border border-[#d9dfe5] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#e3aa14] focus:ring-2 focus:ring-[#e3aa14]/20" />{preview ? <div className="mt-4 rounded-xl border border-[#e0e5ea] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#101820]">Prévia: {preview.items.length} produto(s) válido(s)</p><span className="text-xs text-slate-500">{preview.detectedHeader ? "Cabeçalho identificado" : "Formato simples"}</span></div>{preview.items.length ? <div className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs text-slate-600">{preview.items.slice(0, 8).map((item, index) => <p key={`${item.name}-${index}`}>{item.name} · {item.unit} · {formatCurrency(item.salePrice)} · mínimo {item.minimumStock}</p>)}{preview.items.length > 8 ? <p>+ {preview.items.length - 8} produto(s) na prévia</p> : null}</div> : null}{preview.errors.length ? <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{preview.errors.slice(0, 4).map(error => <p key={error}>{error}</p>)}{preview.errors.length > 4 ? <p>+ {preview.errors.length - 4} erro(s)</p> : null}</div> : null}<Button onClick={() => importProducts.mutate({ items: preview.items })} disabled={!preview.items.length || preview.errors.length > 0 || importProducts.isPending} className="mt-4 h-11 w-full rounded-xl bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]">{importProducts.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar {preview.items.length} produto(s)</Button></div> : null}</article>
      <article className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_10px_28px_rgba(16,24,32,0.06)] sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0c5] text-[#a36c00]"><Printer className="h-5 w-5" /></span><h2 className="mt-4 font-serif text-xl font-semibold text-[#101820]">Etiquetas com código de barras</h2><p className="mt-2 text-sm leading-6 text-slate-500">Selecione os itens com código de barras ou código interno. O sistema gera uma folha A4 com preço, nome e código escaneável.</p><div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#101820]">{selectedProducts.length} selecionado(s)</p><Button variant="outline" size="sm" onClick={selectAll} className="h-9 rounded-lg"><CheckSquare className="mr-1.5 h-3.5 w-3.5" />Selecionar com código</Button></div><div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-[#e0e5ea]">{products?.length ? products.map(product => { const selected = selectedProductIds.has(product.id); const hasCode = Boolean(product.barcode || product.internalCode); return <label key={product.id} className={`flex cursor-pointer items-center gap-3 border-b border-[#edf0f2] px-3 py-3 last:border-0 ${hasCode ? "" : "opacity-50"}`}><input type="checkbox" checked={selected} disabled={!hasCode} onChange={() => toggleProduct(product.id)} className="h-4 w-4 accent-[#e3aa14]" />{selected ? <CheckSquare className="h-4 w-4 text-[#a36c00]" /> : <Square className="h-4 w-4 text-slate-400" />}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#101820]">{product.name}</span><span className="mt-0.5 block text-xs text-slate-500">{product.barcode || product.internalCode || "Sem código"} · {formatCurrency(product.salePrice)}</span></span></label>; }) : <div className="p-5 text-center text-sm text-slate-500">Cadastre produtos para gerar etiquetas.</div>}</div><div className="mt-4 flex items-end gap-3"><label className="w-28"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Cópias por item</span><Input type="number" min="1" max="100" value={copies} onChange={event => setCopies(event.target.value)} className="h-11 rounded-xl" /></label><Button onClick={printLabels} disabled={!selectedProducts.length} className="h-11 flex-1 rounded-xl bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]"><ScanBarcode className="mr-2 h-4 w-4" />Gerar etiquetas</Button></div></article>
    </section>
  </div>;
}
