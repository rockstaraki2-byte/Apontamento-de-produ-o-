# Integração Tek-System → ApontaPRO: dois agentes

`Firebird (somente leitura) → leitor Windows → staging/fila → escritor na Vercel → Firestore operacional`

O leitor consulta as empresas 0 e 1, cujos cadastros são compartilhados. O destino autorizado continua sendo `imperio`. Nenhuma credencial Firebird vai para a nuvem e nenhuma consulta altera o Tek-System. Mesmo com a credencial SYSDBA existente, todas as consultas e leituras BLOB usam a mesma transação Firebird READ ONLY; uma conta dedicada de leitura continua recomendada.

## Responsabilidades

1. **Leitor local:** busca alterações por data/hora, inclui cadastros dependentes, lê todas as linhas dos pedidos afetados e todos os romaneios vinculados. Uma mudança em carga/romaneio também seleciona o pedido completo. Sobreposição de cinco minutos e cursor só avançado após recebimento de todas as páginas.
2. **Recebedor:** `POST /api/integration/teksystem/sync` usa o token já existente. Persiste `teksystemSyncRecords`/`teksystemSyncRuns` e enfileira trabalhos v2 em `teksystemWriterJobs`. Não altera coleções operacionais.
3. **Escritor:** `POST /api/integration/teksystem/process` usa token próprio e processa primeiro clientes, depois itens, pedidos e faturamentos. O leitor solicita páginas de processamento depois da entrega. A fila é durável; falhas são retomadas nas verificações seguintes sem depender de execução em segundo plano após a resposta da Vercel.

## Mapeamento operacional

| Tek-System | ApontaPRO | Regra |
|---|---|---|
| PESSOA / PESSOA_CLIENTE / endereço / contatos / PESSOA_TABELA / TABELA_CONDICAO / prazos | `customers` | ID interno preservado; `teksystemCode` vincula o código original. Razão social, fantasia, cidade, UF, bairro, telefone, e-mail e condição padrão da tabela comercial (`PADRAO_PESSOA_TAB = S`) são atualizados. Na ausência da tabela padrão, usa prazos e por último o campo genérico. Observações com “Transação [de venda] 74” marcam `hasRET`. |
| ITEM / variantes / ITEM_PECA | `items` | Código base; preserva composição, processos e tipo existentes. Descrição e unidade sincronizadas; variantes armazenadas como metadados. Identidade ambígua vai para revisão. |
| DOCUMENTO_FATURA / PEDIDO / ITEM / DETALHE / PRAZOS / representante | `orders` e importador existente | Novo pedido usa as regras atuais de preços, descontos, família fiscal, RET, pagamento e representante. Pedido existente não é recriado nem tem quantidades/preços sobrescritos: vincula linhas somente quando identidade e quantidade conferem. |
| CARGA / DOCUMENTOS / ITENS | `orders` e `logs` | Soma cumulativa de `QTDEFATURADO_CARITE`, pela chave do detalhe de pedido. Marca `FATURADO_PARCIAL` ou `FATURADO`; mantém log canônico `faturamento_<id>`. |
| NOTA_FISCAL / itens | staging | Arquivo para consulta, não é somado ao romaneio nem usado novamente para marcar faturamento. Inclui assim vendas com ou sem NF quando registradas nos romaneios. |

Nesta etapa o faturamento é uma **marcação**: não movimenta estoque físico nem gera outra saída de estoque no ApontaPRO. Não há escrita de lotes/estoque no Tek-System. Esses fluxos exigem um contrato de gravação separado.

## Segurança, repetição e revisão

- Token do escritor `TEKSYSTEM_WRITER_API_TOKEN`, distinto do recebedor. Bypass Vercel continua dedicado e não substitui a autenticação das APIs. Nunca usar variáveis `VITE_*` para segredos.
- `TEKSYSTEM_WRITER_ENABLED=true` ativa a aplicação. Preview deve ficar desativado para escritas; simulação é permitida autenticada.
- Com o escritor desativado, recebimento v2 real retorna 503 antes de persistir; o cursor do leitor não avança. Isso também impede um preview de alimentar a fila operacional compartilhada.
- Consultas operacionais têm `tenantId == imperio`; representantes explicitamente globais podem ser consultados separadamente. Colisão de ID com outra empresa é recusada.
- Hash de conteúdo, chave de importação, transações, bloqueio global por empresa e reservas de trabalho impedem repetição/concorrência. Reenvio do mesmo conteúdo não reaplica faturamento.
- Estados: READY, PROCESSING (reserva de 90s), APPLIED, RETRY (falha transitória, 3min) e REVIEW (divergência de negócio). Alteração de conteúdo enfileira nova revisão; auditorias por hash preservam histórico anterior.
- Estorno, excesso de quantidade, item/cliente divergente, identificação ambígua, pedido vazio e forma de pagamento sem mapeamento não são corrigidos automaticamente.
- `GET /api/integration/teksystem/process` autenticado retorna contagens e até dez revisões por tipo em `reviewJobs` (sem colisão de nomes com o contador `REVIEW` em clientes JSON case-insensitive). Após correção, `POST` com `{ "action": "requeue", "jobIds": ["<id>"] }` reavalia de 1 a 50 trabalhos REVIEW/RETRY.
- `POST` com `{ "dryRun": true, "payload": <exportação v2> }` simula sem escrever staging, fila, auditorias ou registros operacionais. Não avança cursor local.

## Agendamento Windows

`tools/teksystem-sync-run.ps1` carrega segredos DPAPI do usuário Windows e executa o ciclo. `tools/teksystem-writer-setup.ps1` adiciona somente o token do escritor à configuração existente e guarda backup protegido. A tarefa existente executa de hora em hora **enquanto o computador estiver ligado, na rede da empresa e o usuário configurado estiver conectado**. Não é um serviço Windows independente de login.

Primeiro ciclo v2 atualiza a base completa de clientes e busca pedidos das últimas 24h, itens alterados e dependentes. Não importa todo o histórico de pedidos nem cria indiscriminadamente todo o catálogo de itens no bootstrap. Para comparação excepcional, o exportador aceita `--catalog-snapshot`; `--customer-snapshot` atualiza só a base completa de clientes. Exportações manuais contêm dados pessoais: guardar localmente, não commitar e remover quando não forem mais necessárias.

Páginas normalmente têm até 250 registros, com limite de bytes, mantendo pedido+romaneios e variantes juntos. Snapshot maior que o limite é recusado, nunca cortado. O escritor recebe páginas curtas (até 35s de processamento + encerramento), com paralelismo limitado para cadastros e aplicação serial para pedidos/faturamentos. Rodada local limitada a 20min, tarefa a 30min, sem duas execuções simultâneas.

Comandos (segredos no ambiente da sessão ou no runner DPAPI):

```powershell
npm.cmd run teksystem:sync -- --dry-run
npm.cmd run teksystem:sync
npm.cmd run teksystem:writer:status
npm.cmd run teksystem:writer:process
npm.cmd run teksystem:writer:preview -- --input C:\caminho\exportacao.json
```

`sync --dry-run` valida extração/recebimento e consulta o estado do escritor, sem aplicar. Para simulação de mapeamento, usar `writer:preview`. O script de comparação local `teksystem-writer-preview.ts` aceita exportação e relatório de saída, lê somente Firestore e permite simular um catálogo maior que uma requisição HTTP.

Logs/cursor: `%LOCALAPPDATA%\ApontaPRO\TekSystem\sync-<data>.jsonl`, `task-v2-<data>.log` (UTF8) e `sync-state.json`. Logs antigos são preservados. Falha de escrita após recebimento não perde dados: cursor já pode avançar porque a fila foi persistida; próxima rodada retoma os trabalhos pendentes. O checkpoint anterior a v2 não é usado como prova de aplicação operacional.

Testes: `npm.cmd run test:order-import`, `npm.cmd run test:teksystem-sync`, `npm.cmd run test:teksystem-writer`, `npm.cmd run lint`, `npm.cmd run build`. O guard de produção atual permanece intacto.
