import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BrowserBarcodeDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type BrowserBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BrowserBarcodeDetector;

export function BarcodeScannerButton({ onDetected, label = "Ler pela câmera" }: { onDetected: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | undefined;
    let frameId: number | undefined;
    let active = true;
    detectedRef.current = false;

    const start = async () => {
      const Detector = (window as typeof window & { BarcodeDetector?: BrowserBarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setMessage("A leitura por câmera não é compatível com este navegador. Use o leitor USB/Bluetooth ou digite o código.");
        return;
      }
      try {
        setMessage("Solicitando acesso à câmera...");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setMessage("Aponte a câmera para o código de barras.");
        const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"] });
        const scan = async () => {
          if (!active || !videoRef.current || detectedRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = results.find(result => result.rawValue)?.rawValue;
            if (code) {
              detectedRef.current = true;
              onDetected(code);
              setOpen(false);
              return;
            }
          } catch {
            setMessage("Não foi possível ler o código ainda. Ajuste a iluminação e tente novamente.");
          }
          frameId = window.requestAnimationFrame(scan);
        };
        frameId = window.requestAnimationFrame(scan);
      } catch {
        setMessage("Não foi possível acessar a câmera. Verifique a permissão do navegador e tente novamente.");
      }
    };
    void start();
    return () => {
      active = false;
      if (frameId) window.cancelAnimationFrame(frameId);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [open, onDetected]);

  return <><Button type="button" onClick={() => setOpen(true)} variant="outline" className="h-10 rounded-xl border-[#c9d8ca] bg-white text-[#254036] hover:bg-[#f5f7f4]"><Camera className="mr-2 h-4 w-4" />{label}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="rounded-2xl sm:max-w-lg"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#17332c]">Ler código de barras</DialogTitle><DialogDescription>Use a câmera traseira do dispositivo para capturar o código do produto.</DialogDescription></DialogHeader><div className="overflow-hidden rounded-xl bg-[#102f26]"><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /></div><div className="flex items-start gap-2 rounded-xl bg-[#f4f7f4] p-3 text-sm leading-5 text-slate-600"><ScanBarcode className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" /><span>{message || "Preparando a câmera..."}</span></div><p className="text-xs leading-5 text-slate-500">Leitores USB e Bluetooth também funcionam: mantenha o campo de busca em foco e escaneie o produto; o código será incluído automaticamente.</p></DialogContent></Dialog></>;
}
