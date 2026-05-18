# Contract — Build User Health Context

## 1. Overview

Este documento define o contrato interno do componente `BuildUserHealthContextService`.

Ele especifica:

- input
- output
- invariantes
- comportamento de fallback

---

## 2. Service Name

```txt
ai.build-user-health-context
```

---

## 3. Input

```ts
type BuildUserHealthContextInput = {
  authUserId: string;
};
```

Dependências internas:

- `UserProfileRepository`
- `FitnessProfileRepository`
- `TrainingPlanRepository`
- `DailyCheckInRepository`
- `WorkoutLogRepository`
- `NutritionProfileRepository`
- `Clock`

---

## 4. Input Validation

### authUserId

- string
- trimmed
- vazio -> retornar contexto base seguro

---

## 5. Output

```ts
type UserHealthContext = {
  authUserId: string;
  userProfileId?: string;
  userName?: string;
  goal?: 'lose_weight' | 'gain_muscle' | 'maintain';
  activityLevel?: 'low' | 'medium' | 'high';
  weeklyFrequency?: number;
  adherenceScore: number;
  currentStreak: number;
  averageWorkoutDuration: number;
  fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH';
  availableEquipment: string[];
  limitations: Array<{
    type: string;
    description?: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  todayWorkout: {
    dayIndex: number;
    title: string;
    focus: string;
    format: string;
    intensity: 'low' | 'moderate' | 'high';
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
    }>;
  } | null;
  activeTrainingPlanId?: string;
  latestCheckIn?: {
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    createdAt: Date;
  };
  nutritionProfile?: {
    goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
  };
  recentWorkoutLogs: Array<{
    id: string;
    trainingPlanId: string;
    workoutDayIndex: number;
    durationMinutes: number;
    completedExercises: Array<{
      name: string;
      setsDone: number;
      repsDone: number;
    }>;
    feedback?: {
      difficulty: 'easy' | 'medium' | 'hard';
      notes?: string;
    };
    date: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  generatedAt: Date;
};
```

Observações:

- `fatigueLevel` sempre existe
- `latestCheckIn` é opcional
- `nutritionProfile` é opcional
- `todayWorkout` pode ser `null`
- o serviço não expõe `hasTrainingPlan`
- a presença de plano pode ser inferida por `activeTrainingPlanId`

---

## 6. Output Examples

### Complete Context Example

```json
{
  "authUserId": "auth_user_123",
  "userProfileId": "profile_123",
  "userName": "Rodrigo Paiva",
  "goal": "gain_muscle",
  "activityLevel": "medium",
  "weeklyFrequency": 4,
  "adherenceScore": 75,
  "currentStreak": 3,
  "averageWorkoutDuration": 41.67,
  "fatigueLevel": "MODERATE",
  "availableEquipment": [],
  "limitations": [],
  "todayWorkout": {
    "dayIndex": 1,
    "title": "Upper Body Strength",
    "focus": "upper_body_strength",
    "format": "strength",
    "intensity": "high",
    "exercises": []
  },
  "activeTrainingPlanId": "training_123",
  "latestCheckIn": {
    "energyLevel": 4,
    "sleepQuality": 3,
    "muscleSoreness": 2,
    "motivationLevel": 5,
    "createdAt": "2026-05-04T09:00:00.000Z"
  },
  "nutritionProfile": {
    "goal": "muscle_gain",
    "mealsPerDay": 4,
    "dietaryRestrictions": [],
    "allergies": [],
    "dislikedFoods": [],
    "preferredFoods": ["rice", "eggs"]
  },
  "recentWorkoutLogs": [],
  "generatedAt": "2026-05-04T10:00:00.000Z"
}
```

### Base Context Example

```json
{
  "authUserId": "",
  "adherenceScore": 0,
  "currentStreak": 0,
  "averageWorkoutDuration": 0,
  "fatigueLevel": "MODERATE",
  "availableEquipment": [],
  "limitations": [],
  "todayWorkout": null,
  "recentWorkoutLogs": [],
  "generatedAt": "2026-05-04T10:00:00.000Z"
}
```

---

## 7. Fields That Must Never Be Returned Or Persisted Here

- email
- token
- session payload
- password
- raw database internals

---

## 8. Domain Notes

- este é um contrato interno de serviço, não um contrato HTTP
- ele alimenta `GET /ai/context`, coach feedback, debug e replay
- `recoveryTrend` não faz parte do output atual

---

## 9. Summary

O contrato deve garantir contexto determinístico, parcial quando necessário e seguro para reuso interno.
