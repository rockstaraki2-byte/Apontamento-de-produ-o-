# Pós-processamento: PDFs dos pedidos e relatórios no Google Drive

## Funcionamento

O coletor Windows mantém o Tek-System em READ ONLY. Cada página confirmada pelo escritor é registrada numa fila durável local. Depois do término da rodada, a tarefa existente `Imperio PDF Agent` usa a mesma sessão autenticada do ApontaPRO para gerar os PDFs.

- Seleção por código exato: pedidos `CRIADO`, `ATUALIZADO`, `COMPLEMENTADO` e faturamentos `FATURADO`, sempre em `APPLIED`.
- `JA_EXISTE` dispara somente quando a API confirma `pdfNeedsRefresh` por alteração real de pagamento/observação; mudança apenas de vínculo técnico não dispara. `SEM_ALTERACAO`, `REVIEW` e `RETRY` não disparam exportação. Pedido em revisão na mesma rodada é bloqueado.
- Uma exportação por pedido na rodada, mesmo que várias linhas ou ações tenham mudado.
- Filtro `Todos` somente para os códigos selecionados: pedidos já impressos são reexportados quando alterados.
- Não imprime fisicamente e não cria pastas de representantes. Nome/representante seguem o espelho do ApontaPRO. Só marca impressão após salvar.
- Erros ficam em `RETRY` com espera de 5, 10, 20, 40 e até 60 minutos. Um pedido com erro não impede os demais.
- Não abre uma segunda instância do perfil do Chrome. A fila tem trava de processo e reconhece execuções já entregues.
- Os comandos GitHub antigos continuam disponíveis; a nova ligação não cria Issues.
- Horários do coletor continuam segunda a sexta, 08h30–17h30, Brasília. A fila é pós-processamento, não uma nova tarefa horária.

## Relatórios na nuvem

Destino fixo: `19BxckmRHkPs0C4V1rLHCZ2OgQb0xhhQE`. Organização: `Outubro 2026 / 06-10-2026 / Execucao-...txt`.

O relatório inclui ações por cadastro, código dos pedidos, revisões, fila final, PDFs salvos e falhas. Quando um PDF pendente é concluído, o mesmo relatório é atualizado. Os conteúdos permanecem temporariamente numa caixa de saída local enquanto o envio não for confirmado; após confirmação ficam apenas no Drive, com um pequeno recibo local. Não se perde relatório por falta de rede ou autorização.

Não confundir: a conexão Google Drive do chat não fornece automaticamente credenciais ao processo do Agendador Windows.

## Configuração inicial do Google (ação manual da conta proprietária)

O serviço já está preparado em `tools/teksystem-drive-report.gs`. Ainda não está publicado nem autorizado. Usamos Google Apps Script para dispensar a criação de um cliente OAuth Desktop e não manter refresh token Google no Windows.

1. Abra `https://script.google.com/home/start` com a conta que pode gravar na pasta. Crie um projeto chamado **Relatórios TekSystem ApontaPRO**. Cole o conteúdo de `tools/teksystem-drive-report.gs` no arquivo `Código.gs`.
2. No Windows, execute:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Micro\AppData\Local\ApontaPRO\TekSystem\agent-source\tools\teksystem-drive-setup.ps1" -Prepare -CopySecret
   ```

   O segredo fica protegido pelo DPAPI e é copiado apenas a pedido explícito local. No Apps Script, **Configurações do projeto → Propriedades do script**, crie `TEKSYSTEM_REPORT_SECRET` e cole o segredo. Não o envie pelo chat. Limpe a área de transferência após colar.
3. **Implantar → Nova implantação → Aplicativo da Web**. Execute como **Você** e permita acesso à URL a **Qualquer pessoa**, pois o agente não tem login de navegador Google; o código rejeita requisições sem assinatura HMAC válida e com mais de cinco minutos. Isso NÃO torna os relatórios ou a pasta públicos e NÃO altera o compartilhamento do Drive.
4. Autorize o acesso Google pessoalmente. O serviço `DriveApp` pede permissão de Drive na tela Google; o código fixa a pasta e não aceita destino diferente, exclusão, movimentação ou compartilhamento. Se essa permissão não for aceitável, NÃO autorize: será necessário outro desenho com OAuth `drive.file` e seleção da pasta pelo Google Picker.
5. Copie a URL publicada terminada em `/exec` (não `/dev`) e configure:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Micro\AppData\Local\ApontaPRO\TekSystem\agent-source\tools\teksystem-drive-setup.ps1" -Endpoint "URL_PUBLICADA_EXEC"
   ```

6. Reinicie a tarefa **Imperio PDF Agent**, sem modificar os horários do coletor. Confirme o primeiro relatório na pasta do Drive. A URL `/exec` pode ser informada ao assistente; o segredo não.

## Limites da confirmação e recuperação

- As páginas recebidas são persistidas antes de pedir a próxima página. Uma execução interrompida após o recebimento pode ser retomada com seus resultados confirmados; nunca converter uma revisão em aprovação.
- Se o servidor efetivar uma gravação mas a resposta se perder antes de chegar ao Windows, o coletor não conhece o código daquela ação. Esse caso exige reconciliação do histórico do escritor; não prometemos exatamente-uma-vez entre a API e o filesystem.
- Sessão ApontaPRO expirada, representante ausente, pasta inexistente e erro de PDF ficam pendentes; não inventar cadastros/pastas nem fazer login automático.
- O Apps Script usa uma trava para reutilizar pastas/arquivo sem duplicatas e verifica identidade da rodada, assinatura, timestamp e raiz. Publicação/consentimento Google e primeiro envio real precisam ser validados após a etapa manual.
