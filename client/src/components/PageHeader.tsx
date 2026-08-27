import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export function PageHeader({
  eyebrow = "Gestão comercial",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-[#dfe5df] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800/65">
          <span>{eyebrow}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-emerald-950">{title}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#17332c] sm:text-[34px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function PrimaryAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <Button onClick={onClick} className="h-11 rounded-xl bg-[#164e3d] px-5 text-white shadow-sm shadow-emerald-950/15 hover:bg-[#0f4032]">{children}</Button>;
}
