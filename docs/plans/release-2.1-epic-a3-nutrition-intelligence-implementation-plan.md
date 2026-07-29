# Release 2.1 — Epic A3 Nutrition Intelligence implementation plan

| Prompt                                              | Scope                                                          | Status                        |
| --------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| Prompt 1 — Domain Audit & Canonical Nutrition Model | Audit ownership and establish the current Nutrition read model | **completed with conditions** |
| Prompt 2 — Deterministic Nutrition Engine           | Harden deterministic calculations and rules                    | **completed with conditions** |
| Prompt 3 — Dashboard Nutrition Experience           | Productize Dashboard consumption of canonical Nutrition        | **completed with conditions** |
| Prompt 4 — Coach Nutrition Intelligence             | Route Health Context and Coach through canonical Nutrition     | pending                       |
| Prompt 5 — Nutrition Analytics & Observability      | Add privacy-safe operational/product observability             | pending                       |
| Prompt 6 — Offline Nutrition Cache                  | Add offline read/cache behavior                                | pending                       |
| Prompt 7 — Nutrition History Experience             | Build historical Nutrition experience                          | pending                       |
| Prompt 8 — Integration Audit                        | Audit all cross-module Nutrition consumers                     | pending                       |
| Prompt 9 — Production Certification                 | Certify release behavior and readiness                         | pending                       |

Prompt 3 preserves the existing Dashboard structure and navigation. Dedicated React Native renderer tests and canonical onboarding HTTP states remain conditions.

Prompt 4 is **completed with conditions**: Health Context now projects a safe `CoachNutritionContext` from the canonical Nutrition read model, and Nutrition Expert uses that projection for deterministic responses and explainability. Legacy raw Nutrition fields remain temporarily available to preserve compatibility for other Coach consumers; their removal is deferred to Prompt 8. Prompts 5–9 remain pending.
