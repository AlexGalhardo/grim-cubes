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

No Electron o envelope vai para arquivos em `%APPDATA%\grim-cubes\saves\<chave>.json` (via IPC no preload, escrita em `.tmp` com `rename`). O main fixa `app.setPath("userData", %APPDATA%\grim-cubes)` antes do `ready`, para que renomear o pacote ou o `productName` nunca mude a pasta do save; é essa pasta que o Auto-Cloud sincroniza. Não há save órfão: o `package.json` empacotado nas versões até a 0.3.0 tinha `name: "grim-cubes"` e nenhum `productName` (ele só existe no `electron-builder.yml`), então a pasta de perfil padrão dessas versões já era `%APPDATA%\grim-cubes`, com o IndexedDB do save dentro; fixar a mesma pasta e migrar dele para os arquivos na primeira execução (`migrateStorage`) não perde nada. Conferido no `app.asar` empacotado e rodando o `.exe` com um registro semeado no IndexedDB antigo, que apareceu como arquivo.

## Consequências

Save entre rounds fica como melhoria pós-1.0; a importação demo→completo é manual/automática por caminho conhecido.

## Referências

SDD 06
