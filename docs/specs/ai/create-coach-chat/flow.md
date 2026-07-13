# Flow — Create Coach Chat

## 1. Authenticate request

O endpoint valida a sessão com `AuthSessionGuard`.

## 2. Resolve user profile

O fluxo resolve `UserProfile` usando `authUserId`.

## 3. Resolve health context

O fluxo constrói `UserHealthContext` para recuperar sinais de treino, recuperação e nutrição.

Antes de ampliar o contexto, o `Policy Engine` interno determina quais domínios podem ser carregados.
Se o `WorkoutExpert` estiver selecionado, o runtime também usa esses sinais para produzir uma contribuição determinística sobre o estado de treino do usuário.
Se o `NutritionExpert` estiver selecionado, o runtime também usa os sinais de nutrição confiáveis para produzir uma contribuição determinística sobre o estado nutricional do usuário.
Se o `RecoveryExpert` estiver selecionado, o runtime também usa os sinais de recovery confiáveis para produzir uma contribuição determinística sobre readiness, trend e training impact.
Se o `GoalExpert` estiver selecionado, o runtime também usa os sinais determinísticos de progresso, forecast e milestones para contribuir com a leitura do objetivo atual.
Se o `HabitExpert` estiver selecionado, o runtime também usa os sinais determinísticos de consistência comportamental, streaks e padrões para contribuir com a leitura longitudinal do atleta.
Se o `ProgressExpert` estiver selecionado, o runtime também usa os sinais de evolução longitudinal, momentum, plateau e regression para contribuir com a leitura de progresso.
Se o `MotivationExpert` estiver selecionado, o runtime também usa os sinais determinísticos de engajamento comportamental, oportunidade e estratégia para contribuir com a leitura motivacional interna.
Depois da policy evaluation, o `Expert Router` escolhe o especialista primário, os complementares e a ordem determinística de execução antes do `Planning Engine`.
Após a execução dos especialistas, a `Expert Composition Engine` consolida as contribuições determinísticas em uma inteligência unificada antes da construção do prompt.

## 4. Load or create conversation

O sistema busca uma `CoachConversation` do usuário.

Se não existir conversa, uma nova é criada automaticamente.

## 5. Persist user message

A mensagem do usuário é persistida como `CoachMessage` com role `user`.

## 6. Compose expert intelligence

O runtime consolida as contribuições dos especialistas executados em um objeto unificado interno, incluindo recomendações, riscos, conflitos e confiança.

## 7. Generate deterministic reply

O reply é gerado por regras determinísticas simples, usando sinais como:

- `fatigueLevel`
- `recoveryTrend`
- `nutrition guidance`
- `latestCheckIn`
- `WorkoutExpert` contribution metadata quando disponível internamente
- `NutritionExpert` contribution metadata quando disponível internamente
- `RecoveryExpert` contribution metadata quando disponível internamente
- `GoalExpert` contribution metadata quando disponível internamente
- `HabitExpert` contribution metadata quando disponível internamente
- `ProgressExpert` contribution metadata quando disponível internamente
- `MotivationExpert` contribution metadata quando disponível internamente

## 8. Persist assistant message

A resposta do coach é persistida como `CoachMessage` com role `assistant`.

## 9. Return response

O endpoint retorna:

- `conversationId`
- `reply`

## 10. Safety fallback

Quando faltam sinais, o fluxo responde com orientação segura e conservadora, sem claims médicos.
