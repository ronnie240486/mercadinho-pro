# Pesquisa fiscal para a integração de NFC-e

Esta nota consolida a verificação realizada em 27 de agosto de 2026. A escolha final do provedor e a ativação em produção dependem do estado de operação, do enquadramento tributário e da validação do contador responsável.

| Fonte | Constatação relevante para o Mercadinho Pro |
|---|---|
| [Focus NFe — NFC-e](https://focusnfe.com.br/produtos/nota-fiscal-consumidor-nfce/) | Oferece uma API REST de NFC-e voltada ao varejo e também cobre NF-e e recebimento de documentos contra o CNPJ. A página institucional aponta a documentação em `https://doc.focusnfe.com.br/`. |
| [SEFAZ-SP — NFC-e](https://portal.fazenda.sp.gov.br/servicos/nfce) | Em São Paulo, a página informa a obrigatoriedade da NFC-e para o varejo a partir de 1º de janeiro de 2026, a autorização síncrona e a necessidade de obter CSC após o credenciamento. |
| [SEFAZ-PE — Credenciamento NFC-e](https://www.sefaz.pe.gov.br/Servicos/Nota-Fiscal-de-Consumidor-Eletronica/Paginas/Credenciamento-de-Contribuintes.aspx) | Exemplifica que o emitente precisa de inscrição estadual, credenciamento em homologação e produção, programa emissor, certificado digital ICP-Brasil e CSC para cada ambiente. |
| [SEF-SC — NFC-e](https://www.sef.sc.gov.br/saiba-mais/nfc-e-nota-fiscal-de-consumidor-eletronica) | Demonstra que os requisitos e regras do desenvolvedor podem variar por UF; em Santa Catarina há requisitos próprios relacionados ao PAF-NFC-e. |
| [MDN — BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) | A API de câmera para leitura de código de barras possui suporte parcial entre navegadores. Por isso, o sistema mantém o leitor USB/Bluetooth como caminho principal e apresenta a câmera apenas quando o navegador a suporta. |

> **Diretriz de implementação:** o sistema deve primeiro registrar a venda e armazenar os dados fiscais necessários. A transmissão de uma NFC-e para a SEFAZ só deve ocorrer quando a empresa estiver credenciada, tiver certificado e CSC válidos, e o provedor fiscal estiver configurado e homologado.

## Dados ainda necessários antes da emissão em produção

| Grupo | Dados ou validações |
|---|---|
| Empresa | CNPJ, razão social, nome fantasia, endereço, inscrição estadual e regime tributário. |
| Fiscal | Estado (UF) do estabelecimento, credenciamento na SEFAZ, certificado digital e CSC de homologação/produção. |
| Produtos | NCM, CEST quando aplicável, unidade tributável, CFOP, origem e regras de ICMS, PIS e COFINS validadas pela contabilidade. |
| Operação | Série, numeração, ambiente de emissão, contingência, impressora térmica e política de cancelamento. |
| Integração | Provedor escolhido, credenciais de API, ambiente de homologação aprovado e responsáveis autorizados. |
