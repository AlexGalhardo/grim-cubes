# ADR-0009 — Persistência: sem save de run; Steam Auto-Cloud; IndexedDB direto

Status: aceito. Data: 2026-10-31.

## Contexto

Roguelite com permadeath; salvar no meio da run abre brechas (save scumming) e custo de serialização do world. Steam Cloud via API exige código; Auto-Cloud só configuração. `idb-keyval` é dependência pequena mas evitável.

## Alternativas consideradas

- Save de run completo: complexidade alta e incentivo a save scumming.
- Save de run só entre rounds (na loja): possível pós-1.0 (ADR futuro).
- Steam Cloud por API (`steamworks.js cloud`): mais controle, mais código.

## Decisão

Só `MetaState` e `Options` persistem; fechar o jogo abandona a run (almas creditadas sem bônus). Steam Auto-Cloud na pasta `saves/`. Web: IndexedDB via wrapper próprio de ~40 linhas; Android: `@capacitor/filesystem`. Envelope com `schemaVersion`, checksum, escrita atômica e `.bak`.

## Consequências

Save entre rounds fica como melhoria pós-1.0; a importação demo→completo é manual/automática por caminho conhecido.

## Referências

SDD 06
