import { PageHeader, PrimaryAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Flag, Loader2, Plus, Target } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const today = new Date().toISOString().slice(0, 10);
const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

export default function SalesGoals() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "Meta mensal", startsOn: today, endsOn: endOfMonth, targetAmount: "" });
  const utils = trpc.useUtils();
  const { data: goals, isLoading, error, refetch } = trpc.loyalty.goals.useQuery();
  const createGoal = trpc.loyalty.createGoal.useMutation({
    onSuccess: async () => {
      await utils.loyalty.goals.invalidate();
      setOpen(false);
      setForm({ name: "Meta mensal", startsOn: today, endsOn: endOfMonth, targetAmount: "" });
      toast.success("Meta de vendas criada.");
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createGoal.mutate({ ...form, targetAmount: Number(form.targetAmount) });
  };

  return <div className="mx-auto max-w-[1200px]">
    <PageHeader eyebrow="Desempenho" title="Metas de vendas" description="Defina objetivos por período e acompanhe, em tempo real, quanto falta para a equipe alcançá-los." action={<PrimaryAction onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova meta</PrimaryAction>} />
    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Não foi possível carregar as metas. <button onClick={() => refetch()} className="font-bold underline">Tentar novamente</button></div> : isLoading ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando metas...</div> : goals?.length ? <section className="grid gap-5 md:grid-cols-2">{goals.map(goal => { const achieved = goal.progressPercent >= 100; return <article key={goal.id} className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_10px_28px_rgba(16,24,32,0.06)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${achieved ? "bg-emerald-100 text-emerald-800" : "bg-[#fff0c5] text-[#a36c00]"}`}><Target className="h-5 w-5" /></span><h2 className="mt-4 font-serif text-xl font-semibold text-[#101820]">{goal.name}</h2><p className="mt-1 text-xs text-slate-500">{goal.startsOn.split("-").reverse().join("/")} a {goal.endsOn.split("-").reverse().join("/")}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${achieved ? "bg-emerald-100 text-emerald-800" : "bg-[#fff0c5] text-[#a36c00]"}`}>{achieved ? "Meta alcançada" : `${goal.progressPercent}%`}</span></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-[#edf0f2]"><div className={`h-full rounded-full transition-all ${achieved ? "bg-emerald-500" : "bg-[#e3aa14]"}`} style={{ width: `${goal.progressPercent}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Realizado</p><p className="mt-1 font-serif text-2xl font-semibold text-[#101820]">{formatCurrency(goal.currentAmount)}</p><p className="mt-1 text-xs text-slate-500">{goal.salesCount} venda(s)</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Objetivo</p><p className="mt-1 font-serif text-2xl font-semibold text-[#101820]">{formatCurrency(goal.targetAmount)}</p><p className="mt-1 text-xs text-slate-500">Faltam {formatCurrency(Math.max(0, Number(goal.targetAmount) - goal.currentAmount))}</p></div></div></article>; })}</section> : <section className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8dde3] bg-white px-5 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0c5] text-[#a36c00]"><Flag className="h-6 w-6" /></span><h2 className="mt-5 font-serif text-xl font-semibold text-[#101820]">Ainda não há metas cadastradas.</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Crie uma meta semanal, mensal ou de campanha para acompanhar a evolução das vendas.</p><Button onClick={() => setOpen(true)} className="mt-6 h-11 rounded-xl bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]"><Plus className="mr-2 h-4 w-4" />Criar primeira meta</Button></section>}
    <Dialog open={open} onOpenChange={isOpen => !isOpen && setOpen(false)}><DialogContent className="rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#101820]">Nova meta de vendas</DialogTitle><DialogDescription>O progresso considera somente as vendas concluídas dentro do período informado.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4 pt-2"><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Nome da meta</span><Input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex.: Campanha de setembro" className="h-11 rounded-xl" /></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Início</span><Input required type="date" value={form.startsOn} onChange={event => setForm(current => ({ ...current, startsOn: event.target.value }))} className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Fim</span><Input required type="date" min={form.startsOn} value={form.endsOn} onChange={event => setForm(current => ({ ...current, endsOn: event.target.value }))} className="h-11 rounded-xl" /></label></div><label><span className="mb-1.5 block text-sm font-semibold text-[#101820]">Objetivo de faturamento (R$)</span><Input required type="number" min="0.01" step="0.01" value={form.targetAmount} onChange={event => setForm(current => ({ ...current, targetAmount: event.target.value }))} placeholder="0,00" className="h-11 rounded-xl" /></label><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-xl">Cancelar</Button><Button disabled={createGoal.isPending} className="h-11 rounded-xl bg-[#e3aa14] text-[#101820] hover:bg-[#f5c243]">{createGoal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar meta</Button></div></form></DialogContent></Dialog>
  </div>;
}
