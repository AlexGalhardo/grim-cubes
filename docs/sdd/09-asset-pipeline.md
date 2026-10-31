# SDD 09 — Pipeline de assets

Art Bible §10 define o fluxo; aqui está a implementação.

## 1. Estrutura

```text
assets/src/
├── models/{hero,enemies,bosses,npc,props,tiles,weapons}/<name>.bbmodel + <name>.glb + <name>_d.png [+ <name>_e.png]
├── vfx/<name>.png (sprite sheets)
├── ui/{icons,frames,fonts}/
└── audio/{sfx,music,voice}/<name>.mp3 + <name>.meta.json + prompts.json
public/assets/            (gerado por tools/assets-build; commitado)
├── atlas_characters.png | .ktx2
├── atlas_props.png | .ktx2
├── atlas_vfx_ui.png
├── models/<name>.glb      (UVs reescritos para o atlas)
├── vat/<name>.png         (texturas de animação, RGBA16F empacotado)
├── audio/...
└── manifest.json
```

## 2. `tools/assets-build` (`bun run assets:build`)

Etapas, cada uma com validação que falha o build:

1. **Validate models**: lê cada `.bbmodel` (JSON): só elementos `cube`/`quad` (sem `mesh`), rotações múltiplas de 22,5°, contagem de elementos ≤ orçamento por categoria (Art Bible §5.1), grupos obrigatórios (`root`, `body`, `head`, `weapon_socket`/`hit_socket`), textura única e múltipla de 32 px, sem `#FFFFFF`/`#000000`, ≤ 12 cores por textura.
2. **Validate glTF**: abre o `.glb` com `@gltf-transform/core` (dependência de dev; ADR-0011) e confere: 1 mesh, 1 material, animações obrigatórias por classe (Art Bible §8), `KHR_materials_unlit` ou material sem metallic/roughness.
3. **Atlas**: empacota todas as `_d.png` por categoria num atlas 2048² (algoritmo MaxRects simples, próprio); reescreve UVs dos `.glb` (escala/offset) e grava `public/assets/models/<name>.glb`. Emissivas em canal separado do mesmo atlas (`_e` empacotado nas mesmas coordenadas num segundo PNG).
4. **VAT**: para `enemies/*`: amostra cada clipe a 12 fps, grava posições de vértice por frame numa textura (largura = vértices, altura = frames totais), gera `vat/<name>.png` + JSON com ranges de frames por clipe. Usa o mesmo loader glTF em Node (`@gltf-transform`) e cálculo de skinning em CPU (próprio, ~200 linhas).
5. **KTX2**: converte atlas para KTX2 ETC1S (`toktx` do KTX-Software se instalado; senão pula e marca `ktx2: false` no manifest; CI tem o binário).
6. **Audio**: copia mp3 cujo `meta.plan !== "free"`; falha se algum asset referenciado no jogo tiver `plan: free`.
7. **Manifest**: `manifest.json` com `{ version, generatedAt, entries: { [id]: { url, hash, bytes, kind, group: "core" | "biome:<id>" | "boss:<id>" } } }`. Grupos permitem lazy load.

Tempo alvo: < 60 s com todos os assets da 1.0 em CI.

## 3. Carregamento em runtime (`packages/render/src/assets`)

- `loadManifest()` → `loadGroup("core")` no boot (herói, Mercador, UI, bioma 0, Coveiro); `loadGroup("biome:bone_swamp")` quando o herói se aproxima a 40 u do anel; `loadGroup("boss:<id>")` no início do round 9, 19… (pré-carga de 1 round).
- Modelos via `SceneLoader` dinâmico (`registerBuiltInLoaders`), texturas com `NEAREST`, `samplingMode = Texture.NEAREST_SAMPLINGMODE` aplicado após o load.
- Inimigos comuns: 1 mesh base por tipo com `BakedVertexAnimationManager` + thin instances; chefes/herói/NPC: skeleton normal.
- Cache HTTP: assets com hash no nome (`atlas_characters.a1b2c3.png`) e `Cache-Control: immutable` (SDD 10).

## 4. Fontes

Fontes OFL (`assets/src/ui/fonts/*.woff2`) com `LICENSE.txt` ao lado; carregadas via `@font-face` com `font-display: block` (pixel font não pode trocar depois).

## 5. Testes

- `tools/assets-build` com fixtures mínimas (1 modelo válido, 1 inválido por regra) cobrindo cada validação.
- VAT: vértice conhecido em frame conhecido bate com a pose do glTF (tolerância 1e-4).
- Manifest: hash estável entre duas execuções sem mudanças (build reprodutível).
