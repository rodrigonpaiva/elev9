# Flow

```txt
AuthSessionGuard
→ Resolve authUserId
→ Resolve UserProfile
→ Build UserHealthContext
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
- recent history is truncated
- prompt data remains sanitized
