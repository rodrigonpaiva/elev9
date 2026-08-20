# Sprint 3 — Segurança de acesso e dados

**Data do diagnóstico:** 2026-08-20
**Fase:** diagnóstico, sem alterações funcionais
**Objetivo:** identificar riscos de autorização, exposição de dados, debug, validação, observabilidade, sessão, MongoDB e abuso antes da implementação de correções.

## Escopo analisado

Foram analisados:

- API NestJS e seus módulos de auth, users, fitness, training, progress, recovery, nutrition, AI/Coach, dashboard, goals, habits, notifications, personalization e health;
- controllers, DTOs de request/query/params, `ValidationPipe`, `AuthSessionGuard`, casos de uso e repositórios Mongoose;
- bootstrap, CORS, logs, correlação, observabilidade, JWT, configuração de ambiente e Compose;
- `packages/types`, `packages/api-client` e networking/storage do mobile;
- testes unitários, E2E e testes de isolamento/autorização existentes;
- dependências diretamente relacionadas a JWT, bcrypt, Mongoose, MongoDB e OpenTelemetry.

Não foram alterados código, contratos, testes, dependências ou configurações de runtime nesta etapa.

## Módulos e endpoints avaliados

| Módulo                 | Superfície avaliada                                                               | Evidência principal                                                                    |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auth                   | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                         | `auth.controller.ts`, `AuthSessionGuard`, testes de registro/login/sessão              |
| Users/Fitness/Training | perfil, fitness, criação/consulta de plano                                        | controllers, casos de ownership e E2E de onboarding                                    |
| Progress               | check-in, logs, sessões de treino, histórico e resumo                             | `progress.controller.ts`, E2E de ownership e idempotência                              |
| Recovery               | experience, today/current e histórico                                             | `recovery.controller.ts`, casos por `authUserId`                                       |
| Nutrition              | perfil, macros, planos, today, histórico, logs, replace e recomendações           | `nutrition.controller.ts`, DTOs e E2E de jornada                                       |
| AI/Coach               | chat, stream, histórico, context, feedback, decisões, intelligence e debug/replay | `ai.controller.ts`, `coach-decision.controller.ts`, `coach-intelligence.controller.ts` |
| Dashboard              | home e `home/debug`                                                               | `dashboard.controller.ts`                                                              |
| Goals/Habits           | leituras, históricos, riscos e replay debug                                       | controllers e casos de uso                                                             |
| Notifications          | leituras, histórico, engagement e replay debug                                    | `notifications.controller.ts`                                                          |
| Personalization        | leituras, perfil, histórico e replay debug                                        | `personalization.controller.ts`                                                        |
| Health                 | `/health` e `/health/ready`                                                       | controllers de health; endpoints públicos por desenho                                  |
| Infra                  | Mongo, Compose, CORS, JWT, logs, traces e ambiente                                | `app.module.ts`, `main.ts`, `auth.module.ts`, `docker-compose.yml`, observability      |

## Controles positivos observados

- A API aplica `ValidationPipe` global com `transform`, `whitelist` e `forbidNonWhitelisted` em `main.ts`.
- Rotas de negócio autenticadas usam `AuthSessionGuard`; o guard valida Bearer/JWT e transforma sessão inválida em `401 AUTH_INVALID_SESSION`.
- O JWT expira em 15 minutos e a verificação rejeita tokens expirados ou malformados.
- As operações críticas de recurso resolvem o perfil pelo `authUserId` e, em vários casos, conferem ownership explícito antes de ler ou alterar o recurso. Exemplos: plano no início/log de treino, sessão na conclusão, notification event/replay, feedback/decision/habit/personalization replay.
- Os testes E2E existentes cobrem isolamento entre usuários em onboarding, training, workout completion e Coach, além de tokens ausentes, inválidos e expirados.
- Passwords são persistidas como hash via bcrypt; a resposta de auth não retorna `passwordHash`.
- O endpoint de chat do Coach persiste e consulta conversas por perfil autenticado; o E2E confirmou isolamento entre usuários.
- O `api-client` injeta o Bearer token sem incluir o token em query string; o mobile usa armazenamento dedicado de token e remove a sessão local quando recebe `401`.
- O serviço de segurança de AI possui redaction/guardrails e testes que verificam não exposição de token, chave de API, prompt e contexto bruto em determinados caminhos.

Esses controles reduzem o risco, mas não substituem uma matriz sistemática de autorização por endpoint nem testes negativos para todos os recursos identificáveis.

## Endpoints internos, administrativos e debug

Foram identificadas as seguintes superfícies debug/replay:

- `/ai/chat/debug`, `/ai/chat/debug/history`, `/ai/chat/debug/memory`, `/ai/chat/debug/prompt`, `/ai/chat/debug/reply-path`;
- `/ai/debug/coach-feedback`, `/ai/debug/coach-feedback/:id/replay`;
- `/ai/coach-decision/debug/:id/replay`;
- `/dashboard/home/debug`;
- `/habits/debug/:id/replay`;
- `/notifications/debug/:id/replay`;
- `/personalization/debug/:id/replay`.

Todas as rotas observadas usam `AuthSessionGuard`, mas não há guard de papel, permissão administrativa, allowlist de ambiente ou separação de controller interno. Os casos de replay normalmente conferem ownership; isso protege o recurso de outro usuário, mas não resolve a exposição da funcionalidade de diagnóstico/reprocessamento a qualquer usuário autenticado. Os endpoints de prompt/context/debug podem retornar metadados sensíveis de saúde, treino, nutrição, hábitos, decisões e histórico conversacional do próprio usuário.

Classificação: **S3-SEC-01, alto**. Recomenda-se decidir se são ferramentas administrativas, de suporte ou funcionalidades do usuário; depois aplicar gating por ambiente/papel, auditar acesso e minimizar respostas. Não remover endpoints sem mapear uso e consumidores.

## Matriz de riscos

| ID        | Severidade  | Achado e evidência                                                                                                                                                                                           | Impacto                                                                                                                 | Recomendação                                                                                                                 | Prioridade | Testes necessários                                                                                            |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| S3-SEC-01 | Alto        | Rotas debug/replay internas estão publicadas sob `AuthSessionGuard`, sem RBAC/allowlist de ambiente                                                                                                          | Exposição de contexto e possibilidade de reprocessamento por qualquer usuário autenticado                               | Separar superfície interna, exigir papel/entitlement e bloquear em produção por configuração fail-closed                     | P0         | Cada rota: sem token, usuário comum, operador autorizado, outro usuário e ambiente de produção                |
| S3-SEC-02 | Alto        | `main.ts` usa `app.enableCors({ origin: true })`                                                                                                                                                             | Qualquer origem pode fazer chamadas cross-origin; aumenta risco de abuso com credenciais/token disponíveis no navegador | Allowlist explícita por ambiente; revisar headers e origem de produção                                                       | P0         | Matriz de origins permitidas/bloqueadas e preflight                                                           |
| S3-SEC-03 | Alto        | Não há middleware/decorator de rate limiting; busca não encontrou `@nestjs/throttler` ou equivalente                                                                                                         | Brute force em login/registro, abuso de Coach/IA e exaustão de recursos                                                 | Rate limit por IP, conta e identidade autenticada, com limites específicos e armazenamento distribuído quando necessário     | P0         | Login, registro, chat/stream, feedback, debug/replay e endpoints de escrita sob burst/concurrency             |
| S3-SEC-04 | Alto        | `auth.module.ts` usa `process.env.JWT_SECRET ?? 'dev-secret'`                                                                                                                                                | Deploy sem segredo pode aceitar tokens assinados com segredo conhecido                                                  | Falhar no startup fora de desenvolvimento quando segredo não existir; validar tamanho/rotação e claims                       | P0         | Startup por ambiente, token assinado com segredo default, rotação e issuer/audience                           |
| S3-SEC-05 | Alto        | `docker-compose.yml` publica Mongo em `27017` e usa `mongodb://mongo:27017/elev9`, sem credenciais/TLS/configuração de usuário de aplicação                                                                  | Acesso direto às coleções pode contornar API e expor dados de saúde/auth                                                | Mongo privado por rede, autenticação, TLS conforme ambiente e usuário com privilégios mínimos; não publicar porta por padrão | P0         | Conexão sem credencial, credencial de leitura/escrita mínima, isolamento de rede e tentativa de acesso direto |
| S3-SEC-06 | Médio       | `request-runtime-logging.middleware.ts` registra `request.originalUrl`, enquanto outro logger registra path; `x-request-id` do cliente é aceito e ecoado sem normalização forte                              | Query params podem entrar em logs; request id controlado pode causar ruído/injeção em agregadores                       | Redactar query/headers, validar comprimento/caracteres do correlation id e manter um logger único                            | P1         | Query sensível, request id longo/controle, erro 4xx/5xx e inspeção de logs exportados                         |
| S3-SEC-07 | Médio       | Não há revogação server-side nem endpoint de logout; logout é local e tokens válidos permanecem aceitos por até 15 min                                                                                       | Token roubado continua válido após logout local                                                                         | Decidir revogação, denylist curta, refresh token rotativo ou aceitar explicitamente o modelo de access token curto           | P1         | Logout, replay de token, expiração, rotação e múltiplos dispositivos                                          |
| S3-SEC-08 | Médio       | Respostas de módulos incluem `sourceContext`/metadados de cálculo em planos, recomendações, decisões e notificações; tipos compartilhados também os expõem                                                   | Pode revelar sinais de saúde, hábitos, scores, regras internas ou identificadores além do necessário ao produto         | Definir classificação de dados e DTO público mínimo; separar read model público de debug/auditoria                           | P1         | Snapshot com dados sensíveis, comparação API/client/mobile e contrato de minimização                          |
| S3-SEC-09 | Médio       | Alguns campos de entrada têm validação apenas de tipo ou limites ausentes: `metadata: Record<string, unknown>`, strings de ids/nome, listas alimentares e exercícios sem `MaxLength`/`ArrayMaxSize` uniforme | Payloads grandes, objetos aninhados ou valores inesperados podem elevar custo, poluir logs e criar risco de abuso       | Padronizar limites de tamanho, profundidade, cardinalidade e formatos por DTO; validar ids conforme o domínio                | P1         | Fuzz de strings/objetos/arrays, payload grande, nested unknown e Unicode/control chars                        |
| S3-SEC-10 | Médio       | Não há evidência de headers de segurança como Helmet; CORS e resposta HTTP são configurados diretamente no bootstrap                                                                                         | Menor defesa em profundidade para consumidores Web e endpoints públicos                                                 | Avaliar Helmet/headers adequados ao cliente Web, sem quebrar Expo/native; documentar CSP quando aplicável                    | P2         | Headers em produção, Web, preflight e compatibilidade mobile                                                  |
| S3-SEC-11 | Médio       | Não existe papel/permissão explícito nem resposta `403`; o modelo atual é essencialmente “usuário autenticado + ownership/404”                                                                               | Operações administrativas/debug não têm boundary de privilégio formal                                                   | Definir RBAC/entitlements e semântica `401` vs `403` antes de ampliar superfícies internas                                   | P1         | Matriz de papéis, recursos próprios/de terceiros e operações internas                                         |
| S3-SEC-12 | Baixo       | Mobile imprime `baseUrl` em `__DEV__` e há dois caminhos de HTTP (`api-client` e `requestJson`)                                                                                                              | Baixo risco local, mas pode gerar configuração de ambiente nos logs e divergência futura de redaction/retry             | Padronizar cliente e confirmar política de logs de desenvolvimento                                                           | P2         | Build dev/prod, captura de logs e erros de rede/HTTP                                                          |
| S3-SEC-13 | Baixo       | A auditoria local não encontrou `npm audit`/SCA integrado como target Nx ou pipeline no material analisado                                                                                                   | Vulnerabilidades de dependência podem permanecer sem gate automatizado                                                  | Adicionar verificação de dependências no CI com política de exceções e lockfile revisado                                     | P2         | Auditoria de produção/dev, SBOM e falha controlada do pipeline                                                |
| S3-SEC-14 | Informativo | `/health` e `/health/ready` são públicos e expõem estado operacional básico                                                                                                                                  | Facilita fingerprinting, mas é padrão para probes; risco depende do payload final e exposição de rede                   | Manter público apenas com payload mínimo; restringir readiness interno se necessário                                         | P3         | Resposta pública, headers, rede externa e probe do orchestrator                                               |
| S3-SEC-15 | Informativo | Ownership está bem representado nos casos E2E principais, mas não há uma matriz automatizada cobrindo todos os endpoints com ids                                                                             | Uma regressão futura pode remover uma checagem sem falha transversal                                                    | Criar testes parametrizados de isolamento por módulo e recurso                                                               | P1         | Cada endpoint com id/ownership: owner, outro usuário, inexistente e sessão inválida                           |

## Autorização e isolamento por módulo

| Área                                 | Estado observado                                                                                        | Risco residual                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Auth                                 | registro/login públicos; `/auth/me` valida Bearer                                                       | sem rate limit; segredo default; sem revogação                     |
| Users/Fitness                        | resolve perfil pelo `authUserId`; criação é do usuário autenticado                                      | cobertura negativa não uniforme para todos os recursos             |
| Training/Progress                    | plano é relacionado ao fitness do perfil; sessões conferem `userProfileId`; logs conferem plano/fitness | consolidar testes para todo id recebido e respostas `404/403`      |
| Recovery/Nutrition                   | leituras e escritas partem do perfil autenticado; replace confere plano ativo e meal do próprio perfil  | validar limites e minimização de read models                       |
| AI/Coach                             | chat/histórico e decisões usam perfil autenticado; replay confere ownership                             | debug/context/prompt devem ter boundary administrativo             |
| Habits/Notifications/Personalization | replays conferem perfil antes de acessar o snapshot                                                     | falta de RBAC interno e matriz transversal                         |
| Dashboard/Health                     | dashboard autenticado; health público                                                                   | debug do dashboard é interno; readiness deve ser avaliado por rede |

Não foi observada, nesta leitura, uma exposição confirmada de recurso de outro usuário nos fluxos E2E existentes. Isso não é evidência de cobertura completa: os endpoints com ids arbitrários e todos os módulos ainda precisam da matriz negativa prevista em S3-SEC-15.

## Validação de entrada

O padrão global é adequado como baseline: propriedades desconhecidas são rejeitadas e transformações numéricas/data são aplicadas por DTO. A cobertura de decorators é boa nos request DTOs críticos, mas há diferenças relevantes:

- `RecordEngagementEventRequestDto.metadata` aceita objeto arbitrário sem limite de profundidade/tamanho;
- ids de domínio como `mealId`, `trainingPlanId` e nomes de exercícios são strings sem uma política uniforme de tamanho/formato;
- arrays de alimentos, restrições, alergias e exercícios não têm cardinalidade máxima uniforme;
- headers, especialmente `x-request-id`, não têm DTO/validação equivalente;
- respostas TypeScript não são validação runtime de dados que saem do Mongo.

Esses pontos são riscos de robustez/abuso, não defeitos funcionais confirmados nesta etapa.

## Dados sensíveis, logs e traces

- O fluxo de auth retorna token apenas no payload de login e não o registra deliberadamente nos middlewares observados.
- O logger de request registra método, URL/path, status, duração e request id. O logger de runtime usa `originalUrl` completo, portanto query params devem ser tratados como potencialmente sensíveis mesmo quando os DTOs atuais usam apenas filtros/limites.
- Há dois middlewares de logging, com níveis e formatos diferentes; isso dificulta garantir redaction consistente.
- O mobile imprime somente a base URL em desenvolvimento, mas isso ainda pode revelar topologia interna em logs locais.
- Os módulos de AI/observabilidade possuem redaction e testes específicos, porém endpoints debug continuam sendo uma superfície de exposição de dados de saúde/contexto.
- `sourceContext` aparece em vários read models públicos; é necessário decidir se cada campo é dado de produto, dado interno ou dado sensível antes de restringir ou manter o contrato.

## Rate limiting e abuso

Não foi encontrado controle de taxa HTTP por IP, usuário, sessão ou rota. O rate limit interno do provedor LLM não protege a API contra chamadas repetidas ao endpoint `/ai/chat`; o fallback pode continuar consumindo Mongo e serviços de contexto. O primeiro lote deve cobrir:

1. `/auth/login` e `/auth/register`;
2. `/ai/chat` e `/ai/chat/stream`;
3. geração/replay de feedback, decisões e recomendações;
4. endpoints de escrita de nutrição, progress e engagement;
5. debug/replay, até sua remoção da superfície pública ou proteção administrativa.

Devem ser definidos limites, janela, chave, resposta `429`, headers e estratégia distribuída antes da implementação.

## MongoDB e coleções

O código acessa Mongo via repositories e `@InjectModel`, com coleções separadas para auth, perfis, fitness, treino, progress, recovery, nutrição, Coach, habits, notifications e personalization. Não foi encontrado acesso HTTP direto ao Mongo.

O risco está na configuração de ambiente: Compose publica `27017` no host e usa URI sem credencial; `app.module.ts` exige `MONGODB_URI`, mas não valida autenticação, TLS, origem/rede ou privilégio mínimo. A configuração de produção autorizada não foi fornecida e, portanto, não foi presumida como segura.

## Dependências e configurações de segurança

Confirmados no workspace: `@nestjs/jwt`, `bcrypt`, `@nestjs/mongoose`, `mongoose`, `mongodb-memory-server` e OpenTelemetry. Não foram encontradas dependências HTTP de rate limiting ou Helmet. Não foi executado `npm audit` nem alterado o lockfile nesta etapa; o diagnóstico de vulnerabilidades de versões deve ser um passo separado do CI/SCA.

## Cobertura de testes existente e lacunas

Já existem testes de:

- login, registro duplicado, `/auth/me`, ausência/invalidez/expiração de token;
- ownership de perfil, plano, sessão de treino e conversa do Coach;
- payloads desconhecidos via `forbidNonWhitelisted` e erros `400/401/404/409/500/503` em áreas selecionadas;
- redaction de AI, observabilidade e não exposição de segredos em snapshots específicos.

Ainda são necessários:

- matriz parametrizada de owner/outro usuário/inexistente para todos os endpoints com ids;
- testes de que debug/replay não são acessíveis por usuário comum após a decisão de arquitetura;
- rate limit e resposta `429` por categoria;
- testes de CORS e headers de segurança;
- testes de logs sem query/body/token e de correlation id controlado;
- testes de startup fail-closed sem `JWT_SECRET` e sem credenciais Mongo em produção;
- testes de minimização de `sourceContext`/dados sensíveis por DTO público;
- fuzz/limites de DTOs e payloads aninhados.

## Primeiro lote seguro de implementação

O primeiro lote recomendado, após aprovação das decisões necessárias, é:

1. eliminar o fallback de `JWT_SECRET` fora de desenvolvimento e validar configuração de produção;
2. restringir CORS por ambiente;
3. proteger ou desabilitar por ambiente as rotas debug/replay, sem removê-las antes de mapear consumidores;
4. introduzir rate limiting específico para auth, Coach/IA e escritas sensíveis;
5. centralizar logging, retirar query params dos logs e validar `x-request-id`;
6. adicionar testes negativos de autorização para os endpoints identificáveis.

Esse lote é seguro porque trata boundaries, configuração e testes, preservando regras de negócio e contratos públicos. Mongo authentication/TLS e minimização dos read models devem seguir imediatamente após as decisões arquiteturais.

## Critérios de aceite para a implementação

- segredo JWT obrigatório e validado por ambiente não produtivo/produtivo, sem valor default conhecido;
- CORS com allowlist explícita e testes de preflight;
- nenhum debug/replay sensível acessível a usuário comum sem autorização documentada;
- rate limiting ativo para auth, IA/Coach e escritas sensíveis, com `429` observável;
- logs/traces sem tokens, passwords, query sensível, body bruto ou dados pessoais não necessários;
- matriz de isolamento cobrindo owner, outro usuário, inexistente, `401` e `403` quando aplicável;
- Mongo não exposto publicamente por padrão, com autenticação/TLS/privilégio mínimo definidos para host/CI;
- DTOs com limites de tamanho, profundidade, cardinalidade e formato;
- `npm audit`/SCA executado no CI com política de exceções registrada;
- regressão completa de E2E, API, `api-client`, mobile e builds sem degradação.

## Itens fora do escopo

- implementação das correções acima;
- redesign de autenticação, refresh tokens ou autorização multi-tenant sem decisão arquitetural;
- pentest externo, DAST, SAST especializado, fuzzing de rede ou análise de infraestrutura do host autorizado;
- auditoria de contas, permissões ou configuração real de produção não disponibilizada;
- rotação de segredos, alteração de Docker/Compose, migração de Mongo ou mudança de contratos públicos;
- revisão visual do mobile e segurança do dispositivo físico;
- análise jurídica/compliance de dados de saúde.

## Implementação do primeiro lote — configuração e endpoints internos

Implementado sem alteração de regras de negócio ou de contratos públicos:

- `JWT_SECRET` agora é resolvido no bootstrap do `AuthModule`. O valor conveniente `dev-secret` só é aceito quando `NODE_ENV=development` está explicitamente definido; em `production`, `preproduction`, `staging`, `test` ou ambiente não definido, a ausência do segredo interrompe a inicialização.
- CORS deixou de aceitar qualquer origem. `CORS_ALLOWED_ORIGINS` é uma lista separada por vírgulas; wildcard é rejeitado. Em desenvolvimento explícito, a lista local padrão cobre apenas `localhost`/`127.0.0.1` nas portas usadas pelo workspace. Fora de desenvolvimento, a ausência da allowlist interrompe o bootstrap.
- As 12 rotas HTTP de debug/replay identificadas receberam `InternalEndpointGuard` junto do `AuthSessionGuard`. Fora de desenvolvimento explícito, retornam 404 genérico; em desenvolvimento explícito, continuam exigindo Bearer token válido. Não foram encontrados endpoints HTTP de seed.

Rotas protegidas:

- `/ai/chat/debug`, `/ai/chat/debug/history`, `/ai/chat/debug/memory`, `/ai/chat/debug/prompt` e `/ai/chat/debug/reply-path`;
- `/ai/debug/coach-feedback`, `/ai/debug/coach-feedback/:id/replay` e `/ai/coach-decision/debug/:id/replay`;
- `/dashboard/home/debug`, `/habits/debug/:id/replay`, `/notifications/debug/:id/replay` e `/personalization/debug/:id/replay`.

Variáveis adicionadas/documentadas:

| Variável                     | Desenvolvimento explícito                                     | Demais ambientes                                                                 |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`                   | deve ser `development` para habilitar fallback/rotas internas | `production`/`preproduction`/`staging` recomendado e sem comportamento implícito |
| `JWT_SECRET`                 | opcional apenas para o fallback local                         | obrigatório; ausência falha o bootstrap                                          |
| `CORS_ALLOWED_ORIGINS`       | opcional, com defaults locais restritos                       | obrigatório, sem `*`                                                             |
| `INTERNAL_ENDPOINTS_ENABLED` | `true` por padrão; pode ser `false`                           | sempre desabilitado por esta etapa                                               |

Testes adicionados/ajustados:

- startup/configuração: segredo ausente em produção e pré-produção, fallback apenas em desenvolvimento explícito, allowlist CORS e origem permitida/rejeitada;
- guard interno: ambiente não autorizado bloqueado e desenvolvimento explícito permitido;
- E2E existente do Coach: rota interna retorna 404 em produção, 401 sem autenticação em desenvolvimento e permanece disponível com sessão autenticada em desenvolvimento;
- fixtures E2E que assinavam token com fallback inseguro passaram a exigir o segredo configurado pelo ambiente de teste.

Validação realizada:

- testes direcionados de configuração/guard: **2 suítes, 7 testes aprovados**;
- build da API e dependências Nx (`types`/`api-client`): aprovado;
- E2E direcionado do Coach: bloqueado neste sandbox por `MongoMemoryServer` falhar com `listen EPERM` ao tentar bindar `0.0.0.0`; a execução deve ser repetida no host autorizado, onde a configuração de bind local já foi validada anteriormente;
- não foram executadas alterações de rate limiting, RBAC, MongoDB ou logs neste lote.

Riscos residuais:

- não há RBAC administrativo para permitir debug em staging/produção; a decisão adotada é desabilitar essas rotas nesses ambientes;
- rate limiting, headers de segurança e redaction centralizado continuam pendentes;
- autenticação/TLS/privilégio mínimo do MongoDB continua pendente;
- a configuração efetiva do host de produção deve fornecer segredo e allowlist por secret manager/deployment, sem copiar os valores de exemplo.

Decisões pendentes:

- modelo de autorização para eventual operação interna fora de development;
- política de rate limiting distribuído e resposta `429`;
- política de rotação/revogação de JWT e logout;
- classificação e minimização de `sourceContext` e dados de saúde em read models.

Próximo lote recomendado: rate limiting de auth/Coach/escritas sensíveis, seguido de redaction/correlação de logs e headers de segurança. Depois, aplicar matriz de isolamento por owner e hardening de MongoDB.

## Implementação do segundo lote — rate limiting

### Estratégia

O rate limiting foi implementado como `APP_INTERCEPTOR` global no `RateLimitModule`, com políticas resolvidas por método HTTP e rota. O health check não possui política.

| Grupo            | Rotas                                                     |      Limite | Janela | Chave                    |
| ---------------- | --------------------------------------------------------- | ----------: | -----: | ------------------------ |
| Auth             | `POST /auth/register`                                     |           5 |  1 min | IP                       |
| Auth             | `POST /auth/login`                                        |          10 |  1 min | IP                       |
| Coach/IA         | `POST /ai/chat`, `/ai/chat/stream`                        |          20 |  1 min | IP + usuário autenticado |
| Coach/IA         | `POST /ai/coach-feedback`                                 |           5 |  1 min | IP + usuário autenticado |
| Perfil/treino    | `POST /fitness/profile`, `/training/plans`                |      10 / 5 |  1 min | IP + usuário             |
| Check-in/treino  | `POST /progress/daily-check-in`, `/progress/workout-logs` |     20 / 20 |  1 min | IP + usuário             |
| Sessão de treino | `POST /progress/workout-sessions/start`, `/:id/complete`  |          10 |  1 min | IP + usuário             |
| Nutrição         | perfil, cálculo e plano                                   | 10 / 10 / 5 |  1 min | IP + usuário             |
| Nutrição         | logs e substituição de refeição                           |          30 |  1 min | IP + usuário             |
| Nutrição         | recomendações                                             |          10 |  1 min | IP + usuário             |
| Engagement       | `POST /notifications/:id/events`                          |          30 |  1 min | IP + usuário             |

Recovery não possui endpoint HTTP de escrita direta; as operações que alimentam seus snapshots são check-in e treino, já limitadas acima. Leituras, health e endpoints públicos não sensíveis não receberam limite nesta etapa.

As chaves nunca armazenam IP, email, token ou id de usuário em claro: a composição da política, IP e identidade é convertida em SHA-256 antes de chegar ao armazenamento. Para endpoints anônimos, apenas o IP é usado. A combinação IP + usuário diferencia usuários legítimos atrás do mesmo NAT, mantendo alguma proteção contra abuso por origem.

Ao exceder o limite, a API responde `429` com `code=RATE_LIMIT_EXCEEDED`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` e `Retry-After`. As respostas abaixo do limite também recebem os headers informativos.

### Backend e configuração

Foi criada a abstração assíncrona `RateLimitStore`, com `MemoryRateLimitStore` para desenvolvimento/testes e contrato pronto para um adapter Redis ou equivalente. Nenhum Redis foi adicionado ao workspace ou presumido na infraestrutura.

Variáveis:

- `RATE_LIMIT_ENABLED=true|false` — obrigatório fora de `development`/`test`;
- `RATE_LIMIT_STORE=memory|redis` — obrigatório fora de `development`/`test`;
- `memory` é adequado apenas a uma instância; em produção distribuída deve ser substituído por adapter compartilhado;
- selecionar `redis` sem adapter instalado falha explicitamente no startup, evitando comportamento parcialmente protegido;
- exemplos local e Docker foram atualizados com configuração explícita.

### Testes e resultados

Foram adicionados testes para configuração inválida, políticas independentes, janela e reset, chave anônima por IP, identidade autenticada, headers, `429`, exclusão do health e integração HTTP.

- direcionados: **4 suítes / 11 testes aprovados**;
- API completa: **227 suítes / 1.391 testes aprovados**;
- E2E direcionado das suítes afetadas: aprovado;
- E2E completo no host autorizado: **23 suítes / 80 testes aprovados**;
- builds de API, `types` e `api-client`: aprovados;
- lint: aprovado;
- `git diff --check`: aprovado;
- `format:check` global continua sinalizando artefatos iOS gerados e `docs/validation/sprint-2-critical-e2e.md` preexistente; todos os arquivos deste lote passam no check direcionado.

### Riscos residuais e próximo lote

- o backend de memória não fornece contagem compartilhada entre réplicas, reinicia com o processo e pode ser contornado por distribuição de tráfego; isso está explícito na configuração e não deve ser usado como solução distribuída;
- não há rate limiting distribuído até que a infraestrutura forneça Redis ou outro backend compartilhado e seus requisitos de disponibilidade;
- limites são fixos por código nesta etapa; uma futura configuração externa deve validar limites por ambiente sem permitir desativação acidental;
- `x-forwarded-for` não é usado diretamente como chave; a implantação deve definir `trust proxy` somente quando houver proxy confiável;
- próximo lote recomendado: adapter distribuído, métricas de 429 sem dados sensíveis, headers de segurança e redaction/correlação centralizada.

## Terceiro lote — backend distribuído e métricas de `429`

### Decisão de infraestrutura

A inspeção confirmou que o workspace não possui cliente Redis, adapter previamente suportado ou serviço Redis no `docker-compose.yml`. A infraestrutura versionada contém MongoDB, API e OpenTelemetry, mas não fornece URL, credenciais, TLS ou política de disponibilidade para Redis em pré-produção/produção.

Por isso, não foi adicionada dependência nem serviço externo e não foi declarado suporte de produção que não pudesse ser validado. `RATE_LIMIT_STORE=redis` continua falhando explicitamente no bootstrap até que um backend aprovado seja provisionado. O backend `memory` permanece disponível somente para desenvolvimento/testes e não é considerado solução para múltiplas réplicas.

A abstração `RateLimitStore.increment(key, windowMs)` permanece o ponto de troca para um adapter distribuído. O adapter futuro deverá usar incremento atômico por chave e janela, TTL automático e configuração de URL/host/porta, credenciais, TLS e timeout por ambiente. Também deverá definir, antes da ativação, uma política explícita para indisponibilidade do Redis; para proteção contra abuso, a recomendação é fail-closed, com alerta operacional, sem liberar requisições silenciosamente.

### Métricas e observabilidade de `429`

Foi adicionado `RateLimitMetrics`, integrado ao interceptor global. Cada excesso é contado pela rota lógica limitada (`policyId`) e método HTTP, mantendo cardinalidade limitada e sem incluir IP, token, email ou identificador de usuário. O evento estruturado registra somente `rate_limit_exceeded`, política, método, janela e `requestId` de correlação.

As métricas são atualmente locais ao processo; portanto, não representam uma contagem agregada entre réplicas. Os headers existentes `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` e `Retry-After` foram preservados. O health check continua sem política de rate limiting e não gera `429` por esse mecanismo.

### Testes e validação

Foram adicionados testes unitários da métrica e uma asserção de integração HTTP que confirma a emissão da métrica quando o limite de login é excedido. A cobertura existente continua validando janela, expiração/reset, chaves isoladas, identidade autenticada, requisições anônimas, políticas independentes, configuração inválida e backend em memória.

- testes direcionados: **5 suítes / 12 testes aprovados**;
- API completa: **228 suítes / 1.392 testes aprovados**;
- E2E completo com MongoDB real: **23 suítes / 80 testes aprovados**;
- builds de `api`, `types` e `api-client`: aprovados;
- lint: aprovado;
- `git diff --check`: aprovado;
- check direcionado de Prettier: aprovado;
- `npm run format:check` global continua reportando 43 arquivos gerados do iOS e `docs/validation/sprint-2-critical-e2e.md`, sem relação com este lote.

Não foram adicionados testes de Redis porque não existe cliente ou servidor aprovado no ambiente atual. O comportamento de falha explícita de `RATE_LIMIT_STORE=redis` permanece a proteção contra uma configuração incompleta, e não um teste de integração disfarçado de suporte distribuído.

### Riscos residuais e próximo lote recomendado

- não há backend distribuído validado; múltiplas réplicas continuam exigindo provisionamento e decisão operacional;
- métricas de `429` são processuais e não agregadas entre instâncias;
- ainda é necessário escolher cliente Redis, contrato de conexão, timeout, TLS, secret manager, health/readiness e política fail-closed/fail-open;
- a estratégia atual de hash e headers permanece compatível, mas o adapter distribuído deve preservar exatamente essa interface;
- próximo lote recomendado: aprovar a infraestrutura Redis, implementar o adapter com operação atômica e TTL, executar testes com Redis efêmero aprovado e publicar métricas agregadas via o pipeline de observabilidade existente.

### Revalidação formal de habilitação Redis

Data da revalidação: 2026-08-20.

| Verificação                        | Evidência                                                                                                                | Status         | Decisão                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | --------------------------------------------------- |
| Cliente Redis nas dependências     | `package.json`, `package-lock.json` e `npm ls redis ioredis --depth=0` não apresentam cliente instalado                  | Bloqueado      | Não instalar dependência nesta etapa                |
| Serviço Redis local/CI             | `docker-compose config --services` retorna somente `mongo` e `api`                                                       | Bloqueado      | Não adicionar serviço ao Compose                    |
| Variáveis aprovadas                | `.env.example` e `.env.docker.example` mantêm `RATE_LIMIT_STORE=memory`; não há `REDIS_URL`, TLS, credenciais ou timeout | Bloqueado      | Não habilitar `redis`                               |
| Pré-produção/produção              | Não há manifestos de deploy, secrets/configuração ou endpoint Redis versionados/aprovados no workspace                   | Não comprovado | Requer confirmação externa do ambiente autorizado   |
| TLS, timeout e reconnect           | Nenhuma configuração Redis disponível                                                                                    | Não definido   | Deve ser aprovado antes do adapter                  |
| Health/readiness e observabilidade | Health atual verifica Mongo; observabilidade existente é OTLP genérica e não possui health/metricas Redis                | Parcial        | Definir sinais e alertas operacionais               |
| Fail-open/fail-closed              | O adapter não existe; não há política implementável para indisponibilidade Redis                                         | Pendente       | Recomenda-se fail-closed para proteção contra abuso |
| Múltiplas réplicas                 | O backend em memória permanece local ao processo                                                                         | Não suportado  | Redis compartilhado é pré-requisito                 |

#### Plano técnico de provisionamento

1. **Infraestrutura/DevOps:** provisionar uma instância Redis gerenciada ou serviço aprovado para pré-produção, com endpoint privado, TLS obrigatório, autenticação por secret manager, ACL com somente os comandos necessários e política de retenção/expiração.
2. **Segurança:** aprovar rede, rotação de credenciais, certificado, segregação por ambiente, fail-closed e limites operacionais; confirmar que chaves continuam sendo apenas hashes e nunca valores pessoais em claro.
3. **Plataforma/Observabilidade:** definir timeout, reconnect/backoff, readiness, métricas de erro/latência/disponibilidade e alertas sem cardinalidade sensível; definir owner e runbook para indisponibilidade.
4. **API:** somente após a aprovação, adicionar o cliente já suportado pela plataforma, implementar o adapter atrás de `RateLimitStore` com `INCR` atômico e TTL por janela, e manter `MemoryRateLimitStore` para desenvolvimento/testes.
5. **QA/Release:** validar com servidor Redis efêmero aprovado ou ambiente de pré-produção real: concorrência, TTL, isolamento de chaves, múltiplas réplicas, falha de conexão, headers e métricas de `429`; então habilitar `RATE_LIMIT_STORE=redis` por configuração explícita e rollout progressivo.

Responsáveis requeridos: **DevOps/Plataforma** pelo provisionamento e disponibilidade; **Segurança** pela aprovação de TLS, secrets, ACL e política de falha; **Observabilidade/SRE** por health, métricas e alertas; **API** pelo adapter; **QA/Release** pela certificação e rollout. Os responsáveis nominais e o ambiente de destino ainda precisam ser definidos externamente.

#### Critérios para desbloqueio

- cliente Redis e versão aprovados pela plataforma;
- endpoint privado de pré-produção disponível, com TLS e credencial injetada por secret manager;
- timeout, reconnect/backoff, health/readiness e política fail-closed aprovados;
- serviço compatível com múltiplas réplicas e teste de concorrência executado;
- métricas e alertas de disponibilidade, latência e erros definidos;
- `RATE_LIMIT_STORE=redis` habilitado somente por configuração explícita no ambiente validado;
- testes direcionados, API, E2E, builds, lint, format e `git diff --check` aprovados.

Nesta revalidação não houve instalação de dependências, alteração do Compose, alteração de variáveis de ambiente, implementação de adapter ou mudança no comportamento funcional. O rate limiting existente permanece no backend em memória e a seleção de Redis continua falhando explicitamente quando configurada sem adapter.

## Próximo lote — ownership e isolamento entre usuários

### Escopo e matriz auditada

O mapeamento foi realizado nos controllers, casos de uso, repositórios Mongoose e testes existentes. O identificador de ownership é resolvido do token (`authUserId`) e convertido em `userProfile.id` pelo `UserProfileRepository`; nenhum endpoint público auditado aceita `userProfileId` ou `authUserId` como fonte de autoridade no payload.

| Módulo/recursos             | Endpoints auditados                                                               | Origem do ownership e validação                                                             | Recurso de outro usuário                                      | Resultado              |
| --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| Progress / workout sessions | start, `/:sessionId`, `/:sessionId/complete`, logs, summary, histórico e check-in | perfil autenticado; sessão, plano e logs são comparados/consultados pelo perfil             | `404` sem alterar o recurso                                   | Sem risco reproduzível |
| Recovery                    | current/today/history/experience                                                  | casos de uso carregam o perfil pelo `authUserId` e repositórios filtram por `userProfileId` | resposta vazia/indisponível sem revelar existência            | Sem risco reproduzível |
| Nutrição                    | profile, plans, today, history, logs, replace, recommendations                    | perfil autenticado; plano ativo, meal e logs são resolvidos dentro do perfil                | `404`/código de recurso não encontrado                        | Sem risco reproduzível |
| Coach e conversas           | chat, stream, chat history, feedback e decisões                                   | conversa e contexto são derivados do perfil autenticado; replay compara `userProfileId`     | `404` para replay; histórico de outro usuário permanece vazio | Sem risco reproduzível |
| Dashboard                   | home e home/debug                                                                 | casos de uso recebem somente `authUserId`                                                   | `401` sem sessão; dados do próprio perfil                     | Sem risco reproduzível |
| Hábitos                     | today/current/history/summary/risk e replay                                       | leituras por `authUserId`; replay compara snapshot com perfil                               | `404`                                                         | Sem risco reproduzível |
| Notificações                | today/current/history/summary, events e replay                                    | decisão/evento são verificados contra o perfil antes de escrever; replay compara owner      | `404` e nenhuma alteração                                     | Sem risco reproduzível |
| Personalização              | today/current/history/patterns/profile e replay                                   | leituras por `authUserId`; replay compara snapshot com perfil                               | `404`                                                         | Sem risco reproduzível |
| Treino adaptativo e planos  | today/current/history, create/get plan                                            | perfil/fitness profile autenticados; plano deve pertencer ao fitness profile do usuário     | `404`                                                         | Sem risco reproduzível |

### Política de autenticação e inexistência

- ausência, token inválido ou sessão expirada retorna `401` (`Invalid session`);
- identificador malformado retorna `400` quando o contrato valida formato;
- recurso inexistente ou pertencente a outro usuário retorna `404` com o código de “not found” do módulo;
- não foi introduzido `403` para recursos privados, preservando a política de não revelar a existência de dados de terceiros;
- payloads não podem definir o owner: `authUserId` é sempre obtido da sessão e `userProfileId` enviado pelo cliente é rejeitado pelo `ValidationPipe` com whitelist/forbidNonWhitelisted.

### Testes adicionados e resultados

Foram adicionadas regressões E2E em:

- `apps/api/test/e2e/workout-completion.e2e-spec.ts`: outro usuário não pode consultar, concluir ou registrar log em sessão/plano alheios;
- `apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts`: `userProfileId` enviado pelo cliente não pode substituir o owner autenticado.

Os testes existentes de Coach, Recovery, nutrição, notificações, hábitos, personalização, treino e autenticação já cobriam isolamento, perfil derivado da sessão, `401`, `404` e replays cross-user; foram preservados sem alteração funcional.

- E2E direcionado: **2 suítes / 7 testes aprovados**;
- E2E completo com MongoDB real: **23 suítes / 81 testes aprovados**;
- API completa: **228 suítes / 1.392 testes aprovados**;
- builds de `api`, `types` e `api-client`: aprovados;
- lint: aprovado;
- `git diff --check`: aprovado;
- `format:check` global continua reportando somente artefatos iOS gerados e `docs/validation/sprint-2-critical-e2e.md`; os arquivos deste lote foram formatados e verificados de forma direcionada.

Nenhuma vulnerabilidade de ownership reproduzível exigiu alteração em código funcional. As únicas alterações deste lote são testes E2E de regressão e esta documentação; nenhum contrato público, regra de negócio ou comportamento mobile foi alterado.

### Riscos residuais e próximo lote

- repositórios internos ainda possuem métodos genéricos `findById`; a proteção depende do caso de uso manter a verificação de owner antes de qualquer operação, devendo ser evitada a reutilização direta desses métodos em novos endpoints;
- não há uma camada única de policy/ownership para novos módulos; a consistência atual depende dos casos de uso existentes;
- operações administrativas/debug permanecem protegidas pelo lote de endpoints internos e não fazem parte do acesso público;
- segue pendente o hardening de acesso direto ao MongoDB, incluindo autenticação, TLS, rede privada e privilégio mínimo;
- próximo lote recomendado: revisar redaction de logs/traces e formalizar helpers/policies de ownership para reduzir regressões em novos recursos, seguido de hardening do MongoDB.

## Próximo lote — redaction e proteção de dados sensíveis

### Escopo e classificação

Foram classificados como sensíveis: cabeçalhos `Authorization`, cookies, Bearer/JWT e refresh tokens; senhas, secrets e API keys; emails; identificadores de autenticação, perfil e conversa; dados de saúde, treino, recovery e nutrição; prompts, mensagens e conteúdo do Coach/LLM; query params sensíveis; e mensagens, objetos e stacks de erro.

### Pontos protegidos

- O logging de requisições agora registra apenas rota lógica sem query string, método, status, duração e `requestId` sanitizado.
- IDs de correlação inválidos ou com conteúdo sensível são substituídos por hash não reversível; IDs seguros continuam disponíveis para diagnóstico.
- Métricas e logs de `429` mantêm apenas rota/método/política/janela e `requestId` sanitizado, sem IP bruto, token, email ou identificador pessoal.
- Erros de bootstrap não serializam o objeto de erro nem stack potencialmente sensível.
- Logs de check-in e decisões do Coach não incluem mais `userProfileId` em claro.
- Traces internos de Coach Intelligence, Agent e Experts armazenam identificadores de contexto como hashes não reversíveis; prompts, respostas e dados de contexto não são emitidos como atributos.

### Política central

`apps/api/src/common/security/redaction.ts` concentra a política. Chaves sensíveis são substituídas por `[REDACTED]`; textos passam por remoção de Bearer/JWT, credenciais em formato `key=value` e emails; identificadores operacionais que precisam permanecer em traces são convertidos para `redacted-<16 hex>`. Paths são normalizados removendo query e fragmento. Erros expostos à observabilidade preservam somente nome/tipo e mensagem sanitizada, sem stack ou objeto bruto.

Exemplos seguros:

```text
[Request] requestId=request-123 method=GET path=/nutrition/history status=400 durationMs=12.4
{ event: "rate_limit_exceeded", policyId: "auth.login", method: "POST", requestId: "request-123" }
trace.context.userProfileId = "redacted-0123456789abcdef"
```

Nenhum contrato público, prompt ou regra de decisão do Coach foi alterado.

### Testes e validação

- Testes direcionados de redaction, middleware e métricas: 5 suítes / 15 testes aprovados.
- Testes direcionados de traces: 3 suítes / 12 testes aprovados.
- API completa: 230 suítes / 1.401 testes aprovados.
- E2E completo com MongoDB real: 23 suítes / 81 testes aprovados.
- Builds de `api`, `types` e `api-client`: aprovados.
- `npm run lint`: aprovado.
- `git diff --check`: aprovado.
- `npm run format:check`: bloqueado por 42 artefatos gerados em `apps/mobile/ios` e pelo documento histórico `docs/validation/sprint-2-critical-e2e.md`; os arquivos do lote atual foram formatados e verificados de forma direcionada.

### Riscos residuais e próximo passo

Ainda é necessário aplicar a política central a novos pontos de logging que venham a ser adicionados, revisar periodicamente a lista de campos sensíveis e definir observabilidade agregada para rate limiting distribuído quando Redis for aprovado. Os traces atuais continuam sendo armazenamento interno em memória, e o hardening de autenticação/TLS/privilégio mínimo do MongoDB permanece pendente.

Próximo lote recomendado: hardening de acesso ao MongoDB e revisão sistemática de logs customizados restantes, seguida de decisão arquitetural sobre RBAC para superfícies internas.

## Próximo lote — revisão e fortalecimento da validação de entrada

### DTOs e pontos auditados

Foram revisados os DTOs de autenticação, perfil fitness, plano de treino, sessões e logs de treino, check-in, Recovery, nutrição, Coach/IA, dashboard, hábitos, notificações e personalização. A validação global permanece configurada com `transform: true`, `whitelist: true` e `forbidNonWhitelisted: true`; os endpoints internos continuam sujeitos ao gating já implementado.

O payload de chat do Coach deixou de usar a união `DTO | Record<string, unknown>` no parâmetro HTTP, permitindo que o `ValidationPipe` aplique diretamente os limites declarativos de mensagem, além da checagem manual de compatibilidade já existente.

### Campos protegidos e limites adotados

- credenciais: email até 254 caracteres e senha até 128 caracteres;
- Coach: mensagem entre 1 e 1.000 caracteres;
- identificadores de plano/perfil: `IsMongoId` nos recursos Mongo usados por criação de plano e log de treino;
- treino: índice entre 0 e 1.000, duração entre 1 e 300 minutos, até 100 exercícios, nomes até 120 caracteres, séries/repetições até 1.000 e feedback até 500 caracteres;
- nutrição: até 20 itens por lista de restrições/alergias/preferências, cada item até 100 caracteres, macros não negativos com até duas casas decimais e limites máximos explícitos; `mealId` até 200 caracteres;
- histórico nutricional: cursor até 512 caracteres, limites de página preservados e datas/intervalos continuam validados pelo DTO e serviço de consulta;
- campos desconhecidos, `authUserId`, `userProfileId` e demais campos internos enviados pelo cliente são rejeitados pelo pipeline global.

Os limites de índice de treino foram mantidos suficientemente amplos para preservar a semântica existente: `workoutDayIndex=999` continua sendo entrada sintaticamente válida e permite que o caso de uso retorne `WORKOUT_NOT_AVAILABLE`, enquanto valores extremos são rejeitados na borda.

### Testes adicionados e resultados

- Teste unitário de hardening de DTOs: 1 suíte / 4 testes aprovados.
- E2E direcionado de Coach, nutrição e criação de plano: 3 suítes / 11 testes aprovados.
- E2E direcionado de início de treino e Recovery: 2 suítes / 5 testes aprovados.
- API completa: 231 suítes / 1.405 testes aprovados.
- E2E completo com MongoDB real: 23 suítes / 81 testes aprovados.
- Builds de `api`, `types` e `api-client`: aprovados.
- `npm run lint`: aprovado.
- `git diff --check`: aprovado.

Durante a validação foi reproduzida uma incompatibilidade: um teste existente esperava que `workoutDayIndex=999` chegasse ao domínio. O primeiro limite de 31 alterava a resposta para erro genérico de validação; o limite foi ajustado para 1.000, preservando o contrato funcional e mantendo proteção contra valores extremos. Nenhuma regra de negócio foi modificada.

### Riscos residuais e decisões pendentes

`transform: true` continua convertendo strings numéricas para DTOs numéricos, comportamento necessário para query params e compatibilidade dos clientes; valores não numéricos e frações onde não permitidas são rejeitados. Metadados de eventos de notificação permanecem deliberadamente como objeto extensível e devem receber contrato próprio caso passem a transportar dados sensíveis ou campos operacionais.

Ainda é recomendável padronizar validação de parâmetros de recurso (`:id`) nos endpoints internos restantes e formalizar limites de paginação/cursor por contrato compartilhado. Não houve alteração de prompts, logs, rate limiting, contratos de resposta ou regras de negócio neste lote.

## Fechamento da Sprint 3 — validação final

### Baseline final

- API: **231 suítes / 1.405 testes aprovados**.
- E2E com MongoDB real efêmero: **23 suítes / 81 testes aprovados**.
- `api-client`: testes e build aprovados no target Nx.
- Builds de `api`, `types` e `api-client`: aprovados.
- Lint: aprovado.
- `git diff --check`: aprovado.
- Formatação direcionada dos arquivos do lote e desta documentação: aprovada.
- `npm run format:check` global: permanece bloqueado por 42 artefatos iOS gerados e pelo documento histórico da Sprint 2, conforme escopo definido.

### Achados e cobertura final

| Grupo                                    | Situação final                | Evidência / risco residual                                                                                                                                            |
| ---------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3-SEC-01 debug/replay                   | Corrigido parcialmente        | Endpoints são bloqueados fora de desenvolvimento e protegidos pelo boundary interno; RBAC formal continua pendente para operação autorizada em ambientes controlados. |
| S3-SEC-02 CORS                           | Corrigido                     | Allowlist configurável e testes de origem permitida/rejeitada.                                                                                                        |
| S3-SEC-03 rate limiting                  | Corrigido parcialmente        | Limites, `429`, headers e métricas locais testados; Redis/distribuição entre réplicas depende de infraestrutura aprovada.                                             |
| S3-SEC-04 segredo JWT                    | Corrigido                     | Falha explícita fora de desenvolvimento e fallback restrito a desenvolvimento explícito.                                                                              |
| S3-SEC-05 MongoDB                        | Pendente externo              | Falta autenticação/TLS/rede privada/privilégio mínimo aprovados; não alterado nesta etapa.                                                                            |
| S3-SEC-06 redaction/correlação           | Corrigido                     | Query strings, tokens, cookies, IDs sensíveis e erros brutos protegidos; `requestId` preservado de forma segura.                                                      |
| S3-SEC-07 logout/revogação               | Decisão pendente              | Access tokens permanecem válidos até expiração; requer decisão sobre denylist, refresh rotativo ou modelo curto explícito.                                            |
| S3-SEC-08 `sourceContext`/dados de saúde | Decisão pendente              | Exposição pública ainda requer classificação e read models mínimos.                                                                                                   |
| S3-SEC-09 validação de entrada           | Corrigido                     | DTOs, ownership, limites, enums, IDs e payloads desconhecidos cobertos por testes unitários/E2E.                                                                      |
| S3-SEC-10 headers de segurança           | Pendente                      | Helmet/CSP e política compatível com Web/Expo ainda não foram aprovados.                                                                                              |
| S3-SEC-11 RBAC                           | Decisão arquitetural          | Ownership está coberto; papéis e `403` para operações internas ainda não foram definidos.                                                                             |
| S3-SEC-15 isolamento transversal         | Coberto nos módulos auditados | Testes negativos de ownership e isolamento passam; matriz parametrizada completa permanece recomendada para novos endpoints.                                          |

Não há achado crítico. Os achados altos e médios estão corrigidos quando dependiam do código atual ou possuem dependência/plano explícito; S3-SEC-05, S3-SEC-07, S3-SEC-08, S3-SEC-10 e S3-SEC-11 exigem decisão/provisionamento antes de serem considerados encerrados.

### Regressões verificadas

Foram revalidados autenticação, CORS, endpoints públicos, debug/replay, rate limiting e métricas de `429`, ownership, redaction, DTOs, Coach/IA, treino, check-in, Recovery e nutrição. Não houve falha funcional reproduzível nos lotes de segurança. Falhas de formatação global foram classificadas como ambientais/fora do escopo.

### Itens fora do escopo desta Sprint

Não foram implementados adapter Redis ou provisionamento de Redis, RBAC, logout/revogação/refresh tokens, autenticação/TLS/privilégios do MongoDB, classificação final de `sourceContext`/dados de saúde, Helmet/CSP ou correção dos artefatos/documentação históricos de formatação.

### Status e recomendação

Status final: **Sprint 3 parcialmente concluída**. Os controles de aplicação priorizados foram implementados e validados, mas os investimentos de infraestrutura e decisões arquiteturais acima impedem declarar o programa de segurança encerrado integralmente.

Recomendação para a Sprint 4: priorizar hardening do MongoDB e provisionamento/aprovação do Redis distribuído; em seguida decidir RBAC e revogação de sessão, formalizar a classificação dos read models de saúde e aplicar headers de segurança após validar a compatibilidade Web/Expo.

## Resumo executivo

Achados classificados: **0 críticos, 5 altos, 6 médios, 2 baixos e 2 informativos**.

Módulos/endpoints mais afetados: auth (`register/login/me`), bootstrap/CORS, Mongo/Compose, todos os endpoints debug/replay, Coach (`chat/stream`), escritas de progress/nutrição/engagement e middlewares de logging.

Os lotes de aplicação — configuração fail-closed de JWT/CORS, gating de debug, rate limiting local, ownership, redaction e validação de entrada — foram implementados e validados. Permanecem como próximos investimentos a distribuição do rate limiting, hardening do MongoDB, RBAC, revogação de sessão, headers de segurança e classificação pública de `sourceContext`/dados de saúde.
