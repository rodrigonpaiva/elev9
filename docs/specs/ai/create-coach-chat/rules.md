# Rules — Create Coach Chat

## Authentication

- o endpoint exige sessão autenticada
- `authUserId` vem exclusivamente da sessão

## Determinism

- a resposta continua determinística quando o LLM falha ou está desabilitado
- o LLM é opcional e protegido por safety, reliability e observability
- o `Policy Engine` é a fonte de verdade para autorização de contexto, ferramentas, memória e fallback
- a versão do prompt é resolvida por registry interno e rollout canário determinístico
- o `Expert Router` é a fonte de verdade para primary/complementary expert selection e ordered execution metadata

## Persistence

- a conversa é persistida em `CoachConversation`
- as mensagens são persistidas em `CoachMessage`
- a mensagem do usuário e a resposta do assistant devem ser salvas

## Context Use

- o fluxo reutiliza `BuildUserHealthContextService`
- o fluxo usa sinais atuais do usuário
- o cliente não envia contexto extra
- o runtime pode gerar uma contribuição interna do `WorkoutExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `NutritionExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `RecoveryExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `GoalExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `HabitExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `ProgressExpert` sem alterar o contrato público
- o runtime pode gerar uma contribuição interna do `MotivationExpert` sem alterar o contrato público
- o runtime deve aplicar o `Expert Router` antes do `Planning Engine`
- o runtime deve preservar a rota de especialistas como metadata interna
- o runtime deve executar a `Expert Composition Engine` após os especialistas e antes do prompt builder
- o runtime deve preservar a inteligência unificada composta como metadata interna

## Safety

- não fazer claims médicos
- não criar memória longa
- não criar replay
- não alterar o contrato síncrono público
- não expor dados sensíveis no payload público
- não expor metadata interna de experimento, rollout ou prompt version ao cliente
