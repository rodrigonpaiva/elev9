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

## Prompt 5 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 55 | `apps/mobile/src/features/recovery/hooks/use-recovery-experience.ts` | CREATE | Orchestrate current/history public API resources | Recovery contracts/client | High |
| 56 | `apps/mobile/src/features/recovery/models/recovery-screen-state-mapper.ts` | CREATE | Pure state composition and safe error mapping | Presentational state | Medium |
| 57 | `apps/mobile/src/features/recovery/screens/recovery-screen-container.tsx` | CREATE | Connect hook, navigation and callbacks | Recovery screen | High |
| 58 | `apps/mobile/src/features/recovery/screens/recovery-screen.tsx` | UPDATE | Support partial history loading/error and retry | Hook composition | Medium |
| 59 | `apps/mobile/src/features/recovery/models/recovery-screen-state.ts` | UPDATE | Represent partial history resource status | UI state model | Medium |
| 60 | `apps/mobile/src/navigation/app-navigator.tsx` | UPDATE | Register typed `Recovery` route and correct legacy title | Container | High |
| 61 | `apps/mobile/src/hooks/use-dashboard.ts` | UPDATE | Load public current Recovery for Dashboard card | Current contract | High |
| 62 | `apps/mobile/src/components/dashboard/recovery-readiness-card.tsx` | UPDATE | Consume backend category/insight and remove thresholds/sourceContext | Dashboard source | High |
| 63 | `apps/mobile/src/screens/dashboard-screen.tsx` | UPDATE | Navigate Recovery from primary card CTA | Route | Medium |
| 64 | `apps/mobile/src/features/recovery/**/*.spec.ts` | UPDATE | Integration mapper and partial failure coverage | Hook composition | Medium |
| 65 | `docs/architecture/release-2.1-epic-a2-mobile-recovery-integration.md` | CREATE | Document integration flow and policies | Implementation | Low |

Prompt 5 did not alter API, contracts, API client, backend, algorithm, analytics, offline persistence, dependencies or lockfiles.

## Prompt 6 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 66 | `apps/api/src/modules/recovery/recovery.module.ts` | UPDATE | Export the canonical current Recovery read-model use case for internal consumers | Recovery read models | Medium |
| 67 | `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts` | UPDATE | Attach the product-safe current Recovery semantics to Health Context | Recovery use case | High |
| 68 | `apps/api/src/modules/ai/application/services/experts/recovery/recovery-expert.types.ts` | UPDATE | Represent canonical availability/freshness/factor semantics in existing Coach analysis | Health Context | Medium |
| 69 | `apps/api/src/modules/ai/application/services/experts/recovery/recovery-expert.service.ts` | UPDATE | Consume canonical Recovery semantics before legacy fallback | Canonical context | High |
| 70 | `apps/api/src/modules/ai/application/services/experts/recovery/recovery-expert.service.spec.ts` | UPDATE | Prove category/factor/privacy parity and no score/raw-check-in recalculation | Coach policy | High |
| 71 | `docs/architecture/release-2.1-epic-a2-deterministic-recovery-coach.md` | CREATE | Document deterministic Coach boundary, safety and compatibility | Implementation | Low |
| 72 | `docs/plans/release-2.1-epic-a2-recovery-intelligence-implementation-plan.md` | UPDATE | Record Prompt 6 decisions and Prompt 7 next step | Implementation | Low |
| 73 | `docs/plans/release-2.1-epic-a2-file-change-map.md` | UPDATE | Record actual Prompt 6 files | Implementation | Low |

Prompt 6 did not alter Recovery calculation, contracts, API client, mobile integration, Dashboard, analytics, offline persistence, dependencies or lockfiles.

## Prompt 7 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 74 | `apps/mobile/src/analytics/product-analytics.ts` | UPDATE | Add typed, allowlisted Recovery action events | Existing analytics boundary | Medium |
| 75 | `apps/mobile/src/analytics/product-analytics.spec.ts` | UPDATE | Verify Recovery event allowlist and privacy rejection | Event catalog | Medium |
| 76 | `apps/mobile/src/screens/dashboard-screen.tsx` | UPDATE | Track explicit Dashboard Recovery CTA intent | Recovery route | Low |
| 77 | `apps/mobile/src/features/recovery/screens/recovery-screen-container.tsx` | UPDATE | Track screen entry, refresh, retry and Check-in handoff | Recovery integration | Medium |
| 78 | `apps/api/src/modules/recovery/application/services/recovery-observability.service.ts` | CREATE | Redacted operational signal adapter over existing logger | Recovery read models | Medium |
| 79 | `apps/api/src/modules/recovery/application/services/recovery-observability.service.spec.ts` | CREATE | Verify low-cardinality signal privacy | Observability adapter | Medium |
| 80 | `apps/api/src/modules/recovery/application/use-cases/get-current-recovery-read-model/get-current-recovery-read-model.use-case.ts` | UPDATE | Record current request outcome, duration and legacy encounter | Read-model endpoint | Medium |
| 81 | `apps/api/src/modules/recovery/application/use-cases/get-recovery-history-read-model/get-recovery-history-read-model.use-case.ts` | UPDATE | Record history outcome and trend data sufficiency | History endpoint | Medium |
| 82 | `apps/api/src/modules/recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case.ts` | UPDATE | Record canonical rebuild attempt/success/failure and redact stale log | Recovery rebuild | High |
| 83 | `apps/api/src/modules/recovery/application/use-cases/get-today-recovery/get-today-recovery.use-case.ts` | UPDATE | Remove profile/date identifiers from stale Recovery log | Privacy boundary | Medium |
| 84 | `apps/api/src/modules/recovery/recovery.module.ts` | UPDATE | Register observability adapter | Recovery module | Low |
| 85 | `docs/architecture/release-2.1-epic-a2-recovery-analytics-observability.md` | CREATE | Document event catalog, signals, privacy and retention | Implementation | Low |
| 86 | `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts` | UPDATE | Emit a redacted Coach Recovery context outcome through the reused Recovery observability adapter | Prompt 6 canonical context | Medium |

Prompt 7 did not alter contracts, API client, Recovery algorithm, weights, thresholds, UI layout, offline persistence, dependencies or lockfiles.

## Prompt 8 actual changes

| Order | File or Directory | Action | Reason | Depends On | Risk |
|---:|---|---|---|---|---|
| 87 | `apps/mobile/src/storage/session-owner-storage.ts` | CREATE | Opaque per-session cache namespace with best-effort storage | Auth lifecycle | Medium |
| 88 | `apps/mobile/src/features/recovery/cache/recovery-cache-schema.ts` | CREATE | Versioned allowlisted cache record, runtime validation and age policy | Public Recovery contracts | High |
| 89 | `apps/mobile/src/features/recovery/cache/recovery-cache.ts` | CREATE | AsyncStorage adapter with independent current/history writes and cleanup | Cache schema | High |
| 90 | `apps/mobile/src/features/recovery/hooks/use-recovery-experience.ts` | UPDATE | Network-first cache fallback, source metadata and session isolation | Cache adapter | High |
| 91 | `apps/mobile/src/features/recovery/models/recovery-screen-state-mapper.ts` | UPDATE | Carry cache source metadata and classify recoverable transport errors | Hook state | Medium |
| 92 | `apps/mobile/src/features/recovery/models/recovery-screen-state.ts` | UPDATE | Represent cache source metadata on available UI state | Presentation | Low |
| 93 | `apps/mobile/src/features/recovery/components/recovery-offline-notice.tsx` | CREATE | Explicit offline/last-saved presentation with accessible retry | Cache state | Medium |
| 94 | `apps/mobile/src/features/recovery/screens/recovery-screen.tsx` | UPDATE | Render offline notice without changing canonical freshness | Offline state | Medium |
| 95 | `apps/mobile/src/auth/auth-provider.tsx` | UPDATE | Create/ensure session namespace and clear Recovery cache on logout | Session lifecycle | High |
| 96 | `apps/mobile/src/features/recovery/cache/recovery-cache-schema.spec.ts` | CREATE | Schema, privacy, version and age tests | Cache schema | Medium |
| 97 | `apps/mobile/src/features/recovery/cache/recovery-cache.spec.ts` | CREATE | Storage lifecycle, partial write, corruption and failure tests | Cache adapter | Medium |
| 98 | `docs/architecture/release-2.1-epic-a2-offline-recovery-cache.md` | CREATE | Offline cache architecture, privacy and operational policy | Implementation | Low |

Prompt 8 did not alter backend, shared contracts, API client, Recovery algorithm, Coach, Training, Product Analytics taxonomy, dependencies or lockfiles.
