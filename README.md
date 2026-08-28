# Mercadinho Pro

O **Mercadinho Pro** é um sistema web responsivo para organizar a rotina comercial de uma loja de bairro. A primeira versão concentra o controle do catálogo, estoque, vendas, caixa, cadastros e relatórios em uma interface preparada para computador, tablet e celular.

## Módulos disponíveis

| Módulo | Recursos implementados |
|---|---|
| Visão geral | Indicadores do dia, status de caixa, alertas de estoque e linha do tempo de atividades. |
| Início guiado | Checklist automático para lojas sem produtos, orientando cadastro, entrada de estoque e abertura de caixa até o primeiro atendimento. |
| Conferência de preço | Consulta independente por nome, código, leitor USB/Bluetooth ou câmera, exibindo preço de venda ou promoção ativa sem registrar venda, caixa ou movimentação de estoque. |
| Produtos | Cadastro, consulta, busca, edição e exportação de produtos com códigos, categoria, preços, estoque mínimo e unidades comerciais padronizadas ou personalizadas. |
| PDV | Busca por nome, código interno ou barras, carrinho, desconto, cliente e pagamentos por dinheiro, cartão ou PIX; leitura por leitor USB/Bluetooth e por câmera em navegadores compatíveis; uso de pontos ou crédito de fidelidade; quantidade manual fracionada para peso, volume e medidas, com até três casas decimais. |
| Estoque | Entradas, saídas operacionais, ajustes, devoluções, perdas, histórico e alertas de saldo mínimo. |
| Compras | Recebimento de vários produtos por fornecedor, com atualização automática de custo e entrada de mercadoria no estoque; lote e validade opcionais por item para preservar a rastreabilidade de perecíveis. |
| Inventário | Contagem por leitor de código de barras, ajuste auditável e histórico de divergências. |
| Validade e perdas | Lotes, validade, alertas de vencimento e baixa rastreável por avaria, vencimento ou descarte. |
| Preços e promoções | Histórico de alterações, ofertas com período de vigência e aplicação automática do preço promocional no PDV. |
| Caixa | Abertura, suprimento, acompanhamento de saldo físico e fechamento com conferência de diferença; sangria, ajustes e fechamento são restritos a gerente ou administrador. |
| Cadastros | Fornecedores, clientes, categorias e administração de usuários, com escolha individual entre fidelidade por pontos ou crédito/desconto. |
| Vendas e devoluções | Histórico de vendas, cancelamento no caixa original, devolução parcial ou total, estorno financeiro e recomposição auditável de estoque e lotes; cancelamento e devolução são restritos a gerente ou administrador. |
| Ferramentas | Importação transacional de catálogo por CSV com prévia e validação, modelo seguro para o cadastro inicial e etiquetas A4 com preço e código de barras selecionáveis. |
| Metas | Criação de objetivos por período, acompanhamento de realizado, percentual e valor restante. |
| Fidelidade | Saldos e extrato por cliente, ajustes auditáveis e uso de pontos ou crédito no PDV. |
| Relatórios | Vendas, ticket médio, produtos mais vendidos, desempenho por categoria, margem, estoque em atenção, movimentações de caixa com devoluções destacadas como saída e exportação em CSV. |
| Prevenção de perdas | Radar operacional com estoque crítico, lotes próximos do vencimento, perdas, divergências de inventário, devoluções e cancelamentos recentes, com atalhos para as ações correspondentes. |
| Operação conectada | Central universal por estação para definir largura de comprovante térmico, preferência de gaveta, modo de balança e telefone de atendimento; cada computador mantém perfil próprio, sem exigir marca ou equipamento previamente instalado. |
| Backups | Central de proteção por instalação com conexão individual ao Google Drive, autorização OAuth protegida no servidor e histórico de cópias. A rotina automática diária será ativada depois da primeira conexão do mercado. |
| Pedidos pelo WhatsApp | Pedidos de retirada ou entrega com itens, preço vigente, saldo conferido e pagamento por dinheiro, Pix ou cartão; o pedido não baixa estoque nem registra caixa até ser atendido no PDV. |

## Identidade e visualização

O sistema usa o logotipo oficial fornecido para o Mercadinho Pro, presente na entrada, na navegação e no favicon. A identidade visual combina **grafite, dourado e prata**. O controle de perfil permite alternar entre os modos claro e escuro; a escolha fica salva neste navegador para a próxima utilização, com superfícies, bordas e textos ajustados para leitura operacional.

## Papéis de operação

| Papel | Escopo de acesso |
|---|---|
| Administrador | Acesso integral, inclusive gestão de usuários, sangrias, ajustes, fechamento de caixa, cancelamentos e devoluções. |
| Gerente | Gestão operacional, relatórios, sangrias, ajustes, fechamento de caixa, cancelamentos e devoluções. |
| Operador | PDV, consulta de produtos, clientes, abertura de caixa e suprimento; não executa operações sensíveis. |
| Estoquista | Produtos, fornecedores, compras e movimentações de estoque. |

> **Regra de integridade:** uma venda concluída registra os itens, os pagamentos, a movimentação de caixa e a baixa do estoque. Compras e ajustes registram a origem da alteração e o saldo anterior e posterior do produto.

## Evoluções futuras

| Prioridade | Incremento |
|---|---|
| Alta | Validação autenticada em operação real dos fluxos de cancelamento, devolução, importação e fidelidade. |
| Média | Integração direta de impressora térmica, gaveta e balança após definição de marca, modelo e conexão do equipamento. |
| Média | Perfis de estação por cliente, permitindo que instalações distintas usem impressoras e balanças diferentes sem compartilhar preferências. |
| Média | Integração com impressora térmica e equipamentos de operação quando necessário. |
| Evolução | Integração contábil e relatórios financeiros gerenciais. |

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

> **Formas de pagamento:** o Mercadinho Pro não terá crediário, vendas a prazo ou contas a receber. As vendas serão registradas somente por dinheiro, Pix e cartão.
