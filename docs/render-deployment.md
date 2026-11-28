# Cópia do ApontaPRO no Render

Preparação de código. Publicação depende da conexão Render e das credenciais.

- Tipo: Web Service; runtime Node 24; plano Free; branch fix/render-disable-schedulers.
- Build: npm ci --include=dev && npm run build:render
- Start: npm run start:render
- Health check: /api/health
- Configurar NODE_ENV=production, DISABLE_SCHEDULERS=true antes do primeiro start.
- O bundle do servidor fica em build/server.cjs, fora de dist/, para não ser servido como arquivo público.
- Configurar as variáveis de produção do ApontaPRO. Nunca colocar valores no repositório.
- Variáveis VITE_* precisam estar disponíveis durante o build, além do runtime.
- Usar os mesmos projeto Firebase e tokens de integração para continuidade dos dados. A cópia da hospedagem não duplica o banco.
- Autorizar o domínio final no Firebase Auth; apontar o agente Windows somente depois da validação.
- Não configurar Render Cron nem GitHub Actions.

A Vercel não devolve pela API os valores classificados como sensitive. É necessário recuperar esses valores da fonte original por canal seguro ou emitir novas credenciais e coordenar a troca dos tokens com os consumidores existentes.

O Render Free bloqueia SMTP nas portas 25/465/587. As rotas de e-mail existentes continuam usando SMTP: o envio depende de adaptação para provedor HTTP autorizado ou outra solução. Não considerar o e-mail validado apenas por preencher SMTP_*.

Verificar login, permissões por tenant, importações, billing CSV, três rotas Tek-System, páginas e-mails e agendamentos bloqueados antes da troca. Não usar imports/env reais em testes de escrita sem controlar os efeitos.
