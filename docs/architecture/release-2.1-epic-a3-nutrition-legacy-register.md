# Release 2.1 — Epic A3 Nutrition legacy register

| Item | Type | Consumers | Status | Replacement | Removal condition | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `TodayNutrition` | contract | External compatibility only | compatibility_only | `NutritionReadModel` | External clients migrate; no internal consumers | medium |
| `UserHealthContext.nutritionProfile` | context field | No active consumer | removed | `CoachNutritionContext` | Completed in Prompt 8B.2/8B.3 | low |
| Coach raw `nutritionPlan`/`nutritionLogs` context | loader/contract | No active consumer | removed | `CoachNutritionContext` | Completed in Prompt 8B.2/8B.3 | low |
| `BuildUserHealthContextService` Nutrition profile repository access | repository access | Health Context | removed | Nutrition application read boundary | Completed in Prompt 8B | low |
| `CoachChatContextLoaderService` raw log lookup | loader/repository access | Coach chat | removed | `NUTRITION_COACH_CONTEXT_PORT` | Completed in Prompt 8B | low |
| `CoachIntelligenceSourceAdaptersService` raw log lookup | loader/repository access | Coach intelligence | removed | `NUTRITION_COACH_CONTEXT_PORT` | Completed in Prompt 8B | low |
| Training Nutrition repositories | repository access | Adaptive training | removed | `NUTRITION_TRAINING_SIGNALS_PORT` | Completed in Prompt 8B | low |
| Goals Nutrition repositories | repository access | Goal progress snapshot | removed | `NUTRITION_GOAL_SIGNALS_PORT` | Completed in Prompt 8B | low |
| Notification Nutrition adherence inputs | calculator/contract | No raw runtime consumer | removed | `NUTRITION_NOTIFICATION_SIGNALS_PORT` | Completed in Prompt 8B/8B.3 | low |
| Mobile history legacy timeline | screen | Nutrition History | removed | History page/day/trends contracts | Completed in Prompt 7 | low |
| History persistent cache | cache | Mobile | deferred | Scoped versioned cache if justified | Product/performance decision | low |
| Legacy Nutrition analytics events | event | Mobile analytics | compatibility_only | Prompt 5 allowlist | Event consumers and provider audit complete | medium |

No item in this register is a second semantic owner. Compatibility-only items are isolated from the internal runtime and are not approved for new consumers.

## Final cleanup status

| Item | Type | Previous status | Final status | Replacement / condition |
| --- | --- | --- | --- | --- |
| Raw Coach context fields (`nutritionProfile`, `nutritionPlan`, `nutritionLogs`) | contract/runtime | compatibility_only | removed | `CoachNutritionContext` |
| Nutrition Expert raw helpers/builders | helper/runtime | deferred | removed | Canonical context-only Expert |
| Recovery/Dashboard Nutrition reinterpretation | calculator/runtime | active | removed | Nutrition-owned read model/focus |
| External Nutrition repository access | repository access | removed | removed | Application ports |
| Internal `TodayNutrition` consumers | contract | deprecated | removed | `NutritionReadModel` |
| Public `TodayNutrition` alias | contract | deprecated | compatibility_only | Remove after external clients migrate |
| Historical persisted feedback fields | persistence compatibility | compatibility_only | deferred | Existing historical documents may contain legacy fields; no new writes/read projections expose them |

P1 active runtime legacy is zero. At the time of the Prompt 8B.2 checkpoint, the API suite still contained stale fixtures; Prompt 8B.3 migrated them. E2E remains environment-blocked by MongoMemoryServer `listen EPERM: operation not permitted 0.0.0.0`.

## Final Prompt 8B.3 status

| Item | Previous status | Final status | Replacement / condition |
| --- | --- | --- | --- |
| Legacy API fixtures and assertions | active | removed | Canonical read-model, context and signal fixtures |
| Legacy Coach feedback Nutrition tests | active | removed | Coach feedback tests cover only owned training/recovery signals |
| Coach raw context fields in tests | compatibility_only | removed | `CoachNutritionContext` or explicit absence |
| Recovery raw Nutrition fixtures | compatibility_only | removed | Recovery-only canonical fixtures |
| Internal `TodayNutrition` usage | deprecated | removed | `NutritionReadModel` |
| Public `TodayNutrition` alias | deprecated | compatibility_only | Remove after external clients migrate |
| Historical persisted feedback fields | compatibility_only | deferred | Existing documents only; no new raw writes |

P1 runtime legacy: zero. P1 legacy test fixtures: zero. E2E remains `ENVIRONMENT_BLOCKED` only because this environment denies MongoMemoryServer port binding.
