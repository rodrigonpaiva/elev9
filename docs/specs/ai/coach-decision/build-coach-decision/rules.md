# Rules - Build Coach Decision

## Priority Rules

- Strong recovery risk wins first.
- Strong nutrition adherence gap can win over training guidance.
- Strong training adjustment signals win over generic consistency.
- If signals are stable and the user has a long streak, prefer motivation.

## Deterministic Output Rules

- `priority` must come from rules, not from LLM.
- `actionItems` must be short, concrete, and reproducible.
- `influences` must explain the decision.
- `sourceContext` must remain reduced and safe.
- `formulaVersion` must be explicit and persisted.

## LLM Rules

- LLM may only rewrite language.
- LLM may not change business meaning.
- LLM may not add new action items or influences.
