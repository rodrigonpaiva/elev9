# Repository Technical Audit

## 1. Executive Summary

Este repositório é um monorepo Nx com três aplicações principais em produção de código e duas bibliotecas compartilhadas centrais:

- `apps/api`: backend NestJS modular com domínio rico, persistência MongoDB/Mongoose, camada de IA, observabilidade e múltiplos endpoints de coaching e suporte ao produto.
- `apps/mobile`: app React Native/Expo, com navegação própria, experiência principal do usuário e consumo dos contratos compartilhados.
- `apps/web`: superfície web mínima/marketing, com escopo claramente inferior ao mobile.
- `packages/types`: contratos TypeScript compartilhados entre backend e mobile.
- `packages/api-client`: cliente HTTP gerado manualmente sobre `fetch`, consumido pelo mobile.
- `packages/ui`: design system compartilhado entre mobile e web.

O estado real do produto é o de uma plataforma de coaching fitness e bem-estar com:

- autenticação e perfil de usuário;
- dashboards e trilhas de treino/nutrição/recuperação/progresso/hábitos;
- IA de coaching com runtime, especialistas, composição, persona, explicabilidade e observabilidade;
- mobile como superfície primária;
- web como shell de baixa complexidade.

Há forte evidência de arquitetura modular monolítica e separação por bounded contexts. Também há evidência de consistência técnica elevada em segurança de IA, replay e leitura estruturada. Ao mesmo tempo, existem divergências documentais e partes do mobile que continuam recombinando inteligência localmente a partir de múltiplos endpoints, em vez de consumir um único DTO unificado de backend.

### Classificação factual do estado

- **Funcionalidade implementada**: autenticação, perfil, dashboard, treino, nutrição, recuperação, objetivos, hábitos, progresso, personalização, notificações, IA de chat e coach decision, observabilidade interna, design system básico, navegação mobile, contrato cliente/servidor.
- **Funcionalidade parcialmente implementada**: camadas de debug e replay internas, respostas estruturadas de IA, experiências mobile compostas a partir de múltiplos endpoints.
- **Funcionalidade apenas documentada**: algumas specs em `docs/specs/*` e referências a futuros agentes/capacidades em `docs/specs/ai-agent/*`.
- **Funcionalidade planejada**: várias páginas de docs citam capacidades futuras; não há evidência de execução funcional equivalente em código para todos os itens.
- **Código não utilizado / experimental**: rotas debug, endpoints de replay e algumas superfícies de documentação exploratória.
- **Código protegido por feature flag**: execução LLM, streaming, tool calling, memória de agente, runtime de agente.
- **Código acessível apenas por endpoints internos/debug**: rotas `/debug/*` no backend de IA, replay endpoints e `health`.

Referências principais: [package.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/package.json), [nx.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/nx.json), [apps/api/src/app.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/app.module.ts), [apps/mobile/src/navigation/app-navigator.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/navigation/app-navigator.tsx), [docs/specs/GOVERNANCE.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/GOVERNANCE.md), [docs/architecture/service-map.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/service-map.md).

## 2. Estado real do produto

### Visão factual

O produto implementa uma plataforma de coaching centrada em:

- perfil do usuário e perfil físico;
- treino e plano de treino;
- nutrição com plano, logs, recomendações e substituição de refeições;
- recuperação com snapshots e tendências;
- objetivos, hábitos, progresso e personalização;
- IA de coach com chat, decisão diária, feedback, memória, debug e replay;
- dashboard agregador;
- mobile com rotas dedicadas a cada área.

### O que está implementado

- Autenticação com register/login/me: [apps/api/src/modules/auth/presentation/http/auth.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/auth/presentation/http/auth.controller.ts)
- Perfil de usuário: [apps/api/src/modules/users/presentation/http/users.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/users/presentation/http/users.controller.ts)
- Perfil fitness: [apps/api/src/modules/fitness/presentation/http/fitness.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/fitness/presentation/http/fitness.controller.ts)
- Treino: [apps/api/src/modules/training/presentation/http/training.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/training/presentation/http/training.controller.ts), [apps/api/src/modules/training/presentation/http/adaptive-training.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/training/presentation/http/adaptive-training.controller.ts)
- Nutrição: [apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts)
- Recuperação: [apps/api/src/modules/recovery/presentation/http/recovery.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/recovery/presentation/http/recovery.controller.ts)
- Objetivos: [apps/api/src/modules/goals/presentation/http/goals.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/goals/presentation/http/goals.controller.ts)
- Hábitos: [apps/api/src/modules/habits/presentation/http/habits.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/habits/presentation/http/habits.controller.ts)
- Progresso: [apps/api/src/modules/progress/presentation/http/progress.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/progress/presentation/http/progress.controller.ts)
- Dashboard: [apps/api/src/modules/dashboard/presentation/http/dashboard.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/dashboard/presentation/http/dashboard.controller.ts)
- IA de coach: [apps/api/src/modules/ai/presentation/http/ai.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/presentation/http/ai.controller.ts), [apps/api/src/modules/ai/presentation/http/coach-decision.controller.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/presentation/http/coach-decision.controller.ts)
- Mobile com navegação e experiência compostas: [apps/mobile/src/navigation/app-navigator.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/navigation/app-navigator.tsx), [apps/mobile/src/screens/main-tabs-screen.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/screens/main-tabs-screen.tsx)
- Design system compartilhado: [packages/ui/src/components](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components), [packages/ui/src/theme](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/theme)

### O que está parcialmente implementado

- Rotas e endpoints de debug/replay existem e são internos, mas não fazem parte da experiência pública principal.
- A camada de mobile constrói modelos compostos localmente a partir de múltiplos endpoints.
- A documentação menciona futuras capacidades em alguns domínios, mas o código não comprova todas como produto público.

### O que está apenas documentado

- Specs exploratórias e orientadas a futuro em [docs/specs/ai-agent](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai-agent), [docs/specs/auth](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/auth), [docs/specs/fitness](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/fitness), [docs/specs/users](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/users), [docs/specs/training](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/training).

## 3. Inventário Nx

### Proyectos Nx reais

Com base em `nx show projects --json`, o workspace contém exatamente:

| Projeto      | Tipo | Root                  | Responsabilidade factual                 |
| ------------ | ---- | --------------------- | ---------------------------------------- |
| `api-client` | lib  | `packages/api-client` | Cliente HTTP tipado para APIs do backend |
| `types`      | lib  | `packages/types`      | Contratos TypeScript compartilhados      |
| `mobile`     | app  | `apps/mobile`         | Aplicação React Native/Expo              |
| `ui`         | lib  | `packages/ui`         | Design system compartilhado              |
| `api`        | app  | `apps/api`            | Backend NestJS                           |
| `web`        | app  | `apps/web`            | Superfície web                           |

### Grafo real de dependências

Com base em `nx graph --print`:

```text
api-client -> types
mobile -> api-client
mobile -> types
mobile -> ui
```

Não há evidência de outras dependências Nx entre projetos.

### Targets por projeto

- `api`: `build`, `start`, `start:dev`, `test`, `test:watch`, `test:e2e`
- `mobile`: `start`, `serve`, `run-ios`, `run-android`, `export`, `install`, `prebuild`, `build`, `submit`, `build-deps`, `watch-deps`, `android`, `ios`, `build:eas`, `test`
- `web`: `build`, `dev`, `start`, `serve-static`, `build-deps`, `watch-deps`
- `ui`: `build`
- `types`: `build`, `lint`
- `api-client`: `build`, `lint`

Referências: [nx.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/nx.json), [package.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/package.json).

## 4. Estrutura completa do workspace

### Raiz

Arquivos estruturantes observados:

- [package.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/package.json)
- [nx.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/nx.json)
- [tsconfig.base.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/tsconfig.base.json)
- [.eslintrc.cjs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/.eslintrc.cjs)
- [.prettierrc](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/.prettierrc)
- [README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/README.md)
- [README.en.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/README.en.md)
- [README.fr.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/README.fr.md)
- [docs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs)
- [apps](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps)
- [packages](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages)
- [scripts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/scripts)

### Diretórios ausentes

- `libs/` não existe.
- `tools/` não existe.

Isso é factual a partir do inventário do workspace e da árvore de arquivos.

### Configuração de workspace

- `appsDir: apps`
- `libsDir: packages`
- `neverConnectToCloud: true`
- analytics desabilitado
- plugins Nx para Expo e Next

Referências: [nx.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/nx.json), [tsconfig.base.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/tsconfig.base.json).

## 5. Catálogo de módulos backend

### Módulos de domínio identificados

| Módulo            | Responsabilidade factual                                                             | Imports centrais                                                                                                        | Observações                       |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `ai`              | runtime de IA, chat, decisões, composição, persona, explicabilidade, observabilidade | Auth, Dashboard, Fitness, Goals, Habits, Notifications, Nutrition, Personalization, Progress, Recovery, Training, Users | é o módulo mais complexo          |
| `auth`            | autenticação, sessão, registro, login                                                | Users                                                                                                                   | usa JWT e guard de sessão         |
| `dashboard`       | agregação de insights                                                                | Auth, Ai, Notifications, Goals, Habits, Users, Personalization, Fitness, Progress, Training                             | consome vários read models        |
| `fitness`         | perfil físico                                                                        | Auth, Users                                                                                                             | base para várias recomendações    |
| `goals`           | objetivos, milestones, achievements, forecast                                        | Auth, Users, Fitness, Progress, Nutrition, Recovery, Training                                                           | integra múltiplos domínios        |
| `habits`          | hábitos, consistência, risco                                                         | Auth, Users, Fitness, Progress, Recovery, Goals, Notifications, Training                                                | inclui replay                     |
| `health`          | healthcheck/readiness                                                                | nenhum domínio                                                                                                          | módulo mínimo                     |
| `notifications`   | decisões e histórico de notificações                                                 | Auth, Users, Fitness, Progress, Nutrition, Goals, Recovery, Training, Ai, Personalization                               | integra IA/personalização         |
| `nutrition`       | perfil, plano, logs, recomendações                                                   | Auth, Users, Fitness                                                                                                    | inclui cálculo de macros          |
| `personalization` | snapshots, padrões, perfil de comportamento                                          | Auth, Users, Notifications, Habits, Goals, Recovery, Ai                                                                 | integra sinais comportamentais    |
| `progress`        | check-ins, workout logs, summaries                                                   | Auth, Users, Fitness, Training                                                                                          | mede progresso e treino realizado |
| `recovery`        | snapshots e tendências de recuperação                                                | Auth, Users, Fitness, Progress, Training                                                                                | base de readiness                 |
| `training`        | plano e recomendações adaptativas                                                    | Auth, Users, Fitness, Progress, Recovery, Nutrition                                                                     | planejamento adaptativo           |
| `users`           | user profile                                                                         | Auth                                                                                                                    | perfil base do usuário            |

### Responsabilidades por camada

O projeto segue separação `presentation / application / domain / infrastructure` na maior parte dos módulos. O módulo `health` é apenas apresentação. Isto é consistente com uma arquitetura modular monolítica e não com microserviços.

Referências: [apps/api/src/app.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/app.module.ts), [apps/api/src/modules/ai/ai.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/ai.module.ts).

## 6. Catálogo completo de APIs

### APIs públicas e autenticadas

| Módulo          | Método | Rota                                  | Auth | Guard              | Observação factual             |
| --------------- | ------ | ------------------------------------- | ---- | ------------------ | ------------------------------ |
| `auth`          | POST   | `/auth/register`                      | não  | não                | registro                       |
| `auth`          | POST   | `/auth/login`                         | não  | não                | login                          |
| `auth`          | GET    | `/auth/me`                            | sim  | `AuthSessionGuard` | sessão atual                   |
| `users`         | POST   | `/users/profile`                      | sim  | `AuthSessionGuard` | criação de perfil              |
| `fitness`       | POST   | `/fitness/profile`                    | sim  | `AuthSessionGuard` | criação de perfil fitness      |
| `fitness`       | GET    | `/fitness/profile`                    | sim  | `AuthSessionGuard` | perfil fitness atual           |
| `goals`         | GET    | `/goals/current`                      | sim  | `AuthSessionGuard` | objetivo atual                 |
| `goals`         | GET    | `/goals/history`                      | sim  | `AuthSessionGuard` | histórico                      |
| `goals`         | GET    | `/goals/milestones`                   | sim  | `AuthSessionGuard` | marcos                         |
| `goals`         | GET    | `/goals/achievements`                 | sim  | `AuthSessionGuard` | conquistas                     |
| `goals`         | GET    | `/goals/forecast`                     | sim  | `AuthSessionGuard` | forecast                       |
| `habits`        | GET    | `/habits/today`                       | sim  | `AuthSessionGuard` | snapshot do dia                |
| `habits`        | GET    | `/habits/current`                     | sim  | `AuthSessionGuard` | snapshot atual                 |
| `habits`        | GET    | `/habits/history`                     | sim  | `AuthSessionGuard` | histórico                      |
| `habits`        | GET    | `/habits/summary`                     | sim  | `AuthSessionGuard` | resumo                         |
| `habits`        | GET    | `/habits/risk`                        | sim  | `AuthSessionGuard` | risco                          |
| `notifications` | GET    | `/notifications/today`                | sim  | `AuthSessionGuard` | decisão do dia                 |
| `notifications` | GET    | `/notifications/current`              | sim  | `AuthSessionGuard` | decisão atual                  |
| `notifications` | GET    | `/notifications/history`              | sim  | `AuthSessionGuard` | histórico                      |
| `notifications` | GET    | `/notifications/engagement-summary`   | sim  | `AuthSessionGuard` | resumo de engajamento          |
| `notifications` | POST   | `/notifications/:id/events`           | sim  | `AuthSessionGuard` | evento de engajamento          |
| `nutrition`     | POST   | `/nutrition/profile`                  | sim  | `AuthSessionGuard` | perfil de nutrição             |
| `nutrition`     | GET    | `/nutrition/profile`                  | sim  | `AuthSessionGuard` | perfil atual                   |
| `nutrition`     | POST   | `/nutrition/macro-targets/calculate`  | sim  | `AuthSessionGuard` | cálculo de macros              |
| `nutrition`     | POST   | `/nutrition/plans`                    | sim  | `AuthSessionGuard` | plano                          |
| `nutrition`     | GET    | `/nutrition/plans/current`            | sim  | `AuthSessionGuard` | plano atual                    |
| `nutrition`     | GET    | `/nutrition/today`                    | sim  | `AuthSessionGuard` | overview                       |
| `nutrition`     | POST   | `/nutrition/logs`                     | sim  | `AuthSessionGuard` | log alimentar                  |
| `nutrition`     | POST   | `/nutrition/meals/:mealId/replace`    | sim  | `AuthSessionGuard` | substituição de refeição       |
| `nutrition`     | POST   | `/nutrition/recommendations`          | sim  | `AuthSessionGuard` | criação de recomendação        |
| `nutrition`     | GET    | `/nutrition/recommendations`          | sim  | `AuthSessionGuard` | lista de recomendações         |
| `progress`      | POST   | `/progress/daily-check-in`            | sim  | `AuthSessionGuard` | check-in diário                |
| `progress`      | POST   | `/progress/workout-logs`              | sim  | `AuthSessionGuard` | log de treino                  |
| `progress`      | GET    | `/progress/summary`                   | sim  | `AuthSessionGuard` | resumo                         |
| `progress`      | GET    | `/progress/workout-logs`              | sim  | `AuthSessionGuard` | logs                           |
| `progress`      | GET    | `/progress/daily-check-ins`           | sim  | `AuthSessionGuard` | histórico de check-ins         |
| `recovery`      | GET    | `/recovery/today`                     | sim  | `AuthSessionGuard` | snapshot do dia                |
| `recovery`      | GET    | `/recovery/current`                   | sim  | `AuthSessionGuard` | snapshot atual                 |
| `recovery`      | GET    | `/recovery/history`                   | sim  | `AuthSessionGuard` | histórico                      |
| `training`      | POST   | `/training/plans`                     | sim  | `AuthSessionGuard` | criação de plano               |
| `training`      | GET    | `/training/plans/current`             | sim  | `AuthSessionGuard` | plano atual                    |
| `training`      | GET    | `/training/adaptive/today`            | sim  | `AuthSessionGuard` | recomendação adaptativa do dia |
| `training`      | GET    | `/training/adaptive/current`          | sim  | `AuthSessionGuard` | recomendação adaptativa atual  |
| `training`      | GET    | `/training/adaptive/history`          | sim  | `AuthSessionGuard` | histórico adaptativo           |
| `dashboard`     | GET    | `/dashboard/home`                     | sim  | `AuthSessionGuard` | home do dashboard              |
| `dashboard`     | GET    | `/dashboard/home/debug`               | sim  | `AuthSessionGuard` | debug interno                  |
| `ai`            | POST   | `/ai/chat`                            | sim  | `AuthSessionGuard` | chat                           |
| `ai`            | POST   | `/ai/chat/stream`                     | sim  | `AuthSessionGuard` | streaming                      |
| `ai`            | GET    | `/ai/chat/history`                    | sim  | `AuthSessionGuard` | histórico                      |
| `ai`            | GET    | `/ai/chat/debug/history`              | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | GET    | `/ai/chat/debug/memory`               | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | GET    | `/ai/chat/debug/prompt`               | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | GET    | `/ai/chat/debug/reply-path`           | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | GET    | `/ai/chat/debug`                      | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | POST   | `/ai/coach-feedback`                  | sim  | `AuthSessionGuard` | feedback                       |
| `ai`            | GET    | `/ai/coach-feedback`                  | sim  | `AuthSessionGuard` | feedback                       |
| `ai`            | GET    | `/ai/debug/coach-feedback`            | sim  | `AuthSessionGuard` | debug                          |
| `ai`            | GET    | `/ai/debug/coach-feedback/:id/replay` | sim  | `AuthSessionGuard` | replay                         |
| `ai`            | GET    | `/ai/context`                         | sim  | `AuthSessionGuard` | contexto                       |
| `ai`            | GET    | `/ai/coach-decision/today`            | sim  | `AuthSessionGuard` | decisão do dia                 |
| `ai`            | GET    | `/ai/coach-decision/current`          | sim  | `AuthSessionGuard` | decisão atual                  |
| `ai`            | GET    | `/ai/coach-decision/history`          | sim  | `AuthSessionGuard` | histórico                      |
| `ai`            | GET    | `/ai/coach-decision/debug/:id/replay` | sim  | `AuthSessionGuard` | replay                         |
| `health`        | GET    | `/health`                             | não  | não                | healthcheck                    |
| `health`        | GET    | `/health/ready`                       | não  | não                | readiness                      |

### Status codes, DTOs e erros

Os controllers realizam mapeamento de erro explicitamente e muitos rejeitam payload indevido em GET. Os DTOs são validados por `class-validator` e `class-transformer`. Exemplos:

- [apps/api/src/modules/ai/presentation/http/dto/create-coach-chat-request.dto.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/presentation/http/dto/create-coach-chat-request.dto.ts)
- [apps/api/src/modules/auth/presentation/http/dto/login-user-request.dto.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/auth/presentation/http/dto/login-user-request.dto.ts)
- [apps/api/src/modules/nutrition/presentation/http/dto/log-meal-request.dto.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/nutrition/presentation/http/dto/log-meal-request.dto.ts)
- [apps/api/src/modules/progress/presentation/http/dto/log-workout-request.dto.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/progress/presentation/http/dto/log-workout-request.dto.ts)

## 7. Catálogo de entidades e schemas

### Padrão observado

Cada contexto mantém:

- entidades de domínio em `domain/entities`;
- interfaces de repositório em `domain/repositories`;
- implementações Mongoose em `infrastructure/mongoose`;
- schemas Mongoose com índices explícitos.

### Entidades e schemas com evidência direta

Os exemplos abaixo são os mais relevantes e foram confirmados por leitura de arquivo e/ou índices:

- `AuthUserSchema`: email único.
- `FitnessProfileSchema`: `userProfileId` único.
- `GoalSchema`, `GoalProgressSnapshotSchema`, `GoalForecastSchema`, `GoalMilestoneSchema`, `GoalAchievementSchema`.
- `HabitSnapshotSchema`, `HabitRiskSignalSchema`, `ConsistencySummarySchema`.
- `NotificationDecisionSchema`, `NotificationHistorySchema`, `EngagementEventSchema`.
- `NutritionProfileSchema`, `NutritionPlanSchema`, `NutritionLogSchema`, `NutritionRecommendationSchema`.
- `BehavioralPatternSchema`, `PersonalizationSnapshotSchema`, `UserBehaviorProfileSchema`.
- `DailyCheckInSchema`, `WorkoutLogSchema`.
- `RecoverySnapshotSchema`.
- `AdaptiveTrainingRecommendationSchema`, `TrainingPlanSchema`.
- `CoachConversationSchema`, `CoachConversationMemorySchema`, `CoachMessageSchema`, `CoachDecisionSchema`, `CoachFeedbackSchema`.

### Índices verificados por leitura e grep

- únicos por entidade principal para evitar duplicidade de agregado corrente;
- índices de composição por `userProfileId`, `date`, `createdAt`;
- índices de replay/histórico por `_id` e datas;
- alguns TTL não foram comprovados no repositório.

### O que não foi comprovado

- TTL explícito em documentos de retenção não foi comprovado nas leituras que fiz.
- Alguns campos internos de schemas compostos não foram relidos linha a linha nesta auditoria; quando isso importa, a conclusão deve ser tratada como “não comprovado no repositório”.

Referências raiz de persistência:

- [apps/api/src/modules](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules)
- [apps/api/src/shared/concurrency/idempotent-upsert.helper.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/shared/concurrency/idempotent-upsert.helper.ts)
- [apps/api/src/shared/replay/replay-comparator.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/shared/replay/replay-comparator.ts)

## 8. Mapa de persistência

### Collections confirmadas por contexto

- auth: usuários autenticados
- fitness: perfis fitness
- goals: objetivos, snapshots, forecast, milestones, achievements
- habits: snapshots, consistency summaries, risk signals
- notifications: decisions, history, engagement events
- nutrition: profiles, plans, logs, recommendations
- personalization: snapshots, behavior profiles, patterns
- progress: daily check-ins, workout logs
- recovery: snapshots
- training: plans, adaptive recommendations
- ai: chat conversations, messages, memory, decisions, feedback

### Estratégias reais observadas

- queries por `userProfileId` e datas;
- ordenação por `createdAt` ou `date`;
- proteção contra upsert duplicado via helper comum;
- read models separados dos documentos principais em alguns fluxos;
- replay em decisões e feedback para auditoria/diagnóstico.

### Riscos concretos de persistência

- histórico de mensagens/conversas pode crescer sem evidência suficiente de retenção TTL nas leituras efetuadas;
- rotas debug/replay ampliam persistência de metadados internos;
- alguns agregados têm múltiplos índices compostos, o que é funcionalmente bom, mas exige disciplina de manutenção.

## 9. Arquitetura mobile

### Stack real

- React Native 0.81.5
- Expo 54
- React 19.1
- navegação manual com `NavigationContainer` e stack nativo
- app root com `AuthProvider` e error boundary

Referências:

- [apps/mobile/App.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/App.tsx)
- [apps/mobile/src/navigation/app-navigator.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/navigation/app-navigator.tsx)
- [apps/mobile/src/auth/auth-provider.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/auth/auth-provider.tsx)

### Camadas reais

- `screens`: roteamento e apresentação;
- `hooks`: composição de dados, mapeamento e estado;
- `components`: primitives/compostos específicos da experiência;
- `api`: cliente mobile específico;
- `storage`: persistência local;
- `types`: contratos e modelos locais.

### Estados observados

- loading, error, empty state e fallback estão implementados em várias telas;
- demo mode existe em login;
- offline/cache/retry são suportados por mecanismo de cliente e armazenamento, mas cobertura de todos os fluxos não foi comprovada integralmente em todos os screens.

### Observação arquitetural

O mobile consome dados compostos e constrói uma representação local de inteligência de coach para UI. Isso é consistente com a proposta do app, mas significa que parte da síntese de dados continua ocorrendo no cliente.

## 10. Mapa de navegação

### Fluxo principal

```text
App
→ Auth flow
→ HomeResolver
→ CreateProfile / CreateFitnessProfile / CreateTrainingPlan / CreateNutritionProfile
→ MainTabs
→ Dashboard / Coach / Workout / History / Progress / Profile
```

### Rotas registradas

O stack principal inclui, entre outras:

- `Login`
- `HomeResolver`
- `CreateProfile`
- `CreateFitnessProfile`
- `CreateTrainingPlan`
- `CreateNutritionProfile`
- `MainTabs`
- `CoachHome`
- `AskCoach`
- `CoachChat`
- `CoachDailyBriefing`
- `CoachInsights`
- `CoachGoalGuidance`
- `CoachNotifications`
- `CoachMemoryTimeline`
- `CoachWeeklyReview`
- `Dashboard`
- `Workout` e suas subrotas
- `Nutrition*`
- `TrainingAnalytics`

### Rotas não alcançáveis / internas

Não houve prova completa de inacessibilidade estrutural para todas as rotas, mas existem fortes evidências de:

- screens acessadas apenas por navegação indireta;
- debug/support screens internas;
- alias `coach-chat-screen.tsx` reexportando `coach-conversation-screen.tsx`.

## 11. Contratos compartilhados

### `packages/types`

Contém tipos canônicos de:

- auth
- ai
- dashboard
- fitness
- goals
- habits
- notifications
- nutrition
- personalization
- progress
- recovery
- training
- users

### `packages/api-client`

Cliente HTTP com recursos por domínio:

- auth
- ai
- dashboard
- fitness
- goals
- habits
- notifications
- nutrition
- personalization
- progress
- recovery
- training

### Drift e duplicações

Há forte alinhamento entre `packages/types`, DTOs de backend e cliente. Ainda assim:

- parte do mobile usa mapeadores locais e tipos derivados para compor UX;
- o `HttpClient` usa `unknown` internamente e um cast genérico de resposta;
- validações de contratos entre backend e cliente foram confirmadas nos testes existentes para algumas rotas, mas não para todas.

Referências:

- [packages/types/src/index.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/types/src/index.ts)
- [packages/api-client/src/index.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/api-client/src/index.ts)

## 12. Design system

### `packages/ui`

Componentes observados:

- `Badge`
- `Button`
- `Card`
- `Input`
- `Screen`
- `SectionHeader`
- `Text`

Tokens observados:

- cores escuras com verde como primária
- superfícies em slate/gray
- espaçamento e radius centralizados

### Comparação com mobile local

O mobile possui componentes específicos de coach e dashboard que reaproveitam parte do UI kit, mas também aplicam estilos próprios e repetem padrões visuais:

- `apps/mobile/src/components/coach/*`
- `apps/mobile/src/components/dashboard/*`

Isso caracteriza duplicação parcial do design system no cliente mobile.

Referências:

- [packages/ui/src/theme/colors.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/theme/colors.ts)
- [packages/ui/src/components/Text.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components/Text.tsx)
- [packages/ui/src/components/Card.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components/Card.tsx)
- [packages/ui/src/components/Badge.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components/Badge.tsx)
- [packages/ui/src/components/SectionHeader.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components/SectionHeader.tsx)

## 13. Subsistema de IA

### Pipeline factual

O backend de IA está implementado em camadas:

```text
Controller
→ Use case
→ Runtime
→ Context builder
→ Intent / Policy / Safety
→ Planner
→ Router
→ Experts
→ Composition
→ Persona
→ Explainability
→ Prompt builder
→ Provider
→ Structured output
→ Validation
→ Fallback
→ Persistence
→ Observability
→ Response
```

### Evidência direta

- controllers de chat, feedback, decisões e debug: [apps/api/src/modules/ai/presentation/http](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/presentation/http)
- módulo e providers centrais: [apps/api/src/modules/ai/ai.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/ai.module.ts)
- cliente OpenAI e segurança/observabilidade aparecem como providers registrados no módulo
- o mobile possui mapeadores locais de inteligência: [apps/mobile/src/hooks/coach/coach-intelligence.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/hooks/coach/coach-intelligence.ts)

### O que está claramente implementado

- feature flags para LLM/runtime/tools/memory;
- prompt builder;
- safety/injection detection/redaction;
- provider OpenAI com structured outputs;
- replay, debug e observabilidade de IA;
- composição de especialistas e persona;
- experiência mobile derivada de inteligência de coach.

### O que não foi comprovado integralmente

- retenção de prompts/respostas com TTL explícito em todos os caminhos;
- circuit breaker formal em todos os trechos;
- replay end-to-end de todas as modalidades.

## 14. Segurança

### Implementado

- `AuthSessionGuard` protege rotas autenticadas;
- validações de DTOs no boundary HTTP;
- segurança de IA com sanização/redação e detecção de prompt injection;
- defaults de feature flags desativadas;
- debug/internal endpoints não são expostos como superfícies públicas de produto.

### Riscos residuais

- múltiplos endpoints de debug/replay precisam permanecer estritamente internos;
- o mobile e o cliente API possuem objetos compostos que devem evitar vazamento de metadados internos;
- a documentação deve continuar alinhada ao que é realmente público.

## 15. Observabilidade

### Evidência

- existem serviços de observabilidade no módulo AI;
- há replay e debug para feedback e decisões;
- há smoke scripts e documentação de readiness;
- retenção/pruning existem como preocupação operacional documentada.

### Limitações

- não foi comprovado, na leitura efetuada, que toda a telemetria operacional esteja uniformemente implementada em todos os módulos.

## 16. Estratégia de testes

### Inventário factual

- `apps/api`: 209 arquivos de teste
- `packages/api-client`: 4 arquivos de teste
- `apps/mobile`: 4 arquivos de teste
- `packages/ui`: 1 arquivo de teste

### Cobertura observada

- backend: unit, integração e e2e
- mobile: helpers e hooks
- client: shape de requests/responses
- ui: formatters

### Validações executadas

| Comando                                   | Resultado                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run format`                          | aprovado                                                                       |
| `npm run format:check`                    | aprovado                                                                       |
| `npm exec tsc -- --noEmit --pretty false` | aprovado                                                                       |
| `npm run test`                            | aprovado                                                                       |
| `npm run test:e2e`                        | reprovado no sandbox por `mongodb-memory-server`/bind em `0.0.0.0` com `EPERM` |

## 17. Resultados das validações executadas

Além dos comandos acima, foram executados:

- `npm exec nx -- show projects --json`
- `npm exec nx -- graph --print`
- `npm exec nx -- show project <name> --json`
- inventários via `rg --files` e `rg -n`

Resultado resumido:

- workspace Nx válido e com seis projetos reais;
- grafo real pequeno e coerente;
- documentação extensa;
- backend e mobile com alta cobertura estrutural;
- e2e limitado pelo ambiente sandbox, não pela aplicação.

## 18. Código morto ou desconectado

### Evidências de código/documentação desconectados

- `docs/specs/ai-agent/*` é exploratório/documental e não evidencia produto público correspondente.
- algumas specs em `docs/specs/*` tratam funcionalidades futuras ou placeholders.
- o web app é minimalista e não acompanha a ambição documental de algumas specs.

### Endpoints/debug internos

- `/ai/chat/debug/*`
- `/ai/debug/coach-feedback/*`
- `/ai/coach-decision/debug/*`
- `/dashboard/home/debug`
- `/habits/debug/*`
- `/notifications/debug/*`
- `/personalization/debug/*`

### Componentes e hooks com duplicação funcional

- componentes específicos do mobile duplicam parcialmente papéis do design system compartilhado;
- parte do mobile recomputa modelos compostos a partir de vários endpoints.

## 19. Matriz documentação versus implementação

### Divergências principais

| Documento                                                                                                                                                                    | Afirmação                                   | Implementação encontrada                                                                               | Tipo de divergência                              | Risco                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------- |
| [docs/specs/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/README.md)                                                                             | descreve capacidades amplas de IA e runtime | há implementação forte em `apps/api`, mas parte do comportamento ainda é exposto via debug/internals   | documentação mais ampla que a superfície pública | falsa expectativa de disponibilidade     |
| [docs/specs/ai/release-readiness/final-certification.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai/release-readiness/final-certification.md)         | certificação de prontidão                   | há feature flags e infraestrutura, mas e2e falhou no sandbox e não foi provada operação prod real aqui | certificação depende de contexto externo         | risco de leitura excessivamente positiva |
| [docs/specs/mobile/coach-intelligence-integration/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/mobile/coach-intelligence-integration/README.md) | integração com inteligência unificada       | mobile compõe localmente a inteligência a partir de múltiplos endpoints                                | divergência parcial de arquitetura               | duplicação de lógica                     |

## 20. Débitos técnicos

- duplicação de composição no mobile;
- endpoints debug numerosos e de manutenção crítica;
- documentação com linguagem de futuro em áreas já implementadas e vice-versa;
- algumas garantias operacionais não foram comprovadas integralmente por leitura única;
- o web app permanece muito abaixo do resto do produto em maturidade.

## 21. Riscos

### Bloqueantes ou quase-bloqueantes antes do próximo Epic

- necessidade de manter alinhamento rigoroso entre documentação e implementação;
- risco de drift entre contratos backend e tipos/clientes mobile;
- risco operacional dos endpoints internos/debug;
- risco de crescimento de históricos/mensagens sem retenção comprovada em todas as trilhas;
- e2e não executável integralmente neste sandbox.

## 22. Roadmap arquitetural

### Curto prazo

- estabilizar documentação para refletir apenas o que está realmente implementado;
- reduzir duplicação do mobile onde já exista UI compartilhada equivalente;
- consolidar a estratégia de debug/replay interno.

### Médio prazo

- fortalecer contratos unificados e evitar recomposição local redundante;
- ampliar cobertura de testes e garantir execução e2e fora do sandbox;
- padronizar mais a observabilidade entre módulos.

### Longo prazo

- evoluir a IA e o mobile sem ampliar drift documental;
- preservar modularidade e boundaries já existentes;
- manter feature flags como barreira de ativação.

## 23. Avaliação revisada

### Notas objetivas

| Critério               |   Nota | Justificativa factual                                                                              |
| ---------------------- | -----: | -------------------------------------------------------------------------------------------------- |
| DDD                    |   8/10 | bounded contexts e separação por domínio são reais; há forte alinhamento entre módulos e agregados |
| Clean Architecture     | 7.5/10 | separação por camadas existe; some coupling via aggregation/services compartilhados                |
| Modular Monolith       | 8.5/10 | o workspace é claramente modular monolith e não microservice-like                                  |
| Segurança              |   8/10 | guards, DTO validation, feature flags e safety de IA estão presentes                               |
| Observabilidade        |   8/10 | há replay, debug, observability services e readiness docs                                          |
| Manutenibilidade       | 7.5/10 | boa estrutura, mas com duplicação mobile e docs divergentes                                        |
| Testabilidade          |   8/10 | cobertura alta em backend e validações centrais; e2e impedido pelo sandbox                         |
| Escalabilidade         | 7.5/10 | boa modularidade, mas IA/persistência precisam disciplina operacional                              |
| Confiabilidade         |   8/10 | fallback, safety e feature flags ajudam; e2e não validado no sandbox                               |
| Maturidade mobile      | 7.5/10 | app consistente, mas com composição local significativa e duplicação visual                        |
| Maturidade da IA       | 8.5/10 | runtime, experts, composição, persona, explicabilidade e observabilidade são fortes                |
| Maturidade operacional | 7.5/10 | readiness existe, mas validação completa fora do sandbox é necessária                              |
| Qualidade documental   |   7/10 | ampla e bem estruturada, porém com divergências e linguagem parcialmente aspiracional              |

### Julgamento final

O repositório está arquiteturalmente acima de um produto mid-level e abaixo de uma maturidade principal completamente estabilizada por evidência operacional externa. A melhor classificação factual é: **Senior/Staff alto, com elementos de Principal em IA e arquitetura modular**.

## 24. Apêndice com inventário de arquivos relevantes

### Núcleo de configuração

- [package.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/package.json)
- [nx.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/nx.json)
- [tsconfig.base.json](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/tsconfig.base.json)
- [.eslintrc.cjs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/.eslintrc.cjs)
- [.prettierrc](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/.prettierrc)

### Backend

- [apps/api/src/app.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/app.module.ts)
- [apps/api/src/modules/ai/ai.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/ai/ai.module.ts)
- [apps/api/src/modules/auth/auth.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/auth/auth.module.ts)
- [apps/api/src/modules/dashboard/dashboard.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/dashboard/dashboard.module.ts)
- [apps/api/src/modules/fitness/fitness.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/fitness/fitness.module.ts)
- [apps/api/src/modules/goals/goals.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/goals/goals.module.ts)
- [apps/api/src/modules/habits/habits.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/habits/habits.module.ts)
- [apps/api/src/modules/notifications/notifications.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/notifications/notifications.module.ts)
- [apps/api/src/modules/nutrition/nutrition.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/nutrition/nutrition.module.ts)
- [apps/api/src/modules/personalization/personalization.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/personalization/personalization.module.ts)
- [apps/api/src/modules/progress/progress.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/progress/progress.module.ts)
- [apps/api/src/modules/recovery/recovery.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/recovery/recovery.module.ts)
- [apps/api/src/modules/training/training.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/training/training.module.ts)
- [apps/api/src/modules/users/users.module.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/api/src/modules/users/users.module.ts)

### Mobile

- [apps/mobile/App.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/App.tsx)
- [apps/mobile/src/navigation/app-navigator.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/navigation/app-navigator.tsx)
- [apps/mobile/src/screens/main-tabs-screen.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/screens/main-tabs-screen.tsx)
- [apps/mobile/src/hooks/coach/coach-intelligence.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/hooks/coach/coach-intelligence.ts)
- [apps/mobile/src/api/client.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/api/client.ts)
- [apps/mobile/src/auth/auth-provider.tsx](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/auth/auth-provider.tsx)
- [apps/mobile/src/components/coach](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/components/coach)
- [apps/mobile/src/components/dashboard](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/apps/mobile/src/components/dashboard)

### Shared

- [packages/api-client/src/index.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/api-client/src/index.ts)
- [packages/types/src/index.ts](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/types/src/index.ts)
- [packages/ui/src/components](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/components)
- [packages/ui/src/theme](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/packages/ui/src/theme)

### Docs e operações

- [docs/architecture/service-map.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/service-map.md)
- [docs/architecture/communication-flow.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/communication-flow.md)
- [docs/architecture/monorepo.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/monorepo.md)
- [docs/specs/GOVERNANCE.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/GOVERNANCE.md)
- [docs/specs/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/README.md)
- [docs/adr/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/README.md)
- [docs/specs/ai/release-readiness/final-certification.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai/release-readiness/final-certification.md)
- [docs/specs/mobile/coach-intelligence-integration/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/mobile/coach-intelligence-integration/README.md)
- [scripts/docker-smoke.sh](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/scripts/docker-smoke.sh)
