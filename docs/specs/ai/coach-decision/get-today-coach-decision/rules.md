# Rules - Get Today Coach Decision

- The operation must be idempotent for the same user and date.
- The same user must never see another user's decision.
- Do not expose raw context payloads beyond the reduced snapshot.
