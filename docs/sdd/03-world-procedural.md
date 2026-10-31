# SDD 03 — Mundo procedural

Requisitos: GDD §6 (terreno plano, chunks 16×16 u, anel raio 3, biomas por distância, props, cap de corredor), Art Bible §5.

## 1. Coordenadas e origin shifting

- `Position` e `PrevPosition` são relativas a `origin`, um par `f64` sempre múltiplo de 16 u (as posições absolutas são `origin + Position`). Os componentes continuam em `f32`, então a precisão é mantida perto do herói.
- A chave de chunk usa a posição absoluta: `cx = floor((origin.x + x) / 16)`. Mover a origem não muda quais chunks existem.
- Gatilho: `|hero.Position| > 1.024` em x ou em z (valor em `data/world.json`). `applyOriginShift` (em `game/world`) soma o delta (múltiplo de 16) a `origin` e subtrai `delta` de `Position` e `PrevPosition` de todas as entidades no mesmo passo, antes do render, e emite o evento `OriginShifted {dx, dz}`.
- O render consome `OriginShifted` para deslocar o chão base e os fantasmas da horda. O alvo da câmera é recalculado a partir do herói (já deslocado) no `sync`, com compensação pela variação de `origin`, então não depende da ordem dos eventos. O `chunkRenderer` recebe `origin` a cada frame e reescreve chão e props quando ela muda. O shift é determinístico (mesma sequência de passos, mesmos shifts). O delta é `round(pos / 16) × 16`; como o herói está a mais de 1.024 u e os corpos ativos estão a menos de 40 u dele, `p − delta` é exato em f32 (Sterbenz).
- `useLargeWorldRendering` do Babylon 9 fica fora (ADR-0007: API experimental).

## 2. Chunks

| Item | Valor |
| --- | --- |
| Tamanho | 16 × 16 u, chave `cx = floor(wx / 16)`, `cz = floor(wz / 16)` |
| Anel carregado | `max(abs(cx - hx), abs(cz - hz)) ≤ 3`; total ∈ [49, 81] (a histerese mantém chunks até Chebyshev 4) |
| Anel de spawn | ≤ 2 |
| Carga por passo | no máximo 2 chunks gerados por passo (fila por distância) |
| Descarga | Chebyshev ≥ 5 volta ao pool, antes da carga no mesmo passo |
| Pool | 81 `ChunkData` (9×9), fixo; slot = `(cx mod 9, cz mod 9)` |

Valores em `data/world.json` (`chunkSize`, `loadRadius`, `unloadRadius`, `chunksPerStep`, `poolSize`, `originShiftThreshold`, `maxPropsPerChunk`, `propAvoidLookahead`, `hordeRenderSlack`). `ChunkData` tem listas de props de capacidade fixa (`propCount`, `propType`, `propKind`, `propX`, `propZ`, até `maxPropsPerChunk`), reutilizadas com o objeto do pool, então carregar um chunk não aloca.

### 2.1 Geração (determinística, síncrona na 1.0)

`createChunkGenerator(seedRun, biomes, config)` em `game/world/chunkGen.ts` devolve `generate(cx, cz, out)`, `propTypes` e `biomeIndex`:

```ts
generate(cx, cz, out) {
	rngState = hash32x3(seedRun, cx, cz);      // PRNG próprio por chunk (mulberry32 inline): independe da ordem de carga
	const biome = biomeIndex(cx, cz);           // por distância do spawn (centro do chunk), com fallback
	out.floorVariant = int(floorTiles.length);  // variantes do bioma
	placeProps(out, biome);                     // 4–8 bloqueantes + 1–2 destrutíveis (grade A) + 6–14 decorativos (grade B) (D3)
}
```

- `placeProps`: duas grades 4×4 independentes de células de 4 u (grade A: bloqueantes e depois destrutíveis, ≤ 1 por célula; grade B: decorativos, ≤ 1 por célula). As contagens são sorteadas pelo PRNG do chunk dentro de `propCounts` de `biomes.json`. `noise2D(wx/48, wz/48)` (`simplex-noise` com tabela semeada por `seedRun`) só ordena a escolha das células. A posição tem jitter dentro da célula (margem 0,5 u).
- Regra de corredor no estado final: um bloqueante só entra numa célula com < 2 vizinhos bloqueantes (8-vizinhança), e só se nenhum desses vizinhos já tiver 2 (grau ≤ 2 para todos). A regra vale só dentro do chunk, limite conhecido na 1.0.
- Nenhum prop, de qualquer altura, a < 3 u do spawn.
- Web Worker: não na 1.0 (geração custa < 1 ms por chunk, medido no PROTÓTIPO; se exceder 2 ms, mover para worker com `postMessage` de `ChunkData` serializado — ADR-0007).

### 2.2 Renderização de chunks

- Chão (`createChunkRenderer`, `render/world/chunkRenderer.ts`): um único `Mesh` com 1 quad por cubo (16 × 16 por chunk) para cada um dos 81 slots, índices `Uint32`. Cada cubo aponta para o tile 32² da variante (sorteada por hash do cubo). Só os slots que mudam (ou todos, quando `origin` muda) são escritos com `VertexBuffer.updateDirectly`; slots vazios ficam degenerados; `alwaysSelectAsActiveMesh`. Hoje o tile é um placeholder gerado em runtime, provisório até P-06-01 (`atlas_terrain` do pipeline).
- Props: thin instances por tipo de prop (um mesh base por `prop_*`; os meshes vindos do glTF têm `x` conjugado por causa do espelho do `__root__`). Só os props de chunks com Chebyshev ≤ `loadRadius` são instanciados (orçamento do SDD 14); os chunks da histerese ficam carregados e invisíveis. Os buffers são reconstruídos quando o anel ou a origem mudam, não por frame.
- Fade (P-02-03): props com altura ≥ `propFade.minHeight` (`data/render.json`) que cortam a linha de visada câmera → herói recebem alpha por instância (buffer `color`, `hasVertexAlpha`). A opacidade fica por (slot, prop) e sobrevive aos rebuilds.
- Props destrutíveis são entidades ECS (`Breakable`, A-02-04): o `breakableSystem` os cria quando o chunk carrega, armas e projéteis os atingem pelo hash de inimigos, e a urna quebrada vira o bit `chunk.broken` e o evento `PropBroken`. Ver SDD 05.
- Decals de sangue: pool fixo de quads (200 desktop / 60 mobile) como thin instances de 1 quad, acima do chão; FIFO (`createDecalPool` em `render/vfx/decals.ts`).

## 3. Biomas

`data/biomes.json`:

```json
{
	"id": "sunken_cemetery",
	"ring": 0,
	"minDistance": 0,
	"maxDistance": 120,
	"floorTiles": ["tile_cemetery_01", "tile_cemetery_02", "tile_cemetery_03", "tile_cemetery_04"],
	"props": { "blocking": ["prop_tombstone_01", "prop_dead_tree_01", "prop_crypt_01"], "decor": ["prop_bone_01", "prop_grass_01"], "breakable": ["prop_urn_01"] },
	"propCounts": { "blocking": [4, 8], "decor": [6, 14], "breakable": [1, 2] },
	"propDensity": 0.45,
	"enemyPool": ["husk", "wail"],
	"music": "mus_biome_cemetery",
	"fogColor": "#14121C"
}
```

- `biomeFn(cx, cz)`: distância `d` do centro do chunk ao spawn; usa o bioma definido de maior `minDistance` ≤ d (os quatro biomas existem: Cemitério Afundado 0–120 u, Pântano de Ossos 120–260, Forja Infernal 260–420 e Ninho Biomecânico acima de 420 u, que se repete ao infinito). Borda misturada (`BIOME_BLEND` = 16 u, `game/world/biome.ts`, A-02-01): metade antes e metade depois do limite; um chunk na borda toma um dos dois biomas de forma determinística por chunk, e o chão muda em linha dura (aceitável no look cúbico). `propDensity` não é mais usado: as contagens vêm de `propCounts`.
- Pool de spawn do round: 60% bioma atual (do herói), 30% anterior, 10% próximo (GDD §10.2). Quando um desses biomas não está definido, o pool renormaliza os pesos entre os biomas existentes. O `spawnSystem` recebe `biomes.at(x, z)` e os `pools` de `biomes.json` (`session.ts`); o `poolFor` fixo (`husk` 6, `wail` 4) só vale para o início do round e como reserva.

## 4. Colisão herói/inimigo vs props

`createPropCollision(chunks, config)` em `game/world/propCollision.ts`:

- Props bloqueantes: círculo `(x, z, r)`, com `r` de `data/props.json` (`radius`). A própria grade de chunks funciona como hash estático (célula = 1 chunk, no máximo `maxPropsPerChunk` props, só `kind` bloqueante testado); a busca alarga pelo maior raio de prop, então props do chunk vizinho contam. As posições são absolutas em f64 (`origin + Position`), o que mantém a colisão correta através de origin shifts.
- `resolve`/`resolveEnemies` (depois do `movementSystem`, para o herói e para os inimigos): para cada prop sobreposto, se `dist < r_prop + r_ent`, empurra para fora ao longo da normal (uma iteração; suficiente para props convexos pequenos).
- `steer` (depois do `behaviorSystem`): o prop mais forte à frente, dentro de `propAvoidLookahead` (2 u, `data/world.json`) + folga, desvia o rumo para o lado oposto e mantém a velocidade; sem pathfinding (GDD §6.3). Os ganhos de steering vêm de `data/world.json` (`propSteerGain`, `propSteerMargin`).
- Sem alocação: candidatos num `Float64Array` de rascunho (hoje 64 props por consulta).

## 5. Spawn de posições

- Anel de 22–30 u em torno do herói, ângulo com viés de 60% para o hemisfério oposto ao `Velocity` do herói; rejeita posição dentro de prop bloqueante (até 4 tentativas, senão aceita). O `spawnSystem` recebe `isBlocked` ligado à `propCollision` em `session.ts`, então um inimigo não nasce dentro de um prop bloqueante, salvo quando as 4 tentativas acabam.
- Posições fora do anel carregado não acontecem (22–30 u < 48 u do raio 3).

## 6. Testes

- Unit: `generate` determinístico e independente da ordem (mesma seed → mesmo fingerprint em 1.000 chunks), contagens dentro das faixas, regra de corredor no estado final (grau ≤ 2) nunca violada em 10.000 chunks, nenhum prop a < 3 u do spawn, zero alocação por chunk.
- Colisão: o herói não atravessa props; 100 inimigos chegam através de `tests/fixtures/prop-field-20.json` (seed 42) em ≤ 15 s; funciona nas bordas de chunk e depois de origin shift.
- Integration: andar 5.000 u em linha reta com origin shifting e verificar que posições relativas herói/props são contínuas (sem saltos > 0,01 u).
- Performance: gerar 49 chunks < 50 ms em Node (assert no ROADMAP).
