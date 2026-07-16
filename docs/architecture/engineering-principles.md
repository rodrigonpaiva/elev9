# Engineering Principles

This document is the engineering constitution of the repository.

It defines the permanent rules that every engineer, reviewer, and AI agent MUST follow when contributing to the project.

It exists to preserve the audited architecture, prevent drift, and keep implementation decisions aligned with the accepted baseline in [ADR-0001 — Architecture Baseline Certification](./adrs/ADR-0001-architecture-baseline-certification.md) and the factual repository audit in [Repository Technical Audit](./repository-technical-audit.md).

Every contributor MUST understand these rules before changing code.

## 1. Engineering Philosophy

The project follows these principles:

- Simplicity over cleverness
- Readability over brevity
- Composition over inheritance
- Explicit over implicit
- Deterministic before AI
- Domain-first thinking
- Documentation-first development
- Small iterative changes
- Backward compatibility
- Test-driven confidence

### Why

The repository is a modular monolith with shared contracts, a mobile-first product surface, and an internal AI platform. Systems with this shape fail when decisions become implicit, undocumented, or too clever to verify.

### How to apply

- Prefer the smallest change that preserves behavior.
- Make dependencies visible in code and documentation.
- Choose deterministic logic before introducing LLM-assisted behavior.
- Model the domain before modeling the UI.
- Add tests and documentation with the implementation, not after prolonged drift.

## 2. Repository Organization

The repository is organized as an Nx workspace.

### `apps/`

Contains deployable applications.

Allowed:

- backend services
- mobile application
- web application

Not allowed:

- shared business contracts
- design tokens
- reusable domain models

### `packages/`

Contains shared libraries.

Allowed:

- contracts
- HTTP client abstractions
- shared UI primitives
- reusable formatters

Not allowed:

- application-specific navigation
- app-specific business rules
- duplicate copies of backend DTOs

### `docs/`

Contains specifications, architecture docs, ADRs, operational docs, and governance.

Allowed:

- ADRs
- specs
- architecture documentation
- release readiness documentation

Not allowed:

- executable product code
- undocumented design decisions

### `scripts/`

Contains operational and validation scripts.

Allowed:

- smoke checks
- release helpers
- validation scripts

Not allowed:

- production business logic
- undocumented runtime behavior

### Rule of ownership

Each top-level directory MUST remain focused on its responsibility. Cross-cutting concerns SHOULD be resolved through shared packages, architecture docs, or ADRs rather than ad hoc duplication.

## 3. Domain-Driven Design Rules

The repository uses bounded contexts and domain-oriented modules.

### Bounded Contexts

A bounded context MUST be created when a business capability has its own vocabulary, invariants, lifecycle, or persistence model.

Why:

- prevents accidental coupling
- preserves domain vocabulary
- supports modular ownership

How:

- define the context around a clear business capability
- keep context-specific rules inside the module
- expose only the minimum necessary contract outward

### Aggregates

An aggregate SHOULD be created when multiple domain objects must change consistently.

Why:

- protects invariants
- provides a transactional boundary

How:

- choose a single aggregate root
- keep mutations inside the aggregate boundary
- avoid distributed writes across unrelated aggregates in a single domain operation unless explicitly designed

### Entities

An entity MUST be created when identity and lifecycle matter.

Why:

- entities represent persistent domain identity

How:

- model identity explicitly
- keep behavior with the entity when it enforces invariants

### Value Objects

A value object SHOULD be created when a concept is defined by its attributes, not identity.

Why:

- reduces primitive obsession
- improves validation and meaning

How:

- make value objects immutable
- compare by value, not reference

### Repositories

A repository MUST be created when domain logic needs persistence abstraction.

Why:

- preserves domain independence from storage

How:

- define repository interfaces in the domain layer
- implement repositories in infrastructure
- avoid ORM leakage into the domain

### Factories

A factory SHOULD be created when construction rules are non-trivial or when object creation must be centralized.

Why:

- avoids duplicated construction logic

How:

- use factories for complex initialization
- keep simple object creation simple

### Domain Services

A domain service SHOULD be created when a rule belongs to the domain but does not naturally fit a single entity or value object.

Why:

- keeps domain rules cohesive

How:

- place pure business logic in the domain
- avoid infrastructure dependencies

### Application Services

An application service MUST orchestrate use cases and transactions.

Why:

- keeps business flow out of controllers
- coordinates domain objects and repositories

How:

- orchestrate
- validate use-case inputs
- coordinate persistence boundaries

### Policies

A policy SHOULD be created when a rule determines permission, selection, or eligibility.

Why:

- centralizes decision logic

How:

- keep policies deterministic
- reuse them across services when possible

### What MUST never happen

- domain logic MUST NOT be spread across controllers, screens, or ad hoc helpers
- entities MUST NOT depend on infrastructure concerns
- repositories MUST NOT contain unrelated business decisions
- value objects MUST NOT become mutable bags of data

## 4. Clean Architecture Rules

The project MUST preserve dependency direction.

### Layer responsibilities

#### Presentation

Responsible for HTTP controllers, DTOs, screen composition, and navigation boundaries.

#### Application

Responsible for use cases, orchestration, and application-level policies.

#### Domain

Responsible for business rules, entities, value objects, and repository contracts.

#### Infrastructure

Responsible for persistence adapters, external services, SDK integrations, and framework-specific implementations.

### Allowed dependency direction

```text
Presentation -> Application -> Domain
Infrastructure -> Domain
Infrastructure -> Application
```

The reverse direction MUST NOT be introduced without an explicit architectural decision.

### Controllers

Controllers MUST remain thin.

Why:

- they are boundary adapters
- they should not encode business rules

How:

- parse request input
- delegate to application services or use cases
- map errors and responses

### Repositories

Repositories MUST hide storage details.

Why:

- preserves testability and portability

How:

- expose domain-oriented methods
- keep queries inside infrastructure

### DTOs

DTOs MUST define boundary contracts only.

Why:

- prevents leaking domain internals

How:

- validate at the boundary
- map to domain or use-case inputs explicitly

### Entities

Entities MUST represent domain state and rules, not transport payloads.

### Services

Services MUST have a single responsibility.

### Dependency diagram

```text
Presentation
   ↓
Application
   ↓
Domain

Infrastructure → Domain
Infrastructure → Application
```

## 5. Modular Monolith Rules

The backend MUST remain a modular monolith unless a new ADR changes the architectural baseline.

### Module boundaries

Each module MUST own a bounded context.

Why:

- reduces accidental coupling
- enables independent evolution inside a single deployment unit

How:

- keep module internals private by default
- expose only explicit exports

### Public APIs

Public APIs between modules SHOULD be small and intentional.

### Internal APIs

Internal APIs MAY exist but MUST remain module-local when possible.

### Cross-module communication

Cross-module communication MUST occur through:

- application services
- repository contracts
- shared contracts
- explicit imports

It MUST NOT occur through hidden coupling or shared mutable state.

### Shared Kernel

A shared kernel MAY exist only when reuse is genuinely stable and shared across bounded contexts.

### Forbidden dependencies

- module A MUST NOT depend on module A’s internals from another module
- UI layers MUST NOT reach directly into another module’s domain internals
- debug surfaces MUST NOT become implicit integration points

### When to create a new module

A new module SHOULD be created when:

- the domain vocabulary diverges
- the persistence model diverges
- the use cases are distinct enough to warrant independent ownership

## 6. Mobile Engineering Rules

The mobile app is the primary product surface.

### Navigation

- Navigation MUST be explicit and centralized.
- Routes MUST be predictable and discoverable.
- Nested flows SHOULD be isolated by feature area.

### Screens

- Screens MUST orchestrate UI, not business rules.
- Screens SHOULD delegate data access and mapping to hooks.

### Hooks

- Hooks MUST encapsulate screen data composition and local view-model mapping.
- Hooks MUST NOT contain domain logic that belongs to backend services.

### Components

- Components MUST be reusable, accessible, and visual-first.
- Shared presentational patterns SHOULD use `packages/ui` when possible.

### State

- State MUST be minimal and intentional.
- Derived state SHOULD be computed rather than duplicated.

### API consumption

- Mobile MUST consume backend contracts through shared client packages.
- Direct ad hoc HTTP calls SHOULD be avoided when a shared client exists.

### Offline storage

- Offline state MAY be used for bootstrap, caching, and resilience.
- Offline state MUST NOT become a hidden source of business truth.

### Authentication

- Authentication state MUST be centralized.
- Tokens MUST be stored and read consistently.

### Performance

- Avoid unnecessary rerenders.
- Avoid large object recreation in render paths.
- Prefer stable data shapes.

### Accessibility

- VoiceOver and TalkBack support MUST be preserved.
- Labels, hints, roles, and dynamic type MUST be considered for all user-facing screens.

### Where business logic MUST NOT exist

- screens
- presentational components
- UI-only hooks

Business logic belongs in backend use cases, domain services, or explicit shared business rules.

## 7. Backend Engineering Rules

### Controllers

- MUST validate input at the boundary
- MUST delegate to application services
- MUST map domain/application results to HTTP responses
- MUST NOT contain business logic

### Use Cases

- MUST orchestrate a single business capability
- SHOULD be deterministic
- MUST own the application flow

### Repositories

- MUST be interfaces in the domain layer
- MUST be implemented in infrastructure
- MUST NOT expose persistence concerns to presentation

### Schemas

- MUST model persistence, not transport contracts
- SHOULD be indexed intentionally

### DTOs

- MUST be boundary-only
- MUST be validated
- SHOULD remain backward compatible

### Validation

- MUST happen at the boundary
- MUST reject malformed inputs early

### Error handling

- MUST distinguish validation, business, infrastructure, and unexpected errors
- MUST preserve safe user-facing messages

### Logging

- MUST avoid secrets, raw prompts, raw replies, and sensitive user data

### Transactions

- MUST be used when consistency requires it
- SHOULD be kept as narrow as possible

### Persistence

- MUST preserve indexes and retention assumptions
- SHOULD prefer query shapes that are index-friendly

### Dependency injection

- MUST keep wiring explicit
- SHOULD avoid hidden service locator patterns

## 8. AI Engineering Rules

The AI platform is internal, deterministic-first, and safety-bound.

### AI MUST NOT contain business rules

Business rules belong in domain or application services. AI may interpret or summarize structured state, but it MUST NOT become the owner of domain invariants.

### AI MUST receive deterministic context

The AI runtime MUST be fed by deterministic context selection, policy, and planning before any LLM call occurs.

Why:

- reproducibility
- safety
- explainability

### Prompt Builder MUST remain isolated

Prompt assembly MUST remain a dedicated concern.

Why:

- avoids prompt sprawl
- preserves governance over LLM inputs

### LLM MUST be replaceable

Provider integration MUST be isolated behind abstractions.

Why:

- prevents vendor lock-in at the architecture level

### Prompt Injection MUST be mitigated

The AI system MUST sanitize, validate, and detect malicious or unsafe input where applicable.

### Structured Outputs MUST be preferred

When the architecture requires machine-readable AI output, structured outputs MUST be preferred over free-form text.

### Replay MUST remain available

Key AI decisions and coach flows SHOULD remain replayable for operational verification.

### Explainability MUST be preserved

The system MUST be able to explain outcomes using evidence and structured metadata without exposing hidden reasoning.

### Feature Flags MUST protect experimental capabilities

Unfinished or risky AI capabilities MUST remain behind flags.

### AI decisions MUST be observable

Routing, composition, safety, fallback, and provider usage MUST be traceable through internal observability.

### Additional AI rules

- AI MUST NOT leak prompts, chain-of-thought, or internal policies
- AI MUST preserve deterministic fallback behavior
- AI MUST keep public APIs stable
- AI MUST keep mobile contracts stable
- AI MUST NOT become the owner of unrelated product modules

## 9. API Design Standards

### REST conventions

- Use resource-oriented routes.
- Use HTTP verbs consistently.
- Keep route names predictable.

### Naming

- Prefer plural nouns for collections where the existing codebase already does so.
- Use clear, domain-native names.

### DTOs

- Input and output DTOs MUST be explicit.
- DTOs SHOULD match shared contracts when possible.

### Status codes

- Use standard HTTP status codes consistently.
- Do not invent application-specific status semantics when standard HTTP semantics suffice.

### Validation

- Validate inputs at the edge.
- Reject invalid payloads early.

### Pagination

- Use explicit pagination parameters when lists may grow.
- Keep limits bounded.

### Filtering

- Filters SHOULD be explicit query parameters.
- Filtering semantics MUST be documented.

### Versioning

- Breaking API changes SHOULD be avoided.
- If unavoidable, they MUST be intentional and documented.

### Errors

- Errors MUST be structured and safe.
- User-facing errors MUST not expose internal implementation details.

### Backward compatibility

- Public APIs MUST preserve backward compatibility unless a deliberate breaking change is approved.

## 10. Shared Package Standards

### `packages/types`

Belongs here:

- cross-boundary request/response contracts
- shared domain DTO types
- reusable enums and structural contracts

### `packages/api-client`

Belongs here:

- typed HTTP client logic
- endpoint wrappers
- transport-level abstractions for mobile/web

### `packages/ui`

Belongs here:

- reusable UI primitives
- tokens
- formatters
- shared presentational components

### What MUST never be duplicated

- backend DTOs in local mobile types when a shared type already exists
- visual primitives already available in `packages/ui`
- contract shapes that are already canonical in `packages/types`
- transport wrappers that already exist in `packages/api-client`

## 11. Design System Principles

### Component hierarchy

The design system MUST provide small primitives first, then composed patterns.

### Tokens

Colors, spacing, and radius MUST be centralized.

### Colors

Color usage SHOULD come from theme tokens rather than arbitrary local values.

### Spacing

Spacing SHOULD use shared tokens to preserve consistency.

### Typography

Typography SHOULD use shared primitives and consistent variants.

### Composition

New components SHOULD be composed from shared primitives whenever practical.

### Accessibility

Shared components MUST preserve accessible defaults where applicable.

### Reusability

Create a new component in `packages/ui` when the pattern:

- appears in more than one place,
- requires consistent styling,
- or becomes a product-level primitive.

Do not create a shared component for one-off screen-local concerns.

## 12. Testing Standards

The repository expects tests to accompany behavior.

### Unit tests

Required for:

- deterministic logic
- pure transformations
- policy rules
- mappers
- helpers

### Integration tests

Required for:

- application service flows
- repository behavior
- cross-layer interaction

### E2E tests

Required for:

- public API behavior
- critical product flows
- auth and core state transitions

### Contract tests

Required for:

- shared contract drift prevention
- backend/client compatibility

### Snapshot tests

May be used for stable UI or mapping outputs when the snapshot is intentional and reviewable.

### Minimum expectations

- New business behavior MUST have test coverage.
- Bug fixes SHOULD include a regression test.
- AI behavior changes SHOULD have deterministic tests around inputs, routing, composition, or fallback.

## 13. Documentation Standards

Documentation is part of the deliverable.

### What must be updated

- `README` files when product or workspace guidance changes
- specs when behavior changes
- architecture docs when module or system shape changes
- ADRs when an architectural decision is made
- Engineering Principles when the standards themselves change

### Why

The repository follows spec-first and documentation-first discipline. Documentation drift is an engineering risk, not a cosmetic issue.

### How

- update docs in the same change set as the implementation whenever feasible
- preserve clickable references
- keep docs factual and current
- do not document future behavior as present behavior

### Documentation ownership

The engineer or team making the change owns the corresponding documentation update.

## 14. Feature Development Workflow

The official workflow is:

```text
Product Decision
↓
ADR (if required)
↓
Specification
↓
Implementation
↓
Tests
↓
Documentation
↓
Review
↓
Merge
↓
Release
```

### Why

This workflow makes architectural decisions traceable and prevents implementation from outpacing governance.

### How

- create an ADR when the change is architectural
- create or update the relevant spec
- implement in small, reviewable steps
- add tests before merge
- update docs before release

## 15. Pull Request Standards

Every PR SHOULD be reviewed against this checklist:

- [ ] Architecture preserved
- [ ] Domain boundaries respected
- [ ] Shared contracts reused
- [ ] DTOs reused or intentionally versioned
- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] ADR created if required
- [ ] Feature flag reviewed
- [ ] Observability updated
- [ ] Security reviewed
- [ ] Accessibility reviewed
- [ ] Performance considered
- [ ] Mobile impact assessed
- [ ] Shared package reuse verified
- [ ] Breaking change evaluated

## 16. Naming Conventions

### Files

- Use descriptive, kebab-case or conventional framework naming.

### Folders

- Use domain- or feature-oriented folder names.

### Classes

- Use PascalCase.
- Names SHOULD describe responsibility.

### Interfaces

- Use PascalCase.
- Prefixing with `I` is not required by the current codebase and SHOULD NOT be introduced just for style.

### DTOs

- Name DTOs by action and direction, such as `CreateXRequestDto` or `GetXResponseDto`.

### Repositories

- Name repositories by aggregate or domain concept.

### Entities

- Name entities by domain noun.

### Hooks

- Use `use` prefixes and feature-oriented names.

### Components

- Use PascalCase and clear visual responsibility names.

### Services

- Name services by the business capability they coordinate.

### Specs

- Names SHOULD reflect the flow, capability, or bounded context.

### ADRs

- ADR names SHOULD be stable, specific, and versioned by sequence.

### Tests

- Test files SHOULD mirror the unit under test and use clear behavioral descriptions.

## 17. Error Handling Standards

The system MUST distinguish error classes.

### Business errors

Expected domain failures. These SHOULD be translated into safe, actionable user-facing messages.

### Validation errors

Malformed or invalid input. These MUST be rejected at the boundary.

### Infrastructure errors

Failures in persistence, network, SDKs, or external providers. These SHOULD be logged internally and mapped safely.

### Unexpected errors

Unhandled failures. These MUST be contained, logged, and converted to safe responses or fallback behavior.

### Logging

- Log what is needed to debug the system.
- Do not log secrets, raw prompts, raw replies, or sensitive user content.

### User messages

- User-facing messages MUST be safe, concise, and non-technical where appropriate.

### Developer messages

- Internal logs MAY contain technical context but MUST remain privacy-safe.

## 18. Security Principles

### Authentication

- Authentication MUST be centralized and consistent.
- Tokens MUST be handled through approved mechanisms.

### Authorization

- Authorization MUST be explicit.
- Guards and policies SHOULD be used rather than ad hoc checks.

### Validation

- Validation MUST happen before business logic executes.

### Secrets

- Secrets MUST NOT be committed to the repository.
- Secrets MUST be managed through environment and deployment configuration.

### PII

- Personal data MUST be treated as sensitive.
- Logging, replay, and observability MUST avoid unnecessary exposure.

### Prompt Injection

- AI inputs MUST be sanitized and checked for injection risk where applicable.

### Replay Protection

- Replay and debug surfaces MUST remain internal and bounded.

### Feature Flags

- Feature flags SHOULD gate incomplete, risky, or experimental capabilities.

## 19. Performance Principles

### Database queries

- Queries MUST be intentional and index-aware.
- Large scans SHOULD be avoided.

### Indexes

- Indexes SHOULD match query patterns.
- Index changes MUST be reviewed with the data model.

### Caching

- Cache only when there is a measured need or a clear design reason.
- Cached data MUST remain coherent with the source of truth.

### Rendering

- Mobile rendering SHOULD avoid unnecessary work.
- Components SHOULD keep render paths stable.

### Hooks

- Hooks MUST not recompute large objects unnecessarily.

### Memoization

- Memoization MAY be used when it reduces real cost without obscuring logic.

### Bundle size

- Shared components and packages SHOULD avoid unnecessary dependency growth.

### API latency

- Keep request paths bounded and deterministic where possible.

### Mobile performance

- Avoid heavy screen-local recomposition when shared view-model logic is available.

## 20. Observability Standards

### Logging

- Logs MUST be structured when possible.
- Logs MUST avoid sensitive payloads.

### Metrics

- Measure the behaviors needed to operate the system safely.

### Tracing

- Preserve internal traceability for critical flows.

### Replay

- Replay SHOULD be available for critical AI or decision flows when operationally useful.

### Monitoring

- Operational surfaces SHOULD be monitored for health, latency, and failure patterns.

### Health checks

- Health endpoints MUST remain lightweight and safe.

### Debug endpoints

- Debug endpoints MUST be internal-only and MUST NOT leak raw internal state.

### Production safety

- Observability MUST help operators without exposing secrets or hidden reasoning.

## 21. Technical Debt Policy

### Documentation

Technical debt MUST be documented when it is accepted, especially if it impacts architecture, contracts, or reliability.

### Prioritization

Debt SHOULD be prioritized by:

- user impact
- operational risk
- contract drift risk
- maintenance cost

### When debt becomes unacceptable

Debt becomes unacceptable when it:

- violates a mandatory architectural rule,
- introduces a breaking change without approval,
- undermines safety or observability,
- or makes the codebase materially harder to evolve safely.

## 22. ADR Policy

### When an ADR is mandatory

An ADR MUST be created when a change introduces or alters:

- architectural boundaries
- persistence strategy
- messaging strategy
- runtime model
- AI architecture
- authentication model
- mobile architecture
- shared contract strategy
- design system baseline

### When an ADR is optional

An ADR MAY be omitted for small, local, non-architectural changes that do not affect the baseline.

### How to supersede ADRs

An ADR is superseded only by another ADR that explicitly states the change and references the prior decision.

### Relationship to Engineering Principles

Engineering Principles are the permanent operating rules.
ADRs are the recorded decisions that may refine or extend those rules.
An ADR MUST NOT contradict the engineering constitution without intentionally superseding it.

## 23. Future Evolution

The architecture SHOULD evolve without degrading the baseline.

### Scaling

- scale by preserving module boundaries and contract clarity
- avoid premature distribution

### Refactoring

- refactor in small steps
- preserve tests and contracts
- keep behavior stable unless explicitly changing it

### Adding AI

- add AI deterministically first
- gate experimental capability with flags
- preserve explainability and fallback

### Adding modules

- create modules only when the bounded context is real
- avoid over-fragmentation

### Changing infrastructure

- isolate infrastructure changes behind adapters
- avoid leaking vendor specifics into domain code

### Breaking changes

- breaking changes SHOULD be avoided
- if unavoidable, they MUST be intentional, documented, and reviewed through ADR/spec changes

## 24. Engineering Checklist

Before merging any code, an engineer MUST verify:

- [ ] The change preserves the architectural baseline
- [ ] The correct bounded context owns the change
- [ ] Controllers remain thin
- [ ] Domain logic is not duplicated in mobile or presentation layers
- [ ] Shared contracts are reused where available
- [ ] No DTO duplication was introduced
- [ ] Feature flags were applied if the feature is incomplete or risky
- [ ] Tests were added or updated
- [ ] Errors are safe and correctly classified
- [ ] Security impact was reviewed
- [ ] Observability impact was reviewed
- [ ] Performance impact was reviewed
- [ ] Accessibility impact was reviewed for mobile-facing changes
- [ ] Documentation was updated
- [ ] An ADR was created if the change is architectural
- [ ] The PR is backward compatible or intentionally versioned
- [ ] Debug or replay surfaces remain internal only

## Final Note

These principles are mandatory because they preserve the repository’s current architecture, its contract stability, and its ability to evolve safely over time.

