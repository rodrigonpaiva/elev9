# Contract — Template

## 1. Overview

Este documento define o contrato do use-case `<use-case-name>`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
<context.use-case-name>
```

---

## 3. Input

```ts
type <UseCaseInput> = {
  // fields
};
```

---

## 4. Input Example

```json
{
  "field": "value"
}
```

---

## 5. Input Validation

- `<field-a>`: <rule>
- `<field-b>`: <rule>

---

## 6. Output

```ts
type <UseCaseOutput> = {
  // safe output
};
```

---

## 7. Success Response Example

```json
{
  "result": {}
}
```

---

## 8. Fields That Must Never Be Returned

- `<sensitive-field-a>`
- `<sensitive-field-b>`

---

## 9. Error Response Shape

```ts
type <UseCaseError> = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
<ERROR_CODE_A>
<ERROR_CODE_B>
```

---

## 11. Transport

Defina transporte esperado no MVP.

Exemplo:

```txt
POST /module/action
```

---

## 12. HTTP Mapping

```txt
<ERROR_CODE_A> -> 400
<ERROR_CODE_B> -> 409
```

---

## 13. Domain Notes

- <note 1>
- <note 2>

---

## 14. Summary

Resuma as garantias do contrato.
