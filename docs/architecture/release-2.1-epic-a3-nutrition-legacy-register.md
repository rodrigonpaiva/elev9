# Release 2.1 — Epic A3 Nutrition legacy register

| Item | Type | Consumers | Status | Replacement | Removal condition | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `TodayNutrition` | contract | Mobile, Coach internal types | deprecated | `NutritionReadModel` | All internal annotations and persisted debug contracts migrated | medium |
| `UserHealthContext.nutritionProfile` | context field | Coach feedback, memory, legacy prompts | compatibility_only | `CoachNutritionContext` plus approved minimal profile projection | Legacy Coach consumers removed | high |
| Coach raw `nutritionPlan`/`nutritionLogs` context | loader/contract | Chat, intelligence, expert fallback | compatibility_only | `CoachNutritionContext` | Canonical branch is sole runtime path | high |
| `BuildUserHealthContextService` Nutrition profile repository access | repository access | Health Context | blocked | Nutrition application profile/read boundary | Health context tests and debug contracts migrated | high |
| `CoachChatContextLoaderService` raw log lookup | loader/repository access | Coach chat | compatibility_only | Today/history application use cases | Chat context contract no longer carries raw logs | high |
| `CoachIntelligenceSourceAdaptersService` raw log lookup | loader/repository access | Coach intelligence | compatibility_only | `CoachNutritionContext` | Source adapter consumers migrated | high |
| Training Nutrition repositories | repository access | Adaptive training | blocked | Approved cross-domain application projection | Training calculation contract migrated | high |
| Goals Nutrition repositories | repository access | Goal progress snapshot | blocked | Approved Nutrition trend/progress projection | Goal snapshot contract migrated | high |
| Notification Nutrition adherence inputs | calculator/contract | Notifications | deferred | Canonical event/application projection | Product notification contract reviewed | medium |
| Mobile history legacy timeline | screen | Nutrition History | removed | History page/day/trends contracts | Completed in Prompt 7 | low |
| History persistent cache | cache | Mobile | deferred | Scoped versioned cache if justified | Product/performance decision | low |
| Legacy Nutrition analytics events | event | Mobile analytics | compatibility_only | Prompt 5 allowlist | Event consumers and provider audit complete | medium |

No item in this register is a second semantic owner. `blocked` means removal requires a separate compatible contract migration, not that the legacy path is approved for new consumers.
