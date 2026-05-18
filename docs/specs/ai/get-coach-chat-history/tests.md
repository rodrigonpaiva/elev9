# Tests — Get Coach Chat History

## Coverage

- retorna histórico autenticado com sucesso
- aplica ordenação cronológica
- respeita `limit` default
- retorna `[]` quando não houver mensagens
- isola mensagens por usuário
- rejeita corpo inválido
- protege o endpoint com autenticação
- mantém payload reduzido e seguro
