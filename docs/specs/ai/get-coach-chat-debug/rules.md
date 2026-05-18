# Rules

- Use `AuthSessionGuard`.
- Resolve data only for the authenticated user.
- Do not expose raw prompts.
- Do not expose API keys, tokens, or session data.
- Do not expose raw `UserHealthContext`.
- Do not expose raw OpenAI payloads.
- Do not mutate conversations or debug records.
- Keep the endpoint deterministic.
