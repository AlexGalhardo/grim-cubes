# ADR-0019 — Stack de testes: Vitest, Playwright com SwiftShader, agent-browser para smoke, simulador de balanceamento no CI

Status: aceito. Data: 2026-10-31.

## Contexto

Qualidade exige unit, integração, e2e e smoke (briefing), com WebGL em CI headless e capturas nos 4 alvos de tela.

## Alternativas consideradas

- Vitest browser mode para tudo que toca Babylon: mais lento; usamos só onde necessário (ADR pode ser emendado).
- Cypress: sem suporte oficial a WebGPU/flags; comunidade menor para WebGL.
- Playwright com flags SwiftShader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), validadas por `gl.getParameter(RENDERER)` no PROTÓTIPO.

## Decisão

Vitest 5 (Node; jsdom para `ui`), Playwright 1.64.1 (container oficial, 4 projetos de viewport, `toHaveScreenshot`), agent-browser 0.41.0 para smoke pós-deploy, `tools/sim` como job de CI com asserts de balanceamento, bench de performance informativo no CI e manual com GPU real.

## Consequências

Números de fps no CI (SwiftShader) são só regressão relativa; os absolutos vêm de execução manual registrada por fase.

## Referências

`docs/web-search.md` §5.5; SDD 11, 12, 14
