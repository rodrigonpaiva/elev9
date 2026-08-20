# Sprint 4 — avaliação de prontidão para pré-produção

**Data da avaliação final:** 2026-08-20

## Decisão

**NO-GO para pré-produção operacional.**

O código possui controles relevantes de configuração, resiliência, redaction, rate limiting local, readiness e runbooks. Porém, não existe evidência de uma pré-produção provisionada e governada. Permanecem bloqueios críticos/altos: secrets e secret manager, Mongo autenticado com TLS e privilégio mínimo, backup/restore com RPO/RTO, observabilidade externa com alertas, Redis distribuído e on-call/pager. Promover sem esses itens impediria detectar, conter ou recuperar falhas de dados e dependências.

Esta decisão não afirma que a aplicação não possa executar localmente; afirma que os requisitos operacionais para receber tráfego de pré-produção ainda não foram comprovados.

## Escopo e evidências

- Diagnóstico e lotes: [sprint-4-operations-llm.md](sprint-4-operations-llm.md).
- Resposta a incidentes: [incident-response-runbook.md](../operations/incident-response-runbook.md).
- Backup/restore: [mongodb-backup-restore-runbook.md](../operations/mongodb-backup-restore-runbook.md).
- Configuração de startup: `apps/api/src/config/runtime.config.ts`.
- Health/readiness: `apps/api/src/modules/health/health.controller.ts`.
- Rate limiting/redaction/LLM: `apps/api/src/common/rate-limit/`, `apps/api/src/common/security/` e `apps/api/src/modules/ai/`.
- Ambiente local: `docker-compose.yml`, `.env.example` e `.env.docker.example`.

## Checklist de prontidão

| Área            | Item                                                             | Status              | Evidência / bloqueio                                                                                                                    |
| --------------- | ---------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Configuração    | Matriz development/test/CI/pre-production/production             | Pronto com ressalva | Matriz documentada; pré-produção real e owners nominais não fornecidos.                                                                 |
| Secrets         | JWT, Mongo, CORS, rate limit, LLM e observabilidade obrigatórios | Pronto com ressalva | Startup falha para valores ausentes fora de ambientes seguros; origem, rotação, auditoria e expiração dependem de secret manager.       |
| Secrets         | Secret manager e recuperação de secrets                          | Dependência externa | Não provisionado nem identificado. Não criar secrets nesta etapa.                                                                       |
| CORS/JWT        | Allowlist e segredo JWT fail-closed                              | Pronto com ressalva | Implementado e testado; valores aprovados e política de issuer/audience/rotação de pré-produção pendentes.                              |
| LLM             | Timeout, retries, backoff, circuit breaker e fallback            | Pronto com ressalva | Implementados e testados localmente; circuito é local e provider externo/SLO ainda não aprovados.                                       |
| LLM             | Contexto, prompt, saída e quota                                  | Pronto com ressalva | Limites e quota configuráveis; quota depende de backend local e não é distribuída entre réplicas.                                       |
| LLM             | Custo e budget                                                   | Decisão pendente    | Custo estimado existe, mas budget, owner financeiro e alerta aprovado não existem.                                                      |
| Redis           | Rate limiting distribuído                                        | Dependência externa | `RATE_LIMIT_STORE=redis` falha explicitamente sem adapter/infraestrutura; backend em memória não é aceitável para réplicas.             |
| MongoDB         | TLS, autenticação, rede privada e privilégio mínimo              | Bloqueado           | Compose publica `27017` e usa URI sem auth/TLS; topologia autorizada não foi fornecida.                                                 |
| MongoDB         | Health/readiness com timeout                                     | Pronto com ressalva | `/health` não depende de Mongo; `/health/ready` faz ping limitado e responde `503`; runtime real não foi validado neste host.           |
| Segurança       | Redaction em logs/traces/métricas                                | Pronto com ressalva | Testes cobrem tokens, PII, prompts e requestId; backend externo e revisão de retenção ainda pendentes.                                  |
| Segurança       | Ownership e validação de entrada                                 | Pronto com ressalva | Cobertura e correções existentes; necessita regressão E2E no host autorizado.                                                           |
| Operação        | Liveness/readiness                                               | Pronto com ressalva | Implementado; dependências/configuração são sinalizadas sem detalhes sensíveis, mas não há probe externo provisionado.                  |
| Operação        | Shutdown limitado                                                | Pronto com ressalva | Hooks Nest e deadline HTTP implementados; exercício com processo/dependências reais não comprovado.                                     |
| Recuperação     | Backup/restore                                                   | Bloqueado           | Runbook/scripts seguros existem, mas `mongodump`, `mongorestore`, `mongosh`, storage e Mongo descartável não estão disponíveis no host. |
| Recuperação     | RPO/RTO/retenção                                                 | Decisão pendente    | Não há valores aprovados nem evidência de medição; não inventar metas.                                                                  |
| Observabilidade | SLO/SLI e nomes de sinais                                        | Pronto com ressalva | Sinais e objetivos propostos documentados; não são SLOs aprovados nem séries exportadas.                                                |
| Observabilidade | Alertas                                                          | Dependência externa | Alertas definidos, mas backend, dashboard, regras, pager e routing não estão provisionados.                                             |
| Observabilidade | Dashboard e pager/on-call                                        | Dependência externa | Nenhum recurso ou owner nominal foi fornecido.                                                                                          |
| Incidentes      | Runbook de resposta                                              | Pronto com ressalva | Runbook cobre severidade, contenção, rollback, recuperação e evidências; canais e contatos devem ser associados externamente.           |
| Deploy          | Pipeline, rollback e smoke de pré-produção                       | Dependência externa | Não há deployment target ou pipeline de pré-produção comprovado no workspace.                                                           |

## Itens prontos ou próximos de prontos

- Validação fail-closed de configuração fora de desenvolvimento/teste/CI.
- CORS configurável por allowlist e proteção de endpoints internos.
- Timeout global, retry elegível, backoff, circuit breaker e fallback determinístico do LLM.
- Limites de contexto/prompt/saída e tratamento de quota.
- Redaction, correlação por `requestId`, ownership e validação de entrada cobertos por testes.
- Liveness/readiness separados, sem chamada real ao provider LLM.
- Runbooks de backup/restore e incidentes com bloqueios explícitos e sem comandos destrutivos.

Esses itens demonstram capacidade do código, não certificam a infraestrutura de pré-produção.

## Bloqueios para reavaliar GO

1. Registrar o ambiente de pré-produção, pipeline, release, rollback e owners por papel.
2. Provisionar secret manager e fornecer configuração validada para JWT, Mongo, CORS, LLM, rate limiting e observabilidade, sem expor valores no repositório.
3. Disponibilizar Mongo privado com autenticação, TLS, usuário de aplicação com privilégio mínimo, backup criptografado e monitoramento.
4. Aprovar Redis distribuído, TLS, ACL, timeout, reconnect, TTL, múltiplas réplicas e política de indisponibilidade.
5. Provisionar backend de métricas/logs/traces, dashboards, regras de alerta, pager/on-call e canal de incidente.
6. Aprovar SLOs, budgets LLM, quota, retenção, RPO/RTO e frequência de backup.
7. Executar backup e restore em ambiente isolado, validar coleções, índices, documentos sintéticos, `/health/ready` e smoke da API.
8. Reexecutar E2E completo no host autorizado; o ambiente atual bloqueia bind em `0.0.0.0` com `EPERM` antes da execução funcional.
9. Executar alerta sintético e exercício de incidente/rollback sem dados reais.

## Validações locais disponíveis

- API: 231 suítes / 1.415 testes aprovados; 3 testes HTTP bloqueados pelo `listen EPERM` do ambiente, sem falha funcional reproduzível relacionada a este checklist.
- Build API com `types` e `api-client`: aprovado.
- Lint: aprovado.
- Testes de configuração, LLM, redaction, rate limiting e health/readiness: aprovados dentro da suíte unitária.
- Scripts de backup: `bash -n`, parâmetros ausentes e bloqueios de ambiente testados; backup/restore real não executado por ausência das ferramentas e infraestrutura.
- Formatação direcionada e `git diff --check`: aprovados.
- E2E: deve ser executado no host autorizado; o host atual reproduz `MongoMemoryServer listen EPERM 0.0.0.0`.

## Riscos e decisões necessárias

### Riscos críticos

- Dados Mongo expostos ou sem recuperação comprovada por ausência de auth/TLS, rede privada e restore validado.
- Incidente não detectado ou não escalado por ausência de backend de observabilidade, alertas e on-call.
- Rate limiting, circuito e métricas inconsistentes entre réplicas sem Redis/backend distribuído.

### Decisões necessárias

- Owner e valores aprovados de SLO, RPO, RTO, retenção e budget LLM.
- Política de fail-open/fail-closed e rollout do Redis.
- Classificação/retensão de dados enviados ao provider LLM.
- Topologia Mongo, modelo de privilégios e estratégia de backup.
- Canal, pager, autoridade de rollback e Incident Commander.

## Critérios para reavaliação

A decisão só pode mudar para **GO** quando todos os bloqueios acima tiverem evidência verificável no ambiente autorizado, o E2E funcional passar, backup/restore isolado cumprir os valores aprovados, readiness e smoke estiverem estáveis, alertas sintéticos chegarem ao canal aprovado e um exercício de incidente/rollback for encerrado com evidências. Sem isso, manter **NO-GO** ou, no máximo, autorizar somente testes técnicos isolados sem tráfego de pré-produção.

## Fechamento formal

O status da Sprint 4 é **parcialmente concluída e bloqueada para pré-produção operacional**. O baseline final foi confirmado: API 231 suítes/1.415 testes aprovados com 3 bloqueios ambientais de bind; `api-client` 9 suítes/47 testes aprovados; builds, lint, testes de configuração, health/readiness, scripts seguros, formatação direcionada e `git diff --check` aprovados. E2E (23 suítes/81 testes) e restore real permanecem dependentes de host/infraestrutura autorizados.

Nenhuma infraestrutura externa foi provisionada, nenhum secret real foi criado e nenhum dado/volume foi apagado ou sobrescrito. O próximo ciclo deve resolver os nove itens de desbloqueio desta matriz e repetir a avaliação antes de alterar a decisão para GO.
