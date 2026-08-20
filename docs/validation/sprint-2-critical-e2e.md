# Sprint 2 — Fluxos críticos ponta a ponta

**Data da preparação:** 2026-08-20  
**Objetivo:** deixar o ambiente apto a validar os fluxos críticos ponta a ponta sem alterar regras de negócio, contratos da API ou comportamento mobile.

## Ambiente necessário

- Node.js 22 LTS e dependências instaladas com `npm ci`;
- workspace Nx executado pelo `npm exec nx`;
- runner/host com permissão para abrir sockets locais em `127.0.0.1`;
- espaço livre suficiente para o binário e os dados temporários do `MongoMemoryServer`;
- diretório temporário gravável (`TMPDIR`);
- para a suíte atual, não é necessário `mongod` persistente: cada suíte inicia um processo MongoDB real, efêmero, via `MongoMemoryServer`;
- para validação contra Mongo persistente, o Compose fornece MongoDB 7 em `mongodb://localhost:27017/elev9`, mas requer Docker disponível e configuração explícita dos testes.

## Configuração inspecionada

- `apps/api/jest.e2e.config.js` usa Jest em Node, `ts-jest`, timeout de 30 s, regex `*.e2e-spec.ts` e raiz `apps/api/test`;
- `apps/api/project.json` define `api:test:e2e` com Jest `--runInBand`;
- existem 17 arquivos E2E; cada um cria seu próprio `MongoMemoryServer`, conecta via `MongooseModule.forRoot(mongoMemoryServer.getUri())`, usa `supertest` e encerra app, Mongoose e Mongo no `afterAll`;
- as suítes não usam `MONGODB_URI` da aplicação principal, pois montam módulos Nest isolados com URI dinâmica;
- a API principal usa `MONGODB_URI` obrigatório e escuta em `0.0.0.0`; os E2E usam `app.init()` e não precisam abrir a porta HTTP da API;
- o Compose define MongoDB 7 em `27017` e API em `3000`.

## Comando oficial

```bash
npm exec nx run api:test:e2e --skip-nx-cache
```

## Falhas encontradas e classificação

Na sandbox restritiva, o comando produziu **17 suítes/60 testes falhos antes dos cenários**:

- `listen EPERM: operation not permitted 0.0.0.0` em `MongoMemoryServer.create()`: **permissão de bind**;
- `UnexpectedCloseError` com código 48: **encerramento/conflito de porta do processo Mongo efêmero**;
- `app.close()` com `app` indefinido após falha do `beforeAll`: **teardown secundário/open handles**;
- espaço: **não reproduzido nesta execução**; havia aproximadamente 25 GiB livres;
- Mongo persistente: **não disponível/iniciado**, mas não necessário para a configuração atual;
- defeito funcional: **não evidenciado**, pois os cenários não iniciaram.

## Execução no host autorizado

O mesmo comando terminou com **17 suítes aprovadas e 60 testes aprovados em 21,18 s**, sem falhas de teardown. A sonda de bind em `127.0.0.1` passou, a porta `27017` estava livre antes da execução, o `TMPDIR` era gravável e o `MongoMemoryServer` iniciou um `mongod` real efêmero.

## Correções aplicadas

Na preparação do ambiente, nenhuma alteração de código funcional foi necessária; o bloqueio foi resolvido executando a suíte em host autorizado a fazer bind local. Na validação de nutrição, foi aplicada somente a correção de validação do DTO de histórico documentada ao final deste arquivo. Nenhum teste foi removido, desabilitado ou enfraquecido; nenhum mock substituiu MongoDB.

## Limitações e correção recomendada para CI

O ambiente de sandbox continua inadequado para essa suíte. O CI deve executar o target em runner com permissões de rede local, `TMPDIR` gravável e espaço suficiente. Se a política exigir Mongo persistente, iniciar o serviço MongoDB 7 do Compose e fornecer uma configuração E2E explícita e isolada; não reutilizar dados de desenvolvimento.

## Próximos passos e critério de pronto

O ambiente foi aprovado para execução dos fluxos no host autorizado. O próximo passo é validar o runtime mobile contra a API E2E, começando pelo percurso de nutrição. O critério de pronto permanece: o comando oficial termina com todas as suítes aprovadas, o Mongo real inicia/encerra sem erro, não há conflito de portas nem falta de espaço, e `git diff --check` passa.

## Matriz de cobertura da Sprint 2

### Escopo e regra de leitura

A evidência de base foi a execução do target API com 17 suítes/60 testes aprovados, usando `supertest` diretamente contra módulos Nest isolados e MongoDB real efêmero. A atualização desta matriz acrescenta a suíte de nutrição, o contrato do `api-client` e as validações mobile descritas na seção final. Portanto, “aprovado” continua significando cobertura automatizada do escopo indicado, não validação automática do runtime mobile quando ele não foi iniciado.

| Fluxo crítico                        | Suíte e arquivo                                                                                                                               | Cenário coberto                                                                                                                     | Pré-condições e dados utilizados                                                                                   | Resultado esperado / atual                                                                                              | Cobertura | Risco                                                                                                    | Necessidade de correção                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Registro                             | `auth-register.e2e-spec.ts`                                                                                                                   | Registro válido e e-mail duplicado                                                                                                  | Mongo limpo por suíte; e-mails e senha de teste; payload de registro                                               | `201` com usuário/token e `409` no duplicado; **aprovado**                                                              | Completa  | Baixo para API; mobile não exercitado                                                                    | Nenhuma correção imediata; adicionar passagem pelo cliente/mobile na validação de integração |
| Login                                | `auth-login.e2e-spec.ts`                                                                                                                      | Login válido, senha incorreta e e-mail inexistente                                                                                  | Usuário previamente registrado; credenciais válidas/inválidas                                                      | `200` com token; `401` nos casos inválidos; **aprovado**                                                                | Completa  | Baixo para API                                                                                           | Nenhuma correção imediata                                                                    |
| Sessão                               | `auth-me.e2e-spec.ts`, `auth-onboarding.e2e-spec.ts`, `auth-api.spec.ts`                                                                      | `/auth/me` com token válido, sem token, inválido e expirado; client compartilhado e bootstrap mobile                                | Registro/login; Bearer válido, ausente, sintaticamente inválido e expirado; Mongo real                             | `200` para sessão válida e `401` nos demais; **aprovado**                                                               | Parcial   | Médio: restauração visual mobile ainda não executada                                                     | Validar runtime visual e logout local                                                        |
| Onboarding                           | `users-create-profile.e2e-spec.ts`, `fitness-create-profile.e2e-spec.ts`, `training-create-plan.e2e-spec.ts`, `dashboard-home.e2e-spec.ts`    | Perfil de usuário → perfil fitness → plano de treino → dashboard                                                                    | Usuário autenticado; dados de perfil, fitness e plano; Mongo isolado                                               | Cada criação retorna `201`, plano é consultável e dashboard reflete dados; **aprovado como sequência API**              | Parcial   | Alto: o onboarding do produto também inclui perfil nutricional e navegação mobile                        | Investigar onboarding completo incluindo nutrição e percurso mobile                          |
| Início de treino                     | `workout-start.e2e-spec.ts`; `progress-api.spec.ts`; `workout-overview-screen.tsx`                                                            | Início autenticado do treino do dia, persistência, reconsulta idempotente, indisponibilidade, dados inválidos e sessão ausente      | Perfil/fitness/plano; `trainingPlanId` e `workoutDayIndex` válidos; Mongo real efêmero; botão mobile Start Workout | Sessão `active` retornada, persistida e reutilizada na duplicidade; **aprovado**                                        | Parcial   | Médio: runtime mobile nativo não foi executado; API/client/mobile estão integrados por contrato e testes | Repetir jornada visual em runtime mobile autorizado; manter contrato de sessão iniciada      |
| Conclusão de treino                  | `workout-completion.e2e-spec.ts`, `progress-log-workout.e2e-spec.ts`, `progress-workout-history.e2e-spec.ts`, `progress-summary.e2e-spec.ts`  | Sessão ativa → log de exercícios → sessão concluída, reconsulta, duplicidade, expiração e autorização                               | Usuário autenticado; sessão real; plano/fitness; exercícios válidos; Mongo real; data controlada                   | `200 completed`, `404` para inválida/expirada/sem ownership, histórico e resumo atualizados; **aprovado na API/client** | Parcial   | Médio: confirmação visual mobile ainda não executada                                                     | Repetir jornada visual autenticada                                                           |
| Check-in diário                      | `progress-daily-check-in.e2e-spec.ts`                                                                                                         | Submissão idempotente, estado do dia, histórico e impacto em Recovery                                                               | Usuário autenticado; respostas de energia/sono/estresse; data local controlada                                     | Mesmo ID na repetição, estado/histórico consistentes e Recovery recalculado; **aprovado**                               | Completa  | Médio: integração mobile/offline não foi E2E                                                             | Nenhuma correção de API; validar sincronização mobile posteriormente                         |
| Recovery                             | `progress-daily-check-in.e2e-spec.ts`                                                                                                         | Recovery experience atual, histórico de 7 dias e estado de dados insuficientes                                                      | Check-in válido e usuário sem dados; `days=7`; Mongo isolado                                                       | Snapshot/histórico válidos e resposta segura de insuficiência; **aprovado**                                             | Parcial   | Alto: `/recovery/today`, `/recovery/current`, stale/freshness e tela mobile não foram exercitados        | Investigar variantes de contrato e percurso mobile                                           |
| Nutrição                             | `nutrition.e2e-spec.ts`; `nutrition-api.spec.ts`                                                                                              | Perfil, macros, plano, estado do dia, registro de refeição, histórico, recomendação, estado vazio, input inválido e sessão inválida | Mongo real efêmero; usuário/perfil/fitness; `mealId` do plano; macros reais; client contra servidor E2E            | Jornada persistida e respostas/erros esperados; **aprovado**                                                            | Parcial   | Médio: mobile validado por testes/build, mas sem runtime contra API E2E                                  | Nenhuma correção adicional de API/client; manter validação mobile runtime                    |
| Interação com o Coach                | `ai-coach-feedback.e2e-spec.ts`, `ai-coach-intelligence.e2e-spec.ts`                                                                          | Feedback autenticado, rejeição de campos extras, aggregate canônico/parcial e erros `503/500`                                       | Usuário autenticado; fixtures de aggregate; em feedback, perfil/fitness/plano/workout                              | Respostas e códigos esperados; **aprovado para feedback/intelligence**                                                  | Parcial   | Alto: envio de mensagem `/ai/chat`, persistência/histórico de conversa e UI não foram percorridos        | Investigar conversa ponta a ponta e fallback via mobile                                      |
| Sessão expirada                      | `auth-me.e2e-spec.ts`, `auth-onboarding.e2e-spec.ts`, `auth-api.spec.ts`                                                                      | Token expirado real, inválido e ausência de token; limpeza mobile em `401`                                                          | JWT com `exp` vencido, Bearer ausente/inválido e bootstrap com token persistido                                    | `401`; **aprovado para API/client**; limpeza mobile coberta por código/testes                                           | Parcial   | Alto: runtime visual autenticado não foi executado                                                       | Validar comportamento visual pós-401                                                         |
| Dados incompletos                    | `dashboard-home.e2e-spec.ts`, `training-get-my-plan.e2e-spec.ts`, `fitness-get-my-profile.e2e-spec.ts`, `progress-daily-check-in.e2e-spec.ts` | Ausência de perfil/plano, agenda sem dia atual, perfil fitness ausente e Recovery sem dados                                         | Usuários autenticados com onboarding parcial; relógio UTC controlado                                               | `null`, `404` ou estado explícito sem crash; **aprovado nos cenários cobertos**                                         | Parcial   | Médio/alto: ausência de nutrição, Coach e estados mobile não foram cobertas                              | Expandir matriz para todos os módulos antes do aceite final                                  |
| Cenários de erro                     | Auth, users, fitness, training, progress e AI nas suítes acima                                                                                | `401`, `404`, `409`, `400`, `503` e `500` em cenários selecionados                                                                  | Tokens ausentes/inválidos, duplicidade, ownership inválido, query/body inválidos e falhas de AI controladas        | Códigos e payloads esperados; **aprovado nos casos existentes**                                                         | Parcial   | Médio: não representa todos os endpoints nem erros de nutrição/recovery/mobile                           | Levantar catálogo de erros por contrato; sem correção nesta etapa                            |
| Consistência API ↔ packages ↔ mobile | `nutrition.e2e-spec.ts`, `workout-start.e2e-spec.ts`, testes de contrato do `api-client`, testes/build mobile                                 | Contratos e transformações dos fluxos críticos comparados; execução real API/client e verificação estática dos consumidores mobile  | API/Mongo/client aprovados; runtime visual autenticado não disponível                                              | Nenhuma incompatibilidade reproduzível; **cobertura parcial**                                                           | Parcial   | Alto: estados visuais, armazenamento de token e navegação ainda não foram exercitados                    | Repetir em runtime mobile autenticado automatizável                                          |

### Resumo quantitativo

- **3 fluxos completos:** registro, login e check-in diário, considerando somente os cenários API automatizados existentes.
- **11 fluxos parciais:** sessão, onboarding, início de treino, conclusão de treino, Recovery, nutrição, Coach, sessão expirada, dados incompletos, cenários de erro e consistência API/packages/mobile.
- **0 fluxos ausentes:** a consistência deixou de ser ausente porque contratos, client e consumidores mobile foram comparados e os percursos API/client foram executados; permanece parcial sem runtime visual autenticado.

## Fluxos aprovados

Os seguintes cenários foram funcionalmente executados e aprovados no host autorizado: registro válido/duplicado; login válido e inválido; `/auth/me` válido/ausente/inválido; criação de perfil de usuário, perfil fitness e plano; consulta de plano; início explícito idempotente com persistência de sessão ativa; registro e histórico de workouts; resumo de progresso; check-in idempotente; Recovery experience com dados e sem dados; jornada de nutrição com persistência de perfil/plano/log/recomendação; chamadas críticas pelo `api-client`; dashboard com estados completos/parciais; feedback e intelligence do Coach; health/readiness e cenários de erro presentes nas suítes.

Essa lista é uma lista de cenários aprovados, não uma declaração de cobertura completa dos fluxos de produto.

## Lacunas encontradas

1. O início explícito agora possui endpoint, persistência e E2E; permanece pendente apenas a execução visual autenticada no runtime mobile autorizado.
2. O Coach cobre feedback/intelligence, mas não cobre `POST /ai/chat`, persistência de conversa e histórico como fluxo de interação.
3. A sessão agora cobre token ausente/inválido/expirado e limpeza de credencial mobile em `401`; revogação server-side não existe no contrato atual.
4. Nutrição foi validada contra API e `api-client`, e os testes/builds mobile passaram, mas ainda não há runtime mobile contra API E2E.
5. Nenhuma suíte E2E executa a aplicação mobile completa; continuam não validados no runtime headers, armazenamento de token, loading/error states e navegação.
6. Recovery e dados incompletos têm casos representativos, mas não cobrem todas as variantes expostas pelos clientes compartilhado e mobile.

## Inconsistências e fronteiras entre API, packages e mobile

- A API client compartilhada expõe as rotas de nutrição, Recovery e Coach, mas isso é verificado por testes unitários do client e não pela suíte E2E. A existência do método/path não comprova compatibilidade de payload com a API em execução.
- `createApiClient().auth` agora expõe registro/login e `me()` para `/auth/me`; o bootstrap mobile usa o método compartilhado para revalidar tokens persistidos. O logout continua local, sem endpoint server-side.
- Criação de perfil de usuário, fitness, plano e registro de workout são extensões específicas em `apps/mobile/src/api/client.ts` (`mobileApiClient`), enquanto as operações de leitura usam o `api-client` compartilhado. Não há teste automatizado que atravesse essa combinação.
- Os paths inspecionados de nutrição, Recovery, progress, training e AI estão alinhados entre controllers e `packages/api-client`; alinhamento estático não foi promovido a cobertura funcional porque não houve E2E desses caminhos.
- O mobile chama Recovery, nutrição e Coach em telas/hooks reais, mas os E2E atuais não iniciam o runtime mobile nem verificam efeitos de `401`, cache/offline ou atualização das telas.

## Riscos priorizados

| Prioridade | Risco                                                       | Evidência                                                                              | Impacto                                                                  |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| P0         | Runtime mobile autenticado indisponível                     | Browser integrado indisponível; Android sem device; iOS bloqueado por plataforma Xcode | Contratos, auth e estados de UI ainda não têm evidência visual conjunta  |
| P1         | Início e conclusão de treino ainda não formam jornada única | Início persistido e conclusão cobertos separadamente; runtime visual não executado     | Estado de treino pode divergir na navegação mobile                       |
| P1         | Runtime visual de sessão expirada indisponível              | API/client cobrem token expirado; browser/device não disponíveis                       | Redirecionamento e estados visuais pós-expiração ainda não têm evidência |
| P1         | Coach conversacional incompleto                             | Feedback/intelligence cobertos; chat/persistência não                                  | Falha no principal fluxo interativo do Coach                             |
| P2         | Recovery e estados incompletos incompletos                  | Apenas experience atual/histórico e alguns `null/404`                                  | Variantes stale, histórico/base e telas podem regredir                   |

## Próximo fluxo recomendado para investigação

O próximo fluxo recomendado é **validação visual autenticada mobile**, usando os percursos de nutrição e início de treino já validados na API e no `api-client`, em host com navegador ou development build disponível.

## Validação de autenticação, sessão e onboarding

### Cenários cobertos

- registro válido com normalização de nome/e-mail, payload retornado e persistência do usuário;
- registro duplicado com `409 AUTH_EMAIL_ALREADY_EXISTS`;
- login válido com `accessToken` e usuário compatíveis com o registro;
- credenciais inválidas e payload inválido com `401/400` e códigos de erro;
- sessão válida reutilizada em `/auth/me`, sessão ausente e token expirado real com `401 AUTH_INVALID_SESSION`;
- onboarding completo: registro → login → perfil de usuário → perfil fitness → plano → reconsulta do plano;
- onboarding incompleto: ausência de perfil, ausência de plano e perfil inválido, com `404/400` explícitos;
- isolamento entre usuários: token de outro usuário não revela perfil ou plano do proprietário;
- acesso sem Bearer token a recurso protegido com `401`;
- persistência confirmada indiretamente pela reconsulta dos documentos através da API no MongoDB real efêmero.

### Contratos e correção aplicada

O `packages/api-client` não tinha método para `GET /auth/me`, embora a API e o mobile dependessem dessa validação de sessão. Foi adicionada a tipagem `ValidateSessionResponse`, o método `apiClient.auth.me()` e teste de path/erro. O bootstrap do `AuthProvider` agora revalida token persistido e o remove quando a API retorna `401`; falhas de rede não apagam a sessão local.

Não existe endpoint HTTP `/auth/logout` no contrato atual. O logout é deliberadamente local no `AuthProvider`: remove `elev9.accessToken`, caches de Recovery/check-in e o owner key, e transita para `unauthenticated`. Não foi criado um endpoint novo nem alterado o contrato da API; a validação visual do botão permanece pendente por limitação ambiental.

### Arquivos alterados

- `apps/api/test/e2e/auth-onboarding.e2e-spec.ts` — nova suíte com MongoDB real e quatro cenários de autenticação/onboarding;
- `packages/types/src/auth/index.ts` — contrato de validação de sessão;
- `packages/api-client/src/auth-api.ts` e `packages/api-client/src/auth-api.spec.ts` — `auth.me()` e regressões de contrato;
- `apps/mobile/src/auth/auth-provider.tsx` — revalidação de token persistido e limpeza em `401`;
- este documento de validação.

### Resultados

- E2E direcionado: **7 suítes / 24 testes aprovados**;
- E2E completo: **20 suítes / 70 testes aprovados** com MongoDB real efêmero;
- API relacionada: **20 suítes / 107 testes aprovados**;
- API completa anteriormente aprovada: **221 suítes / 1.373 testes**;
- `api-client`: **9 suítes / 46 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- builds de `types`, `api-client`, API e Expo mobile Web/Android/iOS aprovados;
- `git diff --check`: aprovado.

### Status atualizado

Registro e login permanecem **completos** no escopo automatizado. Sessão e sessão expirada permanecem **parciais**: agora possuem validação positiva, ausência, expiração real, contrato compartilhado e limpeza mobile em `401`, mas não têm runtime visual autenticado. Onboarding permanece **parcial**: os estados completo, incompleto, inválido e sem plano estão cobertos na API/Mongo, mas a sequência visual mobile não foi executada. Logout permanece **parcial**, pois a limpeza local está implementada no `AuthProvider`, sem evidência visual autenticada.

Não foi encontrado defeito funcional adicional. Nenhum fluxo completo anterior foi degradado, nenhum teste foi removido/desabilitado e nenhum mock substituiu autenticação ou persistência real.

### Limitação e próximo grupo recomendado

A limitação visual permanece: navegador integrado indisponível, Android sem dispositivo/emulador conectado e iOS bloqueado pela plataforma requerida ausente no Xcode. O próximo grupo recomendado é validação visual autenticada do onboarding e do logout local; depois, completar a conversa do Coach com chat e histórico.

## Validação de consistência API ↔ packages ↔ api-client ↔ mobile

### Escopo e evidência

Esta validação comparou controllers/DTOs da API, tipos de `packages/types`, métodos e transformações de `packages/api-client` e consumidores/hooks/telas de `apps/mobile`. Os percursos de nutrição e início de treino também foram executados contra a API E2E com MongoDB real efêmero. A suíte completa confirmou que a alteração de início de treino não degradou os demais fluxos.

| Fluxo               | Contrato API comparado                                                               | Tipos compartilhados                       | Transformação do `api-client`                                                           | Estado esperado no mobile                                       | Evidência e status                                                               | Diferença, risco ou correção                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Registro            | `POST /auth/register`: usuário/token e `409` para duplicidade                        | `RegisterRequest/Response`                 | JSON, Bearer e `ApiClientError`                                                         | loading, sucesso e erro de cadastro                             | E2E auth + client e testes mobile; **parcial** sem UI autenticada                | Nenhuma incompatibilidade reproduzível; falta confirmar formulário visual                                             |
| Login e sessão      | `POST /auth/login` e `GET /auth/me`: token e `401`                                   | `LoginRequest/Response`, `User`            | Token persistido pelo provider; bootstrap mobile não usa método compartilhado `auth.me` | sessão carregada, loading e redirecionamento                    | E2E auth, inspeção de provider e testes mobile; **parcial**                      | Estratégia de sessão não é uniforme: `api-client` não expõe `auth.me`; não corrigido por não haver falha reproduzível |
| Onboarding          | criação de usuário, fitness e plano; respostas `201/409/404`                         | DTOs de users, fitness e training          | Extensões de `mobileApiClient` para criação; client compartilhado para leituras         | passos sequenciais e ausência de plano/perfil                   | E2E de onboarding, API/client/mobile tests; **parcial**                          | Combinação de dois clientes requer validação visual; nenhum mismatch encontrado                                       |
| Início de treino    | `POST /progress/workout-sessions/start`: sessão `active`, `startedAt`, `409/404/401` | `StartWorkoutRequest/Response`, sessão     | `startWorkout` envia `trainingPlanId/workoutDayIndex` e normaliza resposta              | loading, erro e navegação com `workoutSessionId`                | E2E 1/3, persistência Mongo, client em runtime, testes/build mobile; **parcial** | Sem incompatibilidade reproduzível; falta interação visual autenticada                                                |
| Conclusão de treino | `POST /progress/workout-logs`: log e `409` duplicado                                 | DTO de workout log                         | `logWorkout` envia exercícios/data                                                      | conclusão, erro e atualização de histórico                      | E2E de log/histórico/resumo + client/mobile tests; **parcial**                   | Início→execução→conclusão não foi percorrido no runtime mobile                                                        |
| Check-in            | `POST /progress/daily-check-in`, today/history e respostas idempotentes              | DTOs de check-in e estado diário           | Payload/data local e tratamento de `401/4xx`                                            | formulário, loading, sucesso e erro                             | E2E, API/client/mobile tests; **parcial**                                        | API consistente; sincronização visual/offline não validada                                                            |
| Recovery            | today/current/history e experiência; estados insuficientes                           | DTOs de recovery e histórico               | Query `days` e serialização de datas                                                    | estado atual, histórico, vazio e falha                          | E2E representativo + client/mobile tests; **parcial**                            | Variantes stale/freshness e UI não executadas                                                                         |
| Nutrição            | perfil, plano, today, meals, history e recommendations; `400/401/404`                | DTOs nutricionais e paginação de histórico | 13 métodos/path, query de datas/limit/cursor e erros                                    | macros/plano, diário, refeição, histórico, recomendação e vazio | E2E 1/3 com Mongo real, client contra servidor, testes/build mobile; **parcial** | Correção anterior do DTO de histórico coberta; runtime visual autenticado pendente                                    |
| Coach               | chat/history/decision/intelligence/feedback; `401/404/500/503`                       | DTOs de AI/Coach                           | Body/query JSON e `ApiClientError`                                                      | loading, resposta, histórico e fallback                         | E2E feedback/intelligence + client/mobile tests; **parcial**                     | Chat conversacional e persistência de histórico ainda não percorridos                                                 |
| Sessão expirada     | `401` para token ausente/inválido; expiração temporal não testada                    | `ApiError` e auth types                    | Erro HTTP preservado; hooks tratam `401` em pontos específicos                          | limpeza de sessão e retorno ao login                            | E2E de auth + inspeção de hooks; **parcial**                                     | Não há evidência de token expirado real nem fluxo visual; sem correção aplicada                                       |
| Dados incompletos   | `null/404` para perfil/plano/agenda e estados nutricionais                           | Tipos opcionais/nullables                  | Resposta preservada sem coerção indevida                                                | vazio, onboarding pendente e retry                              | E2E dashboard/training/fitness/recovery/nutrition + testes; **parcial**          | Cobertura não inclui todas as telas no runtime                                                                        |
| Cenários de erro    | `400/401/404/409/500/503` conforme domínio                                           | DTOs de erro e respostas por domínio       | `ApiClientError` preserva status/message                                                | loading encerrado, mensagem e retry                             | API E2E, API/client/mobile tests; **parcial**                                    | Catálogo completo de erros e apresentação visual ainda pendentes                                                      |

### Resultado conjunto

- Não foram encontradas diferenças reproduzíveis de nomes de campos, tipos, valores nulos, datas, paginação, estados, códigos HTTP ou mensagens nos contratos comparados e nos percursos API/client executados.
- Nutrição e início de treino foram confirmados com persistência real no MongoDB efêmero; os demais fluxos mantiveram seus baselines aprovados.
- O mobile foi validado por testes e builds Web/Android/iOS e por inspeção dos consumidores reais, mas não foi considerado visualmente validado: o navegador integrado não estava disponível, não havia dispositivo Android conectado e o build iOS foi bloqueado pela plataforma iOS 26.5 ausente no Xcode.
- Não foram feitas correções funcionais nesta etapa. Nenhum fluxo anteriormente completo foi degradado, nenhum teste foi removido/desabilitado e nenhum mock substituiu MongoDB ou chamadas reais.

### Resultados de execução

- E2E direcionado de início de treino: **1 suíte/3 testes aprovados**; nutrição: **1 suíte/3 testes aprovados**.
- E2E completo: **19 suítes/66 testes aprovados** com MongoDB real efêmero.
- API: **221 suítes/1.373 testes aprovados**.
- `api-client`: **8 suítes/44 testes aprovados**.
- Mobile: **22 suítes/104 testes aprovados**.
- Builds aprovados: API, `packages/types`, `api-client` e Expo Web/Android/iOS.
- `git diff --check`: aprovado.

### Limitações ambientais e próximo fluxo

A limitação restante é exclusivamente a confirmação visual autenticada no runtime mobile. O próximo fluxo recomendado é repetir nutrição e início de treino em um host autorizado com navegador automatizável ou development builds iOS/Android instaláveis; depois, investigar a conversa completa do Coach (`chat` + histórico) no mesmo runtime.

A matriz registra a cobertura anterior; a validação abaixo documenta a nova suíte de nutrição e a correção mínima do contrato de histórico.

## Validação e conclusão do fluxo de nutrição

### Cenários implementados

- criar e consultar perfil nutricional com preferências e restrições;
- calcular macros, criar plano determinístico e consultar plano atual;
- obter o estado nutricional do dia;
- registrar refeição usando o `mealId` retornado pelo plano;
- consultar histórico por intervalo e validar o item do dia;
- gerar e consultar recomendação;
- validar estado `not_configured`, payload inválido, limite inválido e sessão ausente/inválida;
- consultar diretamente as coleções Mongo para confirmar perfil, plano, log e recomendação persistidos;
- executar `getNutritionProfile`, `getTodayNutrition` e `getHistory` do `createNutritionApi` contra o mesmo servidor E2E, além do teste de contrato dos 13 métodos/path públicos.

### Arquivos alterados

- `apps/api/test/e2e/nutrition.e2e-spec.ts` — nova suíte E2E com Mongo real, persistência e client em runtime;
- `apps/api/src/modules/nutrition/presentation/http/dto/get-nutrition-history.query.dto.ts` — validação de `from`, `to`, `cursor` e `limit`;
- `packages/api-client/src/nutrition-api.spec.ts` — contrato de métodos, paths e payloads;
- `packages/api-client/project.json`, `packages/api-client/jest.config.js` e `packages/api-client/tsconfig.spec.json` — target/configuração Jest do package;
- este documento de validação.

### Falha encontrada e correção

O histórico retornava `400` quando o client enviava `from`/`to`: `GetNutritionHistoryQueryDto` não tinha decorators e o `ValidationPipe` usa `forbidNonWhitelisted: true`. A correção mínima adicionou os decorators de data, cursor e limite, preservando o contrato público. A chamada passou a funcionar pelo `api-client` e recebeu regressão E2E/contrato.

### Resultados

- E2E direcionado de nutrição: **1 suíte/3 testes aprovados**;
- E2E completo: **18 suítes/63 testes aprovados** no host autorizado;
- API completa: **221 suítes/1.373 testes aprovados**;
- `api-client:test`: **8 suítes/43 testes aprovados**;
- `api-client:build`: aprovado;
- `api:build`: aprovado;
- `mobile:test`: **22 suítes/104 testes aprovados**;
- `mobile:build`: aprovado para os bundles **Web, Android e iOS**;
- API executável: `GET http://127.0.0.1:3333/health` retornou `200` e a exportação Web do Expo em `http://localhost:8081/` retornou `200`;
- persistência Mongo: perfil, plano, log e recomendação confirmados nas coleções reais;
- `git diff --check`: aprovado.

### Validação do runtime mobile contra a API E2E

- Configuração confirmada: `EXPO_PUBLIC_API_URL`, `createApiClient` em `apps/mobile/src/api/client.ts`, Bearer token obtido por `getAccessToken`, JSON e `ApiClientError` para respostas HTTP não-2xx.
- Contratos confirmados estaticamente e por testes: DTOs de `packages/types`, 13 métodos do `packages/api-client`, hooks/telas de overview, plano, refeições, log, histórico, recomendações e perfil nutricional.
- Plataforma executável observada: **Web servida pelo Expo**, com a API local e MongoDB real ativos; a página carregou e a API respondeu, mas não foi possível completar a interação autenticada das telas porque o navegador integrado não estava disponível neste host.
- iOS: o simulador iniciou, porém `mobile:ios` falhou antes da instalação do app porque o simulador usa iOS 26.3 e o Xcode reportou que a plataforma iOS 26.5 não está instalada. Evidência: `apps/mobile/.expo/xcodebuild.log` e erro `Unable to find a destination ... iOS 26.5 is not installed`.
- Android: nenhum dispositivo/emulador estava conectado (`adb devices` sem dispositivos), portanto o runtime Android não foi executado.
- Não foram encontrados defeitos de compatibilidade nem foram feitas alterações funcionais ou testes de mobile nesta etapa.

### Novo status

Nutrição permanece **parcial**: API, MongoDB real, `api-client`, testes mobile e bundles Web/Android/iOS estão aprovados; a interação autenticada no runtime mobile contra a API E2E ainda não foi concluída por indisponibilidade do navegador integrado e dos runtimes nativos instaláveis. Não há defeito funcional adicional conhecido.

### Próximo fluxo recomendado

Disponibilizar um navegador automatizável ou development build iOS/Android em host autorizado e repetir as jornadas autenticadas de nutrição e início de treino. Em seguida, investigar a consistência API ↔ packages ↔ mobile, que continua sendo a única lacuna ausente da matriz.

## Validação do início explícito de treino

### Cenários implementados

- usuário autenticado inicia o treino com `trainingPlanId` e `workoutDayIndex` válidos;
- resposta `workoutSession` com estado `active`, data, timestamps e ids relacionados;
- persistência confirmada na coleção real `workout_sessions` do MongoDB efêmero;
- segunda tentativa no mesmo plano/dia/data retorna a mesma sessão, sem duplicar registro;
- plano inexistente, dia indisponível, payload inválido, usuário sem perfil, usuário sem plano e sessão ausente;
- chamada do `createProgressApi.startWorkout` contra o servidor E2E no adaptador de teste;
- botão `Start Workout` do `WorkoutOverviewScreen` chama o client, usa `startedAt` retornado pela API e navega para `ActiveWorkout` somente após sucesso.

### Arquivos alterados

- `apps/api/src/modules/progress/application/use-cases/start-workout/*` — caso de uso, entrada, saída e erros;
- `apps/api/src/modules/progress/domain/entities/workout-session.entity.ts` e `domain/repositories/workout-session.repository.ts`;
- `apps/api/src/modules/progress/infrastructure/mongoose/workout-session.schema.ts` e `mongoose-workout-session.repository.ts`;
- `apps/api/src/modules/progress/presentation/http/progress.controller.ts` e DTOs de start;
- `apps/api/src/modules/progress/progress.module.ts` — registro do modelo, repositório e caso de uso;
- `apps/api/test/e2e/workout-start.e2e-spec.ts` — E2E com Mongo real e contrato do client em runtime;
- `packages/types/src/progress/index.ts` — `StartWorkoutRequest` e `StartWorkoutResponse`;
- `packages/api-client/src/progress-api.ts` e `progress-api.spec.ts` — método e regressão de path/payload;
- `apps/mobile/src/screens/workout-overview-screen.tsx` e `navigation/app-navigator.tsx` — chamada real antes da navegação e timestamp da sessão.

### Compatibilidade e comportamento

O endpoint `POST /progress/workout-sessions/start` é autenticado e valida ownership do plano pelo usuário. A chave única `(trainingPlanId, workoutDayIndex, date)` garante uma sessão ativa por treino diário; chamadas duplicadas são idempotentes e retornam a sessão existente. A API, o `api-client`, os tipos compartilhados e o botão mobile usam o mesmo `trainingPlanId`, `workoutDayIndex`, `status` e `startedAt`.

### Resultados

- E2E direcionado: **1 suíte / 3 testes aprovados**;
- E2E completo: **19 suítes / 66 testes aprovados**;
- API relacionada: **10 suítes / 69 testes aprovados**;
- API completa: **221 suítes / 1.373 testes aprovados**;
- `api-client`: **8 suítes / 44 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- `api:build`: aprovado;
- `mobile:build`: aprovado para Web, Android e iOS;
- `git diff --check`: aprovado.

### Falhas encontradas e correções

Durante a primeira execução, o adaptador do `api-client` no teste E2E referenciava `app` fora do escopo e depois encadeava `.set()` antes do método HTTP. Ambos eram defeitos do helper de teste, corrigidos passando a aplicação explicitamente e criando a requisição `POST`/`GET` antes dos headers. A primeira regressão da API também identificou quebra posicional dos mocks do `ProgressController`; o novo provider foi movido para o fim, opcional, preservando os testes existentes.

Não foi identificado defeito funcional na API, no `api-client` ou no mobile.

### Novo status e próximo passo

Início explícito de treino deixa de ser **ausente** e passa a **parcial**: API, MongoDB real, contratos, `api-client`, integração do botão mobile e builds/testes estão aprovados. A parte ainda não validada é a interação visual autenticada no runtime mobile, limitada pelo ambiente já documentado. O próximo fluxo recomendado é **consistência API ↔ packages ↔ mobile** em um host com runtime mobile automatizável.

## Validação e conclusão do ciclo de treino

### Cenários cobertos

- iniciar uma sessão ativa pelo endpoint existente;
- registrar exercícios concluídos e concluir a sessão pelo novo endpoint;
- reconsultar a sessão concluída por API e pelo `api-client`;
- persistir `status: completed` e `completedAt` na coleção real `workout_sessions`;
- repetir a conclusão sem criar nova sessão ou novo efeito;
- rejeitar sessão inexistente, payload/identificador inválido, sessão expirada e sessão de outro usuário;
- rejeitar conclusão sem autenticação;
- confirmar o log no histórico e `workoutsCompleted` no resumo semanal;
- conectar o fluxo mobile: `WorkoutCompletionScreen` registra o workout e, quando existe `workoutSessionId`, conclui a sessão antes de apresentar o resultado.

### Transições e contrato

A transição válida é `active → completed`. Uma sessão já `completed` retorna a mesma representação, garantindo idempotência. A conclusão de sessão de outra conta é mascarada como `WORKOUT_SESSION_NOT_FOUND`; sessão com data diferente do dia atual retorna `WORKOUT_SESSION_EXPIRED`. A resposta compartilhada mantém `id`, `userProfileId`, `trainingPlanId`, `workoutDayIndex`, `date`, `status`, `startedAt`, `updatedAt` e o novo `completedAt` opcional.

### Arquivos alterados

- `apps/api/src/modules/progress/application/use-cases/complete-workout/*` — caso de uso e códigos de erro;
- `apps/api/src/modules/progress/domain/entities/workout-session.entity.ts` e repositório/schema Mongoose — estado `completed`, `completedAt`, consulta e atualização persistente;
- `apps/api/src/modules/progress/presentation/http/progress.controller.ts` e DTO de parâmetros — `POST /progress/workout-sessions/:sessionId/complete` e `GET /progress/workout-sessions/:sessionId`;
- `apps/api/src/modules/progress/progress.module.ts` — registro do caso de uso;
- `apps/api/test/e2e/workout-completion.e2e-spec.ts` — E2E com MongoDB real, persistência, autorização e progresso;
- `packages/types/src/progress/index.ts`, `packages/api-client/src/progress-api.ts` e `progress-api.spec.ts` — contrato e métodos de conclusão/reconsulta;
- `apps/mobile/src/navigation/app-navigator.tsx`, `active-workout-screen.tsx` e `workout-completion-screen.tsx` — propagação do `workoutSessionId` e conclusão real após o log.

### Resultados

- E2E direcionado: **1 suíte / 4 testes aprovados**;
- E2E completo: **21 suítes / 74 testes aprovados** com MongoDB real efêmero;
- API progress relacionada: **12 suítes / 72 testes aprovados**;
- `api-client`: **9 suítes / 47 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- `api:build`, `types:build`, `api-client:build` e Expo mobile Web/Android/iOS aprovados;
- `git diff --check`: aprovado.

### Defeitos e status

O defeito funcional identificado foi a ausência de transição persistida da sessão: o registro de workout atualizava histórico/progresso, mas a sessão criada pelo início permanecia `active` e não podia ser reconsultada. A correção mínima adicionou a conclusão idempotente, o estado persistido e o vínculo do `workoutSessionId` no percurso mobile. Nenhum código do início de treino foi alterado além da extensão compatível do payload de sessão.

Conclusão de treino permanece **parcial** na matriz: o ciclo API → MongoDB → `api-client` → integração mobile está coberto e aprovado automaticamente; a validação visual autenticada ainda não ocorreu por indisponibilidade do runtime documentada. Nenhum fluxo anteriormente completo foi degradado, nenhum teste foi removido/desabilitado e nenhum mock substituiu MongoDB.

### Próximo fluxo recomendado

Repetir o ciclo início → execução → conclusão em runtime mobile autenticado e, em seguida, investigar a conversa completa do Coach (`chat` + histórico), mantendo a mesma validação de persistência e contratos.

## Validação ponta a ponta de Recovery

### Cenários, dados e pré-condições

- usuário registrado e autenticado com perfil, perfil fitness e plano de treino;
- check-in diário real com energia, sono, soreness e motivação;
- geração do Recovery atual com score, fadiga, fatores, tendência, intensidade recomendada e freshness;
- reconsulta do snapshot legado e do read model público;
- início, registro e conclusão de treino no mesmo usuário/data;
- rebuild do Recovery após o treino, confirmando `recentWorkoutLogsCount` atualizado;
- histórico de sete dias com tendência e item persistido;
- usuário sem perfil, usuário sem dados, limite inválido, sessão ausente e token inválido;
- persistência confirmada na coleção real `recovery_snapshots` do MongoDB efêmero.

### Cálculo, freshness e consistência

O cálculo determinístico existente não foi alterado. O E2E confirmou que o mesmo conjunto de check-in/treino produz campos compatíveis e que a resposta pública não expõe `sourceContext` nem ids internos. Foi corrigida a invalidação de snapshot: antes, um treino concluído depois da geração do snapshot não provocava rebuild; agora `today` e `current` comparam também o `updatedAt` do workout log mais recente com `sourceContext.generatedAt`. O histórico continua ordenado e a tendência permanece calculada pela policy existente.

### Cache e estados mobile

Os testes existentes de `AsyncStorageRecoveryCache`, schema e mapper mobile cobrem cache recente, antigo e expirado, JSON corrompido, owner divergente, falha de armazenamento, resposta vazia, erro técnico, loading, refresh, retry e `401` não recuperável por cache. O hook só usa cache para falhas de transporte; respostas de autenticação ou erro HTTP não são mascaradas. A validação visual autenticada continua indisponível e, portanto, não foi declarada como concluída visualmente.

### Arquivos alterados

- `apps/api/test/e2e/recovery.e2e-spec.ts` — nova suíte E2E com check-in, treino, histórico, persistência, autorização e ausência de dados;
- `apps/api/src/modules/recovery/application/services/recovery-freshness.ts` — detecção de snapshot obsoleto por workout log;
- `apps/api/src/modules/recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case.ts` — rebuild quando o treino posterior altera os dados;
- `apps/api/src/modules/recovery/application/use-cases/get-today-recovery/get-today-recovery.use-case.ts` — mesma regra para o estado do dia;
- este documento de validação.

### Resultados

- E2E Recovery direcionado: **1 suíte / 2 testes aprovados**;
- E2E completo: **22 suítes / 76 testes aprovados** com MongoDB real efêmero;
- API Recovery: **12 suítes / 64 testes aprovados**;
- `api-client`: **9 suítes / 47 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- builds de API, `packages/types`, `api-client` e mobile Web/Android/iOS aprovados;
- `git diff --check`: aprovado.

### Defeito corrigido e novo status

Foi corrigido um defeito funcional reproduzível de freshness: Recovery retornava snapshot antigo após conclusão de treino. A correção foi limitada à decisão de rebuild e possui regressão E2E. Não foram alteradas regras de score, fatores ou tendências. Recovery permanece **parcial** na matriz: API, MongoDB, contratos, `api-client`, cache/estados mobile e testes estão validados; o runtime visual mobile autenticado continua pendente. Nenhum fluxo completo anterior foi degradado.

### Próximo fluxo recomendado

Validar visualmente Recovery após check-in e após conclusão de treino em runtime mobile autenticado; depois, completar a jornada conversacional do Coach com `chat` e histórico.

## Validação ponta a ponta do Coach

### Cenários cobertos

- usuário autenticado enviando mensagens pelo endpoint real `POST /ai/chat`;
- criação da conversa, segunda mensagem e reconsulta pelo `GET /ai/chat/history`;
- integração do `packages/api-client` (`sendChatMessage` e `getChatHistory`) contra o servidor E2E;
- usuário com contexto incompleto, sem dados nutricionais, de treino ou Recovery, recebendo resposta determinística;
- mensagem vazia, payload com campos extras e limite de histórico inválido;
- sessão ausente, token inválido/expirado e perfil autenticado sem autorização cruzada;
- isolamento do histórico entre dois usuários;
- fallback real com `AI_LLM_ENABLED=false`, sem chamada externa ao LLM;
- verificação do caminho de fallback e da observabilidade de prompt sem exposição de `OPENAI_API_KEY`.

### Contexto, autorização e persistência

O carregador do Coach compõe saúde, treino, check-in, Recovery, nutrição, metas, hábitos, notificações, personalização e decisão quando disponíveis; falhas de domínios opcionais são reduzidas a contexto incompleto. A conversa é criada e recuperada pelo `userProfileId` associado à sessão, e as mensagens de usuário e assistente são persistidas nas coleções reais `coach_conversations` e `coach_messages` do MongoDB efêmero. A reconsulta confirmou quatro mensagens na ordem user → assistant → user → assistant, com `createdAt` serializado como ISO string.

O endpoint não aceita `conversationId` arbitrário: a conversa sempre é resolvida no escopo do perfil autenticado. O E2E confirmou que um segundo usuário não visualiza o histórico do primeiro. Respostas sem sessão ou sessão expirada retornam `401`; payload inválido retorna `400`; usuário sem perfil retorna `404` conforme o contrato existente.

### Fallback e tratamento de erro

O fallback heurístico foi validado em runtime E2E com MongoDB real e LLM desabilitado, retornando `200`, `conversationId` e `reply` não vazia e persistindo também a resposta do assistente. O caminho de fallback expõe somente metadados operacionais (`llm_disabled`, provider/modelo e versão do prompt) no endpoint debug protegido; não expõe chave, prompt completo ou dados sensíveis. Falhas de provider/timeout continuam cobertas pelas suítes unitárias existentes do orquestrador e da confiabilidade do LLM; não foi introduzido mock no E2E para simular uma falha externa.

### Incompatibilidade encontrada e correção

O primeiro E2E conversacional reproduziu HTTP 500 em todo usuário autenticado: `NutritionConsumerProjectionService` implementava `getCoachContext`, enquanto o contrato `NutritionCoachContextPort` e o `CoachChatContextLoaderService` consumiam `execute`. A correção mínima adicionou `execute(input)` como adaptador para `getCoachContext(input)`, preservando o cálculo nutricional e os consumidores existentes. O E2E `ai-coach-chat.e2e-spec.ts` funciona como regressão real desse contrato.

### Arquivos alterados

- `apps/api/test/e2e/ai-coach-chat.e2e-spec.ts` — nova suíte E2E conversacional com MongoDB real, autenticação, client, persistência, fallback e isolamento;
- `apps/api/src/modules/nutrition/application/ports/nutrition-consumer.ports.ts` — adaptador `execute` compatível com o contrato consumido pelo Coach;
- este documento de validação.

### Resultados

- E2E direcionado do Coach: **1 suíte / 4 testes aprovados** no host autorizado;
- MongoMemoryServer iniciou MongoDB real efêmero; a execução no sandbox reproduziu o bloqueio de bind `EPERM` conhecido e não foi usada como evidência funcional;
- API: **221 suítes / 1.373 testes aprovados**;
- `api-client`: **9 suítes / 47 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- builds de API, `packages/types`, `api-client` e mobile Web/Android/iOS aprovados;
- `git diff --check`: aprovado;
- nenhum teste existente foi removido, desabilitado ou enfraquecido;
- nenhum prompt, regra de decisão ou comportamento visual mobile foi alterado.

### Novo status

Coach permanece **parcial** na matriz: chat, histórico, persistência, autorização, fallback, contexto incompleto e contratos API ↔ `api-client` estão cobertos automaticamente; a confirmação visual autenticada no runtime mobile continua limitada pelo ambiente já documentado. Não há incompatibilidade reproduzível conhecida após a correção do port, e nenhum fluxo anteriormente completo foi degradado.

### Próximo fluxo recomendado

Repetir a conversa do Coach em runtime mobile autenticado Web/Android/iOS quando houver navegador ou dispositivo autorizado disponível, validando loading, vazio, erro e retry visualmente; depois consolidar a matriz final da Sprint 2.

## Fechamento final da Sprint 2

### Baseline final

Validação repetida no host autorizado em 2026-08-20:

- E2E oficial com MongoDB real efêmero: **23 suítes / 80 testes aprovados**;
- API: **221 suítes / 1.373 testes aprovados**;
- `api-client`: **9 suítes / 47 testes aprovados**;
- mobile: **22 suítes / 104 testes aprovados**;
- builds de API, `packages/types`, `api-client` e mobile Web/Android/iOS: **aprovados**;
- `git diff --check`: **aprovado**.

O E2E iniciou e encerrou `MongoMemoryServer` real com sucesso. Os testes de API registraram apenas avisos não bloqueantes já conhecidos de teardown de worker/observabilidade; não houve falha de teste, processo Mongo aberto ou regressão funcional reproduzível.

### Matriz final

| Fluxo | Status final | Evidência automatizada | Limitação restante |
| --- | --- | --- | --- |
| Registro | Completo | registro válido, duplicidade, persistência e erros | nenhuma no escopo automatizado |
| Login | Completo | credenciais válidas/ inválidas e contratos | nenhuma no escopo automatizado |
| Sessão | Parcial | `auth.me()`, ausência, token inválido/expirado e `401` | runtime visual autenticado |
| Onboarding | Parcial | perfil, fitness, plano, incompleto, inválido e sem plano | jornada visual mobile |
| Início de treino | Parcial | persistência e idempotência em MongoDB real; `api-client` e mobile | jornada visual mobile |
| Conclusão de treino | Parcial | transição, persistência, reconsulta, idempotência e autorização | jornada visual mobile |
| Check-in diário | Completo | submissão, reconsulta, histórico e Recovery | sincronização visual/offline |
| Recovery | Parcial | score, fatores, histórico, freshness e invalidação por treino | runtime visual autenticado |
| Nutrição | Parcial | perfil, plano, refeição, histórico, recomendações e estados de erro | runtime visual autenticado |
| Coach | Parcial | chat, histórico, fallback, contexto, autorização e isolamento | runtime visual autenticado |
| Sessão expirada | Parcial | JWT expirado, `401` e invalidação local do token | comportamento visual pós-expiração |
| Dados incompletos | Parcial | perfil/plano/Recovery/nutrição/Coach sem dados | estados visuais conjuntos |
| Cenários de erro | Parcial | `400`, `401`, `404`, `409`, `500` e `503` nos fluxos críticos | catálogo visual completo |
| Consistência API ↔ packages ↔ mobile | Parcial | contratos, tipos, client, hooks, builds e E2E API/client | runtime mobile autenticado |

Resumo: **3 fluxos completos, 11 parciais e 0 ausentes**. Todos os fluxos críticos possuem cobertura automatizada; “parcial” indica exclusivamente ausência de validação visual mobile autenticada ou cobertura visual equivalente, não ausência de testes de API/client.

### Correções consolidadas durante a sprint

- `auth.me()` no `api-client` e invalidação local de sessão em `401`;
- decorators e validação do DTO de histórico nutricional;
- início idempotente de treino com persistência real;
- conclusão idempotente e reconsulta da sessão;
- invalidação de snapshots de Recovery após novos dados de treino;
- adaptador `execute` do `NutritionCoachContextPort`, eliminando HTTP 500 no Coach;
- persistência e isolamento de conversas do Coach por usuário.

Todas as correções possuem cobertura de regressão correspondente. Não foram alterados prompts, regras de decisão, contratos incompatíveis, comportamento visual mobile ou testes para reduzir sua exigência.

### Critérios de aceite

- **Atendido:** nenhuma regressão funcional reproduzível;
- **Atendido:** todos os testes e builds relevantes aprovados;
- **Atendido:** suíte E2E oficial aprovada com MongoDB real;
- **Atendido:** todos os fluxos críticos têm cobertura automatizada;
- **Atendido:** limitações visuais mobile documentadas com evidências: navegador integrado indisponível, Android sem device/emulador e iOS bloqueado por plataforma ausente no Xcode;
- **Parcialmente atendido:** validação visual mobile autenticada não foi possível neste ambiente.

### Riscos restantes

O principal risco remanescente é a falta de evidência de runtime mobile autenticado para navegação, loading, vazio, erro, retry, logout e sessão expirada. Há também um aviso não bloqueante de worker/teardown na suíte unitária da API, sem impacto nos resultados ou em handles persistentes observados no E2E. Esses riscos não justificam novas alterações funcionais nesta etapa.

### Decisão de fechamento

A Sprint 2 está **concluída tecnicamente, com ressalva ambiental**: os fluxos críticos estão cobertos e aprovados entre API, MongoDB real, packages, `api-client` e testes mobile; a validação visual mobile autenticada permanece explicitamente pendente. Nenhum fluxo está ausente e nenhum fluxo completo foi degradado.

### Recomendação para a Sprint 3

Disponibilizar um host com navegador automatizável e dispositivos/emuladores Android e iOS compatíveis. Executar então uma rodada visual autenticada concentrada em onboarding/logout, início → conclusão de treino, Recovery, nutrição, Coach, estados vazios/erro/retry e sessão expirada, usando o baseline desta seção como critério de regressão.
