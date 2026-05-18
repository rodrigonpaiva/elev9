# Rules — Get Coach Chat History

## Authentication

- o endpoint exige sessão autenticada
- `authUserId` vem exclusivamente da sessão

## Isolation

- o histórico pertence somente ao usuário autenticado
- mensagens de outros usuários não podem ser expostas

## Ordering

- a resposta é cronológica
- o cliente não controla a semântica de ordenação

## Limits

- `limit` é opcional
- `limit` default = `50`

## Safety

- não fazer claims médicos
- não criar memória longa
- não criar replay
- não criar streaming
- não expor dados sensíveis
