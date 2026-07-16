# ADR-0001 — Architecture Baseline Certification

## Status

Accepted

## Context

An architecture audit was performed to establish a factual, code-backed understanding of the repository before the next Epic begins. The audit exists to remove ambiguity between documentation, implementation, and operational reality.

Without a formal baseline, future work would be forced to rely on memory, partial documentation, or local assumptions. That creates predictable failure modes:

- architecture drift between backend, mobile, shared contracts, and documentation;
- accidental boundary violations across modules and domains;
- duplicate DTOs, duplicated UI patterns, and duplicated business logic;
- unreviewed expansion of internal debug or replay surfaces;
- inconsistent treatment of AI safety, feature flags, observability, and fallback behavior;
- future Epics making changes that are locally correct but globally incompatible.

This ADR exists to make the audited architecture the official project baseline. It formalizes the current state of the system exactly as implemented and documented in [docs/architecture/repository-technical-audit.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/repository-technical-audit.md).

## Decision

The current architecture is officially accepted as the architectural baseline of the project.

All future work MUST preserve this architecture unless superseded by a newer ADR.

Future Epics MUST respect the following architectural principles:

- Modular Monolith
- Domain-Driven Design
- Clean Architecture
- Hexagonal Architecture
- Bounded Contexts
- Shared Contracts
- Mobile First
- AI Safety
- Feature Flags
- Observability
- Testability
- Documentation-first engineering

These principles are not aspirational here. They describe the verified current state of the repository and therefore become the reference frame for all future changes.

## Official Architectural Baseline

### Workspace

The workspace is an Nx monorepo with the following verified structure:

- `apps/` contains the deployable applications
- `packages/` contains the shared libraries
- `docs/` contains product, architecture, ADR, and specification documentation
- `scripts/` contains operational and validation scripts

The repository does not contain `libs/` or `tools/` directories. The Nx workspace is configured to use `apps` and `packages` as its workspace roots.

### Applications

#### API

`apps/api` is the backend application. It is a NestJS modular monolith with:

- presentation controllers;
- application services and use cases;
- domain entities and repositories;
- infrastructure implementations using MongoDB/Mongoose;
- AI runtime, expert routing, composition, persona, explainability, and observability;
- internal debug and replay surfaces;
- health endpoints.

#### Mobile

`apps/mobile` is the primary user-facing client. It is a React Native/Expo application with:

- manual stack navigation;
- custom tab composition;
- screen-level orchestration;
- hooks that compose data from shared APIs;
- local state, loading, error, and fallback handling;
- shared UI consumption through `packages/ui`;
- API consumption through `packages/api-client`.

#### Web

`apps/web` is a minimal web surface. It is materially less complex than the mobile application and does not define the primary product experience.

### Shared Packages

#### `packages/types`

This package is the shared contract layer for the workspace. It defines TypeScript types for domains such as auth, AI, dashboard, fitness, goals, habits, notifications, nutrition, personalization, progress, recovery, training, and users.

#### `packages/api-client`

This package is the typed HTTP client used by the mobile application. It is the contract-aware bridge between mobile and backend endpoints.

#### `packages/ui`

This package is the shared design system. It contains reusable components, formatters, theme tokens, colors, spacing, and radius primitives.

### Backend

The backend is organized by bounded context and layered architecture.

Each major domain module follows the same general separation:

- Presentation
- Application
- Domain
- Infrastructure

This separation is verified across the functional domains in `apps/api`, with `health` as a presentation-only module.

The backend contains:

- controllers at the HTTP boundary;
- DTOs with validation at the boundary;
- use cases and application services orchestrating domain behavior;
- domain entities and repository interfaces;
- Mongoose repository implementations and schemas;
- read models and mappers for public and internal views.

The backend is not a microservices architecture. It is a modular monolith with explicit module boundaries and internal shared contracts.

### Mobile

The mobile architecture is organized into:

- navigation;
- screens;
- hooks;
- components;
- API client integration;
- authentication provider;
- local storage;
- shared UI reuse.

The mobile application does not own domain rules. It composes and displays server-backed data and locally derived view models.

### AI Platform

The AI platform is an internal, deterministic-first system with the following verified layers:

- runtime;
- context builder;
- planning;
- expert router;
- composition;
- persona;
- explainability;
- prompt builder;
- provider;
- safety;
- observability;
- replay;
- feature flags.

The AI architecture is explicitly internal-first and is designed to preserve public API stability while allowing the coach experience to evolve.

### Persistence

The persistence layer uses:

- MongoDB;
- Mongoose schemas;
- read models;
- snapshots;
- replay-related stored metadata where applicable.

The data model is read-optimized in several areas, with explicit index usage and bounded persistence patterns.

## Approved Architectural Decisions

The following decisions are officially approved because they are already realized in the repository and are consistent with the audited system shape.

### Modular Monolith

Approved because the backend is organized as a single deployable application with clear module boundaries, not as distributed services.

### Domain Boundaries

Approved because functional areas such as AI, auth, dashboard, fitness, goals, habits, notifications, nutrition, personalization, progress, recovery, training, and users are separated into dedicated modules.

### Shared Contracts

Approved because `packages/types` and `packages/api-client` establish reusable contracts across backend and mobile.

### Shared UI

Approved because `packages/ui` serves as a shared visual foundation rather than duplicating primitives in each app.

### Mobile First

Approved because the mobile application is the primary product surface, while the web application is intentionally minimal.

### Feature Flags

Approved because unfinished or high-risk AI capabilities are protected by explicit runtime flags.

### Replay and Debug Surfaces

Approved because internal replay, debug, and replayable decision surfaces exist for operational diagnosis and verification.

### AI Safety

Approved because the AI layer includes safety, injection detection, sanitization, structured outputs, and fallback behavior.

### Structured Outputs

Approved because AI responses and internal artifacts are modeled as structured data, not ad hoc prose.

### Observability

Approved because the repository includes observability services, bounded retention, replay metadata, and operational documentation.

### Contract-driven Communication

Approved because backend DTOs, shared types, and API client mappings are aligned around explicit contracts.

### Documentation-first Development

Approved because the repository includes architecture docs, product docs, ADRs, and specs that must remain aligned with implementation.

## Mandatory Architectural Constraints

The following constraints are mandatory for future Epics.

### Controllers MUST NOT contain business logic

Controllers exist at the HTTP boundary. Business rules belong in application services, use cases, or domain services. This preserves testability and keeps the boundary thin.

### Mobile MUST NOT implement domain rules

The mobile app MAY derive view models, but it MUST NOT own business invariants or specialist domain logic. This prevents client/server divergence.

### DTOs MUST NOT be duplicated unnecessarily

Shared contracts MUST be reused where they already exist. Duplicate DTOs create contract drift and increase maintenance cost.

### Domain boundaries MUST NOT be violated

Modules MUST remain responsible for their own bounded context. Cross-domain behavior MUST occur through explicit application services, repositories, or shared contracts.

### Shared contracts MUST be reused

Types and client contracts in `packages/types` and `packages/api-client` are the canonical cross-boundary interfaces. New code SHOULD extend them rather than replicate them locally.

### New endpoints MUST be documented

Any new HTTP endpoint MUST be reflected in architecture/spec documentation to preserve the documentation-first discipline already present in the repository.

### Feature flags MUST protect unfinished features

New AI, runtime, or platform features that are incomplete, risky, or not intended for immediate exposure MUST be gated behind feature flags.

### Tests MUST accompany new functionality

The repository already demonstrates a strong testing culture. New behavior MUST be covered by unit, integration, or e2e tests appropriate to the change.

### AI runtime MUST remain deterministic before calling the LLM

The audited architecture makes deterministic runtime decisions before provider invocation. That property MUST remain intact to preserve safety, reproducibility, and fallback behavior.

### Design System MUST remain the single visual source of truth

`packages/ui` MUST remain the canonical shared UI foundation. New reusable visual primitives SHOULD be added there instead of duplicating patterns in mobile screens.

### AI Module MUST NOT become a God Module

The AI module already contains runtime, experts, composition, persona, explainability, observability, and chat orchestration. Future changes MUST avoid collapsing unrelated product concerns into the module.

### Debug and replay surfaces MUST remain internal

Internal diagnostic endpoints MUST NOT become public product surfaces. They exist for engineering and operational diagnosis only.

### Public APIs and mobile contracts MUST remain backward compatible

The audited system relies on stable cross-boundary contracts. Breaking changes require deliberate versioning or an explicit ADR.

## Official Technical Debt

This section lists only debt that was confirmed in the audit.

### 1. Mobile recomposes coach intelligence locally

- Description: several mobile hooks build a local intelligence model from multiple backend endpoints instead of consuming a single unified server-side DTO.
- Impact: duplicate composition logic, higher contract drift risk, more client responsibility.
- Severity: Medium
- Why it is currently acceptable: the behavior is working, bounded, and backed by shared contracts.
- Expected future strategy: progressively centralize or simplify composition without changing the public experience.

### 2. Debug and replay surface area is large

- Description: the AI module exposes multiple internal debug and replay endpoints.
- Impact: higher maintenance burden and larger internal attack surface if controls regress.
- Severity: Medium
- Why it is currently acceptable: the surfaces are internal, authenticated, and explicitly part of the operational architecture.
- Expected future strategy: keep the surfaces internal, documented, and strictly bounded by role and policy.

### 3. Documentation and implementation are not perfectly synchronized

- Description: some docs are aspirational or broader than the exact current public surface.
- Impact: onboarding confusion and possible overstatement of available behavior.
- Severity: Medium
- Why it is currently acceptable: the repository contains a strong audit and governance trail that can be used to correct drift.
- Expected future strategy: keep documentation synchronized with implementation and treat deviations as maintenance work.

### 4. Web surface is intentionally minimal

- Description: the web app is much less mature than the mobile experience.
- Impact: limited product coverage on web.
- Severity: Low
- Why it is currently acceptable: product strategy is mobile-first, and the web surface is intentionally lightweight.
- Expected future strategy: expand web only if product requirements explicitly demand it.

### 5. Some operational guarantees are not fully proven outside the sandbox

- Description: end-to-end validation was limited by the sandbox environment.
- Impact: production readiness requires external verification.
- Severity: Medium
- Why it is currently acceptable: the codebase itself is consistent, and the limitation was environmental, not a code failure.
- Expected future strategy: run full e2e and operational validation in a non-sandbox environment before release certification.

## Accepted Risks

### 1. Documentation drift

- Description: architecture and product documentation can drift from implementation as the system evolves.
- Probability: Medium
- Impact: Medium
- Mitigation strategy: maintain the audit, ADRs, and documentation-first workflow; require documentation updates alongside new behavior.
- Review trigger: any Epic that adds or materially changes public behavior, internal debug surfaces, or AI orchestration.

### 2. Contract drift between backend, shared types, and mobile composition

- Description: client-side composition can diverge from backend read models over time.
- Probability: Medium
- Impact: High
- Mitigation strategy: reuse shared contracts, add contract tests, and minimize duplicated mapping logic.
- Review trigger: any change to AI summaries, dashboard aggregation, or mobile coach intelligence mapping.

### 3. Internal debug/replay surface growth

- Description: internal operational surfaces may expand beyond a manageable size.
- Probability: Medium
- Impact: Medium
- Mitigation strategy: keep them internal-only, authenticated, documented, and covered by tests.
- Review trigger: every new internal endpoint or replay path.

### 4. Persistent history growth

- Description: conversation, decision, and other historical data can accumulate over time.
- Probability: Medium
- Impact: Medium
- Mitigation strategy: maintain retention and pruning policies; keep replay and history data bounded.
- Review trigger: any change to AI memory, replay, or history storage.

### 5. Operational validation dependence on environment

- Description: some validations require a full runtime environment outside the sandbox.
- Probability: High
- Impact: Medium
- Mitigation strategy: keep automated validation, but confirm production-like behavior in CI or staging.
- Review trigger: release readiness and pre-production certification.

## Mandatory Requirements for Future Epics

Every Epic MUST preserve the following:

### Architecture

The current modular monolith, boundary structure, and layering MUST remain intact unless a new ADR explicitly changes them.

### Contracts

Public REST APIs, DTOs, shared types, and mobile contracts MUST remain compatible unless an explicit breaking-change ADR is approved.

### Boundaries

Module ownership, bounded contexts, and responsibility separation MUST remain intact.

### Tests

New functionality MUST be accompanied by tests appropriate to the change.

### Documentation

Docs MUST be updated whenever architecture, public behavior, or internal operational surfaces change.

### Observability

New operational behavior MUST preserve or improve traceability, replayability, and bounded retention.

### Compatibility

The mobile experience, backend endpoints, and shared contracts MUST remain interoperable across releases.

## Pull Request Checklist

Every PR that touches architecture, contracts, or product behavior MUST answer the following:

- [ ] Architecture preserved
- [ ] Domain boundaries respected
- [ ] Shared contracts reused
- [ ] DTOs reused or intentionally versioned
- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] ADR required or not required assessed
- [ ] Feature flag required or not required assessed
- [ ] New endpoint documented
- [ ] Migration required or not required assessed
- [ ] Replay support considered
- [ ] Observability updated
- [ ] Security reviewed
- [ ] Mobile updated if required
- [ ] Shared package reused where applicable
- [ ] Breaking change evaluated

## When a New ADR MUST Be Created

A new ADR MUST be created when a future Epic introduces a material architectural decision, including:

- a new bounded context;
- a different persistence strategy;
- messaging or eventing changes;
- infrastructure topology changes;
- AI architecture changes;
- authentication or authorization changes;
- major mobile architecture changes;
- design system evolution that changes the shared UI baseline;
- contract versioning or breaking API changes;
- a change to the deterministic-first behavior of the AI runtime.

Examples:

- introducing a separate persistence backend alongside MongoDB;
- moving from internal orchestration to distributed messaging;
- replacing the mobile navigation architecture;
- changing the AI runtime so it reasons non-deterministically before policy evaluation;
- deprecating shared contracts in favor of duplicated local DTOs.

## Consequences

### Positive consequences of adopting this baseline

- maintainability improves because the system has a single factual architectural reference;
- onboarding improves because new engineers can align on confirmed structure;
- consistency improves because future Epics inherit known boundaries and contracts;
- delivery speed improves because teams can evolve within a stable frame;
- technical debt grows more slowly because new work is constrained by explicit rules.

### Negative consequences of ignoring it

- drift increases across backend, mobile, shared contracts, and documentation;
- debugging becomes harder because internal and public surfaces blur;
- AI safety and fallback guarantees can regress;
- duplicate logic and duplicate DTOs become harder to eliminate;
- future refactors become more expensive because the baseline no longer constrains design.

## References

Primary factual source:

- [docs/architecture/repository-technical-audit.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/repository-technical-audit.md)

Supporting references:

- [docs/adr/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/README.md)
- [docs/adr/adr-010-ai-agent-platform-core-architecture.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/adr-010-ai-agent-platform-core-architecture.md)
- [docs/adr/adr-011-coach-intelligence-architecture.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/adr-011-coach-intelligence-architecture.md)
- [docs/architecture/overview.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/overview.md)
- [docs/architecture/monorepo.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/monorepo.md)
- [docs/architecture/service-map.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/service-map.md)
- [docs/architecture/communication-flow.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/communication-flow.md)
- [docs/specs/GOVERNANCE.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/GOVERNANCE.md)
- [docs/specs/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/README.md)
- [docs/specs/ai/release-readiness/final-certification.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai/release-readiness/final-certification.md)
- [docs/specs/mobile/coach-intelligence-integration/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/mobile/coach-intelligence-integration/README.md)
- [docs/product/product-vision.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/product/product-vision.md)
- [docs/domain/domain-model.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/domain/domain-model.md)

