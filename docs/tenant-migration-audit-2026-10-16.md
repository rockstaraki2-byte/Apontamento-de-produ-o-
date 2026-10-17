# Publicação global e migração multi-tenant — 2026-10-16

## Autorização e alvos

O responsável autorizou expressamente a desvinculação de Raul, os ajustes de isolamento, a migração de dados, as exclusões e a produção. Dispensou backup. Projeto Firebase `gen-lang-client-0901917587`, banco `producao`; projeto Vercel `apontamento-de-producao`, equipe `rockstaraki2-7530s-projects`. `main` estava em `5cd1746410de29c8ac8dc9a694cdf083daeb1e9e`, igual ao remoto após fetch. Alterações locais anteriores, inclusive orçamentos laser, foram preservadas.

## Auditoria de leitura repetida antes da escrita

- 27 perfis: Raul sem tenant/papel; demais 26 já em `imperio`.
- 570 documentos Cyrnedecor: items 105, orders 152, logs 175, activePacks 6, notifications 5, stocks 14, stock_movements 27, employees 5, customers 1, sectors 19, flows 4, rejectionReasons 6, productionSteps 48, productionBatches 2.
- 7 documentos Val em sectors.
- 153 documentos sem tenant: notifications 1, stock_movements 76, epiDistributions 74, uniformDistributions 2. O responsável confirmou pertencimento a `imperio`.
- Empresas: demonstracao, imperio, sk. Nenhuma nova empresa será criada em produção para testes.
- userCredentials vazia. 14 perfis com senha legada; 13 sem senha no documento. O aplicativo antigo mesclava senhas dos perfis iniciais e aplicava um fallback. Esses valores aceitos serão preservados como hashes, sem incluí-los no relatório. Para Raul será usada a senha explicitamente fornecida pelo responsável, correspondente ao override legado.

## Alterações planejadas e proteções

O script `scripts/migrate-tenant-20261016.cjs` valida novamente cada contagem antes de gravar, funciona em dry run por padrão e exige `--apply`. Usa precondições de updateTime e criação exclusiva das credenciais. Não gera backup nem registra senhas, hashes, tokens ou payloads. Interrompe na primeira falha e informa quantas escritas foram confirmadas.

Perfis: Raul global/ADMIN; demais imperio. Papéis ausentes: dinei ENCARREGADO; injetora INJETORA; montagem_retratil MONTAGEM_RETRATIL; quatro representantes REPRESENTANTE; Raul ADMIN. Corrige também prensa_eduardo para PRENSA_EDUARDO, conforme o perfil efetivo legado. Preserva os demais campos. Senhas saem dos perfis e entram como scrypt na coleção privada.

Credencial de serviço já configurada no Vercel: `FIREBASE_SERVICE_ACCOUNT_KEY`, tipo Secret, Hidden, somente Production. Permissões aprovadas: datastore.user e firebaseauth.admin. A publicação das regras usa a conta Google reautenticada; nenhuma permissão extra foi adicionada à credencial de runtime. Nenhum valor da chave foi recuperado.

Regras candidatas compilaram na API Rules sem ativação. A release permanece na versão anterior até a janela coordenada. Guard de produção preservado. Publicação do aplicativo será pelo push normal do commit atual da main, sem force push.

## Validações antes da publicação

- Typecheck: passou.
- Emuladores Auth/Firestore, conjunto completo TypeScript: 132 passaram, zero falhas. Inclui cadastro de empresa/usuário, login global, aliases e isolamento.
- Testes MJS existentes: 15 passaram, zero falhas.
- Testes scripts existentes, incluindo orçamentos laser: 10 passaram, zero falhas.
- Build frontend e servidor: passou. Revisão React final isolou os hooks da central atrás do componente autorizado; typecheck/build repetidos após essa revisão.

## Janela e rollback

Preparar código, regras exatas e script antes de ativar. Confirmar o novo deploy Git da main Ready; aplicar migração e ativar as regras do banco producao na mesma janela curta; conferir fingerprint, login e negativas de acesso entre tenants imediatamente. Cadastros de teste apenas no emulador.

Regras anteriores: `projects/gen-lang-client-0901917587/rulesets/0bced001-8fdc-488a-acc4-4cad6bae7130`. Para restaurar, atualizar a release `projects/gen-lang-client-0901917587/releases/cloud.firestore/producao` com esse rulesetName na API Rules (PATCH release com updateMask=rulesetName e quota project correto).

App anterior: `dpl_6zWZup3Fire582SrxDfEtMkhTa7r`, commit `5cd1746410de29c8ac8dc9a694cdf083daeb1e9e`, URL `https://apontamento-de-producao-iskeja2ue-rockstaraki2-7530s-projects.vercel.app`. Restaurar com `vercel rollback <URL>` no projeto/equipe acima, junto da release de regras anterior. Rollback de versão não desfaz exclusões ou hashes de senhas; backup foi dispensado pelo responsável. Credenciais privadas devem ser preservadas se houver rollback; o login cliente legado exigiria adaptação ou redefinição das contas cujas senhas saíram dos perfis. O rollback Vercel suspende auto-assignment; retomar pelo promote do deploy corrigido.

## Estado no commit de preparação

Nenhuma exclusão, migração de produção, ativação de regra ou deploy do novo aplicativo foi concluído no momento de preparar este documento. O resultado da execução e as verificações devem ser registrados após a janela, sem declarar sucesso antecipado.
