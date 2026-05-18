# Errors — Create Coach Chat

## Known Error Codes

- `AUTH_INVALID_SESSION`
- `USER_PROFILE_NOT_FOUND`
- `AI_CHAT_INVALID_INPUT`
- `AI_CHAT_INTERNAL_ERROR`

## Error Semantics

- `AUTH_INVALID_SESSION`: a sessão do usuário é inválida ou expirou
- `USER_PROFILE_NOT_FOUND`: não foi possível resolver o perfil do usuário autenticado
- `AI_CHAT_INVALID_INPUT`: o payload não contém `message` válido
- `AI_CHAT_INTERNAL_ERROR`: falha interna na persistência ou geração determinística da resposta
