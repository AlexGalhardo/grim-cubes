# ADR-0021 — Shell Electron: sandbox, protocolo `app://`, sem Steam por ora e fuses

Status: aceito. Data: 2026-10-31. Complementa o ADR-0008 (escolha de Electron 45 + electron-builder, overlay e assinatura), que continua valendo.

## Contexto

A P-07-02 entregou o build Windows (`apps/electron`, instalador NSIS e portable, anexados ao release pelo job `desktop` do `release.yml`). O jogo é o mesmo build Vite da web e pede URLs absolutas (`/assets/...`), que `file://` não serve. O shell carrega conteúdo próprio, mas um renderer com Node ou com navegação livre vira porta de entrada para código arbitrário. A Steam ainda não tem App ID (E-05-03 pendente do PO).

## Alternativas consideradas

- Carregar `dist/index.html` por `file://`: quebra as URLs absolutas e o `fetch` dos assets; exigiria `base` relativo só para o desktop.
- Servidor HTTP local no main process: abre uma porta na máquina do jogador sem necessidade.
- `nodeIntegration` no renderer para falar com a Steam: expõe o sistema inteiro a qualquer XSS.

## Decisão

- Electron 45.2.1 e electron-builder 26.18.0, versões exatas em devDependencies (ADR-0002).
- O main process registra o esquema privilegiado `app` (`standard`, `secure`, `supportFetchAPI`, `stream`) e serve `dist/` por `protocol.handle`. `resolveAppPath` (`apps/electron/src/paths.ts`) recusa qualquer caminho que saia de `dist/`, com testes de travessia. As respostas levam a mesma CSP do `vercel.json` e `X-Content-Type-Options: nosniff`.
- Renderer isolado: `app.enableSandbox()`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`. O preload expõe só `window.gcDesktop = { platform, steam: false }`.
- Sem saída do jogo: `setWindowOpenHandler` nega tudo, `will-navigate` só aceita `app://game/`, o pedido de permissão é sempre recusado, menu da aplicação removido e DevTools só fora do pacote.
- Instância única; tela cheia por padrão, com F11 e Alt+Enter alternando.
- Sem Steam por ora: `steamworks.js` entra com o App ID real (A-06-01), atrás de uma ponte própria no preload.
- Fuses do Electron no `electron-builder.yml`: desligar `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` e `EnableNodeCliInspectArguments`; ligar `EnableEmbeddedAsarIntegrityValidation` e `OnlyLoadAppFromAsar`. Pendente de implementação pelo S2 (achado da auditoria do Esp).

## Consequências

- O jogo desktop roda o mesmo bundle da web, sem caminho especial de assets.
- Builds sem assinatura até haver certificado (ADR-0008); o SmartScreen avisa fora da Steam.
- Enquanto os fuses não entrarem, o executável pode ser usado como Node com `ELECTRON_RUN_AS_NODE`.
- A integração com a Steam exige um preload novo, revisado pelo Esp, sem abrir Node ao renderer.

## Referências

ADR-0008; SDD 10 §2; `apps/electron/src/main.ts`, `paths.ts`, `preload.ts`; `electron-builder.yml`.
