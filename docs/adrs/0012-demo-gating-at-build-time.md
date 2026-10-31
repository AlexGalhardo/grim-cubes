# ADR-0012 — Demo definida em build time; web é só demo

Status: aceito. Data: 2026-10-31.

## Contexto

A web não vende (D28); Steam usa App ID separado para demo; Android usa IAP. Checar entitlement em runtime na web seria inútil (cliente inspecionável) e um backend não é desejado na 1.0.

## Alternativas consideradas

- Flag de runtime (`isDemo` no save) para todos os alvos: fácil de alterar no cliente.
- Backend de entitlement: custo e Vercel Pro; sem venda na web não se justifica.
- Build separado por modo (`--mode web-demo|electron|android`) com `__IS_DEMO__` constante.

## Decisão

`__IS_DEMO__` por modo de build (web-demo = true; Electron demo App ID = true; Electron jogo = false; Android = false com `flags.fullVersion` via Play Billing). Limites da demo aplicados em `game` a partir dessa constante.

## Consequências

Dois builds Electron (demo e completo); a web nunca recebe o jogo completo.

## Referências

GDD §24; SDD 10
