# Grim Cubes — Software Design Documents (SDD)

Versão 0.1.0 — 2026-10-31. Cada documento cobre um subsistema. Decisões com alternativas estão em `docs/adrs/`. Requisitos de produto em `docs/gdd.md`; regras visuais em `docs/art-bible.md`.

| # | Documento | Escopo |
| --- | --- | --- |
| 01 | [Arquitetura geral](01-architecture.md) | camadas, pacotes, fluxo de dados, bootstrap, convenções de código |
| 02 | [Game loop e ECS](02-game-loop-ecs.md) | fixed timestep, bitecs, ordem de sistemas, determinismo |
| 03 | [Mundo procedural](03-world-procedural.md) | chunks, seed, biomas, props, origin shifting, workers |
| 04 | [Combate, spawn e IA](04-combat-spawn-ai.md) | mira, dano, projéteis, colisão (spatial hash), spawn, steering, elites, chefes |
| 05 | [Itens, skills e economia](05-items-skills-economy.md) | dados em JSON, stats, loja, level-up, almas, Ossuário, simulador |
| 06 | [Save e persistência](06-save-persistence.md) | formato, versionamento, migração, Steam Cloud, Capacitor |
| 07 | [UI React ↔ engine](07-ui-react-engine.md) | store externo, HUD, telas, input, Tailwind |
| 08 | [Áudio](08-audio.md) | Babylon Audio Engine v2, buses, unlock, geração ElevenLabs |
| 09 | [Pipeline de assets](09-asset-pipeline.md) | Blockbench → glTF → atlas/VAT/KTX2 → manifest |
| 10 | [Build e ports](10-build-ports.md) | Vite, Electron/Steam, Capacitor/Android, Vercel |
| 11 | [Testes e qualidade](11-testing-quality.md) | Vitest, Playwright, agent-browser, Biome, markdownlint, lefthook |
| 12 | [CI/CD](12-ci-cd.md) | GitHub Actions: pipelines, matriz, artefatos, deploy |
| 13 | [Release e versionamento](13-release-versioning.md) | SemVer, Conventional Commits, CHANGELOG, releases no padrão vukem |
| 14 | [Performance e orçamentos](14-performance-budgets.md) | metas por plataforma, profiling, degradação |

Convenções comuns a todos os SDDs:

- Código, identificadores, nomes de arquivos e mensagens de commit em inglês. Documentação em português.
- Versões de dependências são exatas (sem `^`), conforme `docs/web-search.md` §5.1 e ADR-0002.
- Caminhos relativos à raiz do repositório.
