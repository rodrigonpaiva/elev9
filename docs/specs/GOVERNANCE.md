# Documentation Governance

## 1. Spec-Driven Philosophy

O repositório segue uma filosofia `spec-first`, `deterministic-first` e orientada por arquitetura.

Na prática, isso significa:

- specs definem o comportamento esperado antes ou junto da implementação
- a evolução do sistema deve permanecer rastreável por bounded context
- fluxos determinísticos devem ser preferidos quando a arquitetura ainda está sendo consolidada
- mudanças arquiteturais devem ser documentadas de forma incremental

---

## 2. Documentation Structure

A documentação principal do repositório se organiza em:

- `docs/specs/` para fluxos, contratos, regras, tarefas e testes por bounded context
- `docs/adr/` para decisões arquiteturais mais estáveis
- índices `README.md` para navegação entre contextos e camadas
- bounded contexts como unidades documentais de descoberta e responsabilidade

Essa estrutura evita duplicação e ajuda a manter a arquitetura legível ao longo do tempo.

---

## 3. Spec Structure Rules

O formato padrão de um spec deve ser mantido de forma consistente sempre que o fluxo exigir documentação completa:

- `README.md`
- `contract.md`
- `flow.md`
- `rules.md`
- `errors.md`
- `tasks.md`
- `tests.md`
- `adr-links.md`

Nem todo fluxo precisa de todos os arquivos no mesmo momento, mas a estrutura deve permanecer previsível e homogênea.

---

## 4. Placeholder Specs

Specs placeholder existem para reservar espaço documental sem inventar implementação.

Regras:

- use `documentation placeholder` quando o fluxo ainda não estiver confirmado
- use `planned` para fluxos previstos, mas não entregues
- use `partial` para documentação que cobre apenas uma parte do comportamento
- não transforme placeholder em especificação funcional sem confirmação do código ou da arquitetura real

---

## 5. Related Specs Navigation

`Related Specs` deve usar navegação clicável em markdown:

- `[Spec Name](../relative-path)`

Regras:

- evitar referências em código quando existir alvo documental real
- manter consistência visual entre specs
- preservar a ordem lógica dos fluxos relacionados
- não criar links quebrados ou links para documentos inexistentes

---

## 6. ADR Relationship

A relação entre ADRs e specs deve permanecer clara:

- ADRs definem decisões arquiteturais
- specs definem contratos, fluxos e regras de implementação
- specs devem apontar para ADRs quando houver decisão arquitetural relevante
- ADRs não devem duplicar o conteúdo operacional dos specs

---

## 7. Deterministic-First Architecture Wording

Não documente capacidades futuras de IA como se já estivessem implementadas.

Em especial:

- semantic memory
- LangGraph
- streaming
- voice
- multi-agent routing

Esses temas podem aparecer como roadmap ou direção futura, mas não como comportamento atual.

---

## 8. Security Documentation Rules

Specs e documentação de debug devem explicitar limites de segurança quando aplicável:

- inspection-only surfaces
- no raw prompts
- no raw context leakage
- no auth/session leakage

Se uma superfície é interna, isso deve ficar claro no texto e no contrato.

---

## 9. Documentation Evolution

Quando um novo bounded context ou fluxo surgir:

1. documente o fluxo no spec adequado
2. relacione o spec aos ADRs relevantes
3. atualize o índice do contexto
4. atualize o índice raiz quando necessário
5. mantenha a navegação homogênea

A documentação deve evoluir no mesmo ritmo da arquitetura, sem antecipar comportamento não entregue.

---

## 10. Repository Navigation Principles

A navegação documental deve ser:

- clicável
- homogênea
- fácil de descobrir por bounded context
- consistente entre índices raiz e índices locais

Isso inclui:

- `docs/specs/README.md`
- `docs/adr/README.md`
- índices de bounded context
- seções `Related Specs` padronizadas

A validação oficial de CI está documentada em [docs/ci.md](../ci.md) e deve seguir a mesma filosofia leve, determinística e alinhada a esta governança.

Documentação de runtime local também deve permanecer determinística e específica por ambiente. Para o Docker da API, use `.env.docker.example` como fluxo separado do ambiente padrão da aplicação.

---

## 11. Summary

`docs/specs/GOVERNANCE.md` formaliza a disciplina documental do Elev9 Coach para manter a arquitetura spec-driven legível, determinística e consistente ao longo do tempo.
