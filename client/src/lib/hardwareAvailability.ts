export type HardwareControl = { available: boolean; label: string; guidance: string };

export const universalHardwareControls: Record<"drawer" | "scale", HardwareControl> = {
  drawer: {
    available: false,
    label: "Abrir gaveta indisponível",
    guidance: "Aguardando modelo e conexão da impressora/gaveta.",
  },
  scale: {
    available: false,
    label: "Ler peso da balança indisponível",
    guidance: "A conexão direta será configurada quando houver marca, modelo e porta da balança.",
  },
};
