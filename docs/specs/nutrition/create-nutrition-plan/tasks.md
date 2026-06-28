# Tasks

## Domain

- Add `NutritionPlan`, `NutritionDay`, `Meal`, `MealOption`, and `FoodItem`.
- Add meal template model.
- Add deterministic meal planner service.

## Application

- Implement macro target dependency.
- Implement `CreateNutritionPlanUseCase`.
- Add replace-existing behavior.

## Infrastructure

- Add `nutrition_plans` schema.
- Add partial unique active-plan index.
- Add repository mapper tests.

## Presentation

- Add `POST /nutrition/plans`.
- Add DTOs and error mapping.

## Shared Packages

- Add public response/request types.
- Add `nutrition-api.ts` in `api-client` during implementation phase.
