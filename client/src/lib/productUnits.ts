export const CUSTOM_UNIT_VALUE = "CUSTOM";

export const productUnitGroups = [
  {
    label: "Unidades e embalagens",
    options: [
      { value: "UN", label: "UN — Unidade" },
      { value: "PC", label: "PC — Peça" },
      { value: "PCT", label: "PCT — Pacote" },
      { value: "CX", label: "CX — Caixa" },
      { value: "FD", label: "FD — Fardo" },
      { value: "SC", label: "SC — Saco" },
      { value: "DZ", label: "DZ — Dúzia" },
      { value: "BD", label: "BD — Bandeja" },
      { value: "CRT", label: "CRT — Cartela" },
      { value: "BL", label: "BL — Blister" },
      { value: "FR", label: "FR — Frasco" },
      { value: "GRF", label: "GRF — Garrafa" },
      { value: "LT", label: "LT — Lata" },
      { value: "POTE", label: "POTE — Pote" },
      { value: "GL", label: "GL — Galão" },
      { value: "TB", label: "TB — Tubo" },
      { value: "BIS", label: "BIS — Bisnaga" },
      { value: "SACH", label: "SACH — Sachê" },
    ],
  },
  {
    label: "Peso, volume e medida",
    options: [
      { value: "KG", label: "KG — Quilograma" },
      { value: "G", label: "G — Grama" },
      { value: "MG", label: "MG — Miligrama" },
      { value: "L", label: "L — Litro" },
      { value: "ML", label: "ML — Mililitro" },
      { value: "M", label: "M — Metro" },
      { value: "CM", label: "CM — Centímetro" },
      { value: "M2", label: "M² — Metro quadrado" },
      { value: "M3", label: "M³ — Metro cúbico" },
    ],
  },
  {
    label: "Outras formas de venda",
    options: [
      { value: "PR", label: "PR — Par" },
      { value: "JG", label: "JG — Jogo" },
      { value: "KIT", label: "KIT — Kit" },
      { value: "RL", label: "RL — Rolo" },
    ],
  },
] as const;

const knownUnits = new Set<string>(productUnitGroups.flatMap(group => group.options.map(option => option.value)));
const fractionalUnits = new Set(["KG", "G", "MG", "L", "ML", "M", "CM", "M2", "M3"]);

export function isKnownProductUnit(value: string) {
  return knownUnits.has(value.trim().toUpperCase());
}

export function isFractionalProductUnit(value: string) {
  return fractionalUnits.has(value.trim().toUpperCase());
}

export function normalizeSaleQuantity(value: string | number, unit: string) {
  const quantity = Number(String(value).replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Informe uma quantidade maior que zero.");
  const normalized = Math.round(quantity * 1000) / 1000;
  if (!isFractionalProductUnit(unit) && !Number.isInteger(normalized)) throw new Error(`Produtos vendidos por ${unit} aceitam apenas quantidades inteiras.`);
  return normalized;
}

export function normalizeProductUnit(selectedUnit: string, customUnit = "") {
  const normalized = (selectedUnit === CUSTOM_UNIT_VALUE ? customUnit : selectedUnit).trim().toUpperCase();
  if (!normalized) throw new Error("Selecione uma unidade comercial ou informe uma sigla personalizada.");
  if (!/^[A-Z0-9./-]{1,10}$/.test(normalized)) throw new Error("A sigla personalizada deve ter até 10 caracteres, usando letras, números ou . / -.");
  return normalized;
}
