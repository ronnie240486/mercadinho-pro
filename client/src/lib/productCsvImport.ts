export type ImportProductRow = {
  name: string;
  barcode?: string;
  internalCode?: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
};

export type ImportPreview = { items: ImportProductRow[]; errors: string[]; detectedHeader: boolean };

const headerAliases: Record<string, keyof ImportProductRow> = {
  nome: "name", produto: "name", descricao: "name",
  codigo: "barcode", "codigo de barras": "barcode", ean: "barcode", gtin: "barcode", barcode: "barcode",
  "codigo interno": "internalCode", interno: "internalCode", sku: "internalCode",
  categoria: "categoryName", grupo: "categoryName",
  unidade: "unit", und: "unit",
  custo: "costPrice", "preco de custo": "costPrice", "valor custo": "costPrice",
  venda: "salePrice", "preco de venda": "salePrice", preco: "salePrice", "valor venda": "salePrice",
  minimo: "minimumStock", "estoque minimo": "minimumStock", "estoque mínimo": "minimumStock",
};

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') { cell += '"'; index += 1; }
      else insideQuotes = !insideQuotes;
    } else if (character === delimiter && !insideQuotes) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function parseNumber(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");
  const normalized = hasComma && hasDot
    ? (compact.lastIndexOf(",") > compact.lastIndexOf(".") ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, ""))
    : compact.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

export function parseProductCsv(text: string): ImportPreview {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return { items: [], errors: ["O arquivo está vazio."], detectedHeader: false };
  const delimiter = [";", "\t", ","].sort((first, second) => parseLine(lines[0], second).length - parseLine(lines[0], first).length)[0];
  const firstCells = parseLine(lines[0], delimiter);
  const firstHeaders = firstCells.map(cell => headerAliases[normalizeHeader(cell)]);
  const detectedHeader = firstHeaders.some(Boolean);
  const keys: Array<keyof ImportProductRow | undefined> = detectedHeader ? firstHeaders : ["name", "barcode", "salePrice", "minimumStock"];
  const items: ImportProductRow[] = [];
  const errors: string[] = [];

  lines.slice(detectedHeader ? 1 : 0).forEach((line, index) => {
    const rowNumber = index + (detectedHeader ? 2 : 1);
    const cells = parseLine(line, delimiter);
    const values: Partial<Record<keyof ImportProductRow, string>> = {};
    keys.forEach((key, cellIndex) => { if (key) values[key] = cells[cellIndex]?.trim() ?? ""; });
    const name = values.name ?? "";
    const unit = (values.unit || "UN").toUpperCase();
    const costPrice = values.costPrice ? parseNumber(values.costPrice) : 0;
    const salePrice = parseNumber(values.salePrice ?? "");
    const minimumStock = values.minimumStock ? parseNumber(values.minimumStock) : 0;
    if (name.length < 2) { errors.push(`Linha ${rowNumber}: informe o nome do produto.`); return; }
    if (!Number.isFinite(salePrice) || salePrice < 0) { errors.push(`Linha ${rowNumber}: informe um preço de venda válido.`); return; }
    if (!Number.isFinite(costPrice) || costPrice < 0) { errors.push(`Linha ${rowNumber}: informe um preço de custo válido.`); return; }
    if (!Number.isFinite(minimumStock) || minimumStock < 0) { errors.push(`Linha ${rowNumber}: informe um estoque mínimo válido.`); return; }
    if (!/^[A-Z0-9./-]{1,10}$/.test(unit)) { errors.push(`Linha ${rowNumber}: unidade inválida.`); return; }
    items.push({ name, barcode: values.barcode || undefined, internalCode: values.internalCode || undefined, categoryName: values.categoryName || undefined, unit, costPrice, salePrice, minimumStock });
  });
  return { items, errors, detectedHeader };
}
