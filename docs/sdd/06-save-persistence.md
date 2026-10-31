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

O exemplo acima é ilustrativo; hoje `SAVE_SCHEMA_VERSION = 5` (`packages/core/src/save.ts`). O `MetaState` ganhou `settings` (schema 2: `preset`, `volume` master/música/efeitos em percentuais, `screenShake`, `locale`), `settings.gameSpeed` (schema 3: 1, 2 ou 3) `settings.telemetry` (schema 4: opt-in, padrão desligado) e as opções de acessibilidade visual (schema 5: `brightness` -50 a 50 e `contrast` 50 a 150 em percentuais inteiros, `colorblind` off, protanopia, deuteranopia ou tritanopia, `flashReduction`, `uiScale` 90, 100, 125 ou 150, e `gore` completo ou reduzido). As escolhas da tela Options ficam no próprio save, não num arquivo de opções separado.

- Validação campo a campo em código (`validateMeta`), não por arquivo JSON Schema: contadores inteiros em [0, 10⁹]; `unlocks` com strings ≤ 64; `ossuary` com valores booleanos; `flags` booleanas. Chaves desconhecidas são descartadas. `parseSave` checa, nesta ordem: JSON, envelope, `app`, `schemaVersion` (inteiro, ≥ 1, ≤ atual; versão mais nova é recusada), validação e `checksum` (`sha256-…` do `data` normalizado). O `checksum` detecta corrupção (não é anti-cheat). Faltam limites de tamanho de `unlocks`/`ossuary` e a rejeição de chaves `__proto__`/`constructor` (provisório até P-05-08).
- Migrações: as três mudanças de schema (1→2→3→4) só acrescentam campos de `settings`, então não reescrevem o `data`: `validateMeta` preenche o que faltava com o padrão (`createSettings`) e `parseSave` confere o checksum contra o `data` como a versão antiga o enxergava (`coveredBy`: sem `settings` na v1 e só as chaves de `settings` que cada versão escrevia, nesta ordem, nas v2 a v4; a v5 acrescentou as opções visuais). Migrações que reescrevam dados ficam em `packages/core/src/save/` e rodam em cadeia dentro de `parseSave`, antes da validação, com testes de fixtures de cada versão (`save.test.ts` monta um save de cada schema de 1 a 4 e confere os padrões e a recusa de checksum adulterado).
- Escrita e backup: no desktop e no Android, grava em `save.json.tmp`, depois renomeia, e mantém `save.json.bak` (última versão válida). Na web, cada `put` do IndexedDB já é atômico; o `.bak` vira uma segunda chave. Load tenta `save`, depois `.bak`; se os dois falharem, guarda o texto ilegível sem sobrescrever, cria um novo e avisa na UI. Save de versão mais nova nunca é sobrescrito. Hoje `apps/web` só tenta `save` e começa do zero em qualquer erro, sobrescrevendo no fim da run seguinte (provisório até P-05-08).

## 3. Adaptadores por plataforma (`packages/platform/src/storage`)

| Plataforma | Implementação | Caminho |
| --- | --- | --- |
| Web | `createWebStorage` (`storage/web.ts`): `indexedDB` direto, banco `grim-cubes`, 1 store `kv`, sem dependência | origem do site |
| Electron | `fs` no main process via IPC (`storage:read`, `storage:write`); hoje é stub que lança `NotImplementedError` (provisório até P-07-02) | `app.getPath("userData")/saves/save.json` |
| Steam Cloud | Auto-Cloud configurado no Steamworks para a pasta `saves/` (sem código; ADR-0009) | gerenciado pela Steam |
| Android | `@capacitor/filesystem` em `Directory.Data`; hoje é stub que lança `NotImplementedError` (provisório até M-01-02) | `saves/save.json` |

Interface única (`storage/types.ts`):

```ts
export const STORAGE_KEYS = ["save", "options", "telemetry"] as const; // a chave do .bak entra com a P-05-08
export interface PlatformStorage { // nome evita colisão com o `Storage` do DOM
	read(key: StorageKey): Promise<string | null>; // null se ausente ou se não for string válida
	write(key: StorageKey, value: string): Promise<void>;
}
```

Fronteira de confiança: chaves fora de `STORAGE_KEYS` lançam `RangeError`. O valor lido do IndexedDB é tratado como entrada não confiável: qualquer coisa que não seja string de até `MAX_VALUE_BYTES` (5 MB) vira `null`, e a escrita recusa valores maiores.

## 4. Quando salvar

- `MetaState`: ao fim da run (resultado), ao comprar nó, ao mudar desbloqueio, ao sair do jogo. Nunca por frame. Hoje só no fim da run, quando `apps/web` liquida a run em `meta` e grava `serializeSave(meta)` (os outros gatilhos entram com o Ossuário e as opções).
- `Options`: ao fechar a tela de opções (provisório até a tarefa de opções).
- Debounce de 500 ms; fila única para evitar escritas concorrentes (provisório: hoje há uma escrita por run, sem fila).

## 5. Demo → jogo completo

- Steam: demo e jogo completo têm App IDs diferentes; ambos usam Auto-Cloud. O jogo completo, na primeira abertura, procura o save da demo em `userData` da demo (caminho conhecido: `../grim-cubes-demo/saves/save.json`) e importa se `isDemo` e não houver save completo. Também aceita importação manual (botão "Importar save da demo" nas opções).
- Android: mesmo app; a compra apenas vira `flags.fullVersion = true` após `queryPurchases` confirmar.
- Web (demo): save fica no IndexedDB do navegador; não migra para lojas (aceito; GDD §24.2). Botão "Exportar save" gera download JSON e o jogo completo aceita importação manual.

## 6. Testes

- Existentes: round-trip de serialização com `schemaVersion` 1; checksum adulterado, versão nova, tipos errados e campos faltando recusados; adaptador web com `fake-indexeddb` (chave inválida, valor não string, limite de tamanho); e2e `results.spec` (almas e recorde sobrevivem ao reload).
- A fazer: corrupção cai no `.bak` e versão nova não é sobrescrita (provisório até P-05-08); migrações com fixtures (quando houver v2); escrita atômica simulada com falha no meio (Electron/Android); importação de save da demo.

## 7. Telemetria opt-in (A-06-04)

`packages/core/src/telemetry.ts`: `createTelemetry({ enabled, sink, now })`. Desligada por padrão (`settings.telemetry`, toggle na tela Options): com ela desligada nada é enfileirado nem enviado. Os eventos são de uma lista fechada (`session_start`, `run_start`, `run_end`, `boss_killed`, `error`) com propriedades planas (números, booleanos e textos de até 64 caracteres, chaves `snake_case`), sem texto livre, identificador do jogador ou dado do dispositivo; o tempo é relativo ao início da sessão. A fila guarda 200 eventos (descarta o mais antigo) e despacha lotes de 50.

Hoje só existem `consoleSink` (uma linha JSONL por evento, no logger) e `noopSink`; o app liga `session_start` e `run_end`. Falta o serviço: a decisão do PO é o endpoint e o armazenamento. Proposta: Vercel Function `api/telemetry` com rate limit, resposta 204 e gravação em Vercel Blob ou KV (um ADR registra a escolha), lote de até 50 KB a cada 60 s, possivelmente exigindo o plano Pro. Qualquer serviço externo (inclusive de crash report) é dependência nova e precisa de aprovação.
