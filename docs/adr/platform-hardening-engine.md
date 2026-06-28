# ADR — Platform Hardening & Architecture Consolidation

## Status

Proposed

## Context

Elev9 now has five completed domain engines:

- Recovery Engine
- Adaptive Training Engine
- Coach Decision Engine
- Goal Achievement Engine
- Dashboard + AI orchestration

The business capabilities are complete, but the platform still carries architectural drift:

- duplicated ordering rules
- multiple timezone assumptions
- flexible `sourceContext` governance gaps
- local repository token registration
- duplicated dashboard mapping logic
- replay/backfill behavior that is not yet fully standardized
- concurrency behavior that is correct but not centrally documented

These issues do not block product behavior today, but they slow down future evolution and increase the cost of adding new engines.

## Decision

Introduce a platform-hardening layer that standardizes the core platform behaviors used by all engines:

- daily snapshot ordering
- timezone strategy
- `sourceContext` governance
- repository token export strategy
- shared mapping boundaries
- replay and backfill rules
- concurrency guarantees

This epic is documentation-first.
It defines the target platform contract without changing business behavior.

## Non-Goals

This epic will not:

- change public API shapes
- change deterministic formulas
- introduce new user-facing features
- rewrite existing engine logic
- change current UTC daily behavior in production

## Why This Matters

The platform needs a consistent foundation before new product capabilities arrive.
Without this layer, every new engine tends to recreate the same rules in a slightly different way.

The result is:

- type drift
- subtle ordering bugs
- replay inconsistencies
- harder backfills
- tighter module coupling

## Target Outcome

The platform should converge on a single set of rules for:

- what “current” means
- what “latest” means
- how daily data is partitioned
- what may be stored in `sourceContext`
- how repositories are exposed across modules
- how replay/backfill is interpreted
- what concurrency guarantees each read model has

## Related Specs

- [latest-ordering-standardization](../specs/platform/latest-ordering-standardization/README.md)
- [timezone-strategy](../specs/platform/timezone-strategy/README.md)
- [source-context-governance](../specs/platform/source-context-governance/README.md)
- [repository-token-export](../specs/platform/repository-token-export/README.md)
- [shared-mappers](../specs/platform/shared-mappers/README.md)
- [replay-and-backfill](../specs/platform/replay-and-backfill/README.md)
- [concurrency-hardening](../specs/platform/concurrency-hardening/README.md)
