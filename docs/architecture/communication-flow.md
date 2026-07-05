# Communication Flow — Elev9 Coach

## 1. Overview

Este documento descreve como os componentes do MVP se comunicam.

No MVP, a comunicação é deliberadamente simples:

- app mobile para backend via HTTP
- módulos internos via chamadas diretas
- backend para MongoDB via Mongoose

Não há `Redis`, event bus, filas ou microservices distribuídos.

---

## 2. High-Level Flow

```txt
React Native App
   ->
NestJS HTTP API
   ->
Application Services / Read Models
   ->
MongoDB
```

---

## 3. Client to Backend Communication

### Channel

- `HTTPS`

### Style

- `REST`

### Examples

```txt
POST /auth/register
POST /auth/login
POST /users/profile
GET  /training/today
POST /progress/daily-check-in
POST /ai/chat
POST /ai/chat/stream
GET  /ai/chat/history
GET  /ai/coach-decision/today
GET  /notifications/today
GET  /personalization/today
GET  /habits/today
```

---

## 4. Internal Module Communication

### Communication Model

Dentro do backend NestJS:

- controllers chamam use-cases
- use-cases dependem de serviços e repositórios
- módulos se comunicam por interfaces e serviços internos

### Rules

- preferir dependências explícitas
- evitar acoplamento circular
- evitar que `Auth` conheça regras de domínio fitness/nutrition
- centralizar a lógica de adaptação e coach no conjunto de read models do produto

---

## 5. Persistence Communication

### Backend to Database

- `NestJS -> Mongoose -> MongoDB`

### Persistence Style

- `AuthUser`, `UserProfile`, logs e check-ins em coleções próprias
- `TrainingPlan` e `NutritionPlan` podem conter estruturas aninhadas

---

## 6. AI Communication

### Backend to Coach Read Models

The coach layer:

1. collects the current user context
2. builds `CoachDecision`, `NotificationDecision`, `PersonalizationSnapshot`, `HabitSnapshot`, and `Goal` reads
3. exposes those read models to mobile
4. lets the mobile app render coach home, briefing, memory, insights, chat, review, guidance, and nudges

### AI Constraints in the current implementation

- deterministic read models
- prompt safety layer for injection detection, PII redaction, context minimization, and output validation
- optional OpenAI-assisted chat generation behind a reliability layer
- OpenAI Responses API with structured outputs and a centralized response parser
- internal observability for request traces, token accounting, cost guardrails, and structured logs
- optional streaming transport over the same chat use-case when the feature flag is enabled
- internal prompt version registry, deterministic canary rollout, and rollback-ready provider selection
- no exposed prompt internals
- no distributed memory layer
- no mandatory async queue

---

## 7. Core Product Flows

### 7.1 Register User

```txt
Mobile App
   ->
POST /auth/register
   ->
Auth Controller
   ->
RegisterUserUseCase
   ->
AuthUserRepository
   ->
MongoDB
```

### 7.2 Create User Profile

```txt
Mobile App
   ->
POST /users/profile
   ->
Users Controller
   ->
CreateUserProfileUseCase
   ->
UserProfileRepository
   ->
MongoDB
```

### 7.3 Daily Check-In and Adaptation

```txt
Mobile App
   ->
POST /progress/daily-check-in
   ->
Progress Module
   ->
DailyCheckIn saved
   ->
Coach read model builds context
   ->
Coach guidance / PlanAdjustment
   ->
Training or Nutrition update
```

---

## 8. Error Flow

No MVP:

- erros de validação retornam da API com códigos estáveis
- erros internos são logados no backend
- respostas ao cliente não devem expor detalhes internos

---

## 9. What Is Explicitly Not Used

O MVP não usa:

- `Redis`
- pub/sub
- Kafka
- NATS
- websocket obrigatório
- saga orchestration

---

## 10. Summary

O fluxo de comunicação do MVP é síncrono e simples.

Toda a comunicação principal passa por um backend NestJS único, com módulos internos acoplados apenas pelo necessário e sem infraestrutura distribuída adicional.
