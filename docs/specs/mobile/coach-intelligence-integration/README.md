# Coach Intelligence Integration

## 1. Overview

Este spec documenta como a aplicação mobile consome a camada completa de Coach Intelligence sem alterar contratos públicos, navegação ou a linguagem visual existente.

O mobile continua dependente dos mesmos endpoints REST. A integração adiciona mapeamento local para inteligência unificada, guidance de persona e explicações estruturadas já expostas pelo backend.

---

## 2. Integration Goals

- consumir Unified Coach Intelligence nas superfícies principais do coach
- reutilizar hooks e componentes já existentes
- manter compatibilidade com DTOs atuais
- evitar reconstrução de lógica de especialistas no mobile
- preservar fallback determinístico, offline mode e loading states
- manter acessibilidade, performance e navegação intactas

---

## 3. DTO Compatibility

O mobile não exige breaking changes.

Quando novos campos chegam da API, eles devem ser tratados de forma retrocompatível:

- campos antigos permanecem válidos
- campos novos são opcionais no consumo mobile
- o fallback legado continua funcionando
- nenhum contrato móvel é removido

---

## 4. Shared Hook Architecture

Os hooks de coach devem concentrar todo o mapeamento:

- `use-dashboard`
- `use-coach-home`
- `use-coach-daily-briefing`
- `use-coach-insights`
- `use-coach-weekly-review`
- `use-coach-goal-guidance`
- `use-coach-conversation`
- `use-ask-coach`
- `use-coach-memory-timeline`
- `use-coach-notifications`

Helper functions compartilhadas continuam sendo a única camada que entende o shape unificado derivado no mobile.

---

## 5. Shared Component Architecture

Componentes compartilhados devem renderizar a inteligência sem interpretar regras de domínio:

- `CoachInsightCard`
- `CoachRecommendationCard`
- `CoachRiskBadge`
- `CoachConfidenceBadge`
- `CoachEvidenceList`
- `CoachPriorityBanner`
- `CoachSection`

Esses componentes recebem dados já preparados pelos hooks.

---

## 6. Screen Integration

### 6.1 Coach Conversation

- mostra foco, risco, confiança, persona e top recommendation
- usa explanation summary para contexto de conversa
- não expõe traces, routing, policies, prompts ou metadata interna

### 6.2 Coach Home

- mostra insight unificado do dia
- mostra current focus, current risk, confidence e supporting evidence summary
- mantém a hierarquia visual existente

### 6.3 Daily Briefing

- consome UnifiedCoachIntelligence para formar a síntese diária
- prioriza recomendações unificadas em vez de sinais fragmentados

### 6.4 Dashboard

- exibe a principal leitura de coach como um card unificado
- mostra risco, confiança, recomendação e evidência resumida

### 6.5 Weekly Review

- reaproveita composição e findings unificados
- destaca strengths, attention areas, progress e consistency

### 6.6 Goal Guidance

- usa a inteligência unificada para traduzir goal, progress, habit e motivation

### 6.7 Coach Insights

- renderiza findings, risks, conflicts e evidence sem reconstrução local

### 6.8 Smart Notifications

- prioriza safety, recovery, workout, nutrition, goals, progress e motivation

### 6.9 Ask Coach

- injeta contexto unificado, persona e explanation summary
- não depende de lógica específica da tela

### 6.10 Memory Timeline

- expõe apenas memória segura para usuário
- oculta traces, routing, runtime metadata e detalhes internos

---

## 7. Offline and Fallback Behavior

- manter fallback determinístico quando a API falhar
- preservar cache e respostas antigas
- continuar suportando loading states e retry
- evitar quebrar telas quando campos novos estiverem ausentes

---

## 8. Accessibility and Performance

- manter labels e hints acessíveis
- preservar suporte a VoiceOver, TalkBack e Dynamic Type
- evitar recriação de objetos grandes em cada render
- centralizar transformações para reduzir rerenders

---

## 9. Safety Boundaries

O mobile não deve expor:

- chain of thought
- prompts
- traces
- routing decisions
- policy metadata
- runtime execution metadata

Somente inteligência segura para usuário deve atravessar a interface.
