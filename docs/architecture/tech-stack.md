# Tech Stack — Elev9 Coach

## 1. Overview

Este documento define a stack tecnológica do MVP do Elev9 Coach.

O objetivo é manter uma base simples, coerente e rápida de evoluir.

---

## 2. Guiding Principles

A stack do MVP deve:

- reduzir complexidade operacional
- favorecer produtividade
- suportar mobile-first
- permitir evolução futura

Decisão central:

```txt
Modular Monolith first. Scale later.
```

---

## 3. Frontend

### Mobile App

- `React Native`

Motivos:

- foco mobile-first
- compartilhamento de conhecimento com ecossistema React
- entrega rápida para iOS e Android

### State and UI

No MVP, a escolha deve permanecer simples e pragmática.

Diretriz:

- evitar sobreengenharia em state management
- preferir bibliotecas consolidadas e leves

---

## 4. Backend

### API Framework

- `NestJS`

Motivos:

- modularidade clara
- injeção de dependência nativa
- boa organização para use-cases, controllers e providers
- encaixe natural com arquitetura de `modular monolith`

### API Style

- `REST` no MVP

Exemplos:

- `POST /auth/register`
- `POST /auth/login`
- `GET /training/today`

---

## 5. Database

### Primary Database

- `MongoDB`

Motivos:

- schema flexível
- boa aderência a documentos aninhados
- rapidez de iteração no MVP

### ODM

- `Mongoose`

Motivos:

- integração madura com NestJS
- schemas explícitos
- índices e validações de persistência

---

## 6. AI Integration

### Provider

- `OpenAI API`

Uso no MVP:

- chat com coach IA
- chat com nutrition IA
- recomendações simples
- adaptação básica de planos

Diretrizes:

- prompts simples
- outputs estruturados para persistência
- sem pipeline complexo de agentes no MVP

---

## 7. Authentication and Security

### Authentication

- `JWT`

### Password Hashing

- `bcrypt`

### Validation

- validação de DTOs no backend

---

## 8. Infrastructure

### Runtime

- `Node.js`

### Deployment Style

- backend único
- app mobile separado
- banco MongoDB gerenciado conforme necessidade do ambiente

### Observability

No MVP:

- logs estruturados básicos
- monitoramento simples

---

## 9. Explicitly Out of Scope for MVP

Não entram no MVP:

- `Redis`
- event bus
- Kafka
- NATS
- microservices distribuídos
- processamento assíncrono complexo
- cache distribuído

---

## 10. Suggested Stack Summary

```txt
Mobile: React Native
Backend: NestJS
Database: MongoDB
ODM: Mongoose
Auth: JWT
Password Hashing: bcrypt
AI: OpenAI API
Architecture: Modular Monolith
Cache/Event Bus: None in MVP
```

---

## 11. Summary

O MVP do Elev9 Coach usa uma stack deliberadamente simples:

- `React Native` no app mobile
- `NestJS` no backend
- `MongoDB + Mongoose` na persistência
- `OpenAI API` para IA
- sem `Redis` e sem microservices distribuídos no MVP
