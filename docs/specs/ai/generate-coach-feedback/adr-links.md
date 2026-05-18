# ADR Links — Generate Coach Feedback

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `generate-coach-feedback`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Modular Monolith for MVP

Decision:

```txt
Modular Monolith
```

Impact:

- o use-case roda dentro do backend principal
- comunicação entre contextos continua direta e explícita

### ADR-002 — NestJS Backend

Decision:

```txt
NestJS
```

Impact:

- organização por módulos
- controller e DI padronizados

### ADR-003 — MongoDB as Primary Database

Decision:

```txt
MongoDB
```

Impact:

- leitura de `WorkoutLogs`, `TrainingPlans`, `UserProfile` e `FitnessProfile`
- nenhuma mutação adicional necessária para o MVP

### ADR-004 — Session-Protected AI Coach Access

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Resolve Coaching Through Existing User Data

Decision:

```txt
AuthUser -> UserProfile -> active FitnessProfile -> TrainingPlan -> WorkoutLogs -> ProgressSummary
```

Impact:

- evita ids vindos do cliente
- reutiliza dados já existentes

### ADR-006 — Deterministic AI Coach MVP

Decision:

```txt
Start without LLM
Use rule-based text generation
```

Impact:

- entrega rápida
- previsibilidade
- testabilidade alta
- sem custo externo de IA no MVP

### ADR-007 — Fixed 7-Day UTC Coaching Window

Decision:

```txt
Use the last 7 calendar days including today in UTC
```

Impact:

- frequência e consistência ficam previsíveis
- `WorkoutLog.date` é interpretado como `YYYY-MM-DD` UTC
- `startDate` e `endDate` são inclusivos

### ADR-008 — Frequency Derived From FitnessProfile

Decision:

```txt
Prefer trainingAvailability.daysPerWeek
Fallback to activityLevel heuristics
```

Impact:

- a frequência esperada fica alinhada ao perfil do usuário
- o MVP continua funcionando mesmo com dados incompletos

### ADR-009 — Keep Nutrition Out of AI Coach MVP

Decision:

```txt
Do not read Nutrition
Do not generate nutrition recommendations
```

Impact:

- reduz acoplamento entre contextos
- mantém o MVP focado em treino e progresso

### ADR-010 — Strict Empty Body Contract

Decision:

```txt
Reject extra body fields with AI_COACH_INVALID_INPUT
```

Impact:

- contrato HTTP fica fechado
- evita ambiguidade entre ignorar ou aceitar campos indevidos

### ADR-011 — Future Evolution to External LLM

Decision:

```txt
Keep output contract stable
Swap generator later
```

Impact:

- o contrato `message + insights + recommendations` já prepara a evolução
- no futuro pode haver OpenAI, multi-agent system e chat interface

### ADR-012 — Read-Only Coaching

Decision:

```txt
No mutation
Read-only feedback generation
```

Impact:

- reduz risco
- preserva regras de negócio existentes

---

## 3. Suggested Future ADRs

### FUTURE-ADR-001 — Integrate OpenAI Provider

Tema:

- trocar gerador determinístico por LLM

### FUTURE-ADR-002 — Multi-Agent Coaching System

Tema:

- separar agentes de análise, plano e motivação

### FUTURE-ADR-003 — Conversational Coach Interface

Tema:

- adicionar chat contínuo para coaching

---

## 4. Summary

As decisões principais que impactam `generate-coach-feedback` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- modular monolith
- NestJS
- MongoDB com Mongoose
- proteção por sessão JWT
- geração determinística sem LLM no MVP
- resolução via dados já existentes
- evolução futura para IA real com contrato estável
