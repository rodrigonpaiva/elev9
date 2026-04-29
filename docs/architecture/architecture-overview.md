# 🏗️ Architecture Overview — Elev9 Coach (MVP)

## 1. Overview

A arquitetura do MVP do Elev9 Coach é projetada para:

- Ser simples de implementar
- Permitir iteração rápida
- Validar o produto o mais cedo possível

Embora o sistema final seja baseado em microservices, o MVP adota uma abordagem simplificada.

---

## 2. MVP Architecture (Simplified)

Mobile App (React Native)
        ↓
API Layer (NestJS)
        ↓
Application Services (modular, dentro do mesmo projeto)
        ↓
MongoDB
        ↓
OpenAI API

---

## 3. Key Principle

👉 **Start simple, scale later**

A arquitetura deve permitir evolução futura, mas sem introduzir complexidade desnecessária no início.

---

## 4. Application Structure (MVP)

Em vez de microservices distribuídos, usamos um **modular monolith**:

src/
  modules/
    auth/
    users/
    fitness/
    training/
    nutrition/
    ai-agent/
    progress/

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

### AI Agent Module

Responsável por:

- construir contexto do usuário
- gerar prompts
- chamar OpenAI API
- processar respostas

---

### Fluxo da IA

1. Coleta dados do usuário:
   - fitness profile
   - training plan
   - nutrition plan
   - check-ins

2. Monta contexto

3. Gera prompt

4. Chama OpenAI

5. Retorna resposta

---

## 8. Core Data Loop

INPUT:

- treino realizado
- alimentação
- check-in diário

↓

PROCESS:

- AI Agent analisa

↓

OUTPUT:

- ajuste de treino
- ajuste alimentar

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
