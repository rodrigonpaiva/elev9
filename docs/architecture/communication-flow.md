# Communication Flow — Elev9 Coach

## 1. Overview

Este documento descreve como os componentes do MVP se comunicam.

No MVP, a comunicação é deliberadamente simples:

- app mobile para backend via HTTP
- módulos internos via chamadas diretas
- backend para MongoDB via Mongoose
- backend para OpenAI via API

Não há `Redis`, event bus, filas ou microservices distribuídos.

---

## 2. High-Level Flow

```txt
React Native App
   ->
NestJS HTTP API
   ->
Application Services / Use-Cases
   ->
MongoDB

NestJS AI Agent Module
   ->
OpenAI API
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
POST /ai/coach/message
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
- centralizar lógica de adaptação no `AI Agent Module`

---

## 5. Persistence Communication

### Backend to Database

- `NestJS -> Mongoose -> MongoDB`

### Persistence Style

- `AuthUser`, `UserProfile`, logs e check-ins em coleções próprias
- `TrainingPlan` e `NutritionPlan` podem conter estruturas aninhadas

---

## 6. AI Communication

### Backend to OpenAI

O `AI Agent Module`:

1. coleta contexto do usuário
2. monta `UserHealthContext`
3. gera prompt
4. chama a OpenAI API
5. valida output
6. persiste recomendação ou ajuste quando necessário

### AI Constraints in MVP

- prompts simples
- sem multi-agent orchestration complexa
- sem memória distribuída
- sem fila assíncrona obrigatória

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
AI Agent builds context
   ->
OpenAI API
   ->
AIRecommendation / PlanAdjustment
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
