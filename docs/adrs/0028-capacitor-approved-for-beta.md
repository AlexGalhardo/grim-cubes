# ADR-0028 — Capacitor aprovado para a abertura da BETA; billing ainda sem biblioteca

Status: aceito. Data: 2026-11-01. Complementa o ADR-0018. Decisão do PO na B-04-04 (opção A).

## Contexto

`@capacitor/core`, `@capacitor/cli`, `@capacitor/android` e os plugins do SDD 10 §3 são dependências novas, fora da lista aprovada na E-02-01. O ADR-0018 deixou a biblioteca de Play Billing para um ADR na fase BETA. A fase atual ainda é ALPHA (`0.4`–`0.6`); a BETA abre em `0.7.0`.

## Alternativas consideradas

- A) Aprovar agora, para instalar na abertura da BETA, com a última versão estável exata de cada pacote naquela data. Recomendação do Orq, aceita pelo PO.
- B) Adiar a aprovação para a 1.1, junto do calendário do Android.

## Decisão

O PO aprova as dependências do Capacitor 8 e dos plugins do SDD 10 §3. A instalação acontece na abertura da BETA (B-04-04), não nesta release: cada pacote entra com versão estável exata, sem range. A biblioteca de Play Billing continua sem escolha. Ela ganha o ADR próprio na M-01-03, com a versão da Play Billing Library aceita pelo Play na data do envio. Até lá o jogo não declara o produto `full_version` nem chama a loja.

## Consequências

- `v0.5.0` não adiciona pacote Capacitor nem projeto `apps/android`.
- B-04-04, M-01-02 e M-01-03 seguem abertos: o scaffold, o AAB e a compra dependem da instalação e de conta, keystore e device do PO.
- Nenhuma dependência nova entra por causa deste ADR.

## Referências

ADR-0018; ADR-0002; SDD 10 §3; ROADMAP B-04-04 e M-01-03.
