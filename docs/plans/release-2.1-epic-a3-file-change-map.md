# Release 2.1 — Epic A3 file change map

## Modified

| File                                                                                                       | Classification | Reason                                                                         | Layer                       | Impact / risk                                                   | Tests                              |
| ---------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| `packages/types/src/nutrition/index.ts`                                                                    | modified       | Add canonical availability, freshness, macro and meal progress contract        | shared types                | Public additive JSON contract; low                              | types build/lint, API client build |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.output.ts`   | modified       | Define backend canonical read output                                           | application                 | Centralizes meaning; medium                                     | API unit tests                     |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case.ts` | modified       | Compute bounded progress, deduplicate logs, freshness and UTC source timestamp | application/domain boundary | Changes only previously duplicated semantic derivations; medium | API unit tests                     |
| `apps/api/src/modules/nutrition/presentation/http/dto/get-today-nutrition.response.dto.ts`                 | modified       | Transport canonical fields without persistence internals                       | presentation                | Additive response shape; low                                    | controller/contract tests          |
| `apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts`                                 | modified       | Map canonical fields at public boundary                                        | presentation                | No endpoint change; low                                         | controller tests                   |
| `apps/mobile/src/components/dashboard/todays-nutrition-card.tsx`                                           | modified       | Consume backend adherence/focus/meal progress                                  | mobile                      | Removes critical local semantic calculations; medium            | mobile tests/build                 |
| `apps/mobile/src/screens/nutrition-overview-screen.tsx`                                                    | modified       | Consume backend meal progress/adherence status                                 | mobile                      | Preserves UI; low                                               | mobile tests/build                 |
| `apps/mobile/src/screens/dashboard-screen.tsx`                                                             | modified       | Map canonical Nutrition actions to existing routes                             | mobile presentation         | Removes Training-derived setup navigation; low                  | mobile build/full tests            |
| `apps/mobile/src/components/dashboard/weekly-progress-card.tsx`                                            | modified       | Remove independent Nutrition adherence/trend/focus calculations                | mobile presentation         | Prevents competing Nutrition semantics; medium                  | mobile build/full tests            |
| `apps/mobile/src/components/dashboard/todays-nutrition-card-model.ts`                                      | created        | Pure presentation mapping for canonical Dashboard fields                       | mobile presentation         | Keeps formatting separate from JSX; low                         | targeted Mobile tests              |
| `apps/api/src/modules/nutrition/application/services/nutrition-deterministic-engine.service.ts`            | created        | Pure deterministic Nutrition policy engine                                     | application                 | Centralizes semantic rules; medium                              | engine unit tests                  |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.output.ts`   | modified       | Expose canonical engine output                                                 | application                 | Additive contract; medium                                       | API build/tests                    |
| `apps/api/src/modules/nutrition/presentation/http/dto/get-today-nutrition.response.dto.ts`                 | modified       | Transport calorie/macro/focus/insight/action fields                            | presentation                | Additive JSON response; low                                     | controller tests                   |
| `apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts`                                 | modified       | Map engine output at public boundary                                           | presentation                | No route change; low                                            | controller tests                   |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case.ts` | modified       | Delegate meaning to pure engine                                                | application                 | Removes duplicate calculation; medium                           | use-case tests                     |
| `apps/mobile/src/components/dashboard/todays-nutrition-card.tsx`                                           | modified       | Consume canonical adherence, pending, focus                                    | mobile                      | Removes remaining local semantics; medium                       | mobile build/tests                 |
| `apps/mobile/src/screens/nutrition-overview-screen.tsx`                                                    | modified       | Consume canonical insight and adherence                                        | mobile                      | Removes local recommendation/focus derivation; medium           | mobile build/tests                 |

## Created

- `docs/architecture/release-2.1-epic-a3-nutrition-domain-and-canonical-model.md` — architecture audit and decisions.
- `docs/architecture/release-2.1-epic-a3-deterministic-nutrition-engine.md` — deterministic engine rules and pipeline.
- `docs/plans/release-2.1-epic-a3-nutrition-intelligence-implementation-plan.md` — nine-prompt plan, only Prompt 1 completed.
- `docs/plans/release-2.1-epic-a3-file-change-map.md` — this map.
- `apps/mobile/src/components/dashboard/todays-nutrition-card.spec.ts` — canonical presentation model tests.
- `docs/product/release-2.1-epic-a3-dashboard-nutrition-experience.md` — Dashboard product and state documentation.

## Inspected only / intentionally unchanged

`NutritionModule`, repositories, Mongoose schemas, profile/plan/log/recommendation use cases, API client, Dashboard hook, Coach Expert, Health Context, Nutrition screens, plan/history/recommendation screens, existing Nutrition specs, and existing A1/A2 documentation were audited and left unchanged unless listed above. No Training, Recovery, AI flags, lockfile, `.vscode/settings.json`, or persistence collection was changed.

No unrelated working-tree changes were present when Prompt 2 started. Prompt 2 did not modify files outside the Nutrition engine, its consumers, tests, and the required documentation.

## Deferred

Health Context and Nutrition Expert migration, normal-state HTTP compatibility, user-local timezone/DST, hydration, offline cache, analytics, history, broad Dashboard redesign, dedicated renderer/accessibility test infrastructure, and cross-module integration convergence are deferred to later A3 prompts.
