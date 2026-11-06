# Calendário de entregas do ApontaPRO

A integração envia as cargas agendadas do tenant Império para um calendário dedicado na conta gerencia.imperiojomarci@gmail.com. O ApontaPRO continua sendo a fonte de verdade; alterações feitas diretamente no Google Calendar não voltam para o sistema.

## Configuração necessária

1. Entre no Google Calendar com gerencia.imperiojomarci@gmail.com e crie um calendário secundário chamado Entregas - ApontaPRO. Copie o ID do calendário em Configurações e compartilhamento.
2. Em um projeto do Google Cloud, habilite a Google Calendar API e crie uma conta de serviço separada para essa integração. Não habilite delegação em todo o domínio.
3. Crie uma chave JSON para a conta de serviço. Mantenha esse arquivo privado; não o envie pelo chat e não o coloque no repositório.
4. No projeto Vercel apontamento-de-producao, cadastre como variáveis sensíveis do servidor:
   - GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY: todo o conteúdo JSON da chave da conta de serviço.
   - GOOGLE_CALENDAR_ID: ID copiado do calendário Entregas - ApontaPRO.
   Configure os valores nos ambientes Production e Preview e faça um novo deploy.
5. No compartilhamento do calendário Entregas - ApontaPRO, adicione o e-mail client_email presente na chave da conta de serviço e conceda a permissão Fazer alterações nos eventos.
6. Abra Programação de Cargas no ApontaPRO com um usuário autorizado do tenant Império. A faixa Calendário de entregas deve confirmar o acesso; use Sincronizar agora para a primeira carga.

## O que é sincronizado

- Uma carga futura elegível gera um evento de dia inteiro na data programada. O turno aparece no título; a descrição inclui rota, status, pedidos vinculados, clientes, quantidades, local de saída, motorista, veículo e observações disponíveis.
- Cargas entregues, despachadas, faturadas ou canceladas não são tratadas como próximas cargas. Eventos futuros que deixarem de corresponder a cargas ativas são removidos; eventos passados não são alterados.
- A integração sincroniza automaticamente enquanto a tela Programação de Cargas está aberta e também oferece o botão Sincronizar agora. Se o sistema ficar fechado, a atualização ocorre quando a tela for aberta novamente.
- Os eventos ficam privados e transparentes na disponibilidade, para não bloquear a agenda como se fossem compromissos pessoais.

## Acesso e segurança

A conta de serviço recebe acesso somente ao calendário dedicado, por meio do compartilhamento da agenda. A aplicação usa o escopo de eventos do Google Calendar e mantém a chave JSON exclusivamente no ambiente de servidor do Vercel. O endpoint de sincronização só aceita uma sessão autorizada do tenant Império e consulta cargas e pedidos com o tenantId correspondente.
