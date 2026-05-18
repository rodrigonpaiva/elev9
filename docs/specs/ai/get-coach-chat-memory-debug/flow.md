# Flow

```txt
AuthSessionGuard
→ Resolve authUserId
→ Resolve UserProfile
→ Resolve latest CoachConversation
→ Read CoachConversationMemory
→ Build sanitized memory preview
→ Return response
```

## Rules

- the endpoint is inspection-only
- no persistence occurs
- no external LLM execution occurs
- no memory recalculation occurs
- memory preview stays summarized and sanitized
