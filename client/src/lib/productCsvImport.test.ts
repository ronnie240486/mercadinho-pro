import { describe, expect, it } from "vitest";
import { parseProductCsv } from "./productCsvImport";

describe("importação CSV de produtos", () => {
  it("lê os cabeçalhos usuais e converte valores brasileiros", () => {
    const preview = parseProductCsv("Nome;Código de barras;Categoria;Unidade;Custo;Preço de venda;Estoque mínimo\nArroz;789123;Mercearia;PCT;12,50;17,90;3");
    expect(preview.errors).toEqual([]);
    expect(preview.items).toEqual([expect.objectContaining({ name: "Arroz", barcode: "789123", unit: "PCT", costPrice: 12.5, salePrice: 17.9, minimumStock: 3 })]);
  });

  it("mantém compatibilidade com o formato simples sem cabeçalho", () => {
    const preview = parseProductCsv("Feijão;789456;9,99;2");
    expect(preview.detectedHeader).toBe(false);
    expect(preview.items[0]).toMatchObject({ name: "Feijão", barcode: "789456", unit: "UN", salePrice: 9.99, minimumStock: 2 });
  });

  it("aceita preço com ponto decimal e número com separador de milhar", () => {
    const preview = parseProductCsv("Nome;Custo;Venda\nCafé;10.50;1.234,75");
    expect(preview.items[0]).toMatchObject({ costPrice: 10.5, salePrice: 1234.75 });
  });

  it("mostra erros sem incluir linhas inválidas na importação", () => {
    const preview = parseProductCsv("Nome;Venda\n;10\nCafé;abc");
    expect(preview.items).toHaveLength(0);
    expect(preview.errors).toHaveLength(2);
  });
});
