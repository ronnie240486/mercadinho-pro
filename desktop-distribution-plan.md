# Plano de distribuição para aplicativo de PC

## Sistemas solicitados

O Mercadinho Pro deverá ser distribuído para **Windows 7, Windows 10 e Windows 11**. A estratégia não deve prometer o mesmo nível de atualização para todos os sistemas: o Windows 7 encerrou o suporte da Microsoft em janeiro de 2020 e o programa de atualizações de segurança estendidas terminou em janeiro de 2023. [1]

| Sistema | Distribuição recomendada | Situação de suporte |
|---|---|---|
| Windows 10 e 11 | Aplicativo desktop atual, com instalador Windows e atualizações regulares. | Plataforma prioritária. |
| Windows 7 | Canal de compatibilidade separado, instalado somente quando necessário, com WebView2 embutido/offline e sem promessa de recursos modernos contínuos. | Legado; requer análise em máquina real antes de disponibilização. |

## Decisão técnica preliminar

Para uma versão desktop atual, a opção mais apropriada é um invólucro desktop com instalador Windows. A documentação do Tauri prevê instaladores `.msi` e `-setup.exe`, além de opções para incluir o runtime WebView2. Em Windows 7, a configuração padrão do MSI pode falhar se o bootstrapper não conseguir baixar o WebView2; a documentação recomenda modo embutido ou offline conforme o cenário. [2]

Não é recomendável depender de Electron atual para Windows 7: o Electron 23 e posteriores deixaram de suportar sistemas anteriores ao Windows 10, e a linha 22 encerrou seu ciclo de manutenção em 2023. [3]

## Instalação por cliente

Cada computador terá um perfil local de estação, com nome próprio e preferências isoladas de impressão, gaveta, balança e WhatsApp. O instalador não pode carregar modelos de equipamento fixos: a comunicação direta com impressora, gaveta e balança será configurada separadamente em cada cliente depois que o modelo e a conexão forem conhecidos.

> A versão web permanece como base responsiva e atualizável. O aplicativo de PC será a forma instalável dessa operação, sem substituir a necessidade de ambiente de servidor para autenticação e dados compartilhados.

## Próximos passos antes do empacotamento

1. Confirmar se haverá computadores Windows 7 de 32 bits ou apenas 64 bits.
2. Testar em uma máquina Windows 7 real com as atualizações e o WebView2 necessários.
3. Preparar instalador atual para Windows 10/11 e um canal legado separado somente se o teste de Windows 7 for satisfatório.
4. Definir o processo de atualização, assinatura do instalador e suporte remoto por cliente.

## Referências

[1]: https://learn.microsoft.com/en-us/lifecycle/products/windows-7 "Microsoft Lifecycle — Windows 7"
[2]: https://v2.tauri.app/distribute/windows-installer/ "Tauri — Windows Installer"
[3]: https://www.electronjs.org/blog/windows-7-to-8-1-deprecation-notice "Electron — Farewell, Windows 7/8/8.1"
