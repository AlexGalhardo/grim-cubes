# SDD 06 — Save e persistência

## 1. O que persiste

| Dado | Escopo | Onde |
| --- | --- | --- |
| Perfil do slot: almas, nós do Ossuário, recordes, desbloqueios, estatísticas acumuladas, flags (`isDemo`, `fullVersion`) e a run em andamento (checkpoint) | slot (3 por conta) | `slot1`, `slot2`, `slot3` (cada um com seu `.bak`) |
| Settings globais: tudo de `settings` (vídeo, áudio, controles, acessibilidade, idioma) e `settings.lastSlot` | dispositivo, fora dos slots | `save` (e `save.bak`) |
| `RunState` (run em andamento) | checkpoint no início de cada round, dentro do slot (seção 2.1) | `slotN`, campo `run` (decisão do PO de 2026-10-31; revisa o ADR-0009) |
| Telemetria local (opt-in) | dispositivo | JSONL rotativo (≤ 5 MB) |

## 2. Formato

JSON com envelope:

```json
{ "schemaVersion": 3, "savedAt": "2026-10-31T12:00:00Z", "app": "grim-cubes", "appVersion": "0.4.0", "checksum": "sha256-…", "data": { "souls": 1250, "ossuary": { "flesh_1": true }, "records": { "normal": 23, "grim": 0, "nightmare": 0 }, "stats": { "kills": 48213, "runs": 31, "bossKills": 4, "elitesKilled": 12 }, "unlocks": ["grim", "cube_of_wrath"], "flags": { "isDemo": false, "fullVersion": true } } }
```

O exemplo acima é ilustrativo; hoje `SAVE_SCHEMA_VERSION = 12` (`packages/core/src/save.ts`). O `MetaState` ganhou `settings` (schema 2: `preset`, `volume` master/música/efeitos em percentuais, `screenShake`, `locale`), `settings.gameSpeed` (schema 3: 1, 2 ou 3) `settings.telemetry` (schema 4: opt-in, padrão desligado) e as opções de acessibilidade visual (schema 5: `brightness` -50 a 50 e `contrast` 50 a 150 em percentuais inteiros, `colorblind` off, protanopia, deuteranopia ou tritanopia, `flashReduction`, `uiScale` 90, 100, 125 ou 150, e `gore` completo ou reduzido) e `settings.keys` (schema 6: tecla de cada ação remapeável, como `KeyboardEvent.code`; sem duas ações com a mesma tecla, nem com as teclas fixas das outras) e `settings.pad` (schema 7: botão do controle do dash e da pausa; o schema 9 acrescentou o do reroll, X por padrão, e o da velocidade, Back, índices do mapeamento padrão; sem botão repetido nem no D-pad) e `settings.subtitles` (schema 8: legendas das falas dos chefes, ligadas por padrão). As escolhas da tela Options ficam no próprio save, não num arquivo de opções separado.

- Validação campo a campo em código (`validateMeta`), não por arquivo JSON Schema: contadores inteiros em [0, 10⁹]; `unlocks` com strings ≤ 64; `ossuary` com valores booleanos; `flags` booleanas. Chaves desconhecidas são descartadas. `parseSave` checa, nesta ordem: JSON, envelope, `app`, `schemaVersion` (inteiro, ≥ 1, ≤ atual; versão mais nova é recusada), validação e `checksum` (`sha256-…` do `data` normalizado). O `checksum` detecta corrupção (não é anti-cheat). Faltam limites de tamanho de `unlocks`/`ossuary` e a rejeição de chaves `__proto__`/`constructor` (provisório até P-05-08).
- Migração 11→12 (barras de vida): `settings.hpBarHero` e `settings.hpBarEnemies` (booleanos, ligados por padrão; ausentes nos arquivos antigos). O arquivo global dos schemas 10 e 11 tem o checksum sem essas chaves, conferido assim em `parseGlobal`.
- Migração 10→11 (dificuldade Fácil): `records` ganhou `easy` (primeira chave; ausente nos arquivos antigos vale 0). Como o `data` não é reescrito, o checksum dos schemas 1 a 10 é conferido sem `easy` (`withoutEasy`). Os recordes de `normal`, `grim` e `nightmare` não mudam de chave; só o nome exibido de `grim` virou "Difícil".
- Migração 9→10 (slots): o save único dos schemas 1 a 9 vira o slot 1 (ver 2.1). O schema 10 não muda o formato de cada campo, só onde ficam; as migrações abaixo valem para o save único antigo, que `parseSave` ainda lê.
- Migrações: as três mudanças de schema (1→2→3→4) só acrescentam campos de `settings`, então não reescrevem o `data`: `validateMeta` preenche o que faltava com o padrão (`createSettings`) e `parseSave` confere o checksum contra o `data` como a versão antiga o enxergava (`coveredBy`: sem `settings` na v1 e só as chaves de `settings` que cada versão escrevia, nesta ordem, nas v2 a v4; a v5 acrescentou as opções visuais a v6 as teclas a v7 os botões do controle a v8 as legendas e a v9 os botões de reroll e velocidade; saves 7 e 8 só tinham dash e pausa em `pad`, e o checksum antigo é conferido assim). Migrações que reescrevam dados ficam em `packages/core/src/save/` e rodam em cadeia dentro de `parseSave`, antes da validação, com testes de fixtures de cada versão (`save.test.ts` monta um save de cada schema de 1 a 4 e confere os padrões e a recusa de checksum adulterado).
- Escrita e backup: no desktop e no Android, grava em `save.json.tmp`, depois renomeia, e mantém `save.json.bak` (última versão válida). Na web, cada `put` do IndexedDB já é atômico; o `.bak` vira uma segunda chave. Load tenta `save`, depois `.bak`; se os dois falharem, guarda o texto ilegível sem sobrescrever, cria um novo e avisa na UI. Save de versão mais nova nunca é sobrescrito. Hoje `apps/web` só tenta `save` e começa do zero em qualquer erro, sobrescrevendo no fim da run seguinte (provisório até P-05-08).

## 2.1 Slots e checkpoint (schema 10)

**Slots.** A conta tem 3 slots (`SLOT_COUNT`), cada um um perfil completo e independente (almas, Ossuário, recordes, estatísticas, marcos, skins, run em andamento). Os `settings` e as teclas não pertencem a slot: ficam num arquivo global.

| Chave de storage | Conteúdo | Schema 10 |
| --- | --- | --- |
| `save` / `save.bak` | `{ settings }`, com `settings.lastSlot` (0 a 3; 0 = nenhum usado) | envelope próprio, checksum do `data` |
| `slot1`..`slot3` / `slot1.bak`..`slot3.bak` | perfil do slot: `souls`, `records`, `stats`, `unlocks`, `ossuary`, `flags`, `run` | envelope próprio, checksum do `data` |

- Em memória o jogo continua usando `MetaState` (perfil do slot aberto + settings): `loadMeta(io, slot, appVersion)` junta os dois arquivos e `updateMeta(io, slot, mutate, appVersion)` relê ambos sob o lock, aplica a mudança e grava **só o arquivo que mudou**, copiando antes a última versão legível para o `.bak` dele. Uma mudança de volume nunca reescreve um slot, e uma compra no Ossuário nunca reescreve os settings.
- `STORAGE_KEYS` ganhou as seis chaves de slot; o main do Electron só abre arquivos cujo nome é uma dessas chaves (`slot4`, `slot0` e caminhos viram `RangeError`) e `backup(slotN)` copia para `slotN.bak`.
- Slot vazio = nunca gravado, ou perfil igual ao inicial (`isEmptyProfile`). Apagar (`eraseSlot`) grava um perfil inicial no arquivo e no `.bak`, sob o lock; os settings não mudam. Um slot ilegível (arquivo e backup corrompidos) aparece como tal na tela, fica intacto até o jogador apagar, e o texto vai para `save.corrupt`. Um slot de versão mais nova nunca é sobrescrito.
- **Migração do save único.** Na primeira carga com schema 1 a 9 em `save`: o arquivo é lido e verificado como antes (`coveredBy`), o perfil é gravado em `slot1` (nunca por cima de um `slot1` existente) e só depois `save` é reescrito como arquivo global (settings do save antigo, `lastSlot = 1`). Se o app fechar entre as duas escritas, a próxima carga termina o trabalho sem tocar no `slot1`. O `save.bak` antigo fica como está até a próxima escrita.
- `lastSlot` é o slot da última escolha na tela de slots e o que "Continuar" abre; `?slot=N` na URL vale só para aquela carga.

**Checkpoint da run.** No início de cada round (a abertura do intro, depois de sair da loja, e no round 1 ao começar) o jogo grava `run` no slot: `seed`, `difficulty`, `round` que vai começar, ouro, XP e nível, HP, arma (id, tier, quanto foi pago), itens (`owned`), os modificadores escolhidos na run (cartas, itens e baús; os do Ossuário voltam sozinhos porque a sessão é recriada com a mesma conta), rerolls de carta restantes, revives usados, fragmentos no saco, o estado dos 10 streams de RNG, origem do mundo e posição do herói, e as contagens da tela de resultados. **Inimigos, projéteis, pickups no chão, props quebrados e ofertas travadas da loja não são salvos:** o round recomeça limpo.

- Restaurar (`restoreCheckpoint`, `packages/game/src/checkpoint.ts`) recria a sessão com a mesma seed, dificuldade e conta, repõe esse estado e começa no intro do round salvo. Se o save nomeia uma arma que não existe mais, a restauração falha antes de mudar qualquer coisa e o jogo começa uma run nova, descartando o checkpoint.
- Determinismo: o RNG é salvo, então a retomada sorteia os mesmos números que a run original sorteria; `checkpoint.test.ts` prova que (1) duas retomadas do mesmo checkpoint, uma delas pelo caminho completo de salvar e ler, dão o mesmo `hashWorld` por 900 passos com a mesma entrada; (2) uma run interrompida e retomada no início do round N+1 tem o mesmo estado (economia, build, HP e os 10 streams de RNG) que a run contínua. O hash da run original **não** é igual ao da retomada depois que o primeiro inimigo nasce, porque props destruídos e pickups do round anterior (que o save não guarda) mudam a separação e os ids; é a consequência de recomeçar o round limpo.
- A run acaba quando o herói começa a morrer (estado `Dying`) ou no fim da demo: o checkpoint é apagado ali e `applyRun` zera `run` ao creditar a run. Fechar o jogo no meio de um round volta ao início desse round.
- Corridas de debug, bench e links com `?debug`/`?bench` nunca gravam checkpoint.

## 3. Adaptadores por plataforma (`packages/platform/src/storage`)

| Plataforma | Implementação | Caminho |
| --- | --- | --- |
| Web | `createWebStorage` (`storage/web.ts`): `indexedDB` direto, banco `grim-cubes`, 1 store `kv`, sem dependência | origem do site |
| Electron | `fs` no main process via IPC (`storage:read`, `storage:write`); hoje é stub que lança `NotImplementedError` (provisório até P-07-02) | `app.getPath("userData")/saves/save.json` |
| Steam Cloud | Auto-Cloud configurado no Steamworks para a pasta `saves/` (sem código; ADR-0009) | gerenciado pela Steam |
| Android | `@capacitor/filesystem` em `Directory.Data`; hoje é stub que lança `NotImplementedError` (provisório até M-01-02) | `saves/save.json` |

Interface única (`storage/types.ts`):

```ts
export const STORAGE_KEYS = [
	"save", "save.bak", "save.corrupt", "save.corrupt.old",
	"slot1", "slot1.bak", "slot2", "slot2.bak", "slot3", "slot3.bak",
	"options", "telemetry",
] as const;
export interface PlatformStorage { // nome evita colisão com o `Storage` do DOM
	read(key: StorageKey): Promise<string | null>; // null se ausente ou se não for string válida
	write(key: StorageKey, value: string): Promise<void>;
}
```

Fronteira de confiança: chaves fora de `STORAGE_KEYS` lançam `RangeError`. O valor lido do IndexedDB é tratado como entrada não confiável: qualquer coisa que não seja string de até `MAX_VALUE_BYTES` (5 MB) vira `null`, e a escrita recusa valores maiores.

## 4. Quando salvar

- Checkpoint: a cada início de round (seção 2.1), uma escrita pequena do slot; nunca por frame.
- `MetaState`: ao fim da run (resultado), ao comprar nó, ao mudar desbloqueio, ao sair do jogo. Nunca por frame. Hoje só no fim da run, quando `apps/web` liquida a run em `meta` e grava `serializeSave(meta)` (os outros gatilhos entram com o Ossuário e as opções).
- `Options`: ao fechar a tela de opções (provisório até a tarefa de opções).
- Debounce de 500 ms; fila única para evitar escritas concorrentes (provisório: hoje há uma escrita por run, sem fila).

## 5. Demo → jogo completo

- Steam: demo e jogo completo têm App IDs diferentes; ambos usam Auto-Cloud. O jogo completo, na primeira abertura, procura o save da demo em `userData` da demo (caminho conhecido: `../grim-cubes-demo/saves/save.json`) e importa se `isDemo` e não houver save completo. Também aceita importação manual (botão "Importar save da demo" nas opções).
- Android: mesmo app; a compra apenas vira `flags.fullVersion = true` após `queryPurchases` confirmar.
- Web (demo): save fica no IndexedDB do navegador; não migra para lojas (aceito; GDD §24.2). Botão "Exportar save" gera download JSON e o jogo completo aceita importação manual.

## 6. Testes

- Slots e checkpoint: migração 9→10 com checksum conferido (`save.test.ts`, `saveStore.test.ts`), isolamento entre slots, escrita só do arquivo que mudou, apagar slot, slot ilegível preservado, validação do checkpoint campo a campo, chaves de slot no storage web e no Electron, determinismo da retomada (`checkpoint.test.ts`), tela de slots com axe e foco por D-pad.
- Existentes: round-trip de serialização com `schemaVersion` 1; checksum adulterado, versão nova, tipos errados e campos faltando recusados; adaptador web com `fake-indexeddb` (chave inválida, valor não string, limite de tamanho); e2e `results.spec` (almas e recorde sobrevivem ao reload).
- A fazer: corrupção cai no `.bak` e versão nova não é sobrescrita (provisório até P-05-08); migrações com fixtures (quando houver v2); escrita atômica simulada com falha no meio (Electron/Android); importação de save da demo.

## 7. Telemetria opt-in (A-06-04)

`packages/core/src/telemetry.ts`: `createTelemetry({ enabled, sink, now })`. Desligada por padrão (`settings.telemetry`, toggle na tela Options): com ela desligada nada é enfileirado nem enviado. Os eventos são de uma lista fechada (`session_start`, `run_start`, `run_end`, `boss_killed`, `error`) com propriedades planas (números, booleanos e textos de até 64 caracteres, chaves `snake_case`), sem texto livre, identificador do jogador ou dado do dispositivo; o tempo é relativo ao início da sessão. A fila guarda 200 eventos (descarta o mais antigo) e despacha lotes de 50.

Hoje só existem `consoleSink` (uma linha JSONL por evento, no logger) e `noopSink`; o app emite `session_start`, `run_start` (dificuldade, arma e se é a demo), `run_end`, `boss_killed` (chefe e round) e `error` (só o tipo e o nome do erro, no máximo cinco por sessão; nunca mensagem, pilha ou caminho) e despacha a fila quando a página é escondida ou fechada. Falta o serviço: a decisão do PO é o endpoint e o armazenamento. Proposta: Vercel Function `api/telemetry` com rate limit, resposta 204 e gravação em Vercel Blob ou KV (um ADR registra a escolha), lote de até 50 KB a cada 60 s, possivelmente exigindo o plano Pro. Qualquer serviço externo (inclusive de crash report) é dependência nova e precisa de aprovação.
