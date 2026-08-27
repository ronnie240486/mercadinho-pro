# Mercadinho Pro

O **Mercadinho Pro** é um sistema web responsivo para organizar a rotina comercial de uma loja de bairro. A primeira versão concentra o controle do catálogo, estoque, vendas, caixa, cadastros e relatórios em uma interface preparada para computador, tablet e celular.

## Módulos disponíveis

| Módulo | Recursos implementados |
|---|---|
| Visão geral | Indicadores do dia, status de caixa, alertas de estoque e linha do tempo de atividades. |
| Produtos | Cadastro, consulta, busca, edição e exportação de produtos com códigos, categoria, preços e estoque mínimo. |
| PDV | Busca por nome, código interno ou barras, carrinho, desconto, cliente e pagamentos por dinheiro, cartão ou PIX; leitura por leitor USB/Bluetooth e por câmera em navegadores compatíveis. |
| Estoque | Entradas, saídas operacionais, ajustes, devoluções, perdas, histórico e alertas de saldo mínimo. |
| Compras | Recebimento de vários produtos por fornecedor, com atualização automática de custo e entrada de mercadoria no estoque. |
| Inventário | Contagem por leitor de código de barras, ajuste auditável e histórico de divergências. |
| Validade e perdas | Lotes, validade, alertas de vencimento e baixa rastreável por avaria, vencimento ou descarte. |
| Preços e promoções | Histórico de alterações, ofertas com período de vigência e aplicação automática do preço promocional no PDV. |
| Caixa | Abertura, suprimento, sangria, acompanhamento de saldo físico e fechamento com conferência de diferença. |
| Cadastros | Fornecedores, clientes, categorias e administração de usuários. |
| Relatórios | Vendas, ticket médio, produtos mais vendidos, estoque em atenção, movimentações de caixa e exportação em CSV. |

## Identidade e visualização

O sistema usa uma marca vetorial própria, presente na entrada, na navegação e no favicon. O controle de perfil permite alternar entre os modos claro e escuro; a escolha fica salva neste navegador para a próxima utilização. O modo escuro preserva a paleta verde do Mercadinho Pro com superfícies, bordas e textos adaptados para leitura operacional.

## Papéis de operação

| Papel | Escopo de acesso |
|---|---|
| Administrador | Acesso integral, inclusive gestão de usuários e permissões. |
| Gerente | Gestão operacional, relatórios e fechamento de caixa. |
| Operador | PDV, consulta de produtos, clientes e operações de caixa autorizadas. |
| Estoquista | Produtos, fornecedores, compras e movimentações de estoque. |

> **Regra de integridade:** uma venda concluída registra os itens, os pagamentos, a movimentação de caixa e a baixa do estoque. Compras e ajustes registram a origem da alteração e o saldo anterior e posterior do produto.

## Próximos incrementos recomendados

| Prioridade | Incremento |
|---|---|
| Alta | Cancelamento de venda com estorno rastreável de estoque, caixa e lotes. |
| Média | Importação inicial de catálogo e recebimentos por planilha. |
| Média | Etiquetas de preço, impressão de comprovante e integração com equipamentos fiscais quando necessário. |
| Evolução | Metas comerciais, contas a pagar, contas a receber e integração contábil. |

## Evolução operacional priorizada

| Prioridade | Recurso | Benefício prático na rotina |
|---|---|---|
| 1 | Inventário guiado por código de barras | Acelera a contagem física e aponta divergências entre a prateleira e o sistema. |
| 2 | Lotes, validade e alertas de vencimento | Ajuda a priorizar exposição, promoção ou descarte antes de perder mercadoria. |
| 3 | Registro de perdas e avarias por motivo | Mostra onde há quebra, vencimento, furto ou erro de recebimento. |
| 4 | Compras com vários itens e comparação de custo | Facilita a reposição por fornecedor e destaca aumentos de preço. |
| 5 | Etiquetas de preço e promoções programadas | Reduz divergências de gôndola e agiliza alterações de preço. |
| 6 | Contas a pagar e despesas operacionais | Conecta a margem de venda à visão real do caixa da loja. |

> **Emissão fiscal:** a integração com NFC-e foi deliberadamente adiada. O sistema está preparado para continuar a operação interna, e a emissão só deve ser configurada em uma etapa futura, após validação fiscal e contratação do provedor escolhido.
