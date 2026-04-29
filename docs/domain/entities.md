# Entities Reference — Elev9 Coach

## 1. Overview

Este documento é a referência prática das principais entidades do Elev9 Coach no MVP.

Objetivos:

- padronizar nomenclatura entre módulos
- facilitar modelagem no MongoDB com Mongoose
- servir como apoio para implementação de schemas, DTOs e use-cases
- manter consistência com o modelo de domínio e com as specs

O sistema continua orientado a um MVP em `modular monolith`, com persistência em MongoDB e backend em NestJS.

---

## 2. Identity Domain

### 2.1 AuthUser

Representa a identidade de autenticação do usuário.

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

### 2.2 UserProfile

Representa a identidade funcional do usuário dentro do produto.

```ts
type UserProfile = {
  id: string;
  authUserId: string;
  name: string;
  birthDate?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  avatarUrl?: string;
  language: "pt-BR" | "fr-FR" | "en-US";
  timezone: string;
  status: "active" | "inactive" | "deleted";
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 3. Fitness Domain

### 3.1 FitnessProfile

```ts
type FitnessProfile = {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage?: number;
  level: "beginner" | "intermediate" | "advanced";
  goal: "lose_weight" | "gain_muscle" | "maintain" | "improve_health";
  limitations: PhysicalLimitation[];
  availability: TrainingAvailability;
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 3.2 PhysicalLimitation

```ts
type PhysicalLimitation = {
  type: string;
  description?: string;
  severity: "low" | "medium" | "high";
};
```

### 3.3 TrainingAvailability

```ts
type TrainingAvailability = {
  daysPerWeek: number;
  minutesPerSession: number;
  preferredDays?: string[];
};
```

---

## 4. Training Domain

### 4.1 TrainingPlan

```ts
type TrainingPlan = {
  id: string;
  userId: string;
  fitnessProfileId: string;
  status: "active" | "archived" | "replaced";
  weekStartDate: Date;
  weekEndDate: Date;
  goal: string;
  generatedBy: "ai" | "manual";
  sourceContextId?: string;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 4.2 WorkoutDay

```ts
type WorkoutDay = {
  date: Date;
  dayOfWeek: string;
  title: string;
  focus: string;
  estimatedDurationMinutes: number;
  intensity: "low" | "moderate" | "high";
  exercises: Exercise[];
};
```

### 4.3 Exercise

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

### 4.4 WorkoutLog

Registro de execução de treino usado para histórico recente e contexto de IA.

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

---

## 5. Nutrition Domain

### 5.1 NutritionProfile

```ts
type NutritionProfile = {
  id: string;
  userId: string;
  goal: "lose_weight" | "gain_muscle" | "maintain" | "improve_health";
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  mealsPerDay: number;
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.2 MacroTargets

```ts
type MacroTargets = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};
```

### 5.3 NutritionPlan

```ts
type NutritionPlan = {
  id: string;
  userId: string;
  nutritionProfileId: string;
  status: "active" | "archived" | "replaced";
  weekStartDate: Date;
  weekEndDate: Date;
  macroTargets: MacroTargets;
  generatedBy: "ai" | "manual";
  sourceContextId?: string;
  days: NutritionDay[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 5.4 NutritionDay

```ts
type NutritionDay = {
  date: Date;
  dayOfWeek: string;
  meals: Meal[];
};
```

### 5.5 Meal

```ts
type Meal = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description: string;
  foodItems: FoodItem[];
  estimatedMacros?: MacroTargets;
  alternatives?: MealOption[];
};
```

### 5.6 MealOption

Alternativa simples de refeição para substituição no MVP.

```ts
type MealOption = {
  title: string;
  foodItems: FoodItem[];
  estimatedMacros?: MacroTargets;
};
```

### 5.7 FoodItem

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

### 5.8 NutritionLog

Registro simples de aderência alimentar para histórico e contexto de IA.

```ts
type NutritionLog = {
  id: string;
  userId: string;
  date: Date;
  followedPlan: boolean;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  notes?: string;
  createdAt: Date;
};
```

---

## 6. Progress Domain

### 6.1 DailyCheckIn

Entidade central do loop adaptativo do MVP.

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

### 6.2 BodyMetrics

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

---

## 7. AI Domain

### 7.1 UserHealthContext

Objeto consolidado para compor prompts e decisões automatizadas.

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

### 7.2 AIRecommendation

```ts
type AIRecommendation = {
  id: string;
  userId: string;
  agentType: "coach" | "nutrition" | "safety";
  type: "training" | "nutrition" | "recovery" | "motivation" | "plan_adjustment";
  content: string;
  confidence?: number;
  sourceContextId?: string;
  createdAt: Date;
};
```

### 7.3 PlanAdjustment

```ts
type PlanAdjustment = {
  id: string;
  userId: string;
  sourceContextId: string;
  reason: string;
  adjustmentType: "training" | "nutrition" | "both";
  changes: {
    training?: Record<string, unknown>;
    nutrition?: Record<string, unknown>;
  };
  applied: boolean;
  createdAt: Date;
};
```

---

## 8. Relationships

```txt
AuthUser -> UserProfile
UserProfile -> FitnessProfile
UserProfile -> NutritionProfile
UserProfile -> TrainingPlan
UserProfile -> NutritionPlan
UserProfile -> DailyCheckIn
TrainingPlan -> WorkoutDay -> Exercise
NutritionPlan -> NutritionDay -> Meal -> FoodItem
DailyCheckIn + WorkoutLog + NutritionLog -> UserHealthContext
UserHealthContext -> AIRecommendation -> PlanAdjustment
```

---

## 9. MongoDB Collections

Estrutura sugerida para o MVP:

```txt
auth_users
user_profiles
fitness_profiles
nutrition_profiles
training_plans
workout_logs
nutrition_plans
nutrition_logs
daily_checkins
body_metrics
ai_recommendations
plan_adjustments
```

---

## 10. Notes for Implementation

- `AuthUser` e `UserProfile` pertencem a contexts diferentes.
- `register-user` cria apenas `AuthUser`.
- `UserProfile` deve ser criado por `users/create-user-profile`.
- O MVP deve privilegiar modelos simples e históricos explícitos.
- Qualquer dado persistido gerado por IA deve ter contexto de origem rastreável.
