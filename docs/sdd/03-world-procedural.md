# SDD 03 — Mundo procedural

Requisitos: GDD §6 (terreno plano, chunks 16×16 u, anel raio 3, biomas por distância, props, cap de corredor), Art Bible §5.

## 1. Coordenadas e origin shifting

- `Position` e `PrevPosition` são relativas a `origin`, um par `f64` sempre múltiplo de 16 u (as posições absolutas são `origin + Position`). Os componentes continuam em `f32`, então a precisão é mantida perto do herói.
- A chave de chunk usa a posição absoluta: `cx = floor((origin.x + x) / 16)`. Mover a origem não muda quais chunks existem.
- Gatilho: `|hero.Position| > 1.024` em x ou em z (valor em `data/world.json`). `applyOriginShift` (em `game/world`) soma o delta (múltiplo de 16) a `origin` e subtrai `delta` de `Position` e `PrevPosition` de todas as entidades no mesmo passo, antes do render, e emite o evento `OriginShifted {dx, dz}`.
- O render consome `OriginShifted`: desloca a câmera e reescreve os buffers de chão e props. O shift é determinístico (mesma sequência de passos, mesmos shifts).
- `useLargeWorldRendering` do Babylon 9 fica fora (ADR-0007: API experimental).

## 2. Chunks

| Item | Valor |
| --- | --- |
| Tamanho | 16 × 16 u, chave `cx = floor(wx / 16)`, `cz = floor(wz / 16)` |
| Anel carregado | `max(abs(cx - hx), abs(cz - hz)) ≤ 3`; total ∈ [49, 81] (a histerese mantém chunks até Chebyshev 4) |
| Anel de spawn | ≤ 2 |
| Carga por passo | no máximo 2 chunks gerados por passo (fila por distância) |
| Descarga | Chebyshev ≥ 5 volta ao pool, antes da carga no mesmo passo |
| Pool | 81 `ChunkData` (9×9), fixo |

### 2.1 Geração (determinística, síncrona na 1.0)

```ts
function generateChunk(seedRun: u32, cx: i32, cz: i32, biomeFn): ChunkData {
	const rng = mulberry32(hash32(seedRun, cx, cz));
	const biome = biomeFn(cx, cz);                 // por distância do spawn (centro do chunk)
	const floorVariant = rng.int(4);               // 4 variantes de textura de chão por bioma
	const props = placeProps(rng, biome);          // 4–10 bloqueantes + 6–14 decorativos + 1–2 destrutíveis
	return { cx, cz, biome, floorVariant, props };
}
```

- `placeProps`: grade de 4×4 células de 4 u; cada célula com chance `biome.propDensity` de receber 1 prop em posição jitter; regra de corredor: rejeita prop bloqueante se já houver 2 bloqueantes nas 8 células vizinhas; nunca prop alto (> 2 u) a < 3 u do ponto de spawn do herói (chunk 0,0).
- Web Worker: não na 1.0 (geração custa < 1 ms por chunk, medido no PROTÓTIPO; se exceder 2 ms, mover para worker com `postMessage` de `ChunkData` serializado — ADR-0007).

### 2.2 Renderização de chunks

- Chão: um `Mesh` plano por chunk (2 triângulos) com UV apontando para a variante no atlas de terreno; `freezeWorldMatrix`; material compartilhado. 49 draw calls de chão → otimização: mesclar os 49 em 1 mesh por bioma quando estável (`MergeMeshes` no descarregar/carregar) é opcional e medido no PROTÓTIPO.
- Props: thin instances por tipo de prop (um mesh base por `prop_*`), buffers reconstruídos quando o anel muda (não por frame). Props destrutíveis têm entidade ECS; decorativos não.
- Decals de sangue: pool fixo de quads (200 desktop / 60 mobile) com `renderingGroupId` acima do chão; FIFO.

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
	"propDensity": 0.45,
	"enemyPool": ["husk", "wail"],
	"music": "mus_biome_cemetery",
	"fogColor": "#14121C"
}
```

- `biomeFn(cx, cz)`: distância `d` do centro do chunk ao spawn; usa o bioma definido de maior `minDistance` ≤ d (enquanto só existe o Cemitério, todos os anéis resolvem para ele); anel 3 repete acima de 420 u. Borda misturada: 16 u a partir do limite, props sorteados 50/50 entre os dois biomas; chão muda em linha dura (aceitável no look cúbico).
- Pool de spawn do round: 60% bioma atual (do herói), 30% anterior, 10% próximo (GDD §10.2). Quando um desses biomas não está definido, o pool renormaliza os pesos entre os biomas existentes.

## 4. Colisão herói/inimigo vs props

- Props bloqueantes: círculo `(x, z, r)` inserido no spatial hash estático do chunk (célula 4 u).
- Movimento: após integrar, para cada prop na célula e vizinhas, se `dist < r_prop + r_ent`, empurra para fora ao longo da normal (uma iteração; suficiente para props convexos pequenos).
- Inimigos: steering de desvio simples (vetor de evasão quando o prop está a < 2 u na direção do movimento); sem pathfinding (GDD §6.3).

## 5. Spawn de posições

- Anel de 22–30 u em torno do herói, ângulo com viés de 60% para o hemisfério oposto ao `Velocity` do herói; rejeita posição dentro de prop bloqueante (até 4 tentativas, senão aceita).
- Posições fora do anel carregado não acontecem (22–30 u < 48 u do raio 3).

## 6. Testes

- Unit: `generateChunk` determinístico (mesma seed → mesmo hash), densidade de props dentro de [4, 10] bloqueantes, regra de corredor nunca violada em 10.000 chunks, nenhum prop alto perto do spawn.
- Integration: andar 5.000 u em linha reta com origin shifting e verificar que posições relativas herói/props são contínuas (sem saltos > 0,01 u).
- Performance: gerar 49 chunks < 50 ms em Node (assert no ROADMAP).
