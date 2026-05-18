# Flow — Get Coach Chat History

## 1. Authenticate request

O endpoint valida a sessão com `AuthSessionGuard`.

## 2. Resolve user profile

O fluxo resolve `UserProfile` usando `authUserId`.

## 3. Load conversation

O sistema carrega a conversa do usuário autenticado.

## 4. Load messages

O fluxo lê `CoachMessage` da conversa com limite configurável.

## 5. Order results

As mensagens são retornadas em ordem cronológica.

## 6. Return response

O endpoint retorna uma lista simples com:

- `role`
- `content`
- `createdAt`

## 7. Safety fallback

Quando não houver conversa ou mensagens, o fluxo retorna `[]`.
