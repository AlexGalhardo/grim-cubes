# ADR-0020 — Alvos de tela: 1920×1080, 2560×1440, 896×414 e 800×360 (landscape)

Status: aceito. Data: 2026-10-31.

## Contexto

O PO definiu 4 alvos de tela com base em dados de mercado (Steam Hardware Survey e Statcounter via fontes secundárias, não verificadas pelo Diretor) e pediu foco e otimização neles (D31).

## Alternativas consideradas

- Layout fluido para qualquer tamanho: mais QA, polimento diluído.
- 4 alvos fixos com regras de derivação e capturas obrigatórias em cada um.

## Decisão

Layout de referência 1080p; 1440p com escala de UI 125% automática; mobile em landscape forçado com safe areas e joystick flutuante; breakpoints `mobile-s`, `mobile-l`, `desktop`, `desktop-xl`; capturas visuais e benchmarks obrigatórios nos 4 alvos.

## Consequências

Outros tamanhos funcionam por escala sem garantia de polimento; mudança de alvos exige novo ADR.

## Referências

`docs/brainstorming.md` §7.2; GDD §29; Art Bible §16.4, §17
