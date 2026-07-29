# Release 2.1 — Epic A3 Nutrition Intelligence implementation plan

| Prompt | Scope | Status |
| --- | --- | --- |
| Prompt 1 — Domain Audit & Canonical Nutrition Model | Audit ownership and establish the current Nutrition read model | **completed with conditions** |
| Prompt 2 — Deterministic Nutrition Engine | Harden deterministic calculations and rules | **completed with conditions** |
| Prompt 3 — Dashboard Nutrition Experience | Productize Dashboard consumption of canonical Nutrition | **completed with conditions** |
| Prompt 4 — Coach Nutrition Intelligence | Route Health Context and Coach through canonical Nutrition | **completed with conditions** |
| Prompt 5 — Nutrition Analytics & Observability | Add privacy-safe operational/product observability | **completed with conditions** |
| Prompt 6 — Offline Nutrition Cache | Add offline read/cache behavior | **completed with conditions** |
| Prompt 7 — Nutrition History & Trends | Add bounded canonical history, detail and deterministic trends | **completed with conditions** |
| Prompt 8 — Integration Audit | Audit all cross-module Nutrition consumers | **completed with conditions** |
| Prompt 9 — Production Certification | Certify release behavior and readiness | pending |

Prompt 7 is completed with conditions because the repository has no immutable daily snapshot or historical plan-version store. The implementation reconstructs only logged days from the plan referenced by their logs, exposes partial/no-data states, and defers snapshots, backfill and historical guidance fidelity.

Prompt 8 is completed with conditions. The canonical Nutrition application paths and consumer boundaries are documented, while legacy raw Nutrition access remains in Coach/AI, Training and Goals compatibility paths. Those paths are registered for migration and prevent unconditional Prompt 9 readiness. Prompt 9 remains pending.
