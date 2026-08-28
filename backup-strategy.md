# Estratégia de cópias de segurança do Mercadinho Pro

## Princípio

O banco atual do Mercadinho Pro fica em um ambiente de dados na nuvem do projeto, não dentro de um computador específico. Um computador da loja ou um disco externo pode guardar **cópias adicionais**, mas não deve ser a única origem do banco: falha de disco, furto, vírus, perda de energia ou ausência de conexão podem impedir o acesso ou a recuperação.

> Nenhuma solução pode prometer que os dados nunca serão perdidos. A proteção adequada combina cópias independentes, histórico de versões e testes de restauração.

## Opções de proteção

| Abordagem | Como funciona | Vantagens | Limites | Complexidade |
|---|---|---|---|---|
| Cópia manual na nuvem | O responsável exporta uma cópia periódica e a guarda no Google Drive, OneDrive ou serviço semelhante. | Simples, sem conexão técnica adicional. | Depende de alguém executar e lembrar da rotina. | Baixa |
| Cópia automática na nuvem própria | O sistema gera cópias em intervalo definido e envia para uma pasta exclusiva da nuvem escolhida. | Mantém histórico fora do ambiente principal e não depende de um computador ficar ligado. | Exige autorização da conta de nuvem e configuração inicial. | Média |
| Cópia local adicional | Um computador da loja ou disco externo recebe uma cópia regular, além da cópia em nuvem. | Ajuda em recuperação local e amplia a redundância. | Não substitui uma nuvem; o computador/disco pode falhar ou ser comprometido. | Média |

## Rotina recomendada para decisão

1. Manter o banco operacional na nuvem do projeto.
2. Escolher uma nuvem que pertença ao responsável da loja para receber cópias externas.
3. Guardar versões diárias por um período definido e uma cópia mensal por período maior.
4. Manter uma cópia extra em computador ou disco externo apenas como terceira camada.
5. Testar periodicamente a leitura e a restauração de uma cópia em ambiente seguro.

## O que será configurado após a escolha

Depois que o destino for escolhido, será preciso conceder acesso somente à pasta de backup. A rotina poderá registrar data, tamanho e resultado de cada cópia para que o administrador saiba se ela foi concluída. Nenhum dado será copiado para uma conta de nuvem sem autorização explícita.

## Autorização individual do Google Drive

Para o botão **Conectar Google Drive para backup**, o Mercadinho Pro usará a autorização do Google por redirecionamento. Cada cliente entra na própria conta, aprova o acesso quando clicar no botão e recebe uma autorização separada. O aplicativo precisa ter uma credencial OAuth do tipo **Aplicação Web** cadastrada no Google Cloud e solicitar acesso somente no momento da conexão, que é a prática recomendada pelo Google. [2]

Os tokens de acesso e renovação devem ficar protegidos no servidor e vinculados ao cliente autenticado. O navegador não deve receber segredo OAuth nem token de renovação. A pasta de backup será criada ou escolhida somente após o consentimento e nenhuma cópia será enviada antes dessa autorização.

## Isolamento por mercado

O Mercadinho Pro será entregue com uma instalação e banco de dados próprios para cada mercado. O botão de conexão com o Google Drive aparecerá na instalação daquele mercado e só poderá autorizar, gerar ou listar cópias referentes àquela própria base. O processo completo de provisionamento está em [Instalação isolada por mercado cliente](./client-installation-playbook.md).

## Projeto hospedado

As exportações de dados da plataforma são **retratos de um momento** e não uma sincronização contínua. Para casos abrangidos pelo processo oficial de backup, o pacote de dados inclui código, arquivos, banco, configurações e integrações, enquanto baixar somente o código não substitui essa cópia. [1]

## Referência

[1]: https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data "Guia oficial de backup de dados"
[2]: https://developers.google.com/identity/protocols/oauth2 "Google OAuth 2.0 — autorização para APIs"
