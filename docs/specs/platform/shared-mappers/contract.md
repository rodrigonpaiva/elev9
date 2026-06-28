# Contract

## Current Duplication

Mapping logic is duplicated across:

- Recovery -> Dashboard
- Adaptive -> Dashboard
- CoachDecision -> Dashboard
- Goal -> Dashboard
- Goal -> CoachDecision

## Target State

- mappers should live at the boundary that owns the output contract
- application/domain layers should not know presentation DTO details
- shared mapping helpers should only contain pure structural transforms
