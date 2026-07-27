# Elev9 Coach — Product Roadmap 1.0 Audit

## 1. Executive Summary

**Conclusão:** o Elev9 é um MVP técnico avançado de coaching fitness determinístico, com backend modular, persistência MongoDB, cliente mobile funcional e uma base de IA fortemente testada. Ele não é, ainda, um produto de coaching adaptativo validado em produção.

O que está realmente entregue: autenticação, onboarding básico, perfil fitness, planos de treino e nutrição, execução e registro de workout, registro de refeições, snapshots de recuperação, metas, progresso, decisões determinísticas, explicabilidade interna, chat persistido, histórico e superfícies mobile do Coach.

O que está superestimado: onboarding “inteligente” completo, check-in de recuperação como experiência de usuário, adaptação cross-domain, memória durável, Coach proativo, analytics de produto, push notification, streaming/LLM operacional por padrão e paridade web.

- **Maior força:** regras determinísticas, contratos e testes de domínio/backend; `npm exec nx test api` passou com 202 suites e 1318 testes.
- **Maior fragilidade:** a experiência móvel recompõe inteligência localmente e usa fallback quando a agregação canônica está desligada; o loop central não possui analytics nem E2E ambientalmente verde.
- **Maior risco:** decisões de saúde/nutrição podem parecer inteligentes sem safety clínico, escalonamento de risco, provider de notificação ou validação de outcomes.
- **Recomendação principal:** consolidar o loop diário — check-in acessível, adaptação comprovadamente aplicada ao plano, feedback e analytics — antes de expandir memória, ecossistema ou novas superfícies.
- **Release mais próxima:** **Adaptive Coach**, mas somente como release de consolidação determinística e mensurável, não como expansão de agentes/LLM.

Estimativa secundária, sem substituir a classificação oficial: cerca de **52% do roadmap possui alguma implementação relevante**, **31% está integrado na experiência principal** e **0–5% pode ser chamado de production-ready** no sentido operacional exigido por este roadmap. A base técnica passa builds e testes unitários, mas faltam E2E ambientalmente comprovados, analytics, deploy, backup, rate limiting, push real e validação produtiva.

## 2. Repository State

- **Commit:** `36832892726510a293c2e8087a77c0755251a9b2`
- **Branch:** `feat/dashboard-v1`
- **Worktree no início/fim da auditoria:** `.vscode/settings.json` já estava modificado antes da auditoria; os relatórios desta auditoria são as únicas alterações intencionais adicionadas.
- **Projetos Nx:** `api`, `mobile`, `web`, `types`, `api-client`, `ui`.
- **Stack confirmada:** Nx 22, NestJS 11, MongoDB/Mongoose 8, Expo 54, React Native 0.81, Next 16, TypeScript, Jest, Supertest, OpenAI SDK.
- **Módulos backend:** `auth`, `users`, `fitness`, `training`, `progress`, `recovery`, `nutrition`, `goals`, `habits`, `personalization`, `notifications`, `dashboard`, `ai`, `health`.

### Comandos executados

| Comando | Resultado | Impacto |
|---|---|---|
| `npm exec nx show projects --json` | Passou | Confirmou os seis projetos Nx. |
| `npm exec nx graph --print` | Falhou | Nx graph server tentou bind em `127.0.0.1:4211` e recebeu `EPERM`; grafo foi inferido apenas de configs/imports já disponíveis. |
| `npm exec nx test api --outputStyle=stream` | Passou: 202/202 suites, 1318/1318 testes | Forte cobertura unitária/integrada de backend; houve aviso de worker com teardown incompleto. |
| `npm exec nx test mobile --outputStyle=stream` | Passou: 6/6 suites, 28/28 testes | Cobertura mobile concentrada em hooks/helpers, não em E2E visual. |
| `npm run lint` | Passou | O script cobre `types` e `api-client`, não todos os apps. |
| `npm run format:check` | Falhou | 65 arquivos com divergência Prettier. |
| `npm exec nx test:e2e api --outputStyle=stream` | Falhou: 15 suites, 54 testes | `MongoMemoryServer` não conseguiu bind/abrir portas no sandbox (`EPERM`, código 48); não comprova funcionalidade E2E nem defeito funcional. |
| `npm exec nx build api --outputStyle=stream` | Passou | API e dependência `types` compilaram. |
| `npm exec nx build types --outputStyle=stream` | Passou/cache | Contratos TypeScript compilam. |
| `npm exec nx build api-client --outputStyle=stream` | Passou | Cliente tipado compila. |
| `npm exec nx build mobile --outputStyle=stream` | Passou | Bundles Android/iOS/Web foram gerados. |
| `npm exec nx export mobile --outputStyle=stream` | Passou | Export Expo completou. |
| `npm install` | Não executado | Evitado porque poderia alterar lockfile/node_modules contra a regra de auditoria sem mutação. Dependências já estavam presentes. |

**Evidence:** `package.json`, `nx.json`, `.github/workflows/ci.yml`, `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, `docker-compose.yml`, `Dockerfile`.

## 3. Audit Method

Foram confrontados README, documentação de produto/arquitetura/domínio/roadmap/ADRs/specs, configuração Nx, package scripts, env examples, Docker, CI, módulos API, telas e hooks mobile, página web, contratos, cliente HTTP, persistência, flags, segurança, observabilidade e testes.

A escala usada é exatamente: `NOT_STARTED`, `SCAFFOLDED`, `PARTIALLY_IMPLEMENTED`, `IMPLEMENTED_NOT_INTEGRATED`, `INTEGRATED_NOT_VALIDATED`, `PRODUCTION_CANDIDATE`, `PRODUCTION_READY`.

Uma rota, DTO, tela, classe ou spec isolada não foi considerada entrega. Cada conclusão exigiu encadeamento verificável até o consumidor ou persistência. Limitações: não houve MongoDB externo, execução de dispositivo, provider OpenAI, push provider, ambiente de deploy ou coleta de analytics disponível; o E2E ficou bloqueado pelo sandbox.

## 4. Roadmap Scorecard

| Horizon | Epic | Status | User-visible | Integrated | Tested | Measured | Production-ready | Confidence |
|---|---|---|---|---|---|---|---|---|
| H0 | 0.1 Product Governance | PARTIALLY_IMPLEMENTED | Parcial | Parcial | Parcial | Não | Não | High |
| H0 | 0.2 Core Platform Stabilization | PARTIALLY_IMPLEMENTED | Não aplicável | Parcial | Parcial | Parcial | Não | High |
| H0 | 0.3 Product Analytics Foundation | SCAFFOLDED | Parcial/técnico | Não | Não comprovado | Não | Não | High |
| H1 | 1.1 Intelligent Onboarding | PARTIALLY_IMPLEMENTED | Sim | Parcial | Backend sim/mobile parcial | Não | Não | High |
| H1 | 1.2 Unified Daily Dashboard | INTEGRATED_NOT_VALIDATED | Sim | Sim, com fallback | Sim | Não | Não | High |
| H1 | 1.3 Complete Training Experience | INTEGRATED_NOT_VALIDATED | Sim | Sim no loop básico | Sim backend | Não | Não | High |
| H1 | 1.4 Complete Nutrition Experience | INTEGRATED_NOT_VALIDATED | Sim | Sim no loop básico | Sim backend | Não | Não | High |
| H1 | 1.5 Recovery Experience | PARTIALLY_IMPLEMENTED | Parcial | Parcial | Sim backend | Não | Não | High |
| H1 | 1.6 Goals and Progress | PARTIALLY_IMPLEMENTED | Parcial | Parcial | Sim backend | Não | Não | High |
| H2 | 2.1 Intelligent Daily Coaching | PARTIALLY_IMPLEMENTED | Sim | Parcial | Sim unitário | Não | Não | High |
| H2 | 2.2 Adaptive Training Engine | PARTIALLY_IMPLEMENTED | Sim | Recomendação sim; mutação de plano não comprovada | Sim unitário | Não | Não | High |
| H2 | 2.3 Adaptive Nutrition Engine | PARTIALLY_IMPLEMENTED | Sim | Recomendação/substituição sim | Sim unitário | Não | Não | High |
| H2 | 2.4 Cross-Domain Recommendation Engine | INTEGRATED_NOT_VALIDATED | Sim | Backend sim; mobile canônico flag-off | Sim unitário | Não | Não | High |
| H3 | 3.1 Habit Intelligence | PARTIALLY_IMPLEMENTED | Parcial | Backend read models | Sim backend | Não | Não | High |
| H3 | 3.2 Progress Intelligence | PARTIALLY_IMPLEMENTED | Parcial | Parcial | Sim backend | Não | Não | Medium |
| H3 | 3.3 Motivation and Engagement Intelligence | PARTIALLY_IMPLEMENTED | Parcial | Parcial | Sim de especialistas | Não | Não | Medium |
| H4 | 4.1 Long-Term Coach Memory | PARTIALLY_IMPLEMENTED | Parcial | Histórico/memória técnica; não memória durável controlada | Sim unitário | Não | Não | High |
| H4 | 4.2 Conversation Experience | PARTIALLY_IMPLEMENTED | Sim | Chat síncrono sim; streaming condicionado | Sim backend/mobile helpers | Não | Não | High |
| H4 | 4.3 Proactive Coaching | PARTIALLY_IMPLEMENTED | In-app sim | Decisão sim; entrega push não | Sim backend | Não | Não | High |
| H4 | 4.4 Coach Trust and Explainability | INTEGRATED_NOT_VALIDATED | Sim | Sim no backend/mobile | Sim unitário | Não | Não | High |
| H5 | 5.1 Health and Wearable Integrations | NOT_STARTED | Não | Não | Não | Não | Não | High |
| H5 | 5.2 Multimodal Coaching | NOT_STARTED | Não | Não | Não | Não | Não | High |
| H5 | 5.3 Social and Community | NOT_STARTED | Não | Não | Não | Não | Não | High |
| H5 | 5.4 Professional Ecosystem | NOT_STARTED | Não | Não | Não | Não | Não | High |
| H5 | 5.5 Web Platform | SCAFFOLDED | Landing page | Não | Build sim | Não | Não | High |

## 5. Detailed Epic Audit

### Epic 0.1 — Product Governance

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 55% documental  
**User-visible:** Não  
**Integrated:** Parcial  
**Works with default configuration:** Sim para docs, não aplicável a runtime  
**Production-ready:** Não

#### What exists

Há visão, posicionamento, target users, user journey, MVP scope, ADRs, specs, governança documental e implementation matrix. A governança de terminologia/specs está descrita.

#### What is actually integrated

O repositório usa estrutura consistente de bounded contexts, ADRs e specs de use case. A documentação de `coach-intelligence-aggregation` contém acceptance criteria, Definition of Done e rollout.

#### What is missing

Não foi encontrada uma matriz de aceite do Product Roadmap 1.0, glossário único operacional, decision log vinculando cada Epic aos princípios, ou um processo CI que valide a governança do roadmap. Documentação afirma implementação ampla enquanto alguns documentos dizem explicitamente que a agregação canônica estava planejada/flag-off.

#### Evidence

- `docs/specs/GOVERNANCE.md`
- `docs/product/*.md`
- `docs/adr/README.md`
- `docs/specs/coach-intelligence-aggregation/README.md:652-678`
- `docs/product/feature-matrix.md`

#### Tests

Specs e testes de módulos existem; não há teste de governança documental ou de vínculo roadmap→código.

#### Risks

A documentação é rica o suficiente para parecer certificação de produto, embora muitas garantias sejam de código interno e não de experiência validada.

#### Recommended next action

Criar uma matriz executável de aceite do roadmap, com owner, evidência, default flag, consumidor, evento analytics e teste E2E por Epic.

### Epic 0.2 — Core Platform Stabilization

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 60% técnico  
**User-visible:** Não aplicável  
**Integrated:** Parcial  
**Works with default configuration:** Backend exige `MONGODB_URI`; IA determinística funciona sem OpenAI  
**Production-ready:** Não

#### What exists

Monólito modular, JWT/bcrypt, Mongoose repositories, DTO validation, CORS, request correlation/logging, health/readiness, bounded in-memory AI traces, Docker Compose, build scripts e CI.

#### What is actually integrated

`AppModule` importa todos os módulos; providers Mongoose reais estão ligados; controllers usam `AuthSessionGuard`; `main.ts` aplica `ValidationPipe`, CORS e middlewares. Build API/mobile funciona.

#### What is missing

Não há background jobs, scheduler de produto, rate limiting, deploy workflow, migrations/backup/restore, external metrics sink, incident response, SLOs, performance/load tests, secret management efetivo ou hardening de `JWT_SECRET=change-me`. O CI não roda E2E nem smoke Docker.

#### Evidence

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/common/middleware/*`
- `apps/api/src/modules/*/*.module.ts`
- `.env.example`
- `.github/workflows/ci.yml`
- `docker-compose.yml`, `Dockerfile`, `scripts/docker-smoke.sh`

#### Tests

202 suites unit/integration passaram; E2E não validou por falha de ambiente. CI cobre format, lint, API test, builds e export mobile, mas não E2E, web build ou Docker smoke.

#### Risks

Readiness não equivale a disponibilidade operacional; `docker-compose` é desenvolvimento local e não há evidência de recuperação de dados.

#### Recommended next action

Fechar baseline operacional: secrets não-default, rate limit, deploy/staging, E2E com Mongo real, backup/restore e observabilidade externa antes de declarar release.

### Epic 0.3 — Product Analytics Foundation

**Official status:** SCAFFOLDED  
**Confidence:** High  
**Estimated completion:** 10%  
**User-visible:** Não  
**Integrated:** Não  
**Works with default configuration:** Não há analytics configurado  
**Production-ready:** Não

#### What exists

Há estados locais chamados analytics e eventos nomeados em telas, além de engagement de notificações persistido. Há logs e métricas internas da IA.

#### What is actually integrated

Não há transport, SDK, collector ou warehouse de product analytics. Hooks e telas deixam comentários como “Analytics transport can be connected here once the app-level abstraction exists”.

#### What is missing

Taxonomia central, onboarding/dashboard/workout/nutrition/recovery funnels, retention, feature adoption, acceptance/rejection de recomendações como analytics de produto, privacy/consent, experimentos de produto e outcome tracking.

#### Evidence

- `apps/mobile/src/hooks/use-coach-*.ts` — comentários de transport ausente
- `apps/mobile/src/screens/log-meal-screen.tsx:41-527`
- `apps/mobile/src/screens/coach-home-screen.tsx:492-495`
- `apps/api/src/modules/notifications/*` — engagement é domínio operacional, não plataforma analytics
- `docs/adr/notifications-engagement-engine.md:84-92`

#### Tests

Não há testes de emissão/entrega de eventos a um destino real.

#### Risks

Não é possível medir se as recomendações são aceitas, rejeitadas ou melhoram retenção; technical logs não respondem perguntas de produto.

#### Recommended next action

Definir e implementar uma camada de eventos versionada antes de mais expansão de IA.

### Epic 1.1 — Intelligent Onboarding

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 60%  
**User-visible:** Sim  
**Integrated:** Parcial  
**Works with default configuration:** Sim com API/Mongo configurados  
**Production-ready:** Não

#### What exists

Registro/login, perfil básico, perfil fitness com objetivo, atividade, altura, peso e disponibilidade; perfil nutricional com objetivo, meals/day, restrições, alergias, preferências e dislikes; geração inicial de plano de treino e nutrição.

#### What is actually integrated

`HomeResolverScreen` encadeia `GET /dashboard/home` → perfil → fitness → training → nutrition → dashboard. Os forms chamam `mobileApiClient` e os módulos persistem via Mongoose.

#### What is missing

Não há equipment, limitations/injuries no formulário fitness, recovery baseline, habits baseline, motivação, readiness, resumo final, confirmação/correção do usuário ou telemetria de conversão. A provisão demo preenche dados fixos e não representa onboarding real.

#### Evidence

- `apps/mobile/src/screens/home-resolver-screen.tsx`
- `apps/mobile/src/screens/create-profile-screen.tsx`
- `apps/mobile/src/screens/create-fitness-profile-screen.tsx:28-112`
- `apps/mobile/src/screens/create-nutrition-profile-screen.tsx:39-115`
- `apps/mobile/src/auth/auth-provider.tsx:90-340`
- `apps/api/src/modules/users`, `fitness`, `nutrition`, `training`

#### Tests

Use cases/controllers têm testes; não há E2E verde nem teste de jornada mobile completa.

#### Risks

O produto chama onboarding de personalizado, mas vários sinais que deveriam fundamentar adaptação não são coletados.

#### Recommended next action

Completar onboarding mínimo de segurança e valor: equipment, limitações, baseline de recovery, consentimento e confirmação do plano.

### Epic 1.2 — Unified Daily Dashboard

**Official status:** INTEGRATED_NOT_VALIDATED  
**Confidence:** High  
**Estimated completion:** 80%  
**User-visible:** Sim  
**Integrated:** Sim, com fallback  
**Works with default configuration:** Sim, mas a agregação canônica pode estar desativada  
**Production-ready:** Não

#### What exists

Home mobile com saudação, daily focus, workout, progresso, recuperação, nutrição, coach decision, briefing e refresh/loading/error/empty states.

#### What is actually integrated

`DashboardScreen` usa `useDashboard`; `dashboard.getHome` chama o backend real; módulos consultam repositories; `useCoachIntelligence` tenta `/ai/coach-intelligence` e cai para `buildCoachIntelligence` local quando `EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED` não está `true` ou o endpoint falha.

#### What is missing

Analytics, E2E de primeiro valor, validação de produto, prova de consistência cross-domain e ativação padrão da agregação canônica. O mobile ainda mantém recomposição legacy local.

#### Evidence

- `apps/mobile/src/screens/dashboard-screen.tsx`
- `apps/mobile/src/hooks/use-dashboard.ts:200-616`
- `apps/mobile/src/hooks/coach/use-coach-intelligence.ts:57-170`
- `apps/api/src/modules/dashboard/presentation/http/dashboard.controller.ts`
- `apps/api/src/modules/dashboard/application/use-cases/get-home-dashboard/get-home-dashboard.use-case.ts`

#### Tests

Dashboard use case/controller e helpers têm testes; E2E dashboard falhou por MongoMemoryServer/bind.

#### Risks

Dois caminhos de inteligência podem produzir experiências diferentes; o estado `disabled` aparenta uma funcionalidade canônica desativada, mas a UI continua exibindo uma inteligência derivada localmente.

#### Recommended next action

Ativar a agregação canônica em ambiente controlado, remover recomposição duplicada após métricas de paridade e instrumentar ações do dashboard.

### Epic 1.3 — Complete Training Experience

**Official status:** INTEGRATED_NOT_VALIDATED  
**Confidence:** High  
**Estimated completion:** 75%  
**User-visible:** Sim  
**Integrated:** Sim no loop básico  
**Works with default configuration:** Sim com API/Mongo  
**Production-ready:** Não

#### What exists

Plano semanal, treino atual, overview, exercícios, séries/repetições, active workout, marcar séries, pausa/resume local, timer de descanso, substituição de exercício, conclusão, duração, histórico e analytics derivados.

#### What is actually integrated

`ActiveWorkoutScreen` monta progresso local; `WorkoutCompletionScreen` chama `mobileApiClient.progress.logWorkout`; API `ProgressController` → `LogWorkoutUseCase` → `MongooseWorkoutLogRepository`. Substituição chama endpoint real de training e retorna ao workout.

#### What is missing

Não há evidência de captura de carga/weight, RPE ou dor pós-treino, skip formal, agenda/reschedule, seleção de equipamento na recomendação, feedback pós-workout completo ou atualização comprovada do plano futuro a partir do log. Analytics de treino são read-model local, não product analytics.

#### Evidence

- `apps/mobile/src/screens/active-workout-screen.tsx:14-261`
- `apps/mobile/src/screens/workout-completion-screen.tsx:109-177`
- `apps/mobile/src/screens/exercise-replacement-screen.tsx`
- `apps/api/src/modules/progress/application/use-cases/log-workout/log-workout.use-case.ts`
- `apps/api/src/modules/progress/infrastructure/mongoose/mongoose-workout-log.repository.ts`
- `apps/api/src/modules/training/application/use-cases/build-adaptive-training-recommendation/*`

#### Tests

Há testes unitários de log, treino adaptativo, controllers e repositories; não há testes de tela/E2E verde.

#### Risks

O usuário consegue registrar execução, mas o ciclo “execução → outcome → alteração do plano” não está provado.

#### Recommended next action

Adicionar feedback de RPE/dor/carga, persistir intenção de skip/pause e provar em E2E que o próximo plano muda quando a regra exige.

### Epic 1.4 — Complete Nutrition Experience

**Official status:** INTEGRATED_NOT_VALIDATED  
**Confidence:** High  
**Estimated completion:** 75%  
**User-visible:** Sim  
**Integrated:** Sim no loop básico  
**Works with default configuration:** Sim com API/Mongo  
**Production-ready:** Não

#### What exists

Perfil, cálculo de macros/calorias, plano, refeições do dia, detalhes, log de refeição, substituição por motivo, recomendações e histórico.

#### What is actually integrated

As telas usam `apiClient.nutrition`; controllers delegam a use cases de profile, plan, macro targets, log, replace e recommendation; schemas e repositories Mongoose existem.

#### What is missing

Hidratação, aderência diária/semanal formal, redistribuição de metas, confirmação de alergia/risco em runtime, tratamento clínico, fotos/barcode e outcome tracking. A substituição ranqueia alternativas localmente e persiste apenas a razão/identificador escolhido; não prova replanejamento nutricional amplo.

#### Evidence

- `apps/mobile/src/screens/nutrition-overview-screen.tsx`
- `apps/mobile/src/screens/log-meal-screen.tsx`
- `apps/mobile/src/screens/replace-meal-screen.tsx:145-186`
- `apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts`
- `apps/api/src/modules/nutrition/application/use-cases/*`
- `apps/api/src/modules/nutrition/infrastructure/mongoose/*`

#### Tests

Use cases, DTOs, controller e repositories passaram na suíte API; não há E2E ambientalmente comprovado nem analytics real.

#### Risks

O produto coleta alergias, mas não há evidência suficiente de safety nutricional clínico, revisão ou escalonamento.

#### Recommended next action

Formalizar aderência e safety de restrições/alergias, com testes de não violação e métricas de aceitação de substituições.

### Epic 1.5 — Recovery Experience

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 55%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Sim, com defaults neutros  
**Production-ready:** Não

#### What exists

Check-in API com energia, sono, soreness e motivação em escala 1–5; cálculo determinístico de readiness/fatigue/trend; snapshots diários persistidos; cards mobile e histórico.

#### What is actually integrated

`BuildRecoverySnapshotUseCase` lê check-ins e workout logs, calcula scores e persiste snapshot; adaptive training e coach usam os sinais. A tela mobile mostra histórico e readiness.

#### What is missing

Não há tela mobile para criar o check-in; stress, dor detalhada, sono contextual e risco/escalonamento estão ausentes; defaults neutros podem gerar snapshot sem dados reais; não há prova E2E de que cada check-in muda treino/nutrição.

#### Evidence

- `apps/api/src/modules/progress/presentation/http/progress.controller.ts:76-105`
- `apps/api/src/modules/progress/application/use-cases/create-daily-check-in/create-daily-check-in.use-case.ts`
- `apps/api/src/modules/recovery/application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case.ts`
- `apps/mobile/src/screens/daily-check-in-history-screen.tsx`
- Ausência de tela `create-daily-check-in` em `apps/mobile/src/screens` e ausência de chamada `createDailyCheckIn` em `apps/mobile/src`.

#### Tests

DTO, controller, use case, calculator, recovery use cases e repository são testados; fluxo user-visible não é.

#### Risks

O requisito central do MVP — registrar contexto diário — não está disponível como entrada normal no mobile.

#### Recommended next action

Implementar/validar a entrada de check-in e ligar sua conclusão a uma alteração auditável de recomendação.

### Epic 1.6 — Goals and Progress

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 60%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Sim  
**Production-ready:** Não

#### What exists

Goals atuais, histórico, milestones, achievements, forecast, progress snapshots, streaks, workout history, summary e Coach goal guidance.

#### What is actually integrated

Goals e progress possuem controllers, use cases, repositories e mappers; mobile expõe progress/profile/guidance e o dashboard usa os read models.

#### What is missing

Não há hierarchy de objetivos, peso/medidas/força como séries de métricas completas, resumo mensal robusto, revisão/edição de objetivo ou outcome tracking de forecast. Parte das telas deriva insights locais.

#### Evidence

- `apps/api/src/modules/goals/presentation/http/goals.controller.ts`
- `apps/api/src/modules/goals/domain/entities/*`
- `apps/api/src/modules/progress/presentation/http/progress.controller.ts`
- `apps/mobile/src/screens/progress-summary-screen.tsx`
- `apps/mobile/src/hooks/use-coach-goal-guidance.ts`

#### Tests

Há testes extensos de goals/progress/calculators/repositories; E2E bloqueado.

#### Risks

Forecast e achievements podem parecer produto completo, embora sejam snapshots determinísticos sem validação longitudinal de precisão.

#### Recommended next action

Definir o modelo de outcome e revisão de meta antes de adicionar novas superfícies de gamificação.

### Epic 2.1 — Intelligent Daily Coaching

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 60%  
**User-visible:** Sim  
**Integrated:** Parcial  
**Works with default configuration:** Sim via determinístico  
**Production-ready:** Não

#### What exists

Coach Home, briefing diário, daily priority, next best action, decisões determinísticas, weekly review, goal guidance e notificações in-app.

#### What is actually integrated

Coach decision calcula prioridade e action items; dashboard e telas mobile exibem; notificações consultam decisões persistidas e registram engagement.

#### What is missing

Não há morning/evening scheduler, tomorrow preview baseado em evento, missed-action trigger operacional, quiet hours reais ou push delivery. “Notification orchestration” termina em decisão `in_app`/`planned`.

#### Evidence

- `apps/api/src/modules/ai/application/services/coach-decision-calculator.service.ts`
- `apps/mobile/src/screens/coach-daily-briefing-screen.tsx`
- `apps/api/src/modules/notifications/application/services/notification-decision-calculator.service.ts`
- `apps/api/src/modules/notifications/presentation/http/notifications.controller.ts`

#### Tests

Calculators, use cases, controllers e mobile helpers têm testes; sem validação de horário/provider.

#### Risks

Decisão proativa é confundida com mensagem entregue.

#### Recommended next action

Consolidar eventos de rotina e eligibility em in-app primeiro, medir engagement e só depois adicionar push.

### Epic 2.2 — Adaptive Training Engine

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 55%  
**User-visible:** Sim  
**Integrated:** Parcial  
**Works with default configuration:** Sim deterministicamente  
**Production-ready:** Não

#### What exists

Calculator com readiness, fatigue, adherence, streak, missed workouts, load e nutrition adherence; tipos para intensity/volume; recomendações como progression, decrease intensity, rest day, reschedule.

#### What is actually integrated

`BuildAdaptiveTrainingRecommendationUseCase` compõe recovery/progress/training e persiste recomendação adaptativa; endpoints today/current/history são consumidos pelo mobile.

#### What is missing

Não foi comprovado que a recomendação altera o `TrainingPlan`/weekly schedule, exercício, duração, deload ou progression futura. Equipment, agenda, dor e pouco tempo não são entradas completas. Aceitação/rejeição/outcome não têm caminho de produto.

#### Evidence

- `apps/api/src/modules/training/application/services/adaptive-training-recommendation-calculator.service.ts`
- `apps/api/src/modules/training/application/use-cases/build-adaptive-training-recommendation/*`
- `apps/api/src/modules/training/presentation/http/adaptive-training.controller.ts`
- Não há mutation controller de adaptação do plano equivalente ao read endpoint.

#### Tests

Calculator/use cases/repository/controller têm testes; não há E2E de alteração de plano.

#### Risks

Uma recomendação exibida não é adaptação até alterar o comportamento subsequente.

#### Recommended next action

Definir o contrato de aplicação da recomendação ao próximo workout, com snapshot before/after, consentimento e outcome.

### Epic 2.3 — Adaptive Nutrition Engine

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 45%  
**User-visible:** Sim  
**Integrated:** Parcial  
**Works with default configuration:** Sim deterministicamente  
**Production-ready:** Não

#### What exists

Plan generator, macro target calculator, nutrition recommendation use case, meal replacement e influência de recovery/goal/workout em especialistas.

#### What is actually integrated

Perfil → macro targets → plan → meals → log/replace persiste no MongoDB e é renderizado no mobile.

#### What is missing

Não há redistribuição comprovada após missed meal/workout, ingrediente indisponível ou mudança de fome; não há metas semanais, hidratação, confirmação e outcome tracking da adaptação.

#### Evidence

- `apps/api/src/modules/nutrition/application/services/macro-target-calculator.service.ts`
- `apps/api/src/modules/nutrition/application/services/nutrition-plan-generator.service.ts`
- `apps/api/src/modules/nutrition/application/use-cases/generate-nutrition-recommendation/*`
- `apps/mobile/src/screens/replace-meal-screen.tsx`

#### Tests

Há testes de calculator, plan, recommendation, log e replace; sem E2E ou analytics.

#### Risks

O sistema é um planejador/log/substituidor determinístico, não ainda um motor adaptativo longitudinal comprovado.

#### Recommended next action

Persistir e medir alterações de meta/plano com explicação e comparação planned-versus-actual.

### Epic 2.4 — Cross-Domain Recommendation Engine

**Official status:** INTEGRATED_NOT_VALIDATED  
**Confidence:** High  
**Estimated completion:** 75% backend / 45% product  
**User-visible:** Sim  
**Integrated:** Backend sim; mobile canônico não por default  
**Works with default configuration:** Fallback sim; aggregate canônico não  
**Production-ready:** Não

#### What exists

Adapters de contexto, experts de workout/nutrition/recovery/goals/habits/progress/motivation, router, composition, persona, conflicts, confidence, explainability, freshness e observability.

#### What is actually integrated

`CoachIntelligenceAggregationService` é ligado no `AiModule` e exposto por `GET /ai/coach-intelligence`; `packages/types`/`api-client` têm contrato; mobile hook tenta o endpoint e mapeia o aggregate.

#### What is missing

A flag `AI_COACH_INTELLIGENCE_ENABLED` não está nos env examples e defaulta `false` no mobile/backend. Telas mantêm `buildCoachIntelligence` local/legacy. Não há analytics de decisão nem prova de paridade em produção.

#### Evidence

- `apps/api/src/modules/ai/application/services/coach-intelligence/*`
- `apps/api/src/modules/ai/presentation/http/coach-intelligence.controller.ts`
- `apps/api/src/modules/ai/ai.module.ts`
- `packages/api-client/src/ai-api.ts`
- `apps/mobile/src/hooks/coach/use-coach-intelligence.ts:57-170`
- `docs/specs/coach-intelligence-aggregation/final-certification.md:483-561`

#### Tests

202 API tests incluem agregação, mapper, policy, source adapters e wiring; E2E falhou.

#### Risks

Arquitetura certificada internamente não equivale a caminho canônico ativo para o usuário.

#### Recommended next action

Fazer rollout controlado da agregação, medir fallback/latência/paridade e remover recomposição legacy somente após evidência.

### Epic 3.1 — Habit Intelligence

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 45%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Backend sim  
**Production-ready:** Não

#### What exists

Habit snapshots, consistency summaries, risk signals, history, replay e especialistas de hábitos.

#### What is actually integrated

Repositórios Mongoose e use cases calculam consistência/risk a partir de sinais de treino, recovery, goals e notifications; coach/dashboard podem consumir read models.

#### What is missing

Não há criação, agenda, conclusão ou edição de hábitos no mobile; streak protection, missed-habit recovery e triggers explícitos não são uma experiência completa.

#### Evidence

- `apps/api/src/modules/habits/application/use-cases/*`
- `apps/api/src/modules/habits/presentation/http/habits.controller.ts`
- `apps/mobile/src/navigation/app-navigator.tsx` — não há telas de hábitos dedicadas
- `docs/adr/habit-consistency-engine.md`

#### Tests

Use cases/calculators/repositories/controllers passam na suíte API.

#### Risks

Read model de hábito pode ser apresentado como habit product sem mecanismo de execução pelo usuário.

#### Recommended next action

Decidir se hábitos são produto explícito ou sinal derivado; não expandir inteligência antes de um input/output de produto.

### Epic 3.2 — Progress Intelligence

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** Medium  
**Estimated completion:** 45%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Sim  
**Production-ready:** Não

#### What exists

Workout history, streaks, progress summary, goal snapshots/forecast e progress expert.

#### What is actually integrated

O backend calcula summaries e especialistas leem sinais para Coach; mobile exibe progress e training analytics.

#### What is missing

Não há série robusta de medidas/força, correlações longitudinais, plateau/regression formal, incerteza calibrada ou outcome tracking de insights.

#### Evidence

- `apps/api/src/modules/progress/application/use-cases/get-progress-summary/*`
- `apps/mobile/src/screens/progress-summary-screen.tsx`
- `apps/mobile/src/screens/training-analytics-screen.tsx`
- `apps/api/src/modules/ai/application/services/experts/progress/progress-expert.service.ts`

#### Tests

Há testes de progress use cases, streak, controller e expert; sem evidência E2E/analytics.

#### Risks

Analytics de tela são calculados do histórico e podem ser confundidos com produto de progress intelligence validado.

#### Recommended next action

Definir métricas de outcome e confiança para cada insight exibido.

### Epic 3.3 — Motivation and Engagement Intelligence

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** Medium  
**Estimated completion:** 35%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Determinístico sim  
**Production-ready:** Não

#### What exists

Motivation expert, copy/personalization logic, Coach persona, celebration, consistency and low-motivation recommendation branches.

#### What is actually integrated

Motivational signals participam de composição/Coach decision e textos mobile; engagement de notificações é persistido.

#### What is missing

Não há perfil motivacional persistido com consentimento, preferências de comunicação, feedback outcome, mecanismos de pausa/restart, nem analytics para provar não manipulação ou aumento de retenção.

#### Evidence

- `apps/api/src/modules/ai/application/services/experts/motivation/*`
- `apps/api/src/modules/ai/application/services/persona/*`
- `apps/mobile/src/hooks/coach/coach-copy.ts`
- `apps/api/src/modules/notifications/application/use-cases/record-engagement-event/*`

#### Tests

Expert/persona/notification tests existem; sem experimento de produto.

#### Risks

Tom motivacional sem outcome pode aumentar mensagens, não necessariamente valor.

#### Recommended next action

Instrumentar preferência, dismiss, snooze, return e outcome antes de sofisticar o modelo.

### Epic 4.1 — Long-Term Coach Memory

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 45%  
**User-visible:** Parcial  
**Integrated:** Parcial  
**Works with default configuration:** Chat/memória técnica sim; future memory flag não  
**Production-ready:** Não

#### What exists

Coach conversation/message repositories, summarizer, memory updater, debug memory endpoint, agent session memory e `CoachMemoryTimelineScreen`.

#### What is actually integrated

Chat persiste mensagens/conversas; serviços constroem contexto e podem salvar memória; timeline lê histórico/contexto pelo cliente.

#### What is missing

Não há prova de memória durável semântica com provenance, expiração por item, correção/edição/exclusão pelo usuário, consentimento granular ou garantia de influência correta na decisão. Session memory tem TTL/config, mas isso não é long-term memory.

#### Evidence

- `apps/api/src/modules/ai/application/services/memory/*`
- `apps/api/src/modules/ai/infrastructure/mongoose/mongoose-coach-conversation-memory.repository.ts`
- `apps/api/src/modules/ai/presentation/http/ai.controller.ts`
- `apps/mobile/src/screens/coach-memory-timeline-screen.tsx`
- `.env.example`: `AI_AGENT_RUNTIME_ENABLED=false`, `AI_AGENT_TOOLS_ENABLED=false`

#### Tests

Memory services/repository/use cases passam; não há teste de controles de privacidade de usuário.

#### Risks

Histórico, resumo de conversa e memória durável são conceitos diferentes e não devem ser tratados como equivalentes.

#### Recommended next action

Definir modelo de memória durável, provenance, consentimento, CRUD do usuário e testes de não retenção antes de ativar.

### Epic 4.2 — Conversation Experience

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 60%  
**User-visible:** Sim  
**Integrated:** Parcial  
**Works with default configuration:** Chat síncrono determinístico sim; LLM/streaming não  
**Production-ready:** Não

#### What exists

Chat, histórico, Ask Coach, conversation helpers, safety, prompt builder, OpenAI provider, structured parser, streaming route e feedback.

#### What is actually integrated

`CoachChatScreen`/hooks chamam `/ai/chat`; `CreateCoachChatUseCase` carrega contexto, gera resposta, aplica safety e persiste. A rota streaming existe, mas está sujeita à flag.

#### What is missing

Action confirmation, modificação efetiva de plano via chat, follow-up lifecycle, provider/configuração real default, analytics de chat, escalonamento humano/clínico e prova de streaming em rede real.

#### Evidence

- `apps/mobile/src/screens/coach-chat-screen.tsx`
- `apps/mobile/src/hooks/use-coach-conversation.ts`
- `apps/api/src/modules/ai/application/use-cases/create-coach-chat/*`
- `apps/api/src/modules/ai/application/services/chat/*`
- `apps/api/src/modules/ai/presentation/http/ai.controller.ts:121-225`

#### Tests

Chat use cases/services, parser/provider, safety e controllers têm cobertura unitária; sem E2E/provider real.

#### Risks

“AI Coach” em default é determinístico/fallback; isso é deliberado e seguro, mas precisa ser explicitado no produto.

#### Recommended next action

Validar conversa determinística como produto, depois habilitar LLM apenas por canary com métricas e fallback auditado.

### Epic 4.3 — Proactive Coaching

**Official status:** PARTIALLY_IMPLEMENTED  
**Confidence:** High  
**Estimated completion:** 35%  
**User-visible:** In-app sim  
**Integrated:** Decisão sim, entrega não  
**Works with default configuration:** Apenas leitura in-app  
**Production-ready:** Não

#### What exists

Eligibility/fatigue policy, deterministic notification decisions, history, engagement events, frequency-related policy e CoachNotificationsScreen.

#### What is actually integrated

Decisão persistida com `channel: in_app`, `status: planned`; usuário pode consultar e registrar eventos por API.

#### What is missing

Não há `expo-notifications`, APNs, FCM, device tokens, background delivery, quiet hours executadas, deduplication cross-channel ou mensagem quando app está fechado.

#### Evidence

- `apps/api/src/modules/notifications/application/services/notification-fatigue-policy.service.ts`
- `apps/api/src/modules/notifications/application/services/notification-decision-calculator.service.ts`
- `apps/api/src/modules/notifications/presentation/http/notifications.controller.ts`
- `package.json` e `apps/mobile/package.json` — ausência de provider de push
- `docs/adr/notifications-engagement-engine.md:84-92`

#### Tests

Decisions/policy/repositories/controllers/engagement têm testes; não há delivery test.

#### Risks

Não chamar decisão in-app de proactive notification operacional.

#### Recommended next action

Fechar primeiro lifecycle in-app e analytics; provider push é uma decisão posterior.

### Epic 4.4 — Coach Trust and Explainability

**Official status:** INTEGRATED_NOT_VALIDATED  
**Confidence:** High  
**Estimated completion:** 70%  
**User-visible:** Sim  
**Integrated:** Sim no backend/mobile  
**Works with default configuration:** Sim deterministicamente  
**Production-ready:** Não

#### What exists

Influences, evidence, confidence, freshness, warnings, persona, explainability service, replay endpoints, prompt safety e sanitização de metadata.

#### What is actually integrated

Coach aggregate e legacy intelligence exibem headline/summary/recommended action; backend compõe influências e expõe freshness/availability/warnings; replay compara persistido e recalculado.

#### What is missing

Não há mecanismo de discordância/correção do usuário, change history user-visible, alternativa sistemática, escalonamento de saúde ou analytics de confiança/aceitação. Traces são predominantemente memória interna.

#### Evidence

- `apps/api/src/modules/ai/application/services/explainability/*`
- `apps/api/src/modules/ai/application/services/coach-intelligence/coach-intelligence.mapper.service.ts`
- `apps/mobile/src/hooks/coach/coach-intelligence-helpers.ts`
- `apps/api/src/modules/ai/application/use-cases/replay-*`

#### Tests

Explainability, mapper, policy, replay e safety têm testes.

#### Risks

Explicação pode ser uma reconstrução textual posterior; provenance operacional e correção do usuário não estão fechadas.

#### Recommended next action

Persistir decision inputs/version/outcome e criar uma UI de “isso não se aplica” com feedback acionável.

### Epic 5.1 — Health and Wearable Integrations

**Official status:** NOT_STARTED  
**Confidence:** High  
**Estimated completion:** 0%  
**User-visible:** Não  
**Integrated:** Não  
**Works with default configuration:** Não aplicável  
**Production-ready:** Não

#### What exists

Somente modelagem de sinais de recuperação; não há SDK, OAuth, consentimento ou source attribution.

#### What is actually integrated

Nada com Apple Health, Health Connect, Google Fit, Garmin, Fitbit, WHOOP ou Oura.

#### What is missing

Toda a integração, consentimento, freshness, conflito e revogação.

#### Evidence

- Ausência de dependências/integrações em `package.json`, `apps/mobile/package.json`, `apps/api/src`.
- `docs/product/mvp-scope.md` lista integrações externas fora de escopo.

#### Tests

Não encontrados.

#### Risks

Não expandir para dados de saúde sem privacy/safety.

#### Recommended next action

Defer.

### Epic 5.2 — Multimodal Coaching

**Official status:** NOT_STARTED  
**Confidence:** High  
**Estimated completion:** 0%  
**User-visible:** Não  
**Integrated:** Não  
**Works with default configuration:** Não  
**Production-ready:** Não

#### What exists

Chat textual e contratos de texto.

#### What is actually integrated

Não há fotos, barcode, vídeo, voz, progress photos ou pipeline multimodal.

#### What is missing

Ingestão, storage, consentimento, uncertainty, confirmation e safety.

#### Evidence

- `apps/mobile/src/screens/coach-chat-screen.tsx` — input textual
- `apps/api/src/modules/ai/infrastructure/llm/openai-llm.provider.ts` — provider textual estruturado
- Ausência de dependências de câmera/barcode/áudio/vision.

#### Tests

Não encontrados.

#### Risks

Defer até safety/consent e produto core estarem validados.

#### Recommended next action

Defer.

### Epic 5.3 — Social and Community

**Official status:** NOT_STARTED  
**Confidence:** High  
**Estimated completion:** 0%  
**User-visible:** Não  
**Integrated:** Não  
**Works with default configuration:** Não  
**Production-ready:** Não

#### What exists

Nenhum domínio social, friendship, group, challenge ou sharing.

#### Evidence

- `apps/api/src/modules` não contém módulo social/community.
- `docs/product/mvp-scope.md` exclui sistema social/gamificação avançada.

#### Tests/Risks/Recommended next action

Não há testes nem implementação. **Defer**.

### Epic 5.4 — Professional Ecosystem

**Official status:** NOT_STARTED  
**Confidence:** High  
**Estimated completion:** 0%  
**User-visible:** Não  
**Integrated:** Não  
**Works with default configuration:** Não  
**Production-ready:** Não

#### What exists

Nenhum trainer, nutricionista, marketplace, professional dashboard, shared plan ou consent flow.

#### Evidence

- Ausência de módulos/rotas/modelos em `apps/api/src/modules`.
- Ausência de telas em `apps/mobile/src/screens` e `apps/web/src/app`.

#### Tests/Risks/Recommended next action

Não há testes. **Defer**.

### Epic 5.5 — Web Platform

**Official status:** SCAFFOLDED  
**Confidence:** High  
**Estimated completion:** 15%  
**User-visible:** Landing page sim  
**Integrated:** Não  
**Works with default configuration:** Build sim  
**Production-ready:** Não

#### What exists

Next.js landing page com hero, features, placeholders de screenshots e stack.

#### What is actually integrated

`apps/web/src/app/page.tsx` é uma página estática; há target `dev/build/start` e build do Next configurado.

#### What is missing

Auth, dashboard, workout, nutrition, recovery, progress, Coach, account, privacy, reports e integração com `api-client`.

#### Evidence

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/project.json`
- Ausência de imports `@elev9/api-client` em `apps/web/src`.

#### Tests

Build mobile/API passou; não foi executado `web:build` nesta auditoria. Não há testes web.

#### Risks

README/feature matrix pode sugerir uma plataforma web maior que a realidade.

#### Recommended next action

Defer até a retenção do mobile ser validada; manter web como marketing/documentação ou definir explicitamente um Epic separado.

## 6. Critical Flow Audit

### Fluxo A — Primeiro valor

**Classificação: PARTIALLY_IMPLEMENTED.**

```text
Login/Register
→ HomeResolver
→ CreateProfile
→ CreateFitnessProfile
→ CreateTrainingPlan
→ CreateNutritionProfile/Plan
→ Dashboard
```

O caminho funciona estruturalmente no mobile, com API client, contratos, controllers, use cases e Mongo repositories. O demo provisiona um workspace automaticamente. Entretanto, faltam recovery/habits baseline, motivation/readiness, confirmação final e analytics. O E2E completo não pôde ser validado.

**Evidence:** `apps/mobile/src/screens/home-resolver-screen.tsx`, `apps/mobile/src/auth/auth-provider.tsx`, `packages/api-client/src/{auth-api,dashboard-api,fitness-api,nutrition-api,training-api}.ts`, `apps/api/src/modules/*`.

### Fluxo B — Workout completo

**Classificação: INTEGRATED_NOT_VALIDATED.**

Dashboard carrega treino; telas de overview/active workout controlam séries; substituição persiste; timer e conclusão existem; `LogWorkoutUseCase` persiste o log e progress history o lê. Não há prova de RPE/dor/carga, skip formal ou atualização futura do plano.

**Evidence:** `apps/mobile/src/screens/active-workout-screen.tsx`, `workout-completion-screen.tsx`, `exercise-replacement-screen.tsx`, `apps/api/src/modules/progress/application/use-cases/log-workout`, `apps/api/src/modules/progress/infrastructure/mongoose/mongoose-workout-log.repository.ts`.

### Fluxo C — Nutrição

**Classificação: INTEGRATED_NOT_VALIDATED.**

Perfil → targets → plan → meals → log/replace está encadeado e persistido. A UI possui loading/error/empty/retry. Não há aderência semanal formal, hidratação, análise de segurança clínica ou prova de adaptação das metas após eventos.

**Evidence:** `apps/mobile/src/screens/create-nutrition-profile-screen.tsx`, `nutrition-overview-screen.tsx`, `log-meal-screen.tsx`, `replace-meal-screen.tsx`, `apps/api/src/modules/nutrition/application/use-cases`, `apps/api/src/modules/nutrition/infrastructure/mongoose`.

### Fluxo D — Recovery e adaptação

**Classificação: PARTIALLY_IMPLEMENTED.**

O backend persiste check-in, calcula recovery snapshot e usa o snapshot na recomendação adaptativa. O primeiro passo user-visible está ausente: não há tela mobile de criação do check-in nem chamada de criação no app. Também não foi provado que a recomendação altera o plano, somente que uma recomendação é calculada/persistida.

**Evidence:** `apps/api/src/modules/progress/application/use-cases/create-daily-check-in`, `apps/api/src/modules/recovery/application/use-cases/build-recovery-snapshot`, `apps/api/src/modules/training/application/services/adaptive-training-recommendation-calculator.service.ts`, ausência de `create-daily-check-in-screen` em `apps/mobile/src/screens`.

### Fluxo E — AI Coach

**Classificação: PARTIALLY_IMPLEMENTED.**

Ask/chat carrega contexto, aplica safety, roteia/compõe especialistas, gera resposta determinística ou LLM, persiste conversação e suporta feedback. Streaming e LLM exigem flags; agent runtime/tools/memória futura também; não há E2E provider real, analytics, action confirmation ou mudança de plano pelo chat.

**Evidence:** `apps/api/src/modules/ai/application/services/chat`, `experts`, `composition`, `safety`, `llm`, `agent`; `apps/mobile/src/hooks/use-ask-coach.ts`, `use-coach-conversation.ts`; `.env.example`.

### Fluxo F — Notificação proativa

**Classificação: PARTIALLY_IMPLEMENTED.**

Situação → decisão determinística → persistência → leitura in-app → evento de engagement existe. O fluxo para antes de delivery: canal é `in_app`, status `planned`, não há device token, push provider, background delivery ou app-closed behavior.

**Evidence:** `apps/api/src/modules/notifications/application/services/notification-decision-calculator.service.ts`, `notifications.controller.ts`, `apps/api/src/modules/notifications/infrastructure/mongoose`, ausência de `expo-notifications`/APNs/FCM.

## 7. AI Runtime Audit

| Capability | Existe | Conectada | Default | Fallback | Teste | User-visible | Classificação |
|---|---|---|---|---|---|---|---|
| Runtime determinístico do Coach | Sim | Sim | Ativo | N/A | Sim | Sim | INTEGRATED_NOT_VALIDATED |
| OpenAI provider | Sim | Sim no módulo | `AI_LLM_ENABLED=false` | Sim | Simulado/unitário | Somente se habilitado | PARTIALLY_IMPLEMENTED |
| Responses API/structured output | Parser/provider/config existem | Parcial | Structured true, LLM off | Parser/fallback | Sim | Não comprovado | IMPLEMENTED_NOT_INTEGRATED |
| Streaming | Rota e serviço existem | Parcial | `AI_LLM_STREAMING_ENABLED=false` | Síncrono | Unitário | Não comprovado | IMPLEMENTED_NOT_INTEGRATED |
| Tool calling | Registry/executor/policy existem | Não operacional por default | `AI_LLM_TOOL_CALLING_ENABLED=false`, agent tools false | Sem tools | Sim unitário | Não | SCAFFOLDED |
| Agent runtime | Context, planning, execution, memory, policy, traces existem | Interno | `AI_AGENT_RUNTIME_ENABLED=false` | Chat existente | Sim unitário | Não diretamente | IMPLEMENTED_NOT_INTEGRATED |
| Specialist routing/composition | Sim | Sim no aggregate/deterministic Coach | Ativo no caminho determinístico | Parcial aggregate legacy | Sim | Indiretamente | INTEGRATED_NOT_VALIDATED |
| Prompt injection/safety | Sim | Sim no chat/LLM | Ativo | Bloqueia/fallback | Sim | Indiretamente | INTEGRATED_NOT_VALIDATED |
| Retry/circuit breaker/timeout | Sim | Sim no LLM service | Aplicável quando LLM on | Fallback | Sim unitário | Não | IMPLEMENTED_NOT_INTEGRATED |
| Prompt version/canary/evaluation | Sim | Interno | Prompt default; canary config default 100 | Previous versions metadata | Sim unitário | Não | IMPLEMENTED_NOT_INTEGRATED |
| Observability AI | Sim, in-memory | Sim internamente | Noop metric providers | Logs/internal traces | Sim | Não | INTEGRATED_NOT_VALIDATED |
| Cost tracking | Campos/config existem | Parcial | Custos opcionais ausentes | Limits opcionais | Sim unitário | Não | SCAFFOLDED |
| Future memory | Serviços/repository | Não ativada como produto | `AI_LLM_MEMORY_ENABLED=false` | Context/session | Sim unitário | Timeline parcial | PARTIALLY_IMPLEMENTED |

**Conclusão:** a IA operacional default é deterministic-first. A arquitetura para OpenAI/agents é real, mas não pode ser descrita como LLM/agent product ativo sem configuração e validação externa.

## 8. Feature Flag Audit

| Flag | Definição | Default | Capacidade | Ativado | Desativado | Testes | Risco |
|---|---|---:|---|---|---|---|---|
| `AI_LLM_ENABLED` | `apps/api/src/modules/ai/application/services/llm/ai-llm-config.service.ts` | `false` | Chamada OpenAI | provider OpenAI exige key | deterministic/fallback | Sim | UI pode chamar AI mas não LLM |
| `AI_LLM_STREAMING_ENABLED` | mesmo | `false` | streaming | stream | síncrono | Sim | rota existe, feature não |
| `AI_LLM_STRUCTURED_OUTPUTS_ENABLED` | mesmo | `true` | structured output | parser estruturado | caminho alternativo | Sim | depende de LLM on |
| `AI_LLM_TOOL_CALLING_ENABLED` | mesmo | `false` | tool calls LLM | tools | sem tools | Sim | não é agent operacional |
| `AI_LLM_MEMORY_ENABLED` | mesmo | `false` | future LLM memory | memory | sem future memory | Sim | não confundir com history |
| `AI_COACH_INTELLIGENCE_ENABLED` | `coach-intelligence.config.ts` e mobile hook | `false` | aggregate canônico | `/ai/coach-intelligence` | mobile legacy intelligence/fallback | Sim | caminho canônico não é default |
| `AI_AGENT_RUNTIME_ENABLED` | `agent-runtime.config.ts` | `false` | runtime agent | agent plan/execute | chat path | Sim | docs citam agent platform sem ativação |
| `AI_AGENT_TOOLS_ENABLED` | `agent-runtime.config.ts` | `false` | tools agent | registry/executor | sem tools | Sim | dependente de runtime |
| `EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED` | `apps/mobile/src/hooks/coach/use-coach-intelligence.ts` | ausente/false | request mobile aggregate | canonical | fallback/local | mobile tests helpers | flag não documentada em env example |
| `EXPO_PUBLIC_DEMO_MODE` | `apps/mobile/src/screens/login-screen.tsx` | example true; dev sempre true | login/provision demo | demo account/workspace | login normal | cobertura limitada | não deve ser habilitado em produção |

Parâmetros AI adicionais não são feature flags, mas alteram runtime: provider/model, prompt versions, canary, retries, timeout, circuit threshold, response chars, retention, token/cost limits, agent max steps/tool calls/memory TTL/trace retention. Eles têm defaults no código, mas muitos não aparecem em `.env.example`; isso reduz auditabilidade operacional.

## 9. Product Analytics Audit

### Technical observability

Existe request correlation/logging em `apps/api/src/common/middleware`, health/readiness e logs de fallback/LLM/safety.

### AI observability

Existe tracing interno bounded para LLM, agent e experts; metadata de prompt/model/experiment, fallback, latency, conflicts, retention e replay. Providers de métricas são `Noop...` em `apps/api/src/modules/ai/ai.module.ts`, e o estado é predominantemente in-memory.

### Product analytics

Não existe camada de tracking/transport/collector/warehouse. Eventos locais são declarados mas descartados; vários hooks dizem que o transport será conectado depois. Engagement de notifications é um bounded context persistido, não um event taxonomy/funnel platform.

### Experimentation

Há rollout/canary e evaluation internos para prompt/LLM, não experimento de produto com exposição, conversão, retenção ou outcome.

### Outcome measurement

Não há conexão comprovada entre acceptance/rejection, alteração de plano, melhoria de treino/nutrição/recovery e retenção.

**Verdict:** Epic 0.3 e todas as alegações de validação de produto devem permanecer abaixo de `SCAFFOLDED`/`PARTIALLY_IMPLEMENTED`.

## 10. Capabilities That Look Complete but Are Not

1. **AI Coach:** há nove telas, especialistas e endpoints, mas LLM/aggregate/agent são flags-off por default e o caminho deterministic/local continua ativo.
2. **Coach Intelligence Aggregation:** endpoint, contrato, observability e certificação existem, mas mobile usa fallback/local quando a flag não está ativa.
3. **Daily check-in:** controller, DTO, use case, repository e testes existem, mas não há tela mobile para criar o check-in.
4. **Proactive notifications:** decisões e engagement existem, mas status `planned`/channel `in_app` não entrega push.
5. **Adaptive training:** calculator produz recomendação, mas não foi comprovada mutação do plano, agenda ou próximo workout.
6. **Adaptive nutrition:** meal replace e recommendations existem, mas não provam redistribuição longitudinal de metas/plano.
7. **Long-term memory:** history, summarizer, timeline e session memory existem; não há memória durável com controles do usuário e provenance comprovados.
8. **Analytics:** nomes de eventos, tela `TrainingAnalytics` e logs técnicos não constituem product analytics.
9. **Web platform:** landing page e placeholders compilam, mas não existe cliente web autenticado.
10. **Production readiness:** testes unitários e build verde não cobrem deploy, backup, rate limit, E2E real, incident response, push ou privacy operacional.

## 11. Dead Code, Duplications and Divergences

- **Duplicação de inteligência:** `apps/mobile/src/hooks/coach/coach-intelligence.ts` recomputa sinais localmente em paralelo ao backend aggregate; `use-coach-intelligence.ts` mantém fallback legacy.
- **Endpoints/rotas internas:** `/debug/*`, replay, prompt, memory e dashboard debug existem para diagnóstico e não são produto público.
- **API client não consumido pela web:** `packages/api-client` está preparado para web, mas não é importado em `apps/web/src`.
- **Eventos descartados:** helpers de analytics mobile constroem eventos e não os transportam.
- **Feature flag divergente:** `EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED` não está nos env examples; backend e mobile podem operar em estados diferentes.
- **Demo path paralelo:** `AuthProvider.signInDemo()` cria/provisiona dados fixos e workout history, enquanto login real segue onboarding; isso pode mascarar buracos do primeiro valor.
- **Documentação versus implementação:** `feature-matrix.md` marca AI Coach/Mobile como implementados; `coach-intelligence` rollout docs e código indicam flag-off/fallback; `README` chama web de expansão futura, coerente com o código, mas o roadmap amplo pode sugerir paridade.
- **Tela/fluxo ausente:** não há criação de check-in mobile, nem telas explícitas de hábitos/social/profissional.
- **Código experimental/interno:** agent runtime, tool registry, replay e debug são infraestrutura, não superfícies de usuário.
- **Terminologia:** “analytics”, “memory”, “notification” e “AI” podem significar read model, trace interno, histórico ou decisão in-app; o produto precisa separar esses termos.

**Evidence:** `apps/mobile/src/hooks/coach/coach-intelligence.ts`, `use-coach-intelligence.ts`, `apps/mobile/src/auth/auth-provider.tsx`, `apps/mobile/src/hooks/use-coach-*.ts`, `apps/web/src/app/page.tsx`, controllers `debug/replay` em `apps/api/src/modules/ai` e `notifications`.

## 12. Production Readiness Audit

| Área | Estado | Evidência/limitação |
|---|---|---|
| Security | Parcial | JWT guard, bcrypt, validation, prompt safety existem; sem rate limiting, secret rotation, abuse controls ou privacy controls completos. |
| Reliability | Parcial | Retry/circuit/fallback de LLM e idempotency/replay existem; sem SLO, external metrics e E2E ambientalmente verde. |
| Performance | Não comprovada | Sem load test, profiling, latency budget ou cache strategy operacional. |
| Deployment | Parcial | Dockerfile/Compose e CI build; sem deploy workflow, staging/prod config ou rollback operacional. |
| Data | Parcial | Mongo persistence, bounded in-memory traces; sem backup, restore, migration/versioning e disaster recovery comprovados. |
| Privacy | Não comprovada | IA sanitiza metadata; não há política/consent/export/delete de dados de usuário evidenciada. |
| Observability | Parcial | Correlation logs, health, AI internal traces; no-op metrics e sem sink externo. |
| Operations | Não pronta | `scripts/docker-smoke.sh` existe mas não é CI; sem incident response/on-call/runbook completo. |
| Health safety | Não pronta | Não há escalonamento clínico formal para dor, lesão, alergia, alimentação ou crise. |
| Notifications | Não pronta | In-app planned decisions; sem push provider/device/background delivery. |
| Validation | Não pronta | Unit tests fortes; E2E bloqueado e sem product analytics/outcome. |

**Verdict:** nenhum Epic user-facing deve ser marcado `PRODUCTION_READY`. O máximo defensável para partes técnicas é `INTEGRATED_NOT_VALIDATED`; a agregação/IA pode ser `PRODUCTION_CANDIDATE` apenas para rollout interno controlado, nunca para o produto inteiro.

## 13. Roadmap Reclassification

### Done

Nenhum Epic completo do roadmap 1.0 atende simultaneamente integração, medição, segurança, operação e produção.

### Needs validation

- 1.2 Unified Daily Dashboard
- 1.3 Complete Training Experience
- 1.4 Complete Nutrition Experience
- 2.4 Cross-Domain Recommendation Engine
- 4.4 Coach Trust and Explainability

### Needs integration

- 2.1 Intelligent Daily Coaching
- 2.2 Adaptive Training Engine
- 2.3 Adaptive Nutrition Engine
- 3.1 Habit Intelligence
- 3.2 Progress Intelligence
- 3.3 Motivation and Engagement Intelligence
- 4.1 Long-Term Coach Memory
- 4.2 Conversation Experience
- 4.3 Proactive Coaching

### Needs completion

- 0.1 Product Governance
- 0.2 Core Platform Stabilization
- 1.1 Intelligent Onboarding
- 1.5 Recovery Experience
- 1.6 Goals and Progress
- 0.3 Product Analytics Foundation

### Not started

- 5.1 Health and Wearable Integrations
- 5.2 Multimodal Coaching
- 5.3 Social and Community
- 5.4 Professional Ecosystem

### Defer

- 5.5 Web Platform, salvo landing/marketing deliberada.
- Expansão do agent runtime/tool calling antes de validar o Coach determinístico.
- Push real antes de medir o lifecycle in-app.

## 14. Recommended Next Release

**Escolha: Adaptive Coach.**

É a opção que mais reduz o gap entre o MVP e a hipótese de valor documentada. O backend já possui calculators de recovery, training, nutrition, goals, habits, personalization e notifications, além de persistência e explicabilidade. O que falta é integrar o loop: entrada de check-in → decisão → alteração concreta do próximo treino/nutrição → aceitação/rejeição → outcome → analytics.

Não recomendo “Coach That Learns” ou “Trusted Personal Coach” agora: memória, analytics, privacy e outcomes ainda não estão fechados. Também não recomendo “Connected Coaching Ecosystem”: todos os Epics H5 estão ausentes.

## 15. Top 10 Next Actions

1. **Entregar check-in mobile real.** Objetivo: completar a entrada do loop diário. Motivo: hoje o backend aceita, mas o usuário não cria. Dependências: `progress` API e recovery. Resultado: check-in persistido a partir do dashboard. Risco reduzido: roadmap core não demonstrável. Conclusão: E2E register→check-in→snapshot verde.
2. **Provar adaptação aplicada ao plano.** Objetivo: transformar recommendation em mudança auditável do próximo workout. Motivo: decisão não é adaptação. Dependências: training plan model, snapshot/versioning. Resultado: volume/intensity/exercise/duration alterados quando regra exige. Risco: falsa promessa de personalização. Conclusão: before/after + replay + E2E.
3. **Instrumentar product analytics.** Objetivo: medir onboarding, workout, nutrition, recovery, Coach, acceptance e retention. Motivo: nenhum outcome é medido. Dependências: consent/privacy e schema de eventos. Resultado: eventos versionados em destino verificável. Risco: continuar expandindo sem aprendizado. Conclusão: taxonomy + delivery test + dashboards mínimos.
4. **Ativar aggregate canônico em staging.** Objetivo: eliminar divergência backend/mobile. Motivo: flag-off e recomposição local. Dependências: env flag, paridade contract, telemetry. Resultado: canonical path com fallback monitorado. Risco: decisões inconsistentes. Conclusão: rollout interno com fallback/latency/error thresholds.
5. **Completar feedback de workout.** Objetivo: capturar carga, RPE, dor, skip e motivo. Motivo: alimenta recovery/adaptation. Dependências: DTOs, schema, UX safety. Resultado: inputs que alteram recommendation. Risco: engine sem sinais relevantes. Conclusão: persisted fields + validation + tests.
6. **Definir safety de recovery/nutrição.** Objetivo: limites, warning e escalation para dor, lesão, alergia e risco alimentar. Motivo: domínio de saúde. Dependências: product policy e UX. Resultado: respostas seguras/uncertain. Risco: recomendação potencialmente danosa. Conclusão: adversarial test matrix.
7. **Fechar E2E em ambiente suportado.** Objetivo: executar os 15 fluxos E2E com Mongo real/memory server fora da restrição. Motivo: unit tests não provam wiring/runtime. Dependências: CI service container ou permissões de bind. Resultado: green E2E report. Risco: regressão de integração oculta. Conclusão: CI obrigatório sem sandbox-only dependency.
8. **Baselinar operação.** Objetivo: secrets, rate limit, backup/restore, deploy, rollback, external metrics e incident runbook. Motivo: hoje não há prova operacional. Dependências: ambiente de staging. Resultado: release candidate operável. Risco: indisponibilidade/perda de dados. Conclusão: restore drill e smoke CI.
9. **Definir memória e consentimento antes de ativar.** Objetivo: separar history/session/durable memory. Motivo: timeline não comprova memória segura. Dependências: privacy model. Resultado: provenance, TTL, edit/delete/export. Risco: retenção incorreta de dados pessoais. Conclusão: privacy tests e user controls.
10. **Congelar expansão H5 e limpar divergências.** Objetivo: remover/rotular placeholders, flags não documentadas e caminhos legacy. Motivo: reduz aparência falsa de completude. Dependências: decisões de produto. Resultado: roadmap/status confiável. Risco: trabalho duplicado e scope creep. Conclusão: cada capability tem owner/status/evidence.

## 16. Final Verdict

1. **Qual porcentagem aproximada do roadmap está implementada?** Cerca de **52%** possui implementação relevante, contando parcialmente implementados e infraestrutura; nenhum percentual deve ser interpretado como entrega completa.
2. **Qual porcentagem está realmente integrada?** Cerca de **31%**, concentrada em auth, onboarding básico, dashboard, workout, nutrição, progress, recovery reads e Coach determinístico; cross-domain canônico ainda tem fallback/flags.
3. **Qual porcentagem está pronta para produção?** **0% dos Epics completos** no padrão exigido. Partes técnicas são candidatas a rollout controlado, mas faltam E2E comprovado, analytics, operações, privacy e safety.
4. **Qual é o próximo Epic correto?** **Adaptive Coach.**
5. **O que não deve ser construído agora?** Wearables, multimodal, social, marketplace/professionals, web parity, agent tools e long-term memory avançada.
6. **Expandir ou consolidar?** **Consolidar.** O repositório já tem amplitude suficiente; o gargalo é integração, ativação padrão, outcomes, analytics e operação.

