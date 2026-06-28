# Tasks

## 1. Documentation

- Confirm formula and fallback policy.
- Add shared contract types in `packages/types`.

## 2. Domain

- Define `MacroTargets` value object.
- Define `MacroCalculationSnapshot` type.
- Add deterministic calculator service.

## 3. Application

- Implement `CalculateMacroTargetsUseCase`.
- Read `UserProfile`, `FitnessProfile`, and `NutritionProfile`.
- Return explainability metadata.

## 4. Presentation

- Add `POST /nutrition/macro-targets/calculate`.
- Add request and response DTOs.
- Add error mapping.

## 5. Tests

- Add formula unit tests.
- Add use case tests.
- Add controller tests.
