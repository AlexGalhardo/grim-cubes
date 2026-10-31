# SDD 09 — Pipeline de assets

Art Bible §10 define o fluxo; aqui está a implementação.

## 1. Estrutura

```text
assets/src/
├── models/{hero,enemies,bosses,npc,props,tiles,weapons}/<name>.bbmodel + <name>_d.png [+ <name>_e.png]   (D5: o .bbmodel é a fonte; um .glb com o mesmo nome é ignorado)
├── vfx/<name>.png (sprite sheets)
├── ui/{icons,frames,fonts}/
└── audio/{sfx,music,voice}/<name>.mp3 + <name>.meta.json + prompts.json
public/assets/            (gerado por tools/assets-build; NÃO versionado: o pipeline é determinístico e `bun run build` o regenera, inclusive na Vercel — decisão do Orq de 2026-10-31)
├── atlas_characters.<hash>.png | .ktx2   (hero, enemies, bosses, npc, weapons)
├── atlas_props.<hash>.png | .ktx2       (props e tiles)
├── atlas_vfx_ui.png                     (provisório até B-03)
├── models/<name>.<hash>.glb  (UVs reescritos para o atlas; o material em runtime é criado pelo render a partir da entrada do atlas no manifest)
├── vat/<name>.<hash>.bin  (matrizes de osso, RGBA32F) + <name>.<hash>.json
├── audio/...
└── manifest.json
```

## 2. `tools/assets-build` (`bun run assets:build`)

Os modelos placeholder são gerados por código em `tools/assets-gen` (`bun run assets:gen`): 24 `.bbmodel` + `_d.png` byte a byte estáveis, só com tokens do Art Bible §3 e suas rampas. O PO refina no Blockbench (D5).

Etapas, cada uma com validação que falha o build com `[regra]` no erro:

1. **Validate models** (`bbmodel.ts`): lê cada `.bbmodel` (JSON). Regras:
   - só elementos `cube`/`quad` (sem `mesh`), sem elementos degenerados
   - rotações múltiplas de 22,5° (elementos e grupos)
   - contagem de elementos ≤ orçamento da classe (`sizeClass` de `data/enemies.json`/`data/props.json`; o máximo da categoria quando não há classe, Art Bible §5.1)
   - grupos obrigatórios (`root`, `body` e `head` em personagens; `weapon_socket` ou `hit_socket`)
   - 1 textura com resolução múltipla de 32 px
   - keyframes só numéricos (sem Molang) e interpolação `linear`/`step`
   - sem `face.rotation` e sem `box_uv` (ainda não suportados)
   - no `_d.png`: sem `#FFFFFF`/`#000000` e ≤ 12 cores
2. **Converter** (`bbmodelToDocument` + `rigidSkin`): monta o glTF que o Blockbench exportaria (1 nó por grupo, cubos em px ÷ px/u da categoria, Euler ZYX, animação por nó). Depois une as primitivas num mesh só. Em personagens, cada nó vira osso com peso 1 (skin rígido, D5); props, tiles e armas viram mesh estático unido. As convenções foram validadas contra o loader do Babylon, mas não contra um export real do Blockbench (golden pendente até o primeiro modelo refinado pelo PO).
3. **Validate glTF** (`rules.ts`, também para `.glb` legado): 1 mesh, 1 material, animações obrigatórias por classe (Art Bible §8), `KHR_materials_unlit` ou material sem metallic/roughness, nenhuma extensão além de `KHR_materials_unlit`, UV em [0, 1].
4. **Atlas** (`atlas.ts`): empacota todas as `_d.png` por atlas (`atlas_characters` e `atlas_props`) em 2048² (MaxRects, melhor encaixe pelo lado curto, ordem binária por altura e nome) com extrusão de 2 px. Reescreve as UVs (escala/offset), declara `KHR_materials_unlit` (o pipeline é a fonte dessa extensão) e grava `public/assets/models/<name>.<hash>.glb`. O atlas é PNG sem filtro de linha (`filterType: 0`), NEAREST e sem mipmaps (`sampling`/`mipmaps` no manifest). Emissivas (`_e`) são provisórias até B-03; o `atlas_terrain` do chão também (hoje os tiles vão para `atlas_props` e o chão usa um placeholder gerado em runtime).
5. **VAT**: para `enemies/*`: amostra cada clipe (idle, walk, attack, hit, death) a 12 fps e grava as matrizes de skin por frame, `inverse(base) × jointWorld × inverseBind`, onde `base` é o pai da raiz do esqueleto (o menor ancestral comum dos joints). É o formato do `VertexAnimationBaker` do Babylon: RGBA32F, largura = (ossos + 1) × 4 texels, altura = frames totais (≤ 4096 nas duas dimensões). Saída `vat/<name>.<hash>.bin` + JSON (`format`, `fps`, `boneCount`, `width`, `height`, `clips {from, to}`). Usa `@gltf-transform`; o cálculo das matrizes é próprio. Nenhuma saída contém data/hora, para o bake ser byte a byte reprodutível.
6. **KTX2**: converte atlas para KTX2 ETC1S (`toktx` do KTX-Software) quando `GC_KTX2=1`; sem o binário (ou sem a variável) pula e marca `ktx2: false` no manifest (o PNG segue sempre). Com sucesso, `atlas_*.<hash>.ktx2` fica ao lado do PNG e o manifest traz `ktx2: { url, hash, bytes }`. No jogo, `loadGameAssets` usa o KTX2 só se o manifest o lista, a GPU tem `etc2`/`astc`/`bptc` e `ktx2DecoderUrl` aponta para o decoder servido localmente (`babylon.ktx2Decoder.js`, `msc_basis_transcoder.js/.wasm` em `/assets/ktx2/`; a CSP bloqueia a CDN do Babylon). O binário `toktx` e os arquivos do decoder dependem de aprovação do PO.
7. **Audio**: copia mp3 cujo `meta.plan !== "free"`; falha se algum asset referenciado no jogo tiver `plan: free`. Provisório até P-06-04 (hoje o `assets-build` não trata áudio).
8. **Manifest**: `manifest.json` (sem `generatedAt`, byte a byte idêntico entre execuções sem mudanças; nomes de arquivo com hash) com `{ version, entries: { [id]: { url, hash, bytes, kind: "atlas" | "model" | "vat", group, sampling?, mipmaps?, width?, height?, meta? } } }`. VATs entram como `vat_<id>`, com `meta` = URL do JSON de clipes. Hoje os grupos são só `core` e `boss:<id>`; `biome:<id>` é provisório até A-02.

Tempo alvo: < 60 s com todos os assets da 1.0 em CI.

## 3. Carregamento em runtime (`packages/render/src/assets`)

- `loadManifest()` → `loadGroup("core")` no boot (herói, Mercador, UI, bioma 0, Coveiro); `loadGroup("biome:bone_swamp")` quando o herói se aproxima a 40 u do anel; `loadGroup("boss:<id>")` no início do round 9, 19… (pré-carga de 1 round). Hoje `loadGameAssets` (`render/assets/gameAssets.ts`) baixa o manifest, os 2 atlas, os inimigos (glb + VAT) e os props pedidos de uma vez, e o que faltar no manifest mantém o placeholder; o carregamento por grupo é provisório até A-02.
- Modelos via `ImportMeshAsync` com `import("@babylonjs/loaders/glTF")` dinâmico. As animações do glTF são descartadas (o movimento vem do VAT), e o skeleton fica no mesh porque o shader só declara `matricesIndices`/`matricesWeights` quando há ossos. O material é trocado por um `StandardMaterial` com o atlas em `NEAREST`, sem mipmaps e sem especular.
- O mesh fica parentado ao `__root__` do loader, que carrega o espelho X da conversão RH → LH. Por isso as thin instances de modelos glTF (horda e props) conjugam `x` e o yaw (ver `coords.ts`).
- Inimigos comuns: 1 mesh base por tipo com `BakedVertexAnimationManager` + thin instances (2º buffer por instância `bakedVertexAnimationSettingsInstanced`); chefes/herói/NPC: skeleton normal (provisório até P-06-06).
- Cache HTTP: assets com hash no nome (`atlas_characters.a1b2c3.png`) e `Cache-Control: immutable` (SDD 10).

## 4. Fontes

Fontes OFL (`assets/src/ui/fonts/*.woff2`) com `LICENSE.txt` ao lado; carregadas via `@font-face` com `font-display: block` (pixel font não pode trocar depois).

## 5. Testes

- `tools/assets-build` com fixtures mínimas (1 modelo válido, 1 inválido por regra, glTF e `.bbmodel`) cobrindo cada validação.
- VAT: oráculo por fixture analítica de 2 ossos com rotação de 90° no frame 5 (tolerância 1e-4); oráculo do Babylon (`babylon-oracle.test.ts`: glb no loader real em NullEngine, `getTransformMatrices` contra o `.bin`, com raiz transformada e com dois joints no topo, < 1e-5).
- Skin rígido: fixture com 2 nós animados vira 1 mesh com skin de 2 ossos, `WEIGHTS_0` = 1 e posição de vértice igual à do glTF por nó no frame 5.
- `assets-gen`: catálogo de 24 modelos, faixas de altura do Art Bible §5.1, bytes estáveis e conversão pelo `assets-build` com as classes reais.
- Manifest e VAT: bytes idênticos entre duas execuções sem mudanças (build reprodutível, sem `generatedAt`).
