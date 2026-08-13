# Service Map — Elev9 Coach

## 1. Overview

Este documento descreve o mapa lógico dos módulos do backend no MVP.

Embora o produto possa evoluir para microservices no futuro, no MVP tudo roda dentro de um único backend NestJS em `modular monolith`.

---

## 2. Architecture Shape

```txt
React Native App
        ->
NestJS Backend
  ├─ Auth Module
  ├─ Users Module
  ├─ Fitness Module
  ├─ Nutrition Module
  ├─ Training Module
  ├─ Progress Module
  ├─ Recovery Module
  ├─ Goals Module
  ├─ Habits Module
  ├─ Personalization Module
  ├─ Notifications Module
  └─ AI / Coach Module
        ->
MongoDB
```

---

## 3. Module Map

### 3.1 Auth Module

Responsável por:

- registro
- login
- sessão
- validação de acesso

Principais entidades:

- `AuthUser`
- `Session`

Use-cases principais:

- `register-user`
- `login-user`
- `refresh-session`

### 3.2 Users Module

Responsável por:

- perfil funcional do usuário
- idioma
- timezone
- status da conta

Principais entidades:

- `UserProfile`

Use-cases principais:

- `create-user-profile`
- `get-user-profile`
- `update-user-profile`

### 3.3 Fitness Module

Responsável por:

- contexto físico
- objetivo fitness
- disponibilidade
- limitações
- equipamentos

Principais entidades:

- `FitnessProfile`
- `PhysicalLimitation`

### 3.4 Nutrition Module

Responsável por:

- perfil nutricional
- metas de macros
- plano alimentar
- substituição simples de refeições

Principais entidades:

- `NutritionProfile`
- `NutritionPlan`

### 3.5 Training Module

Responsável por:

- plano de treino
- treino do dia
- histórico de execução
- adaptações de treino

Principais entidades:

- `TrainingPlan`
- `WorkoutLog`

### 3.6 Progress Module

Responsável por:

- `DailyCheckIn`
- métricas corporais
- aderência
- snapshots de progresso

Principais entidades:

- `DailyCheckIn`
- `BodyMetrics`
- `ProgressSnapshot`

### 3.7 Recovery Module

Responsável por:

- construir recovery snapshots
- calcular readiness and fatigue
- alimentar coach and dashboard surfaces

### 3.8 Goals Module

Responsável por:

- canonical goal state
- progress snapshots
- forecast
- milestones
- achievements

### 3.9 Habits Module

Responsável por:

- habit snapshots
- consistency summaries
- risk signals

### 3.10 Personalization Module

Responsável por:

- behavioral patterns
- personalization snapshots
- long-horizon adaptation

### 3.11 Notifications Module

Responsável por:

- notification decisions
- engagement history
- fatigue and suppression rules

### 3.12 AI / Coach Module

Responsável por:

- construir contexto consolidado
- expor coach decisions
- explicar a recomendação do dia
- sanitizar prompts e validar respostas antes da geração OpenAI
- executar chat conversacional opcional via OpenAI com fallback determinístico e controles de confiabilidade
- expor chat síncrono e streaming aditivo sobre o mesmo use-case e a mesma persistência
- usar o Responses API com structured outputs e um parser centralizado para normalizar a resposta do modelo
- registrar traces operacionais, usage reports, cost guardrails e structured logs para requests de LLM
- expor metadata de capabilities do provider para suportar GPT-5.5 e modelos futuros
- operar um `AgentRuntime` interno com policy, context orchestration, planning, execution, memory e observability
- operar um `CoachExpertRegistry` interno para metadata de roteamento de especialistas
- operar um `CoachExpertRouter` interno para primary/complementary expert selection, dependency ordering e route validation
- operar a `Expert Observability` interna para capturar contribution, conflict, health e retention metadata dos especialistas
- operar um `WorkoutExpert` interno para análise determinística de treino com base em estado confiável
- operar um `NutritionExpert` interno para análise determinística de nutrição com base em estado confiável
- operar um `RecoveryExpert` interno para análise determinística de recovery com base em estado confiável
- operar um `GoalExpert` interno para análise determinística de progresso de metas, milestones e forecast com base em estado confiável
- operar um `HabitExpert` interno para análise determinística de consistência comportamental, streaks, padrões, risco e progresso de longo prazo com base em estado confiável
- operar um `ProgressExpert` interno para análise determinística de evolução longitudinal, momentum, plateau, regression e consistência de progresso com base em estado confiável
- operar um `MotivationExpert` interno para análise determinística de engajamento comportamental, oportunidade motivacional, estratégia e risco com base em estado confiável
- operar a `Expert Composition Engine` interna para consolidação determinística das contribuições dos especialistas em inteligência unificada
- operar a `Coach Persona Engine` interna para tradução determinística da inteligência unificada em guidance de comunicação para o prompt builder
- operar a `Explainability Layer` interna para tradução determinística da inteligência unificada em evidência estruturada para o prompt builder
- fornecer ao mobile as mesmas leituras unificadas, guidance de persona e explicações estruturadas sem alterar contratos públicos
- manter registry de versões de prompt, canary rollout determinístico, rollback por configuração e evaluation runner interno
- alimentar coach home, briefing, memory, insights, ask coach, weekly review, goal guidance e notifications

Principais entidades:

- `CoachDecision`
- `CoachFeedback`
- `ConversationMemory`

---

## 4. Dependency Direction

Direção recomendada entre módulos:

```txt
Auth -> Users
Users -> Fitness
Users -> Nutrition
Users -> Training
Users -> Progress
Fitness -> Training
Fitness -> Nutrition
Training -> Progress
Nutrition -> Progress
Fitness + Nutrition + Training + Progress + Recovery + Goals + Habits + Personalization + Notifications -> AI / Coach
```

Leitura importante:

- `Auth` não deve depender de `Fitness`, `Nutrition`, `Training`, `Progress` ou `AI`
- `AI / Coach` consome contexto dos outros módulos, mas não deve assumir ownership de seus dados principais

---

## 5. Ownership Rules

Cada módulo é dono de suas entidades e regras:

- `Auth` é dono de autenticação
- `Users` é dono do perfil funcional
- `Fitness` é dono do contexto físico
- `Nutrition` é dono do plano alimentar
- `Training` é dono do plano de treino
- `Progress` é dono do histórico e check-ins
- `AI / Coach` é dono das recomendações e ajustes de coaching

---

## 6. Runtime Communication

No MVP:

- comunicação síncrona
- chamadas diretas entre serviços
- sem event bus
- sem filas
- sem Redis

---

## 7. Future Extraction Path

Se o produto validar, os módulos candidatos a extração futura são:

1. `AI / Coach`
2. `Auth`
3. `Training`
4. `Nutrition`

Mas isso não deve influenciar a simplicidade do MVP.

---

## 8. Summary

O service map do MVP é lógico, não distribuído.

O sistema opera como um backend NestJS único, organizado por módulos com ownership explícito e comunicação direta.
