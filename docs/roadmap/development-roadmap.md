# Development Roadmap — Elev9 Coach

## 1. Overview

Este roadmap organiza a evolução do MVP do Elev9 Coach em fases objetivas.

Princípios:

- validar cedo
- manter simplicidade
- evitar overengineering
- priorizar o loop principal do produto

---

## 2. Target MVP Loop

O MVP só é válido se este loop funcionar:

```txt
Register
-> Create profile
-> Receive training and nutrition plan
-> Perform daily check-in
-> Adapt recommendations
-> Return next day
```

---

## 3. Phase 0 — Foundations

Objetivo:

estabelecer a base técnica e documental do projeto.

Entregas:

- stack definida (`React Native`, `NestJS`, `MongoDB`, `Mongoose`)
- documentação saneada
- estrutura inicial do backend modular
- convenções de módulos, pastas e specs

Saída esperada:

- time alinhado
- arquitetura clara
- primeiras specs prontas para implementação

---

## 4. Phase 1 — Authentication and User Identity

Objetivo:

permitir entrada segura do usuário no sistema.

Entregas:

- `auth/register-user`
- `auth/login-user`
- sessão JWT
- `users/create-user-profile`
- `users/get-user-profile`

Critério de saída:

- usuário consegue criar conta
- usuário consegue fazer login
- usuário consegue criar perfil funcional

---

## 5. Phase 2 — Fitness and Nutrition Profiles

Objetivo:

coletar contexto inicial suficiente para personalização.

Entregas:

- `fitness/create-fitness-profile`
- `fitness/update-fitness-profile`
- `nutrition/create-nutrition-profile`
- `nutrition/update-nutrition-profile`

Critério de saída:

- sistema conhece objetivo, nível, limitações, disponibilidade e restrições alimentares do usuário

---

## 6. Phase 3 — Plan Generation

Objetivo:

entregar valor inicial com plano de treino e plano alimentar.

Entregas:

- geração de `TrainingPlan`
- geração de `NutritionPlan`
- consulta de treino do dia
- consulta de refeições do dia

Critério de saída:

- usuário recebe plano semanal utilizável

---

## 7. Phase 4 — Daily Check-In and Adaptation

Objetivo:

validar o diferencial central do produto.

Entregas:

- `progress/create-daily-check-in`
- cálculo simples de aderência
- construção de `UserHealthContext`
- recomendações da IA
- ajustes simples de treino e nutrição

Critério de saída:

- o sistema adapta recomendações com base em comportamento recente

---

## 8. Phase 5 — Dashboard and Iteration

Objetivo:

melhorar percepção de valor e retenção.

Entregas:

- dashboard inicial
- histórico simples
- visão de progresso
- refino de UX com base em uso real

Critério de saída:

- usuário consegue entender o que fazer hoje e perceber evolução

---

## 9. Out of Scope for MVP

Não entram antes da validação do loop principal:

- pagamentos
- assinaturas
- marketplace
- gamificação avançada
- integrações com wearables
- Redis
- microservices distribuídos

---

## 10. Suggested Execution Order

```txt
Phase 0 -> Foundations
Phase 1 -> Auth + Users
Phase 2 -> Fitness + Nutrition profiles
Phase 3 -> Plan generation
Phase 4 -> Check-in + Adaptation
Phase 5 -> Dashboard + Retention loop
```

---

## 11. Success Metrics

Sinais de sucesso do MVP:

- usuário completa cadastro e perfil
- usuário recebe planos
- usuário faz check-in diário
- sistema adapta recomendações
- usuário retorna no dia seguinte

---

## 12. Summary

O roadmap mantém foco no que precisa ser provado primeiro:

um coach fitness adaptativo simples, útil e recorrente.
