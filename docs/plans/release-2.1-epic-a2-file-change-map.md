# Epic A2 Recovery Intelligence File Change Map

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 1 | `apps/api/src/modules/recovery/application/use-cases/get-today-recovery/` | UPDATE | Consolidate current-day availability and freshness semantics | Read-model decision | High |
| 2 | `apps/api/src/modules/recovery/application/use-cases/get-current-recovery/` | UPDATE | Reuse canonical current selection | Read-model decision | Medium |
| 3 | `apps/api/src/modules/recovery/application/use-cases/get-recovery-history/` | UPDATE | Bound history and support product trend shape | Legacy strategy | Medium |
| 4 | `apps/api/src/modules/recovery/application/services/recovery-freshness.ts` | VERIFY_ONLY | Preserve backend freshness ownership | Current tests | Medium |
| 5 | `apps/api/src/modules/recovery/application/services/recovery-score-calculator.service.ts` | NO_CHANGE_EXPECTED | Algorithm is outside A2 audit scope | None | High if changed |
| 6 | `apps/api/src/modules/recovery/infrastructure/mongoose/recovery-snapshot.schema.ts` | VERIFY_ONLY | Confirm indexes and legacy compatibility | Data audit | High |
| 7 | `apps/api/src/modules/recovery/infrastructure/mongoose/mongoose-recovery-snapshot.repository.ts` | UPDATE | Add only required bounded/history queries | Read-model design | Medium |
| 8 | `apps/api/src/modules/recovery/presentation/http/recovery.controller.ts` | UPDATE | Expose safe product read models | Backend DTOs | High |
| 9 | `apps/api/src/modules/recovery/presentation/http/` | CREATE | Add confirmed safe DTO/mapper adapters if current convention requires | Controller design | High |
| 10 | `apps/api/src/shared/mappers/recovery-read-model.mapper.ts` | VERIFY_ONLY | Reuse existing safe mapping patterns | Contract alignment | Medium |
| 11 | `packages/types/src/recovery/index.ts` | UPDATE | Add canonical public Recovery product contracts | Backend response shape | High |
| 12 | `packages/api-client/src/recovery-api.ts` | UPDATE | Expose confirmed current/history/breakdown/trend methods | Shared contracts | Medium |
| 13 | `apps/mobile/src/components/dashboard/recovery-readiness-card.tsx` | UPDATE | Render server-derived category/freshness and remove local thresholds | New contract | High |
| 14 | `apps/mobile/src/hooks/use-dashboard.ts` | UPDATE | Make Recovery request ownership explicit and avoid duplication | Dashboard data strategy | Medium |
| 15 | `apps/mobile/src/navigation/app-navigator.tsx` | UPDATE | Register dedicated Recovery route; correct misleading history title | Mobile feature | Medium |
| 16 | `apps/mobile/src/screens/daily-check-in-history-screen.tsx` | UPDATE | Preserve it as check-in history, not Recovery history | Navigation/product decision | Medium |
| 17 | `apps/mobile/src/features/recovery/` | CREATE | Dedicated overview/breakdown/history feature if current structure confirms | Contracts/API client | High |
| 18 | `apps/mobile/src/screens/` | VERIFY_ONLY | Confirm screen organization before creating Recovery screen | Mobile architecture | Low |
| 19 | `apps/mobile/src/features/daily-check-in/offline/` | NO_CHANGE_EXPECTED | A2 read cache must remain separate from write queue | Offline decision | Medium |
| 20 | `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts` | VERIFY_ONLY | Preserve canonical Health Context and classify fallback | Compatibility plan | High |
| 21 | `apps/api/src/modules/training/application/use-cases/build-adaptive-training-recommendation/` | VERIFY_ONLY | Confirm Training source compatibility; no adaptive expansion | A2 scope | Medium |
| 22 | `apps/api/src/modules/nutrition/` | NO_CHANGE_EXPECTED | Nutrition is future/noncanonical for A2 | Product scope | Medium |
| 23 | `apps/mobile/src/analytics/product-analytics.ts` | VERIFY_ONLY | Reuse typed/noop analytics boundary | Taxonomy | Low |
| 24 | `apps/api/src/modules/recovery/**/*.spec.ts` | UPDATE | Add safe read model, legacy and freshness coverage | Backend changes | High |
| 25 | `apps/mobile/src/features/recovery/**/*.spec.ts` | CREATE | Add UI, accessibility and state coverage | Recovery feature | Medium |
| 26 | `apps/api/test/e2e/` | UPDATE | Add Recovery-focused chain only after API shape stabilizes | Test environment | High |
| 27 | `docs/audits/release-2.1-epic-a2-recovery-intelligence-audit.md` | NO_CHANGE_EXPECTED | This audit is the baseline | None | Low |
| 28 | `docs/plans/release-2.1-epic-a2-recovery-intelligence-implementation-plan.md` | NO_CHANGE_EXPECTED | Official A2 implementation plan | None | Low |
| 29 | `docs/plans/release-2.1-epic-a2-file-change-map.md` | NO_CHANGE_EXPECTED | A2 implementation map | None | Low |

Actions are intentionally prospective. This Prompt 1 created no production code, tests, configuration, dependency or lockfile changes.

## Prompt 2 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 30 | `apps/api/src/modules/recovery/application/read-models/recovery-read-model.types.ts` | CREATE | Internal public read-model types | Backend response design | Medium |
| 31 | `apps/api/src/modules/recovery/application/services/recovery-category.policy.ts` | CREATE | Canonical public category mapping | Existing intensity semantics | High |
| 32 | `apps/api/src/modules/recovery/application/services/recovery-factor-breakdown.policy.ts` | CREATE | Safe deterministic factor presentation | Source context boundary | High |
| 33 | `apps/api/src/modules/recovery/application/services/recovery-insight.policy.ts` | CREATE | Deterministic non-clinical insight | Availability/category model | Medium |
| 34 | `apps/api/src/modules/recovery/application/services/recovery-trend.policy.ts` | CREATE | Bounded history trend | History semantics | Medium |
| 35 | `apps/api/src/modules/recovery/application/services/recovery-read-model.mapper.ts` | CREATE | Hide entity internals from public response | Policies | High |
| 36 | `apps/api/src/modules/recovery/application/use-cases/get-current-recovery-read-model/` | CREATE | Public current use case | Existing current use case | High |
| 37 | `apps/api/src/modules/recovery/application/use-cases/get-recovery-history-read-model/` | CREATE | Public history/trend use case | Existing history use case | Medium |
| 38 | `apps/api/src/modules/recovery/presentation/http/dto/get-recovery-experience-*.ts` | CREATE | Safe endpoint DTOs/query validation | Read models | High |
| 39 | `apps/api/src/modules/recovery/presentation/http/recovery.controller.ts` | UPDATE | Add compatibility-preserving public routes | New use cases | High |
| 40 | `apps/api/src/modules/recovery/recovery.module.ts` | UPDATE | Register policies, mapper and use cases | New application services | Medium |
| 41 | `apps/api/src/modules/recovery/application/services/recovery-read-model.mapper.spec.ts` | CREATE | Privacy and mapping tests | Mapper | High |
| 42 | `apps/api/src/modules/recovery/application/services/recovery-trend.policy.spec.ts` | CREATE | Trend boundaries and legacy tests | Trend policy | Medium |
| 43 | `apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts` | UPDATE | Validate A1→safe Recovery read model | Mongo E2E environment | High |
| 44 | `docs/architecture/release-2.1-epic-a2-recovery-read-models.md` | CREATE | Document public boundary and decisions | Implementation | Low |

## Prompt 3 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 45 | `packages/types/src/recovery/index.ts` | UPDATE | Add public Recovery Experience contracts | Backend read models | High |
| 46 | `packages/types/src/recovery/recovery-experience-contract.spec.ts` | CREATE | Compile-time shape and privacy checks | Public contracts | Medium |
| 47 | `packages/api-client/src/recovery-api.ts` | UPDATE | Add typed current/history Experience methods | Shared contracts | Medium |
| 48 | `packages/api-client/src/recovery-api.spec.ts` | CREATE | Route, query, error and compatibility tests | API client methods | Medium |
| 49 | `docs/architecture/release-2.1-epic-a2-recovery-contracts-and-client.md` | CREATE | Document contract boundary and client behavior | Implementation | Low |

Prompt 3 did not alter backend production code, mobile production code, Dashboard, navigation, analytics, offline storage, lockfiles or dependencies.

## Prompt 4 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 50 | `apps/mobile/src/features/recovery/` | CREATE | Isolated state-driven Recovery experience, components, helpers and fixtures | Shared contracts | Medium |
| 51 | `apps/mobile/src/features/recovery/screens/recovery-screen.tsx` | CREATE | State-injected Recovery screen; route integration remains for Prompt 5 | Shared contracts | Medium |
| 52 | `apps/mobile/src/features/recovery/**/*.spec.ts` | CREATE | Presentation, state, date and accessibility-text coverage | Feature models/helpers | Medium |
| 53 | `docs/product/release-2.1-epic-a2-mobile-recovery-experience.md` | CREATE | Product/UI architecture and state documentation | Mobile feature | Low |
| 54 | `docs/plans/release-2.1-epic-a2-recovery-intelligence-implementation-plan.md` | UPDATE | Prompt status, decisions and remaining gaps | Feature implementation | Low |

Prompt 4 did not alter API, contracts, API client, Dashboard, navigation, analytics, offline persistence, backend policies, algorithms, dependencies or lockfiles.
