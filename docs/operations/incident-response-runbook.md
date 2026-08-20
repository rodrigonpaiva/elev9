# Runbook de resposta a incidentes — API, dados e LLM

## Estado operacional

Este runbook é executável por uma equipe com acesso ao ambiente autorizado, mas os alertas ainda não estão ativos. O workspace possui logs sanitizados, `requestId`, readiness, métricas LLM e métricas locais de `429`; não possui backend externo de métricas, dashboard, pager, roteamento ou on-call configurado. Nenhum contato, canal, fornecedor ou owner nominal é inventado aqui.

Use somente dados agregados e sanitizados. Não copie tokens, URI, credenciais, emails, prompts, respostas do Coach, dados de saúde, IP bruto ou documentos para tickets e chats.

## Severidade

| Severidade  | Critério                                                                                        | Resposta esperada                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SEV-1       | Indisponibilidade ampla, perda/risco de dados, exposição sensível ou falha sem contenção segura | Incident Commander, contenção imediata, comunicação periódica pelo canal aprovado externamente     |
| SEV-2       | Degradação relevante de API, Mongo, LLM ou rate limiting com impacto limitado/mitigável         | Platform/SRE coordena diagnóstico e mitigação; Application/Data Owners participam conforme impacto |
| SEV-3       | Falha localizada, alerta isolado ou degradação sem impacto material confirmado                  | Owner do componente investiga em horário operacional e registra evidência                          |
| Informativo | Sinal esperado, teste, manutenção ou evento sem impacto                                         | Registrar e encerrar após confirmação                                                              |

Se o impacto não puder ser determinado, iniciar em SEV-2 e rebaixar somente com evidência.

## Papéis

- **Incident Commander:** classifica, decide contenção/promoção/rollback e encerra o incidente.
- **Platform/SRE:** runtime, deploy, observabilidade, rate limiting, espaço e dependências.
- **Data Owner:** MongoDB, backup, restore, integridade e privilégios.
- **Application Owner:** API, contratos, readiness e comportamento funcional.
- **LLM/IA Owner:** provider, limites, quota, custo, fallback e circuit breaker.

Os papéis devem ser associados a pessoas e canais pelo processo operacional do ambiente; este repositório não contém essa informação.

## Ciclo comum

1. Abrir um registro com horário UTC, ambiente, release, severidade provisória, `requestId` sanitizado e impacto agregado.
2. Confirmar o sinal em pelo menos duas fontes quando possível: métrica/log sanitizado e endpoint/readiness ou teste sintético autorizado.
3. Conter sem apagar dados: pausar rollout, reduzir tráfego/coorte, desabilitar feature flag aprovada ou ativar fallback existente.
4. Preservar evidências: janelas de métricas, códigos HTTP, latência, estado de readiness, release e comandos executados sem segredos.
5. Mitigar, validar recuperação e só então decidir rollback/promoção.
6. Comunicar impacto, hipótese, ação e próximo checkpoint pelo canal aprovado externamente.
7. Encerrar quando o critério específico abaixo for atendido e abrir pós-incidente com causa, detecção, impacto, timeline e ações.

Comandos de diagnóstico seguros, sempre no host autorizado:

```bash
curl -fsS http://localhost:3000/health
curl -i http://localhost:3000/health/ready
docker compose ps
docker compose logs --since=15m api
df -h
```

Não use `docker compose down -v`, `dropDatabase`, `rm -rf` ou comandos equivalentes durante um incidente sem autorização explícita e procedimento de destruição aprovado.

## Incidentes e procedimentos

### 1. API indisponível ou erro 5xx — SEV-1/SEV-2

- **Sinais:** SLI `api_availability`, aumento de `api_http_requests_total{status_class="5xx"}`, falha de smoke test ou `/health` sem resposta.
- **Confirmação:** consultar `/health`, readiness, logs por `requestId` e status do deploy; separar falha de bind, processo, dependência e rota.
- **Contenção:** pausar deploy, retirar instância defeituosa do tráfego ou reduzir rollout; preservar instâncias saudáveis.
- **Diagnóstico/mitigação:** comparar release/configuração, verificar Mongo/readiness e espaço; corrigir somente configuração aprovada ou reiniciar a unidade afetada.
- **Rollback:** usar artefato/release anterior aprovado se a regressão estiver ligada ao deploy; não alterar banco sem plano.
- **Comunicação:** informar escopo, endpoints e impacto agregado; não enviar payloads.
- **Recuperação:** `/health` e readiness estáveis na janela aprovada, smoke test e erro 5xx retornando ao objetivo aprovado.
- **Pós-incidente/evidências:** timeline, release, séries de status/latência, readiness, logs sanitizados, decisão de rollback e teste final.

### 2. Latência ou saturação da API — SEV-2/SEV-3

- **Sinais:** `api_request_duration_ms` acima do objetivo proposto, aumento de p95/p99, pool Mongo saturado, CPU/memória ou fila elevadas.
- **Confirmação:** comparar rota lógica, método, status e janela; verificar se o aumento coincide com deploy, Mongo ou LLM.
- **Contenção:** limitar rollout, reduzir concorrência/coorte ou desabilitar operação opcional aprovada; nunca remover autenticação/rate limit.
- **Diagnóstico/mitigação:** analisar dependência mais lenta, consultas e retries; aplicar configuração/release aprovado.
- **Rollback:** reverter release se houver regressão reproduzível.
- **Comunicação:** registrar impacto por rota e usuários afetados de forma agregada.
- **Recuperação:** p95/p99 e taxa de erro dentro do objetivo aprovado durante a janela de observação.
- **Pós-incidente/evidências:** séries de latência, saturação, mudanças e comparação antes/depois.

### 3. MongoDB indisponível, autenticação falha ou readiness degradado — SEV-1/SEV-2

- **Sinais:** `/health/ready` `503` com `mongo=down`, `mongo_ping_failure_total`, erros de conexão/autenticação ou operações Mongo em timeout.
- **Confirmação:** executar readiness, verificar health do serviço Mongo e conectividade/TLS no ambiente autorizado; não imprimir URI.
- **Contenção:** retirar instâncias não prontas do tráfego; congelar escritas se houver risco de inconsistência; não reiniciar/limpar volume sem Data Owner.
- **Diagnóstico/mitigação:** distinguir rede, credencial, privilégio, capacidade e indisponibilidade; corrigir secret/configuração aprovada ou dependência.
- **Rollback:** reverter configuração/release somente se a causa for mudança recente; para perda de dados, seguir runbook de backup/restore.
- **Comunicação:** declarar se há indisponibilidade, somente leitura ou risco de dados; nunca afirmar recuperação sem validação.
- **Recuperação:** ping controlado, readiness `200`, operações mínimas da API e integridade confirmada.
- **Pós-incidente/evidências:** status/latência Mongo, readiness, categoria de falha, janela, backup/restore e decisões do Data Owner.

### 4. Timeout, erro, circuit breaker ou fallback do LLM — SEV-2/SEV-3

- **Sinais:** `llm_timeout_total`, `llm_provider_error_total`, `llm_circuit_open_total`, `llm_fallback_total`, p95 LLM e logs `requestId`.
- **Confirmação:** consultar o relatório agregado por provider/modelo/categoria; confirmar que não há prompts ou respostas nos registros.
- **Contenção:** manter fallback determinístico, pausar expansão/canary e reduzir quota/coorte se aprovado; não aumentar retries globalmente durante tempestade.
- **Diagnóstico/mitigação:** verificar provider, timeout global, retries, circuito, limites de contexto e rate limit; separar erro de configuração de indisponibilidade externa.
- **Rollback:** reverter configuração/modelo/release aprovado; não alterar prompt ou guardrail como reação emergencial sem owner de IA.
- **Comunicação:** informar percentual agregado de fallback/timeout e superfícies afetadas.
- **Recuperação:** provider estável, circuito fechado após sondas, fallback dentro do objetivo e custo/quota normais.
- **Pós-incidente/evidências:** categorias, tentativas, latência, circuit state, fallback, release/configuração e decisão de rollout.

### 5. Quota, custo anômalo ou rate limiting — SEV-2/SEV-3

- **Sinais:** `rate_limit_exceeded_total`, `llm_quota_exceeded_total`, respostas `429`, custo estimado acima do budget aprovado ou crescimento de tokens.
- **Confirmação:** agrupar por política, rota lógica, método, provider/modelo e janela; nunca por IP, email, token ou usuário em claro.
- **Contenção:** preservar limites, bloquear somente política abusada, pausar rollout de IA e aplicar quota aprovada; não excluir health checks sem justificativa.
- **Diagnóstico/mitigação:** separar abuso, NAT legítimo, regressão de cliente, erro de configuração e falha distribuída; conferir headers `RateLimit-*`/`Retry-After`.
- **Rollback:** reverter mudança de política/configuração se a causa for regressão; não liberar limites globalmente.
- **Comunicação:** impacto agregado, política, janela e custo sem dados pessoais.
- **Recuperação:** `429`, quota e custo retornam aos limites aprovados sem bloquear usuários legítimos de forma indevida.
- **Pós-incidente/evidências:** séries por política, headers, configuração, decisão de contenção e lacuna distribuída se houver múltiplas réplicas.

### 6. Falha de backup, restore ou integridade de recuperação — SEV-1/SEV-2

- **Sinais:** backup agendado ausente/falho, manifesto inválido, hash divergente, restore isolado incompleto ou RPO/RTO excedido.
- **Confirmação:** verificar somente status, timestamp, tamanho/hash e logs sanitizados do runbook; preservar o artefato original.
- **Contenção:** não remover backups, volumes ou banco de origem; suspender promoção e abrir Data Owner/Incident Commander.
- **Diagnóstico/mitigação:** repetir somente em destino descartável autorizado, corrigir ferramenta/storage/credencial e testar coleções, índices, documentos sintéticos e readiness.
- **Rollback:** não existe rollback destrutivo automático; manter origem intacta e promover apenas destino validado.
- **Comunicação:** declarar RPO/RTO observado e não certificado, sem prometer restauração.
- **Recuperação:** backup válido, restore isolado íntegro, API/readiness funcionais e aprovação formal do Data Owner.
- **Pós-incidente/evidências:** manifesto, hash, tempos, contagens, índices, comandos sem URI e assinaturas dos owners.

### 7. Ausência ou degradação de métricas/telemetria — SEV-2/SEV-3

- **Sinais:** ausência de eventos durante tráfego conhecido, collector/exporter indisponível, `observability_state` degradado ou divergência entre logs e métricas.
- **Confirmação:** verificar se observabilidade está habilitada, estado do Collector e presença de `requestId`; lembrar que os contadores locais são perdidos no restart.
- **Contenção:** não declarar saúde com base em silêncio; usar logs/readiness e testes sintéticos autorizados; pausar rollout de alto risco se não houver diagnóstico.
- **Diagnóstico/mitigação:** corrigir endpoint/protocolo/configuração do exporter sem incluir dados sensíveis; manter API disponível se a política permitir.
- **Rollback:** desabilitar exportação opcional (`OBSERVABILITY_ENABLED=false`) se ela causar instabilidade, preservando redaction.
- **Comunicação:** marcar o intervalo como sem observabilidade confiável.
- **Recuperação:** sinais mínimos chegam ao backend aprovado e a correlação por requestId funciona sem PII.
- **Pós-incidente/evidências:** janela sem dados, estado do provider, configuração sanitizada e teste de emissão.

### 8. Espaço em disco ou saturação de recurso — SEV-1/SEV-2

- **Sinais:** `disk_free_bytes` abaixo do limite aprovado, filesystem cheio, Mongo sem espaço, OOM, CPU/memória/pool saturados.
- **Confirmação:** `df -h`, métricas do host/Mongo e logs; identificar o mount afetado sem copiar dados.
- **Contenção:** pausar deploy/backup pesado, reduzir tráfego e preservar Mongo; não executar limpeza destrutiva automática.
- **Diagnóstico/mitigação:** localizar crescimento por ferramentas aprovadas, rotacionar logs conforme política e expandir capacidade pelo processo de infraestrutura.
- **Rollback:** reverter artefato/deploy se comprovadamente causador; não remover volumes ou dados de usuário.
- **Comunicação:** informar capacidade restante e serviço afetado.
- **Recuperação:** capacidade acima do limite aprovado, readiness estável e operações mínimas validadas.
- **Pós-incidente/evidências:** métricas de capacidade, ação aprovada, não destruição de dados e recomendação de capacidade.

### 9. Falha de deploy ou configuração — SEV-2/SEV-3

- **Sinais:** `deploy_status=failed`, startup failure, readiness nunca atinge `200`, aumento de 5xx após release ou configuração inválida.
- **Confirmação:** comparar release/configuração com baseline, logs de bootstrap sanitizados e health/readiness.
- **Contenção:** interromper rollout e manter versão saudável; não contornar validação de secrets, CORS, rate limit ou readiness.
- **Diagnóstico/mitigação:** corrigir pipeline/configuração em ambiente de teste e repetir smoke/build; preservar contratos.
- **Rollback:** executar rollback do release pelo mecanismo aprovado, sem alterar dados automaticamente.
- **Comunicação:** release, ambiente, impacto e decisão, sem secrets.
- **Recuperação:** deploy concluído, readiness `200`, smoke test e métricas dentro do objetivo aprovado.
- **Pós-incidente/evidências:** artefatos, checks, diff de configuração sem valores, timeline e aprovação.

## Encerramento e pós-incidente

O Incident Commander pode encerrar somente após critério de recuperação, impacto final, evidências e owner de ação corretiva registrados. O pós-incidente deve conter timeline UTC, detecção, causa provável/confirmada, impacto agregado, contenção, mitigação, rollback, lacunas de SLO/alerta, ações com owner por papel e data a definir pelo processo externo.

## Dependências e limitações

Este documento depende de backend de métricas/logs, dashboard, alert manager/pager, acesso Mongo protegido, storage de backup, secret manager, política de RPO/RTO e canais operacionais aprovados. Nenhuma dessas integrações foi provisionada pelo lote. Até lá, os alertas são especificações e os SLOs abaixo são objetivos propostos, não disponibilidade observada.
