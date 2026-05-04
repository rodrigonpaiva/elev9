# Flow — Generate Coach Feedback

## 1. Overview

Este documento descreve o fluxo de execução do use-case `generate-coach-feedback`.

No MVP, o fluxo termina com a leitura do contexto do usuário e a geração determinística de uma resposta textual de coaching.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Resolve active FitnessProfile from UserProfile
5. Resolve active TrainingPlan
6. Resolve 7-day UTC analysis window
7. Resolve recent WorkoutLogs
8. Resolve ProgressSummary metrics
9. Resolve expected weekly frequency
10. Build derived coaching metrics
11. Generate deterministic insights
12. Generate deterministic recommendations
13. Return safe coach feedback
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
POST /ai/coach-feedback
```

O cliente não envia ids nem dados de treino no body.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile` autenticado.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 4 — Resolve Active FitnessProfile From UserProfile

Usar `userProfileId` para localizar o `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

### Step 5 — Resolve Active TrainingPlan

Localizar o `TrainingPlan` ativo do `FitnessProfile` ativo.

Se não existir:

- continuar com degradação segura
- a resposta ainda pode ser gerada com base em `UserProfile`, `FitnessProfile`, `WorkoutLogs` e `ProgressSummary`
- evitar recomendações específicas de treino dependentes de plano

### Step 6 — Resolve 7-Day UTC Analysis Window

No MVP, a janela de análise é fixa:

- últimos 7 dias corridos incluindo hoje em UTC
- `WorkoutLog.date` no formato `YYYY-MM-DD` UTC
- `startDate` inclusivo
- `endDate` inclusivo

### Step 7 — Resolve Recent WorkoutLogs

Ler `WorkoutLogs` recentes ligados ao escopo do usuário autenticado.

No MVP:

- usar apenas leitura
- usar o escopo do plano ativo quando existir
- usar a janela fixa de 7 dias definida no passo anterior

### Step 8 — Resolve ProgressSummary Metrics

Reaproveitar os dados ou cálculos já existentes para obter:

- `workoutsCompleted`
- `totalDurationMinutes`
- `averageDurationMinutes`
- `lastWorkoutDate`
- `currentStreak`

O use-case pode:

- chamar um serviço interno/reutilizável de resumo
- ou recalcular localmente as mesmas métricas de forma consistente

Em ambos os casos:

- `progress/get-progress-summary` é a fonte canônica das regras
- o algoritmo usado aqui deve permanecer equivalente para evitar divergência
- no MVP, não existe dependência direta obrigatória com `GetProgressSummaryUseCase`
- a recomputação interna é permitida e preferível se reduzir acoplamento entre módulos

### Step 9 — Resolve Expected Weekly Frequency

Resolver `expectedWorkouts` com a seguinte prioridade:

1. `FitnessProfile.trainingAvailability.daysPerWeek`
2. fallback por `activityLevel`:
   - `low = 2`
   - `medium = 3`
   - `high = 4`

### Step 10 — Build Derived Coaching Metrics

Derivar métricas simples para coaching:

- frequência recente
- tendência de duração média
- consistência
- streak atual
- alinhamento entre frequência observada e `expectedWorkouts`
- contexto de `goal`
- contexto de `activityLevel`

Classificações objetivas:

- `no logs = 0 logs na janela`
- `beginner = 1 ou 2 logs na janela`
- `consistent = logs na janela >= expectedWorkouts`
- `inconsistent = logs na janela < expectedWorkouts`
- `high streak = currentStreak >= 3`

### Step 11 — Generate Deterministic Insights

Gerar `insights` com base em regras fixas.

Exemplos:

- streak alto -> insight de consistência
- aumento de duração média -> progresso positivo
- poucos treinos -> insight de baixa frequência
- ausência de logs -> insight inicial

O módulo `AI` não lê `Nutrition` e não gera recomendações nutricionais no MVP.

### Step 12 — Generate Deterministic Recommendations

Gerar `recommendations` com base em regras fixas.

Exemplos:

- streak alto -> manter ritmo
- frequência abaixo da disponibilidade -> tentar mais uma sessão
- poucos dados -> completar o primeiro treino
- progresso estável -> aumentar intensidade na próxima sessão, quando coerente

Prioridade obrigatória da mensagem principal:

1. `no logs`
2. `high streak`
3. `consistent`
4. `beginner`
5. `inconsistent`
6. fallback motivacional

### Step 13 — Return Safe Coach Feedback

Retornar apenas:

```ts
{
  message,
  insights,
  recommendations
}
```

Nenhum dado bruto sensível deve ser exposto.
Aplicar limites:

- `message <= 240` caracteres
- `insights <= 3` itens
- `recommendations <= 3` itens
- cada item <= `160` caracteres

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 User Profile Not Found

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 4.3 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo para o `UserProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.4 No Logs

Se não existirem `WorkoutLogs`:

- não falhar
- retornar coaching inicial motivacional

### 4.5 No Active TrainingPlan

Se não existir `TrainingPlan` ativo:

- não falhar necessariamente
- gerar resposta com os dados mínimos disponíveis quando possível

### 4.6 Internal Failure

Se ocorrer erro inesperado:

- `AI_COACH_INTERNAL_ERROR`

### 4.7 Invalid Body

Se o cliente enviar body com qualquer campo funcional ou extra:

- `AI_COACH_INVALID_INPUT`

---

## 5. Summary

O fluxo do MVP deve ser:

- autenticado
- read-only
- determinístico
- resiliente a poucos dados
- pronto para futura substituição do gerador por LLM real
