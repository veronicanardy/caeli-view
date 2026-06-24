# .agents

Convenções compartilhadas pelos agentes que trabalham neste repositório (Claude e Codex).
Fonte única e versionada, para os dois lerem do mesmo lugar.

## Conteúdo

- `MEMORY.md` — preferências da mantenedora e decisões duráveis do projeto.
  **Não versionado** (repositório público): fica no `.gitignore`. Cada máquina mantém o seu.
- `skills/radar/SKILL.md` — skill do radar 3D. Fonte de verdade das convenções do radar.
- `skills/radar/agents/openai.yaml` — registro da skill para o Codex.

## Como cada agente enxerga isto

- **Codex** lê `.agents/` diretamente.
- **Claude** lê via `.claude/` (config local, fora do Git). Os arquivos em `.claude/` são
  ponteiros curtos que mandam ler a fonte aqui em `.agents/`, sem duplicar conteúdo.

`AGENTS.md`, na raiz, é o ponto de entrada e aponta para cá.

## Ao mudar uma convenção

Edite a fonte aqui em `.agents/`. Não edite os ponteiros em `.claude/`, eles só apontam.
