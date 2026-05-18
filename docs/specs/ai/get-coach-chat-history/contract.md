# Contract — Get Coach Chat History

## Endpoint

`GET /ai/chat/history`

## Query

```ts
{
  limit?: number;
}
```

## Response

```ts
Array<{
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}>;
```

## Notes

- o endpoint é autenticado
- o histórico pertence apenas ao usuário autenticado
- as mensagens são retornadas em ordem cronológica
- o payload é reduzido e seguro
