# Use Case — Template

## 1. Overview

Use este template para documentar um novo use-case do Elev9 Coach.

Ele deve gerar uma spec suficientemente clara para:

- implementação
- testes
- revisão técnica
- evolução futura

---

## 2. Context

```txt
Bounded Context: <context-name>
Module: <module-name>
Use-case: <use-case-name>
Canonical name: <context.use-case-name>
```

---

## 3. Goal

Descreva em uma frase o objetivo do use-case.

Exemplo:

```txt
Permitir que o usuário <faça alguma ação> de forma segura e previsível.
```

---

## 4. MVP Scope

Incluído:

- <item 1>
- <item 2>

Não incluído:

- <item 1>
- <item 2>

---

## 5. Preconditions

- <precondition 1>
- <precondition 2>

---

## 6. Postconditions

Após sucesso:

- <resultado 1>
- <resultado 2>

---

## 7. Related Entities

- `<EntityA>`
- `<EntityB>`

---

## 8. Related Specs

- `<context/use-case-a>`
- `<context/use-case-b>`

---

## 9. Business Value

Explique por que esse use-case importa para o MVP.

---

## 10. Important Decisions

Liste decisões fechadas que afetam implementação e ownership.

Exemplo:

- `<module-x>` cria apenas `<EntityA>`
- `<module-y>` é responsável por `<EntityB>`

---

## 11. Summary

Resuma:

- o objetivo
- o limite de responsabilidade
- o que fica explicitamente fora
