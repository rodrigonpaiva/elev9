# Sprint 4 — Operação e LLM em produção

## Objetivo e escopo

Este documento registra o diagnóstico operacional inicial da Sprint 4. A análise cobre configuração por ambiente, secrets, LLM/Coach, limites de uso e custo, confiabilidade, observabilidade, health/readiness, MongoDB, rate limiting, múltiplas réplicas, TLS, procedimentos de incidente e dependências externas.

Nenhum código funcional, infraestrutura, contrato público ou configuração de ambiente foi alterado nesta etapa. Valores de secrets, tokens, credenciais e dados pessoais não são reproduzidos.

## Ambientes analisados

| Ambiente        | Evidência disponível                                                  | Situação operacional                                                                                                         |
| --------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Desenvolvimento | `.env.example`, `apps/mobile/.env.example`, Nx e Docker Compose local | Configurado para Mongo local, JWT conveniente, CORS local, rate limit em memória e LLM/agent desabilitados por padrão.       |
| Teste/CI        | Targets Nx, Jest e E2E com `MongoMemoryServer`                        | API e E2E funcionais no host autorizado; Mongo é efêmero. Não há evidência de secrets de CI, alertas ou restore de backup.   |
| Pré-produção    | `.env.docker.example` como referência                                 | Não há manifestos, secret store, deployment target, réplica, Redis ou provedor de observabilidade aprovados no workspace.    |
| Produção        | `.env.docker.example` como referência                                 | Não há evidência de ambiente implantado, identidade de serviço, rotação de secrets, backup/restore validado, SLO ou on-call. |

Classificação: **S4-OPS-01 crítico** — pré-produção e produção não possuem evidência operacional suficiente para um go-live controlado.

## Matriz de variáveis e secrets

| Grupo           | Variáveis observadas                                                  | Sensibilidade                           | Estado / gap                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime         | `NODE_ENV`, `PORT`, `MONGODB_URI`                                     | URI pode conter credenciais             | Exemplos locais usam conexão sem autenticação; a origem segura e a política TLS de produção não estão comprovadas.                                           |
| Autenticação    | `JWT_SECRET`                                                          | Secret crítico                          | O bootstrap fail-closed fora de desenvolvimento está implementado; secret manager, rotação e issuer/audience de produção não estão evidenciados.             |
| CORS/internal   | `CORS_ALLOWED_ORIGINS`, `INTERNAL_ENDPOINTS_ENABLED`                  | Configuração de acesso                  | Allowlist e gating interno existem; valores aprovados por ambiente e revisão de mudança são externos ao repositório.                                         |
| Rate limiting   | `RATE_LIMIT_ENABLED`, `RATE_LIMIT_STORE`                              | Controle operacional                    | Backend em memória é adequado apenas para desenvolvimento/testes; Redis distribuído não está disponível/aprovado.                                            |
| Observabilidade | `OBSERVABILITY_*`                                                     | Pode transportar metadados operacionais | Configuração OTLP e redaction existem; collector local exporta para `debug`, sem backend, dashboards, alertas ou retenção externa comprovados.               |
| LLM             | `AI_LLM_ENABLED`, `AI_LLM_PROVIDER`, `OPENAI_MODEL`, `OPENAI_API_KEY` | API key é secret crítico                | API key é exigida quando LLM está habilitado; as variáveis LLM não estão completas nos exemplos de ambiente Docker e não há secret store/deploy evidenciado. |
| LLM rollout     | `AI_LLM_*`, `AI_PROMPT_*`, `AI_COACH_*`                               | Configuração e metadados                | Canary, prompt version, timeout, retry, circuit, streaming, token/custo e agent flags existem no código, mas não há política aprovada por ambiente.          |
| Mobile          | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEMO_MODE`                        | URL/configuração pública                | Não são secrets; requerem matriz de endpoints por Web/Android/iOS e validação de produção.                                                                   |

Risco: **S4-OPS-02 alto** — não existe inventário aprovado de secrets, owners, rotação, expiração, recuperação ou configuração por ambiente para produção.

## Matriz de riscos operacionais

| ID        | Classificação        | Achado                                                                                                                                                                                     | Impacto                                                                                  | Recomendação / critério de encerramento                                                                        |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| S4-OPS-01 | Crítico              | Não há deployment, secret manager, SLO, on-call ou evidência de pré-produção/produção versionados/aprovados.                                                                               | Impossibilidade de provar operação, rollback e resposta a incidente.                     | Registrar ambiente real, owners, pipeline, SLO, rollback e aprovação de release.                               |
| S4-OPS-02 | Alto                 | Secrets de Mongo, JWT e OpenAI não possuem origem, rotação e auditoria operacionais comprovadas.                                                                                           | Comprometimento de auth, dados e consumo LLM.                                            | Secret manager, identidade de serviço, rotação e teste de ausência/expiração.                                  |
| S4-OPS-03 | Crítico              | Docker Compose publica Mongo em `27017`, sem credenciais/TLS e sem evidência de rede privada.                                                                                              | Acesso direto pode contornar a API e expor dados de saúde/autenticação.                  | Mongo gerenciado/privado, auth, TLS, ACL mínima, sem publicação pública e teste de conectividade restrita.     |
| S4-OPS-04 | Alto                 | Não há backup/restore, RPO/RTO, retenção ou teste de restauração comprovados.                                                                                                              | Perda de dados e recuperação não determinística.                                         | Política aprovada, backup criptografado, restore periódico e evidência de RPO/RTO.                             |
| S4-OPS-05 | Alto                 | Collector existe localmente, mas não há backend externo de métricas/logs/traces, dashboards, alertas ou routing.                                                                           | Falhas LLM, 5xx, custo e degradação podem não gerar ação operacional.                    | Provisionar backend, dashboards, alertas sintéticos e owners/on-call.                                          |
| S4-OPS-06 | Alto                 | O LLM possui timeout padrão de 15s, até 2 retries, circuit breaker após 5 falhas e fallback, mas não há política de SLO, erro aceitável ou alerta em produção.                             | Latência, custo de retries e degradação podem afetar usuários sem contenção operacional. | Aprovar SLOs, budgets de timeout/retry, alertas de fallback/circuit e runbook.                                 |
| S4-OPS-07 | Alto                 | Limites de custo por request e tokens são opcionais; não há quota/budget por usuário, tenant ou período.                                                                                   | Abuso ou crescimento de uso pode gerar custo não controlado.                             | Tornar limites obrigatórios para produção, medir uso por rota/política sem PII e definir budget owner.         |
| S4-OPS-08 | Médio                | `AI_LLM_MAX_PROMPT_TOKENS`, `AI_LLM_MAX_COMPLETION_TOKENS` e `AI_LLM_MAX_REQUEST_COST` só bloqueiam após uso observado; não há evidência de limite de contexto antes do envio ao provider. | Requests grandes podem consumir latência/custo antes da rejeição.                        | Definir limite pré-request de contexto e validar por modelo/provedor.                                          |
| S4-OPS-09 | Médio                | Circuit breaker, rate limit e traces são locais ao processo; múltiplas réplicas não compartilham estado.                                                                                   | Falhas e abuso podem atravessar réplicas; métricas ficam incompletas.                    | Redis aprovado para rate limit e estado distribuído somente após TLS, timeout, health e fail-closed definidos. |
| S4-OPS-10 | Médio                | Health/readiness cobre API e Mongo, mas não há verificação operacional de LLM, collector ou Redis.                                                                                         | Deploy pode ser considerado pronto enquanto dependências críticas estão indisponíveis.   | Separar liveness/readiness/dependency checks sem fazer o health depender de chamada LLM síncrona.              |
| S4-OPS-11 | Médio                | `.env.docker.example` não documenta todo o conjunto de variáveis LLM/observabilidade e usa Mongo sem auth.                                                                                 | Drift entre ambientes e ativação parcial/insegura.                                       | Matriz de configuração aprovada, validação de startup e configuração gerenciada por ambiente.                  |
| S4-OPS-12 | Médio                | Fallback é determinístico e instrumentado, mas não há procedimento formal de incidente para provider, prompt/safety, custo ou indisponibilidade.                                           | Respostas inconsistentes e escalonamento lento.                                          | Runbooks por cenário, owner, severidade, comunicação e rollback.                                               |
| S4-OPS-13 | Baixo                | Traces, relatórios e métricas LLM/agent usam retenção e limites em memória, com perda em restart.                                                                                          | Diagnóstico histórico e auditoria ficam incompletos.                                     | Exportação agregada e retenção aprovada, preservando redaction.                                                |
| S4-OPS-14 | Informativo          | Configurações locais têm defaults seguros para LLM/agent desabilitados e observabilidade desligada.                                                                                        | Reduz risco local, mas não prova segurança de produção.                                  | Manter defaults e exigir ativação explícita por ambiente.                                                      |
| S4-OPS-15 | Informativo          | Testes unitários cobrem parsing, timeout/retry/circuit/fallback, custo e métricas internas; não cobrem operação externa.                                                                   | Boa evidência de código, sem evidência de plataforma.                                    | Complementar com testes de staging, alertas sintéticos e restore.                                              |
| S4-OPS-16 | Dependência externa  | Redis, secret manager, Mongo gerenciado, provedor OTLP/metrics/alerts e OpenAI são dependências não provisionadas/aprovadas neste workspace.                                               | Bloqueia operação distribuída e governança externa.                                      | Owners, ambiente, credenciais, SLA, TLS, health, custo e critérios de aceite definidos externamente.           |
| S4-OPS-17 | Decisão arquitetural | Definir modelo de custo/quota por usuário, semântica de fallback, SLO LLM, retenção de traces e dependência aceitável do provider.                                                         | Sem decisão, não há budget nem contrato operacional de produção.                         | ADR/aprovação de Produto, Plataforma, Segurança e SRE antes do rollout amplo.                                  |

Contagem: **2 críticos, 5 altos, 5 médios, 1 baixo, 2 informativos, 1 dependência externa e 1 decisão arquitetural**.

## Riscos específicos do LLM

### Configuração e modelos

O provider padrão é OpenAI e o modelo padrão é `gpt-4.1-mini`; a configuração valida modelo suportado e exige `OPENAI_API_KEY` quando `AI_LLM_ENABLED=true`. O rollout suporta provider/modelo anterior, versão de prompt, experimento e canary, mas não existe evidência de uma matriz aprovada de modelo, região, retenção, capacidade ou custo por ambiente.

### Timeout, retries, circuit breaker e fallback

Os defaults observados são timeout de 15.000 ms, até 2 retries, threshold de 5 falhas e reset de 60.000 ms. O retry usa backoff e não repete streaming após delta emitido; o circuit breaker é local ao processo. Falhas de provider, timeout, guardrails, circuito aberto e LLM desabilitado retornam caminho de fallback. É necessário definir o SLO de latência, o orçamento de retries, a taxa aceitável de fallback e alertas de circuito aberto.

### Tokens, contexto e custo

Há `AI_LLM_MAX_RESPONSE_CHARS` com default de 4.000, limites opcionais de prompt/completion tokens e custo máximo por request, além de custo estimado por 1k tokens quando preços são configurados. O uso é agregado nos relatórios internos, não há quota por usuário/período comprovada e o limite de custo é aplicado após a observação do uso. A ativação em produção exige budgets, limites pré-request, medição agregada por rota/coorte e proteção contra abuso em múltiplas réplicas.

### Segurança e dados

Redaction evita tokens, emails, IDs pessoais, prompts e contexto bruto em logs/traces cobertos. Ainda é necessária decisão de retenção e classificação de dados enviados ao provider, especialmente saúde, treino, recovery e nutrição. Nenhum payload ou secret é reproduzido neste diagnóstico.

## Observabilidade, correlação e alertas

O runtime possui `requestId`, logs sanitizados, métricas internas de `429`, observabilidade LLM/agent/recovery/nutrição e integração OTLP opcional. O collector local expõe endpoints somente em loopback para portas OTLP/health, mas exporta para `debug`; não há backend externo, dashboard, alert routing, pager, SLO ou teste sintético de alerta comprovado.

Sinais mínimos para produção:

- disponibilidade e latência por rota, status 5xx/4xx e readiness;
- rate limit `429`, rejeições de safety, timeout, retry, circuito aberto e fallback LLM;
- tokens, custo estimado, limite atingido e uso agregado por rota/coorte sem PII;
- Mongo latency/errors, pool saturation, backup age e restore result;
- Redis availability/latency/errors quando aprovado;
- correlação por `requestId`/trace id sanitizado, com redaction preservada.

## Health, readiness e dependências

`/health` é liveness básico. `/health/ready` verifica o estado da conexão Mongo e, na implementação atual do módulo de health, também há verificação de ping do banco. Não deve haver chamada LLM síncrona no readiness; dependências externas devem ter sinais separados, timeouts e política explícita para não impedir rollback ou recuperação.

## MongoDB, backup e restore

O Compose local usa MongoDB com volume persistente, porta publicada e sem autenticação/TLS. Isso é aceitável apenas como referência de desenvolvimento controlado, não como topologia de produção. Antes do rollout são necessários Mongo privado/gerenciado, autenticação, TLS, usuário de aplicação com privilégio mínimo, criptografia em repouso, backup automático criptografado, retenção, point-in-time recovery quando disponível, RPO/RTO, teste de restore e runbook de corrupção/indisponibilidade.

## Rate limiting e múltiplas réplicas

O rate limiting global possui políticas, `429`, headers e métricas seguras, mas o backend atual é em memória. `RATE_LIMIT_STORE=redis` falha explicitamente porque Redis não foi provisionado nem aprovado. Em múltiplas réplicas, limites, circuitos e métricas não são agregados. Redis deve permanecer bloqueado até haver endpoint privado, TLS, credenciais/ACL, timeout, reconnect, health, fail-closed/fail-open aprovado e testes de concorrência/TTL.

## Procedimentos de incidente

Existem runbooks de rollout/observabilidade e orientação de rollback, mas não há evidência de owners nominais, canal de incidente, pager, autoridade de rollback ou exercício executado. Devem existir procedimentos para: provider LLM indisponível, custo anômalo, prompt/safety incident, Mongo indisponível, backup/restore, Redis indisponível, degradação de 5xx/latência e exposição de dados. Tickets nunca devem conter payloads, prompts, tokens ou dados de saúde.

## Critérios de aceite para operação de produção

- Ambientes de staging/produção identificados, com owners, pipeline, rollback e secrets gerenciados.
- Mongo autenticado, TLS, rede privada, privilégio mínimo e restore testado dentro do RPO/RTO.
- LLM com modelo/provider aprovados, API key em secret manager, SLO, timeout/retry/circuit/fallback e limites de contexto/custo obrigatórios.
- Quotas por usuário/coorte e alertas de custo/uso definidos.
- Redis distribuído provisionado e validado antes de múltiplas réplicas.
- Dashboards, alertas, routing e testes sintéticos externos provisionados.
- Logs/traces/métricas sem dados sensíveis, com correlação operacional preservada.
- Runbooks, on-call, incident commander e autoridade de rollback definidos e exercitados.

## Primeiro lote seguro de implementação

1. Formalizar a matriz de configuração por ambiente e o inventário de secrets, sem incluir valores no repositório.
2. Adicionar validação operacional de startup para configurações LLM de produção e documentação de limites obrigatórios, sem alterar comportamento funcional dos endpoints.
3. Definir sinais, SLOs, budgets, alertas e runbooks para LLM/Mongo/rate limiting, usando apenas métricas redacted já disponíveis.
4. Provisionar, em ambiente autorizado, observabilidade externa e backup/restore de Mongo antes de qualquer rollout amplo.
5. Aprovar Redis e só então implementar o adapter distribuído e a validação de múltiplas réplicas.

## Implementação do primeiro lote

### Ambientes e validação de startup

Foi adicionada validação central em `apps/api/src/config/runtime.config.ts`, executada antes da montagem do `AppModule`. Os ambientes aceitos são `development`, `test`, `ci`, `preproduction` (incluindo `staging`) e `production`.

Fora de `development`, `test` e `ci`, o bootstrap exige `JWT_SECRET`, `MONGODB_URI`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_ENABLED` e `RATE_LIMIT_STORE`. Quando `AI_LLM_ENABLED=true`, exige também `OPENAI_API_KEY` e os limites operacionais do LLM. Erros contêm apenas o nome da configuração, nunca o valor, URI, secret ou token.

Defaults locais continuam disponíveis somente para desenvolvimento/testes/CI explicitamente definidos. Não foram inventados valores de produção nem adicionados secret managers, Redis, Mongo gerenciado ou serviços externos.

### Inventário de configuração do lote

| Variável                                                 | Ambientes                                                   | Obrigatória                                     | Origem esperada                                      | Sensibilidade               | Ausente / inválida                                | Owner                |
| -------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | --------------------------- | ------------------------------------------------- | -------------------- |
| `JWT_SECRET`                                             | pre-production, production                                  | Sim                                             | secret manager aprovado                              | Secreta                     | Falha no startup                                  | Plataforma/Segurança |
| `MONGODB_URI`                                            | todos                                                       | Sim                                             | configuração do ambiente; secret manager em produção | URI potencialmente sensível | Falha no startup                                  | Plataforma/Dados     |
| `CORS_ALLOWED_ORIGINS`                                   | pre-production, production                                  | Sim                                             | configuração versionada/aprovada                     | Controle de acesso          | Falha no startup; wildcard rejeitado              | Plataforma           |
| `RATE_LIMIT_ENABLED`, `RATE_LIMIT_STORE`                 | pre-production, production                                  | Sim                                             | configuração operacional                             | Controle de abuso           | Falha no startup; Redis continua não provisionado | Plataforma/Segurança |
| `OPENAI_API_KEY`                                         | quando LLM habilitado                                       | Sim                                             | secret manager aprovado                              | Secreta                     | Falha de configuração                             | Plataforma/IA        |
| `AI_LLM_MAX_CONTEXT_CHARS`, `AI_LLM_MAX_PROMPT_CHARS`    | quando LLM habilitado; explícitas fora de ambientes seguros | Sim fora de dev/test/CI                         | configuração aprovada por modelo                     | Limite operacional          | Falha no startup ou fallback seguro               | IA/SRE               |
| `AI_LLM_MAX_COMPLETION_TOKENS`, `AI_LLM_TIMEOUT_MS`      | quando LLM habilitado; explícitas fora de ambientes seguros | Sim fora de ambientes seguros                   | configuração aprovada por modelo                     | Limite operacional          | Falha no startup                                  | IA/SRE               |
| `AI_LLM_MAX_REQUESTS_PER_USER`, `AI_LLM_QUOTA_WINDOW_MS` | quando LLM habilitado; explícitas fora de ambientes seguros | Sim fora de ambientes seguros                   | política de abuso aprovada                           | Limite operacional          | Falha no startup; quota retorna `429`             | Segurança/SRE        |
| `REDIS_*`, `BACKUP_*`, URLs externas de observabilidade  | pre-production, production                                  | Dependência externa, não habilitadas neste lote | provisionamento aprovado                             | Potencialmente sensível     | Sem fallback fictício; bloqueadas até aprovação   | Plataforma/SRE       |

### Limites e comportamento do LLM

Os defaults seguros para desenvolvimento/testes são: contexto máximo de 10.000 caracteres, prompt máximo de 12.000 caracteres, saída de 800 tokens, timeout de 15.000 ms, quota de 20 requisições por usuário e janela de 60.000 ms. Em pré-produção/produção, esses valores precisam ser fornecidos explicitamente quando o LLM estiver habilitado e são validados por faixa segura.

O limite de contexto/prompt é aplicado antes do provider: a solicitação é bloqueada, recebe fallback determinístico e não envia o conteúdo excedente ao LLM. O limite de saída é enviado ao provider OpenAI (`max_output_tokens`) e continua protegido pela validação de resposta/uso existente. A quota reutiliza a política global `ai.chat`, com chave já anonimizada por IP + usuário; excedentes retornam `429` com os headers existentes. O health check permanece excluído.

Falhas de provider, timeout, circuito aberto, safety ou limite de entrada seguem o fallback já existente. Nenhum prompt, token, dado de saúde ou secret é registrado.

### Testes e validações do lote

- `runtime.config.spec.ts`: ausência de secret, defaults apenas em ambiente seguro, limites obrigatórios e configuração inválida.
- `rate-limit.config.spec.ts`: quota LLM configurável e independente das demais políticas.
- `ai-safety.service.spec.ts`: bloqueio de contexto/prompt acima do limite.
- `openai-llm.provider.spec.ts`: limite de saída encaminhado ao provider.
- Suítes LLM, segurança e rate limiting direcionadas: aprovadas.
- API: 231 suítes e 1.407 testes aprovados; a integração de rate limiting não pôde abrir `0.0.0.0` neste sandbox (`listen EPERM`), limitação ambiental já conhecida, sem falha funcional reproduzível.

### Riscos residuais e próximo lote

O backend de rate limiting continua em memória e não suporta múltiplas réplicas; Redis permanece dependência externa não aprovada. Também continuam fora deste lote backups/restore, secret manager, alertas externos, SLOs e classificação de dados enviados ao provider. O próximo lote recomendado é aprovar a topologia operacional de pré-produção (secrets, Mongo, observabilidade e Redis) antes de qualquer habilitação distribuída.

## Segundo lote: resiliência operacional do LLM

### Política aplicada

- Timeout global máximo: 15.000 ms, compartilhado por todas as tentativas e backoff.
- Retries: no máximo 3 configurados; default atual 2.
- Backoff: exponencial de 250 ms, 500 ms e 1.000 ms, com jitter de até 100 ms; uma nova tentativa só ocorre se houver tempo restante no timeout global.
- Elegíveis para retry: timeout, falhas de rede e indisponibilidade transitória do provider, incluindo respostas 5xx.
- Sem retry: cancelamento do cliente, autenticação/permissão, payload inválido, erro de configuração, guardrail, content filter e quota/rate limit (`429`).

O circuito abre após o limiar configurado de falhas, permanece aberto durante `AI_LLM_CIRCUIT_RESET_MS` (default 60.000 ms), permite uma única sonda half-open e fecha após sucesso. Uma falha na sonda reabre o circuito. Retries são interrompidos quando a abertura ocorre.

### Fallback e observabilidade

O fallback público permanece o mesmo: o serviço de confiabilidade registra o evento com `requestId`, código seguro e contagem de tentativas, e devolve o caminho `null` já consumido pelo orquestrador do Coach. O circuito aberto, timeout, erro transitório esgotado e erros não elegíveis não expõem causa interna, prompt, tokens, credenciais ou dados de saúde.

`requestId` é mantido entre todas as tentativas, retry, circuit breaker e fallback. Logs e métricas registram somente rota lógica/provider/modelo controlados, código de erro, janela, duração e contagem; conteúdos e mensagens brutas do provider não são registrados.

O circuit breaker continua local ao processo. Em múltiplas réplicas, cada instância pode abrir em momentos diferentes e o estado não é compartilhado; Redis ou outro armazenamento distribuído permanece fora deste lote e não foi habilitado.

### Testes do segundo lote

- timeout global não excede o limite mesmo com retries/backoff;
- retry de falha transitória e limite máximo de tentativas;
- backoff e propagação de `requestId`;
- erro permanente e quota `429` sem retry;
- abertura, half-open, sonda e fallback do circuit breaker;
- timeout de configuração acima de 15 segundos e retries acima do máximo rejeitados;
- testes existentes de safety continuam impedindo chamadas para contexto/prompt acima do limite;
- logs/observabilidade permanecem sanitizados.
- API completa: 231 suítes, 1.411 testes aprovados; 3 testes da integração HTTP permanecem bloqueados pelo `listen EPERM` no bind `0.0.0.0`.
- API build, types build, `api-client` (9 suítes/47 testes), lint, formatação direcionada e `git diff --check`: aprovados.
- E2E oficial: 23 suítes/81 testes bloqueados antes da execução funcional pelo mesmo `EPERM` do MongoMemoryServer no ambiente atual; executar no host autorizado.

### Riscos residuais e próximo lote recomendado

O estado local do circuito não oferece coordenação entre réplicas. O provider externo ainda depende de SLO, orçamento de custo, alertas e runbook aprovados. Recomenda-se como próximo lote implementar health/readiness operacional e sinais agregados de latência, timeout, retry, circuit open, fallback e custo, sem expor dados sensíveis e sem provisionar Redis nesta etapa.

## Terceiro lote: observabilidade operacional do LLM

### Métricas e eventos

O relatório agregado em memória do `AiLlmObservabilityService` passou a registrar requisições, sucessos, falhas, retries, safety blocks, fallbacks, circuit breaker aberto, quota excedida, timeouts, latência total/média/P95, tokens de entrada/saída quando disponíveis, custo estimado e uso por provider/modelo. A métrica de `429` continua sendo emitida pelo `RateLimitMetrics`, agrupada por política e método, sem chave de usuário ou IP.

As categorias de erro são estáveis e de baixa cardinalidade: `validation`, `authentication`, `quota`, `timeout`, `provider_unavailable`, `provider_error`, `circuit_open`, `fallback` e `configuration`. O `requestId` é preservado nos eventos e lifecycle.

Os logs estruturados incluem `event`, `operation=llm`, `requestId`, resultado, duração, retry, fallback, categoria e sinal agregado de autenticação. `conversationId` e `userIdHash` não são serializados nos logs; prompts, respostas, tokens em claro, emails, IPs, credenciais e dados de saúde permanecem excluídos. Tokens aparecem somente como contagens agregadas no relatório interno.

### Cardinalidade e alertas

As métricas devem usar somente rota/operação lógica, método, provider/modelo controlados, categoria, status e janela. Não devem usar `requestId`, usuário, conversa, email ou IP como labels. Os alertas definidos são:

- aumento de `timeout` e latência P95;
- aumento de `provider_unavailable`/`provider_error`;
- crescimento de `429`/`quota`;
- qualquer crescimento sustentado de `circuit_open`;
- custo estimado acima do budget aprovado;
- ausência de eventos de sucesso/latência durante tráfego esperado;
- falha de MongoDB ou readiness.

Esses alertas estão documentados, mas não estão ativos: o workspace não possui backend externo de métricas, dashboards, regras, pager ou routing aprovados. O armazenamento atual é local/em memória e é perdido no restart; a operação distribuída requer provisionamento externo e configuração segura, ainda fora do escopo.

### Testes e riscos residuais

Foram adicionados testes para categorias de erro, sucesso/falha, fallback, quota, preservação de `requestId` e ausência de identificadores sensíveis nos logs. Os testes direcionados passaram: 2 suítes/9 testes para observabilidade e rate limit. A API build, `api-client` (9 suítes/47 testes), lint e `git diff --check` passaram; a API completa teve 231 suítes/1.412 testes aprovados e 3 testes bloqueados pelo bind `EPERM` do ambiente. O E2E permanece dependente do host autorizado/MongoDB real, sem execução funcional neste ambiente.

Permanecem como riscos a perda de métricas em reinício, a ausência de alertas ativos e a falta de agregação entre réplicas. O próximo lote recomendado é definir e validar health/readiness operacional e exportação para um backend aprovado, sem alterar contratos públicos.

## Quarto lote: health checks e readiness operacionais

### Endpoints e responsabilidades

O `HealthModule` ativo expõe `GET /health` e `GET /health/ready`.

- `/health` é liveness: responde apenas com o estado do processo (`status=ok`, serviço e timestamp). Não consulta MongoDB, LLM, Redis ou qualquer dependência externa.
- `/health/ready` é readiness: executa um `ping` administrativo no MongoDB, valida a configuração LLM conhecida sem chamar o provider e mantém Redis como `not_required` quando o backend em memória está selecionado. O status HTTP é `200` somente quando as dependências essenciais estão prontas; falhas retornam `503` com um payload operacional sem detalhes internos.

O payload de readiness preserva `mongo` e acrescenta estados controlados de `configuration`, `llm` e `redis`: `valid/invalid`, `disabled/configured/misconfigured` e `not_required/not_configured`. Nenhuma resposta inclui URI, host privado, credencial, mensagem bruta de driver ou erro do provider.

### Dependências, timeout e falhas

`HEALTH_MONGO_TIMEOUT_MS` é opcional, limitado a 5.000 ms e usa 1.000 ms por default. O ping é cancelado logicamente após o timeout; o request não fica aguardando indefinidamente. Falhas de conexão, timeout e autenticação Mongo são deliberadamente reduzidas a `mongo=down` na resposta, evitando revelar a topologia ou credenciais. A distinção detalhada deve ser feita somente em telemetria sanitizada futura.

Configuração obrigatória é validada antes da montagem do `AppModule`; portanto, ausência de `MONGODB_URI` ou secret obrigatório provoca falha de startup, não uma readiness falsamente positiva. Se `AI_LLM_ENABLED=true` sem `OPENAI_API_KEY`, a readiness fica `503` e marca apenas `llm=misconfigured`; nenhuma chamada real ao LLM é feita. Se `RATE_LIMIT_STORE=redis` for selecionado sem adapter aprovado, o bootstrap falha explicitamente e a implementação de health não declara Redis pronto (`redis=not_configured`). Redis não foi provisionado.

### Graceful shutdown

`app.enableShutdownHooks()` mantém o encerramento ordenado do Nest/Mongoose e dos providers. `GRACEFUL_SHUTDOWN_TIMEOUT_MS` é opcional, tem default de 10.000 ms e limite de 30.000 ms; em `SIGTERM`/`SIGINT`, uma guarda final fecha conexões HTTP keep-alive após o prazo, enquanto o ciclo normal aguarda hooks e requisições em andamento. O provider de observabilidade já possui timeout próprio para preservar o encerramento sem bloqueio indefinido. O timeout não é usado para interromper chamadas de negócio de forma silenciosa.

### Testes e validação

Foram adicionados/ajustados testes para liveness independente de dependências, readiness com Mongo disponível/indisponível, timeout do ping, configuração LLM inválida sem chamada ao provider, Redis não provisionado e ausência de detalhes internos no payload. Os testes E2E de health foram atualizados para os checks operacionais.

Os testes unitários do módulo de health passaram. A execução completa da API teve 231 suítes e 1.415 testes aprovados; 3 testes de integração permanecem bloqueados por `listen EPERM` ao tentar bindar `0.0.0.0` neste sandbox, sem falha funcional reproduzível do health. O build da API e seus projetos dependentes passou. A suíte E2E oficial foi executada e terminou com 23 suítes/81 testes bloqueados antes da execução funcional pelo `MongoMemoryServer` (`listen EPERM`, bind `0.0.0.0`); deve ser repetida no host autorizado.

### Limitações e próximo lote

Não há chamada sintética ao LLM, Redis ativo, backend de métricas externo, distinção operacional detalhada de autenticação Mongo na resposta ou garantia de shutdown coordenado entre múltiplas réplicas. O próximo lote recomendado é validar os endpoints em host autorizado e conectar os sinais sanitizados de readiness, Mongo, LLM e shutdown a um backend de observabilidade aprovado, sem provisionar dependências implicitamente.

## Quinto lote: backup, restore e recuperação do MongoDB

### Diagnóstico e decisão

O `docker-compose.yml` local usa MongoDB 7, banco `elev9`, volume persistente `mongo-data`, porta `27017` publicada e health check de `ping`. A URI do Compose não possui autenticação ou TLS, portanto o Compose é apenas uma referência de desenvolvimento controlado. Foram encontrados 32 schemas Mongoose com índices de ownership, unicidade e histórico; não há script de backup/restore, política de retenção, storage de backup ou secret manager no workspace.

As ferramentas `mongodump`, `mongorestore` e `mongosh` não estão instaladas neste host. Não existe infraestrutura aprovada para backup externo, Mongo gerenciado, criptografia de artefatos ou retenção. Por isso, nenhum backup/restore real foi executado e nenhum volume, banco ou documento foi apagado ou sobrescrito.

O runbook reproduzível está em [mongodb-backup-restore-runbook.md](../operations/mongodb-backup-restore-runbook.md). Os scripts `scripts/operations/mongodb-backup.sh` e `scripts/operations/mongodb-restore-isolated.sh` exigem ferramentas oficiais, URI somente por variável de ambiente, parâmetros explícitos, `umask 077` e falham diante de configuração incompleta. Backup recusa diretório existente; restore automatizado só aceita `RESTORE_ENVIRONMENT=isolated-test`, banco destino prefixado `restore_` e confirmação descartável. Produção é bloqueada pelo script.

### Política, RPO/RTO e validação

Frequência, retenção, criptografia, localização, RPO, RTO e owners nominais permanecem não definidos e não certificados. O runbook registra os papéis Platform/SRE, Data Owner, Application Owner e Incident Commander, sem inventar nomes ou valores operacionais. O host autorizado deve medir o ponto do último backup, o tempo até API pronta e a validação de coleções, índices, documentos sintéticos, referências e `/health/ready`.

A validação isolada depende de um host com Mongo descartável e `mongodump/mongorestore/mongosh`; o ambiente atual também mantém o bloqueio de bind `EPERM` do `MongoMemoryServer`. Não foram provisionados Mongo gerenciado, storage, secret manager, criptografia externa ou retenção. O próximo passo seguro é aprovar a topologia e executar o runbook em ambiente temporário, comparando os tempos observados com RPO/RTO aprovados antes de qualquer promoção.

As validações locais de regressão registraram 231 suítes e 1.415 testes aprovados; 3 testes HTTP continuam bloqueados por `listen EPERM` no bind `0.0.0.0`. O build da API com `types` e `api-client`, lint, `bash -n` dos scripts, formatação direcionada e `git diff --check` passaram. Health/readiness foi coberto pelos testes unitários existentes, mas não foi exercitado contra um Mongo restaurado porque não há servidor descartável e ferramentas de dump/restore neste host.

## Sexto lote: SLOs, alertas e resposta a incidentes

### Status e fonte dos sinais

Os objetivos abaixo são **propostos e pendentes de aprovação**. Eles não representam disponibilidade, latência ou custo já observados. As fontes atuais são readiness, logs sanitizados, `RateLimitMetrics` e relatórios LLM em memória; não há backend externo, dashboard, pager ou roteamento provisionado.

| SLI                                                          | Objetivo proposto                                              | Janela                | Fonte atual                            | Owner por papel                  | Impacto                                |
| ------------------------------------------------------------ | -------------------------------------------------------------- | --------------------- | -------------------------------------- | -------------------------------- | -------------------------------------- |
| Disponibilidade HTTP da API (`api_http_requests_total`)      | ≥99,9% de respostas não-5xx                                    | 30 dias               | Não exportada; logs/request middleware | Platform/SRE + Application Owner | Indisponibilidade percebida            |
| Latência HTTP (`api_request_duration_ms`)                    | p95 ≤500 ms; valor a validar por rota                          | 5 min e 30 dias       | Duração em log sanitizado              | Application Owner                | Lentidão e timeouts                    |
| Erros HTTP 5xx (`api_http_requests_total`)                   | <1%; objetivo por rota pendente                                | 5 min                 | Logs/status HTTP                       | Application Owner                | Falhas funcionais                      |
| `401/403`                                                    | Baseline por rota; alerta somente desvio aprovado              | 15 min                | Logs/status HTTP                       | Security + Application Owner     | Possível abuso ou regressão de sessão  |
| `429` (`rate_limit_exceeded_total`)                          | Dentro da política aprovada; sem alvo global inventado         | 5 min                 | `RateLimitMetrics` local               | Security + Platform/SRE          | Abuso ou bloqueio legítimo             |
| Readiness (`api_readiness_status`)                           | 100% do tempo pronto após rollout aprovado                     | 5 min                 | `GET /health/ready`                    | Platform/SRE                     | Tráfego enviado a instância não pronta |
| Mongo (`mongo_ping_duration_ms`, falhas)                     | Disponibilidade e latência conforme RPO/RTO/SLO aprovados      | 5 min                 | Readiness/logs; não exportada          | Data Owner + Platform/SRE        | Erros de leitura/escrita               |
| LLM latência/timeout (`llm_latency_ms`, `llm_timeout_total`) | timeout <2%; limite por provider pendente                      | 5 min                 | Relatório LLM em memória               | LLM/IA Owner                     | Respostas lentas/fallback              |
| LLM provider/circuit/fallback                                | provider errors <1%; fallback dentro de baseline aprovado      | 5 min                 | Relatório LLM e logs                   | LLM/IA Owner                     | Degradação de Coach                    |
| Quota/custo (`llm_quota_exceeded_total`, custo estimado)     | Nunca exceder budget aprovado; valor não definido              | hora/dia/mês aprovado | Relatório LLM em memória               | LLM/IA + Finance/Platform        | Custo e abuso                          |
| Backup (`backup_last_success`, falhas)                       | 100% dos backups agendados; frequência/retensão não aprovadas  | janela agendada       | Manifesto/runbook; sem scheduler       | Data Owner + Platform/SRE        | Perda de capacidade de recuperação     |
| Métricas (`observability_events`)                            | Ausência máxima a aprovar; alerta por silêncio durante tráfego | 5–15 min              | OTLP opcional/logs                     | Platform/SRE                     | Diagnóstico cego                       |
| Espaço (`disk_free_bytes`)                                   | Acima do limite de capacidade aprovado                         | 5 min                 | Host/Mongo; não exportada              | Platform/SRE + Data Owner        | Queda, corrupção ou backup falho       |
| Deploy (`deploy_status`)                                     | Deploy aprovado sem falha e readiness pós-rollout              | por release           | CI/runtime externo                     | Release + Application Owner      | Regressão ou indisponibilidade         |

Os nomes são contratos operacionais planejados, não alegação de que todas as séries já existam. `RateLimitMetrics` e os relatórios LLM são locais e se perdem no restart; não suportam SLO distribuído sem backend externo.

### Alertas planejados

Devem ser provisionados no backend aprovado, com labels de baixa cardinalidade: ambiente, serviço, rota lógica, método, classe de status, categoria e janela. Nunca usar requestId, usuário, conversa, IP, email, token, prompt ou dados de saúde como label.

- `/health/ready`: `503` consecutivo ou disponibilidade abaixo do objetivo aprovado.
- MongoDB: ping falho, timeout, autenticação/privilégio rejeitado, latência acima do limite aprovado ou pool/espaço saturado.
- API: 5xx, p95/p99, indisponibilidade e falha de deploy.
- LLM: timeout, provider error/unavailable, circuito aberto, fallback, quota e custo acima do budget.
- Rate limiting: crescimento de `429` por política, mantendo health excluído.
- Backup/restore: ausência de backup esperado, falha, hash/manifesto inválido ou RPO/RTO excedido.
- Espaço: filesystem/Mongo abaixo do limite aprovado, OOM ou saturação de pool.
- Observabilidade: silêncio de métricas durante tráfego conhecido ou exporter degradado.

Todos esses alertas estão **planejados e não provisionados**: não há backend externo, dashboards, regras, pager ou canais configurados neste workspace.

### Runbook e severidade

O procedimento executável está em [incident-response-runbook.md](../operations/incident-response-runbook.md). Ele cobre confirmação, contenção, diagnóstico, mitigação, rollback, comunicação, recuperação, pós-incidente e evidências para API/5xx, latência/saturação, Mongo/readiness, LLM, quota/429, backup/restore, ausência de métricas, espaço e deploy. Os owners permanecem por papel e devem ser resolvidos pelo ambiente autorizado.

### Validação e riscos residuais

Foi verificada a correspondência entre os nomes usados no código (`RateLimitMetrics`, relatórios LLM, `/health/ready`, scripts de backup e logs com `requestId`) e os sinais planejados. Links do runbook apontam para arquivos existentes e não contêm segredos. Não houve alteração de código funcional.

Permanecem como dependências externas: backend de métricas/logs, dashboards, alert manager/pager, canais de incidente, Mongo seguro, storage/secret manager de backup, scheduler de backup e valores aprovados de SLO/RPO/RTO/custo. O próximo lote recomendado é provisionar observabilidade e alertas em pré-produção, validar um alerta sintético e medir os SLIs antes de promover objetivos a compromissos.

## Avaliação final de prontidão para pré-produção

A avaliação consolidada está em [sprint-4-preproduction-readiness.md](sprint-4-preproduction-readiness.md). A decisão atual é **NO-GO para pré-produção operacional**: o código tem controles implementados e testados, mas não há evidência de ambiente de pré-produção governado, secret manager, Mongo privado com autenticação/TLS/privilégio mínimo, Redis distribuído, backend externo de observabilidade, dashboards, pager/on-call, backup/restore validado ou valores aprovados de SLO/RPO/RTO/budget.

Classificação resumida: configuração e controles de aplicação estão em geral **prontos com ressalva**; Mongo seguro, Redis distribuído, backup/restore e observabilidade externa são **bloqueios/dependências externas**; SLOs, RPO/RTO, retenção, budget LLM e owners nominais são **decisões pendentes**. Nenhum alerta é ativo e nenhuma disponibilidade foi declarada.

As validações locais mantiveram 231 suítes e 1.415 testes aprovados, com 3 testes HTTP bloqueados por `listen EPERM` no bind `0.0.0.0`; build API/types/api-client, lint, configuração, health/readiness, scripts seguros, formatação direcionada e `git diff --check` passaram. O E2E funcional e o restore real continuam exigindo host autorizado e infraestrutura aprovada.

O próximo passo é resolver os bloqueios externos, executar E2E/restore/alerta sintético em ambiente isolado e reavaliar a matriz; não alterar código funcional para contornar essas ausências.

## Fechamento formal da Sprint 4 — 2026-08-20

### Status final

**Sprint 4 parcialmente concluída e bloqueada para pré-produção operacional.**

Os lotes de configuração, limites e resiliência do LLM, observabilidade segura, health/readiness, shutdown, runbooks de backup/restore e resposta a incidentes foram documentados e, quando aplicável, implementados/testados localmente. A ausência de infraestrutura e decisões operacionais aprovadas impede declarar pré-produção pronta.

### Baseline final e validações

| Validação        | Resultado                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| API              | 231 suítes / 1.415 testes aprovados; 3 testes HTTP bloqueados por `listen EPERM` no bind `0.0.0.0`        |
| `api-client`     | 9 suítes / 47 testes aprovados no baseline da Sprint 4                                                    |
| Builds           | API com `types` e `api-client` aprovados                                                                  |
| Lint             | Aprovado                                                                                                  |
| Configuração     | Testes de startup, secrets obrigatórios e limites LLM aprovados                                           |
| Health/readiness | Testes unitários aprovados; runtime restaurado não exercitado                                             |
| Backup           | Scripts seguros, `bash -n` e falhas por configuração incompleta aprovados                                 |
| Restore          | Não executado: ferramentas/infraestrutura ausentes; nenhum dado foi alterado                              |
| E2E              | 23 suítes / 81 testes bloqueados antes da execução funcional por `MongoMemoryServer listen EPERM 0.0.0.0` |
| Qualidade        | Formatação direcionada e `git diff --check` aprovados                                                     |

### Classificação das entregas

| Entrega                                                 | Classificação                          |
| ------------------------------------------------------- | -------------------------------------- |
| Matriz de ambientes e validação fail-closed             | Concluída com ressalva                 |
| Timeout, retry, backoff, circuit breaker e fallback LLM | Concluída com ressalva                 |
| Limites de contexto, prompt, saída e quota              | Concluída com ressalva                 |
| Métricas/logs LLM e `429` com redaction                 | Concluída com ressalva                 |
| Liveness, readiness e shutdown limitado                 | Concluída com ressalva                 |
| Runbooks de incidentes e backup/restore                 | Concluída com ressalva                 |
| Secret manager e secrets de pré-produção                | Bloqueada por infraestrutura           |
| MongoDB com auth, TLS, rede privada e menor privilégio  | Bloqueada por infraestrutura           |
| Redis distribuído                                       | Bloqueada por infraestrutura           |
| Backup/restore real, RPO, RTO e retenção                | Dependente de decisão e infraestrutura |
| Backend de métricas, dashboards, alertas e pager        | Bloqueada por infraestrutura           |
| On-call, owners nominais e canais                       | Dependente de decisão                  |
| Pipeline de pré-produção e E2E autorizado               | Bloqueada por infraestrutura           |
| Novas funcionalidades de produto                        | Fora do escopo                         |

### Bloqueios, responsáveis por papel e desbloqueio

| Bloqueio                      | Responsável por papel              | Próximo passo                                               | Critério de desbloqueio                                |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Secret manager/secrets        | Platform/SRE + Security            | Provisionar origem, rotação e auditoria                     | Startup validado sem valores no repositório            |
| Mongo seguro                  | Platform/SRE + Data Owner          | Disponibilizar Mongo privado com auth/TLS/ACL mínima        | Readiness, conexão restrita e smoke aprovados          |
| Redis distribuído             | Platform/SRE + Security            | Aprovar/provisionar backend e política de indisponibilidade | Concorrência, TTL, réplicas e fail policy validados    |
| Backup/restore/RPO/RTO        | Data Owner + Platform/SRE          | Aprovar política e executar exercício isolado               | Restore íntegro, tempos medidos e política assinada    |
| Observabilidade/alertas/pager | Platform/SRE                       | Provisionar backend, dashboards e alerta sintético          | Evento recebido no canal aprovado sem dados sensíveis  |
| On-call/owners/pipeline       | Release Owner + Incident Commander | Designar pessoas, canal, rollback e pipeline                | Exercício de incidente/deploy encerrado com evidências |
| E2E                           | QA + Platform/SRE                  | Reexecutar no host autorizado                               | Suíte funcional completa aprovada                      |

### Riscos residuais e continuidade

Persistem riscos de exposição/indisponibilidade do Mongo local, perda de métricas em restart, inconsistência entre réplicas, custo LLM sem budget aprovado, recuperação não comprovada e ausência de detecção/escalonamento operacional. A Sprint 5 deve priorizar o provisionamento governado dessas dependências, a validação externa dos runbooks e a reavaliação formal do go/no-go; não deve mascarar os bloqueios com defaults locais ou mocks.

## Itens fora do escopo desta etapa

Não foram provisionados serviços externos, alterados Docker Compose, secrets, contratos de negócio, prompts, modelo LLM, rate limiting, MongoDB, Redis, dashboards, alertas ou procedimentos externos. Este documento não certifica produção; registra gaps e critérios para a próxima etapa.
