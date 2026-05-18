# Rules

- Use `AuthSessionGuard`.
- Resolve data only for the authenticated user.
- Do not expose raw prompts.
- Do not expose API keys, tokens, or session data.
- Do not expose raw `UserHealthContext`.
- Do not expose raw OpenAI payloads.
- Do not expose raw memory summaries or raw memory state objects.
- Do not mutate conversations or debug records.
- Keep the endpoint deterministic.
- Treat memory preview as part of the deterministic conversational memory layer, not semantic memory.
