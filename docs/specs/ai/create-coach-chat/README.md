# Use Case — Create Coach Chat

## 1. Overview

O use-case `create-coach-chat` inicia a camada conversacional do Elev9 Coach com uma resposta contextual baseada em dados do usuário.

O fluxo atual preserva o fallback determinístico, mas já pode consultar um LLM externo de forma opcional através da camada de confiabilidade. Antes disso, a mensagem passa por uma safety layer que faz detecção de injection, redaction de PII e validação de saída. A integração OpenAI usa o Responses API com structured outputs e um parser centralizado para normalizar a resposta antes de persistir. O prompt usado pelo chat é resolvido por um registry interno com versão ativa, versão anterior e canary rollout determinístico. O fluxo persiste uma conversa e mensagens do usuário/assistant, injeta `UserHealthContext` e gera a resposta mais adequada com base em recuperação, treino, nutrição e goal state. A mesma base interna também suporta um transporte de streaming aditivo sem alterar o contrato síncrono público. A partir desta evolução, o use-case pode ser envolvido por um `AgentRuntime` interno que faz policy evaluation, intent classification, context orchestration, memory layering, expert routing, expert observability, planning determinístico, multi-step execution bounded e execução read-only de ferramentas internas antes da construção do prompt, mas permanece desabilitado por padrão sem expor novas DTOs nem mudar o payload público. Quando composição, persona, explainability e observability estiverem disponíveis, o fluxo adiciona uma sequência determinística de inteligência unificada, guidance de comunicação, evidência estruturada e metadata operacional antes do prompt builder.

Esse runtime também considera um registry interno de especialistas do coach apenas como metadata de roteamento e planejamento. O `Expert Router` escolhe o especialista primário, os complementares e a ordem determinística de execução antes do planning engine. O `WorkoutExpert` contribui com análise determinística de treino, o `NutritionExpert` contribui com análise determinística de nutrição, risco e recovery support, o `RecoveryExpert` contribui com análise determinística de recovery, readiness e training impact, o `GoalExpert` contribui com análise determinística de goal progression, forecast, milestones e cross-domain consistency, o `HabitExpert` contribui com análise determinística de behavioral consistency, patterns, streaks, risk e long-term progress, o `ProgressExpert` contribui com análise determinística de longitudinal evolution, momentum, plateau e regression, e o `MotivationExpert` contribui com análise determinística de behavioral engagement, opportunity, strategy e risk. A `Expert Composition Engine` consolida essas contribuições em um objeto interno unificado, a `Coach Persona Engine` traduz essa inteligência em guidance de comunicação e a `Explainability Layer` traduz a inteligência unificada em evidência estruturada antes da construção do prompt, sem alterar o fluxo público.

Quando esse runtime interno está ativo, ele também cria um trace interno por execução para registrar intent, policy, plan, steps, tools e memory snapshots com retenção bounded. O trace é internal-only e não altera a resposta pública.

O uso em produção continua condicionado ao checklist interno de release readiness para manter ativação segura por feature flags.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: create-coach-chat
Canonical name: ai.create-coach-chat
```

---

## 3. Goal

Permitir que um usuário autenticado envie uma mensagem para o coach e receba uma resposta conversacional inicial baseada em contexto atual.

No MVP, o fluxo resolve internamente:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `UserHealthContext` pelo `userProfileId`
- `CoachConversation` ativa pelo `userProfileId`
- `CoachMessage` do usuário e do assistant

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- usar `authUserId` da sessão
- resolver `UserProfile`
- criar `CoachConversation` automaticamente quando necessário
- persistir mensagem do usuário
- sanitizar e minimizar o prompt antes da chamada OpenAI
- gerar resposta por fallback heurístico determinístico quando o LLM não estiver disponível
- consultar LLM externo de forma opcional via camada de confiabilidade
- preparar a classificação de intent e a orquestração de contextos para um `AgentRuntime` interno sem ativação por padrão
- preparar o `Agent Memory Layer` interno com working/session/conversation memory sem alterar o contrato público
- preparar a descoberta de ferramentas internas como metadata apenas, sem execução
- preparar a descoberta de especialistas do coach como metadata apenas, sem execução
- preparar a contribuição determinística do `WorkoutExpert`, `NutritionExpert`, `RecoveryExpert`, `GoalExpert`, `HabitExpert`, `ProgressExpert` e `MotivationExpert` sem alterar o contrato público
- preparar a `Coach Persona Engine` interna para traduzir a inteligência unificada em guidance de comunicação antes da construção do prompt
- preparar a `Explainability Layer` interna para traduzir a inteligência unificada em evidência estruturada antes da construção do prompt
- preparar o planning engine interno para gerar um plano validado e imutável antes do chat existente
- permitir execução read-only de ferramentas internas somente por feature flag, sem mudar a resposta pública
- executar múltiplos passos determinísticos em ordem fixa antes do pipeline existente
- resolver a versão do prompt via registry interno e rollout determinístico
- usar o Responses API com structured outputs e parser centralizado para o provider OpenAI
- registrar trace de requisição, contagem de tokens, custo estimado e guardrails de custo via camada de observabilidade
- validar a saída do modelo antes de persistir
- persistir resposta do assistant
- retornar `conversationId` e `reply`
- reutilizar `BuildUserHealthContextService`
- responder com fallback seguro quando houver poucos dados

Não incluído:

- alterar o contrato síncrono público
- memória longa
- semantic memory
- RAG
- vector database
- multi-agent orchestration
- prompt engineering complexo

---

## 5. Preconditions

- a requisição está autenticada por sessão/JWT
- existe `UserProfile` para o usuário autenticado

Se não houver conversa anterior, o sistema deve criar uma nova automaticamente.

---

## 6. Postconditions

Após sucesso:

- a mensagem do usuário é persistida
- a resposta do assistant é persistida
- uma conversa do usuário é criada se não existia
- o payload público retorna apenas `conversationId` e `reply`

Se a persistência falhar:

- o endpoint falha com `AI_CHAT_INTERNAL_ERROR`
- nenhuma resposta não persistida é tratada como sucesso

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `UserHealthContext`
- `CoachConversation`
- `CoachMessage`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [ai/build-user-health-context](../build-user-health-context/README.md)
- [ai/get-ai-context](../get-ai-context/README.md)
- [ai/generate-coach-feedback](../generate-coach-feedback/README.md)
- [ai/get-coach-feedback-history](../get-coach-feedback-history/README.md)
- [ai/get-coach-chat-history](../get-coach-chat-history/README.md)
- [ai/get-coach-chat-debug](../get-coach-chat-debug/README.md)
- [ai/get-coach-chat-memory-debug](../get-coach-chat-memory-debug/README.md)
- [ai/agent-memory](../agent-memory/README.md)
- [ai/agent-planning](../agent-planning/README.md)
- [ai/experts/workout](../experts/workout/README.md)
- [ai/experts/nutrition](../experts/nutrition/README.md)
- [ai/experts/recovery](../experts/recovery/README.md)
- [ai/experts/goals](../experts/goals/README.md)
- [ai/experts/habits](../experts/habits/README.md)
- [ai/experts/progress](../experts/progress/README.md)
- [ai/experts/motivation](../experts/motivation/README.md)
- [ai/experts/router](../experts/router/README.md)
- [ai/experts/observability](../experts/observability/README.md)
- [ai/experts/composition](../experts/composition/README.md)
- [ai/persona](../persona/README.md)
- [ai/explainability](../explainability/README.md)
- [ai/prompt-builder](../prompt-builder/README.md)
- [ai/release-readiness](../release-readiness/README.md)

---

## 9. Business Value

Este use-case adiciona a primeira interface conversacional do produto com fallback determinístico preservado e LLM opcional para melhorar a resposta quando a infraestrutura estiver disponível.

Ele transforma dados já existentes em interação direta com o coach:

- contexto de recuperação
- awareness de nutrição
- leitura do momento atual do usuário

Isso mantém o produto previsível e permite evolução gradual sem comprometer o fallback determinístico.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint síncrono é `POST /ai/chat`
- o transporte de streaming é aditivo e reusa o mesmo use-case
- o endpoint é protegido por sessão/JWT
- o body aceita apenas `message`
- a conversa é criada automaticamente se não existir
- a resposta é contextual e cai para fallback determinístico quando o LLM não responder
- `UserHealthContext` é resolvido no fluxo
- `CoachMessage` do usuário e do assistant são persistidos
- o cliente recebe somente `conversationId` e `reply`
- o uso de IA externa é opcional e protegido por uma camada de confiabilidade
- a execução do LLM passa por camadas de segurança, confiabilidade e observabilidade antes do provider
- a seleção de prompt e provider pode ser ajustada por canary rollout e rollback por configuração
- o `AgentRuntime` interno permanece desabilitado por padrão e não altera o contrato público
- o `AgentRuntime` interno consulta primeiro o `Policy Engine`, que decide contexto, ferramentas, fallback e limites
- o `AgentRuntime` interno classifica intent, seleciona contextos e delega o carregamento ao contexto loader sem mudar o contrato público
- o `AgentRuntime` interno também cria working/session memory internas e snapshot de memória sem expor isso ao cliente
- o `AgentRuntime` interno também anexa candidatos e seleções de ferramentas internas como metadata, sem executar nada nesta fase
- o `AgentRuntime` interno também anexa candidatos, selecionados e rejeitados de especialistas do coach como metadata, sem executar experts nesta fase
- o `AgentRuntime` interno também executa a `Expert Composition Engine` após os especialistas e antes do prompt builder
- o `AgentRuntime` interno também executa a `Coach Persona Engine` após a composição e antes do prompt builder
- o `AgentRuntime` interno também executa a `Explainability Layer` após a persona e antes do prompt builder
- o `AgentRuntime` interno também anexa a inteligência unificada composta como metadata interna, sem alterar o chat público
- o `AgentRuntime` interno também anexa guidance de persona determinístico como metadata interna, sem alterar o chat público
- o `AgentRuntime` interno também anexa explicações estruturadas determinísticas como metadata interna, sem alterar o chat público
- o `AgentRuntime` interno também anexa o plano validado, a estratégia de execução e os passos planejados como metadata, sem alterar o chat público
- o `AgentRuntime` interno também usa um execution engine multi-step determinístico para refresh de memória e persistência ordenada, sem criar novos planos durante a execução
- o `AgentRuntime` interno também grava um trace interno por requisição com eventos, snapshots e métricas, mas sem expor prompts ou mensagens brutas
- a primeira execução de ferramentas internas é read-only, bounded e internal-only
- as respostas inválidas retornam ao fallback determinístico sem alterar a UX pública

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- persistência simples e consistente
- resposta segura e contextual
- nenhuma mutação de dados de usuário além da conversa
- arquitetura pronta para futura integração com IA generativa
