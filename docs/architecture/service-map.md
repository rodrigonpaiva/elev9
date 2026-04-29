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
  └─ AI Agent Module
        ->
MongoDB
        ->
OpenAI API
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

### 3.7 AI Agent Module

Responsável por:

- construir contexto consolidado
- gerar prompts
- chamar OpenAI
- interpretar resposta
- emitir recomendações e ajustes

Principais entidades:

- `UserHealthContext`
- `AIRecommendation`
- `PlanAdjustment`

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
Fitness + Nutrition + Training + Progress -> AI Agent
```

Leitura importante:

- `Auth` não deve depender de `Fitness`, `Nutrition`, `Training`, `Progress` ou `AI`
- `AI Agent` consome contexto dos outros módulos, mas não deve assumir ownership de seus dados principais

---

## 5. Ownership Rules

Cada módulo é dono de suas entidades e regras:

- `Auth` é dono de autenticação
- `Users` é dono do perfil funcional
- `Fitness` é dono do contexto físico
- `Nutrition` é dono do plano alimentar
- `Training` é dono do plano de treino
- `Progress` é dono do histórico e check-ins
- `AI Agent` é dono das recomendações e ajustes

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

1. `AI Agent`
2. `Auth`
3. `Training`
4. `Nutrition`

Mas isso não deve influenciar a simplicidade do MVP.

---

## 8. Summary

O service map do MVP é lógico, não distribuído.

O sistema opera como um backend NestJS único, organizado por módulos com ownership explícito e comunicação direta.
