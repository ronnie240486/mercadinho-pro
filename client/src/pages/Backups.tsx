import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, FileClock, HardDriveDownload, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Ainda não realizado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function Backups() {
  const { data, isLoading } = trpc.backups.status.useQuery();
  const connected = data?.connection?.status === "active";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-[#e2e6eb] bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#a36c00]">Proteção de dados</p>
          <h1 className="font-serif text-3xl font-semibold text-[#101820]">Backup da sua instalação</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">Conecte o Google Drive deste mercado para guardar cópias diárias separadas. Nenhuma outra instalação acessa esta configuração.</p>
        </div>
        <Badge className={connected ? "w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "w-fit bg-amber-100 text-amber-800 hover:bg-amber-100"}>{connected ? "Drive conectado" : "Drive não conectado"}</Badge>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#e2e6eb] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4d6] text-[#a36c00]"><Cloud className="h-5 w-5" /></span><div><CardTitle>Google Drive desta loja</CardTitle><CardDescription>Uma autorização por instalação, em uma pasta exclusiva de backup.</CardDescription></div></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p className="text-sm text-slate-500">Carregando proteção da instalação…</p> : connected ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <p className="font-semibold">Conta conectada{data?.connection?.googleEmail ? `: ${data.connection.googleEmail}` : ""}</p>
                <p className="mt-1">Pasta: {data?.connection?.folderName}. Última cópia: {formatDate(data?.connection?.lastBackupAt)}.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">A cópia diária ainda não está ativa.</p><p className="mt-1">Ao conectar, você será direcionado ao login Google para autorizar somente os backups desta instalação.</p></div>
            )}
            <Button className="h-11 w-full bg-[#d99d08] text-[#101820] hover:bg-[#edbc35] sm:w-auto" onClick={() => { window.location.assign("/api/google-drive/connect"); }}>
              <Cloud className="mr-2 h-4 w-4" />{connected ? "Trocar conta Google" : "Conectar Google Drive para backup"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#e2e6eb] shadow-sm">
          <CardHeader><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><LockKeyhole className="h-5 w-5" /></span><div><CardTitle>Proteção por mercado</CardTitle><CardDescription>Seu banco não é compartilhado com outros clientes.</CardDescription></div></div></CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
            <p><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-700" />Tokens ficam protegidos no servidor e não aparecem no navegador.</p>
            <p><HardDriveDownload className="mr-2 inline h-4 w-4 text-[#a36c00]" />Uma cópia manual para PC será oferecida como camada adicional.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-[#e2e6eb] shadow-sm">
        <CardHeader><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><FileClock className="h-5 w-5" /></span><div><CardTitle>Histórico de cópias</CardTitle><CardDescription>As cópias diárias aparecerão aqui depois que o Google Drive for conectado.</CardDescription></div></div></CardHeader>
        <CardContent>
          {!data?.runs.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-5 w-5" />Nenhuma cópia concluída nesta instalação.</div> : <div className="space-y-3">{data.runs.map(run => <div key={run.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[#101820]">{run.fileName ?? "Cópia de segurança"}</p><p className="text-slate-500">{run.trigger === "daily" ? "Automática diária" : "Manual"} · {formatDate(run.createdAt)}</p></div><Badge variant="outline" className={run.status === "success" ? "w-fit border-emerald-300 text-emerald-700" : "w-fit border-red-300 text-red-700"}>{run.status === "success" ? "Concluída" : "Falhou"}</Badge></div>)}</div>}
        </CardContent>
      </Card>
    </main>
  );
}
