# ADR-0008 — Desktop via Electron 45 + electron-builder; overlay e assinatura

Status: aceito; a implementação do shell está no ADR-0021. Data: 2026-10-31. Emenda (2026-11-01, B-04-01): não assinado na 1.0.

## Contexto

Steam exige binário nativo; Electron embute Chromium fixo (comportamento WebGL previsível); o PO escolheu electron-builder (P20). Assinatura Windows via Azure Artifact Signing só atende indivíduos dos EUA/Canadá; overlay Steam em Electron pode exigir flags de GPU instáveis.

## Alternativas consideradas

- Electron Forge: oficial, menos presets de instalador de jogo.
- Tauri 2: binário pequeno, mas WebView2 do sistema (WebGL varia por máquina) e Steamworks menos trilhado.
- NW.js: usado por CrossCode, comunidade menor hoje.

## Decisão

Electron 45.2.1 + electron-builder 26.18.0 (NSIS + portable), `steamworks.js` 0.4.0 no main process, `contextIsolation`. Overlay: testar sem flags no PROTÓTIPO; se exigir `--in-process-gpu`, avaliar estabilidade; se instável, desligar overlay e documentar. Assinatura: certificado OV de terceiro quando houver orçamento; até lá, builds não assinados (SmartScreen) só fora da Steam, que não exibe SmartScreen.

Emenda (2026-11-01, B-04-01): não assinado na 1.0. O PO escolheu distribuir pela Steam, que não mostra o aviso do SmartScreen. O certificado OV não entra nesta versão.

## Consequências

Dois App IDs na Steam (jogo e demo); custo de certificado OV pendente de orçamento do PO; Steam Deck fora do escopo.

## Referências

`docs/web-search.md` §7.1; SDD 10
