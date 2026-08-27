import { Button } from "@/components/ui/button";
import { RotateCcw, TriangleAlert } from "lucide-react";

export function QueryAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-sm leading-5">{message}</p></div>{onRetry ? <Button onClick={onRetry} variant="outline" className="h-8 rounded-lg border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Tentar novamente</Button> : null}</div>;
}
