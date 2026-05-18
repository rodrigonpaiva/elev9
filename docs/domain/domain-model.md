# Domain Model — Elev9 Coach

## 1. Overview

O domínio do Elev9 Coach modela um sistema adaptativo de fitness e nutrição orientado por IA.

O objetivo do modelo é representar:

- identidade do usuário
- contexto físico e nutricional
- planos ativos
- execução e aderência
- check-ins diários
- recomendações e ajustes gerados por IA

O desenho do domínio é compatível com um MVP em `modular monolith`, com backend em NestJS e persistência em MongoDB via Mongoose.

---

## 2. Domain Principles

O modelo segue estes princípios:

- `MVP-first`: modelar apenas o que ajuda a validar o loop principal
- `modular`: cada contexto possui responsabilidade clara
- `history-aware`: progresso e ajustes devem ser rastreáveis
- `AI-ready`: a IA depende de contexto estruturado, não de texto solto
- `evolvable`: o modelo deve suportar futura extração para microservices

---

## 3. Core Domain Loop

```txt
UserProfile
   ->
FitnessProfile + NutritionProfile
   ->
TrainingPlan + NutritionPlan
   ->
Workout execution + Nutrition adherence
   ->
DailyCheckIn
   ->
UserHealthContext
   ->
AIRecommendation + PlanAdjustment
```

Esse loop é o núcleo funcional do produto no MVP.

---

## 4. Bounded Contexts

### 4.1 Auth Context

Responsável por autenticação e acesso.

Entidades principais:

- `AuthUser`
- `Session`
- `RefreshToken`
- `PasswordResetToken`

### 4.2 Users Context

Responsável pela identidade funcional do usuário no produto.

Entidades principais:

- `UserProfile`
- `UserPreferences`

### 4.3 Fitness Context

Responsável pelo contexto físico e objetivo fitness.

Entidades principais:

- `FitnessProfile`
- `PhysicalLimitation`
- `TrainingAvailability`

### 4.4 Training Context

Responsável por planos, sessões e histórico de treino.

Entidades principais:

- `TrainingPlan`
- `WorkoutDay`
- `Exercise`
- `WorkoutLog`

### 4.5 Nutrition Context

Responsável por perfil nutricional, planos e aderência alimentar.

Entidades principais:

- `NutritionProfile`
- `MacroTargets`
- `NutritionPlan`
- `Meal`
- `MealOption`
- `FoodItem`
- `NutritionLog`

### 4.6 Progress Context

Responsável por check-ins e evolução do usuário.

Entidades principais:

- `DailyCheckIn`
- `BodyMetrics`
- `ProgressSnapshot`

### 4.7 AI Agent Context

Responsável por construir contexto, chamar o provider de IA e persistir recomendações e ajustes.

Entidades principais:

- `UserHealthContext`
- `AIRecommendation`
- `PlanAdjustment`

---

## 5. Core Types

### 5.1 AuthUser

```ts
type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.2 UserProfile

```ts
type UserProfile = {
  id: string;
  authUserId: string;
  name: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatarUrl?: string;
  language: 'pt-BR' | 'fr-FR' | 'en-US';
  timezone: string;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.3 FitnessProfile

```ts
type FitnessProfile = {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  limitations: PhysicalLimitation[];
  availability: TrainingAvailability;
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.4 PhysicalLimitation

```ts
type PhysicalLimitation = {
  type: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
};
```

### 5.5 TrainingAvailability

```ts
type TrainingAvailability = {
  daysPerWeek: number;
  minutesPerSession: number;
  preferredDays?: string[];
};
```

### 5.6 TrainingPlan

```ts
type TrainingPlan = {
  id: string;
  userId: string;
  fitnessProfileId: string;
  status: 'active' | 'archived' | 'replaced';
  weekStartDate: Date;
  weekEndDate: Date;
  goal: string;
  generatedBy: 'ai' | 'manual';
  sourceContextId?: string;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.7 WorkoutDay

```ts
type WorkoutDay = {
  date: Date;
  dayOfWeek: string;
  title: string;
  focus: string;
  estimatedDurationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  exercises: Exercise[];
};
```

### 5.8 Exercise

```ts
type Exercise = {
  name: string;
  category: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  instructions?: string;
  equipment?: string[];
  safetyNotes?: string[];
};
```

### 5.9 WorkoutLog

```ts
type WorkoutLog = {
  id: string;
  userId: string;
  trainingPlanId?: string;
  workoutDate: Date;
  completed: boolean;
  perceivedEffort?: 1 | 2 | 3 | 4 | 5;
  durationMinutes?: number;
  notes?: string;
  createdAt: Date;
};
```

### 5.10 NutritionProfile

```ts
type NutritionProfile = {
  id: string;
  userId: string;
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  mealsPerDay: number;
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.11 MacroTargets

```ts
type MacroTargets = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};
```

### 5.12 NutritionPlan

```ts
type NutritionPlan = {
  id: string;
  userId: string;
  nutritionProfileId: string;
  status: 'active' | 'archived' | 'replaced';
  weekStartDate: Date;
  weekEndDate: Date;
  macroTargets: MacroTargets;
  generatedBy: 'ai' | 'manual';
  sourceContextId?: string;
  days: NutritionDay[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.13 NutritionDay

```ts
type NutritionDay = {
  date: Date;
  dayOfWeek: string;
  meals: Meal[];
};
```

### 5.14 Meal

```ts
type Meal = {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  description: string;
  foodItems: FoodItem[];
  estimatedMacros?: MacroTargets;
  alternatives?: MealOption[];
};
```

### 5.15 MealOption

```ts
type MealOption = {
  title: string;
  foodItems: FoodItem[];
  estimatedMacros?: MacroTargets;
};
```

### 5.16 FoodItem

```ts
type FoodItem = {
  name: string;
  quantity: string;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
};
```

### 5.17 NutritionLog

```ts
type NutritionLog = {
  id: string;
  userId: string;
  date: Date;
  followedPlan: boolean;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes?: string;
  createdAt: Date;
};
```

### 5.18 DailyCheckIn

```ts
type DailyCheckIn = {
  id: string;
  userId: string;
  date: Date;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  muscleSoreness: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  workoutCompleted: boolean;
  nutritionFollowed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.19 BodyMetrics

```ts
type BodyMetrics = {
  id: string;
  userId: string;
  recordedAt: Date;
  weightKg?: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  notes?: string;
};
```

### 5.20 ProgressSnapshot

```ts
type ProgressSnapshot = {
  id: string;
  userId: string;
  generatedAt: Date;
  adherenceScore: number;
  trainingConsistency: number;
  nutritionConsistency: number;
  notes?: string;
};
```

### 5.21 UserHealthContext

```ts
type UserHealthContext = {
  userId: string;
  fitnessProfile: FitnessProfile;
  nutritionProfile?: NutritionProfile;
  activeTrainingPlan?: TrainingPlan;
  activeNutritionPlan?: NutritionPlan;
  recentCheckIns: DailyCheckIn[];
  recentWorkoutLogs?: WorkoutLog[];
  recentNutritionLogs?: NutritionLog[];
  generatedAt: Date;
};
```

### 5.22 AIRecommendation

```ts
type AIRecommendation = {
  id: string;
  userId: string;
  agentType: 'coach' | 'nutrition' | 'safety';
  type:
    | 'training'
    | 'nutrition'
    | 'recovery'
    | 'motivation'
    | 'plan_adjustment';
  content: string;
  confidence?: number;
  sourceContextId?: string;
  createdAt: Date;
};
```

### 5.23 PlanAdjustment

```ts
type PlanAdjustment = {
  id: string;
  userId: string;
  sourceContextId: string;
  reason: string;
  adjustmentType: 'training' | 'nutrition' | 'both';
  changes: {
    training?: Record<string, unknown>;
    nutrition?: Record<string, unknown>;
  };
  applied: boolean;
  createdAt: Date;
};
```

---

## 6. Aggregates

### 6.1 Identity Aggregate

Root:

- `AuthUser`

Relacionamento externo:

- `AuthUser` pode originar um `UserProfile` no contexto `Users`

### 6.2 Fitness Aggregate

Root:

- `FitnessProfile`

Contains:

- `PhysicalLimitation`
- `TrainingAvailability`

### 6.3 Training Aggregate

Root:

- `TrainingPlan`

Contains:

- `WorkoutDay`
- `Exercise`

Related history:

- `WorkoutLog`

### 6.4 Nutrition Aggregate

Root:

- `NutritionPlan`

Contains:

- `NutritionDay`
- `Meal`
- `MealOption`
- `FoodItem`

Related history:

- `NutritionLog`

### 6.5 Progress Aggregate

Root:

- `DailyCheckIn`

Related:

- `BodyMetrics`
- `ProgressSnapshot`

### 6.6 AI Aggregate

Root:

- `PlanAdjustment`

Related:

- `UserHealthContext`
- `AIRecommendation`

---

## 7. Cross-Context Rules

### 7.1 User Identity Rule

Todos os contexts operacionais devem usar `userId` como chave de referência principal.

### 7.2 Auth Separation Rule

`register-user` cria apenas `AuthUser`.

`UserProfile` é criado em `users/create-user-profile`.

### 7.3 Active Plan Rule

Um usuário pode ter no máximo:

- `1` `FitnessProfile` ativo
- `1` `NutritionProfile` ativo
- `1` `TrainingPlan` ativo
- `1` `NutritionPlan` ativo

### 7.4 Daily Check-In Rule

Um usuário pode registrar apenas `1` `DailyCheckIn` por dia.

### 7.5 Safety Rule

A IA não pode ignorar:

- limitações físicas
- alergias
- restrições alimentares
- nível do usuário
- sinais recentes de fadiga

### 7.6 Historical Data Rule

Dados de progresso e planos anteriores devem ser arquivados ou versionados, não sobrescritos sem rastreabilidade.

---

## 8. Persistence Notes

No MVP:

- MongoDB é o banco principal
- Mongoose é a camada de modelagem
- documentos podem conter estruturas aninhadas em `TrainingPlan` e `NutritionPlan`
- históricos (`WorkoutLog`, `NutritionLog`, `DailyCheckIn`) devem ser coleções próprias

---

## 9. Summary

O modelo de domínio do Elev9 Coach foi normalizado para:

- remover tipos implícitos ou incompletos
- alinhar `Auth` e `Users` com responsabilidades separadas
- sustentar o loop principal de adaptação
- manter compatibilidade com um MVP simples em NestJS + MongoDB
