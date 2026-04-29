# Phase 0 Checklist — Elev9 Coach

## 1. Goal

Preparar a base do projeto para iniciar implementação do MVP com segurança e clareza.

Phase 0 não entrega valor final ao usuário. Ela reduz risco de execução.

---

## 2. Architecture Checklist

- [ ] Confirmar `modular monolith` como arquitetura do MVP
- [ ] Confirmar `NestJS` como backend principal
- [ ] Confirmar `React Native` como app mobile
- [ ] Confirmar `MongoDB` como banco principal
- [ ] Confirmar `Mongoose` como camada de modelagem
- [ ] Confirmar ausência de `Redis` no MVP

---

## 3. Documentation Checklist

- [ ] Revisar visão de produto
- [ ] Revisar escopo do MVP
- [ ] Revisar bounded contexts
- [ ] Normalizar `entities.md`
- [ ] Normalizar `domain-model.md`
- [ ] Fechar decisão de `register-user`
- [ ] Preencher arquitetura complementar
- [ ] Preencher roadmap
- [ ] Preencher templates de spec

---

## 4. Domain Checklist

- [ ] Definir ownership entre `Auth` e `Users`
- [ ] Definir entidades centrais do MVP
- [ ] Definir regra de um check-in por dia
- [ ] Definir regra de um plano ativo por usuário
- [ ] Definir responsabilidades do `AI Agent Module`

---

## 5. Backend Preparation Checklist

- [ ] Definir estrutura de módulos NestJS
- [ ] Definir convenções de pastas
- [ ] Definir padrão de use-case
- [ ] Definir padrão de repository interface
- [ ] Definir padrão de schema Mongoose
- [ ] Definir estratégia de validação de DTOs
- [ ] Definir estratégia de tratamento de erros

---

## 6. Frontend Preparation Checklist

- [ ] Definir app mobile como `React Native`
- [ ] Definir fluxo inicial de autenticação
- [ ] Definir telas mínimas do MVP
- [ ] Definir contrato inicial de integração com backend

---

## 7. AI Preparation Checklist

- [ ] Definir uso inicial da OpenAI API
- [ ] Definir formato de `UserHealthContext`
- [ ] Definir resposta estruturada para recomendações
- [ ] Definir limites claros do uso de IA no MVP

---

## 8. Exit Criteria

Phase 0 está concluída quando:

- [ ] stack está fechada
- [ ] arquitetura está documentada
- [ ] modelo de domínio está consistente
- [ ] primeira spec implementável está pronta
- [ ] time consegue iniciar código sem ambiguidade estrutural

---

## 9. Summary

Phase 0 serve para transformar a ideia em um projeto executável, sem antecipar complexidade desnecessária.
