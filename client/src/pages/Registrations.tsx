import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, PrimaryAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Building2, ContactRound, Loader2, Plus, Tags, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type DialogMode = "supplier" | "customer" | "category" | "users" | null;

export default function Registrations() {
  const [mode, setMode] = useState<DialogMode>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const suppliers = trpc.catalog.suppliers.list.useQuery();
  const customers = trpc.catalog.customers.list.useQuery();
  const categories = trpc.catalog.categories.list.useQuery();
  const team = trpc.users.list.useQuery(undefined, { enabled: isAdmin });
  const createSupplier = trpc.catalog.suppliers.create.useMutation({ onSuccess: async () => { await utils.catalog.suppliers.list.invalidate(); finish("Fornecedor cadastrado."); }, onError: error => toast.error(error.message) });
  const createCustomer = trpc.catalog.customers.create.useMutation({ onSuccess: async () => { await utils.catalog.customers.list.invalidate(); finish("Cliente cadastrado."); }, onError: error => toast.error(error.message) });
  const createCategory = trpc.catalog.categories.create.useMutation({ onSuccess: async () => { await utils.catalog.categories.list.invalidate(); finish("Categoria cadastrada."); }, onError: error => toast.error(error.message) });
  const updateRole = trpc.users.updateRole.useMutation({ onSuccess: async () => { await team.refetch(); toast.success("Permissão atualizada."); }, onError: error => toast.error(error.message) });
  const busy = createSupplier.isPending || createCustomer.isPending || createCategory.isPending;
  const finish = (message?: string) => { setMode(null); setName(""); setContact(""); if (message) toast.success(message); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (mode === "supplier") createSupplier.mutate({ legalName: name, contactName: contact || undefined }); if (mode === "customer") createCustomer.mutate({ name, phone: contact || undefined }); if (mode === "category") createCategory.mutate({ name, description: contact || undefined }); };
  const dialogTitle = mode === "supplier" ? "Novo fornecedor" : mode === "customer" ? "Novo cliente" : "Nova categoria";
  const primaryLabel = mode === "supplier" ? "Razão social ou nome" : mode === "customer" ? "Nome do cliente" : "Nome da categoria";
  const secondaryLabel = mode === "supplier" ? "Contato" : mode === "customer" ? "Telefone" : "Descrição";
  const cards = [
    { key: "supplier" as const, title: "Fornecedores", description: "Empresas, contatos e condições de compra.", icon: Building2, count: suppliers.data?.length ?? 0, action: "Novo fornecedor" },
    { key: "customer" as const, title: "Clientes", description: "Dados que podem ser vinculados às vendas.", icon: ContactRound, count: customers.data?.length ?? 0, action: "Novo cliente" },
    { key: "category" as const, title: "Categorias", description: "Organize seus produtos para buscar e analisar.", icon: Tags, count: categories.data?.length ?? 0, action: "Nova categoria" },
  ];

  return <div className="mx-auto max-w-[1480px]"><PageHeader eyebrow="Base operacional" title="Cadastros" description="Mantenha fornecedores, clientes e categorias organizados para registrar compras, estoque e vendas com contexto." action={isAdmin ? <PrimaryAction onClick={() => setMode("users")}><UsersRound className="mr-2 h-4 w-4" />Gerenciar usuários</PrimaryAction> : undefined} />
    <section className="grid gap-5 md:grid-cols-3">{cards.map(card => <article key={card.title} className="rounded-2xl border border-white/80 bg-white p-6 shadow-[0_10px_28px_rgba(37,59,48,0.06)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f3e9] text-emerald-800"><card.icon className="h-6 w-6" /></span><h2 className="mt-6 font-serif text-2xl font-semibold text-[#17332c]">{card.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{card.description}</p><div className="mt-6 flex items-center justify-between border-t border-[#e5ebe5] pt-5"><span className="text-sm font-semibold text-slate-500">{card.count} cadastrado(s)</span><Button onClick={() => setMode(card.key)} variant="ghost" className="h-9 rounded-lg px-2 text-emerald-800 hover:bg-[#edf5ee] hover:text-emerald-950"><Plus className="mr-1 h-4 w-4" />{card.action}</Button></div></article>)}</section>
    <section className="mt-6 rounded-2xl border border-[#dce6dd] bg-[#eef5ee] p-5 sm:flex sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm font-semibold text-[#244334]">Controle de usuários e permissões</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">A equipe usa papéis de administrador, gerente, operador e estoquista. Os recursos sensíveis são liberados conforme a responsabilidade de cada pessoa.</p></div>{isAdmin ? <Button onClick={() => setMode("users")} variant="outline" className="mt-4 h-10 rounded-xl border-[#bfcebf] bg-white text-[#244334] hover:bg-[#e5f0e6] sm:mt-0">Configurar acessos</Button> : <span className="mt-4 text-xs font-semibold text-emerald-800 sm:mt-0">Somente administradores podem alterar acessos.</span>}</section>
    <Dialog open={mode !== null} onOpenChange={open => !open && finish()}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">{mode === "users" ? <><DialogHeader><DialogTitle className="font-serif text-2xl text-[#17332c]">Equipe e permissões</DialogTitle><DialogDescription>Defina o papel de cada pessoa que já acessou o sistema.</DialogDescription></DialogHeader>{team.isLoading ? <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando equipe...</div> : team.data?.length ? <div className="divide-y divide-[#e7ece7]">{team.data.map(member => <div key={member.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_150px]"><div><p className="text-sm font-semibold text-[#294239]">{member.name || "Usuário sem nome"}</p><p className="mt-1 text-xs text-slate-500">{member.email || "Sem e-mail"} · Acesso: {formatDate(member.lastSignedIn)}</p></div><select disabled={updateRole.isPending || member.id === user?.id} defaultValue={member.role === "user" ? "operator" : member.role} onChange={event => updateRole.mutate({ userId: member.id, role: event.target.value as "admin" | "manager" | "operator" | "stockist" })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"><option value="admin">Administrador</option><option value="manager">Gerente</option><option value="operator">Operador</option><option value="stockist">Estoquista</option></select></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">Ainda não existem usuários cadastrados.</p>}</> : <><DialogHeader><DialogTitle className="font-serif text-2xl text-[#17332c]">{dialogTitle}</DialogTitle><DialogDescription>Cadastre as informações essenciais agora. Outros dados poderão ser incluídos conforme a operação evoluir.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4 pt-2"><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">{primaryLabel}</span><Input required autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={mode === "category" ? "Ex.: Bebidas" : "Informe o nome"} className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-semibold text-[#294239]">{secondaryLabel}</span><Input value={contact} onChange={event => setContact(event.target.value)} placeholder="Opcional" className="h-11 rounded-xl" /></label><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => finish()} className="h-11 rounded-xl">Cancelar</Button><Button disabled={busy} className="h-11 rounded-xl bg-[#164e3d] text-white hover:bg-[#0f4032]">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar cadastro</Button></div></form></>}</DialogContent></Dialog>
  </div>;
}
