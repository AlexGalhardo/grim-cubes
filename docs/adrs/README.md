# ADRs — Architecture Decision Records

Um arquivo por decisão relevante, numerado sequencialmente. Formato: contexto, alternativas consideradas, decisão, consequências, status. Para mudar uma decisão, crie um novo ADR que substitua o anterior (status `substituído por ADR-XXXX`).

| ADR | Título | Status |
| --- | --- | --- |
| [ADR-0001](0001-babylonjs-engine.md) | Babylon.js como engine 3D | aceito |
| [ADR-0002](0002-exact-dependency-versions.md) | Versões exatas de dependências | aceito |
| [ADR-0003](0003-bun-package-manager-node-runtime.md) | Bun como gerenciador e runner; Node como runtime de Vite, Vitest e Playwright | aceito |
| [ADR-0004](0004-biome-linter-formatter.md) | Biome 2 como linter e formatter, com tabs de largura 4 | aceito |
| [ADR-0005](0005-bitecs-ecs.md) | ECS com bitecs 0.4.0 | aceito |
| [ADR-0006](0006-fixed-timestep-simulation-caps.md) | Simulação separada do render com passo fixo, caps e pools | aceito |
| [ADR-0007](0007-infinite-world-chunks-origin-shifting.md) | Mundo infinito com chunks, PRNG por chunk e origin shifting próprio | aceito |
| [ADR-0008](0008-electron-builder-steam-signing.md) | Desktop via Electron 45 + electron-builder; overlay e assinatura | aceito (complementado pelo ADR-0021) |
| [ADR-0009](0009-persistence-no-run-save-auto-cloud.md) | Persistência: sem save de run; Steam Auto-Cloud; IndexedDB direto | aceito (emendado pelo ADR-0025) |
| [ADR-0010](0010-audio-babylon-v2-elevenlabs-offline.md) | Áudio: Babylon Audio Engine v2; ElevenLabs via fetch em script de build | runtime substituído pelo ADR-0022; geração ElevenLabs em vigor |
| [ADR-0011](0011-asset-pipeline-blockbench-gltf-vat.md) | Pipeline de assets: Blockbench → glTF → atlas, VAT e KTX2 em script próprio | aceito |
| [ADR-0012](0012-demo-gating-at-build-time.md) | Demo definida em build time; web é só demo | aceito |
| [ADR-0013](0013-ui-react-overlay-external-store-tailwind.md) | UI: React 19 overlay com store próprio e useSyncExternalStore; Tailwind v4 com tokens; fonte pixel OFL | aceito |
| [ADR-0014](0014-rendering-webgl2-thin-instances-vat.md) | Renderização: WebGL2 padrão, WebGPU opt-in; thin instances + VAT; materiais sem PBR | aceito |
| [ADR-0015](0015-versioning-changelog-release-pattern.md) | Versionamento SemVer, Conventional Commits, Keep a Changelog e releases no padrão vukem | aceito |
| [ADR-0016](0016-git-hooks-lefthook.md) | Git hooks com lefthook | aceito |
| [ADR-0017](0017-camera-perspective-fixed.md) | Câmera em perspectiva com FOV baixo e ângulo fixo | aceito |
| [ADR-0018](0018-platforms-monetization.md) | Plataformas e monetização: Steam + demo web na 1.0, Android 1.1 com app grátis + IAP, preço US$ 9,99 | aceito |
| [ADR-0019](0019-testing-stack.md) | Stack de testes: Vitest, Playwright com SwiftShader, Playwright também para o smoke, simulador de balanceamento no CI | aceito (emendado pelo ADR-0024) |
| [ADR-0020](0020-screen-targets.md) | Alvos de tela: 1920×1080, 2560×1440, 896×414 e 800×360 (landscape) | aceito |
| [ADR-0021](0021-electron-shell-sandbox-app-protocol.md) | Shell Electron: sandbox, protocolo `app://`, sem Steam por ora e fuses | aceito |
| [ADR-0022](0022-audio-web-audio-engine.md) | Motor de áudio em Web Audio puro | aceito |
| [ADR-0023](0023-telemetry-opt-in-local-sink.md) | Telemetria opt-in com sink local até o serviço do PO | aceito |
| [ADR-0024](0024-e2e-out-of-ci.md) | e2e (Playwright) fora do CI e dos gates | aceito |
| [ADR-0025](0025-save-slots-round-checkpoint-pause.md) | Slots de save, checkpoint por round e pausa | aceito |
| [ADR-0026](0026-vercel-manual-rollback.md) | Rollback manual do deploy da Vercel | aceito |
