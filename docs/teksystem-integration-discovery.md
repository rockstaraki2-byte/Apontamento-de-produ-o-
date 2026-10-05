# Integração Tek-System ↔ Apontador

Data da descoberta: 18/09/2026

## Ordem confirmada

1. Tek-System → Apontador: clientes, produtos e pedidos.
2. Tek-System → Apontador: faturamentos.
3. Apontador → Tek-System: itens embalados.
4. Apontador → Tek-System: lotes e apontamentos de produção.

## Como o Apontador identifica uma embalagem

O registro canônico é a coleção `logs`, com `type: "EMBALAGEM"`:

| Dado | Campo | Observação |
|---|---|---|
| Pedido | `orderId` e `orderCode` | O `orderId` aponta para `orders`; `orderCode` é o código externo do pedido. |
| OP/lote | `associatedBatchId` e `associatedBatchName` | Vínculo com `productionBatches`; também é possível relacionar pelo `orderId` presente em `orderIds`. |
| Item | `itemId` | A linha do pedido preserva cor, tamanho e variação. |
| Quantidade | `quantityPacked` | Quantidade embalada naquele evento. |
| Setor | `sectorId` e `sectorName` | O setor é carregado do trabalho ativo; para embalagem sem setor explícito, usa-se `Embalagem`. |
| Operador | `operatorId` e `operatorName` | O ID aponta para `users`; o nome é uma cópia para auditoria histórica. |

Quando um trabalho de embalagem atende mais de um pedido, o Apontador cria um log por pedido, distribuindo a quantidade por FIFO (data de entrega e criação do pedido). Para embalagem manual/avulsa, `itemId` pode ser `0` e a identificação fica em `thirdPartyName`/`customProductName`.

## Exemplos anonimizados para o contrato

### Pedido

```json
{
  "codigoPedido": "PED-000123",
  "cliente": { "codigo": 501, "nome": "CLIENTE EXEMPLO", "cidade": "Ubá", "uf": "MG" },
  "condicaoPagamento": "BOLETO",
  "prazoDias": [28],
  "dataEntrega": "2026-09-30",
  "itens": [
    { "codigo": "PROD-001", "descricao": "Produto Exemplo", "cor": "PRETO", "tamanho": "M", "quantidade": 120 }
  ]
}
```

### OP/lote

```json
{
  "id": 1526,
  "nome": "LOTE 1526 - EMBALAGEM",
  "setorId": 10,
  "setor": "Embalagem",
  "orderIds": [170000000001],
  "status": "EM_PRODUCAO"
}
```

### Item embalado

```json
{
  "id": 1700000001001,
  "type": "EMBALAGEM",
  "orderId": 170000000001,
  "orderCode": "PED-000123",
  "associatedBatchId": 1526,
  "itemId": 101,
  "quantityPacked": 40,
  "sectorId": 10,
  "sectorName": "Embalagem",
  "operatorId": "operador_exemplo",
  "operatorName": "OPERADOR EXEMPLO",
  "timestamp": 1780000000000
}
```

### Matéria-prima

```json
{
  "codigo": "MP-CHAPA-015",
  "descricao": "Chapa de aço 1,50 mm",
  "tipo": "MATERIA_PRIMA",
  "unidade": "KG",
  "ativo": true
}
```

### Faturamento

```json
{
  "numeroNota": "NF-000987",
  "codigoPedido": "PED-000123",
  "dataFaturamento": "2026-09-18",
  "itens": [
    { "codigo": "PROD-001", "quantidade": 40, "valorUnitario": 25.5 }
  ],
  "status": "FATURADO"
}
```

## Descobertas no computador

- O cliente local encontra o servidor Firebird em `SERVIDOR:3055`.
- A configuração local do servidor de aplicação em `C:\Tek-System\ExecMC\CONFIG\ServApl.cds` informa o host `192.168.1.120` (resolvido localmente como `SERVIDOR`), protocolo `tcp/ip` e porta `5700`.
- O executável local `C:\Tek-System\ExecMC\ExecMetodoInterpERP.exe` é o caminho oficial documentado para executar métodos interpretados do TekServer; nesse fluxo não é necessário conhecer o alias do Firebird. A empresa configurada localmente é `1` e o usuário exibido no `ClienteTek.ini` é `RAUL IMP`.
- O arquivo de banco não está em `C:\Tek-System`; a instalação local possui o cliente Firebird e arquivos de estrutura, mas não um `.FDB`/`.GDB`.
- O alias/caminho lógico da base não foi encontrado nos arquivos locais e o compartilhamento do servidor não está exposto nesta sessão. Portanto, ainda não é seguro montar uma conexão SQL apontando para um caminho inventado.
- O arquivo local de metadados do servidor de aplicação lista métodos oficiais de PCP, incluindo `TSMCadPCP_EntSaiEstoque.EfetuarEntradaColetor`, `TSMCadPCP_EntSaiEstoque.SalvaCDSEntrada`, `TSMCadPCP_OrdemProducaoPecaSetor.FinalizarProducao` e `TSMCadPCP_OrdemProducaoPecaSetor.IniciarProducao`. Eles são candidatos para a gravação oficial, mas ainda precisamos confirmar o endpoint/protocolo e os dados obrigatórios com a Tek-System.
- O `ExecMetodoInterpERP.exe` ainda informa que precisa ser executado uma vez com privilégios administrativos para registrar o componente no Windows; por isso nenhum método de leitura ou gravação foi executado.
- O registro administrativo foi concluído com sucesso. Na versão instalada, o executável rejeita `-U`/`-S` e exige `-T` (token de acesso do usuário); portanto, a senha do usuário não pode ser usada diretamente pela ferramenta de integração.

## Implementação iniciada sem token Tek-System

- Criado o contrato versionado do lote em `api/_lib/teksystemSync.ts` para clientes, produtos, pedidos e faturamentos.
- Criada a rota `POST /api/integration/teksystem/sync`, autenticada pelo token do Apontador, com modo `dryRun`.
- A rota grava somente staging em `teksystemSyncRuns` e `teksystemSyncRecords`; não altera as coleções operacionais.
- Criado o agente local `tools/teksystem-sync-agent.ts`, com diagnóstico das portas `5700`, `3055` e `5793`, validação de lote e envio para staging.
- Criado o fixture fictício `tools/teksystem-sync.sample.json` para testes sem dados reais.

## Exportação por arquivos encontrada

- O `ClienteTek.ini` possui a configuração `[FExportaCadColetor]` apontando para
  `C:\Users\Micro\Documents\Coletor`.
- Os executáveis `FaturamentoMC.exe` e `ProducaoMC.exe` possuem componentes
  `TFCADCONFIGARQCOLETOR` e `TFEXPORTACADCOLETOR`, além de rotinas de importação
  de documentos/produção.
- A pasta já contém o arquivo sem extensão `CORTES BENATTI`, gerado pelo fluxo
  de coletor. Ele tem 896 bytes e é composto por linhas em branco, portanto é
  uma evidência do mecanismo de arquivo, não um lote útil para importar.
- O arquivo `.CDS` analisado contém as tabelas de configuração de exportação
  (`EXPORTA_TITULOS`, registros e detalhes), com fórmulas e campos do
  Tek-System, mas não contém endpoint ou token.

Esse fluxo pode ser usado para Tek-System → Apontapro se conseguirmos configurar
um layout exportável para clientes, produtos, pedidos e faturamentos e confirmar
como o arquivo é gerado. O agente local pode monitorar a pasta e enviar os dados
para staging. Isso não resolve, por si só, a gravação de embalagens/lotes no
Tek-System.

A próxima etapa técnica é obter credenciais de leitura Firebird ou um export oficial para substituir o fixture por dados reais. A escrita no Tek-System continuará bloqueada até o método oficial de estoque/produção ser validado em homologação.
