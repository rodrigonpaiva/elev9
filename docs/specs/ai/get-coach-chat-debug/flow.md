# Flow

```txt
AuthSessionGuard
→ Resolve authUserId
→ Resolve UserProfile
→ Build UserHealthContext
→ Read memory debug preview
→ Read recent debug chat history
→ Read prompt debug snapshot
→ Read reply-path debug snapshot
→ Assemble sanitized debug index
→ Return response
```

## Rules

- the endpoint is inspection-only
- no persistence occurs
- no external LLM execution occurs
- no memory recalculation occurs
- recent history is truncated
- prompt data remains sanitized
- memory preview remains summarized and inspection-only
