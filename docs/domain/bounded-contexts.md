# 🧩 Bounded Contexts — Elev9 Coach
## 1. Overview
Este documento define os bounded contexts do Elev9 Coach.
Um bounded context representa uma área do domínio com responsabilidade clara, linguagem própria e regras específicas.
O objetivo é evitar mistura entre módulos e preparar o sistema para evoluir de um modular monolith para microservices no futuro.
---
## 2. Architecture Decision
No MVP, o sistema será construído como:
```txt
Modular Monolith

Mas cada módulo será organizado como se pudesse virar um microservice no futuro.

src/modules/
  auth/
  users/
  fitness/
  training/
  nutrition/
  progress/
  ai-agent/

⸻

3. Context Map

Auth
 ↓
Users
 ↓
Fitness ─────┐
              ├── AI Agent ─── Training
Nutrition ───┘        │
                      └── Progress

⸻

4. Auth Context

Responsibility

Gerenciar acesso ao sistema.

Owns

* AuthUser
* Session
* RefreshToken
* PasswordResetToken
* EmailVerificationToken

Does NOT own

* Perfil físico
* Dados nutricionais
* Planos de treino
* Conversas com IA

Main Use-Cases

* register-user
* login-user
* logout-user
* refresh-session
* validate-session
* request-password-reset
* reset-password
* verify-email

Rules

* Email deve ser único
* Senha nunca deve ser salva em texto puro
* Tokens devem ter expiração
* Auth não conhece regras fitness

⸻

5. Users Context

Responsibility

Gerenciar a identidade funcional do usuário dentro do produto.

Owns

* UserProfile
* UserPreferences
* AccountStatus

Depends on

* Auth Context

Does NOT own

* Senha
* Sessão
* Plano de treino
* Plano alimentar

Main Use-Cases

* create-user-profile
* get-user-profile
* update-user-profile
* update-user-preferences
* change-user-language
* deactivate-user

Rules

* Um AuthUser pode ter um UserProfile
* O idioma padrão pode ser en-US
* O timezone deve ser armazenado

⸻

6. Fitness Context

Responsibility

Representar o contexto físico e objetivo fitness do usuário.

Owns

* FitnessProfile
* FitnessGoal
* PhysicalLimitation
* TrainingAvailability
* equipment

Depends on

* Users Context

Main Use-Cases

* create-fitness-profile
* update-fitness-profile
* set-fitness-goal
* update-body-data
* add-physical-limitation
* remove-physical-limitation
* set-training-availability
* set-available-equipment
* get-fitness-context

Rules

* Usuário deve ter apenas um perfil fitness ativo
* Disponibilidade mínima: 1 dia por semana
* Tempo mínimo por sessão: 10 minutos
* Limitações físicas devem ser consideradas pela IA

⸻

7. Nutrition Context

Responsibility

Gerenciar dados nutricionais, restrições e planos alimentares.

Owns

* NutritionProfile
* MacroTargets
* NutritionPlan
* Meal
* FoodItem
* NutritionLog

Depends on

* Users Context
* Fitness Context

Main Use-Cases

* create-nutrition-profile
* update-nutrition-profile
* calculate-macro-targets
* generate-weekly-meal-plan
* get-today-meals
* replace-meal
* log-meal
* adapt-nutrition-plan

Rules

* Alergias nunca podem aparecer nas refeições sugeridas
* Restrições alimentares devem ser respeitadas
* Metas nutricionais devem estar alinhadas ao objetivo fitness
* Apenas um plano alimentar ativo por usuário

⸻

8. Training Context

Responsibility

Gerenciar planos de treino, sessões e histórico de execução.

Owns

* TrainingPlan
* WorkoutDay
* Exercise
* TrainingSession
* WorkoutLog

Depends on

* Users Context
* Fitness Context
* AI Agent Context

Main Use-Cases

* create-training-plan
* generate-weekly-training-plan
* get-current-training-plan
* get-today-workout
* start-workout
* complete-workout
* skip-workout
* log-exercise-result
* adapt-training-plan
* replace-exercise

Rules

* Apenas um plano de treino ativo por usuário
* Plano deve respeitar disponibilidade semanal
* Exercícios devem respeitar limitações físicas
* Intensidade deve respeitar nível e estado atual do usuário

⸻

9. Progress Context

Responsibility

Registrar evolução, check-ins e aderência.

Owns

* DailyCheckIn
* BodyMetrics
* ProgressSnapshot
* AdherenceReport
* ProgressInsight

Depends on

* Users Context
* Training Context
* Nutrition Context

Main Use-Cases

* create-daily-check-in
* update-daily-check-in
* log-body-metrics
* log-weight
* log-energy-level
* log-sleep-quality
* calculate-weekly-adherence
* generate-progress-snapshot
* get-progress-dashboard

Rules

* Um usuário pode fazer apenas um check-in por dia
* Check-in alimenta o contexto da IA
* Sono baixo + energia baixa deve reduzir intensidade
* Progresso deve ser histórico, não sobrescrito

⸻

10. AI Agent Context

Responsibility

Gerenciar inteligência, contexto, prompts, recomendações e adaptações.

Owns

* AIConversation
* AIMessage
* AgentMemory
* PromptTemplate
* UserHealthContext
* AIRecommendation
* PlanAdjustment

Depends on

* Users Context
* Fitness Context
* Training Context
* Nutrition Context
* Progress Context

Main Use-Cases

* ask-coach-agent
* ask-nutrition-agent
* build-user-health-context
* generate-training-recommendation
* generate-nutrition-recommendation
* analyze-user-check-in
* validate-ai-output-safety
* generate-plan-adjustment
* store-agent-memory

Rules

* IA não decide sozinha sem regras de domínio
* Toda resposta importante deve ser validada
* Todo ajuste deve ter razão explícita
* Toda recomendação deve ter sourceContextId
* Output da IA deve ser estruturado, não texto livre quando for persistido

⸻

11. Cross-Context Rules

11.1 User Identity

Todos os contextos usam userId como referência principal.

11.2 Active Plan Rule

Um usuário só pode ter:

1 active TrainingPlan
1 active NutritionPlan
1 active FitnessProfile
1 active NutritionProfile

11.3 AI Safety Rule

A IA nunca pode ignorar:

* lesões
* alergias
* restrições alimentares
* nível do usuário
* sinais de fadiga

11.4 Historical Data Rule

Dados de progresso não devem ser apagados, apenas versionados ou arquivados.

⸻

12. Context Ownership Summary

Context	Owns	Main Purpose
Auth	AuthUser, Session	Acesso
Users	UserProfile	Identidade do produto
Fitness	FitnessProfile	Contexto físico
Training	TrainingPlan	Treinos
Nutrition	NutritionPlan	Alimentação
Progress	DailyCheckIn	Evolução
AI Agent	Recommendation, Adjustment	Inteligência adaptativa

⸻

13. Future Extraction Strategy

No MVP:

All contexts live inside one backend application.

No futuro:

Auth Service
Users Service
Fitness Service
Training Service
Nutrition Service
Progress Service
AI Agent Service

Cada bounded context já estará preparado para ser extraído.

⸻

14. Summary

Os bounded contexts do Elev9 Coach foram definidos para manter o sistema:

* modular
* claro
* testável
* preparado para IA
* pronto para futura extração em microservices

O contexto mais estratégico do produto é:

AI Agent Context

Mas ele depende diretamente da qualidade dos dados dos outros contextos.

Próximo recomendado: **`entities.md`**.
