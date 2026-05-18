# Contract — Create Coach Chat

## Endpoint

`POST /ai/chat`

## Request

```ts
{
  message: string;
}
```

## Response

```ts
{
  conversationId: string;
  reply: string;
}
```

## Notes

- o endpoint é autenticado
- o cliente não envia contexto adicional
- a resposta é gerada de forma determinística com base no contexto do usuário
- `CoachConversation` e `CoachMessage` são persistidos internamente
