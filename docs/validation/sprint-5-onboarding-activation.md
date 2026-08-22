# Sprint 5 — Onboarding e ativação

**Diagnóstico somente leitura — 22/08/2026**

## Escopo e método

Foi inspecionada a implementação atual de `apps/mobile`, os controllers e DTOs de `apps/api`, `packages/api-client`, `packages/types`, o guia de demo, a taxonomia de analytics e os testes relacionados. Nenhum código funcional, teste, contrato ou comportamento foi alterado. As classificações abaixo descrevem risco para a jornada, não métricas de produto.

Legenda: **bloqueador**, **alto**, **médio**, **baixo**, **informativo**, **dependência externa**.

## Resumo executivo

- **Número de etapas atuais até o primeiro treino:** 10 etapas visíveis na jornada completa: tela inicial/login; cadastro nativo; login/sessão; criação do perfil; perfil fitness; criação do plano; perfil e plano de nutrição; briefing/home; seleção do treino; início do treino. O cadastro externo continua compatível, mas deixou de ser uma pré-condição do mobile.
- Jornada baseline diagnosticada: `Login` → `HomeResolver` → `CreateProfile` → `CreateFitnessProfile` → `CreateTrainingPlan` → `CreateNutritionProfile` → `HomeResolver` → `CoachDailyBriefing`/`MainTabs` → treino. Após o lote 3, a jornada implementada libera a Home diretamente após `CreateTrainingPlan`; nutrição é opcional.
- O primeiro treino fica tecnicamente condicionado não apenas a autenticação, perfil fitness e plano de treino, mas também à existência de perfil **e plano de nutrição**, porque o `HomeResolver` só libera a home depois dessa verificação.
- Não existe instrumentação específica de onboarding, cadastro, abandono, tempo até primeiro treino ou distinção demo/real. Portanto, nenhuma taxa, tempo ou conversão foi inferida.

## Mapa da jornada atual

|   # | Tela/estado                 | Ação e pré-condição                                                                                                                    | API/contrato                                                                                                                                | Próxima navegação                                   | Diagnóstico            |
| --: | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------- |
|   1 | Tela inicial / `Login`      | Usuário informa e-mail e senha; demo aparece em `__DEV__` ou `EXPO_PUBLIC_DEMO_MODE=true`.                                             | `POST /auth/login`; `LoginUserRequestDto`; `LoginUserResponse`. Demo usa `signInDemo()`.                                                    | Sessão autenticada → `HomeResolver`.                | **A1**, **A4**, **M1** |
|   2 | Registro                    | `RegisterScreen` valida os campos e inicia cadastro nativo; o caminho externo continua compatível.                                     | `POST /auth/register` reutiliza API, tipos e `api-client`; requer `name`, `email`, senha com 8–128 caracteres e maiúscula/minúscula/número. | Registro → login automático → `HomeResolver`.       | **A1**, **A2**, **D1** |
|   3 | Login                       | `AuthProvider` persiste o JWT e cria uma chave local de dono da sessão.                                                                | `POST /auth/login`; bearer token em requests.                                                                                               | `HomeResolver`.                                     | **A3**, **M2**         |
|   4 | Criação do perfil           | Nome obrigatório, 2–80 caracteres; o app envia somente `name`.                                                                         | `POST /users/profile`; `CreateUserProfileRequestDto`. Exige sessão.                                                                         | `replace('HomeResolver')`.                          | **M3**                 |
|   5 | Perfil fitness / onboarding | Altura, peso, objetivo, nível de atividade, dias/semana e minutos/sessão. Sem persistência de rascunho.                                | `POST /fitness/profile`; validações 100–250 cm, 30–300 kg, 1–7 dias, 10–180 min e enums.                                                    | `CreateTrainingPlan` com `fitnessProfileId`.        | **A5**, **M4**         |
|   6 | Criação do plano            | Tela de confirmação; nenhum campo adicional.                                                                                           | `POST /training/plans` com `fitnessProfileId` MongoId.                                                                                      | `HomeResolver` (nutrição opcional).                 | **A5**, **M3**         |
|   7 | Nutrição                    | Objetivo e refeições/dia são obrigatórios; restrições, alergias e preferências são opcionais. A tela cria perfil e, em seguida, plano. | `POST /nutrition/profile` e `POST /nutrition/plans`; ambos via `apiClient`, não pelo adaptador `mobileApiClient`.                           | `HomeResolver`.                                     | **B2**, **A5**, **M3** |
|   8 | Home/briefing               | `HomeResolver` refaz `GET /dashboard/home` e consulta perfil/plano de nutrição em paralelo. No primeiro dia usa briefing local.        | `GET /dashboard/home`, `GET /nutrition/profile`, `GET /nutrition/plans/current`.                                                            | `CoachDailyBriefing` ou `MainTabs`.                 | **A5**, **M5**, **I1** |
|   9 | Seleção do treino           | Home/aba Workout leva ao overview do treino do dia; o overview recarrega plano, coach e recovery.                                      | `GET /training/plans/current`, `GET /ai/coach-decision/today`, `GET /recovery/today`.                                                       | `WorkoutOverview` → `ActiveWorkout`.                | **M6**, **I2**         |
|  10 | Primeiro treino             | Usuário inicia sessão e marca séries; ao finalizar registra log e completa sessão.                                                     | `POST /progress/workout-sessions/start`; `POST /progress/workout-logs`; `POST /progress/workout-sessions/:id/complete`.                     | `WorkoutCompletion` → home, histórico ou progresso. | **M7**, **I3**         |

### Caminhos alternativos observados

- Sessão persistida é validada no bootstrap com `GET /auth/me`; um 401 limpa o token e volta ao estado não autenticado.
- `HomeResolver` trata perfil, perfil fitness, plano e nutrição como recursos independentes. Em erro de sessão com código `AUTH_INVALID_SESSION`, executa logout; outros erros mostram Retry/Logout.
- O dashboard pode exibir treino vazio (“No workout scheduled today”), e o overview oferece retry e pull-to-refresh.
- Não há recuperação de senha na entrada, convite, verificação de e-mail ou recuperação persistida de onboarding interrompido identificados no fluxo mobile.

## APIs, contratos e pré-condições

### Contrato de sessão

`AuthSessionGuard` protege os endpoints de usuário, fitness, training, dashboard, nutrição e progress. O cliente compartilhado acrescenta `Authorization: Bearer <token>` quando há token e normaliza falhas para `ApiClientError` com `code`, `message`, `status` e `details`.

| Endpoint                                                       | Pré-condição                                                | Respostas/erros relevantes                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`                                          | Corpo válido; não requer sessão.                            | 400 `AUTH_INVALID_INPUT`/`AUTH_PASSWORD_TOO_WEAK`; 409 `AUTH_EMAIL_ALREADY_EXISTS`. Retorna usuário, **não token**. |
| `POST /auth/login`                                             | E-mail e senha válidos.                                     | 400 `AUTH_INVALID_INPUT`; 401 `AUTH_INVALID_CREDENTIALS`; sucesso retorna token e usuário.                          |
| `GET /auth/me`                                                 | Bearer válido.                                              | 401 `AUTH_INVALID_SESSION`.                                                                                         |
| `POST /users/profile`                                          | Sessão; nome válido.                                        | 400, 401, 409 `USER_PROFILE_ALREADY_EXISTS`.                                                                        |
| `POST /fitness/profile` / `GET /fitness/profile`               | Sessão; perfil de usuário criado para POST.                 | 400, 401, 404, 409 `FITNESS_PROFILE_ALREADY_EXISTS`.                                                                |
| `POST /training/plans` / `GET /training/plans/current`         | Sessão; `fitnessProfileId` válido e perfil existente.       | 400, 401, 404, 409 `TRAINING_PLAN_ALREADY_EXISTS`.                                                                  |
| `POST /nutrition/profile` / `POST /nutrition/plans` / leituras | Sessão; perfil anterior conforme use case.                  | 400, 401, 404, 409; a resolução mobile reconhece `NUTRITION_*_NOT_FOUND`.                                           |
| `GET /dashboard/home`                                          | Sessão e perfil de usuário.                                 | 401; 404 `USER_PROFILE_NOT_FOUND`; retorna `fitnessProfile`/`trainingPlan` nulos quando ausentes.                   |
| `POST /progress/workout-sessions/start`                        | Sessão; `trainingPlanId` MongoId; `workoutDayIndex` 0–1000. | 400, 401, 404, 409 conforme controller/use case.                                                                    |
| `POST /progress/workout-logs`                                  | Sessão; duração >=1; pelo menos um exercício.               | 400, 401, 404, 409 `WORKOUT_LOG_ALREADY_EXISTS`.                                                                    |
| `POST /progress/workout-sessions/:id/complete`                 | Sessão; id válido; sessão ativa do usuário.                 | 400, 401, 404, 409 conforme controller/use case.                                                                    |

### Inconsistências API ↔ `api-client` ↔ mobile

- **A1 — Alto:** `packages/api-client` conhece `auth.register`, mas o mobile não o usa nem possui tela de registro. O caminho documentado para novo usuário depende de uma operação externa.
- **A2 — Alto:** a API registra o usuário sem emitir sessão. Uma futura tela de cadastro precisará fazer login subsequente ou o contrato terá de mudar; isso ainda não é uma decisão explícita no mobile.
- **A3 — Alto:** o mobile mantém `requestJson` próprio e sobrescreve `users`, `fitness`, `training` e parte de `progress` em `mobileApiClient`. Isso duplica parsing, headers e semântica de erro do `packages/api-client`.
- **A4 — Médio:** o cliente compartilhado mapeia 401 sem código para `UNAUTHORIZED`, enquanto alguns fluxos mobile só reconhecem `AUTH_INVALID_SESSION`. Não há interceptor global para transformar qualquer 401 em sessão expirada/logout.
- **A5 — Alto:** o onboarding é uma sequência de mutações independentes, sem operação transacional, estado de onboarding no servidor ou idempotência exposta como contrato de jornada. Uma falha após criar um recurso deixa o usuário parcialmente provisionado.
- **A6 — Médio:** respostas usam estados nulos/404 diferentes por domínio; `HomeResolver` consulta nutrição com `Promise.allSettled`, mas estados `unknown` seguem para a home em vez de explicitar bloqueio ou diagnóstico.
- **A7 — Médio:** os tipos compartilhados cobrem requests/responses principais, mas as extensões mobile para criação de fitness/treino não são tipos nomeados compartilhados; há risco de drift entre DTOs e chamadas manuais.
- **A8 — Baixo:** os endpoints `GET` recebem DTOs de query/body vazios em controllers, enquanto o cliente não envia body. É funcional, mas aumenta ruído e dificulta uma leitura clara das pré-condições.

## Estados da interface e navegação

| Área            | Loading                                                 | Erro / retry                                                                                                         | Vazio / incompleto                                                      | Sucesso / navegação                           | Lacuna         |
| --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- | -------------- |
| Auth            | `AuthProvider` e `AppNavigator` mostram loading global. | Login mostra mensagem textual; não há retry dedicado além de reenviar.                                               | Não existe estado de cadastro.                                          | Persiste token e abre resolver.               | **M1**, **M2** |
| Resolver        | “Setting up your training space...”.                    | Retry e Logout. 401 específico faz logout.                                                                           | Roteia para cada recurso ausente.                                       | `replace` evita empilhar etapas.              | **A4**, **M5** |
| Formulários     | Botão mostra loading e fica desabilitado.               | Mensagem única do `ApiClientError`; não há mapeamento por campo/erro de conflito.                                    | Valores default no fitness; nutrição inicia sem refeições selecionadas. | Cada POST avança diretamente.                 | **M3**, **M4** |
| Home/treino     | Dashboard/overview têm skeleton e refresh.              | Overview tem Retry; dashboard depende do componente.                                                                 | Treino do dia nulo tem estado vazio.                                    | CTA abre overview; início cria sessão.        | **M6**         |
| Sessão expirada | Não há estado global durante uma tela já aberta.        | Só o resolver trata explicitamente `AUTH_INVALID_SESSION`.                                                           | Pode aparecer erro genérico em telas posteriores.                       | Logout completo limpa caches locais.          | **A4**         |
| Primeiro treino | Active workout usa loading curto local.                 | Falhas de registro/completion são refletidas na tela de conclusão; não há fluxo claro de retry persistente do envio. | Não há recuperação de sessão ativa ao reabrir o app identificada.       | Log + complete; opções home/history/progress. | **M7**         |

## Ativação e abandono

### Quantidade de etapas e campos

Há **9 telas/estados no mobile** até iniciar: login, resolver, perfil, fitness, plano, nutrição, resolver/briefing ou home, overview e active workout. Somando o cadastro externo exigido para um usuário novo, são **10 etapas operacionais**. A contagem inclui a nutrição porque a implementação a torna uma pré-condição para alcançar a home, mesmo que o plano de treino já exista.

Campos obrigatórios do caminho mínimo: e-mail e senha no login/cadastro; perfil exige nome; fitness exige altura, peso, objetivo, nível, dias e minutos; plano exige `fitnessProfileId`. Nutrição exige objetivo e refeições/dia somente para recomendações nutricionais, não para Home/primeiro treino. Não há campos obrigatórios no overview além de dados previamente criados.

**Tempo até o primeiro treino:** não mensurado. Não há início/fim de fluxo, duração por etapa ou evento de primeiro treino no analytics atual.

### Pontos prováveis de abandono

1. **Antes do login:** ainda há uma alternativa externa documentada, mas o caminho nativo reduz a troca de contexto; recuperação de senha continua ausente (**A1**, **M2**).
2. **Perfil fitness:** seis dados e quatro faixas numéricas em uma única tela, com defaults que podem parecer dados já confirmados (**A5**, **M4**).
3. **Plano:** ação assíncrona de geração sem progresso estimado; falha deixa o usuário sem indicação de recuperação segura (**A5**, **M3**).
4. **Nutrição:** etapa adicional obrigatória para uma meta de treino, com preferências e textos livres antes de qualquer treino (**B2**, **A5**).
5. **Resolver/home:** briefing diário é introduzido antes do primeiro treino e pode ser percebido como desvio da promessa principal (**M5**).
6. **Overview:** coach e recovery são carregados junto do treino; falhas parciais deixam contexto incompleto, embora o treino possa estar disponível (**M6**).
7. **Início/conclusão:** erros de sessão, conflito ou rede não têm recuperação de jornada explicitamente persistida (**A4**, **M7**).

Não há evidência instrumentada para ordenar esses pontos por frequência; são riscos estruturais da sequência e da implementação.

## Modo demo e provisionamento — diagnóstico baseline

### Funcionamento observado

- No baseline, o botão podia ser ativado em desenvolvimento e o mobile tentava login com credenciais fixas; em falha, registrava uma conta e criava recursos e histórico por endpoints normais.
- Logout limpa token, chave de dono da sessão, cache de recovery e armazenamento offline de check-in. Não remove os dados criados no backend.

### Riscos

- **A9 — Alto:** demo usa o mesmo `EXPO_PUBLIC_API_URL` e os mesmos endpoints do usuário real; não há isolamento de ambiente, tenant, banco, usuário ou marcador persistente de demo.
- **A10 — Alto:** o botão pode aparecer em builds de desenvolvimento com backend real; uma sessão demo pode contaminar dados e telas de um ambiente compartilhado.
- **A11 — Alto:** o demo cria um workout log real para “desbloquear” histórico/progresso. Esse evento é indistinguível de um treino humano se não houver marcador no domínio/analytics.
- **A12 — Médio:** limpeza local não desfaz provisionamento remoto; repetir a demo reutiliza a conta e o histórico, e a limpeza/repetibilidade dependem do estado do banco.
- **A13 — Médio:** o cadastro automático baseado em `INVALID_CREDENTIALS` transforma credencial errada/conta removida em tentativa de criação; o comportamento é conveniente para demo, mas perigoso em ambiente não isolado.
- **A14 — Informativo:** o guia `docs/demo/README.md` afirma que não existe conta hardcoded, mas o mobile contém credenciais demo hardcoded. A documentação e o runtime não descrevem o mesmo contrato.
- **A15 — Informativo:** analytics de produto cobre nutrição, recovery e daily check-in, mas não inclui `demo`, `onboarding`, `activation` ou `first_workout`; impacto de demo não é mensurável.

## Achados consolidados por severidade

| Severidade          | IDs                                              | Total |
| ------------------- | ------------------------------------------------ | ----: |
| Bloqueador          | B1, B2                                           |     2 |
| Alto                | A1, A2, A3, A5, A9, A10, A11                     |     7 |
| Médio               | A4, A6, A7, A12, A13, M1, M2, M3, M4, M5, M6, M7 |    12 |
| Baixo               | A8                                               |     1 |
| Informativo         | A14, A15, I1, I2, I3                             |     5 |
| Dependência externa | D1, D2                                           |     2 |

**Dependências externas:** D1 — disponibilidade/configuração de API e MongoDB para criar a conta antes de usar o mobile; D2 — restrição de rede/sandbox para executar testes que abrem listener HTTP. Não foram contadas como métricas de produto.

## Critérios de aceite da Sprint 5

Os critérios abaixo foram atualizados após o lote 2; os itens marcados como concluídos foram validados por testes/builds nesta etapa:

1. **Concluído nesta etapa:** um novo usuário consegue registrar e autenticar dentro do mobile, sem operação manual externa.
2. A jornada declara claramente o número de etapas, o progresso, campos obrigatórios e a razão de cada etapa.
3. Perfil, fitness, plano e nutrição podem ser retomados após falha ou encerramento, sem duplicação nem estado órfão não recuperável.
4. Cada etapa possui loading, erro acionável, vazio/incompleto, retry seguro e destino de sucesso definido.
5. Qualquer 401 durante a jornada leva a uma sessão expirada compreensível e a um retorno seguro ao login.
6. API, `packages/api-client`, tipos compartilhados e mobile usam contratos únicos e erros categorizáveis.
7. O tempo até primeiro treino, visualização/início/conclusão de cada etapa e abandono são mensuráveis, sem dados pessoais ou payloads sensíveis.
8. Demo é explicitamente isolada, marcada em dados/eventos, repetível e limpa por procedimento seguro; nunca cria histórico indistinguível de um usuário real.
9. Testes de contrato cobrem sucesso, validação, conflitos, sessão expirada, retry e retomada do onboarding.

## Primeiro lote seguro recomendado

O lote 1 de instrumentação foi implementado antes desta etapa. O lote 2 de cadastro nativo também foi implementado; os próximos lotes permanecem:

1. **Resolver de onboarding recuperável:** persistir/consultar estado de recursos e permitir retry idempotente; manter nutrição como etapa separada somente se a decisão de produto confirmar que ela bloqueia a ativação.
2. **Demo isolada:** separar ambiente/conta e marcar dados demo antes de continuar usando o botão em qualquer backend compartilhado; remover a criação silenciosa de histórico real ou marcá-la no contrato.
3. **Provider de analytics:** conectar um provider aprovado e não bloqueante, com fila offline/retentativa e testes de reinício do app.

## Validação executada

- `npm exec nx run api-client:test -- --runInBand`: **9 suítes, 47 testes aprovados**.
- `npm exec nx run mobile:test -- --runInBand`: **22 suítes, 104 testes aprovados**.
- `npm exec nx run api:test -- --runInBand`: **231 suítes e 1.415 testes aprovados; 1 suíte/3 testes falharam** em `src/common/rate-limit/rate-limit.integration.spec.ts` porque o ambiente não permitiu abrir `0.0.0.0` (`listen EPERM`); os erros derivados reportaram `serverAddress` nulo. Não foi alterado código nem teste para contornar isso.
- `git diff --check`: executado sem apontamentos.

## Lote 1 implementado — instrumentação do funil

O lote foi implementado somente no mobile, sobre o boundary existente de `product-analytics`. Nenhum endpoint, DTO, resposta de API, regra de navegação ou comportamento funcional foi alterado.

### Schema comum v1

Todos os eventos usam `schemaVersion: "onboarding-activation.v1"`, `flowSessionId` e `mode`, com `mode` igual a `real` ou `demo`. O `flowSessionId` é um identificador aleatório de correlação (`onb-...`), não derivado de usuário, e não contém e-mail, nome, token ou ID pessoal. O mode demo nunca deve ser somado ao funil real.

O tracker mantém uma chave de deduplicação por evento, fluxo, modo e, quando aplicável, etapa/categoria de erro. Re-render, retry idêntico e remontagem do mesmo ponto não emitem novamente o mesmo evento durante o fluxo em memória.

### Catálogo de eventos

| Evento estável                      | Momento e origem                                                                | Propriedades específicas além do schema comum                                                                        | Deduplicação / offline                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `onboarding_started`                | Primeiro `HomeResolver` que encontra perfil incompleto; mobile.                 | Nenhuma.                                                                                                             | Uma vez por `flowSessionId`; provider noop/indisponível não bloqueia.     |
| `onboarding_completed`              | Após `home_reached` e confirmação das pré-condições mínimas; mobile real.       | Nenhuma.                                                                                                             | Uma vez por fluxo real; demo nunca conta como ativação.                   |
| `registration_started`              | Montagem de `RegisterScreen`; mobile.                                           | Nenhuma.                                                                                                             | Uma vez por fluxo; sem fila offline.                                      |
| `registration_completed`            | Após registro, login e persistência de sessão; mobile.                          | Nenhuma.                                                                                                             | Uma vez por fluxo; sem fila offline.                                      |
| `profile_started`                   | Montagem de `CreateProfileScreen`; mobile.                                      | Nenhuma.                                                                                                             | Uma vez por fluxo; retry/re-render não duplica.                           |
| `profile_completed`                 | Sucesso de `POST /users/profile`; mobile.                                       | Nenhuma.                                                                                                             | Uma vez por fluxo.                                                        |
| `nutrition_started`                 | Montagem de `CreateNutritionProfileScreen`; mobile.                             | Nenhuma.                                                                                                             | Uma vez por fluxo.                                                        |
| `nutrition_completed`               | Sucesso de perfil e plano de nutrição; mobile.                                  | Nenhuma.                                                                                                             | Uma vez por fluxo.                                                        |
| `plan_created`                      | Sucesso de `POST /training/plans`; mobile.                                      | Nenhuma.                                                                                                             | Uma vez por fluxo.                                                        |
| `onboarding_resumed`                | `HomeResolver` encontra estado parcial após uma etapa anterior; mobile.         | `resumeReason`: `partial_state` ou `app_reopened`.                                                                   | Uma vez por razão no fluxo; sem fila offline.                             |
| `onboarding_abandoned`              | App vai para background/inactive enquanto o resolver aguarda conclusão; mobile. | `stage`: etapa não sensível atual.                                                                                   | Uma vez por etapa no fluxo; evento best-effort.                           |
| `home_reached`                      | Resolver libera briefing/home após pré-condições; mobile.                       | Nenhuma.                                                                                                             | Uma vez por fluxo.                                                        |
| `first_workout_started`             | Sucesso de início da sessão no overview; mobile.                                | Nenhuma.                                                                                                             | Uma vez por fluxo; demo permanece `mode=demo`.                            |
| `first_workout_completed`           | Log/completion do treino concluído com sucesso; mobile.                         | Nenhuma.                                                                                                             | Uma vez por fluxo; conflito de log não gera novo evento funcional.        |
| `onboarding_error`                  | Falha de resolver, perfil, plano ou nutrição; mobile.                           | `stage`, `errorCategory`: `network`, `authentication`, `validation`, `conflict`, `not_found`, `server` ou `unknown`. | Uma vez por etapa/categoria; não envia mensagem, código bruto ou payload. |
| `session_expired_during_onboarding` | Resolver recebe `AUTH_INVALID_SESSION` antes do logout; mobile.                 | `stage`.                                                                                                             | Uma vez por etapa; sem bloqueio adicional.                                |
| `demo_started`                      | Início de `signInDemo`; mobile.                                                 | Nenhuma; sempre `mode=demo`.                                                                                         | Uma vez por fluxo demo.                                                   |
| `demo_completed`                    | Provisionamento demo concluído; mobile.                                         | Nenhuma; sempre `mode=demo`.                                                                                         | Uma vez por fluxo demo.                                                   |

Os eventos `registration_*` agora têm origem nativa no mobile e continuam protegidos pela whitelist; não são emitidos artificialmente no login.

### Pontos técnicos de emissão

- `apps/mobile/src/analytics/product-analytics.ts`: catálogo, tipos, whitelist e schema permitido.
- `apps/mobile/src/analytics/onboarding-analytics.ts`: contexto, correlação, deduplicação e classificação segura de erros.
- `AuthProvider`: `demo_started` e `demo_completed`.
- `RegisterScreen`: `registration_started`, `registration_completed` e `onboarding_error` de cadastro.
- `HomeResolverScreen`: início, retomada, home alcançada, abandono, erro e sessão expirada.
- `CreateProfileScreen`: início, conclusão e erro do perfil.
- `CreateTrainingPlanScreen`: criação do plano e erro.
- `CreateNutritionProfileScreen`: início, conclusão e erro da nutrição.
- `WorkoutOverviewScreen` e `WorkoutCompletionScreen`: primeiro treino iniciado/concluído.

### Política de privacidade e disponibilidade

- O payload passa pela whitelist existente; senha, token, e-mail, nome, dados de saúde, conteúdo de treino, IDs pessoais e payloads de request/response são rejeitados antes do provider.
- O provider padrão continua noop. Falhas do provider são capturadas e não interrompem o fluxo.
- Não foi criado backend, dashboard, endpoint ou fila remota. Em offline, os eventos são best-effort e podem ser perdidos; isso é uma limitação explícita até existir um destino/retentativa aprovado.
- A deduplicação é em memória e vale para o fluxo corrente. Persistência de correlação entre reinícios do app e uma fonte remota de verdade ficam para lote posterior.

### Testes adicionados

`apps/mobile/src/analytics/product-analytics.spec.ts` cobre emissão do schema, whitelist e ausência de dados sensíveis, deduplicação de re-render/retry, separação demo/real e falha do provider sem bloqueio. Os testes existentes do resolver continuam cobrindo o roteamento funcional.

### Limitações de medição após este lote

- O funil novo pode medir cadastro, etapas do mobile e primeiro treino quando o provider estiver conectado; ainda não há dashboard nem destino remoto para consultar os eventos.
- Não há persistência offline nem exportação para um destino externo; com o provider noop padrão, a execução local não produz um dashboard.
- “Primeiro treino” é primeiro dentro do `flowSessionId`; determinar o primeiro histórico global por usuário exigiria uma decisão de contrato/identidade não feita nesta etapa.
- O modo demo é separado no evento, mas o risco de dados demo no mesmo backend permanece até o lote de isolamento.

### Próximo lote recomendado

Conectar um provider aprovado e não bloqueante, com fila offline/retentativa e testes de reinício do app. Em paralelo, isolar e marcar o provisionamento demo antes de usar os dados para decisões de ativação.

## Lote 2 implementado — cadastro nativo no mobile

### Fluxo e contrato reutilizado

O mobile agora expõe `Login` → `Register`. O cadastro usa exatamente o contrato já existente:

1. `POST /auth/register` com `RegisterUserRequest` (`name`, `email`, `password`).
2. Em sucesso, `POST /auth/login` com e-mail e senha somente em memória.
3. `persistSession` grava apenas o `accessToken`, cria o `sessionOwnerKey` opaco e muda o estado para autenticado.
4. A troca do navegador autenticado abre `HomeResolver`, que encaminha ao primeiro passo de onboarding ainda incompleto.

Não foi criado endpoint paralelo, não foram alteradas DTOs/respostas/regras da API e o cadastro externo existente continua válido.

### Estados, validações e erros

- Validação local: nome de 2–80 caracteres; e-mail com formato válido; senha de 8–128 caracteres contendo maiúscula, minúscula e número; confirmação da senha igual à senha.
- Loading desabilita o botão e o submitter compartilha a mesma Promise enquanto existe uma submissão em andamento.
- `AUTH_EMAIL_ALREADY_EXISTS`: mensagem orienta o usuário a entrar; não tenta login automático e não cria conta duplicada.
- `AUTH_INVALID_INPUT`/`AUTH_PASSWORD_TOO_WEAK`: mensagem acionável sem expor payload.
- `NETWORK_ERROR`: mensagem orienta verificar conexão e repetir.
- Falha depois do registro, inclusive no login, limpa token e `sessionOwnerKey` locais; a senha nunca é persistida.
- O retry repete o contrato de forma segura; a unicidade da API impede uma segunda conta. Se a primeira tentativa tiver sido ambígua por rede, o conflito posterior é tratado como conta já existente.

### Eventos de analytics

- `registration_started`: emitido uma vez ao montar `RegisterScreen`.
- `registration_completed`: emitido somente após registro, login e persistência da sessão concluírem.
- `onboarding_started`: continua sendo emitido pelo `HomeResolver` ao encontrar o primeiro recurso de onboarding incompleto.
- `onboarding_error`: emitido para falha de registro/login com `stage=registration` e categoria segura (`network`, `authentication`, `validation`, `conflict`, `not_found`, `server`, `unknown`).

Todos passam pelo schema `onboarding-activation.v1`, `flowSessionId`, `mode=real` e whitelist existente. Nenhum evento inclui senha, token, e-mail, nome ou payload. O modo demo não foi alterado.

### Testes adicionados

- `registration-flow.spec.ts`: cadastro válido, login/persistência, e-mail duplicado, payload inválido, senha inválida via erro da API, erro de rede, limpeza após falha parcial e submissão duplicada.
- `register-screen-helpers.spec.ts`: campos obrigatórios, validação local, confirmação de senha, mensagens de erro e ausência de exposição de credenciais.
- Os testes de analytics existentes cobrem emissão de `registration_*`/`onboarding_error` pelo catálogo, whitelist, privacidade, deduplicação e separação demo/real.

### Impacto no funil e limitações

- O abandono estrutural por cadastro fora do app foi removido do caminho principal; o funil mobile agora começa em `registration_started` e pode seguir até `first_workout_started/completed`.
- O endpoint ainda exige duas chamadas para criar sessão, pois `POST /auth/register` não retorna token. Isso preserva compatibilidade, mas deixa uma janela de erro entre criação e login; o cliente limpa apenas estado local nessa situação, sem tentar apagar a conta remota.
- Não há verificação de e-mail nem recuperação de senha neste lote.
- A medição continua best-effort enquanto o provider padrão for noop e sem fila offline.
- Nutrição permanece opcional para chegar à Home; o resolver confirma perfil, fitness e plano antes de liberar o treino.

### Próximo lote recomendado após o cadastro

Implementar isolamento real do modo demo e provider de analytics com fila offline aprovada. Depois, avaliar retomada de rascunhos não sensíveis somente se houver necessidade de produto; o backend continua sendo a fonte de verdade dos dados já salvos.

## Lote 3 implementado — onboarding retomável e progressivo

### Etapas antes e depois

| Antes                                                                            | Depois                                                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cadastro externo ou nativo → perfil → fitness → plano → nutrição → Home → treino | Cadastro nativo → perfil → fitness → plano → Home → primeiro treino; nutrição opcional após a Home                 |
| Nutrição ausente podia bloquear a entrada                                        | A Home é liberada quando perfil, perfil fitness e plano existem                                                    |
| Não havia etapa local explícita nem retomada versionada                          | `profile`, `fitness_profile`, `training_plan` e `nutrition` são estados explícitos, com `flowSessionId` preservado |

O número mínimo atual até a Home é 4 etapas de produto (cadastro, perfil, fitness e plano), além da resolução automática; até o primeiro treino, a jornada tem 6 marcos incluindo Home e início do treino. Nutrição não entra na contagem mínima de ativação.

### Campos e pré-condições

- Perfil: `name` é obrigatório para criar o perfil; o valor digitado continua somente no formulário até confirmação da API.
- Fitness: objetivo, nível de atividade, altura, peso e disponibilidade são necessários pelo contrato atual para criar o perfil fitness e gerar o plano.
- Plano: `fitnessProfileId` e os dados já confirmados pelo backend são suficientes; a criação é acionada uma vez e o botão fica bloqueado durante a chamada.
- Nutrição: dados nutricionais são opcionais para chegar à Home e necessários somente para recomendações/planos nutricionais.
- Recomendações avançadas: dependem de dados adicionais do domínio e não bloqueiam o primeiro treino quando o dashboard já retorna um plano válido.

### Persistência e retomada

`apps/mobile/src/storage/onboarding-progress-storage.ts` grava apenas metadados não sensíveis em `elev9.onboarding-progress.v1`: versão do schema, etapa, modo (`real`/`demo`), `flowSessionId`, chave opaca de sessão e timestamp. Não grava senha, token, e-mail, nome, saúde, peso, payload ou conteúdo de treino. Falha de armazenamento é best-effort e nunca bloqueia o fluxo.

O `HomeResolver` consulta o backend ao reabrir o app e usa a API como fonte de verdade; o registro local serve para preservar correlação e indicar que havia progresso parcial. O modo e a chave de sessão precisam coincidir, evitando carregar progresso demo na sessão real. Logout explícito limpa o registro e a correlação; sessão expirada preserva o registro para a próxima autenticação da mesma jornada. Recursos já confirmados no backend não são recriados ao retomar: o resolver avança para a primeira pré-condição ausente.

As telas exibem “Step n of 3” e informam que é seguro fechar o app e continuar depois. Loading desabilita submissão repetida; erro mantém a etapa atual para retry. Após perfil, fitness e plano confirmados, o plano leva ao `HomeResolver`, que libera briefing/Home. O primeiro treino continua protegido pelas regras reais de plano e sessão de treino.

### Eventos

Foi adicionado `onboarding_completed`, emitido somente após `home_reached` e somente em modo real. `onboarding_started` é deduplicado no fluxo; ao reabrir, o contexto salvo é restaurado e `onboarding_resumed` usa o mesmo `flowSessionId`; sair para background em etapa incompleta emite `onboarding_abandoned`; falhas emitem `onboarding_error`. A whitelist existente mantém propriedades sem dados pessoais ou de saúde.

### Testes adicionados

- armazenamento versionado: round-trip, versão inválida, usuário/chave diferente, modo demo/real e limpeza;
- analytics: preservação de `flowSessionId`, deduplicação de retomada, conclusão sem campos sensíveis;
- resolver: plano existente leva à Home mesmo sem nutrição;
- telas: prevenção de submissão duplicada com loading e indicador de progresso.

### Riscos e limitações

- Rascunhos de campos não são armazenados localmente; se o app fechar antes da confirmação da API, o usuário repete somente a etapa não confirmada.
- Sem provider remoto/fila offline, eventos podem ser perdidos quando o app está offline; não há dashboard inventado nesta etapa.
- A recuperação automática após sessão expirada pressupõe continuidade da mesma jornada; logout explícito invalida a correlação e o progresso local.
- O modo demo continua no mesmo backend e ainda não tem isolamento de tenant/ambiente; este lote apenas impede mistura local e separa analytics.

### Próximo lote recomendado

Isolar e marcar o provisionamento demo no backend, incluindo limpeza/repetibilidade e exclusão do demo do domínio de ativação. Em seguida, conectar um provider de analytics aprovado com fila offline não bloqueante e métricas de entrega.

## Lote 4 implementado — isolamento seguro do modo demo

### Arquitetura e configuração

O mobile não possui mais credenciais, nome de usuário, senha ou fallback demo no código. O botão só aparece quando `EXPO_PUBLIC_DEMO_MODE=true` e existem `EXPO_PUBLIC_DEMO_API_URL`, `EXPO_PUBLIC_DEMO_EMAIL` e `EXPO_PUBLIC_DEMO_PASSWORD` fornecidos fora do repositório. A URL demo precisa coincidir com `EXPO_PUBLIC_API_URL` no build dedicado, evitando alternância silenciosa entre APIs.

O fluxo demo agora faz somente `POST /auth/login` contra uma conta previamente provisionada pelo owner do ambiente. Foram removidos o auto-registro e todas as mutações automáticas de perfil, fitness, plano, nutrição e histórico de treino. Não foi criado endpoint público de seed/reset. O build real mantém o fluxo de login/cadastro inalterado.

### Isolamento e limpeza

- A conta demo deve viver em ambiente/base dedicados e não pode ser uma conta real.
- JWT, `sessionOwnerKey`, progresso de onboarding, cache de recovery e armazenamento offline de check-in são removidos no logout/reset local.
- A API existente continua autorizando recursos pelo usuário do JWT; o demo não recebe IDs ou tokens de outro usuário.
- `demo` permanece no contexto analítico e nunca emite `onboarding_completed` real; eventos de primeiro treino demo continuam marcados com `mode=demo`.
- O reset local emite `demo_reset` antes de limpar a correlação. O reset remoto não é executado pelo cliente porque não existe endpoint autorizado e seguro para exclusão de dados demo.

### Eventos e privacidade

O catálogo agora inclui `demo_started`, `demo_completed` e `demo_reset`, sempre com `mode=demo`, `flowSessionId` aleatório e schema `onboarding-activation.v1`. Nenhum evento contém e-mail, senha, token, nome, dados de saúde, histórico ou conteúdo de treino. Falha de login/configuração não cria usuário nem altera dados remotos.

### Testes e limitações

Os testes cobrem configuração explícita, ausência de fallback, URL demo dedicada, ausência de credenciais no payload analítico e o catálogo de `demo_reset`. O teste E2E deve ser executado apenas no host autorizado com uma conta demo pré-provisionada; não há provisionamento remoto neste workspace para testar sem um ambiente externo.

Limitações residuais: não existe marcador demo no domínio backend, tenant demo ou operação remota de reset. Portanto, a separação de dados depende de uma API/base dedicada e da governança do ambiente. Uma conta demo mal configurada na API real continua sendo um risco operacional; a configuração por build reduz o risco, mas não substitui isolamento de infraestrutura.

### Próximo lote recomendado

Provisionar externamente um ambiente demo dedicado com conta/seed não produtivo, política de expiração, reset autorizado e evidência de isolamento. Depois, conectar o provider de analytics com filtro server-side `mode=demo` e fila offline não bloqueante.

## Lote 5 implementado — ativação até o primeiro treino

### Fluxo final e pré-condições mínimas

O caminho real validado é: `registro` → `login` → `HomeResolver` → perfil mínimo → perfil fitness → plano confirmado → `HomeResolver` → `CoachDailyBriefing`/`MainTabs` → card de treino → `WorkoutOverview` → `POST /progress/workout-sessions/start` → `ActiveWorkout` → conclusão e `POST /progress/workout-sessions/:id/complete`.

As pré-condições mínimas para liberar a Home são perfil de usuário, perfil fitness e plano de treino retornados pela API. Nutrição continua opcional. O primeiro treino só é liberado quando existe plano, sessão autenticada e treino disponível no plano; nenhum dado artificial é criado para preencher ausência.

### Estados, navegação e erros

- `HomeResolver`: loading, erro com retry, sessão expirada com retorno ao login e preservação do progresso retomável.
- Plano ausente: orientação para concluir a etapa de criação do plano; não navega para Home antes da confirmação da API.
- Home: `TodaysWorkoutCard` mostra CTA `Start Workout`, retry para erro de carregamento e estado vazio explícito para dia sem treino.
- Overview: carrega novamente o plano canônico antes de iniciar; erro de rede mantém retry; sessão expirada limpa a sessão sem apagar progresso confirmado.
- Início: o botão é desabilitado durante `startWorkout`; só navega para `ActiveWorkout` depois da resposta bem-sucedida da API. O endpoint já é idempotente para a mesma sessão/plano/dia.
- Conclusão: o evento de ativação só é emitido após o log e a conclusão da sessão serem confirmados; falha mostra estado recuperável e erro categorizado.

### Analytics

`home_reached` e `onboarding_completed` são emitidos uma vez no modo real após as pré-condições. `first_workout_started` só ocorre após `POST /progress/workout-sessions/start`; `first_workout_completed` só ocorre após o salvamento/conclusão confirmados. Falhas em Home, início ou conclusão emitem `onboarding_error`; 401/`AUTH_INVALID_SESSION` emitem `session_expired_during_onboarding` e preservam a retomada. A deduplicação existente usa `flowSessionId` e modo; demo permanece `mode=demo` e nunca conta como ativação real.

### Testes e resultados

Foram adicionados testes para estados de disponibilidade do treino e bloqueio de início duplicado. Os testes existentes de analytics cobrem deduplicação, privacidade e separação demo/real; os testes de contrato/E2E cobrem autenticação, onboarding mínimo, plano e início de sessão de treino no backend.

Validação executada: mobile com 29 suítes/129 testes, API auth e progress relacionados, api-client, builds Expo Web/Android/iOS, lint, formatação e `git diff --check`. E2E de registro/onboarding/primeiro treino requer host autorizado quando depende de MongoMemoryServer; não há ambiente demo remoto neste workspace.

### Riscos residuais

- A disponibilidade depende do `weeklySchedule` retornado pelo plano; em dia de descanso o estado vazio é correto e o próximo treino deve ser consultado no plano.
- Não há instrumentação remota/dashboard neste repositório; os eventos são best-effort enquanto o provider externo não for conectado.
- Sessão expirada durante uma tela de treino retorna ao login; dados já confirmados permanecem no backend, mas rascunhos ainda não enviados não são recuperados.
- O isolamento demo continua dependente da configuração/base dedicada definida no lote 4.

### Próximo lote recomendado

Validar no host autorizado a jornada completa em dispositivo real, incluindo timezone/dia de descanso e recuperação de sessão expirada. Depois, conectar o provider de analytics e medir entrega do funil sem misturar demo, além de definir uma política remota autorizada para expiração/reset do ambiente demo.

## Evidências principais

- Jornada/navegação: `apps/mobile/src/navigation/app-navigator.tsx`, `apps/mobile/src/screens/home-resolver-screen.tsx`, `apps/mobile/src/screens/home-resolver-helpers.ts`.
- Auth/demo: `apps/mobile/src/auth/auth-provider.tsx`, `apps/mobile/src/screens/login-screen.tsx`, `docs/demo/README.md`.
- Contratos compartilhados: `packages/api-client/src/http-client.ts`, `packages/api-client/src/auth-api.ts`, `packages/api-client/src/training-api.ts`, `packages/api-client/src/progress-api.ts`, `packages/types/src/auth/index.ts`, `packages/types/src/users/index.ts`, `packages/types/src/fitness/index.ts`, `packages/types/src/training/index.ts`, `packages/types/src/progress/index.ts`.
- DTOs/controllers: `apps/api/src/modules/auth/presentation/http`, `apps/api/src/modules/users/presentation/http`, `apps/api/src/modules/fitness/presentation/http`, `apps/api/src/modules/training/presentation/http`, `apps/api/src/modules/progress/presentation/http`.
- Analytics: `apps/mobile/src/analytics/product-analytics.ts`.

## Fechamento final da Sprint 5

### Baseline final

O fluxo principal do usuário real está validado como:

`registro → login → perfil → fitness → plano → Home → primeiro treino iniciado → primeiro treino concluído`

O cadastro nativo reutiliza o contrato existente, a sessão é persistida somente após login confirmado, o onboarding pode ser retomado por usuário e modo, e a nutrição não bloqueia a Home. O início do treino só navega após confirmação da API e mantém a proteção de idempotência existente.

### Matriz final de cenários

| Cenário                                        | Evidência                                                                  | Resultado                                                                                   | Classificação       |
| ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| Usuário real percorre a jornada principal      | E2E de auth, onboarding, plano e workout start; mobile                     | Passou                                                                                      | Informativo         |
| Onboarding incompleto e retomada após reinício | testes de storage, resolver e analytics                                    | Passou                                                                                      | Informativo         |
| Retomada após erro de rede                     | estados de erro/retry e testes direcionados mobile                         | Passou                                                                                      | Informativo         |
| Sessão expirada                                | tratamento em `HomeResolver`, overview e conclusão; testes direcionados    | Passou, preservando progresso confirmado                                                    | Informativo         |
| Usuário sem plano                              | resolver e estado de orientação                                            | Passou                                                                                      | Informativo         |
| Treino indisponível/dia de descanso            | estados de disponibilidade do treino                                       | Passou, com estado vazio explícito                                                          | Informativo         |
| Nutrição opcional                              | resolver e E2E de nutrição                                                 | Passou sem bloquear ativação                                                                | Informativo         |
| Submissão duplicada e retry                    | testes de cadastro, onboarding e início do treino                          | Passou                                                                                      | Informativo         |
| Demo, reset e logout                           | configuração explícita, limpeza local e testes de isolamento               | Passou localmente; reset remoto depende de ambiente dedicado                                | Dependência externa |
| Isolamento demo/real                           | `mode`, `sessionOwnerKey`, configuração por ambiente e autorização por JWT | Passou no escopo do cliente; isolamento de infraestrutura não é verificável neste workspace | Dependência externa |
| Analytics e deduplicação                       | catálogo, whitelist, schema v1 e testes de privacidade/deduplicação        | Passou em provider noop; entrega remota não mensurada                                       | Dependência externa |
| Primeiro treino iniciado e concluído           | E2E `workout-start`/`workout-completion` e telas mobile                    | Passou                                                                                      | Informativo         |

### Resultados de testes, builds e qualidade

- Mobile: 29 suítes, 129 testes — passou.
- API completa: 232 suítes; 231 passaram; 1 suíte/3 testes falharam em `rate-limit.integration.spec.ts` por `listen EPERM: operation not permitted 0.0.0.0`. As falhas são de ambiente/infraestrutura de listener local, não regressões funcionais da Sprint 5. Os testes direcionados de auth/progress passaram: 20 suítes, 147 testes.
- `api-client`: 9 suítes, 47 testes — passou.
- E2E completo no host autorizado: 23 suítes, 81 testes — passou.
- Expo Web, Android e iOS: builds concluídos — passou.
- Lint direcionado de `types`, `api` e `api-client` — passou.
- `git diff --check` — passou.
- Formatação direcionada dos arquivos da Sprint 5 — passou.
- `npm run format:check` — falhou por 43 arquivos, principalmente artefatos gerados em `apps/mobile/ios/...` e `docs/validation/sprint-2-critical-e2e.md`, todos fora do escopo desta Sprint 5; não foram reformatados.

### Cobertura das entregas e métricas disponíveis

Cadastro nativo, sessão após registro, onboarding retomável, nutrição opcional, chegada ao primeiro treino, modo demo, limpeza no logout, isolamento analítico, início idempotente e sessão expirada foram cobertos por testes unitários, de integração, E2E ou builds conforme a matriz acima.

As métricas de produto — conversão por etapa, tempo até o primeiro treino, abandono real, entrega offline e ativação por coorte — estão ausentes/não mensuradas. O repositório contém o schema e a emissão local dos eventos, mas não possui provider externo, armazenamento remoto ou dashboard; portanto não há métricas reais a declarar.

### Limitações, riscos residuais e dependências externas

- A suíte de API ainda depende de permissão para abrir listeners locais no teste de rate limit; isso impediu a aprovação integral dentro do sandbox.
- O demo depende de URL, conta e base dedicadas configuradas por ambiente. Não há seed/reset remoto autorizado nem endpoint público de seed.
- Analytics permanece best-effort e pode perder eventos offline até a conexão de um provider com fila não bloqueante.
- Rascunhos de campos ainda não confirmados pela API não são persistidos localmente; a fonte de verdade continua sendo o backend.
- A disponibilidade do primeiro treino depende do plano e do calendário retornados pela API; dia de descanso é tratado como indisponibilidade válida.
- Não foi possível medir comportamento em produção, nem validar isolamento de infraestrutura demo sem dependência externa aprovada.

### Status final

**Parcialmente concluída.** O fluxo funcional real até o primeiro treino, retomada, nutrição opcional, analytics local e isolamento cliente do demo foram validados sem regressões reproduzíveis da Sprint 5. O status não é “concluída” porque permanecem a falha de infraestrutura do teste de rate limit no ambiente atual, a ausência de provider de analytics e a dependência de provisionamento/reset remoto dedicado para o demo.

### Recomendação para a Sprint 6

Executar a validação em dispositivos reais e no ambiente autorizado com timezone/dia de descanso, integrar um provider de analytics com fila offline e dashboard de funil, e provisionar um ambiente demo dedicado com expiração, reset remoto autorizado e evidência de isolamento. Corrigir a restrição do ambiente de execução do teste de rate limit antes de usar a suíte completa como gate de CI.
