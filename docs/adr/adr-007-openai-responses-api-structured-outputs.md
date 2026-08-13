# ADR-007 — OpenAI Responses API & Structured Outputs

## Status

Accepted

## Context

Elev9 already had an optional OpenAI-backed coach reply path protected by safety, reliability, and observability layers. The provider still used the legacy chat-completions contract and parsed free-form assistant text directly at the provider boundary.

That approach was functional, but it was not the best fit for newer OpenAI models such as GPT-5.5, and it left response validation spread too close to the transport layer.

The platform needed a modernization step that:

- kept the public API and mobile contracts unchanged
- preserved deterministic fallback behavior
- reduced free-form parsing risk
- created a single place to validate and normalize model responses
- exposed provider capability metadata for future feature gating

## Decision

Migrate the internal OpenAI integration to the Responses API while keeping the external Elev9 contract stable.

The provider now:

- calls the OpenAI Responses API
- requests structured JSON output for coach replies
- uses a centralized parser to validate the response and extract assistant text
- normalizes token usage into the existing internal usage model
- rejects malformed responses and falls back deterministically through the existing reliability path
- exposes capability metadata such as structured-output support, streaming support, tool-calling support, and image-input support

The application continues to expose plain coach text to the rest of the backend and mobile app.

## Pipeline

```txt
Controller
→ Use Case
→ Prompt Builder
→ Safety Layer
→ Reliability Layer
→ OpenAI Provider
→ OpenAI Responses API
→ Centralized Response Parser
→ Deterministic Fallback when needed
```

## Consequences

### Positive

- GPT-5.5 and future OpenAI model families can be adopted through `OPENAI_MODEL`
- response validation is centralized instead of scattered across application code
- structured outputs reduce malformed reply risk
- the provider remains an internal adapter, so no controller, DTO, or mobile changes are required
- capability metadata gives the backend a clean extension point for future streaming, tools, and multimodal support

### Negative

- the provider boundary is now more explicit and slightly more opinionated
- the reply path depends on structured output compliance rather than free-form text
- unsupported model names now fail fast during configuration validation

## Trade-offs

Using structured outputs improves reliability and parsing correctness, but it also means the provider must reject malformed model output instead of trying to recover from it in multiple places.

That trade-off is intentional. Recovery already exists in the deterministic fallback path, so the system does not need to tolerate ambiguous provider output.

## Future Extensions

This decision leaves room for:

- tool calling
- multimodal input
- richer structured payloads
- provider-specific capability routing
- prompt/versioned schema evolution

Those are future integrations, not current product behavior.
