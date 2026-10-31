# ADR-0024 — e2e (Playwright) fora do CI e dos gates

Status: aceito. Data: 2026-10-31. Decisão do PO. Emenda o ADR-0019 (o Playwright continua na stack, mas não roda no CI).

## Contexto

Os specs e2e rodam com SwiftShader (WebGL por software), um worker por vez, nos 4 alvos de tela. No CI eles somavam a maior parte do tempo de cada run, falhavam por diferenças de captura entre plataformas e travavam releases e pushes sem relação com a mudança. O PO quer um CI rápido.

## Alternativas consideradas

- Manter o e2e em todo push: CI lento e instável.
- Rodar só em release: ainda trava o release por diferença de captura.
- Rodar num runner com GPU: custo e configuração extras.

## Decisão

- O job e2e continua no `ci.yml`, atrás de `if: false`; specs e baselines (`tests/visual/__screenshots__/`, por plataforma) ficam no repositório.
- O e2e não faz parte dos gates do CI, do release nem da Definition of Done (`prompt-workers.md` §8); asserts e2e do ROADMAP não impedem o `[x]` e são anotados como "e2e fora do CI (decisão do PO 2026-10-31)".
- `bun run test:e2e` roda localmente só quando o PO ou o Orq pedir; ninguém gera nem regenera baselines sem pedido.
- A verificação de UI nos 4 alvos passa por testes de componente (`packages/ui`) e pelas capturas sob pedido.

## Consequências

- CI com lint, typecheck, unit, integration, build-web e o `balance.yml`, bem mais curto.
- Regressões visuais só aparecem quando o e2e for rodado; o risco cresce com o tempo sem rodar.
- Para religar, basta trocar o `if: false` e regenerar as baselines, com novo ADR.

## Referências

ADR-0019; SDD 11 §1; `.github/workflows/ci.yml`; `prompt-workers.md` §8 e §15.2.
