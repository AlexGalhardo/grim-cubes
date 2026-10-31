# ADR-0006 — Simulação separada do render com passo fixo, caps e pools

Status: aceito. Data: 2026-10-31.

## Contexto

Determinismo (seeds, replays, simulador de balanceamento) e performance exigem que a lógica não dependa do frame rate nem de Babylon. Hordas exigem limite de entidades para custo previsível.

## Alternativas consideradas

- Simular no `onBeforeRender` do Babylon com `dt` variável: simples, mas não determinístico e acoplado.
- Passo fixo 1/60 s com acumulador, render interpolado por `alpha`, simulação sem dependência de Babylon (rodável em Node).

## Decisão

Loop com passo fixo 1/60 s, clamp 0,25 s, máximo 5 passos por frame; `packages/game` sem importar `render`; eventos em ring buffer; caps: 100 inimigos (configurável por preset), 512 projéteis, 400 fragmentos; entidades recicladas.

## Consequências

O simulador headless e os testes de determinismo tornam-se possíveis; o cap de inimigos é uma regra de jogo documentada no GDD §10.3.

## Referências

SDD 02, SDD 14
