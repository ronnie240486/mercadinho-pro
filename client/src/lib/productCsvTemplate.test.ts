import { describe, expect, it } from "vitest";
import { parseProductCsv } from "./productCsvImport";
import { productCsvTemplate, productCsvTemplateFilename } from "./productCsvTemplate";

describe("modelo CSV de produtos", () => {
  it("inclui o cabeçalho reconhecido pelo importador sem adicionar produtos de exemplo", () => {
    const preview = parseProductCsv(productCsvTemplate);
    expect(preview.detectedHeader).toBe(true);
    expect(preview.items).toEqual([]);
    expect(preview.errors).toEqual([]);
    expect(productCsvTemplateFilename).toBe("modelo-cadastro-produtos-mercadinho-pro.csv");
  });
});
