# Monorepo Strategy

## 1. Objetivo do Monorepo

O objetivo do monorepo no Elev9 é centralizar backend, web e mobile no mesmo workspace, reduzindo fricção entre produto e engenharia, simplificando a evolução do sistema e permitindo compartilhamento controlado de contratos e infraestrutura comum.

### Por que usar Nx

Nx foi escolhido porque oferece uma base sólida para múltiplas aplicações e packages em um único repositório, com boa ergonomia para organização, escalabilidade e padronização técnica.

### Benefícios para o projeto Elev9

- centralizar `api`, `web` e `mobile` no mesmo ciclo de evolução
- facilitar compartilhamento de `types`, `DTOs`, client HTTP e UI simples
- reduzir duplicação de contratos entre backend, web e mobile
- melhorar consistência de build, lint, testes e convenções
- permitir evolução incremental sem reescrever a arquitetura atual
- preparar o projeto para crescimento futuro com painéis internos, admin e novas superfícies

## 2. Estrutura do Workspace

Proposta de organização:

```text
apps/
  api/        NestJS backend atual
  web/        Next.js web app
  mobile/     React Native com Expo

packages/
  types/      shared types / DTOs
  api-client/ HTTP client compartilhado
  ui/         componentes compartilháveis quando possível
  config/     configuração compartilhada
```

### Papel de cada app

#### `apps/api`

Contém o backend NestJS já existente, preservando a arquitetura atual de modular monolith e os contextos de domínio já implementados.

#### `apps/mobile`

É o canal principal do usuário no MVP. Deve concentrar a experiência principal do produto, onboarding, uso recorrente, acompanhamento de treino e evolução diária.

#### `apps/web`

No curto prazo, pode começar como landing page institucional e superfície mínima do produto. No médio prazo, pode evoluir para dashboard web do usuário e, no futuro, para backoffice/admin.

### Papel de cada package

#### `packages/types`

Contém tipos compartilhados, especialmente shapes de request/response, enums públicos e contratos seguros consumidos por `web` e `mobile`.

#### `packages/api-client`

Contém o client HTTP reutilizável para consumo da API, incluindo configuração base de `Axios`, autenticação e métodos organizados por domínio.

#### `packages/ui`

Contém componentes compartilháveis quando isso fizer sentido. O escopo deve ser restrito a UI simples e transversal, evitando abstrações pesadas ou dependência de regras de negócio.

#### `packages/config`

Contém configurações compartilhadas, como presets de TypeScript, ESLint, Prettier e convenções úteis para todo o workspace.

## 3. Stack Escolhida

A stack proposta para o monorepo é:

- `Nx`
- `NestJS` para o backend
- `Next.js` para o app web
- `React Native` com `Expo` para o app mobile
- `TypeScript` em todo o workspace
- `AsyncStorage` no mobile para persistência local simples
- `Axios` no `api-client`

### Direção técnica

- backend continua sendo a fonte de verdade do domínio e da lógica de negócio
- web e mobile consomem contratos e client compartilhado
- UI compartilhada deve ser pequena, estável e opcional
- packages compartilhados devem ser explícitos e fáceis de manter

## 4. Por Que Incluir Next.js

Adicionar `Next.js` ao monorepo cria uma superfície web consistente com o restante da stack e amplia a capacidade do produto sem abrir outro repositório.

### Motivos principais

- suportar uma landing page e presença web do produto
- preparar um dashboard futuro para uso em desktop
- preparar um painel administrativo futuro
- reaproveitar `types` e `api-client` com o backend existente
- manter a evolução web próxima do domínio e dos contratos da API

### Papel do web no MVP

O `mobile` continua sendo o canal principal do usuário. O `web` deve começar mínimo, evitando disputar prioridade com o app principal.

## 5. Estratégia de Migração

A migração deve ser incremental e segura, sem tentar reestruturar tudo ao mesmo tempo.

### Passos propostos

1. Inicializar `Nx` no projeto atual.
2. Mover o backend para `apps/api`.
3. Garantir que `build`, `test` e execução local do backend continuam funcionando.
4. Criar `apps/mobile` com `Expo`.
5. Criar `apps/web` com `Next.js`.
6. Criar os packages compartilhados iniciais.
7. Configurar `path aliases` e fronteiras de importação.

### Ordem recomendada

- primeiro estabilizar `apps/api`
- depois subir `apps/mobile`, que é a prioridade de produto
- depois adicionar `apps/web` em escopo mínimo
- só então extrair compartilhamento de forma gradual

Essa ordem reduz risco e evita tentar resolver backend, mobile e web ao mesmo tempo.

## 6. Compartilhamento de Código

O compartilhamento deve focar apenas no que reduz duplicação sem acoplar demais os apps.

### `packages/types`

Deve concentrar:

- tipos seguros de resposta
- DTOs compartilháveis do ponto de vista do cliente
- enums e contratos públicos da API

### `packages/api-client`

Deve concentrar:

- configuração base do `Axios`
- tratamento básico de autenticação
- clients organizados por domínio

### `packages/ui`

Deve concentrar apenas componentes simples quando houver ganho real, por exemplo:

- botões
- inputs
- cards
- tokens visuais

Esse compartilhamento deve ser usado com cuidado porque `web` e `mobile` têm constraints diferentes.

### Objetivo

Evitar duplicação manual de contratos e infraestrutura comum entre `web` e `mobile`, principalmente em:

- payloads de request
- payloads de response
- nomes de campos
- enums públicos
- client de acesso à API

## 7. Regras de Dependência

Para manter o monorepo saudável, algumas regras estruturais devem ser explícitas.

- `apps` não importam de outros `apps`
- `apps` podem importar de `packages`
- `packages` podem ser compartilhados entre múltiplos apps
- backend, web e mobile não devem depender diretamente entre si
- lógica de negócio permanece dentro do backend
- código compartilhado deve representar contrato, client ou UI transversal simples

### Regra central

`web` e `mobile` podem consumir `packages/types`, `packages/api-client`, `packages/ui` e `packages/config`, mas não devem importar módulos internos do backend.

## 8. Riscos

A adoção de monorepo traz benefícios, mas também aumenta a complexidade inicial.

### Principais riscos

- curva inicial de configuração do `Nx`
- reorganização de scripts, paths e tooling
- setup adicional de `Expo` e `Next.js` no mesmo workspace
- risco de dependências indevidas entre apps e packages
- risco de abstrações compartilhadas prematuras
- aumento de carga cognitiva se as fronteiras não forem respeitadas

### Risco de overengineering

O principal risco não é técnico, mas de escopo: tentar compartilhar demais cedo demais. Se `types`, `client` e `ui` forem empurrados além do necessário, o monorepo pode ficar mais lento de evoluir em vez de mais simples.

### Mitigação

- migrar em etapas pequenas
- manter packages compartilhados mínimos no MVP
- documentar regras de importação
- validar build e testes do backend a cada etapa
- só compartilhar UI quando houver benefício claro

## 9. Decisões MVP

Para o MVP, o monorepo deve priorizar velocidade e previsibilidade.

### Decisões fechadas

- `mobile` é a prioridade principal
- `web` começa mínimo
- não compartilhar lógica de negócio
- compartilhar apenas `types`, `api-client` e UI simples quando fizer sentido
- manter o backend como fonte única das regras de domínio
- evitar abstrações prematuras

### Escopo inicial

Compartilhar:

- contratos públicos
- tipos comuns
- client HTTP
- configuração mínima útil
- UI simples e transversal, quando realmente compensa

Não compartilhar:

- services de domínio
- use-cases
- repositórios
- regras internas do backend
- lógica específica de tela do web ou do mobile

## 10. Conclusão

A migração para monorepo com `Nx` é adequada para o Elev9 porque consolida `api`, `web` e `mobile` no mesmo workspace sem exigir mudança na arquitetura de domínio já definida. O caminho recomendado é incremental: estabilizar `apps/api`, priorizar `apps/mobile`, adicionar `apps/web` com escopo mínimo e compartilhar apenas `types`, `api-client` e UI simples quando houver ganho real. Isso preserva velocidade no MVP e reduz o risco de acoplamento desnecessário.
