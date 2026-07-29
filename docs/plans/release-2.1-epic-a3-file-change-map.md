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

## Prompt 4 — Coach Nutrition Intelligence

| File | Status | Layer | Reason / change | Impact / risk | Tests |
| --- | --- | --- | --- | --- | --- |
| `apps/api/src/modules/ai/application/services/context-builder/coach-nutrition-context.types.ts` | created | application boundary | Pure, privacy-safe projection from `NutritionReadModel` to Coach context | New internal boundary; low | adapter unit tests, API build |
| `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts` | modified | Health Context | Loads the canonical Nutrition use case and preserves availability/freshness without failing other health domains | Adds one application read; medium | Health Context tests, API build |
| `apps/api/src/modules/ai/application/services/experts/nutrition/nutrition-expert.service.ts` | modified | Coach Expert | Uses canonical fields for deterministic responses; removes local canonical recalculation on the new path | Legacy path remains for compatibility; medium | Nutrition Expert tests |
| `apps/api/src/modules/ai/application/services/experts/nutrition/nutrition-expert.types.ts` | modified | Coach contract | Adds canonical explainability metadata and response internals | Internal additive type; low | API build |
| `apps/api/src/modules/ai/application/services/agent/agent.types.ts` | modified | Agent context | Carries canonical Nutrition context while retaining deprecated raw fields | Compatibility surface; low | API build |
| `apps/api/src/modules/ai/application/services/agent/agent-context-orchestrator.service.ts` | modified | Agent Runtime | Propagates canonical context into runtime context | No routing behavior change; low | API build |
| `apps/api/src/modules/ai/application/services/experts/coach-expert.types.ts` | modified | Expert contract | Makes canonical projection available to experts | No public API change; low | API build |
| `apps/api/src/modules/ai/application/use-cases/create-coach-chat/create-coach-chat.types.ts` | modified | Coach context | Preserves canonical projection in chat-loaded context | Additive internal field; low | API build |
| `apps/api/src/modules/ai/application/services/chat/coach-chat-context-loader.service.ts` | modified | Chat loader | Propagates Health Context canonical projection | Raw loader compatibility remains; medium | API build |
| `apps/api/src/modules/ai/application/services/coach-intelligence/coach-intelligence.source-adapters.service.ts` | modified | Coach source adapter | Propagates canonical projection into expert context | Raw source queries remain pending migration; medium | API build |
| `apps/api/src/modules/ai/application/services/context-builder/coach-nutrition-context.types.spec.ts` | created | tests | Validates projection, nullability and persistence-field exclusion | Low | targeted API tests |
| `apps/api/src/modules/ai/application/services/experts/nutrition/nutrition-expert.service.spec.ts` | modified | tests | Verifies canonical remaining values and no recalc | Low | targeted API tests |
| `docs/architecture/release-2.1-epic-a3-coach-nutrition-intelligence.md` | created | documentation | Records boundary, deterministic response and remaining migration conditions | None | documentation review |

Files intentionally unchanged or deferred for Prompt 4: raw Nutrition plan/log/recommendation loading in the legacy Coach loaders, other experts that still consume `nutritionProfile`, mobile Coach navigation, LLM flags, Recovery, Training, Notifications, persistence schemas, lockfile and `.vscode/settings.json`.

## Prompt 5 — Nutrition Analytics & Observability

| File | Status | Layer | Reason / change | Impact / risk | Tests | Privacy / retention |
| --- | --- | --- | --- | --- | --- | --- |
| `apps/api/src/modules/nutrition/application/services/nutrition-observability.service.ts` | created | backend observability | Allowlisted structured events, bounded duration buckets and low-cardinality counters | Safe operational visibility; low | service tests, API build | No payload or identifiers |
| `apps/api/src/modules/nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case.ts` | modified | Nutrition application | Records safe success/failure signals around canonical read | Fail-open instrumentation; low | use-case tests, API build | Safe error codes only |
| `apps/api/src/modules/nutrition/application/services/nutrition-observability.service.spec.ts` | created | tests | Allowlist, privacy, buckets and counter tests | Low | targeted API tests | Synthetic fixtures only |
| `apps/api/src/modules/nutrition/nutrition.module.ts` | modified | configuration | Registers and exports observability service | No new dependency | API build |
| `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts` | modified | Health Context | Records safe canonical projection outcome | Failure-isolated signal | API tests | No context payload |
| `apps/mobile/src/analytics/product-analytics.ts` | modified | mobile analytics | Adds typed Nutrition event allowlist | Noop default preserved | analytics tests |
| `apps/mobile/src/analytics/product-analytics.spec.ts` | modified | tests | Nutrition event and forbidden-field coverage | Low | targeted Mobile tests |
| `apps/mobile/src/screens/dashboard-screen.tsx` | modified | Dashboard analytics | Tracks controlled exposure, load result, retry and action intent | No semantic change; low | Mobile build/tests |
| `docs/architecture/release-2.1-epic-a3-nutrition-analytics-and-observability.md` | created | documentation | Architecture, inventory, privacy and gaps | None | Documentation review |
| `docs/runbooks/release-2.1-epic-a3-nutrition-observability-runbook.md` | created | operations | Safe diagnosis, rollback and privacy incident flow | None | Documentation review |

Dashboards, alert rules, OpenTelemetry exporter, Sentry integration, retention enforcement and external analytics provider are `deferred`: no corresponding versioned infrastructure exists. No preexisting working-tree changes were present before Prompt 5.
