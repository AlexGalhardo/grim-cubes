# ADR-0023 — Telemetria opt-in com sink local até o serviço do PO

Status: aceito. Data: 2026-10-31.

## Contexto

O GDD §26.2 pede métricas de sessão (rounds alcançados, mortes, chefes, erros) para balancear depois da demo. O jogo é vendido na Steam e roda na web; a telemetria não pode coletar dados pessoais nem enviar nada sem consentimento. O destino dos dados (Vercel Function com Blob/KV, possivelmente no plano Pro) depende de decisão e custo do PO.

## Alternativas consideradas

- SDK de analytics de terceiros: dependência nova, envia identificadores por padrão e exige revisão de privacidade.
- Telemetria ligada por padrão com opt-out: contraria a regra do projeto (`prompt-workers.md` §11).
- Esperar o serviço para implementar: deixaria o jogo sem o ponto de coleta pronto e testado.

## Decisão

- `packages/core/src/telemetry.ts`: lista fechada de eventos (`session_start`, `run_start`, `run_end`, `boss_killed`, `error`), propriedades planas (chave por regex, no máximo 12, texto cortado em 64 caracteres, números finitos), tempo relativo ao início da sessão, sem id de jogador e sem dados do aparelho.
- Desligada por padrão; o jogador liga na tela `Options`. O valor fica em `settings.telemetry` (save schema 4; saves antigos carregam com `false`). Desligada, nada é guardado nem em memória, e desligar descarta a fila.
- Lotes de até 50 eventos, fila de 200 com descarte do mais antigo.
- Sink plugável: hoje `consoleSink` (uma linha JSONL no log local) e `noopSink`. O envio em rede só entra quando o PO decidir o serviço e o armazenamento, com um ADR de emenda e a CSP ajustada (`connect-src`).

## Consequências

- O código de coleta existe e é testado sem que nenhuma requisição saia do jogo.
- A A-06-04 fica parcial até a decisão do PO (Bloqueios do `docs/PROGRESS.md`).
- Qualquer evento novo precisa entrar na lista fechada e passar pela revisão do Esp.

## Referências

GDD §26.2; SDD 06 (telemetria); `packages/core/src/telemetry.ts`; ROADMAP A-06-04.
