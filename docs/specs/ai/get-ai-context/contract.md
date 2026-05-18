# Contract — Get AI Context

## 1. Overview

Este documento define o contrato do use-case `get-ai-context`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
ai.get-ai-context
```

---

## 3. Input

```ts
type GetAiContextInput = {
  authUserId: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão validada
- o endpoint não aceita body funcional

---

## 4. Input Example

```http
GET /ai/context
Authorization: Bearer <access-token>
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### request body

- nenhum campo funcional é aceito

---

## 6. Output

```ts
type GetAiContextOutput = {
  userId: string;
  userProfileId?: string;
  userName?: string;
  goal?: string;
  activityLevel?: string;
  weeklyFrequency?: number;
  adherenceScore: number;
  currentStreak: number;
  averageWorkoutDuration: number;
  fatigueLevel: "LOW" | "MODERATE" | "HIGH";
  availableEquipment: string[];
  limitations: Array<{
    type: string;
    description?: string;
    severity: "low" | "medium" | "high";
  }>;
  todayWorkout: {
    dayIndex: number;
    title: string;
    focus: string;
    format: string;
    intensity: "low" | "moderate" | "high";
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
    createdAt: string;
  };
  nutritionProfile?: {
    goal: "fat_loss" | "maintenance" | "muscle_gain";
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
      difficulty: "easy" | "medium" | "hard";
      notes?: string;
    };
    date: string;
    createdAt: string;
    updatedAt: string;
  }>;
  generatedAt: string;
};
```

Observações:

- `fatigueLevel` sempre existe
- `latestCheckIn` é opcional
- `nutritionProfile` é opcional
- `todayWorkout` pode ser `null`
- `recentWorkoutLogs` pode ser vazio
- `recoveryTrend` não faz parte do payload atual

---

## 7. Success Response Example

```json
{
  "userId": "auth_user_123",
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
  "todayWorkout": null,
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

### Partial Context Example

```json
{
  "userId": "auth_user_123",
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

## 8. Fields That Must Never Be Returned

- email
- token
- session data
- password
- raw Mongo internals

---

## 9. Error Response Shape

`GET /ai/context` não define hoje um conjunto específico de erros de domínio no controller. A autenticação é tratada pelo guard e o serviço devolve fallback seguro para ausência de dados opcionais.

---

## 10. Possible Error Codes

```txt
AUTH_INVALID_SESSION
```

---

## 11. Transport

```txt
GET /ai/context
```

---

## 12. HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
```

---

## 13. Domain Notes

- o endpoint usa `BuildUserHealthContextService`
- o payload já inclui training, progress, recovery e nutrition quando disponíveis
- `recoveryTrend` existe em outros fluxos internos, mas não é exposto aqui hoje

---

## 14. Summary

O contrato deve garantir um read model autenticado, seguro, parcial quando necessário e consistente com o shape atual do `UserHealthContext`.
