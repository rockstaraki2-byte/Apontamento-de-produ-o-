# API de Importação de Pedidos

## Objetivo

A API recebe pedidos já interpretados em JSON. A leitura de PDF/CSV do TekSystem deve acontecer antes desta etapa.

Fluxo recomendado:

`PDF/CSV -> extrator -> revisão opcional -> JSON -> API -> validação -> Firestore`

## Endpoints

### Validar sem gravar

`POST /api/pedidos/importar/validar`

Também é aceito `POST /api/pedidos/importar?dryRun=true`.

### Importar

`POST /api/pedidos/importar`

## Autenticação

Enviar:

`Authorization: Bearer <ORDER_IMPORT_API_TOKEN>`

A API usa `ORDER_IMPORT_API_TOKEN` e, por compatibilidade, aceita `INTEGRATION_TOKEN` se a variável nova ainda não estiver configurada. Não existe token padrão embutido no código novo.

Headers opcionais:

- `X-Tenant-Id`: tenant, padrão `imperio`.
- `X-Integration-User`: identificador de auditoria de quem solicitou.

## Payload

```json
{
  "origem": "TEKSYSTEM_PDF",
  "tenantId": "imperio",
  "solicitadoPor": "integrador-teksystem",
  "pedidos": [
    {
      "codigoPedido": "67218",
      "cliente": {
        "codigo": "856",
        "nome": "ROFER COMERCIO E IMPORTACAO LTDA"
      },
      "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      "formaPagamento": "CARTEIRA",
      "prazos": [60],
      "comNotaFiscal": false,
      "dataLimite": "2026-09-10",
      "possuiRET": false,
      "itens": [
        {
          "codigoOriginal": "2517.11",
          "codigoProduto": "2517",
          "descricao": "BARRA CHATA REFORCO 53 CM 2 FUROS - PERFILADA",
          "familia": "GERENCIAL",
          "cor": "CINZA",
          "tamanho": null,
          "variacao": null,
          "quantidade": 200,
          "precoUnitario": "1,8500",
          "descontoPercentual": 15
        }
      ]
    }
  ]
}
```

## Resposta de importação

A resposta contém `resumo` com recebidos/criados/duplicados/erros e `resultados` individualizados com cliente, representante, forma de pagamento, prazos, regra fiscal, data, RET, totais, avisos e erros.

## Idempotência e concorrência

O Firestore não possui índice `UNIQUE` como bancos SQL. A API implementa o equivalente com `orderImportKeys`:

- a chave é um SHA-256 de `tenantId:codigoPedido`;
- a chave é lida e criada dentro da mesma transação do pedido;
- duas requisições simultâneas para o mesmo pedido competem pela mesma chave;
- apenas uma consegue criar as linhas;
- a outra recebe `JA_EXISTE`.

Antes da transação, a API também pesquisa a coleção `orders` por `orderCode` para detectar pedidos históricos criados antes desta API.

## Atomicidade

Cada pedido é isolado em sua própria transação. Todas as linhas, a chave idempotente e a auditoria de sucesso são gravadas juntas. Se uma linha falhar, nenhuma linha daquele pedido fica parcialmente criada.

Em um lote com vários pedidos, a falha de um não bloqueia os demais.

## Precisão financeira

O Firestore não possui tipo Decimal nativo. Para não usar `float` como valor canônico, a API grava inteiros escalados em 4 casas:

- `quantityScaled`
- `unitPriceScaled`
- `discountPercentScaled`
- `grossTotalScaled`
- `discountAmountScaled`
- `netTotalScaled`

Exemplo: `1,8500` é armazenado canonicamente como `18500` com escala 10.000.

Os campos numéricos existentes (`unitPrice`, `discountPercent`, `discountAmount`) são mantidos somente para compatibilidade com as telas atuais do Apontador.

A regra de arredondamento é metade para cima na quarta casa decimal.

## Cores TekSystem

- `.1` = ZINCADO
- `.3` = PRETO FOSCO
- `.4` = COBRE
- `.6` = CHAMPAGNE
- `.11` = CINZA
- `.12` = DOURADO
- `.14` = INOX
- sem sufixo = sem cor (`-` no modelo atual)

O sufixo nunca participa da busca do código base do produto.

## Nota fiscal

- `GERENCIAL` -> `SEM_NF`
- `INDEFINIDA` -> `COM_NF`
- ambas no mesmo pedido -> `FAMILIA_NF_CONFLITANTE`

Quando a família não vier no JSON, `comNotaFiscal` pode ser usado como fallback explícito e a API devolve um aviso.

## RET

Se `transacaoVenda` vier informado, somente o valor `74` gera `hasRET=true`. Quando `transacaoVenda` não vier, a API respeita `possuiRET` recebido pelo extrator.

## Auditoria

Coleção: `orderImportAudits`.

São registrados tenant, origem, solicitante, código do pedido, hash SHA-256 do payload normalizado, resultado, avisos/erros, IDs internos e timestamp. Tokens e senhas não são persistidos no log de auditoria.

## Status inicial

As linhas criadas pela API entram como `PENDENTE`, `isActive=true` e quantidades produtivas/faturadas zeradas. O texto `DOCUMENTO FATURADO` do TekSystem não altera o status do Apontador.

## Códigos de erro

- `PEDIDO_JA_EXISTE`
- `CLIENTE_NAO_ENCONTRADO`
- `CLIENTE_AMBIGUO`
- `PRODUTO_NAO_ENCONTRADO`
- `REPRESENTANTE_NAO_ENCONTRADO`
- `FORMA_PAGAMENTO_INVALIDA`
- `DATA_INVALIDA`
- `FAMILIA_NF_CONFLITANTE`
- `QUANTIDADE_INVALIDA`
- `PRECO_INVALIDO`
- `DESCONTO_INVALIDO`
- `PEDIDO_INVALIDO`
- `ERRO_INTERNO`

## Testes

Executar:

```bash
npm run test:order-import
```

A suíte cobre as 25 situações mínimas definidas na especificação, incluindo concorrência e rollback, além de testes extras de dry-run, conflito fiscal e datas impossíveis.
