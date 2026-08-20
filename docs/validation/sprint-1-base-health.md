# Sprint 1 — Saúde da base

**Data da validação:** 2026-08-11  
**Branch:** `feat/dashboard-v1`  
**Objetivo:** estabelecer um baseline confiável de testes e builds e registrar os fluxos críticos para a próxima etapa de cobertura end-to-end.

## Escopo do workspace

- `apps/api`: API NestJS, MongoDB/Mongoose, autenticação JWT e módulos de domínio.
- `apps/mobile`: aplicação React Native/Expo, principal superfície do produto.
- `apps/web`: superfície Next.js mínima, atualmente uma landing page.
- `packages/types`: contratos compartilhados.
- `packages/api-client`: cliente HTTP tipado compartilhado.
- `packages/ui`: primitives e tokens de UI compartilhados.

Comandos oficiais relevantes:

- `npm run test` → `nx test api`.
- `npm run test:e2e` → `nx run api:test:e2e`.
- `npm run lint` → lint de `types` e `api-client`.
- `npm run build` → build de `api`, `types`, `api-client`, `ui` e `web`.
- `npm exec nx build mobile` → export/build Expo para todas as plataformas.

## Suíte CoachExpertObservabilityService

Arquivo: `apps/api/src/modules/ai/application/services/experts/observability/coach-expert-observability.service.spec.ts`.

Na execução inicial, o cenário de retenção falhou com:

```text
expect(received).toBeDefined()
Received: undefined
```

O erro ocorria em `getTrace('request-1')`. O teste configurava simultaneamente `AI_EXPERT_TRACE_MAX_ITEMS=1` e `AI_EXPERT_TRACE_RETENTION_MS=1`. Como `getTrace()` executa `pruneRetentionState()` antes da leitura, o primeiro trace podia expirar pelo TTL real antes da asserção. O cenário pretendia validar limite de quantidade, mas também dependia do relógio de parede.

Classificação: teste não determinístico/desatualizado, sem alteração de contrato público e sem defeito comprovado na política de retenção.

Correção: o cenário de max items passou a usar retenção de `60000ms`; o cenário seguinte continua validando TTL com `Date.now()` controlado. A implementação de `CoachExpertRetentionPolicy` foi preservada.

## Baseline de testes

Comando:

```bash
npm exec nx test api --outputStyle=stream
```

Resultado final:

- 219 suítes aprovadas;
- 1.368 testes aprovados;
- 0 falhas.

O Jest ainda informa que um worker precisou ser encerrado à força. Isso não falhou a execução, mas indica risco de teardown/open handles e deve ser investigado em uma sprint de confiabilidade de testes.

## Baseline E2E

Validação final executada no ambiente atual:

```bash
npm exec nx run api:test:e2e --skip-nx-cache
```

Resultado: **16 suítes falharam e 56 testes falharam antes da execução dos cenários**. A causa foi infraestrutura do ambiente: `MongoMemoryServer` não conseguiu abrir portas locais, com `listen EPERM: operation not permitted 0.0.0.0`; um caso também registrou `UnexpectedCloseError` com código 48. Os hooks `afterAll` ainda produziram erros secundários ao tentar fechar instâncias não inicializadas.

Impacto: os fluxos críticos de registro, login/sessão, onboarding, treino, conclusão, check-in, Recovery, Nutrition, Coach, sessão expirada e dados incompletos não puderam ser funcionalmente certificados nesta execução. Não houve evidência de falha funcional, pois os testes não passaram da inicialização do MongoMemoryServer. A validação deve ser repetida em CI ou host com permissão de bind e Mongo disponível.

### Revalidação para a Sprint 2 — 2026-08-20

O comando oficial foi repetido em host autorizado, fora da sandbox restritiva:

```bash
npm exec nx run api:test:e2e --skip-nx-cache
```

Resultado: **17 suítes aprovadas e 60 testes aprovados**, em 21,18 s. Na sandbox, até um servidor Node trivial em `127.0.0.1` falhou com `EPERM`; no host autorizado o bind funcionou. A porta `27017` estava livre, havia aproximadamente 25 GiB livres e o diretório temporário era gravável. Não foi detectado `mongod` persistente local; o E2E iniciou o `mongod` efêmero do `MongoMemoryServer` com sucesso. Não foram observados erros de teardown na execução aprovada.

Assim, a pendência funcional E2E da Sprint 1 foi revalidada no host autorizado. A execução continua dependente de runner/host com permissão de bind local e espaço para o binário e dados temporários do Mongo.

## Builds e lint

- `npm run format:check`: aprovado, exit code 0.
- `git diff --check`: aprovado.
- `npm run lint`: aprovado para `types` e `api-client`.
- `npm exec nx build types --skip-nx-cache`: aprovado via cache local do Nx.
- `npm exec nx build api-client --skip-nx-cache`: aprovado via cache local do Nx.
- `npm exec nx build api --skip-nx-cache`: aprovado via cache local do Nx e dependência `types`.
- `npm exec nx build mobile --skip-nx-cache`: aprovado para Web, Android e iOS.
- `npm exec nx test mobile --skip-nx-cache`: 22 suítes e 104 testes aprovados.

O espaço livre observado no início da validação foi de aproximadamente 659 MiB, mantendo risco de `ENOSPC`. Nenhum workaround ou limpeza destrutiva foi executado.

## Fluxos críticos para cobertura end-to-end

### 1. Registro e criação da conta

Registrar usuário, validar resposta/token, criar perfil de usuário e garantir que a sessão pertence à conta recém-criada.

### 2. Login e sessão

Fazer login com credenciais válidas, consultar `/auth/me`, rejeitar credenciais inválidas e garantir isolamento entre usuários.

### 3. Onboarding

Completar perfil geral, perfil fitness, plano de treino e perfil nutricional; validar que a home deixa de apresentar o estado incompleto.

### 4. Treino

Consultar plano atual, iniciar o treino do dia, registrar workout, concluir a sessão e verificar atualização de histórico e progresso.

### 5. Check-in diário

Criar e atualizar o check-in do dia de forma idempotente, consultar o check-in atual, confirmar histórico de um item e validar recalculação de Recovery.

### 6. Recovery

Consultar readiness atual e histórico, validar estados stale/incompleto e confirmar que dados válidos de check-in influenciam o read model.

### 7. Nutrição

Criar perfil nutricional, calcular macros, gerar plano, carregar refeições do dia, registrar refeição, consultar histórico e substituir uma refeição.

### 8. Interação com o Coach

Carregar Coach Home/intelligence, enviar mensagem, persistir conversa, consultar histórico e validar fallback quando o LLM está indisponível ou desativado.

### 9. Sessão expirada

Enviar token expirado ou inválido, confirmar resposta de autenticação, limpar sessão no mobile e impedir acesso a dados privados posteriores.

### 10. Dados incompletos

Executar a home e os módulos com onboarding parcial, ausência de plano, ausência de histórico ou dados stale; validar estados vazios, mensagens seguras e ausência de crash.

## Status da sprint

**Concluída após revalidação E2E em host autorizado.**

O baseline de formatação, lint, testes unitários da API/mobile e builds passou. A suíte completa da API passou com 221 suítes/1.373 testes nesta revalidação; a suíte mobile passou com 22 suítes/104 testes. A execução E2E foi aprovada no host autorizado com 17 suítes/60 testes.

Pendências operacionais para a Sprint 2:

- manter o runner de CI com permissão de bind local, espaço e `TMPDIR` gravável;
- confirmar os dez grupos de fluxos críticos listados acima no escopo da Sprint 2;
- investigar separadamente o aviso histórico de worker que não encerra graciosamente na suíte da API;
- manter a prevenção de regressão do `format:check` no CI.

Recomendação para a Sprint 2: executar os fluxos críticos no host autorizado e manter a restrição de infraestrutura registrada no CI.
