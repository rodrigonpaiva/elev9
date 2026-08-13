# Elev9 Coach

> Monorepo Nx de um MVP de coaching fitness adaptativo, com API NestJS, aplicativo mobile Expo, contratos TypeScript compartilhados e Coach Intelligence determinístico por padrão.

[English](./README.md) · [Français](./README.fr.md) · Português do Brasil (esta página) · [nome legado em inglês](./README.en.md)

## Sumário

- [Objetivo](#objetivo)
- [Capacidades implementadas](#capacidades-implementadas)
- [Arquitetura](#arquitetura)
- [Tecnologias e requisitos](#tecnologias-e-requisitos)
- [Instalação e configuração](#instalação-e-configuração)
- [Comandos](#comandos)
- [Fluxo principal](#fluxo-principal)
- [Superfície da API](#superfície-da-api)
- [Testes e validação](#testes-e-validação)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Integrações](#integrações)
- [Estado atual e limitações](#estado-atual-e-limitações)
- [Próximos passos](#próximos-passos)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Mapa da documentação](#mapa-da-documentação)

## Objetivo

O Elev9 Coach conecta treinos, recuperação, nutrição, hábitos, metas e progresso em uma experiência de coaching contextual. O posicionamento, usuários, jornadas e escopo estão em [docs/product](./docs/product/).

## Capacidades implementadas

| Área                     | Escopo                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação e perfis    | Cadastro, login, sessão JWT, perfis de usuário e fitness                                                                                                         |
| Treinamento e progresso  | Planos, recomendações adaptativas, check-ins, registros, histórico e resumo                                                                                      |
| Recuperação              | Read models today/current/history, orientação determinística, analytics e cache offline mobile                                                                   |
| Nutrição                 | Planos, macros, refeições, substituição, recomendações, histórico, tendências e dashboard                                                                        |
| Metas e hábitos          | Visões, snapshots, padrões, resumos, riscos, histórico e replay                                                                                                  |
| Notificações e dashboard | Decisões, engajamento, eventos, replay e home consolidado                                                                                                        |
| Coach Intelligence       | Contexto multidomínio, especialistas determinísticos, explicabilidade, segurança/fallback, chat, briefing, insights, memória, revisão, orientação e notificações |
| Mobile                   | Login/onboarding, dashboard, telas de treino, nutrição, recuperação, progresso e Coach                                                                           |
| Observabilidade          | Logs correlacionados/estruturados com redaction, OpenTelemetry e Collector local opcionais                                                                       |

A lista descreve o repositório atual; nenhum deploy externo é inferido apenas pelo código.

## Arquitetura

Monorepo Nx com backend NestJS modular, cliente Expo/React Native e pacotes compartilhados:

    apps/api/       Backend NestJS modular
    apps/mobile/    Aplicativo Expo e projetos nativos
    apps/web/       Shell orientado a Next; alvos atualmente vazios
    packages/types/ Contratos compartilhados
    packages/api-client/ Cliente HTTP tipado
    packages/ui/    Primitivos UI mobile
    infra/          Configuração OpenTelemetry opcional
    docs/           Specs, ADRs, produto, validação, operações, roadmap
    scripts/        Wrappers de CLI e helper Docker

A API separa apresentação, aplicação, domínio e infraestrutura Mongoose em apps/api/src/modules/. O mobile usa contratos e cliente compartilhados. O coaching é deterministic-first; LLM/agent opcional é limitado por configuração, segurança, memória, ferramentas e fallback.

## Tecnologias e requisitos

Nx 22.7.1, TypeScript 5.7.x, NestJS 11, Node.js 22 LTS, MongoDB 7, Mongoose 8, Expo 54, React Native 0.81, React 19, NativeWind, Jest 29, Supertest, JWT, bcrypt, OpenAI e OpenTelemetry/OTLP opcionais, Docker Compose.

Use Node.js 22 LTS (.nvmrc), npm, Docker Compose, ferramentas Expo e emulador/simulador ou dispositivo. Builds nativos exigem os SDKs; chave OpenAI só é necessária se o caminho LLM for ativado.

## Instalação e configuração

    npm install
    cp .env.example .env
    docker compose up -d mongo

Variáveis: PORT, MONGODB*URI, JWT_SECRET, OBSERVABILITY*_, AI*AGENT*_, OPENAI*API_KEY/OPENAI_MODEL, AI_LLM*_, AI*COACH_MAX_EXPERTS, AI_EXPERT_TRACE*_, AI*AGENT_TRACE*_ e AI*PROMPT*_. Referências: [.env.example](./.env.example) e [.env.docker.example](./.env.docker.example). Nunca versione secrets.

Para o mobile:

    cp apps/mobile/.env.example apps/mobile/.env

Defina EXPO_PUBLIC_API_URL, por exemplo http://192.168.1.20:3000. Em dispositivo físico, não use localhost. EXPO_PUBLIC_DEMO_MODE e EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED são opcionais.

## Comandos

| Comando                                     | Finalidade                    |
| ------------------------------------------- | ----------------------------- |
| npm run start:dev                           | API em desenvolvimento        |
| npm run start                               | Build e inicialização da API  |
| npm run mobile:start                        | Inicialização do Expo/Metro   |
| npm run dev:all                             | API, web e mobile em paralelo |
| npm run build                               | Build configurado             |
| npm run lint                                | Lint configurado              |
| npm run format:check / npm run format       | Prettier                      |
| npm run test / npm run test:watch           | Testes Jest da API            |
| npm run test:e2e                            | Testes API end-to-end         |
| npm run mobile:android / npm run mobile:ios | Inicialização mobile          |
| npm run dev:web                             | Shell web atual               |

Alvos Nx: npm exec nx run api:build, api:test, api:test:e2e, mobile:start, mobile:test e mobile:build.

Runtime Docker:

    cp .env.docker.example .env
    docker compose up --build
    docker compose --profile observability up --build

## Fluxo principal

1. O mobile autentica por /auth/register, /auth/login e /auth/me.
2. O onboarding cria os contextos de usuário, fitness, treinamento e nutrição.
3. O dashboard agrega progresso, recuperação, treino, nutrição, metas, hábitos e personalização.
4. Serviços determinísticos calculam read models e recomendações com regras de frescor, data e timezone.
5. O Coach Intelligence monta o contexto, direciona para especialistas e aplica segurança/explicabilidade.
6. Ações persistidas alimentam snapshots, tendências, notificações e contexto do Coach.

## Superfície da API

Não há prefixo global documentado. Grupos: /auth, /users, /fitness, /training, /training/adaptive, /progress, /recovery, /nutrition, /goals, /habits, /personalization, /notifications, /dashboard, /ai, /ai/coach-decision e /health ou /health/ready. DTOs ficam em presentation/http/dto e contratos em [packages/types/src](./packages/types/src).

## Testes e validação

O inventário contém 267 arquivos de teste, cobrindo API, controllers, hooks/analytics mobile e E2E de auth, perfis, dashboard, treino, progresso, recuperação, nutrição e Coach.

    npm exec nx run api:build       aprovado
    npm exec nx run api:test        219 suítes, 1.368 testes aprovados

O Jest sinalizou um worker encerrado à força no teardown, sem assertion falhar. Builds nativos não fazem parte desta validação. Consulte [docs/ci.md](./docs/ci.md).

## Estrutura do repositório

    apps/api/src/modules/<context>/  presentation, application, domain, infrastructure
    apps/api/src/common/             middleware compartilhado
    apps/api/src/observability/      logs, redaction, OTLP e lifecycle
    apps/api/src/shared/             replay, mappers, concorrência, datas
    apps/api/test/e2e/                cenários API E2E
    apps/mobile/src/                  telas, navegação, hooks, API, storage, UI
    packages/api-client/src/          funções de API e cliente HTTP
    packages/types/src/               contratos compartilhados
    packages/ui/src/                  primitivos React Native e tema
    docs/                             produto, specs, ADRs, validação, operações

## Integrações

MongoDB 7 é a persistência principal; Expo/Metro e projetos nativos ficam em apps/mobile. OpenAI é provedor LLM opcional protegido por configuração, segurança e fallback. OpenTelemetry pode exportar para o Collector de [docker-compose.yml](./docker-compose.yml). Perfis EAS estão em eas.json, sem confirmação de publicação.

## Estado atual e limitações

MVP em evolução declarado UNLICENSED. O histórico recente cobre observabilidade estruturada, nutrição, recuperação, check-ins, Coach Intelligence e a base Nx/mobile.

- O projeto web existe no Nx, mas project.json não define alvos nem superfície de produção confirmada.
- Agent, ferramentas, LLM/OpenAI e exportação de observabilidade ficam desativados por padrão.
- Execuções nativas dependem de SDKs, dispositivos e rede até a API.
- Nenhum deploy, MongoDB hospedado, release de loja, backend de telemetria ou infraestrutura de e-mail foi confirmado.
- A suíte da API passa, mas o warning de teardown permanece como item de manutenção.
- Não existe o diretório sources/ neste checkout; nenhum arquivo de referência estava disponível.

## Próximos passos

Os diretórios docs/operations/, docs/runbooks/, docs/certification/ e docs/roadmap/ sustentam expandir a superfície web, continuar validação mobile/E2E, manter contratos/UI e seguir o hardening operacional.

## Contribuição

Consulte módulo, spec, ADR e testes antes de alterar algo. Use Nx, atualize testes/documentação com mudanças de comportamento e siga [docs/ci.md](./docs/ci.md) e [docs/pull-requests.md](./docs/pull-requests.md).

## Licença

package.json declara UNLICENSED. Nenhuma licença open source foi identificada; confirme os direitos de redistribuição.

## Mapa da documentação

- [Produto](./docs/product/) · [Arquitetura](./docs/architecture/) · [Specs](./docs/specs/) · [ADRs](./docs/adr/)
- [Validação](./docs/validation/) · [Operações](./docs/operations/) · [Roadmap](./docs/roadmap/)
- [Demo](./docs/demo/README.md) · [CI](./docs/ci.md)
