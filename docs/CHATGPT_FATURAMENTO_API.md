# Faturamento de pedidos via ChatGPT/API

## Objetivo

Reproduzir pela API o fluxo operacional usado hoje na tela de Pedidos da Império, preservando as mesmas regras de pedido, faturamento, estoque, reservas, componentes e logs.

## Fluxo recomendado

1. Extrair do PDF/print o número do pedido ou cliente, produto/item e quantidade faturada.
2. Enviar uma prévia para `POST /api/pedidos/faturamento/validar`.
3. Revisar o resultado da prévia:
   - `PRONTO`: faturamento pode ser confirmado.
   - `AJUSTAR_E_FATURAR`: o faturamento acumulado ultrapassará a quantidade atual; a confirmação ajustará a quantidade total antes de faturar.
   - `PEDIDO_NAO_ENCONTRADO`: criar o pedido usando a API já existente `/api/pedidos/importar` e validar novamente.
   - `ITEM_NAO_ENCONTRADO` ou `ITEM_AMBIGUO`: revisar a identificação do produto antes de qualquer baixa.
   - `RESERVA_CONFLITANTE`: exige autorização explícita (`allowBreakReservations: true`) para desfazer a reserva de outro pedido.
   - `JA_PROCESSADO`: a mesma linha do mesmo documento já foi aplicada e será ignorada.
   - `JA_FATURADO`: não existe saldo para faturar naquele item do pedido inteiro.
4. Exibir ao usuário a prévia com pedido, item, quantidade do pedido, já faturado, faturamento novo, quantidade após ajuste e saldo/status resultante.
5. Somente após a autorização do usuário, chamar `POST /api/pedidos/faturamento`, enviando o `expectedPreviewHash` retornado pela prévia.
6. Se o sistema responder `PREVIEW_DESATUALIZADA` ou `BILLING_STATE_CHANGED`, gerar nova prévia e pedir nova confirmação.

## Regra de faturamento acima da quantidade do pedido

A quantidade é tratada pelo acumulado, para preservar faturamentos parciais anteriores:

- quantidade atual do pedido = 100
- já faturado = 20
- novo documento = 90
- novo faturado acumulado = 110
- quantidade total do item é ajustada para 110
- novo status = `FATURADO`

A API nunca reduz a quantidade total do pedido.

## Pedido inexistente

A API de faturamento não recria a regra de lançamento. Quando a prévia retornar `PEDIDO_NAO_ENCONTRADO`, o orquestrador deve usar a API já existente de importação de pedidos:

1. `POST /api/pedidos/importar/validar`
2. `POST /api/pedidos/importar`
3. repetir `POST /api/pedidos/faturamento/validar`
4. se o documento representar o pedido completo, usar `faturarPedidosInteiros` para faturar somente o saldo pendente de cada item.

## Idempotência

Toda requisição de faturamento exige `documentKey`.

Use um identificador estável do documento, preferencialmente número da NF/romaneio combinado com emitente, ou um hash estável do arquivo quando não existir número confiável. Cada linha deve receber um `lineId` estável dentro do documento.

A combinação `tenantId + documentKey + lineId` impede que a mesma linha seja faturada duas vezes.

## Segurança operacional

- Cada linha individual deve informar `codigoPedido` ou `cliente`.
- O sistema nunca escolhe um pedido somente pelo produto.
- Item ambíguo é bloqueado.
- Confirmação usa `previewHash` para impedir faturamento em dados alterados depois da conferência.
- A gravação é transacional no Firestore.
- A confirmação registra auditoria com origem, documento, solicitante, quantidades antes/depois e itens aplicados.
- O lote por requisição é limitado a 50 linhas/pedidos; documentos maiores devem ser divididos em lotes mantendo o mesmo `documentKey` e `lineId` distintos.

## Efeitos preservados da tela atual

A confirmação atualiza em conjunto:

- quantidade total do item do pedido quando necessário;
- `invoicedQuantity`;
- status `FATURADO` ou `FATURADO_PARCIAL`;
- atividade/urgência do pedido;
- estoque acabado do item;
- quantidade reservada;
- eventual quebra autorizada de reserva de outro pedido;
- movimentação de saída;
- consumo de componentes/BOM, quando aplicável;
- log de faturamento;
- auditoria da importação.

A janela de compartilhamento/WhatsApp existente na interface não faz parte da API, pois é apenas comportamento visual posterior ao faturamento.

## Autenticação

A API aceita Bearer token usando, nesta ordem:

1. `BILLING_IMPORT_API_TOKEN`
2. `ORDER_IMPORT_API_TOKEN`
3. `INTEGRATION_TOKEN`

O token nunca deve ser colocado em PDF, prompt, URL ou log. Deve ficar configurado como segredo no ambiente do conector/servidor.

## Schema para integração

O schema OpenAPI está publicado no projeto em:

`/openapi-imperio-integracao.json`

Ele contém as operações de validação/criação de pedidos e validação/confirmação de faturamentos.
