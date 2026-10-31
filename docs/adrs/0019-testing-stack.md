# ADR-0019 — Stack de testes: Vitest, Playwright com SwiftShader, Playwright também para o smoke, simulador de balanceamento no CI

Status: aceito. Data: 2026-10-31.

## Contexto

Qualidade exige unit, integração, e2e e smoke (briefing), com WebGL em CI headless e capturas nos 4 alvos de tela.

## Alternativas consideradas

- Vitest browser mode para tudo que toca Babylon: mais lento; usamos só onde necessário (ADR pode ser emendado).
- Cypress: sem suporte oficial a WebGPU/flags; comunidade menor para WebGL.
- Playwright com flags SwiftShader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), validadas por `gl.getParameter(RENDERER)` no PROTÓTIPO.

## Decisão

Vitest 5 (Node; jsdom para `ui`), Playwright 1.64.1 (container oficial, 4 projetos de viewport, `toHaveScreenshot`), Playwright (`tools/smoke`) para o smoke pós-deploy, `tools/sim` como job de CI com asserts de balanceamento, bench de performance informativo no CI e manual com GPU real.

## Consequências

Números de fps no CI (SwiftShader) são só regressão relativa; os absolutos vêm de execução manual registrada por fase.

## Emenda (2026-10-31)

- O smoke pós-deploy usa Playwright (`@playwright/test`, já aprovado) em vez de agent-browser: agent-browser não é dependência do projeto e o Playwright já traz Chromium com SwiftShader. Muda a decisão original; sem nova dependência.
- A validação do SwiftShader (E-05-05) confirmou as flags: o renderer real é lido de `UNMASKED_RENDERER_WEBGL` (`gl.RENDERER` vem mascarado). Detalhes em SDD 11 §2.

## Referências

`docs/web-search.md` §5.5; SDD 11, 12, 14
