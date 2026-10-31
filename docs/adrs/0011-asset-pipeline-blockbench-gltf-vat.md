# ADR-0011 — Pipeline de assets: Blockbench → glTF → atlas, VAT e KTX2 em script próprio

Status: aceito. Data: 2026-10-31.

## Contexto

Hytale/Blockbench definem o estilo; Babylon lê glTF; inimigos comuns precisam de VAT para thin instances; mobile precisa de KTX2. Validação automática evita assets fora do Art Bible.

## Alternativas consideradas

- Importar `.bbmodel` direto em runtime: formato sem especificação estável.
- Fazer VAT em runtime (Babylon tem `VertexAnimationBaker`): custo no load e não determinístico entre devices.
- Usar `@gltf-transform/core` (dev) para ler/escrever glTF no build vs parser próprio.

## Decisão

Fonte `.bbmodel` + `.glb` exportado manualmente; `tools/assets-build` valida regras do Art Bible, empacota atlas (MaxRects próprio), reescreve UVs com `@gltf-transform/core` (dependência de dev, aprovação do PO necessária antes de instalar), gera VAT em Node e KTX2 via `toktx` quando disponível; `manifest.json` com grupos para lazy load. Saída commitada em `public/assets` e verificada no CI (reprodutível).

## Consequências

Exportação manual do glTF até existir CLI validada; `toktx` precisa estar no CI (imagem com KTX-Software).

## Referências

Art Bible §10; SDD 09
