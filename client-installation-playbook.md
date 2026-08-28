# Instalação isolada por mercado cliente

## Modelo aprovado

Cada mercado receberá uma **instalação própria** do Mercadinho Pro, com banco de dados, contas de acesso, configurações de estação e backup separados. Nenhum cadastro de produto, venda, cliente, fornecedor, arquivo ou token de uma instalação deve ser reutilizado em outra.

| Camada | Regra de isolamento |
|---|---|
| Sistema | Uma implantação identificada para cada mercado. |
| Banco de dados | Uma base própria para cada mercado; não usar uma base compartilhada entre clientes. |
| Usuários | Administradores e operadores pertencem somente à instalação do próprio mercado. |
| Operação conectada | Cada computador do mercado guarda seus perfis locais de impressão, gaveta, balança e WhatsApp. |
| Google Drive | Cada mercado conecta somente a própria conta e recebe cópias de sua própria base. |

## Roteiro de provisionamento

1. Criar uma nova instalação vazia do Mercadinho Pro para o mercado cliente.
2. Confirmar que a base de dados está vazia, sem produtos, vendas, clientes, fornecedores ou usuários de outra loja.
3. Criar o administrador inicial e definir os perfis operacionais da equipe.
4. Configurar os computadores de atendimento com seus nomes de estação e preferências locais.
5. Deixar o cliente conectar o próprio Google Drive pelo botão de backup e aprovar a autorização na própria conta.
6. Confirmar a primeira cópia de segurança antes do início da operação comercial.
7. Quando houver equipamento, configurar impressora, gaveta e balança somente naquele computador e testar a comunicação.

## Proteção de dados

O backup diário não deve ser habilitado em uma instalação compartilhada. A autorização do Google Drive deve ser vinculada à instalação individual do mercado que a concedeu, e a rotina deve falhar de forma segura se a autorização estiver ausente, revogada ou associada a outra instalação.

> A cópia no Google Drive é uma camada adicional de proteção. A loja continua responsável por conferir o histórico das cópias e testar a restauração periodicamente.
