# 🚀 MVP Scope — Elev9 Coach

## 1. Objective of the MVP

O objetivo do MVP é validar a proposta central do produto:

👉 Um sistema que adapta treino e alimentação com base no comportamento diário do usuário.

O MVP NÃO deve ser completo.

Ele deve ser:

- simples
- funcional
- testável com usuários reais
- rápido de evoluir

---

## 2. Core Hypothesis

Se oferecermos:

- planos de treino personalizados
- planos alimentares personalizados
- adaptação baseada em check-in diário

Então:

👉 usuários irão perceber valor e continuar usando o app.

---

## 3. Core Features (IN SCOPE)

### 3.1 Authentication

- Register user
- Login user
- Session management

---

### 3.2 User Profile

- Nome
- Idade
- Peso
- Altura
- Objetivo (perder peso, ganhar massa, etc.)

---

### 3.3 Fitness Profile

- Nível (iniciante/intermediário)
- Disponibilidade semanal
- Equipamentos disponíveis
- Limitações físicas (lesões)

---

### 3.4 Nutrition Profile

- Preferências alimentares
- Restrições (alergias, dietas)
- Objetivo nutricional

---

### 3.5 Training Plan

- Geração de plano semanal
- Treino do dia
- Lista de exercícios
- Possibilidade de marcar treino como:
  - concluído
  - pulado

---

### 3.6 Nutrition Plan

- Geração de plano alimentar semanal
- Refeições do dia
- Substituição simples de refeições

---

### 3.7 Daily Check-in (CORE FEATURE)

Elemento MAIS importante do MVP.

Campos:

- Energia (1–5)
- Qualidade do sono
- Dor muscular
- Treino realizado (sim/não)
- Alimentação seguida (sim/não)

---

### 3.8 AI Interaction (Simplified)

- Chat com Coach IA
- Chat com Nutrition IA

Uso inicial:

- responder perguntas
- dar recomendações simples

---

### 3.9 Plan Adaptation (CORE VALUE)

Com base no check-in:

- Ajustar intensidade do treino
- Ajustar volume
- Ajustar sugestões alimentares

👉 Esse é o diferencial principal do produto.

---

### 3.10 Dashboard

- Treino do dia
- Refeições do dia
- Status do usuário
- Histórico simples

---

## 4. Features OUT of Scope (IMPORTANT)

Essas features NÃO entram no MVP:

### ❌ Complexidade desnecessária

- Sistema de pagamentos
- Assinaturas
- Marketplace
- Sistema social
- Gamificação avançada
- Notificações inteligentes complexas

---

### ❌ IA avançada demais

- Safety Agent completo
- Machine learning próprio
- Recomendações clínicas
- Diagnóstico de saúde

---

### ❌ Integrações externas

- Apple Health
- Google Fit
- Wearables
- APIs externas complexas

---

## 5. MVP Architecture Constraints

Para evitar overengineering:

- Pode começar com lógica simplificada de IA
- Pode usar prompts básicos (sem fine-tuning)
- Pode evitar microservices completos no início (mesmo se a estrutura já existir)
- Priorizar entrega sobre perfeição

---

## 6. Success Criteria

O MVP será considerado válido se:

- Usuário consegue criar conta
- Usuário recebe plano de treino
- Usuário recebe plano alimentar
- Usuário faz check-in diário
- Sistema adapta recomendações

E principalmente:

👉 Usuário volta no dia seguinte

---

## 7. Anti-Goals

O MVP NÃO deve:

- Ser perfeito
- Ter UX final
- Ter arquitetura final
- Cobrir todos os casos

---

## 8. MVP Philosophy

"Build the smallest thing that proves the idea."

Se não ajuda a validar isso:

👉 não entra no MVP

---

## 9. Summary

O MVP do Elev9 Coach é focado em um único loop:

1. Usuário recebe plano
2. Usuário executa
3. Usuário faz check-in
4. Sistema adapta

Se esse loop funciona:

👉 o produto tem futuro

Se não funciona:

👉 nada mais importa
