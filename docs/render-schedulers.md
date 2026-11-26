# Suspensão das rotinas no Render temporário

Configure `DISABLE_SCHEDULERS=true` nas variáveis do Web Service antes da primeira inicialização com credenciais reais do Firebase. Reinicie/reimplante o serviço após alterar a variável; a troca em um processo já iniciado não cancela timers existentes.

Com esse valor:
- A checagem de prazos não registra o disparo inicial de 1 minuto nem o intervalo de 24 horas.
- O agente de pedidos sem lote não registra o cron mensal nem o disparo de 2 minutos após a inicialização.
- A rota POST /api/agent/pedidos-sem-lote retorna HTTP 503 antes de criar o cliente Gemini ou executar o agente, mesmo com segredo válido.
- Os handlers de relatório diário de faturados e alertas de manutenção preventiva retornam HTTP 503 antes de acessar Firebase ou enviar mensagens, inclusive quando acionados pelas flags de billing-daily.

Não criar agendamentos no Render nem workflow de GitHub Actions para essas tarefas. O vercel.json continua contendo os dois agendamentos da Vercel. Manter a variável ausente ou false na Vercel/local preserva o comportamento dos agendamentos; isso não garante que a plataforma já tenha liberado a execução após o bloqueio de uso.

Quando os agendamentos estiverem habilitados, a rota manual do agente exige Authorization: Bearer <CRON_SECRET>. Sem segredo configurado retorna 503; com credencial ausente ou inválida retorna 401. Atualizar qualquer consumidor manual dessa rota para enviar o cabeçalho.

A variável suspende apenas essas rotinas. Não isola o Firebase de teste: as demais rotas continuam podendo ler/escrever dados de acordo com suas permissões. Este ajuste não registra os demais handlers api/* no Express e não conclui a migração para o Render.
