# Rules

- Use `AuthSessionGuard`.
- Resolve data only for the authenticated user.
- Do not expose raw summaries.
- Do not expose raw conversation history.
- Do not expose raw prompts.
- Do not expose raw `UserHealthContext`.
- Do not expose API keys, tokens, or session data.
- Do not mutate conversations or memory records.
- Keep the endpoint deterministic.
- Treat the memory preview as part of the deterministic conversational memory layer, not semantic memory.
