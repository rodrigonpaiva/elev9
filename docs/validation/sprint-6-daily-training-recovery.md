# Sprint 6 — Ciclo diário de treino e recovery

## Escopo e método

Diagnóstico não destrutivo da jornada:

`Home → treino do dia → execução → timer → substituição → conclusão → check-in → recovery`

Foram inspecionados o mobile, `packages/api-client`, `packages/types`, controllers/use cases da API, navegação, hooks, analytics e testes existentes. Nenhum código funcional, contrato, teste ou comportamento foi alterado nesta etapa.

## Mapa da jornada atual

| Etapa         | Mobile e navegação                                          | API/contrato principal                                                                                                 | Pré-condições e estado atual                                                                                            |
| ------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Home          | `DashboardScreen`, `useDashboard`, `TodaysWorkoutCard`      | `GET /dashboard/home` e domínios de workout, progress, recovery, nutrition, coach e check-in                           | Sessão autenticada; loading, erro/retry, refresh, treino disponível ou descanso                                         |
| Treino do dia | `CurrentWorkoutScreen`, `WorkoutOverviewScreen`             | `GET /training/plans/current`, `GET /ai/coach-decision/today`, `GET /recovery/today`                                   | Plano pertencente ao usuário e `weeklySchedule` contendo o dia; overview recarrega o plano canônico                     |
| Início        | `WorkoutOverviewScreen`                                     | `POST /progress/workout-sessions/start`                                                                                | Plano, dia válido e sessão autenticada; API retorna sessão ativa ou a já existente do plano/dia/data                    |
| Execução      | `ActiveWorkoutScreen`                                       | Nenhuma chamada por série; estado de exercícios fica em React state                                                    | Exercícios e séries vêm do plano; avanço, pausa e progresso são locais à tela                                           |
| Timer         | `RestTimerScreen`                                           | Nenhum endpoint                                                                                                        | `targetEndAt` calculado em memória; foreground recalcula pelo relógio; pausa e acréscimo são locais                     |
| Substituição  | `ExerciseReplacementScreen` → `ActiveWorkoutScreen`         | Nenhum endpoint de substituição de exercício                                                                           | Alternativas são templates determinísticos no mobile; a troca só altera a rota e o estado local                         |
| Conclusão     | `WorkoutCompletionScreen`                                   | `POST /progress/workout-logs`; `POST /progress/workout-sessions/:id/complete`; leituras de coach, recovery e nutrition | Log é validado por plano/dia/data; sessão é do usuário e pode ser concluída uma vez; chamadas são coordenadas no mobile |
| Check-in      | `DailyCheckInScreen`, `DailyCheckInFlow`, `useDailyCheckIn` | `GET /progress/daily-check-in/today`; `POST /progress/daily-check-in`; `GET /recovery/today`                           | Quatro escalas inteiras de 1–5; upsert por usuário/data local; recovery é recalculado no backend                        |
| Recovery      | `RecoveryScreen`, `useRecoveryExperience`, cards da Home    | `GET /recovery/experience/current`, `/history`, `/recovery/today`, `/current`, `/history`                              | Read model pode estar disponível, sem dados, stale/legacy ou em erro; cache local é por `sessionOwnerKey`               |

## Arquivos e módulos envolvidos

### Mobile

- Home: `apps/mobile/src/screens/dashboard-screen.tsx`, `apps/mobile/src/hooks/use-dashboard.ts`, `apps/mobile/src/components/dashboard/todays-workout-card.tsx`.
- Treino: `apps/mobile/src/screens/current-workout-screen.tsx`, `workout-overview-screen.tsx`, `active-workout-screen.tsx`, `workout-completion-screen.tsx`.
- Timer: `apps/mobile/src/screens/rest-timer-screen.tsx`.
- Substituição e contexto: `apps/mobile/src/screens/exercise-replacement-screen.tsx`, `exercise-detail-screen.tsx`.
- Check-in: `apps/mobile/src/features/daily-check-in/` e `daily-check-in-screen.tsx`.
- Recovery: `apps/mobile/src/features/recovery/`, `recovery-screen.tsx`, `use-recovery-experience.ts`.
- Navegação/API/analytics: `apps/mobile/src/navigation/app-navigator.tsx`, `apps/mobile/src/api/client.ts`, `apps/mobile/src/analytics/product-analytics.ts`.

### API e packages compartilhados

- API: `apps/api/src/modules/progress/presentation/http/progress.controller.ts`, `training.controller.ts`, `recovery.controller.ts` e seus DTOs/use cases.
- Cliente: `packages/api-client/src/dashboard-api.ts`, `training-api.ts`, `progress-api.ts`, `recovery-api.ts`, `http-client.ts`.
- Tipos: `packages/types/src/dashboard/index.ts`, `training/index.ts`, `progress/index.ts`, `recovery/index.ts`.

## Estados da interface

| Área         | Loading                                   | Erro/retry                                                               | Vazio/incompleto                                                                        | Sessão e sincronização                                                                          |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Home         | Domínios independentes e skeleton inicial | Retry por domínio e refresh global; falhas parciais permanecem possíveis | Card de descanso quando não há treino                                                   | `ApiClientError` é exibido; o comportamento de logout depende do contexto que detecta 401       |
| Overview     | Skeleton e refresh                        | “Workout unavailable” com retry; 401 preserva onboarding e desloga       | Plano sem treino mostra “No workout scheduled today”                                    | Start desabilita durante a Promise e só navega após sucesso                                     |
| Execução     | Skeleton curto local                      | Estado local “Workout data unavailable” com retry                        | Exercício inválido resulta em estado sem modelo                                         | Não há fonte de persistência para a sessão ativa ou séries                                      |
| Timer        | Skeleton curto                            | Estado apenas para `restSeconds <= 0`                                    | Não há estado de timer restaurável ou indisponível por API                              | Foreground recalcula; reinício do app perde o timer                                             |
| Substituição | Skeleton curto                            | Erro é somente ausência de exercício; retry local                        | Sem alternativa retorna ao original                                                     | Não há falha de API porque não há chamada; troca não é confirmada no backend                    |
| Conclusão    | Loading enquanto salva e lê dados         | Falhas parciais não apresentam retry persistente específico              | Sem exercícios mostra resumo sem log                                                    | Log, complete, coach, recovery e nutrition podem ter resultados divergentes                     |
| Check-in     | Loading e submitting                      | Erro mapeado, retry e fila offline                                       | Formulário em etapas com revisão; histórico vazio tem estado próprio                    | Fila offline existe; submit confirma check-in e então busca recovery                            |
| Recovery     | Estados current/history independentes     | Retry, refresh e cache para erro de rede                                 | `not_available`, `insufficient_data`, `processing_failed` e stale/legacy têm mapeamento | Cache é owner-scoped; Home faz leituras separadas e não há sincronização transacional explícita |

## Contratos e pré-condições

- `POST /progress/workout-sessions/start` valida usuário, perfil fitness, plano pertencente ao perfil, dia presente no `weeklySchedule` e data UTC. A busca existente por plano/dia/data torna o início idempotente no domínio.
- `POST /progress/workout-logs` exige `trainingPlanId` MongoId, dia inteiro, duração de 1–300 minutos, ao menos um exercício e contagens não negativas. O log é único por plano/dia/data e um conflito é tratado pelo mobile como “already logged”.
- `POST /progress/workout-sessions/:id/complete` valida ownership, formato do id e data da sessão; sessão concluída retorna de forma idempotente, mas sessão ativa de data expirada falha.
- O contrato de treino não expõe uma sessão ativa com progresso de séries nem uma operação de substituição de exercício. `StartWorkoutResponse` contém metadados da sessão, não o cursor de execução.
- Check-in aceita apenas quatro valores inteiros de 1–5 e faz upsert por data local/timezone. O backend salva o check-in antes de recalcular recovery; se a recalculação falha, a resposta é erro embora o check-in já esteja persistido.
- Recovery diferencia snapshot legado/corrente e read model de experiência. O score e freshness não são recebidos junto de uma confirmação de conclusão de treino; são leituras posteriores.

## Achados classificados

### Bloqueadores

Nenhum bloqueador funcional foi comprovado na execução nominal: os contratos de início, log, conclusão, check-in e recovery possuem cobertura unitária/controller/E2E relacionada.

### Alto

- **S6-A1 — Alto — retomada da execução não é persistida.** `ActiveWorkoutScreen` mantém exercício atual, séries concluídas, fase e `startedAt` apenas em state/params de navegação. Fechar, matar ou reiniciar o app perde o cursor; a API possui `GET /workout-sessions/:id`, mas o cliente não o usa para restaurar uma sessão ativa nem há endpoint de progresso intermediário.
- **S6-A2 — Alto — timer não é restaurável após reinício.** `RestTimerScreen` conserva `targetEndAt`, pausa e segundos apenas em memória. AppState foreground corrige uma pausa temporária pelo relógio, mas background prolongado, encerramento do processo ou reinício não reconstroem o timer nem informam o usuário sobre o estado perdido.
- **S6-A3 — Alto — substituição não tem contrato persistente.** Alternativas são geradas localmente e a confirmação navega com um `replacementToken`; não há endpoint, DTO, auditoria ou fonte canônica para a troca. A Home, histórico, analytics e uma retomada posterior continuam vendo o exercício original.
- **S6-A4 — Alto — conclusão pode ficar parcialmente confirmada.** O mobile executa log/complete junto de coach/recovery/nutrition via `Promise.allSettled`. Se o log for salvo e a conclusão falhar, ou se leituras auxiliares falharem, a tela não oferece um retry transacional/estado de reconciliação claro. O histórico, a sessão e a Home podem divergir.
- **S6-A5 — Alto — check-in salvo pode ser apresentado como falha.** Depois de `submitDailyCheckIn`, o hook busca `getTodayRecovery` dentro da mesma Promise. Falha apenas nessa leitura leva o formulário ao erro, embora o backend já tenha feito upsert; um retry pode ser uma nova tentativa lógica sobre um dado já salvo e o usuário não recebe essa distinção.

### Médio

- **S6-M1 — Médio — avanço de séries é exclusivamente cliente.** Não há validação de que exercício/número de séries/repetições enviados no log correspondam à prescrição; o contrato aceita contagens não negativas e o mobile pode enviar resumo parcial ao finalizar.
- **S6-M2 — Médio — botão de completar série não tem estado de submissão ou deduplicação explícita.** O avanço é síncrono em memória e não há teste de double press para a execução; eventos rápidos podem produzir transições concorrentes antes do próximo render.
- **S6-M3 — Médio — Home agrega leituras sem consistência temporal.** Workout, progress, check-in e recovery são chamadas separadas; após conclusão ou check-in a Home pode mostrar dados de momentos diferentes até refresh/focus, sem versão ou timestamp comum.
- **S6-M4 — Médio — tratamento de sessão expirada é desigual entre domínios.** Overview e conclusão detectam 401 e preservam contexto de onboarding, enquanto hooks da Home e telas do timer/execução não demonstram uma recuperação equivalente para uma sessão ativa.
- **S6-M5 — Médio — retry de conclusão não é uma ação de produto.** `hasLoadError` não é acionado para falhas de `Promise.allSettled`; o usuário recebe resumo parcial/retorno, mas não uma opção explícita para reconciliar log ou sessão.
- **S6-M6 — Médio — recuperação em background não tem contrato de sincronização do treino.** O cache de Recovery é owner-scoped e tem freshness, porém não há vínculo explícito entre `workoutSessionId`, log, check-in e snapshot recalculado.
- **S6-M7 — Médio — analytics do ciclo diário está incompleto.** Existem eventos de daily check-in, recovery e ativação do primeiro treino, mas não foram encontrados eventos específicos estáveis para treino do dia visualizado, sessão diária iniciada/concluída, série, timer, pausa/retomada, substituição ou reconciliação.

### Baixo

- **S6-B1 — Baixo — timer não registra eventos de ciclo.** A ausência impede medir uso de pausa, skip, acréscimo e conclusão do descanso, embora não bloqueie a execução.
- **S6-B2 — Baixo — substituição usa nome como chave visual.** Exercícios e alternativas são identificados por `name`; não há id estável no modelo compartilhado, o que aumenta risco de colisão e dificulta analytics/histórico.
- **S6-B3 — Baixo — `CurrentWorkoutScreen` e Home têm caminhos paralelos.** Ambos carregam o dashboard e montam CTA/estado de treino, aumentando o risco de diferenças de mensagem, retry e sessão expirada.

### Informativo

- **S6-I1 — Informativo — início de sessão já é idempotente no backend.** Repetir o start para o mesmo plano/dia/data retorna a sessão existente.
- **S6-I2 — Informativo — complete de sessão já é idempotente para sessão concluída.** A API retorna a sessão concluída sem criar outra.
- **S6-I3 — Informativo — check-in possui fila offline e cache de Recovery com isolamento por `sessionOwnerKey`.** Há cobertura de máquina de sync, armazenamento, cache e freshness.
- **S6-I4 — Informativo — não há métricas de produto disponíveis.** Não existem provider remoto, dashboard ou séries confiáveis de conclusão, tempo de treino, abandono, uso de substituição ou efeito no Recovery.

### Dependência externa

- **S6-D1 — Dependência externa — validação de background/foreground, morte do processo e timezone precisa de dispositivos/host autorizado.** Testes unitários não comprovam ciclo de vida real do sistema operacional.
- **S6-D2 — Dependência externa — correlação real entre log, check-in e Recovery depende de ambiente com dados e relógio controlados.** O repositório fornece contratos e testes, mas não uma medição produtiva.

## Cobertura de testes existente

### Mobile

Execução via Nx: **29 suítes e 129 testes aprovados**. A cobertura existente inclui Home/check-in, analytics, fila offline do check-in, cache/freshness/mapeamento de Recovery e helpers de ativação. Não há suítes específicas para `ActiveWorkoutScreen`, `RestTimerScreen` ou `ExerciseReplacementScreen` cobrindo reinício, background, double press ou persistência da execução.

### API

Execução direcionada via Nx: **45 suítes e 288 testes aprovados**, abrangendo progress, training, recovery e dashboard. Há E2E relacionados para daily check-in, log de treino, conclusão, início de treino, dashboard, training e recovery no inventário. Não há contrato para progresso intermediário de séries ou substituição de exercício.

### `api-client`

Execução via Nx: **9 suítes e 47 testes aprovados**. `progress-api.spec.ts` e `recovery-api.spec.ts` cobrem paths e payloads existentes; não há método de substituição nem persistência/restauração de timer.

## Eventos existentes e ausentes

Existentes no catálogo `product-analytics`: `daily_check_in_cta_viewed`, `daily_check_in_cta_selected`, `daily_check_in_started`, `daily_check_in_step_viewed`, `daily_check_in_step_completed`, `daily_check_in_submit_started`, `daily_check_in_submit_succeeded`, `daily_check_in_submit_failed`, `daily_check_in_retry_selected`, `daily_check_in_success_viewed`, `daily_check_in_exited`, eventos de fila offline e eventos de Recovery como visualização, refresh, retry e CTA. O funil anterior também possui `first_workout_started` e `first_workout_completed`.

Ausentes ou não comprovados para este ciclo: `daily_workout_viewed`, `daily_workout_started`, `daily_workout_paused`, `daily_workout_resumed`, `daily_workout_abandoned`, `exercise_set_completed`, `rest_timer_started`, `rest_timer_paused`, `rest_timer_resumed`, `rest_timer_skipped`, `exercise_replacement_started`, `exercise_replacement_confirmed`, `exercise_replacement_failed`, `workout_log_reconciled` e `recovery_refreshed_after_workout`. Não há métricas reais para esses pontos.

## Primeiro lote seguro recomendado

Implementar primeiro a **fundação de retomada e reconciliação da sessão ativa**, sem substituir ainda o exercício nem alterar o cálculo de Recovery:

1. definir um estado versionado, não sensível, por `sessionOwnerKey` para `workoutSessionId`, plano/dia, exercício atual, séries confirmadas, `startedAt`, estado do timer e última sincronização;
2. restaurar esse estado após foreground/reinício somente com confirmação de ownership e sessão ativa via API;
3. tornar a conclusão e o retry explicitamente idempotentes, distinguindo log salvo, sessão concluída e leituras auxiliares;
4. separar sucesso do check-in de falha posterior ao recálculo/leitura de Recovery;
5. adicionar testes de reinício, background/foreground, sessão expirada, double press, falha parcial e reconciliação;
6. instrumentar apenas os eventos do ciclo que tiverem definição estável e deduplicação, sem inventar provider ou dashboard.

Substituição deve ser um lote posterior, após contrato compartilhado e decisão sobre persistência. Timer independente e métricas de treino podem acompanhar a fundação se permanecerem sem alterar as regras atuais de início/conclusão.

## Critérios de aceite propostos

- Execução e timer podem ser interrompidos e retomados após background e reinício sem perder séries confirmadas.
- A sessão restaurada pertence ao usuário atual, não é duplicada e respeita a data/status reais da API.
- Retry após falha parcial não duplica log, sessão, check-in ou snapshot.
- A UI diferencia treino salvo, sessão concluída, recovery atualizado, erro recuperável e estado offline.
- Substituição, quando implementada, possui contrato compartilhado, alternativa válida, preservação explícita de progresso e confirmação persistida.
- Home, histórico, check-in e Recovery convergem após conclusão e refresh, com freshness visível quando aplicável.
- Eventos do ciclo diário têm nomes estáveis, propriedades não sensíveis, deduplicação e não bloqueiam o treino.
- Testes mobile, API, `api-client`, E2E autorizado e builds cobrem os estados nominal, vazio, erro, retry, sessão expirada e ciclo de vida.

## Resumo do diagnóstico

- **Achados:** 0 bloqueadores, 5 altos, 7 médios, 3 baixos, 4 informativos e 2 dependências externas.
- **Maior risco:** perder a execução ativa e o timer ao fechar/reiniciar o app.
- **Segundo maior risco:** inconsistência entre log, sessão, check-in e Recovery após falhas parciais.
- **Lacuna estrutural:** substituição existe visualmente no mobile, mas não existe como contrato persistente.
- **Cobertura atual:** forte em contratos/domínio de API, check-in offline e Recovery; fraca em ciclo de vida da execução, timer, substituição e reconciliação.
- **Primeiro lote recomendado:** retomada versionada da sessão ativa e reconciliação idempotente antes de ampliar substituição ou analytics do ciclo.

## Lote 1 implementado — persistência e retomada versionada

### Schema e estratégia de persistência

Foi criado `apps/mobile/src/storage/active-workout-session-storage.ts` com a chave `elev9.active-workout-session.v1` e `ACTIVE_WORKOUT_SESSION_VERSION = 1`.

O snapshot contém somente estado operacional não sensível:

- `ownerKey` opaco e `mode` (`real`/`demo`);
- `workoutSessionId`, `trainingPlanId` e `workoutDayIndex`;
- treino prescrito necessário para reconstruir a tela;
- `exerciseIndex`, `progress.completedSets` e `phase`;
- `startedAt`;
- timer com status, `targetEndAt`, `remainingSeconds` e contexto do próximo set;
- `lastSynchronizedAt`, `syncStatus` e `updatedAt`;
- `version` do schema.

Senha, token, e-mail, credenciais e dados de autenticação não são persistidos. O carregamento exige coincidência de `ownerKey` e `mode`; JSON corrompido é removido e versão incompatível é descartada sem ser tratada como progresso válido. Logout explícito limpa o snapshot; expiração preserva-o para a próxima autenticação; conclusão confirmada limpa-o.

### Retomada e reconciliação

`MainTabsScreen` procura um snapshot compatível ao abrir uma sessão autenticada e reabre `ActiveWorkout` com o progresso local. `ActiveWorkoutScreen` então chama o endpoint existente `GET /progress/workout-sessions/:sessionId`:

- sessão `active`: o snapshot continua utilizável e recebe `syncStatus=synced`;
- sessão `completed`: o snapshot é limpo e a navegação vai para o histórico;
- erro de rede: o progresso local fica marcado como `error` e pode ser retomado, mas não é tratado como confirmação do backend;
- 401/`AUTH_INVALID_SESSION`: a sessão é encerrada preservando o snapshot para retomada após login;
- ausência de snapshot válido: o estado recebido pela navegação é usado apenas para a sessão corrente.

O backend não expõe progresso intermediário por série. Portanto, séries locais são progresso pendente até `POST /progress/workout-logs`; a reconciliação confirma ownership/status da sessão, não inventa uma confirmação de séries que o contrato não oferece. O início continua usando a idempotência existente de `POST /progress/workout-sessions/start`, e a conclusão continua usando log idempotente por plano/dia/data e `complete` idempotente para sessão concluída.

### Timer

`RestTimerScreen` grava o timer no mesmo snapshot e usa `targetEndAt` absoluto para calcular o restante. A função `getRestTimerRemaining` é determinística para running, paused, expirado e valores negativos. Foreground recalcula pelo relógio; pausa conserva `remainingSeconds`; a conclusão do descanso remove somente o timer, preservando a sessão ativa. Ao reiniciar o app, a sessão ativa reabre o timer quando ainda há tempo ou pausa persistida.

Não foi criado endpoint de timer nem alterado o cálculo de Recovery. A persistência é local e best-effort; falha de storage não bloqueia a execução, mas a UI não declara o estado local como salvo no servidor.

### Conclusão, check-in e Recovery

Após log e conclusão confirmados, o snapshot é limpo. Se a API falhar ou a sessão expirar, o snapshot permanece para retry; a conclusão não é marcada localmente como concluída antes da confirmação. O contrato existente do backend continua protegendo duplicidade de log e de conclusão.

Este lote não adiciona chamadas de check-in nem altera o cálculo/atualização do Recovery. O check-in segue sendo upsert por usuário/data local e a atualização de Recovery segue a implementação existente; leituras auxiliares continuam separadas da confirmação do treino.

Para preservar o vínculo da sessão durante o fluxo atual, `workoutSessionId` também é carregado ao navegar para o timer e ao voltar da tela de substituição. Não foi implementada persistência de substituição.

### Testes e validação do lote

- Mobile via Nx: **31 suítes e 137 testes aprovados**.
- API relacionada (`progress|training|recovery`): **42 suítes e 258 testes aprovados**.
- `api-client`: **9 suítes e 47 testes aprovados**.
- E2E autorizado de início, conclusão e check-in: **3 suítes e 10 testes aprovados**.
- Build Expo Web/Android/iOS: passou.
- Lint de `types`/`api-client` e lint direcionado dos arquivos mobile alterados: passou após remover um import não utilizado.
- Formatação direcionada: passou.
- `git diff --check`: passou.

Os testes adicionados cobrem snapshot versionado, ausência de credenciais, isolamento por usuário/modo, corrupção e versão incompatível, limpeza, timer running/paused/expirado e clamp de valores inválidos. Os testes de API/E2E existentes cobrem início, conclusão, conflito de log, sessão concluída, check-in e Recovery.

### Riscos residuais

- O progresso intermediário de séries continua sem confirmação de servidor porque não existe endpoint para isso; perda do storage local ainda exige repetir a parte não registrada.
- A retomada automática ocorre ao abrir `MainTabs`; ciclo de vida real de morte do processo, background prolongado, timezone e restauração nativa precisa de validação em dispositivo/host autorizado.
- Falha de storage é não bloqueante e pode impedir a retomada; não há banco local transacional nesta etapa.
- Retry de conclusão depende das garantias atuais de idempotência do backend; não foi criado um protocolo novo de reconciliação.
- Substituição continua apenas visual/local e permanece fora deste lote.

### Próximo lote recomendado

Validar o ciclo em dispositivos reais e, depois, implementar reconciliação de conclusão com estados explícitos de log/sessão e retry observável. A substituição persistente deve permanecer posterior, condicionada a um contrato compartilhado e política de preservação de séries.

## Lote 2 implementado — substituição persistente de exercícios

### Contrato adotado

Não havia contrato persistente reutilizável: a tela `ExerciseReplacementScreen` alterava somente o objeto local e navegava de volta para `ActiveWorkout`. Foi adicionado o menor contrato de sessão necessário:

- `POST /progress/workout-sessions/:sessionId/replacements`;
- request: `exerciseIndex`, `currentExerciseName`, `replacementExercise` (`name`, `sets`, `reps`, `restSeconds`), `reason` e `idempotencyKey`;
- response: o mesmo `workoutSession` existente, agora com `replacements`;
- persistência: array embutido em `workout_sessions`, sem alteração do plano global ou do `workout_logs` histórico;
- autorização: sessão deve pertencer ao perfil resolvido pela sessão autenticada;
- compatibilidade: índice precisa existir no dia do plano, o nome atual precisa coincidir e o nome/volume/descanso da alternativa precisa estar no catálogo compatível atual;
- idempotência: a mesma chave retorna o estado já persistido; outra substituição no mesmo índice retorna conflito;
- conclusão: sessão concluída não aceita alteração;
- compatibilidade/migração: documentos antigos recebem `replacements=[]` por default; nenhum endpoint de seed ou migração destrutiva foi criado.

A ausência de IDs estáveis de exercício no plano limita a validação a índice + snapshot + catálogo de nomes. Isso é suficiente para o catálogo atual e evita aceitar `exerciseId` arbitrário, mas deve ser substituído por IDs de exercício versionados em um lote futuro.

### Persistência e mobile

`MongooseWorkoutSessionRepository.replaceExercise` faz leitura para reconhecer retry, bloqueia sessão concluída e usa atualização condicional para não inserir dois itens no mesmo índice. O mobile só navega após a confirmação da API quando possui `workoutSessionId`; sem esse identificador, mantém o comportamento compatível do fluxo local legado. O snapshot local da sessão recebe o exercício confirmado pela API e a reconsulta de `GET /progress/workout-sessions/:sessionId` reaplica todas as substituições após reinício.

Séries, repetições, descanso e progresso de outros exercícios são preservados. O exercício substituído reinicia suas séries porque a operação troca o exercício executável; isso não altera regras de conclusão nem o score do Recovery. Logout continua limpando o snapshot local e a API rejeita sessão de outro usuário, inexistente ou concluída.

### Histórico e Recovery

O contrato de histórico atual (`workout_logs`) não possui campo de substituição. Portanto, este lote não inventa nem altera um campo histórico: o log continua registrando o exercício efetivamente concluído pelo nome enviado no fluxo existente, enquanto a sessão mantém a trilha de substituição. Recovery não foi alterado e não recebe eventos ou cálculos adicionais.

### Testes e validação do lote

- Use case da API: **4 testes aprovados** — alternativa válida, alternativa inválida, sessão concluída e retry idempotente.
- `api-client`: **9 suítes e 48 testes aprovados**, incluindo o novo path/payload.
- Mobile: **31 suítes e 137 testes aprovados**; a integração usa loading, bloqueio de submissão duplicada, erro recuperável e confirmação da API.
- API build e `types` build: aprovados.
- A suíte completa da API foi executada; os testes funcionais passaram, mas a integração de rate limit foi bloqueada pelo ambiente sandbox (`listen EPERM`/servidor HTTP), sem relação reproduzível com a alteração.

Não houve execução E2E autorizada de substituição neste ambiente; permanece dependência de host com Mongo e servidor acessíveis. Builds Expo e validação de dispositivo devem ser repetidos com o ambiente autorizado antes de considerar o lote operacionalmente fechado.

### Riscos residuais

- O catálogo de alternativas está duplicado entre mobile e API e usa nomes, porque o plano ainda não oferece IDs estáveis.
- Não há endpoint para sincronizar progresso intermediário de séries; a substituição persiste a definição da sessão, não confirma séries locais pendentes.
- O histórico não expõe explicitamente a substituição; consumidores que precisarem dessa informação exigirão uma extensão de contrato posterior.
- Falhas de rede antes da resposta são recuperáveis pela mesma `idempotencyKey`, mas a UI depende de reconsulta para resolver o estado visual.
- E2E real, background/reinício em dispositivo e compatibilidade de dados Mongo antigos continuam dependências externas.

### Próximo lote recomendado

Executar E2E autorizado de substituição → retomada → conclusão e validar builds Expo Web/Android/iOS. Depois, consolidar o catálogo/IDs de exercícios em contrato versionado e avaliar a extensão explícita do histórico, sem modificar o cálculo do Recovery.

## Lote 3 implementado — reconciliação de conclusão, check-in e Recovery

### Máquina de estados e ordem das operações

O ciclo passou a ser tratado como uma sequência confirmável:

`sessão ativa → log confirmado → Recovery recalculado → sessão concluída → check-in/Recovery atualizado`

Os estados intermediários relevantes são:

- **ativa/parcial:** a sessão pode conter progresso local, mas não é considerada concluída;
- **log confirmado:** o `workout_log` existe por plano/dia/data e pode ser recuperado por retry;
- **Recovery pendente:** o log existe, mas o recálculo falhou; a API retorna `recoveryPending=true` para permitir retry sem duplicar o log;
- **concluída:** só é marcada após confirmação do log; chamadas repetidas continuam idempotentes;
- **check-in confirmado:** o check-in usa upsert por usuário/data local e dispara novo snapshot;
- **sessão expirada:** não é concluída; o progresso local permanece sujeito às regras de retomada existentes.

O endpoint de conclusão não aceita mais concluir uma sessão ativa sem encontrar o log correspondente. Isso torna uma falha parcial detectável, sem apagar dados nem marcar sucesso silencioso.

### Idempotência e reconciliação

`LogWorkoutUseCase` agora retorna o log já existente em vez de transformar retry em conflito. Em qualquer execução, inclusive retry após timeout, o Recovery é recalculado pelo caso de uso existente. Se o log tiver sido salvo mas o recálculo falhar, a resposta retorna `recoveryPending=true`; repetir a mesma operação não cria outro log e tenta novamente a reconciliação.

`CompleteWorkoutUseCase` verifica ownership, existência do log, data e status antes de completar. Sessão já concluída continua idempotente. Check-in mantém o upsert existente e o `BuildRecoverySnapshotUseCase` mantém o upsert diário do snapshot; portanto, operações repetidas não criam check-ins ou snapshots duplicados.

Não foi habilitada transação MongoDB. O ambiente de desenvolvimento/testes não comprova replica set e não seria seguro alterar a topologia apenas para suportá-la. O fallback seguro é a sequência idempotente com pré-condições e reconsulta: log, Recovery e conclusão podem ser repetidos sem efeitos duplicados.

### Mobile e freshness

`WorkoutCompletionScreen` deixou de consultar Coach, Recovery e nutrição em paralelo com o salvamento. Primeiro confirma log, recálculo e conclusão; só então consulta os read models. Falhas deixam a sessão ativa e exibem o estado de retry já existente. Após log/check-in confirmado, o cache local de Recovery do usuário é invalidado antes da nova leitura, evitando apresentar silenciosamente um snapshot anterior.

O estado local confirmado continua preservado em falha de rede ou sessão expirada. Demo e usuário real continuam isolados pelo owner/mode existentes; nenhum endpoint novo modifica plano ou sessão de outro usuário.

### Testes

- API: novos testes de reconciliação cobrem log já existente, retry sem criação duplicada, Recovery pendente, conclusão sem log, conclusão após log e conclusão repetida idempotente (**5 testes aprovados**).
- Mobile: suíte completa — **32 suítes e 138 testes aprovados**.
- API build e dependências `types`/`api-client`: aprovados.
- Build Expo Web/Android/iOS: aprovado.
- Lint, `git diff --check` e formatação direcionada: aprovados no fechamento deste lote.

Ainda é necessária execução E2E autorizada com Mongo/servidor acessíveis para timeout real, reinício entre etapas e sessão de outro usuário.

### Riscos residuais

- Sem transação Mongo, existe uma janela entre gravação do log e snapshot; ela é detectável e repetível, mas não atômica.
- A conclusão de sessões antigas que já estejam marcadas como concluídas sem log não é reaberta automaticamente; a migração desse estado legado exige diagnóstico separado.
- A confirmação do Recovery depende da disponibilidade do caso de uso e dos dados de origem; o usuário recebe `recoveryPending` explícito em vez de sucesso falso.
- E2E de rede interrompida e validação em dispositivo permanecem dependências externas.

### Próximo lote recomendado

Executar E2E autorizado do ciclo completo com falhas injetadas entre log, Recovery e conclusão. Em seguida, adicionar observabilidade operacional para estados pendentes e avaliar uma reconciliação administrativa segura para dados legados, sem alterar o score do Recovery.

## Lote 4 implementado — estados, mensagens e retry no ciclo diário

### Estados cobertos

- **Home:** o card de treino diferencia loading, treino disponível, vazio (“No workout scheduled today”), erro de carregamento e retry; a sessão expirada continua no fluxo global de autenticação.
- **Treino ativo:** o snapshot local é preservado, o progresso local é identificado como não confirmado, falha de sincronização recebe mensagem própria e `Retry Sync` reconsulta a sessão sem resetar exercício ou séries.
- **Execução:** a confirmação de servidor ocorre por log/conclusão; falha de rede mantém o progresso retomável e retry não executa registro duplicado.
- **Timer:** loading, pausa, retomada, expiração e restauração por `targetEndAt` permanecem determinísticos; valores inválidos retornam ao treino.
- **Conclusão:** processing usa skeleton, falha de gravação distingue conexão/validação/servidor, retry repete operações idempotentes, sessão já concluída é aceita e `recoveryPending` aparece explicitamente.

### Mensagens e analytics

Foi criado o catálogo operacional `daily_workout_*`, sem dados pessoais ou de saúde:

- `daily_workout_error`: etapa e categoria (`network`, `authentication`, `validation`, `server`, `unknown`);
- `daily_workout_retry_selected`: etapa e alvo (`load`, `sync`, `save`, `recovery`);
- `daily_workout_session_expired`: etapa e modo (`real`/`demo`);
- `daily_workout_recovery_pending`: conclusão com Recovery pendente;
- `daily_workout_completion_confirmed`: conclusão confirmada e modo.

O provider é não bloqueante e o filtro compartilhado rejeita dados pessoais, tokens e sinais de saúde. O cache local de Recovery é invalidado após gravação de treino ou check-in, evitando fallback silencioso para snapshot antigo.

### Testes e resultados

- Mobile: **32 suítes e 138 testes aprovados**, incluindo analytics operacional.
- API progress/recovery: **27 suítes e 145 testes aprovados**.
- `api-client`: **9 suítes e 48 testes aprovados**.
- API build, lint de `types`/`api-client`, build Expo Web/Android/iOS, `git diff --check` e formatação direcionada: aprovados.
- E2E autorizado: não executado neste ambiente; depende do host externo autorizado.

### Limitações e riscos residuais

- O registro de séries intermediárias continua local até o log final; não existe endpoint de série individual.
- A sincronização da sessão ativa é uma reconsulta, não uma transação de progresso intermediário.
- Sessões legadas já concluídas sem log exigem diagnóstico separado.
- Background/foreground e sessão expirada em dispositivo real continuam dependências de E2E.

### Próximo lote recomendado

Executar E2E autorizado com rede interrompida em cada estado, validar mensagens em dispositivos reais e adicionar observabilidade de duração/quantidade de retries, sem incluir conteúdo de treino ou dados sensíveis.

## Validação integrada no host autorizado — 2026-08-22

### Ambiente

A execução foi iniciada a partir do workspace local, mas não havia host autorizado configurado ou acessível. Não foram encontradas variáveis de host E2E/Mongo real; os únicos alvos disponíveis são `api:test:e2e`, que inicializam `MongoMemoryServer`, e os testes unitários/integrados locais. As portas `127.0.0.1:3000` e `127.0.0.1:3333` não tinham serviço respondendo.

Consequentemente, nenhum dado real foi criado, alterado ou limpo no MongoDB de produção/homologação, e o ciclo completo no mobile não pôde ser observado em ambiente funcional. Não foi desabilitado teste nem alterado código para contornar `listen EPERM`.

### Resultados executados

| Área                   | Resultado                 | Evidência / classificação                                                                                                                                                                  |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E2E direcionado        | **bloqueado**             | Não existe alvo configurado para host autorizado; os testes locais falham ao iniciar `MongoMemoryServer` com `listen EPERM: operation not permitted 0.0.0.0`. **Infraestrutura/ambiente**. |
| Suíte E2E completa     | **bloqueada**             | 23 suítes e 81 testes falharam na inicialização do Mongo de teste, antes dos cenários funcionais. **Infraestrutura/ambiente**.                                                             |
| API completa           | **parcial**               | 234 suítes/1.424 testes passaram; 1 suíte/3 testes de rate limit falharam pela mesma restrição `listen EPERM`. **Infraestrutura/ambiente**, sem falha funcional reproduzível.              |
| API progress/recovery  | **passou**                | 27 suítes, 145 testes. Cobre reconciliação, idempotência, substituição, check-in e Recovery pendente.                                                                                      |
| Mobile                 | **passou**                | 32 suítes, 138 testes.                                                                                                                                                                     |
| `api-client`           | **passou**                | 9 suítes, 48 testes.                                                                                                                                                                       |
| Builds                 | **passou**                | API, `types`, `api-client` e Expo Web/Android/iOS.                                                                                                                                         |
| Lint                   | **passou**                | `npm run lint`.                                                                                                                                                                            |
| `git diff --check`     | **passou**                | Sem erro de whitespace.                                                                                                                                                                    |
| `npm run format:check` | **falhou fora do escopo** | 43 arquivos gerados em `apps/mobile/ios/Pods`/build e `docs/validation/sprint-2-critical-e2e.md`; a formatação direcionada deste documento permanece válida.                               |

### Matriz de cobertura integrada

Os cenários abaixo permanecem **não executados no host autorizado**, pois dependem de backend, MongoDB e dispositivo/cliente funcional: sessão nova; retomada após reinício; background/foreground; timer pausado/restaurado; registro; substituição persistente; erro de rede e retry; sessão expirada; conclusão simples/duplicada; check-in; Recovery recalculado/pendente; reconsulta após falha; usuário sem treino/dados; isolamento entre usuários; demo; logout; invalidação de cache e verificação de analytics ponta a ponta.

Os contratos e efeitos esperados possuem cobertura local direcionada, mas isso não comprova persistência real, autorização entre usuários, comportamento de rede ou eventos coletados por provider externo. Não há métricas reais disponíveis neste workspace.

### Falhas, correções e riscos residuais

Nenhuma correção funcional foi aplicada: não houve falha funcional reproduzível, e as falhas observadas ocorreram antes da execução do ciclo por restrição de listener/Mongo. O risco principal continua sendo a ausência de evidência operacional do ciclo completo em ambiente autorizado, incluindo persistência Mongo, retry após timeout, sessão expirada, isolamento real/demo e consistência observável entre Home, sessão, histórico, check-in e Recovery.

### Próximo lote recomendado

Disponibilizar um host autorizado com API, MongoDB real, credenciais de teste não produtivas e cliente Expo configurado. Reexecutar primeiro o E2E direcionado do ciclo diário com inspeção de documentos Mongo antes/depois; depois executar a suíte E2E completa e fechar a matriz apenas quando os cenários acima passarem sem `listen EPERM` ou dependências de memória.

## Fechamento formal da Sprint 6

### Status final

**Parcialmente concluída e bloqueada para certificação E2E integrada.**

A cobertura local confirma os contratos, estados, idempotência e reconciliação implementados. Ela não substitui a certificação em host autorizado com API, MongoDB real e jornada mobile autenticada.

### Itens concluídos

- persistência local versionada da sessão ativa;
- retomada após reinício;
- restauração determinística do timer;
- substituição persistente de exercícios;
- idempotência de registros e conclusão;
- reconciliação local com o estado conhecido do backend;
- estados de loading, erro, vazio, sessão expirada e retry;
- integração de conclusão, check-in e Recovery;
- testes unitários e de integração disponíveis;
- builds de API, packages e Expo Web/Android/iOS;
- lint e `git diff --check`.

### Itens não certificados

Permanecem sem certificação integrada:

- persistência real em MongoDB;
- isolamento entre usuários em E2E;
- retry real após falha de rede;
- timer em runtime integrado, incluindo background/foreground;
- substituição em ambiente real;
- check-in e Recovery ponta a ponta;
- analytics integrado a um provider;
- jornada mobile autenticada completa.

### Evidências finais

| Validação                   |                                                                                 Resultado |
| --------------------------- | ----------------------------------------------------------------------------------------: |
| API                         | 234 suítes / 1.424 testes aprovados; 3 testes de rate limit bloqueados por `listen EPERM` |
| API progress/recovery       |                                                          27 suítes / 145 testes aprovados |
| Mobile                      |                                                          32 suítes / 138 testes aprovados |
| `api-client`                |                                                            9 suítes / 48 testes aprovados |
| Builds API, packages e Expo |                                                                                 aprovados |
| Lint                        |                                                                                  aprovado |
| `git diff --check`          |                                                                                  aprovado |
| E2E integrado               |                         bloqueado por `listen EPERM` e ausência de MongoDB real acessível |

Não foi afirmada persistência real nem qualquer métrica de produto. A falha E2E foi classificada como infraestrutura/ambiente; nenhuma falha funcional foi declarada sem reprodução.

### Pré-condições para reexecução

1. Host autorizado acessível, com API executando e MongoDB real disponível.
2. Credenciais de teste não produtivas e dados de seed/provisionamento autorizados.
3. Cliente Expo configurado para o host autorizado.
4. Capacidade de simular perda de rede, reinício e background/foreground.
5. Acesso somente leitura aos documentos Mongo necessários para verificar sessão, substituição, logs, check-ins e snapshots de Recovery.
6. Provider de analytics ou coletor de teste autorizado para confirmar eventos e deduplicação.

### Recomendação para a Sprint 7

Priorizar a certificação E2E integrada do ciclo diário em ambiente autorizado, começando pelo fluxo feliz e seguindo pelos cenários de falha, retry, isolamento e logout. Após a certificação, consolidar observabilidade operacional de pendências e tempos de reconciliação, sem ampliar contratos ou regras de Recovery sem evidência.

## Regularização das pendências — pré-flight adicional

### Resultado do pré-flight

O pré-flight foi executado em **22/08/2026**, no workspace local, sem iniciar cenários funcionais e sem alterar código.

| Verificação                      | Resultado                                                                          | Classificação                             |
| -------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Node.js / npm                    | Node `v24.15.0`, npm `11.12.1` disponíveis                                         | aprovado                                  |
| Espaço em disco                  | 19 GiB livres, 91% do volume utilizado                                             | aprovado com atenção operacional          |
| Portas 3000, 3333 e 27017        | sem listeners detectados                                                           | informativo; não comprova host autorizado |
| Bind `127.0.0.1`                 | `listen EPERM: operation not permitted 127.0.0.1`                                  | bloqueio de infraestrutura                |
| Bind `0.0.0.0`                   | `listen EPERM: operation not permitted 0.0.0.0`                                    | bloqueio de infraestrutura                |
| `mongod` / `mongosh`             | executáveis não encontrados                                                        | dependência externa ausente               |
| MongoMemoryServer                | configuração existe nos E2E, mas exige listener e não pode iniciar nesta sandbox   | bloqueio de infraestrutura                |
| Variáveis de host E2E/Mongo real | não configuradas; somente chaves locais foram detectadas, sem exposição de valores | dependência externa ausente               |
| Processos órfãos                 | inspeção `ps` negada pela sandbox (`operation not permitted`)                      | limitação ambiental                       |
| Setup/teardown Jest              | `apps/api/jest.e2e.config.js` e hooks `beforeAll`/`afterAll` identificados nos E2E | verificado estaticamente                  |

### Decisão de execução

Como a permissão de bind local e o backend/Mongo autorizado não estão disponíveis, a execução funcional foi interrompida conforme o procedimento. Não foram criados mocks, não foi substituída a persistência, não foram desabilitados testes e nenhuma alteração foi feita para contornar `listen EPERM`, falha do MongoMemoryServer, conflito de porta ou ausência de host.

Não há nova evidência integrada de persistência real, isolamento entre usuários, retry de rede, timer em runtime, substituição, conclusão, check-in, Recovery, analytics ou jornada mobile autenticada. A cobertura local e os resultados anteriores permanecem válidos, mas não reclassificam a Sprint 6 como concluída.

### Requisitos externos pendentes para reexecução

É necessário disponibilizar, fora da sandbox restritiva:

- host autorizado com permissão para abrir listeners em `127.0.0.1` e `0.0.0.0`;
- API e cliente Expo configurados para esse host;
- MongoDB real de teste isolado ou execução funcional do MongoMemoryServer;
- credenciais de teste não produtivas e dados descartáveis;
- permissões para processos temporários e inspeção de teardown;
- pelo menos 10 GiB livres após validar o tamanho dos binários e dados;
- mecanismo autorizado para simular rede, reinício e background/foreground;
- coletor de analytics de teste, caso a validação de eventos seja exigida.

### Status mantido

**Sprint 6: parcialmente concluída e bloqueada para E2E integrado.** A Sprint 7 não deve ser liberada como substituta desta certificação; a reexecução deve começar pelo mesmo pré-flight e só avançar para o ciclo diário após todos os requisitos externos estarem verdes.

## Tentativa adicional de certificação E2E — 2026-08-22

### Pré-flight executado

Comandos executados sem alteração de código:

```bash
node --version
npm --version
df -h .
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3333 -sTCP:LISTEN
lsof -nP -iTCP:27017 -sTCP:LISTEN
```

Resultado: Node `v24.15.0`, npm `11.12.1`, 19 GiB livres e nenhuma porta conflitante detectada. O espaço atende ao mínimo operacional indicado, mas não compensa a ausência de permissão de bind.

Teste mínimo de listener:

```bash
node -e "const net=require('net'); /* listener em 127.0.0.1 e 0.0.0.0 */"
```

Resultado objetivo:

- `127.0.0.1`: `listen EPERM: operation not permitted 127.0.0.1`;
- `0.0.0.0`: `listen EPERM: operation not permitted 0.0.0.0`.

Teste real de ciclo do MongoMemoryServer:

```bash
node -e "const {MongoMemoryServer}=require('mongodb-memory-server'); /* create, report URI, stop */"
```

Resultado: falha antes da inicialização, com `listen EPERM: operation not permitted 0.0.0.0`; não houve Mongo efêmero disponível nem operação de persistência executada.

As variáveis de ambiente detectadas foram apenas chaves locais (`EXPO_PUBLIC_API_URL`, `JWT_SECRET`, `MONGODB_URI`, `PORT`), sem host autorizado configurado e sem exposição de valores. Não foi possível validar processos conflitantes além das portas, pois a sandbox restringe inspeção de processos.

### Decisão e impacto

O pré-flight falhou. A execução foi interrompida antes do E2E direcionado e da suíte completa, conforme as regras desta certificação. Não foram executados mocks, não foi substituído o MongoDB, não foram alterados timeouts e nenhum código foi modificado para contornar a restrição.

Assim, permanecem não certificados nesta tentativa: persistência real, retomada integrada, timer em runtime, registro de exercícios, substituição persistente, retry de rede, conclusão idempotente, check-in, Recovery, isolamento entre usuários, modo demo, analytics e jornada mobile autenticada.

Os comandos de E2E e validações complementares não foram executados após o bloqueio, pois dependem do listener e do banco funcional. O requisito externo pendente é um host autorizado fora da sandbox, com permissão de bind em `127.0.0.1` ou `0.0.0.0` e MongoDB real efêmero ou de teste isolado acessível.

### Status após a tentativa

**Sprint 6 permanece parcialmente concluída e bloqueada para certificação E2E integrada.** Nenhuma falha funcional foi reproduzida; o bloqueio é de infraestrutura/ambiente.

## Revalidação do pré-flight — tentativa adicional — 2026-08-22

O pré-flight obrigatório foi repetido sem alterar código:

- Node.js `v24.15.0` e npm `11.12.1` disponíveis;
- 19 GiB livres no volume;
- portas 3000, 3333 e 27017 sem listeners detectados;
- listener mínimo em `127.0.0.1`: **falhou**, `EPERM`;
- listener mínimo em `0.0.0.0`: **falhou**, `EPERM`;
- MongoMemoryServer: **falhou antes de iniciar**, `listen EPERM: operation not permitted 0.0.0.0`;
- configuração encontrada apenas com chaves locais, sem host autorizado ou segredo exposto;
- configuração E2E usa `MongoMemoryServer` por `beforeAll`/`afterAll`.

Como o pré-flight falhou, os comandos E2E direcionado, E2E completo e validações complementares não foram executados. Não houve banco real, mock substitutivo, alteração de timeout, alteração de código ou tentativa contra produção. O requisito externo permanece: host autorizado fora da sandbox com permissão de bind e MongoDB real efêmero/de teste acessível.

**Status inalterado: Sprint 6 parcialmente concluída e bloqueada para E2E integrado.**

## Reexecução E2E após correções funcionais — 2026-08-22

### Pré-flight e decisão

O pré-flight foi repetido antes das suítes corrigidas:

- Node.js `v24.15.0`, npm `11.12.1` e dependências disponíveis;
- 19 GiB livres;
- portas 3000, 3333 e 27017 sem listeners detectados;
- bind mínimo em `127.0.0.1`: **falhou** com `listen EPERM`;
- bind mínimo em `0.0.0.0`: **falhou** com `listen EPERM`;
- ciclo real do MongoMemoryServer: **falhou antes de iniciar** com `listen EPERM: operation not permitted 0.0.0.0`.

Conforme o procedimento, a execução foi interrompida antes dos testes. Não foram executados:

- E2E direcionado de `workout-completion.e2e-spec.ts` e `progress-log-workout.e2e-spec.ts`;
- suíte E2E completa;
- validações complementares dependentes desta tentativa.

Não houve uso de mocks, alteração de código, testes, timeouts ou configuração para contornar o ambiente. Persistência real, concorrência, isolamento, idempotência, sessão expirada, duplicidade e `recoveryPending` continuam aguardando confirmação no host autorizado.

### Status atualizado

**Sprint 6 permanece parcialmente concluída e bloqueada para E2E integrado.** O bloqueio desta tentativa é exclusivamente de infraestrutura/ambiente; não houve nova falha funcional reproduzível.

## Correção das falhas E2E de conclusão e registro — 2026-08-22

### Causas identificadas e correções

| Falha                                        | Causa                                                                                                                                                    | Correção                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segunda conclusão retornava `409`            | A transição de `active` para `completed` não era condicional/idempotente no repositório; uma repetição podia receber `null` após a primeira confirmação. | `MongooseWorkoutSessionRepository.complete` agora atualiza somente sessão ativa e, se já não houver transição, reconsulta a mesma sessão concluída. O caso de uso continua retornando `200` somente para a mesma sessão pertencente ao usuário e já concluída.                    |
| Sessão expirada retornava `409`              | A validação de log pendente ocorria antes da validação da data da sessão.                                                                                | `CompleteWorkoutUseCase` valida expiração antes do log. Sessão ativa fora do dia retorna `404` com `WORKOUT_SESSION_EXPIRED`; sessão inexistente ou de outro usuário continua `404` com `WORKOUT_SESSION_NOT_FOUND`.                                                              |
| Resposta de log tinha `recoveryPending`      | O campo foi adicionado intencionalmente no lote de reconciliação para distinguir log confirmado de Recovery pendente.                                    | Contrato confirmado: `LogWorkoutResponse` e `LogWorkoutResponseDto` expõem `recoveryPending: boolean`. O teste E2E de sucesso agora exige explicitamente `recoveryPending: false`; falha de recálculo continua retornando `true` sem apagar o log.                                |
| Segunda criação do mesmo log retornava `201` | `LogWorkoutUseCase` tratava qualquer log existente como retry idempotente e devolvia o registro anterior.                                                | O contrato existente de criação permanece `409` com `WORKOUT_LOG_ALREADY_EXISTS`. A verificação prévia rejeita duplicidade; o índice Mongo único `{trainingPlanId, workoutDayIndex, date}` mantém proteção contra corrida. Recovery não é recalculado para uma criação rejeitada. |

### Arquivos alterados

- `apps/api/src/modules/progress/application/use-cases/complete-workout/complete-workout.use-case.ts`;
- `apps/api/src/modules/progress/infrastructure/mongoose/mongoose-workout-session.repository.ts`;
- `apps/api/src/modules/progress/application/use-cases/log-workout/log-workout.use-case.ts`;
- `apps/api/src/modules/progress/application/use-cases/complete-workout/complete-workout.use-case.spec.ts`;
- `apps/api/src/modules/progress/application/use-cases/log-workout/log-workout.reconciliation.spec.ts`;
- `apps/api/test/e2e/workout-completion.e2e-spec.ts`;
- `apps/api/test/e2e/progress-log-workout.e2e-spec.ts`.

O fixture de conclusão idempotente passou a criar o log antes de concluir, respeitando a pré-condição funcional `log confirmado → conclusão`. Não houve alteração de ownership, regras de Recovery ou uso de mocks.

### Testes antes/depois

- Antes: 21 suítes E2E aprovadas, 2 falhas e 4 testes falhos no host autorizado reportado.
- Depois, testes direcionados locais: **6 suítes / 36 testes aprovados**, incluindo duplicidade de log, `recoveryPending`, conclusão repetida e expiração antes do log.
- `api-client`: **9 suítes / 48 testes aprovados**.
- Mobile: **32 suítes / 138 testes aprovados**.
- Builds API, `types` e `api-client`: aprovados.
- Lint, `git diff --check` e formatação direcionada: aprovados.
- E2E direcionado após a correção: não certificado nesta sessão; ambas as suítes falharam no `beforeAll` porque `MongoMemoryServer` não conseguiu iniciar por `listen EPERM: operation not permitted 0.0.0.0`.
- Suíte API completa após a correção: 234 suítes/1.424 testes aprovados; 3 testes de rate limit continuam bloqueados pelo mesmo `listen EPERM`, classificado como infraestrutura/ambiente.

### Contrato e riscos residuais

O contrato final permanece: conclusão repetida da mesma sessão concluída retorna `200` com o mesmo resultado; sessão expirada retorna `404/WORKOUT_SESSION_EXPIRED`; log duplicado retorna `409/WORKOUT_LOG_ALREADY_EXISTS`; `recoveryPending` é obrigatório na resposta e representa somente a pendência do recálculo após o log ter sido salvo.

A confirmação em Mongo real das duas suítes corrigidas, incluindo isolamento entre usuários e concorrência de conclusão/log, ainda depende de reexecução no host autorizado que permita bind e MongoMemoryServer. Nenhuma falha funcional adicional foi afirmada sem reprodução.
