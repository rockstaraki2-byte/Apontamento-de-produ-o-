# Agente local Tek-System

## Objetivo atual

O agente lê o Firebird em modo somente leitura, envia os dados para staging e, no ciclo normal, processa a fila de gravação do ApontaPRO. O writer atualiza cadastros de clientes e produtos, lança/atualiza pedidos e aplica faturamentos a partir dos romaneios, com validação de códigos, quantidades e tenant. Faturamento não gera baixa automática de estoque nem apontamento de produção. `dryRun` valida sem enfileirar ou aplicar alterações.

O comando `teksystem:sync` executa um ciclo incremental: na primeira execução consulta as últimas 24 horas; nas seguintes, usa a marca d'água do último ciclo bem-sucedido e reconsulta cinco minutos anteriores para cobrir atrasos. Divide os envios em lotes de até 1.000 registros. A marca d'água só avança se todos os lotes forem aceitos; registros repetidos no staging são atualizados por chave determinística.

## Precedência e conciliação de pedidos

Quando o mesmo cadastro ou pedido tem valores diferentes, o Tek-System é a fonte dos dados que podem ser sincronizados. Para localizar linhas antigas do ApontaPRO sem chave de origem, o writer começa pelo código do produto e usa cor, medida, variação explícita e valor líquido unitário cobrado para desempatar. O relatório registra o critério usado em `vinculosItens`. Se os sinais apontarem para linhas diferentes, o pedido continua em `REVIEW`; o agente não escolhe a primeira linha nem usa quantidade/nome como palpite.

Uma linha localizada pode receber do Tek-System correções de cliente, produto, cor, medida, variação, quantidade, preço, desconto, pagamento, entrega e observações. Mudanças de identidade/cliente após início de operação, mudanças de quantidade após embalagem/produção/faturamento e alterações comerciais depois de faturado continuam em revisão para preservar o histórico operacional. Se o consultor não tiver vínculo único no ApontaPRO, os demais campos do pedido existente ainda podem ser atualizados e o representante atual é preservado com aviso; pedidos novos continuam exigindo o cadastro do representante.

## Agendamento e segredos no Windows

`tools/teksystem-sync-setup.ps1` solicita credenciais em prompts seguros e grava-as como `PSCredential` em XML protegido pelo DPAPI do usuário Windows atual, em `%LOCALAPPDATA%\ApontaPRO\TekSystem`. Prefira uma conta Firebird dedicada de somente leitura. Se usar `SYSDBA` temporariamente, todas as consultas do leitor usam transações Firebird `READ ONLY`; ainda assim, a senha administrativa exige proteção extra. O token Bearer e o bypass do Vercel também ficam protegidos localmente, não em `.env.local` ou no repositório.

O setup sem parâmetro apenas provisiona segredos/configuração. Para validar Firebird e endpoint com uma requisição `dryRun` e instalar a tarefa a cada cinco minutos:

```powershell
npm.cmd run teksystem:sync:install
```

A tarefa usa o usuário Windows atual, com privilégio limitado, evita execuções concorrentes e roda a cada cinco minutos enquanto esse usuário estiver conectado. Se uma execução falhar, o cursor não avança. Logs operacionais e cursor ficam em `%LOCALAPPDATA%\ApontaPRO\TekSystem`; o JSON temporário da extração é removido ao final.

Para uma validação manual sem gravação no Firestore:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/teksystem-sync-run.ps1 -DryRun
```

## Carga automática no lançamento do pedido

Ao criar um pedido novo, o writer procura uma rota ativa do cliente (ou compatível com a cidade cadastrada) e calcula a próxima ocorrência elegível no mesmo calendário usado pelas sugestões de cargas do ApontaPRO. Se já houver carga `ABERTA` ou `PLANEJADA` para aquela rota/data, o pedido é associado a ela; se não houver, cria uma carga `ABERTA` para essa rota/data e associa todas as linhas e quantidades do pedido. Pedido, carga e vínculo são gravados na mesma transação.

Para evitar duplicidades, uma carga já existente e fechada não é recriada: o pedido é lançado sem vínculo automático e o resultado registra um aviso. Se não houver rota ativa, cidade/cliente compatível ou data válida, o pedido também pode ser criado sem carga e o motivo aparece no resultado da execução. O `dryRun` prevê a rota/carga sem gravar dados.

## Rota de staging

`POST /api/integration/teksystem/sync`

Autenticação:

```text
Authorization: Bearer <ORDER_IMPORT_API_TOKEN>
```

O mesmo token dedicado da integração do Apontador pode ser usado localmente por `TEKSYSTEM_SYNC_API_TOKEN`. O token não é persistido no lote nem no log.

As gravações desta etapa vão para:

- `teksystemSyncRuns/{syncId}`: resumo do lote;
- `teksystemSyncRecords/{hash}`: último registro recebido por tenant, entidade e `externalId`.

O `tenantId` é validado contra `TEKSYSTEM_ALLOWED_TENANT_ID`, cujo padrão é `imperio`.
Em deployments protegidos pelo SSO do Vercel, o agente também envia o header
`x-vercel-protection-bypass`; a autenticação Bearer da aplicação continua obrigatória.

## Configuração local

```powershell
$env:TEKSYSTEM_HOST = "SERVIDOR"
$env:TEKSYSTEM_SERVER_PORT = "5700"
$env:TEKSYSTEM_DATABASE_PORT = "3055"
$env:TEKSYSTEM_DATABASE_PATH = "C:\Tek-System\Dados\DadosMC.fdb"
$env:TEKSYSTEM_COMPANY_ID = "1"
$env:TEKSYSTEM_SYNC_API_URL = "https://SEU-DOMINIO/api/integration/teksystem/sync"
$env:TEKSYSTEM_SYNC_API_TOKEN = "<token-local-do-apontador>"
```

Este bloco é apenas para execução manual. Para deixar credenciais persistentes
no Windows, prefira o provisionamento DPAPI acima; não grave senhas em arquivos `.env`.

O agente não tenta usar usuário/senha do Tek-System. Para leitura direta, o leitor
Firebird usa credenciais separadas e somente locais:

```powershell
$env:TEKSYSTEM_DB_USER = "usuario-firebird-somente-leitura"
$env:TEKSYSTEM_DB_PASSWORD = "configure-localmente"
```

Não coloque a senha em arquivo versionado, no lote JSON ou no chat.

## Comandos

```powershell
npm run teksystem:health
npm run teksystem:validate -- --input tools/teksystem-sync.sample.json
npm run teksystem:firebird -- probe
npm run teksystem:firebird -- export --output C:\Temp\teksystem-lote.json --since 2026-01-01T00:00:00.000Z
npm run teksystem:firebird -- export --output C:\Temp\teksystem-pedidos-hoje.json --entities pedidos,romaneios --date 2026-10-05
npm run teksystem:push -- --input tools/teksystem-sync.sample.json --dry-run
npm run teksystem:push -- --input tools/teksystem-sync.sample.json
npm.cmd run teksystem:sync -- --dry-run
```

O arquivo `tools/teksystem-sync.sample.json` contém somente dados fictícios. O primeiro envio recomendado é sempre com `--dry-run`.

O comando `probe` apenas autentica e executa `SELECT 1`. O comando `export` faz
leitura das tabelas de clientes, itens, pedidos e notas fiscais, gera um JSON
normalizado e valida o lote antes de salvar. Ele não grava no Firebird nem na
API. Depois, o JSON pode ser enviado primeiro com `teksystem:push --dry-run`.
