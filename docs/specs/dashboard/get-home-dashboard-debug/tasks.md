# Tasks — Get Home Dashboard Debug

## 1. Overview

Este documento registra as tarefas associadas ao use-case `get-home-dashboard-debug`.

---

## 2. Implementation Tasks

- proteger o endpoint com `AuthSessionGuard`
- resolver `UserProfile` a partir da sessão
- calcular o snapshot adaptativo sob demanda
- retornar `generatedAt`
- retornar `recoverySignals`
- retornar `nutrition.signals`
- manter o payload reduzido e seguro

---

## 3. Validation Tasks

- validar isolamento por usuário
- validar compatibilidade com o payload público de `get-home-dashboard`
- validar ausência de dados sensíveis
- validar compatibilidade com documentos e chamadas legadas
