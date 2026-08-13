# Elev9 Coach — Audit Executive Summary

## Estágio atual

O Elev9 Coach está em estágio de **MVP técnico avançado**, não de produto SaaS pronto para produção. O backend NestJS é um monólito modular real, com MongoDB/Mongoose, JWT, contratos compartilhados, cliente HTTP tipado, persistência e uma camada determinística de coaching bastante extensa. O mobile Expo é a superfície principal e possui um fluxo utilizável de onboarding básico, dashboard, treino, nutrição, progresso e Coach.

A auditoria encontrou uma base de engenharia forte, mas uma diferença relevante entre “há código para a capacidade” e “a capacidade está integrada, medida e pronta para operar”.

## Capacidades realmente entregues

- registro, login, sessão JWT e logout;
- criação de perfil básico, fitness e nutricional;
- criação e leitura de planos de treino e nutrição;
- dashboard mobile com treino, nutrição, recuperação, progresso e decisão do Coach;
- execução de workout com séries, pausa, timer, substituição e conclusão;
- persistência e histórico de workout;
- registro e substituição de refeições;
- cálculo determinístico de macros e readiness;
- metas, milestones, achievements, forecast e progress summary;
- decisões determinísticas de Coach e notificações in-app;
- chat textual persistido, feedback, explicabilidade e replay interno;
- especialistas de treino, nutrição, recuperação, metas, hábitos, progresso e motivação;
- safety de prompt, structured parser, retries, fallback, circuit breaker e observabilidade interna;
- builds de API, tipos, cliente e mobile funcionando;
- 202 suites/1318 testes de API e 6 suites/28 testes mobile passando.

## Capacidades superestimadas

O onboarding ainda não coleta recovery baseline, habits baseline, equipamento ou limitações físicas completas. O check-in diário existe no backend, mas não há tela mobile para criá-lo. A adaptação de treino gera recomendações, porém não está comprovadamente alterando o plano seguinte. Nutrição possui plano, log e replacement, mas não um motor longitudinal de aderência e redistribuição.

O “AI Coach” é real como camada determinística e chat/fallback, mas OpenAI, streaming, tool calling, agent runtime, aggregate canônico e memória futura estão controlados por flags com defaults desligados ou não documentados. A timeline de memória não comprova memória durável com consentimento, provenance, edição e exclusão.

Notificações são decisões `in_app` persistidas com eventos de engagement; não existe push provider, token de dispositivo, APNs/FCM ou delivery em background. A página web é uma landing page, não uma plataforma web autenticada. Eventos nomeados em telas e logs de IA não são product analytics.

## Bloqueios de validação

- E2E API falhou nas 15 suites/54 testes porque `MongoMemoryServer` não conseguiu bind/abrir portas no sandbox (`EPERM`, código 48). Isso impede declarar o wiring E2E verde.
- `npm run format:check` falhou em 65 arquivos.
- CI cobre format, lint, teste API, builds e export mobile, mas não E2E, web build, Docker smoke, deploy ou restore.
- Não há ambiente externo com Mongo, OpenAI, push provider, analytics collector ou dispositivo mobile para validação real.
- Não há métricas de onboarding, workout, nutrição, recovery, Coach, aceitação/rejeição, retenção ou outcomes.

## Riscos principais

### Produto

O escopo é amplo e várias superfícies estão sendo expandidas antes de validar o loop diário. Há risco de confundir quantidade de módulos com valor percebido e de não saber quais recomendações funcionam.

### Arquitetura

O backend tem boas boundaries, mas o mobile ainda mantém recomposição local de inteligência em paralelo ao aggregate canônico. Isso cria risco de decisões divergentes e de manutenção duplicada.

### IA

O runtime tem controles técnicos fortes, mas não há prova de qualidade em provider real, outcome de recomendação, calibração de confiança, custo operacional ou consistência entre chat, dashboard e notificações.

### Saúde e segurança

Há dados de dor, soreness, sono, alergias e nutrição, mas não há evidência de escalonamento clínico, warnings suficientes, consentimento, privacy controls ou política para cenários de lesão, alergia, transtorno alimentar e crise.

### Operação

Não há rate limiting, backup/restore comprovado, deploy/rollback, observabilidade externa, incident response ou push delivery.

## Próximo release

O release recomendado é **Adaptive Coach**, entendido como uma release de consolidação determinística:

```text
Check-in real
→ Recovery snapshot
→ Adaptive decision
→ Alteração comprovada do próximo plano
→ Explicação
→ Aceitação/rejeição
→ Outcome analytics
```

Essa escolha aproveita o que já existe em `training`, `recovery`, `nutrition`, `goals`, `habits`, `personalization`, `notifications` e `ai`, sem ampliar prematuramente para agentes, memória avançada ou integrações externas.

## Próximo Epic

**Adaptive Coach.**

O backend já calcula readiness, fatigue, adherence, missed workouts, volume/intensidade e recomendações nutricionais. O gap não é criar mais especialistas; é provar que as decisões chegam ao plano, são compreendidas pelo usuário, podem ser aceitas/rejeitadas e melhoram um outcome mensurável.

## Dez ações prioritárias

1. Criar a tela mobile de daily check-in e validar `register → profile → plan → check-in → dashboard` em E2E.
2. Fazer a recomendação adaptativa alterar de modo auditável o próximo workout/plano.
3. Adicionar feedback de carga, RPE, dor, skip e motivo ao fim do workout.
4. Definir e implementar product analytics para onboarding, workout, nutrição, recovery, Coach, engagement e retenção.
5. Ativar o aggregate canônico em staging e medir fallback, paridade, latência e falhas.
6. Formalizar safety para dor, lesão, alergias e riscos nutricionais, incluindo escalonamento.
7. Executar E2E com Mongo em ambiente suportado e colocar o resultado no CI.
8. Implementar baseline operacional: secrets, rate limit, deploy, rollback, backup/restore e métricas externas.
9. Definir memória durável separada de histórico/session memory, com consentimento, provenance, TTL, correção e exclusão.
10. Congelar H5 e remover/rotular claramente caminhos legacy, flags não documentadas, placeholders e duplicações.

## Veredicto

- **Implementado em algum nível:** aproximadamente 52% do roadmap.
- **Realmente integrado:** aproximadamente 31%.
- **Pronto para produção:** 0% dos Epics completos no padrão solicitado; algumas partes são candidatas a rollout interno.
- **Próximo Epic:** Adaptive Coach.
- **Não construir agora:** wearables, multimodal, social, marketplace/professionals, web parity, agent tools e memória avançada.
- **Direção:** consolidar, medir e validar o loop diário antes de expandir.

O Elev9 não precisa de mais amplitude neste momento. Precisa transformar a arquitetura existente em uma experiência adaptativa demonstrável, mensurável, segura e operável.
