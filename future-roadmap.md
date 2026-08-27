# Roteiro de evolução — Mercadinho Pro

O Mercadinho Pro já cobre o núcleo operacional: produtos, estoque, compras, lotes, validade, PDV, caixa, clientes, fidelidade, devoluções, contas a pagar e relatórios. A próxima etapa deve priorizar recursos que tragam **menos perda**, **compras mais certeiras**, **atendimento mais rápido** e **controle financeiro real**, antes de abrir frentes mais complexas como loja on-line.

> A análise de dados do PDV, do estoque e do programa de fidelidade pode orientar reposição, preços, promoções, escala de atendimento e identificação de perdas. [1]

| Prioridade | Recurso | Impacto prático | Situação sugerida |
|---|---|---|---|
| 1 | **Contas a receber e crediário** | Registra vendas a prazo, parcelas, vencimentos, recebimentos e clientes em atraso. | Próximo módulo financeiro. |
| 1 | **Compra sugerida e reposição inteligente** | Calcula sugestão por estoque mínimo/máximo, giro, vendas recentes, validade e prazo do fornecedor. | Próximo módulo de estoque. |
| 1 | **Fechamento por operador e permissões de aprovação** | Cada operador abre/fecha o próprio turno; desconto, sangria, cancelamento e devolução acima de limite exigem aprovação de gerente. | Próximo módulo de segurança. |
| 1 | **Painel de perdas e prevenção de fraude** | Destaca divergências de inventário, descontos fora do padrão, cancelamentos/devoluções repetidos e quebras por motivo. | Próximo módulo analítico. |
| 2 | **Produtos por peso e integração com balança** | Trata quilo, grama e códigos de peso variável para hortifrúti, frios, açougue e padaria. | Após a reposição inteligente. |
| 2 | **Conferência de preço de gôndola** | Lista mudanças de preço, etiquetas pendentes e divergências entre preço cadastrado, promoção e etiqueta impressa. | Após produtos por peso. |
| 2 | **Pedido por WhatsApp, retirada e entrega** | Recebe pedidos, reserva estoque, organiza separação, rota/entregador e confirma retirada ou entrega. | Após estabilizar o financeiro. |
| 2 | **Relatório diário automático** | Envia resumo de vendas, caixa, estoque crítico, contas vencendo e perdas para o proprietário. | Após definição do canal de comunicação. |
| 3 | **Múltiplas lojas e transferência entre filiais** | Separa estoque, caixa, preço e desempenho por loja, com transferência auditável entre unidades. | Quando houver segunda unidade. |
| 3 | **Portal do cliente** | Catálogo, lista de compras, ofertas personalizadas, saldo de fidelidade e histórico de pedidos. | Quando o canal on-line estiver maduro. |
| 3 | **Integração de equipamentos** | Impressora térmica, gaveta de dinheiro, balança, coletor de dados e leitor de código sem fio. | Conforme os equipamentos reais da loja. |

## Ordem prática recomendada

### 1. Financeiro e controle de equipe

O primeiro bloco deve criar **contas a receber/crediário**, recebimentos parciais, limite por cliente, envelhecimento de dívida e um fechamento de caixa separado por operador. Em seguida, devem ser configuradas regras de aprovação: somente gerente pode liberar descontos elevados, cancelar venda, registrar devolução ou autorizar sangria acima de um valor configurável. Isso reduz erro operacional e dá rastreabilidade a operações sensíveis.

### 2. Compra sugerida e prevenção de perdas

Depois, o sistema deve calcular uma lista de compras recomendada. A sugestão deve considerar saldo atual, estoque mínimo e máximo, média de vendas, itens sem giro, lote próximo do vencimento e fornecedor preferencial. O painel de perdas deve reunir divergências de inventário, quebras, produtos vencidos, devoluções, cancelamentos e descontos atípicos. Controles de inventário, incidentes, alertas e análise de transações são componentes típicos de programas de prevenção de perdas no varejo. [2]

### 3. Operação de balcão e produtos por peso

O terceiro bloco deve apoiar produtos fracionados: peso variável, unidades de medida, etiqueta com peso, tara, preço por quilo e código de barras da balança. Em paralelo, uma conferência de etiquetas evita diferença entre o preço da gôndola e o preço cobrado. Esses recursos são especialmente úteis para hortifrúti, açougue, frios, padaria e produtos vendidos em caixa fechada.

### 4. Atendimento digital e entregas

Com estoque e preços confiáveis, o Mercadinho Pro pode ter um módulo de pedidos por WhatsApp e retirada/entrega. O ideal é começar internamente: registrar pedido, separar itens, reservar estoque, marcar o estágio do pedido e registrar taxa de entrega. Depois, caso faça sentido, pode haver um catálogo para o cliente. Plataformas de compras de supermercado costumam combinar catálogo, promoções, lista de compras, retirada e entrega; esses recursos exigem saldo de estoque consistente e tratamento cuidadoso dos dados de clientes. [3]

## Recursos que **não** priorizaria agora

Não recomendo começar por inteligência artificial avançada, marketplace próprio, múltiplas filiais ou integrações extensas de equipamentos antes de estabilizar **financeiro, reposição, prevenção de perdas e operação por operador**. Esses recursos geram mais valor quando o cadastro, o estoque e os fluxos diários já produzem dados confiáveis.

> **Emissão fiscal permanece fora deste roteiro**, conforme a decisão atual. Ela só deve ser retomada quando houver definição do provedor, do regime fiscal e da operação desejada.

## Referências

[1] [Oracle, *10 Ways Grocers Can Use Data Analytics*](https://www.oracle.com/retail/grocery-data-analytics/)

[2] [Flock Safety, *What To Know About Retail Loss Prevention Software*](https://www.flocksafety.com/blog/retail-loss-prevention-software)

[3] [Stecuła e Wolniak, *Technology Development in Online Grocery Shopping*, Foods, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11641754/)
