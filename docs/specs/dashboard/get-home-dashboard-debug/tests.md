# Tests — Get Home Dashboard Debug

## 1. Overview

Este documento descreve a cobertura mínima esperada para o use-case `get-home-dashboard-debug`.

---

## 2. Unit Tests

- retorna snapshot adaptativo com sucesso
- retorna `recoverySignals` corretos
- retorna `nutrition.signals` corretos
- retorna `generatedAt` em formato ISO
- falha sem `UserProfile`
- falha com sessão inválida

---

## 3. Integration Tests

- endpoint autenticado retorna payload interno
- endpoint respeita isolamento por usuário
- endpoint mantém payload público separado

---

## 4. Regression Concerns

- não reintroduzir `debug` no payload público
- não alterar o contrato de `GET /dashboard/home`
- não duplicar heurística de recovery/nutrition
