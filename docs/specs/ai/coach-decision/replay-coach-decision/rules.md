# Rules - Replay Coach Decision

- Replay must compare `priority`, `headline`, `summary`, `actionItems`, `influences`, and `formulaVersion`.
- Replay must not mutate the persisted decision.
- Replay must surface drift explicitly when values differ.
- If the formula version changes, that difference must be reported.
