# Internal Spec - Agent Memory Layer

## 1. Overview

O `Agent Memory Layer` é uma abstração interna do `ai` module que separa a memória de execução curta da memória conversacional persistida.

Ele existe para suportar o runtime de agente sem introduzir semantic memory, embeddings, vector database ou RAG.

O layer também serve como base para o execution engine multi-step, que atualiza working memory após cada passo e captura snapshots determinísticos ao longo da execução.

O `Policy Engine` governa quando cada escopo de memória pode ser criado, atualizado ou expirado, sem duplicar regras de governança em outros serviços.

O objetivo é manter a arquitetura determinística enquanto o agente passa a operar com três escopos internos:

- `Working Memory`
- `Session Memory`
- `Conversation Memory`

Essa camada é internal-only e não altera DTOs públicos, contratos mobile ou o payload síncrono do chat.

O rollout dessa camada segue o checklist interno de release readiness:

- [Release Readiness](../release-readiness/README.md)

---

## 2. Memory Scopes

### Working Memory

Memória por requisição.

Contém:

- request sanitizado
- intent detectado
- context domains selecionados
- tools selecionadas
- plano de execução
- tool results normalizados
- runtime metadata

Lifetime:

- uma única execução
- destruída ao final do fluxo

### Session Memory

Memória por conversa, com retenção curta e bounded.

Contém:

- recent goals
- recent coach decisions
- recent tool results
- temporary preferences
- recent execution summaries

O retention policy é configurado por:

- `AI_AGENT_SESSION_MEMORY_MAX_ITEMS`
- `AI_AGENT_SESSION_MEMORY_TTL_MS`

### Conversation Memory

Reutiliza a memória persistida existente.

Não substitui o repositório atual e não muda a estratégia de sumarização.

---

## 3. Lifecycle

Eventos internos rastreados:

- `CREATE`
- `UPDATE`
- `READ`
- `SNAPSHOT`
- `CLEAR`
- `EXPIRE`

Esses eventos são usados apenas para observability interna e debugging do runtime.

---

## 4. Snapshot

O `Agent Memory Snapshot` é uma visão read-only do estado atual da execução:

- `workingMemory`
- `sessionMemory`
- `conversationMemory`
- `metadata`

O snapshot é imutável depois de criado.

---

## 5. Trace Integration

O `AgentTraceService` captura o snapshot de memória como parte do trace interno do agente.

Ele registra apenas metadados sanitizados:

- tamanho do working memory
- tamanho do session memory
- tamanho do conversation memory
- flags de snapshot e expiration
- lifecycle events internos

Nenhum prompt bruto, mensagem bruta ou payload sensível é persistido no trace.

---

## 6. Rationale

- manter o runtime determinístico
- evitar semantic retrieval antes da arquitetura estar estável
- limitar o blast radius da evolução do agente
- preservar o contrato público do chat
- preparar um futuro pipeline de tool orchestration sem reestruturar o chat novamente

---

## 7. Related Docs

- [AI Specs Index](../README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
- [Release Readiness](../release-readiness/README.md)
- [ADR-010 — AI Agent Platform Core Architecture](../../../adr/adr-010-ai-agent-platform-core-architecture.md)
