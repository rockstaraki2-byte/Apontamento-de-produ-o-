# Piloto Codex — ApontaPRO / SistemasPRO

Este guia organiza o primeiro piloto de engenharia assistida por IA. A criação deste documento **não** ativa automações, acessos ou agentes externos.

## Objetivo
Receber demandas do gestor, investigar, implementar com mudanças mínimas, testar e entregar pull requests (PRs) revisáveis. O gestor aprova publicação em produção.

## Acesso
1. Abra https://chatgpt.com/codex e entre com a conta ChatGPT.
2. Conecte o GitHub pelo fluxo apresentado pelo Codex; selecione o repositório `rockstaraki2-byte/Apontamento-de-produ-o-`.
3. Crie/selecione um ambiente para este repositório. Caso seja necessário comando de instalação, use o gerenciador de pacotes e a versão Node compatíveis com o projeto, verificando arquivos de lock antes.
4. Confira que o Codex leu o arquivo `AGENTS.md`. Esse arquivo contém regras obrigatórias de segurança multi-tenant.
5. Comece com uma tarefa de investigação **somente leitura**. Autorize implementação em uma tarefa posterior ou fase controlada.

## Processo recomendado
Demanda → investigação e critérios de aceitação → branch → implementação controlada → lint/testes relevantes → PR em rascunho → homologação com dados fictícios → aprovação do gestor → merge/deploy autorizado.

**Atenção:** dependendo da integração GitHub–Vercel, abrir branch/PR pode criar um *preview* automaticamente. Preview não significa aprovação para publicação em produção.

## Primeiro teste — histórico dos operadores
Problema relatado: o histórico apresenta a expressão genérica “apontamento de produção” em vez do nome do produto realmente apontado.

1. Identificar onde a descrição do histórico é construída.
2. Verificar o esquema do registro e a ligação confiável com o produto, inclusive quando o apontamento é antigo.
3. Planejar exibir o produto correto; considerar fallback honesto quando o nome não estiver disponível.
4. Garantir que a consulta mantém integralmente o isolamento por tenant e as regras existentes.
5. Não fazer mudanças em Firestore, autenticação ou atribuição de tenant sem seguir as aprovações exigidas no AGENTS.md.
6. Implementar somente após validação da abordagem, criar testes que façam sentido e abrir PR com evidências.

## Modelo de entrega
- **Demanda e causa:** confirmada ou hipótese
- **Alterações:** arquivos e comportamento
- **Testes:** comandos e resultado, ou motivo da impossibilidade
- **Riscos e impacto:** telas, dados, permissões e integrações
- **Homologação:** passos e massa de teste
- **Reversão:** como desfazer
- **Status:** aguardando aprovação; não publicado em produção

## Papéis funcionais
- **Coordenação técnica (Daniel):** priorizar demandas e apresentar decisões; é um papel de processo, não um agente já ativado.
- **Codex de desenvolvimento:** investigar e escrever código.
- **Revisão e testes:** atuar como etapa independente de validação, podendo usar tarefa separada do Codex.
- **Gestor:** autorizar alterações sensíveis, aprovar PR e deploy.

Comece com um fluxo único supervisionado. A automação por Telegram, orquestração de múltiplos agentes e integração de aprovação devem ser implantadas somente depois do piloto validado.
