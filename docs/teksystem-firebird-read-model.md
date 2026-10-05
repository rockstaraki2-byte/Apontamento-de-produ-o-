# Modelo de leitura do Tek-System

Este documento registra o mapa encontrado no XML de estrutura instalado em
`C:\Tek-System\ExecMC\TEMP\Micro\EstruturaDoBancoDeDados\Versao-167.00.xml`.

## Conexão descoberta

- Servidor Firebird: `SERVIDOR`
- Porta: `3055`
- Banco: `C:\Tek-System\Dados\DadosMC.fdb`
- Empresas de leitura compartilhadas: `0` e `1` (configurável via `TEKSYSTEM_COMPANY_IDS`)
- Cliente Firebird local disponível em `C:\Tek-System\ExecMC\fbclient.dll`

As credenciais do Firebird não ficam no `ClienteTek.ini`. O usuário do Tek-System
é uma autenticação da aplicação/proteção, portanto não deve ser reutilizado como
se fosse usuário do banco sem confirmação.

## Fontes por fluxo

### 1. Clientes

Fonte principal:

- `PESSOA`: `CODIGO_PESSOA`, `RAZAOSOCIAL_PESSOA`, `NOMEFANTASIA_PESSOA`,
  `DOCUMENTO_PESSOA`, `CLIENTE_PESSOA`, `DATAHORAALTERACAO_PESSOA`.
- `PESSOA_CLIENTE`: `PESSOA_PESSOA_CLI`, `CONDPAGTO_PESSOA_CLI` e
  `DATAHORAALTERACAO_PESSOA_CLI`.
- `PESSOA_ENDERECO`: `PESSOA_PESSOA_END`, `ENDERECO_PESSOA_END`,
  `NUMERO_PESSOA_END`, `BAIRRO_PESSOA_END`, `CIDADE_PESSOA_END` e
  `DATAHORAALTERACAO_PESSOA_END`.
- `CIDADE` e `UF`: nomes e sigla do município/estado.

O endereço padrão é indicado pelos campos `ENDERECO_PESSOA`,
`ENDERECOENTREGA_PESSOA` e `ENDERECOCOBRANCA_PESSOA` em `PESSOA`.

### 2. Produtos, peças e matérias-primas

- `ITEM`: código, descrição, referência, unidades, controle de estoque,
  fabricação própria, rastreio de produção, grupo, subgrupo e tipo de produto.
- `ITEM_PECA`: vínculo de peça e matéria-prima padrão.
- `ITEM_SALDO`: saldo por empresa e variações de item.
- `ITEM_COMPOSICAO` e tabelas de detalhe: composição de produtos quando for
  necessário trazer a estrutura completa.

### 3. Pedidos

O documento comercial usa `DOCUMENTO_FATURA` como registro principal. O tipo
pedido é identificado pela existência do filho `DOCUMENTO_PEDIDO`:

- `DOCUMENTO_FATURA`: `CODIGO_DOCFAT`, `EMPRESA_DOCFAT`, `CLIENTE_DOCFAT`,
  `DTEMISSAO_DOCFAT`, status/situação, totais e datas de alteração.
- `DOCUMENTO_PEDIDO`: `DOCUMENTO_DOCPED`, datas de venda/promessa e condição
  de prazo.
- `DOCUMENTO_ITEM`: itens e quantidades do pedido, incluindo
  `QTDEPEDIDO_DOCITEM`, `QTDEFATURADO_DOCITEM`, `QTDEABERTA_DOCITEM` e
  `LOTEFABRICACAO_DOCITEM`.
- `DOCUMENTO_ITEM_DETALHE`: detalhamento/particionamento do item e
  `NUMITEMPED_DOCITEMDET`, variação/cor/grade/acabamento, quantidades e preços.
- `DOCUMENTO_PEDIDO`: tabela de condição, prazo, datas de venda/entrega e
  previsão de faturamento.
- `DOCUMENTO_PRAZOS`: forma de pagamento, parcelas, vencimentos e valores.
- `DOCUMENTO_PEDREPRESENTANTE`: códigos e nomes dos representantes.

O `externalId` proposto para o Apontador é `DOCUMENTO_FATURA.CODIGO_DOCFAT`;
os itens usam a combinação do documento com `DOCUMENTO_ITEM.AUTOINC_DOCITEM`.

### 4. Faturamentos

- `DOCUMENTO_FATURA`: cabeçalho comercial, cliente, datas e valores.
- `DOCUMENTO_ITEM`: itens faturados e `QTDEFATURADO_DOCITEM`.
- `DOCUMENTO_FISCAL`: dados complementares fiscais ligados ao documento.
- `NOTA_FISCAL` e `NOTA_FISCAL_ITEM`: número, série, chave/status da NF e
  quantidades/valores fiscais.
- `DOCUMENTO_PRAZOS`: condições e vencimentos.

O `externalId` deverá combinar o identificador Tek-System com o número/série da
nota quando houver emissão fiscal, evitando colisão entre documento comercial e
NF.

Para marcar os itens faturados no ApontaPRO, a fonte de conferência é o
romaneio/carga, e não as linhas da nota fiscal:

- `CARGA_ITENS` liga cada quantidade de romaneio diretamente ao detalhe do
  item do pedido por `AUTOINCITEMDETDOC_CARITE`.
- `QTDEFATURADO_CARITE` e `QTDEABERTA_CARITE` são as quantidades faturada e em
  aberto; `FAMILIA_CARITE` identifica a família (código `1` = `GERENCIAL`).
- `CARGA_DOCUMENTOS` e `CARGA` fornecem a carga, data e liberação de
  faturamento.
- A tabela auxiliar `DOCUMENTO_ENTREGA` não foi usada para calcular o status:
  no teste, ela manteve quantidade aberta mesmo quando o item do romaneio já
  indicava faturamento total.

O leitor cria IDs estáveis por linha do pedido e por item de romaneio. A opção
`--date YYYY-MM-DD` filtra pedidos pela data de emissão (`DTEMISSAO_DOCFAT`).
Quando `pedidos` e `romaneios` são exportados juntos, os romaneios são limitados
aos pedidos desse dia. O export do leitor permanece somente leitura.

### 5. Produção, lotes e estoque

- `PCP_LOTE`: lote de produção e datas.
- `PCP_ORDEMPRODUCAO`: OP, lote, cliente, documento e datas.
- `PCP_ORDEMPRODUCAO_ITEM`: produto da OP e quantidades planejadas/baixadas.
- `PCP_ORDEMPRODUCAO_MATPRIMA`: matérias-primas e consumo previsto.
- `PCP_ORDEMPRODUCAO_PECAS`: peças e quantidades.
- `PCP_APONTAMENTO`: apontamento por OP, lote, setor, responsável, item e
  quantidade.
- `PCP_ORDEMPRODUCAO_PECA_SETOR`: setor, quantidade e produzido.
- `PCP_ENTSAI_ESTOQUE` e `PCP_ENTSAI_ESTOQUE_DET`: entrada/saída de estoque
  físico/intermediário vinculada a lote, OP e item.
- `MOVIMENTO_ESTOQUE`: histórico de movimentos; deve ser usado inicialmente
  apenas para conferência.

## Estratégia segura

1. Ler somente por usuário Firebird com permissão de `SELECT`.
2. Exportar para o formato normalizado do agente local.
3. Fazer `dry-run` na API do Apontador.
4. Gravar primeiro em `teksystemSyncRuns`/`teksystemSyncRecords`, incluindo
   pedidos detalhados e romaneios, sem alterar clientes, pedidos ou estoque do
   Apontador.
5. Depois de validar amostras reais, ativar a sincronização horária.

As rotinas de gravação em estoque, OP, lote e apontamento não devem ser feitas
por `INSERT` direto no Firebird. Elas devem usar o método oficial do Tek-System
quando o token/contrato de integração estiver disponível.

## Próximo dado necessário

Para concluir o leitor real falta uma destas opções:

- credencial Firebird de leitura (`usuário`, `senha` e confirmação de acesso);
- exportação CSV/Excel/XML de cada conjunto para validar os mapeamentos;
- token/método oficial Tek-System para leitura e gravação.

Nenhuma senha deve ser enviada no chat; basta configurá-la localmente como
variável secreta.
