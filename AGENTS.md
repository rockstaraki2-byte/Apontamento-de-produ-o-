# Regras de Sistema e Segurança (Agent Instructions)

## 🚨 MANDATO CRÍTICO: ISOLAMENTO DE DADOS MULTI-TENANT (MULTI-EMPRESAS)

1. **Isolamento Estrito**: Sob nenhuma circunstância uma empresa (tenant) deve ser capaz de visualizar, editar ou acessar os dados de outra empresa. O isolamento de dados por `tenantId` é a fundação de segurança deste sistema.
2. **Filtragem de Tenant**: Todas as consultas e filtros de estado local (como a função `matchesTenant` em `useDatabase.ts` ou queries do Firestore) DEVEM garantir que o `tenantId` do registro seja estritamente igual ao `tenantId` ativo da sessão. Exceções só são permitidas para recursos de sistema explicitamente marcados como globais (`global`).
3. **Fluxo de Aprovação Obrigatório para Modificações**:
   - Caso o usuário solicite **QUALQUER ALTERAÇÃO** que envolva modificar a lógica de filtragem de tenants, o isolamento de queries no banco de dados, ou a atribuição de `tenantId` nos registros:
   - O agente **DEVE PARAR** a execução imediatamente antes de escrever qualquer código.
   - O agente **NÃO DEVE** realizar a alteração no código.
   - O agente **DEVE AVISAR** o administrador de forma clara sobre o risco de vazamento de dados multi-tenant.
   - O agente **DEVE SOLICITAR APROVAÇÃO EXPLÍCITA** do administrador ("Você aprova esta modificação na regra de segurança multi-tenant?") antes de continuar.

## Fluxo de engenharia com Codex — SistemasPRO

Estas orientações complementam, e nunca substituem, o mandato crítico de isolamento multi-tenant acima.

- Trabalhe em uma branch específica para cada demanda e proponha alterações por pull request. Nunca faça merge em `main` ou deploy de produção sem aprovação humana explícita.
- Antes de alterar código, identifique o fluxo afetado, a causa provável e os critérios de aceitação. Faça a menor mudança coerente com a arquitetura existente.
- Mudanças em autorização, tenants, regras de segurança do Firestore, dados reais, faturamento, migrações, integrações externas, secrets e infraestrutura exigem análise de riscos e autorização explícita adequada. Para isolamento de tenants, aplique integralmente a regra de interrupção obrigatória acima.
- Nunca execute escritas, exclusões, migrações ou testes destrutivos em bancos de produção. Para testes, use dados fictícios/sanitizados e ambiente isolado autorizado. Não acesse serviços externos de produção só porque há variáveis de ambiente disponíveis.
- Não altere configurações de deploy, não contorne `scripts/guard-production-deploy.mjs`, não desabilite verificações de segurança e não imprima credenciais em logs ou relatórios.
- Sempre que aplicável, execute `npm run lint` e os testes relacionados em `package.json`. Execute `npm run build` somente respeitando o guard existente e com ambiente devidamente configurado. Registre comandos, resultados e limitações; nunca declare testes como aprovados se não foram executados.
- Entregue um resumo para aprovação: problema, causa identificada, arquivos modificados, evidências de teste, riscos, impacto em outros fluxos, instruções de homologação e reversão. Marque claramente fatos verificados versus hipóteses.
- Priorize estabilidade e correções reversíveis. Quando não for possível testar uma integração, informe essa limitação e mantenha a alteração em rascunho.
