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
