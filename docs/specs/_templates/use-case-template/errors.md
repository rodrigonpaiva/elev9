# Errors — Template

## 1. Overview

Este documento define os erros possíveis do use-case `<use-case-name>`.

---

## 2. Error Shape

```ts
type UseCaseError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 3. Error Codes

```txt
<ERROR_CODE_A>
<ERROR_CODE_B>
<ERROR_CODE_C>
```

---

## 4. Error Definitions

### 4.1 <ERROR_CODE_A>

Quando usar:

- <condition>

Mensagem segura:

```txt
<safe message>
```

HTTP status:

```txt
<status>
```

### 4.2 <ERROR_CODE_B>

Quando usar:

- <condition>

Mensagem segura:

```txt
<safe message>
```

HTTP status:

```txt
<status>
```

---

## 5. Security Rules

- não expor stack trace
- não expor detalhes internos do banco
- não expor detalhes sensíveis do provider

---

## 6. Error Mapping Table

```txt
<ERROR_CODE_A> -> <HTTP_STATUS> -> <SAFE_MESSAGE>
<ERROR_CODE_B> -> <HTTP_STATUS> -> <SAFE_MESSAGE>
```

---

## 7. Summary

Resuma como o use-case trata erros de forma segura e previsível.
