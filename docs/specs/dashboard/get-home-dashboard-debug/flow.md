# Flow — Get Home Dashboard Debug

## 1. Overview

Este documento descreve o fluxo do use-case `get-home-dashboard-debug`.

---

## 2. Main Flow

1. a requisição chega em `GET /dashboard/home/debug`
2. `AuthSessionGuard` valida a sessão
3. o backend resolve o `UserProfile` pelo `authUserId`
4. o backend calcula o `UserHealthContext`
5. o backend deriva os sinais adaptativos de recovery e nutrition
6. o backend monta o snapshot reduzido
7. o snapshot é retornado como payload interno

---

## 3. Recovery Signals

Os sinais de recovery devem ser derivados de forma determinística a partir de:

- `fatigueLevel`
- `latestCheckIn.sleepQuality`
- `latestCheckIn.muscleSoreness`
- `recoveryTrend`

---

## 4. Nutrition Signals

Os sinais de nutrition devem ser derivados de forma determinística a partir de:

- `nutritionProfile.goal`
- `nutritionProfile.mealsPerDay`
- `latestCheckIn.motivationLevel`
- `recoveryTrend`

---

## 5. Failure Flow

Se a sessão for inválida ou o usuário não existir:

- o endpoint falha sem retornar snapshot
- nenhum dado é persistido

Se o contexto não puder ser calculado:

- o endpoint retorna erro interno padronizado

