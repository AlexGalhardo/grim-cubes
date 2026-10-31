# ADR-0017 — Câmera em perspectiva com FOV baixo e ângulo fixo

Status: aceito. Data: 2026-10-31.

## Contexto

Isométrico estilo Diablo 4 (briefing). Ortográfica pura dá leitura 'limpa' de pixel art, mas Diablo 4 usa perspectiva com FOV baixo; hordas 3D ganham profundidade com perspectiva leve. O PO escolheu perspectiva (P18).

## Alternativas consideradas

- Ortográfica (54,7°): sem distorção, menos profundidade.
- Perspectiva com rotação livre: legibilidade e mobile piores.
- Perspectiva FOV ~30°, elevação ~55°, fixa, seguindo o herói.

## Decisão

`ArcRotateCamera` com controles desligados: alpha −π/2, beta ≈ 0,96 rad, FOV ≈ 0,52 rad, raio 38 u (34 u em mobile), alvo = herói suavizado; sem rotação; zoom leve opcional. Área visível fixa em altura (16 u); largura varia pelo aspecto dos 4 alvos de tela (D31).

## Consequências

Props altos perto do herói precisam de fade ou regra de geração; valores ajustáveis no PROTÓTIPO sem novo ADR (faixas no GDD §5).

## Referências

GDD §5, §29
