# ADR-0018 — Plataformas e monetização: Steam + demo web na 1.0, Android 1.1 com app grátis + IAP, preço US$ 9,99

Status: aceito. Data: 2026-10-31.

## Contexto

Decisões do brainstorming D26–D30. Comparáveis 2D custam ~US$ 5; 3D custam US$ 10–15. Google Play exige Play Billing para desbloqueio e closed test de 14 dias; Vercel Hobby não permite uso comercial.

## Alternativas consideradas

- Lançar tudo junto: triplica o QA do dia 1.
- Vender na web: exige backend e Vercel Pro.
- Android pago + demo separada: duas listagens, sem funil.

## Decisão

1.0 = Steam (Windows) + demo web; 1.1 = Android (app grátis até o round 10 + compra única `full_version` via Play Billing). Preço US$ 9,99 com 10% de desconto nas 2 primeiras semanas e regionais pela ferramenta da Valve. Web em Vercel só com a demo (plano a confirmar conforme fair use).

## Consequências

Biblioteca de billing para Capacitor decidida em ADR na fase BETA; closed test de 12 testers entra no ROADMAP da BETA/1.1.

## Referências

`docs/web-search.md` §7.2, §9; GDD §24
