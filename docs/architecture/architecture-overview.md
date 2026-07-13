# 🏗️ Architecture Overview — Elev9 Coach (MVP)

## 1. Overview

A arquitetura atual do Elev9 Coach é projetada para:

- ser simples de implementar
- permitir iteração rápida
- validar o produto o mais cedo possível
- manter o coach contextual e explicável em mobile

---

## 2. MVP Architecture (Simplified)

Mobile App (React Native)
↓
API Layer (NestJS)
↓
Application Services / Read Models
↓
MongoDB

---

## 3. Key Principle

👉 **Start simple, scale later**

A arquitetura deve permitir evolução futura, mas sem introduzir complexidade desnecessária no início.

---

## 4. Application Structure

Em vez de microservices distribuídos, usamos um **modular monolith**:

src/
modules/
auth/
users/
fitness/
training/
nutrition/
progress/
recovery/
goals/
habits/
personalization/
notifications/
ai/

Cada módulo contém:

- controllers
- services
- use-cases
- schemas (MongoDB)
- specs

---

## 5. Communication Model

### MVP

- Comunicação direta (function calls / services)
- Sem message broker
- Sem event bus

---

## 6. Database

### MongoDB (Primary Database)

MongoDB é usado por:

- flexibilidade de schema
- dados aninhados (treinos, planos, refeições)
- rápida iteração

---

## 7. AI Integration

### AI / Coach Layer

Responsável por:

- construir contexto do usuário
- expor coach decisions
- consumir recovery, goals, habits, personalization, and notifications
- renderizar experiências de coaching contextual no mobile
- aplicar uma safety layer para sanitização de prompt, detecção de injection, redaction de PII e validação de saída
- consultar OpenAI de forma opcional por meio de uma camada de confiabilidade que aplica timeout, retry, circuit breaker, kill switch e fallback determinístico
- usar o Responses API da OpenAI com structured outputs, parser centralizado de resposta e metadata de capabilities para manter compatibilidade com GPT-5.5 e modelos futuros
- registrar traces operacionais, contagem de tokens, custo estimado e guardrails de custo por requisição através de uma camada de observabilidade interna
- expor um transporte de streaming aditivo para chat contextual sem alterar o contrato síncrono existente
- manter registry de versões de prompt, rollout canário determinístico, rollback por configuração e evaluation runner interno
- operar um `AgentRuntime` interno com policy, context orchestration, planning, execution, memory e trace, tudo behind feature flags
- operar um `CoachExpertRegistry` interno com roteamento determinístico de especialistas do coach, apenas como metadata de planejamento
- operar um `CoachExpertRouter` interno para primary/complementary expert selection, dependency ordering and route validation
- operar o `WorkoutExpert` interno como especialista determinístico de treino, com contribuição estruturada e sem alterar o plano do usuário
- operar o `NutritionExpert` interno como especialista determinístico de nutrição, com contribuição estruturada e sem alterar o plano do usuário
- operar o `RecoveryExpert` interno como especialista determinístico de recovery, com contribuição estruturada e sem alterar o plano do usuário
- operar o `GoalExpert` interno como especialista determinístico de progresso de metas, milestones e forecast, com contribuição estruturada e sem alterar o plano do usuário
- operar o `HabitExpert` interno como especialista determinístico de consistência comportamental, streaks e padrões, com contribuição estruturada e sem alterar o plano do usuário
- operar o `ProgressExpert` interno como especialista determinístico de evolução longitudinal, momentum, plateau e regression, com contribuição estruturada e sem alterar o plano do usuário
- operar o `MotivationExpert` interno como especialista determinístico de engajamento comportamental, oportunidade motivacional e estratégia interna, com contribuição estruturada e sem alterar o plano do usuário
- operar a `Expert Composition Engine` interna para consolidar as contribuições dos especialistas em uma inteligência unificada antes da construção do prompt

### Fluxo da IA

1. Coleta dados do usuário:
   - fitness profile
   - training plan
   - nutrition plan
   - check-ins
   - recovery
   - goals
   - habits
   - personalization
   - notification decisions

2. Monta contexto

3. Produz read models, aplica safety checks, registra telemetria operacional interna, considera especialistas do coach como metadata de planejamento, aplica o `CoachExpertRouter` para ordenar a execução determinística, executa o `WorkoutExpert`, o `NutritionExpert`, o `RecoveryExpert`, o `GoalExpert`, o `HabitExpert`, o `ProgressExpert` e o `MotivationExpert`, consolida as contribuições pela `Expert Composition Engine` e gera resposta conversacional determinística, assistida por LLM ou transmitida por streaming quando habilitado

4. O mobile renderiza a experiência de coach

---

## 8. Core Data Loop

INPUT:

- treino realizado
- alimentação
- check-in diário
- goal progress
- habit signals
- notification engagement

↓

PROCESS:

- context aggregation
- coach decisioning
- explainable summarization

↓

OUTPUT:

- ajuste de treino
- ajuste alimentar
- briefing diário
- conversa contextual
- weekly review

---

## 9. What is NOT included (MVP)

Para manter simplicidade:

- ❌ Microservices distribuídos
- ❌ Redis
- ❌ Event-driven architecture
- ❌ Message brokers (NATS, Kafka)
- ❌ Complex caching layers

---

## 10. Future Architecture Evolution

Após validação do MVP:

### Step 1 — Extract Services

- separar auth, users, etc.

### Step 2 — Introduce Redis

- cache
- event bus

### Step 3 — Event-driven

- notifications
- analytics

---

## 11. Scalability Strategy

O sistema será evoluído gradualmente:

MVP:
→ Modular monolith

Growth:
→ Hybrid (modular + alguns serviços separados)

Scale:
→ Microservices completos

---

## 12. Security (MVP)

- JWT authentication
- validação de inputs
- proteção básica de endpoints

---

## 13. Summary

A arquitetura do MVP é:

- Simples
- Modular
- Baseada em MongoDB
- Com IA integrada diretamente

Ela permite:

👉 validar o produto rapidamente  
👉 evoluir para microservices sem refatoração massiva
