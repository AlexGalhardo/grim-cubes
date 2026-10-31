# SDD 06 — Save e persistência

## 1. O que persiste

| Dado | Escopo | Onde |
| --- | --- | --- |
| `MetaState`: almas, nós do Ossuário, recordes, desbloqueios, estatísticas acumuladas, flags (`isDemo`, `fullVersion`), versão do schema | conta | arquivo de save |
| `Options`: áudio, vídeo, gameplay (gore, shake), controles, escala de UI, daltônico, idioma | dispositivo | arquivo de opções (separado do save) |
| `RunState` (run em andamento) | não persiste na 1.0 | — (morte = fim; fechar o jogo abandona a run; ADR-0009) |
| Telemetria local (opt-in) | dispositivo | JSONL rotativo (≤ 5 MB) |

## 2. Formato

JSON com envelope:

```json
{ "schemaVersion": 3, "savedAt": "2026-10-31T12:00:00Z", "app": "grim-cubes", "appVersion": "0.4.0", "checksum": "sha256-…", "data": { "souls": 1250, "ossuary": { "flesh_1": true }, "records": { "normal": 23, "grim": 0, "nightmare": 0 }, "stats": { "kills": 48213, "runs": 31, "bossKills": 4, "elitesKilled": 12 }, "unlocks": ["grim", "cube_of_wrath"], "flags": { "isDemo": false, "fullVersion": true } } }
```

- Validação por JSON Schema (`packages/core/src/save/schema/v3.schema.json`); `checksum` detecta corrupção (não é anti-cheat).
- Migrações em `packages/core/src/save/migrations/` (`v1→v2`, `v2→v3`…), aplicadas em cadeia no load; testes com fixtures de cada versão.
- Escrita atômica: grava em `save.json.tmp`, depois renomeia; mantém `save.json.bak` (última versão válida). Load tenta `save.json`, depois `.bak`, depois cria novo (com aviso na UI).

## 3. Adaptadores por plataforma (`packages/platform/src/storage`)

| Plataforma | Implementação | Caminho |
| --- | --- | --- |
| Web | IndexedDB via `idb-keyval`-like próprio (sem dependência; `indexedDB` API direta com 1 store `kv`) | origem do site |
| Electron | `fs` no main process via IPC (`storage:read`, `storage:write`) | `app.getPath("userData")/saves/save.json` |
| Steam Cloud | Auto-Cloud configurado no Steamworks para a pasta `saves/` (sem código; ADR-0009) | gerenciado pela Steam |
| Android | `@capacitor/filesystem` em `Directory.Data` | `saves/save.json` |

Interface única:

```ts
export interface Storage {
	read(key: "save" | "options" | "telemetry"): Promise<string | null>;
	write(key: "save" | "options" | "telemetry", value: string): Promise<void>;
}
```

## 4. Quando salvar

- `MetaState`: ao fim da run (resultado), ao comprar nó, ao mudar desbloqueio, ao sair do jogo. Nunca por frame.
- `Options`: ao fechar a tela de opções.
- Debounce de 500 ms; fila única para evitar escritas concorrentes.

## 5. Demo → jogo completo

- Steam: demo e jogo completo têm App IDs diferentes; ambos usam Auto-Cloud. O jogo completo, na primeira abertura, procura o save da demo em `userData` da demo (caminho conhecido: `../grim-cubes-demo/saves/save.json`) e importa se `isDemo` e não houver save completo. Também aceita importação manual (botão "Importar save da demo" nas opções).
- Android: mesmo app; a compra apenas vira `flags.fullVersion = true` após `queryPurchases` confirmar.
- Web (demo): save fica no IndexedDB do navegador; não migra para lojas (aceito; GDD §24.2). Botão "Exportar save" gera download JSON e o jogo completo aceita importação manual.

## 6. Testes

- Round-trip serialização; migrações v1→v3 com fixtures; corrupção (checksum errado) cai no `.bak`; escrita atômica simulada com falha no meio; adaptadores com mocks; importação de save da demo.
