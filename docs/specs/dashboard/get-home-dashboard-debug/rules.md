# Rules — Get Home Dashboard Debug

## 1. Overview

Este documento lista as regras do use-case `get-home-dashboard-debug`.

---

## 2. Rules

- o endpoint é autenticado
- o payload é interno e reduzido
- o snapshot não é persistido
- o fluxo é deterministic-first
- os sinais são estáveis e em `snake_case`
- o fluxo não executa replay
- o fluxo não cria analytics
- o fluxo não expõe dados sensíveis
- o fluxo deve manter compatibilidade com o domínio `Dashboard`

---

## 3. Safety Constraints

- sem claims médicas
- sem IA generativa
- sem macros/calorias
- sem meal plans
- sem histórico adicional
