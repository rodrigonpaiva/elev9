# Release 2.1 — Epic A3 file change map

## Modified

| File | Classification | Reason | Layer | Impact / risk | Tests |
|---|---|---|---|---|---|
| `packages/types/src/nutrition/index.ts` | modified | Add canonical availability, freshness, macro and meal progress contract | shared types | Public additive JSON contract; low | types build/lint, API client build |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.output.ts` | modified | Define backend canonical read output | application | Centralizes meaning; medium | API unit tests |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case.ts` | modified | Compute bounded progress, deduplicate logs, freshness and UTC source timestamp | application/domain boundary | Changes only previously duplicated semantic derivations; medium | API unit tests |
| `apps/api/src/modules/nutrition/presentation/http/dto/get-today-nutrition.response.dto.ts` | modified | Transport canonical fields without persistence internals | presentation | Additive response shape; low | controller/contract tests |
| `apps/api/src/modules/nutrition/presentation/http/nutrition.controller.ts` | modified | Map canonical fields at public boundary | presentation | No endpoint change; low | controller tests |
| `apps/mobile/src/components/dashboard/todays-nutrition-card.tsx` | modified | Consume backend adherence/focus/meal progress | mobile | Removes critical local semantic calculations; medium | mobile tests/build |
| `apps/mobile/src/screens/nutrition-overview-screen.tsx` | modified | Consume backend meal progress/adherence status | mobile | Preserves UI; low | mobile tests/build |

## Created

- `docs/architecture/release-2.1-epic-a3-nutrition-domain-and-canonical-model.md` — architecture audit and decisions.
- `docs/plans/release-2.1-epic-a3-nutrition-intelligence-implementation-plan.md` — nine-prompt plan, only Prompt 1 completed.
- `docs/plans/release-2.1-epic-a3-file-change-map.md` — this map.

## Inspected only / intentionally unchanged

`NutritionModule`, repositories, Mongoose schemas, profile/plan/log/recommendation use cases, API client, Dashboard use cases, Coach Expert, Health Context, Nutrition screens, plan/history/recommendation screens, existing Nutrition specs, and existing A1/A2 documentation were audited and left unchanged unless listed above. No Training, Recovery, AI flags, lockfile, `.vscode/settings.json`, or persistence collection was changed.

The pre-existing worktree changes `app.json`, `ADB,`, and `android/` were observed at audit start and intentionally left untouched; they are outside Prompt 1.

## Deferred

Health Context and Nutrition Expert migration, normal-state HTTP compatibility, user-local timezone/DST, hydration, offline cache, analytics, history, broad Dashboard redesign, and cross-module integration convergence are deferred to later A3 prompts.
