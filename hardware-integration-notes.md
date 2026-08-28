# Referências de integração de equipamentos

## Base universal adotada

Enquanto a loja não possui modelos de impressora, gaveta ou balança, o Mercadinho Pro usa a impressão padrão do navegador para comprovantes compactos e mantém as preferências locais de papel, gaveta e balança preparadas para configuração posterior. A integração direta depende da identificação do equipamento, da conexão disponível e da instalação local de um conector de comunicação.

| Recurso | Informação confirmada | Fonte |
|---|---|---|
| Impressora térmica | O QZ Tray comunica aplicativos web com impressoras e aceita linguagens como ESC/POS, além de USB, serial e rede. | [QZ Tray](https://qz.io/) |
| Gaveta de dinheiro | Em impressoras ESC/POS compatíveis, a abertura pode ocorrer pelo pulso de gaveta enviado no trabalho de impressão; o comando depende do manual do equipamento. | [Raw Printing — QZ Tray](https://qz.io/wiki/raw-legacy) |
| Balança | A conexão por USB pode ler dados de peso, unidade, precisão e estado; IDs de fornecedor/produto e endpoint variam conforme o modelo. | [USB — QZ Tray](https://qz.io/wiki/usb) |
| WhatsApp | Links `wa.me` aceitam número internacional sem sinais/pontuação e texto pré-preenchido com URL encoding, funcionando no WhatsApp e WhatsApp Web. | [Central de Ajuda do WhatsApp](https://faq.whatsapp.com/425247423114725) |

> A integração direta com equipamentos será ativada somente após a loja informar marca, modelo e forma de conexão. A base atual não envia comandos de gaveta, nem lê dispositivos físicos sem essa configuração.
