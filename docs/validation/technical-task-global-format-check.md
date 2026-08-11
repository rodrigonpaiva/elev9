# Tarefa técnica — Corrigir o `format:check` global

**Status:** Decisão arquitetural aplicada; dívida de formatação pendente  
**Data do diagnóstico:** 2026-08-10  
**Prioridade sugerida:** Média/alta, por bloquear a etapa de formatação da CI  
**Estimativa:** 2 a 4 dias de engenharia, em etapas pequenas

## Contexto

O comando global de formatação do Elev9 falha em aproximadamente 420 arquivos. A divergência é preexistente e mistura código de produto, documentação, código legado e artefatos gerados por Next.js, Expo/React Native, Android e TypeScript.

Esta tarefa foi separada da Sprint 1 para evitar uma reformatação em massa, ruído no histórico e risco de introduzir alterações não relacionadas à saúde da base.

## Reprodução

Comando oficial:

```bash
npm run format:check
```

Comando para obter apenas a lista de arquivos divergentes:

```bash
npm exec prettier -- --list-different . --ignore-path .prettierignore
```

Resultado observado em 2026-08-10:

- **419 arquivos divergentes**;
- o `format:check` retorna código de saída diferente de zero;
- o CI executa esse mesmo script em `.github/workflows/ci.yml`.

## Configuração analisada

### Prettier

- versão declarada: `^3.8.3`;
- configuração: `.prettierrc`;
- regra explícita: `singleQuote: true`;
- script de escrita: `prettier --write . --ignore-path .prettierignore`;
- script de verificação: `prettier --check . --ignore-path .prettierignore`.

### `.prettierignore`

Antes desta tarefa, ignorava apenas:

```text
/dist
/coverage
/.nx/cache
/.nx/workspace-data
/.next
/scripts/docker-smoke.sh
```

O padrão `/.next` cobre somente `.next` na raiz. Ele não cobre `apps/web/.next`.

Padrões adicionados nesta tarefa:

```text
/android/build/
/apps/mobile/android/
/apps/web/.next/
```

Esses padrões correspondem exclusivamente a artefatos gerados não rastreados identificados no diagnóstico. Os 29 arquivos rastreados em `packages/types/src` não foram adicionados ao ignore.

### `.gitignore`

O Git ignora, entre outros:

- `dist/`, `build/`, `.nx/`, `coverage/`;
- `apps/mobile/android/` e `apps/mobile/ios/`;
- `apps/mobile/.expo/` e `apps/mobile/web-build/`;
- `.next` e `out` em níveis inferiores.

A diferença importante é que o script do Prettier informa explicitamente `--ignore-path .prettierignore`; portanto, o `.gitignore` não é usado como filtro do formatter.

### CI

O workflow `.github/workflows/ci.yml` executa `npm run format:check` antes de lint, testes e builds. Consequentemente, qualquer divergência global mantém a validação da branch vermelha, mesmo quando testes e builds passam.

## Classificação dos 419 arquivos

| Categoria                                   | Quantidade | Observação                                                                                                                                 |
| ------------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Artefatos gerados indevidamente verificados |        285 | Android build/CMake, Expo/Android e Next `.next`, além de saídas JS/declaration rastreadas em `packages/types/src`                         |
| Código-fonte e testes                       |         98 | API, testes E2E, mobile e `api-client`                                                                                                     |
| Documentação                                |         36 | Arquivos sob `docs/`                                                                                                                       |
| Configurações                               |          0 | Nenhum `package.json`, config Nx, tsconfig, Jest, Prettier ou configuração CI apareceu na lista atual                                      |
| Código legado identificável por diretório   |          0 | O repositório não possui uma pasta ou marcador formal de legado; parte dos 98 arquivos de código representa dívida histórica de formatação |
| **Total**                                   |    **419** |                                                                                                                                            |

Detalhamento dos arquivos gerados:

| Origem                                  | Quantidade | Situação no Git              |
| --------------------------------------- | ---------: | ---------------------------- |
| `android/build/`                        |          2 | Ignorado pelo Git            |
| `apps/mobile/android/`                  |        164 | Ignorado pelo Git            |
| `apps/web/.next/`                       |         90 | Ignorado pelo Git            |
| `packages/types/src/**/*.js` e `*.d.ts` |         29 | Rastreado pelo Git           |
| **Total**                               |    **285** | 256 ignorados, 29 rastreados |

Os 29 arquivos divergentes em `packages/types/src` eram especialmente relevantes: o `tsconfig` declara `outDir` em `dist/packages/types` e `emitDeclarationOnly`, mas existiam saídas `.js`/`.d.ts` dentro de `src`. Também havia 15 `.js.map` rastreados, que não apareciam como divergência do Prettier, totalizando 45 artefatos derivados rastreados.

## Diagnóstico e causa provável

Há duas causas distintas:

1. **Escopo excessivo do formatter:** o Prettier percorre diretórios ignorados pelo Git, como `apps/mobile/android/` e `apps/web/.next/`, porque `.prettierignore` não replica esses padrões.

2. **Dívida de formatação do código/documentação:** mesmo removendo os artefatos, ainda restam 134 divergências em código/testes e documentação, aproximadamente:
   - 98 arquivos de código e testes;
   - 36 arquivos de documentação.

Não foi feita formatação em massa. A decisão dos artefatos rastreados foi aplicada somente após validar o processo de geração e os consumidores.

## Decisão arquitetural

Os arquivos derivados em `packages/types/src` **não devem continuar versionados**.

Evidências:

- `packages/types/tsconfig.json` inclui somente `src/**/*.ts`;
- o compilador emite declarações para `dist/packages/types` com `emitDeclarationOnly: true`;
- o `package.json` de `@elev9/types` aponta `main` e `types` para `src/index.ts`;
- aliases do workspace, API e mobile apontam para os arquivos `.ts` em `packages/types/src`;
- o build da API consome as declarações geradas em `dist/packages/types/src`;
- `packages/api-client` e `apps/mobile` consomem os contratos-fonte TypeScript;
- o build oficial de `types` passou e não recriou saídas dentro de `packages/types/src`;
- os artefatos foram introduzidos historicamente junto de compilações/formatções, não como fonte manual de contrato.

### Impacto

Remover esses derivados do controle de versão não altera contratos públicos, imports ou runtime dos consumidores. O build continua responsável por gerar suas declarações em `dist`, enquanto desenvolvimento, Jest e Expo continuam usando os `.ts` fonte.

Foram removidos do controle de versão, sem alterar os fontes:

- 15 arquivos `.js`;
- 15 arquivos `.js.map`;
- 15 arquivos `.d.ts`.

Os padrões abaixo foram adicionados ao `.gitignore` e ao `.prettierignore` para impedir o retorno desses artefatos:

```text
packages/types/src/**/*.js
packages/types/src/**/*.js.map
packages/types/src/**/*.d.ts
```

### Plano de migração aplicado

1. Validar aliases, `package.json`, `tsconfig`, CI e consumidores.
2. Executar `npm exec nx build types` antes da remoção.
3. Remover somente os 45 artefatos rastreados identificados.
4. Adicionar regras específicas de ignore para saídas geradas no source package.
5. Reexecutar build de `types`, consumidores, testes e `format:check`.

Não foram removidos arquivos `.ts`, specs ou contratos-fonte.

## Solução recomendada

### Fase 1 — Corrigir o escopo

Adicionar ao `.prettierignore` somente artefatos comprovadamente gerados e já ignorados pelo Git:

```text
/android/build/
/apps/mobile/android/
/apps/web/.next/
```

Não foram adicionados `apps/mobile/ios`, `.expo`, `web-build` ou `out`, pois não apareceram como divergências no diagnóstico atual e não são necessários para este ajuste. As saídas de `packages/types/src` agora têm regras específicas de ignore porque a decisão arquitetural foi validada e aplicada.

### Fase 2 — Confirmar redução do escopo

Reexecutar:

```bash
npm exec prettier -- --list-different . --ignore-path .prettierignore
npm run format:check
```

Resultado após os primeiros ajustes de escopo: os 256 artefatos não rastreados deixaram de aparecer e permaneceram 163 divergências. Após remover os 45 derivados rastreados de `packages/types/src`, permanecem **134 divergências**: 98 arquivos de código/testes e 36 documentos.

Comandos executados nesta implementação:

```bash
npm run format:check
npm exec prettier -- --list-different . --ignore-path .prettierignore
npm run lint
npm exec nx build types --skip-nx-cache
npm run build
npm exec nx build mobile --skip-nx-cache
npm exec nx test api --skip-nx-cache
npm exec nx test mobile --skip-nx-cache
```

Resultados:

- baseline: **419** arquivos;
- após o ajuste de diretórios gerados: **163** arquivos;
- após remover os derivados de `packages/types/src`: **134** arquivos;
- redução total: **285** artefatos gerados;
- `npm run lint`: aprovado para `types` e `api-client`;
- `npm exec nx build types`: aprovado;
- `npm run build`: aprovado para a cadeia workspace (incluindo API, `api-client`, UI e web);
- `npm exec nx build mobile --skip-nx-cache`: aprovado na segunda execução; a primeira tentativa foi interrompida por falta de espaço em disco durante a geração Hermes para iOS;
- `npm exec nx test api --skip-nx-cache`: 219 suítes e 1.368 testes aprovados;
- `npm exec nx test mobile --skip-nx-cache`: 22 suítes e 104 testes aprovados;
- `npm run format:check`: continua com exit code `1`; a lista final contém 134 divergências, somente em código/testes e documentação.

### Fase 3 — Corrigir código e documentação incrementalmente

Ordenação recomendada:

1. configurações e entrypoints críticos;
2. `apps/api/src` por bounded context;
3. `apps/api/test` e E2E;
4. `packages/api-client` e `packages/types` fonte;
5. `apps/mobile/src` por feature;
6. documentação em lotes temáticos.

Cada lote deve ser formatado e validado separadamente, com testes/builds Nx dos projetos afetados. A correção não deve misturar reestruturação, renomeação ou mudança comportamental.

### Lote incremental 1 — `packages/api-client`

Foi selecionado o menor pacote coerente disponível, composto por dois arquivos divergentes:

- `packages/api-client/src/recovery-api.ts`;
- `packages/api-client/src/recovery-api.spec.ts`.

O Prettier oficial foi executado somente nesses dois arquivos. O diff contém apenas quebra de linha, indentação e expansão de chamadas longas; não houve mudança de regra de negócio, contrato, import, snapshot ou comportamento.

Validações executadas:

```bash
npm run format:check
npm exec nx lint api-client --skip-nx-cache
npm exec nx build api-client --skip-nx-cache
npm exec jest packages/api-client/src/recovery-api.spec.ts --runInBand --config jest.config.cjs
```

Resultados:

- `npm exec nx lint api-client --skip-nx-cache`: aprovado;
- `npm exec nx build api-client --skip-nx-cache`: aprovado;
- `npm run format:check`: continua falhando globalmente pela dívida restante, mas a lista caiu de 134 para **132 arquivos**;
- o `api-client` não possui target Nx de testes nem configuração Jest própria. A execução direta não conseguiu aplicar transformação TypeScript; isso é uma pendência de configuração de testes do pacote, não uma falha introduzida pelo lote.

Classificação restante após o lote:

| Grupo         | Quantidade |
| ------------- | ---------: |
| `apps/api`    |         56 |
| `apps/mobile` |         40 |
| Documentação  |         36 |
| **Total**     |    **132** |

Próximo lote recomendado: um bounded context isolado de `apps/api`, preferencialmente o conjunto de arquivos de recuperação, mantendo seus testes e implementação no mesmo diff.

### Lote incremental 2 — bounded context de recuperação da API

O lote foi delimitado exclusivamente aos nove arquivos divergentes dentro de `apps/api/src/modules/recovery`:

- `application/read-models/recovery-read-model.types.ts`;
- `application/services/recovery-factor-breakdown.policy.ts`;
- `application/services/recovery-observability.service.spec.ts`;
- `application/services/recovery-observability.service.ts`;
- `application/services/recovery-read-model.mapper.ts`;
- `application/services/recovery-trend.policy.ts`;
- `application/use-cases/get-current-recovery-read-model/get-current-recovery-read-model.use-case.ts`;
- `application/use-cases/get-recovery-history-read-model/get-recovery-history-read-model.use-case.ts`;
- `presentation/http/recovery.controller.ts`.

Os E2E divergentes de AI e progress encontrados em `apps/api/test` não foram incluídos, pois não pertencem diretamente a recovery. Também não havia configuração exclusiva do bounded context na lista.

O Prettier foi executado somente nos nove arquivos acima. O diff contém exclusivamente reflow de tipos, chamadas longas, condicionais, métodos e objetos; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx lint api --skip-nx-cache
npm exec eslint -- apps/api/src/modules/recovery --ext .ts --config .eslintrc.cjs
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/recovery
npm exec nx build api --skip-nx-cache
npm run format:check
```

Resultados:

- `npm exec nx lint api --skip-nx-cache`: não executável; o workspace não possui target `api:lint` (`Cannot find configuration for task api:lint`);
- ESLint restrito aos nove arquivos do lote: aprovado;
- ESLint de todo `apps/api/src/modules/recovery`: encontrou quatro variáveis não utilizadas em arquivos fora do lote — `build-recovery-snapshot.use-case.ts`, `get-today-recovery.use-case.spec.ts` e `mongoose-recovery-snapshot.repository.spec.ts`; não foram corrigidas por estarem fora do escopo de formatação selecionado;
- testes direcionados: 12 suítes e 64 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- `npm run format:check`: continua com exit code `1`, mas caiu de 132 para **123 divergências**.

Classificação restante após o lote:

| Grupo         | Quantidade |
| ------------- | ---------: |
| `apps/api`    |         47 |
| `apps/mobile` |         40 |
| Documentação  |         36 |
| **Total**     |    **123** |

Próximo lote recomendado: o conjunto de divergências de `apps/api` no bounded context de nutrição, mantendo implementação e specs diretamente relacionados no mesmo lote.

### Lote incremental 3 — bounded context de nutrição da API

O lote foi delimitado exclusivamente aos 12 arquivos divergentes dentro de `apps/api/src/modules/nutrition`:

- `application/ports/nutrition-boundaries.spec.ts`;
- `application/ports/nutrition-consumer.ports.ts`;
- `application/services/nutrition-deterministic-engine.service.spec.ts`;
- `application/services/nutrition-deterministic-engine.service.ts`;
- `application/services/nutrition-history-projection.service.spec.ts`;
- `application/services/nutrition-history-projection.service.ts`;
- `application/services/nutrition-history-query.service.spec.ts`;
- `application/services/nutrition-history-query.service.ts`;
- `application/services/nutrition-observability.service.ts`;
- `application/use-cases/get-today-nutrition/get-today-nutrition.use-case.spec.ts`;
- `application/use-cases/get-today-nutrition/get-today-nutrition.use-case.ts`;
- `infrastructure/mongoose/mongoose-nutrition-plan.repository.ts`.

O Prettier foi executado somente nesses arquivos. O diff contém apenas reflow de objetos, tipos, chamadas, condicionais e expressões longas; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/nutrition
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- <arquivos do lote> --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados de nutrição: 22 suítes e 140 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint restrito aos 12 arquivos do lote: encontrou um erro preexistente de variável não utilizada em `get-today-nutrition.use-case.spec.ts` (`GET_TODAY_NUTRITION_ERROR_CODES`); não foi corrigido porque a tarefa é exclusivamente de formatação;
- `npm run format:check`: continua com exit code `1`, mas caiu de 123 para **111 divergências**.

Classificação restante após o lote:

| Grupo             | Quantidade |
| ----------------- | ---------: |
| `apps/api/src`    |         33 |
| `apps/api/test`   |          2 |
| `apps/mobile/src` |         40 |
| Documentação      |         36 |
| **Total**         |    **111** |

Próximo lote recomendado: o bounded context de notificações em `apps/api`, atualmente com uma divergência diretamente localizada no módulo.

### Lote incremental 4 — módulo de notificações da API

O módulo foi inspecionado em `apps/api/src/modules/notifications`. Apenas um arquivo ainda apresentava divergência de formatação:

- `application/use-cases/build-notification-decision/build-notification-decision.use-case.ts`.

O Prettier foi executado somente nesse arquivo. O diff contém exclusivamente a expansão multilinha de uma assinatura de tipo e de uma chamada longa; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/notifications
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- apps/api/src/modules/notifications/application/use-cases/build-notification-decision/build-notification-decision.use-case.ts --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 13 suítes e 118 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint do arquivo do lote: aprovado;
- `npm run format:check`: continua com exit code `1`, mas caiu de 111 para **110 divergências**.

Não foram identificadas falhas funcionais ou de infraestrutura neste lote. As mensagens de observabilidade e o aviso de worker encerrado na suíte completa são comportamentos já presentes nos testes e não causaram falha.

Próximo lote recomendado: o bounded context de treinamento em `apps/api`, atualmente com uma divergência diretamente localizada no módulo.

### Lote incremental 5 — módulo de treinamento da API

O módulo foi localizado em `apps/api/src/modules/training`. Apenas um arquivo ainda apresentava divergência:

- `application/use-cases/build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case.ts`.

O Prettier foi executado somente nesse arquivo. O diff contém exclusivamente a expansão multilinha de uma assinatura de tipo, de uma chamada, de uma expressão longa e a remoção de linha em branco final; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/training
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- apps/api/src/modules/training/application/use-cases/build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case.ts --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 11 suítes e 65 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint do arquivo do lote: aprovado;
- `npm run format:check`: continua com exit code `1`, mas caiu de 110 para **109 divergências**.

Não foram identificadas falhas funcionais, de lint, teste, build, configuração ou infraestrutura neste lote. Os avisos operacionais observados na suíte completa não causaram falha.

Próximo lote recomendado: o módulo de dashboard em `apps/api`, atualmente com duas divergências diretamente localizadas no módulo.

### Lote incremental 6 — módulo de dashboard da API

As duas divergências foram localizadas exclusivamente em `apps/api/src/modules/dashboard`:

- `application/services/dashboard-adaptive-signals/dashboard-adaptive-signals.service.ts`;
- `application/use-cases/get-home-dashboard/get-home-dashboard.use-case.spec.ts`.

O Prettier foi executado somente nesses dois arquivos. O diff contém apenas expansão de expressões ternárias no serviço e compactação de strings multilinha no spec; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/dashboard
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- <os 2 arquivos do lote> --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 3 suítes e 30 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint dos dois arquivos: aprovado;
- `npm run format:check`: continua com exit code `1`, mas caiu de 109 para **107 divergências**;
- nenhuma divergência permanece em `apps/api/src/modules/dashboard`.

Não foram identificadas falhas funcionais, de lint, teste, build, configuração ou infraestrutura neste lote. Os avisos operacionais da suíte completa não causaram falha.

Próximo lote recomendado: o módulo de goals em `apps/api`, atualmente com duas divergências diretamente localizadas no bounded context.

### Lote incremental 7 — módulo de goals da API

As duas divergências foram localizadas exclusivamente em `apps/api/src/modules/goals`:

- `application/use-cases/build-goal-progress-snapshot/build-goal-progress-snapshot.use-case.spec.ts`;
- `application/use-cases/build-goal-progress-snapshot/build-goal-progress-snapshot.use-case.ts`.

O Prettier foi executado somente nesses dois arquivos. O diff contém apenas a expansão multilinha dos tipos de entrada do port de nutrição; não houve alteração de lógica, contratos, imports, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/goals
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- <os 2 arquivos do lote> --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 15 suítes e 93 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint: um erro preexistente em `build-goal-progress-snapshot.use-case.spec.ts` (`FitnessProfile` importado e não utilizado); não corrigido por não ser uma alteração de formatação;
- `npm run format:check`: continua com exit code `1`, mas caiu de 107 para **105 divergências**;
- nenhuma divergência permanece em `apps/api/src/modules/goals`.

Classificação da falha de ESLint: **lint preexistente**, não falha de formatação, teste, build, configuração ou infraestrutura.

Próximo lote recomendado: o bounded context de AI em `apps/api`, atualmente com 27 divergências diretamente localizadas no módulo.

### Lote incremental 8 — AI / `application/services/agent`

As 27 divergências do bounded context de AI foram agrupadas por responsabilidade:

- `ai.module.ts`: 1 arquivo;
- `application/services/agent`: 2 arquivos;
- `application/services/chat`: 1 arquivo;
- `application/services/coach-intelligence`: 11 arquivos;
- `application/services/context-builder`: 3 arquivos;
- `application/services/experts`: 4 arquivos;
- `application/use-cases`: 5 arquivos.

O primeiro sublote selecionado foi `application/services/agent`, com:

- `application/services/agent/agent-runtime.service.ts`;
- `application/services/agent/execution/agent-execution.engine.service.ts`.

O Prettier foi executado somente nesses dois arquivos. O diff contém compactação de um ternário e correção de indentação de um bloco; não houve alteração de lógica, contratos, imports, prompts, configurações de LLM, snapshots ou comportamento.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/ai/application/services/agent
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- <os 2 arquivos do sublote> --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 12 suítes e 51 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint dos dois arquivos: aprovado;
- `npm run format:check`: continua com exit code `1`, mas caiu de 105 para **103 divergências**.

Não foram identificadas falhas funcionais, de lint, teste, build, configuração ou infraestrutura neste sublote. O aviso de worker encerrado nos testes direcionados e na suíte completa é preexistente e não causou falha.

Próximo sublote recomendado: `application/services/coach-intelligence`, que concentra 11 divergências relacionadas à agregação e observabilidade da inteligência do Coach.

### Lote incremental 9 — AI / `application/services/coach-intelligence`

As 11 divergências do sublote foram localizadas exclusivamente em `apps/api/src/modules/ai/application/services/coach-intelligence`:

- `coach-intelligence.aggregation.service.spec.ts`;
- `coach-intelligence.aggregation.service.ts`;
- `coach-intelligence.context-assembler.service.ts`;
- `coach-intelligence.mapper.service.spec.ts`;
- `coach-intelligence.mapper.service.ts`;
- `coach-intelligence.observability.service.ts`;
- `coach-intelligence.policy.spec.ts`;
- `coach-intelligence.policy.ts`;
- `coach-intelligence.source-adapters.service.spec.ts`;
- `coach-intelligence.source-adapters.service.ts`;
- `coach-intelligence.types.ts`.

`coach-intelligence.config.ts` e `coach-intelligence.errors.ts` pertencem ao diretório, mas não apresentavam divergências e não foram alterados.

O Prettier foi executado somente nos 11 arquivos divergentes. A revisão do diff confirmou exclusivamente reflow, indentação, quebra de linhas e formatação de tipos/objetos. Prompts, textos enviados ao LLM, contratos, regras de decisão, tratamento de erros, telemetria, imports e comportamento foram preservados.

Validações executadas:

```bash
npm exec nx test api --skip-nx-cache -- --testPathPattern=src/modules/ai/application/services/coach-intelligence
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec eslint -- <os 11 arquivos do sublote> --ext .ts --config .eslintrc.cjs
npm run format:check
```

Resultados:

- testes direcionados: 4 suítes e 10 testes aprovados;
- suíte completa da API: 219 suítes e 1.368 testes aprovados;
- `npm exec nx build api --skip-nx-cache`: aprovado;
- ESLint: 17 erros de imports/variáveis não utilizados distribuídos nos arquivos do sublote; classificados como **lint preexistente** e não corrigidos por estarem fora do escopo de formatação;
- `npm run format:check`: exit code `1`, com redução de **103 para 92 divergências**;
- divergências no sublote após a correção: **0**;
- `git diff --check`: aprovado.

Os avisos de encerramento de worker e logs de observabilidade durante os testes não causaram falha e foram tratados como limitações operacionais preexistentes.

Próximo sublote recomendado: `application/services/experts`, com 4 divergências. Depois dele, permanecem os sublotes de `application/use-cases`, `chat` e `ai.module.ts`.

### Lote incremental 3 — `application/services/context-builder`

Este sublote continha 3 divergências, todas processadas exclusivamente com a configuração oficial do Prettier:

- `apps/api/src/modules/ai/application/services/context-builder/coach-nutrition-context.types.ts`;
- `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.ts`;
- `apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.spec.ts`.

`coach-nutrition-context.types.spec.ts` já estava conforme e não foi alterado. A revisão do diff confirmou somente remoção de linha em branco, reflow e quebras de linha; composição do contexto, ordem e conteúdo dos dados, prompts, contratos, regras de seleção, imports e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **92** globais e **3** em `context-builder`;
- depois do lote: **89** globais e **0** em `context-builder`.

Validações executadas:

```bash
npm exec -- nx test api --skip-nx-cache -- --runTestsByPath apps/api/src/modules/ai/application/services/context-builder/build-user-health-context.service.spec.ts --runInBand
npm exec nx test api --skip-nx-cache
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- <os 3 arquivos alterados>
npm run format:check
git diff --check
```

Resultados:

- teste direcionado: 1 suíte e 18 testes aprovados;
- build da API: aprovado;
- ESLint direto nos 3 arquivos: aprovado;
- `npm run format:check`: exit code `1` por 89 divergências remanescentes fora do sublote;
- `git diff --check`: aprovado;
- teste completo da API: 192 suítes e 1.120 testes aprovados, mas 27 de 219 suítes falharam por `ENOSPC` ao gravar o cache de transformação do Jest. É uma limitação ambiental, sem erro funcional reportado nos arquivos processados.

Nenhum arquivo fora do sublote foi modificado por esta etapa. O próximo sublote recomendado é `application/services/experts`, atualmente com 4 divergências.

### Lote incremental 4 — `application/services/experts`

Este sublote continha exatamente 4 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/api/src/modules/ai/application/services/experts/composition/coach-expert-composition.service.ts`;
- `apps/api/src/modules/ai/application/services/experts/nutrition/nutrition-expert.service.spec.ts`;
- `apps/api/src/modules/ai/application/services/experts/nutrition/nutrition-expert.service.ts`;
- `apps/api/src/modules/ai/application/services/experts/recovery/recovery-expert.service.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação, quebras de linha e expansão de tipos, arrays e objetos. Contratos dos experts, prompts, regras de decisão, observabilidade, tratamento de erros, imports e comportamento foram preservados. A alteração em `coach-expert-observability.service.spec.ts` observada no diff já existia antes deste lote e não foi tocada.

Resultados de divergências:

- antes do lote: **89** globais e **4** em `application/services/experts`;
- depois do lote: **85** globais e **0** em `application/services/experts`.

Validações executadas:

```bash
npm exec -- nx test api --skip-nx-cache -- --testPathPattern=src/modules/ai/application/services/experts --runInBand
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- <os 4 arquivos alterados>
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 11 suítes e 76 testes aprovados;
- build da API: aprovado;
- ESLint direto nos 4 arquivos: executado; 1 erro preexistente de `no-unused-vars` em `recovery-expert.service.ts`, mantido conforme o escopo e parte da dívida de lint já identificada;
- `npm run format:check`: exit code `1`, com **85 divergências** remanescentes fora do sublote;
- divergências no sublote após a correção: **0**;
- `git diff --check`: aprovado;
- a suíte completa da API não foi iniciada: havia somente aproximadamente 354 MB disponíveis no volume, insuficiente para o cache do Jest após o `ENOSPC` anterior. Nenhuma limpeza destrutiva foi realizada.

O próximo sublote recomendado no bounded context de AI é `application/use-cases`, com 5 divergências; depois permanecem `chat` e `ai.module.ts`.

### Lote incremental 5 — `application/use-cases`

Este sublote continha exatamente 5 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/api/src/modules/ai/application/use-cases/build-coach-decision/build-coach-decision.use-case.ts`;
- `apps/api/src/modules/ai/application/use-cases/create-coach-chat/create-coach-chat.types.ts`;
- `apps/api/src/modules/ai/application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case.spec.ts`;
- `apps/api/src/modules/ai/application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case.spec.ts`;
- `apps/api/src/modules/ai/application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação, quebras de linha e expansão de tipos, arrays e objetos. Regras de negócio, contratos, comandos e casos de uso, prompts, tratamento de erros, telemetria, imports e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **85** globais e **5** em `application/use-cases`;
- depois do lote: **80** globais e **0** em `application/use-cases`.

Validações executadas:

```bash
npm exec -- nx test api --skip-nx-cache -- --runTestsByPath <as 4 specs direcionadas> --runInBand
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- <os 5 arquivos alterados>
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 4 suítes e 37 testes aprovados;
- build da API: aprovado;
- ESLint direto nos 5 arquivos: aprovado;
- `npm run format:check`: exit code `1`, com **80 divergências** remanescentes fora do sublote;
- divergências no sublote após a correção: **0**;
- `git diff --check`: aprovado;
- a suíte completa da API não foi executada por insuficiência de espaço disponível para o cache do Jest (`ENOSPC` já identificado anteriormente).

O próximo sublote recomendado no bounded context de AI é `application/services/chat`, com 1 divergência; depois permanece `ai.module.ts`, também com 1 divergência.

### Lote incremental 6 — `application/services/chat`

Este sublote continha exatamente 1 divergência, processada somente com a configuração oficial do Prettier:

- `apps/api/src/modules/ai/application/services/chat/coach-chat-context-loader.service.ts`.

A revisão do diff confirmou exclusivamente a compactação de uma declaração de tipo inline. O fluxo de chat, prompts, contratos, contexto enviado ao LLM, tratamento de erros, telemetria, imports e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **80** globais e **1** em `application/services/chat`;
- depois do lote: **79** globais e **0** em `application/services/chat`.

Validações executadas:

```bash
npm exec -- nx test api --skip-nx-cache -- --runTestsByPath apps/api/src/modules/ai/application/services/chat/coach-chat-context-loader.service.spec.ts --runInBand
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- apps/api/src/modules/ai/application/services/chat/coach-chat-context-loader.service.ts
npm run format:check
git diff --check
```

Resultados:

- teste direcionado: 1 suíte e 2 testes aprovados;
- build da API: aprovado;
- ESLint direto no arquivo: executado; 1 erro preexistente de variável não utilizada (`nutrition`), mantido fora do escopo;
- `npm run format:check`: exit code `1`, com **79 divergências** remanescentes fora do sublote;
- divergências no sublote após a correção: **0**;
- `git diff --check`: aprovado;
- a suíte completa da API permaneceu suspensa devido ao risco de `ENOSPC` no cache do Jest.

O próximo sublote recomendado no bounded context de AI é `ai.module.ts`, com 1 divergência.

### Lote incremental 7 — `apps/api/src/modules/ai/ai.module.ts`

Este lote continha exatamente 1 divergência, processada somente com a configuração oficial do Prettier:

- `apps/api/src/modules/ai/ai.module.ts`.

A revisão do diff confirmou exclusivamente a expansão visual da lista de controllers. Módulos importados, providers, exports, ordem de inicialização, contratos, dependências e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **79** globais e **1** em `ai.module.ts`;
- depois do lote: **78** globais e **0** em `ai.module.ts`.

Validações executadas:

```bash
npm exec -- nx test api --skip-nx-cache -- --testPathPattern=src/modules/ai --runInBand
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- apps/api/src/modules/ai/ai.module.ts
npm run format:check
git diff --check
```

Resultados:

- teste direcionado do bounded context de AI: 76 suítes e 492 testes aprovados;
- build da API: aprovado;
- ESLint direto no arquivo: aprovado;
- `npm run format:check`: exit code `1`, com **78 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- a suíte completa da API não foi executada devido ao risco de `ENOSPC`; nenhuma limpeza destrutiva foi realizada.

O próximo lote recomendado é o E2E de AI, composto por `apps/api/test/e2e/ai-coach-intelligence.e2e-spec.ts` e `apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts`.

### Lote incremental 8 — E2E de AI da API

Este lote continha exatamente 2 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/api/test/e2e/ai-coach-intelligence.e2e-spec.ts`;
- `apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação e quebras de linha. Cenários E2E, assertions, fixtures, dados de teste, configuração do MongoDB, autenticação, timeouts, contratos e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **78** globais e **2** nos E2E de AI;
- depois do lote: **76** globais e **0** nos E2E de AI.

Validações executadas:

```bash
npm exec -- nx run api:test:e2e -- --runTestsByPath apps/api/test/e2e/ai-coach-intelligence.e2e-spec.ts apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts
npm exec nx build api --skip-nx-cache
npm exec -- eslint -- apps/api/test/e2e/ai-coach-intelligence.e2e-spec.ts apps/api/test/e2e/progress-daily-check-in.e2e-spec.ts
npm run format:check
git diff --check
```

Resultados:

- testes E2E direcionados: falharam por infraestrutura; `ai-coach-intelligence.e2e-spec.ts` encontrou `UnexpectedCloseError` do MongoMemoryServer com código 48, e `progress-daily-check-in.e2e-spec.ts` encontrou `listen EPERM` ao tentar escutar em `0.0.0.0`. Nenhuma infraestrutura foi alterada para contornar as falhas;
- build da API: aprovado;
- ESLint direto nos 2 arquivos: aprovado;
- `npm run format:check`: exit code `1`, com **76 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- a suíte completa da API não foi executada devido ao risco de `ENOSPC`.

O próximo lote recomendado é `apps/mobile/src/analytics/product-analytics.ts`, com 1 divergência.

### Lote incremental 9 — analytics do mobile

Este lote continha exatamente 1 divergência, processada somente com a configuração oficial do Prettier:

- `apps/mobile/src/analytics/product-analytics.ts`.

A revisão do diff confirmou exclusivamente quebras de linha em uniões de tipos. Nomes e payloads dos eventos, propriedades de analytics, identificadores, tipagens e comportamento de rastreamento foram preservados.

Resultados de divergências:

- antes do lote: **76** globais e **1** em `product-analytics.ts`;
- depois do lote: **75** globais e **0** em `product-analytics.ts`.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/analytics/product-analytics.spec.ts
npm exec -- eslint -- apps/mobile/src/analytics/product-analytics.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- teste direcionado: 1 suíte e 8 testes aprovados;
- ESLint direto no arquivo: aprovado;
- build Expo do mobile: aprovado para web, Android e iOS;
- `npm run format:check`: exit code `1`, com **75 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado.

O próximo lote recomendado é `apps/mobile/src/components/dashboard`, com 2 divergências.

### Lote incremental 10 — dashboard mobile

Este lote continha exatamente 2 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/mobile/src/components/dashboard/recovery-readiness-card.tsx`;
- `apps/mobile/src/components/dashboard/todays-nutrition-card-model.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação e quebras de linha. Props, estados visuais, cálculos de recovery e nutrição, textos exibidos, acessibilidade e comportamento dos componentes foram preservados.

Resultados de divergências:

- antes do lote: **75** globais e **2** no dashboard mobile;
- depois do lote: **73** globais e **0** no dashboard mobile.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/components/dashboard/todays-nutrition-card.spec.ts
npm exec -- eslint -- apps/mobile/src/components/dashboard/recovery-readiness-card.tsx apps/mobile/src/components/dashboard/todays-nutrition-card-model.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- teste direcionado: 1 suíte e 3 testes aprovados;
- ESLint direto nos 2 arquivos: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **73 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado.

O próximo lote recomendado é `apps/mobile/src/features/recovery/cache`, com 4 divergências.

### Lote incremental 11 — cache de recovery mobile

Este lote continha exatamente 4 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/mobile/src/features/recovery/cache/recovery-cache-schema.spec.ts`;
- `apps/mobile/src/features/recovery/cache/recovery-cache-schema.ts`;
- `apps/mobile/src/features/recovery/cache/recovery-cache.spec.ts`;
- `apps/mobile/src/features/recovery/cache/recovery-cache.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação e quebras de linha. Schema do cache, chaves e versões, serialização e desserialização, política de invalidação, recuperação offline, tratamento de dados inválidos, contratos e comportamento foram preservados.

Resultados de divergências:

- antes do lote: **73** globais e **4** no cache de recovery;
- depois do lote: **69** globais e **0** em `features/recovery/cache`.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/features/recovery/cache/recovery-cache-schema.spec.ts src/features/recovery/cache/recovery-cache.spec.ts
npm exec -- eslint -- apps/mobile/src/features/recovery/cache/recovery-cache-schema.spec.ts apps/mobile/src/features/recovery/cache/recovery-cache-schema.ts apps/mobile/src/features/recovery/cache/recovery-cache.spec.ts apps/mobile/src/features/recovery/cache/recovery-cache.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 2 suítes e 9 testes aprovados;
- ESLint direto nos 4 arquivos: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **69 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- nenhuma limitação de infraestrutura ocorreu neste lote.

O próximo lote recomendado é `apps/mobile/src/features/recovery/hooks/use-recovery-experience.ts`, com 1 divergência.

### Lote incremental 12 — hook de recovery mobile

Este lote continha exatamente 1 divergência, processada somente com a configuração oficial do Prettier:

- `apps/mobile/src/features/recovery/hooks/use-recovery-experience.ts`.

Não havia spec direto do hook; os testes direcionados da feature cobriram modelos, helpers e apresentação. A revisão do diff confirmou exclusivamente reflow e quebras de linha. Ciclo de vida, chamadas de API, sincronização com cache, estados de loading/erro/vazio, regras de recovery, efeitos, dependências e comportamento offline foram preservados.

Resultados de divergências:

- antes do lote: **69** globais e **1** no hook de recovery;
- depois do lote: **68** globais e **0** no hook de recovery.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath <4 specs direcionados da feature de recovery>
npm exec -- eslint -- apps/mobile/src/features/recovery/hooks/use-recovery-experience.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 4 suítes e 15 testes aprovados;
- ESLint direto no hook: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **68 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- nenhuma limitação de infraestrutura ocorreu neste lote.

O próximo lote recomendado é `apps/mobile/src/features/recovery/fixtures/recovery-screen.fixtures.ts`, com 1 divergência.

### Lote incremental 13 — fixtures de recovery mobile

Este lote continha exatamente 1 divergência, processada somente com a configuração oficial do Prettier:

- `apps/mobile/src/features/recovery/fixtures/recovery-screen.fixtures.ts`.

A revisão do diff confirmou exclusivamente expansão visual de objetos e arrays. Valores das fixtures, estados de recovery, cenários de loading/erro/vazio/sucesso, identificadores, datas e dados usados pelos testes e componentes foram preservados.

Resultados de divergências:

- antes do lote: **68** globais e **1** em `recovery-screen.fixtures.ts`;
- depois do lote: **67** globais e **0** na fixture de recovery.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/features/recovery/helpers/recovery-history-presentation.spec.ts src/features/recovery/models/recovery-screen-state.spec.ts src/features/recovery/models/recovery-screen-state-mapper.spec.ts
npm exec -- eslint -- apps/mobile/src/features/recovery/fixtures/recovery-screen.fixtures.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 3 suítes e 12 testes aprovados;
- ESLint direto na fixture: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **67 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- nenhuma limitação de infraestrutura ocorreu neste lote.

O próximo lote recomendado é `apps/mobile/src/features/recovery/models`, com 2 divergências.

### Lote incremental 14 — modelos de recovery mobile

Este lote continha exatamente 2 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/mobile/src/features/recovery/models/recovery-screen-state-mapper.spec.ts`;
- `apps/mobile/src/features/recovery/models/recovery-screen-state.spec.ts`.

A revisão do diff confirmou exclusivamente reflow, indentação e quebras de linha. Tipos, interfaces, mapeamentos de estado, valores, enums, regras de apresentação, contratos consumidos pelos componentes e comportamento de loading/erro/vazio/sucesso foram preservados.

Resultados de divergências:

- antes do lote: **67** globais e **2** em `features/recovery/models`;
- depois do lote: **65** globais e **0** em `features/recovery/models`.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/features/recovery/models/recovery-screen-state-mapper.spec.ts src/features/recovery/models/recovery-screen-state.spec.ts
npm exec -- eslint -- apps/mobile/src/features/recovery/models/recovery-screen-state-mapper.spec.ts apps/mobile/src/features/recovery/models/recovery-screen-state.spec.ts
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 2 suítes e 9 testes aprovados;
- ESLint direto nos 2 arquivos: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **65 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- nenhuma limitação de infraestrutura ocorreu neste lote.

O próximo lote recomendado é `apps/mobile/src/features/recovery/screens`, com 2 divergências.

### Lote incremental 15 — telas de recovery mobile

Este lote continha exatamente 2 divergências, processadas somente com a configuração oficial do Prettier:

- `apps/mobile/src/features/recovery/screens/recovery-screen-container.tsx`;
- `apps/mobile/src/features/recovery/screens/recovery-screen.tsx`.

A revisão do diff confirmou exclusivamente reflow, indentação e quebras de linha. Navegação, props, composição dos componentes, estados de loading/erro/vazio, acessibilidade, callbacks, regras de exibição e comportamento offline foram preservados.

Resultados de divergências:

- antes do lote: **65** globais e **2** em `features/recovery/screens`;
- depois do lote: **63** globais e **0** em `features/recovery/screens`.

Validações executadas:

```bash
npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/features/recovery/helpers/recovery-history-presentation.spec.ts src/features/recovery/models/recovery-screen-state.spec.ts src/features/recovery/models/recovery-screen-state-mapper.spec.ts
npm exec -- eslint -- apps/mobile/src/features/recovery/screens/recovery-screen-container.tsx apps/mobile/src/features/recovery/screens/recovery-screen.tsx
npm exec nx build mobile --skip-nx-cache
npm run format:check
git diff --check
```

Resultados:

- testes direcionados: 3 suítes e 12 testes aprovados;
- ESLint direto nos 2 arquivos: aprovado;
- build Expo do mobile: aprovado para Web, Android e iOS;
- `npm run format:check`: exit code `1`, com **63 divergências** remanescentes fora do lote;
- divergências no lote após a correção: **0**;
- `git diff --check`: aprovado;
- nenhuma limitação de infraestrutura ocorreu neste lote.

O próximo lote recomendado é `apps/mobile/src/features/recovery/helpers`, com 4 divergências.

### Lote incremental 16 — helpers de recovery mobile

Arquivos processados exclusivamente neste lote:

- `apps/mobile/src/features/recovery/helpers/recovery-accessibility.ts`
- `apps/mobile/src/features/recovery/helpers/recovery-copy.ts`
- `apps/mobile/src/features/recovery/helpers/recovery-history-presentation.spec.ts`
- `apps/mobile/src/features/recovery/helpers/recovery-history-presentation.ts`

O lote iniciou com 63 divergências globais, sendo 4 em `features/recovery/helpers`, e terminou com 59 divergências globais e 0 divergências no diretório processado. A revisão do diff confirmou apenas ajustes de layout do Prettier, incluindo quebras/refluxo de linhas e remoção de linhas em branco finais. Regras de acessibilidade, textos, mapeamentos e ordenação do histórico, regras de apresentação, valores retornados e comportamento foram preservados.

Validações executadas:

- `npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/features/recovery/helpers/recovery-copy.spec.ts src/features/recovery/helpers/recovery-history-presentation.spec.ts`: passou, 2 suítes e 6 testes.
- ESLint direto nos 4 arquivos processados: passou.
- `npm exec nx build mobile --skip-nx-cache`: passou para Web, iOS e Android.
- `npm run format:check`: falhou somente pelas 59 divergências globais restantes, fora deste lote.
- `git diff --check`: passou.

Não houve limitação de infraestrutura nem alteração funcional. O próximo lote recomendado é `apps/mobile/src/features/recovery/components`, com 11 divergências.

### Lote incremental 17 — componentes de recovery mobile

Os 11 arquivos divergentes foram processados em dois sublotes revisáveis, exclusivamente com a configuração oficial do Prettier:

Sublote 1 — estados, fatores e atualização:

- `apps/mobile/src/features/recovery/components/recovery-empty-state.tsx`
- `apps/mobile/src/features/recovery/components/recovery-error-state.tsx`
- `apps/mobile/src/features/recovery/components/recovery-factor-list.tsx`
- `apps/mobile/src/features/recovery/components/recovery-factor-row.tsx`
- `apps/mobile/src/features/recovery/components/recovery-freshness-note.tsx`

Sublote 2 — histórico, insight, loading, score e tendência:

- `apps/mobile/src/features/recovery/components/recovery-history-chart.tsx`
- `apps/mobile/src/features/recovery/components/recovery-history-list.tsx`
- `apps/mobile/src/features/recovery/components/recovery-insight-card.tsx`
- `apps/mobile/src/features/recovery/components/recovery-loading-state.tsx`
- `apps/mobile/src/features/recovery/components/recovery-score-hero.tsx`
- `apps/mobile/src/features/recovery/components/recovery-trend-summary.tsx`

A revisão dos dois diffs confirmou exclusivamente reflow, indentação, quebras de linha e remoção de linhas em branco finais. Props, estados visuais, acessibilidade, textos, estilos, cálculos de score e tendência, callbacks e comportamento de loading/erro/vazio/sucesso foram preservados.

Resultados de divergências:

- antes do lote: **59** globais e **11** em `features/recovery/components`;
- depois do lote: **48** globais e **0** em `features/recovery/components`.

Validações executadas:

- testes direcionados da feature de recovery via Nx: passaram, 6 suítes e 24 testes;
- ESLint direto nos 11 arquivos processados: passou;
- `npm exec nx build mobile --skip-nx-cache`: passou para Web, iOS e Android;
- `npm run format:check`: falhou somente pelas 48 divergências globais restantes, fora deste lote;
- `git diff --check`: passou.

Não houve limitação de infraestrutura, falha funcional ou alteração semântica. A verificação final confirmou 0 divergências no diretório de componentes. O próximo lote recomendado é `apps/mobile/src/hooks/coach`, com 3 divergências.

### Lote incremental 18 — hooks de Coach do mobile

Arquivos processados exclusivamente neste lote:

- `apps/mobile/src/hooks/coach/coach-intelligence-helpers.ts`
- `apps/mobile/src/hooks/coach/coach-intelligence.ts`
- `apps/mobile/src/hooks/coach/use-coach-intelligence.ts`

O lote iniciou com 48 divergências globais, sendo 3 em `apps/mobile/src/hooks/coach`, e terminou com 45 divergências globais e 0 divergências no diretório processado. A revisão do diff confirmou somente ajustes de layout do Prettier em expressões, imports, parâmetros, condicionais e dependências visualmente refluídos. Chamadas de API, contratos de dados, estados de loading/erro, cache e invalidação, dependências dos hooks, regras de Coach e comportamento de retry/fallback foram preservados.

Validações executadas:

- `npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/hooks/coach/coach-intelligence.spec.ts src/hooks/coach/use-coach-intelligence.spec.ts src/hooks/coach/coach-intelligence-cleanup.spec.ts`: passou, 3 suítes e 10 testes.
- ESLint direto nos 3 arquivos processados: passou.
- `npm exec nx build mobile --skip-nx-cache`: passou para Web, iOS e Android.
- `npm run format:check`: falhou somente pelas 45 divergências globais restantes, fora deste lote.
- `git diff --check`: passou.

Não houve limitação de infraestrutura, falha funcional ou alteração semântica. A verificação final confirmou 0 divergências em `apps/mobile/src/hooks/coach`. O próximo lote recomendado é `apps/mobile/src/hooks`, com 2 divergências (`use-ask-coach.ts` e `use-coach-weekly-review.ts`).

### Lote incremental 19 — hooks principais do mobile

Arquivos processados exclusivamente neste lote:

- `apps/mobile/src/hooks/use-ask-coach.ts`
- `apps/mobile/src/hooks/use-coach-weekly-review.ts`

O lote iniciou com 45 divergências globais, sendo 2 diretamente em `apps/mobile/src/hooks` fora de `hooks/coach`, e terminou com 43 divergências globais e 0 divergências nesses dois arquivos. A revisão do diff confirmou somente compactação de import e reflow do array de dependências. Chamadas de API, contratos e tipos, estados de loading/erro, cache e invalidação, dependências dos hooks, retries, fallbacks, efeitos colaterais e comportamento funcional foram preservados.

Validações executadas:

- `npm exec -- nx test mobile --skip-nx-cache -- --runTestsByPath src/hooks/use-ask-coach.spec.ts`: passou, 1 suíte e 5 testes.
- Não existe suíte dedicada para `use-coach-weekly-review.ts`; essa limitação foi registrada sem criar teste ou workaround fora do lote.
- ESLint direto nos 2 arquivos: falhou por 5 imports não utilizados preexistentes em `use-ask-coach.ts` (`AskCoachCategory`, `AskCoachPersonalizedSuggestion`, `AskCoachQuestion`, `AskCoachQuickAction` e `AskCoachRecentConversation`). Nenhum problema foi corrigido fora do escopo.
- `npm exec nx build mobile --skip-nx-cache`: passou para Web, iOS e Android.
- `npm run format:check`: falhou somente pelas 43 divergências globais restantes, fora deste lote.
- `git diff --check`: passou.

Não houve limitação de infraestrutura nem alteração semântica. A verificação final confirmou 0 divergências nos dois arquivos processados. O próximo lote recomendado é `apps/mobile/src/screens`, com 7 divergências.

### Lote incremental 20 — telas do mobile

Os 7 arquivos divergentes foram processados em dois sublotes revisáveis, exclusivamente com a configuração oficial do Prettier.

Sublote 1 — dashboard:

- `apps/mobile/src/screens/dashboard-screen.tsx`

O diff confirmou somente reflow de tipo, expressões e condicionais. Navegação, props, parâmetros de rota, chamadas de API, estados, acessibilidade, callbacks, regras de negócio, comportamento offline e textos foram preservados.

Resultados do sublote 1:

- divergências globais: **43 → 42**;
- divergências em `apps/mobile/src/screens`: **7 → 6**;
- teste direcionado `src/screens/dashboard-daily-check-in.spec.ts`: passou, 1 suíte e 4 testes;
- ESLint direto no arquivo: passou;
- build Expo: passou para Web, Android e iOS;
- `npm run format:check`: falhou pelas 42 divergências restantes fora do sublote;
- `git diff --check`: passou.

Sublote 2 — refeições e nutrição:

- `apps/mobile/src/screens/log-meal-screen.tsx`
- `apps/mobile/src/screens/meal-detail-screen.tsx`
- `apps/mobile/src/screens/nutrition-history-screen.tsx`
- `apps/mobile/src/screens/nutrition-overview-screen.tsx`
- `apps/mobile/src/screens/replace-meal-screen.tsx`
- `apps/mobile/src/screens/todays-meals-screen.tsx`

A revisão do diff confirmou exclusivamente reflow, indentação, quebras de linha e formatação de expressões JSX. Navegação, props e parâmetros de rota, chamadas de API, estados de loading/erro/vazio, acessibilidade, callbacks, regras de negócio, comportamento offline e textos/labels foram preservados.

Resultados do sublote 2:

- divergências globais: **42 → 36**;
- divergências em `apps/mobile/src/screens`: **6 → 0**;
- não existem testes dedicados para essas seis telas; nenhum teste ou workaround fora do lote foi criado;
- ESLint direto nos 6 arquivos: falhou somente pelo argumento `onOpenCoach` não utilizado, preexistente, em `nutrition-overview-screen.tsx`; não foi corrigido;
- build Expo: passou para Web, Android e iOS;
- `npm run format:check`: falhou pelas 36 divergências restantes fora do lote;
- `git diff --check`: passou.

Não houve limitação de infraestrutura nem alteração semântica. A verificação final confirmou 0 divergências em `apps/mobile/src/screens`. O próximo lote recomendado é `docs/audits`, com 5 divergências.

### Lote incremental 21 — documentação de auditorias

Documentos processados exclusivamente neste lote:

- `docs/audits/product-roadmap-1.0-audit.md`
- `docs/audits/release-2.1-epic-a1-daily-check-in-audit.md`
- `docs/audits/release-2.1-epic-a1-recovery-coach-validation.md`
- `docs/audits/release-2.1-epic-a2-recovery-intelligence-audit.md`
- `docs/audits/release-2.2-epic-p1-observability-platform-audit.md`

O lote iniciou com 36 divergências globais, sendo 5 em `docs/audits`, e terminou com 31 divergências globais e 0 divergências no diretório processado. A revisão dos cinco diffs confirmou somente formatação de tabelas Markdown, alinhamento de colunas e quebras de linha. Conteúdo técnico, títulos, listas, tabelas, links, comandos, nomes de arquivos, referências, datas e decisões foram preservados semanticamente.

Validações executadas:

- `npm run format:check`: falhou somente pelas 31 divergências globais restantes fora de `docs/audits`.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/audits`: confirmou 0 divergências.

Não houve limitação de infraestrutura, alteração de conteúdo ou modificação fora dos cinco documentos processados e deste histórico. O próximo lote recomendado é `docs/certification`, com 1 divergência.

### Lote incremental 22 — documentação de certificação

Documento processado exclusivamente neste lote:

- `docs/certification/release-2.1-epic-a2-production-certification.md`

O lote iniciou com 31 divergências globais, sendo 1 em `docs/certification`, e terminou com 30 divergências globais e 0 divergências no diretório processado. A revisão do diff confirmou exclusivamente formatação de tabelas Markdown e alinhamento de colunas. Critérios de certificação, decisões técnicas, links, comandos, nomes de arquivos, datas, referências e conteúdo operacional foram preservados semanticamente.

Validações executadas:

- `npm run format:check`: falhou somente pelas 30 divergências globais restantes fora de `docs/certification`.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/certification`: confirmou 0 divergências.

Não houve limitação de infraestrutura nem alteração de conteúdo. O próximo lote recomendado é `docs/product`, com 1 divergência.

### Lote incremental 23 — documentação de produto

Documento processado exclusivamente neste lote:

- `docs/product/release-2.1-epic-a2-mobile-recovery-experience.md`

O lote iniciou com 30 divergências globais, sendo 1 em `docs/product`, e terminou com 29 divergências globais e 0 divergências no diretório processado. A revisão do diff confirmou apenas a remoção de uma linha em branco final pelo Prettier. Requisitos de produto, decisões, prioridades, métricas, tabelas, links, nomes de funcionalidades, referências técnicas e conteúdo semântico foram preservados.

Validações executadas:

- `npm run format:check`: falhou somente pelas 29 divergências globais restantes fora de `docs/product`.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/product`: confirmou 0 divergências.

Não houve limitação de infraestrutura nem alteração de conteúdo. O próximo lote recomendado é `docs/operations`, com 3 divergências.

### Lote incremental 24 — documentação de operações

Documentos processados exclusivamente neste lote:

- `docs/operations/release-2.1-epic-a3-broad-rollout-signoff.md`
- `docs/operations/release-2.1-epic-a3-nutrition-observability.md`
- `docs/operations/release-2.1-epic-a3-nutrition-rollout-runbook.md`

O lote iniciou com 29 divergências globais, sendo 3 em `docs/operations`, e terminou com 26 divergências globais e 0 divergências no diretório processado. A revisão dos três diffs confirmou exclusivamente alinhamento e formatação de tabelas Markdown. Procedimentos operacionais, runbooks, comandos, critérios de rollout, métricas, alertas, checklists, links, referências e conteúdo técnico foram preservados semanticamente.

Validações executadas:

- `npm run format:check`: falhou somente pelas 26 divergências globais restantes fora de `docs/operations`.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/operations`: confirmou 0 divergências.

Não houve limitação de infraestrutura nem alteração de conteúdo. O próximo lote recomendado é `docs/plans`, com 5 divergências.

### Lote incremental 25 — documentação de planos

Documentos processados exclusivamente neste lote:

- `docs/plans/release-2.1-epic-a1-file-change-map.md`
- `docs/plans/release-2.1-epic-a2-file-change-map.md`
- `docs/plans/release-2.1-epic-a2-recovery-intelligence-implementation-plan.md`
- `docs/plans/release-2.1-epic-a3-file-change-map.md`
- `docs/plans/release-2.1-epic-a3-nutrition-intelligence-implementation-plan.md`

O lote iniciou com 26 divergências globais, sendo 5 em `docs/plans`, e terminou com 21 divergências globais e 0 divergências no diretório processado. A revisão dos cinco diffs confirmou exclusivamente alinhamento/refluxo de tabelas Markdown e quebras de layout. Planos de implementação, escopos, sequências, listas de arquivos, dependências, critérios de aceite, riscos, referências técnicas e links foram preservados semanticamente.

Validações executadas:

- `npm run format:check`: falhou somente pelas 21 divergências globais restantes fora de `docs/plans`.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/plans`: confirmou 0 divergências.

Não houve limitação de infraestrutura nem alteração de conteúdo. O próximo lote recomendado é `docs/specs/coach-intelligence-aggregation`, com 8 divergências.

### Lote incremental 26 — especificação de agregação de inteligência do Coach

Documentos processados exclusivamente neste lote:

- `docs/specs/coach-intelligence-aggregation/architecture.md`
- `docs/specs/coach-intelligence-aggregation/contracts.md`
- `docs/specs/coach-intelligence-aggregation/final-certification.md`
- `docs/specs/coach-intelligence-aggregation/flow.md`
- `docs/specs/coach-intelligence-aggregation/README.md`
- `docs/specs/coach-intelligence-aggregation/rollout.md`
- `docs/specs/coach-intelligence-aggregation/rules.md`
- `docs/specs/coach-intelligence-aggregation/testing.md`

O lote iniciou com 21 divergências globais, sendo 8 no diretório da especificação, e terminou com 13 divergências globais e 0 divergências no diretório processado. A revisão dos oito diffs confirmou exclusivamente alinhamento/refluxo de tabelas Markdown, quebras de linha e remoção de espaços/linhas finais. Requisitos, contratos, schemas, exemplos, fluxos, eventos, regras de agregação, nomes de campos, fórmulas, critérios de aceite e referências técnicas foram preservados semanticamente.

Validações executadas:

- `npm run format:check`: falhou somente pelas 13 divergências globais restantes fora do diretório processado.
- `git diff --check`: passou.
- Verificação específica com `prettier --list-different docs/specs/coach-intelligence-aggregation`: confirmou 0 divergências.

Não houve limitação de infraestrutura nem alteração de conteúdo. O próximo lote recomendado é `docs/architecture`, com 13 divergências.

### Lote incremental 27 — arquitetura e conclusão da dívida de formatação

As 13 divergências de `docs/architecture` foram processadas em três sublotes revisáveis:

Sublote 1 — base arquitetural e auditoria:

- `docs/architecture/adrs/ADR-0001-architecture-baseline-certification.md`
- `docs/architecture/engineering-principles.md`
- `docs/architecture/repository-technical-audit.md`

Sublote 2 — Recovery:

- `docs/architecture/release-2.1-epic-a2-deterministic-recovery-coach.md`
- `docs/architecture/release-2.1-epic-a2-mobile-recovery-integration.md`
- `docs/architecture/release-2.1-epic-a2-recovery-analytics-observability.md`
- `docs/architecture/release-2.1-epic-a2-recovery-contracts-and-client.md`
- `docs/architecture/release-2.1-epic-a2-recovery-read-models.md`

Sublote 3 — Nutrition:

- `docs/architecture/release-2.1-epic-a3-nutrition-certification.md`
- `docs/architecture/release-2.1-epic-a3-nutrition-domain-and-canonical-model.md`
- `docs/architecture/release-2.1-epic-a3-nutrition-integration-audit.md`
- `docs/architecture/release-2.1-epic-a3-nutrition-legacy-register.md`
- `docs/architecture/release-2.1-epic-a3-nutrition-legacy-runtime-migration.md`

Resultados das divergências:

- antes do sublote 1: **13** globais; depois: **10**;
- depois do sublote 2: **5** globais;
- depois do sublote 3: **0** globais e **0** em `docs/architecture`.

A revisão dos diffs confirmou exclusivamente formatação Prettier/Markdown: alinhamento e refluxo de tabelas, quebras de linha e remoção de linhas finais. Decisões arquiteturais, ADRs, princípios, contratos, diagramas, fluxos, nomes, referências, links, critérios e justificativas foram preservados semanticamente.

Validações executadas após cada sublote:

- Sublote 1: `npm run format:check` reportou 10 divergências restantes; `git diff --check` passou.
- Sublote 2: `npm run format:check` reportou 5 divergências restantes; `git diff --check` passou.
- Sublote 3: `npm run format:check` passou; `git diff --check` passou.
- Verificação final: `npm run format:check` passou com exit code 0; `prettier --list-different docs/architecture` confirmou 0 divergências; `git diff --check` passou.

Não houve limitação de infraestrutura, alteração de conteúdo ou mudança semântica. A dívida global de formatação foi concluída; não há próximo lote recomendado.

### Fechamento da Sprint 1 — Saúde da base

Validação final executada na branch `feat/dashboard-v1` em 2026-08-11:

- `npm run format:check`: passou com exit code 0; as 419 divergências foram eliminadas ou cobertas pela configuração oficial.
- `git diff --check`: passou.
- `npm run lint`: passou para `types` e `api-client`.
- `npm exec nx test api --skip-nx-cache`: passou, 219 suítes e 1.368 testes; permaneceu aviso de worker encerrado à força/teardown.
- `npm exec nx test mobile --skip-nx-cache`: passou, 22 suítes e 104 testes.
- Builds `types`, `api-client` e `api`: passaram via cache local do Nx; o build API incluiu a dependência `types`.
- `npm exec nx build mobile --skip-nx-cache`: passou para Web, Android e iOS.

E2E crítico executado com `npm exec nx run api:test:e2e --skip-nx-cache`: 16 suítes e 56 testes falharam na inicialização, antes dos cenários. A causa foi infraestrutura reproduzível neste ambiente: `MongoMemoryServer` falhou ao abrir portas com `listen EPERM: operation not permitted 0.0.0.0`; também ocorreu `UnexpectedCloseError` código 48 e erros secundários de teardown. Registro, login/sessão, onboarding, treino, conclusão, check-in, Recovery, Nutrition, Coach, sessão expirada e dados incompletos permanecem sem certificação E2E funcional neste host.

O primeiro comando agregado de build (`nx run-many`) foi rejeitado pelo wrapper `npm exec` por parsing de argumentos; os quatro builds individuais foram então executados com sucesso. O espaço disponível observado foi de aproximadamente 659 MiB, mantendo risco de `ENOSPC`; nenhuma limpeza destrutiva ou alteração funcional foi realizada.

Status final da Sprint 1: **parcialmente concluída/bloqueada para fechamento E2E**. A Sprint 2 deve começar pela repetição dos E2E em CI/host com permissão de bind e pela correção do teardown/open handles da suíte da API, antes de novas mudanças funcionais.

### Fase 4 — Endurecer a prevenção

- manter o `format:check` no CI;
- considerar um check de arquivos alterados para desenvolvimento local;
- garantir que novos diretórios gerados sejam adicionados ao `.prettierignore` e `.gitignore` na mesma mudança;
- manter as regras específicas para impedir novas saídas derivadas em `packages/types/src`.

## Critérios de aceite

- `npm run format:check` passa após a dívida restante de código/documentação ser tratada;
- nenhum artefato gerado de Next, Expo, Android ou CMake é listado pelo Prettier;
- os 45 artefatos gerados de `packages/types/src` não são rastreados e não são listados pelo Prettier;
- os 32 arquivos-fonte `.ts` de `packages/types/src` permanecem rastreados;
- divergências de código e documentação são corrigidas em lotes revisáveis;
- `npm run lint`, testes API/mobile, E2E e builds continuam passando;
- não há alteração comportamental ou contratual;
- o CI reproduz o mesmo resultado localmente.

## Riscos

- ignorar arquivos incorretamente pode esconder código-fonte real;
- consumidores que dependessem de runtime JavaScript dentro de `packages/types/src` poderiam quebrar; aliases e builds validados demonstram que esse não é o fluxo atual;
- uma única execução de `prettier --write .` produziria um diff grande e difícil de revisar;
- artefatos locais podem voltar a aparecer após builds se o ignore não for coberto por testes/processo;
- diferenças de versão do Prettier entre ambientes podem alterar a contagem.

## Dependências

- decisão sobre o contrato de distribuição de `packages/types`;
- confirmação de que `apps/mobile/android`, `apps/mobile/ios`, `apps/web/.next` e `android/build` são sempre gerados;
- revisão da configuração do CI;
- disponibilidade de uma branch isolada para os lotes incrementais.

## Estimativa de esforço

- Fase 1, escopo do formatter: 0,5 dia;
- Fase 2, validação e decisão de `packages/types`: 0,5–1 dia;
- Fase 3, formatação incremental de código/documentação: 1–2 dias;
- Fase 4, prevenção e validação CI: 0,5 dia.

Estimativa total: **2 a 4 dias**, dependendo da decisão sobre os arquivos gerados rastreados em `packages/types/src`.
