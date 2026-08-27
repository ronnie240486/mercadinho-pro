# Mercadinho Pro

O **Mercadinho Pro** é um sistema web responsivo para organizar a rotina comercial de uma loja de bairro. A primeira versão concentra o controle do catálogo, estoque, vendas, caixa, cadastros e relatórios em uma interface preparada para computador, tablet e celular.

## Módulos disponíveis

| Módulo | Recursos implementados |
|---|---|
| Visão geral | Indicadores do dia, status de caixa, alertas de estoque e linha do tempo de atividades. |
| Produtos | Cadastro, consulta, busca, edição e exportação de produtos com códigos, categoria, preços e estoque mínimo. |
| PDV | Busca por nome, código interno ou barras, carrinho, desconto, cliente e pagamentos por dinheiro, cartão ou PIX. |
| Estoque | Entradas, saídas operacionais, ajustes, devoluções, histórico e alertas de saldo mínimo. |
| Compras | Registro de compra por fornecedor, atualização automática de custo e entrada de mercadoria no estoque. |
| Caixa | Abertura, suprimento, sangria, acompanhamento de saldo físico e fechamento com conferência de diferença. |
| Cadastros | Fornecedores, clientes, categorias e administração de usuários. |
| Relatórios | Vendas, ticket médio, produtos mais vendidos, estoque em atenção, movimentações de caixa e exportação em CSV. |

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
| Alta | Leitura por câmera para códigos de barras em celulares compatíveis. |
| Alta | Cancelamento de venda com estorno rastreável de estoque e caixa. |
| Média | Contagem guiada de inventário e importação inicial de catálogo por planilha. |
| Média | Impressão de comprovante e integração com equipamentos fiscais conforme a região. |
| Evolução | Painéis por período, metas comerciais, contas a pagar e integração contábil. |
