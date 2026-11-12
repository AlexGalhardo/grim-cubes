# Grim Cubes — prompt da próxima sessão de trabalho

Cole este arquivo inteiro como primeira mensagem de uma sessão nova do Claude Code aberta em `C:\dev\grim-cubes`. Ele foi escrito no fim da sessão de 2026-11-11 e descreve o estado daquele dia; se o `git log` mostrar commits mais novos, o `docs/PROGRESS.md` e o `ROADMAP.md` valem mais que este texto.

## Papel

Você é o arquiteto de software e diretor de jogo do Grim Cubes, um roguelite de sobrevivência em ondas vendido na Steam (Electron) e depois no Google Play (Capacitor). Você é o orquestrador: planeja, delega aos agentes, revisa o que volta e fecha. O PO é o Alex.

## Meta

Implementar o `ROADMAP.md` até o fim, na ordem: o que falta da Parte 1, a release `v0.6.0` (S-17) e só então a Parte 1B (arte 3D medium poly, S-18). Texto para o `/goal`:

```text
Todos os itens da Parte 1 do ROADMAP.md estão marcados [x] com os asserts verificados, ou [!] com o bloqueio registrado em docs/PROGRESS.md, e `bun run typecheck && bun run lint && bun run lint:md && bun run test` termina com exit 0 na branch feat/aaa-polish.
```

## Início da sessão

1. Siga o ritual do `CLAUDE.md`: skills `caveman`, `karpathy-guidelines` e `ponytail`; `docs/PROGRESS.md`; `ROADMAP.md`; `git status`; `bun install --frozen-lockfile`; `bun run typecheck && bun run lint && bun run test`.
2. Skills que não existem nesta instalação: `graphify` (existe só o CLI `graphify`) e `grilling` (use `interview-me`). Avise o PO uma vez e siga.
3. Confirme o modelo com o PO antes da primeira tarefa (regra global dele).
4. Confira a branch: `git rev-parse --abbrev-ref HEAD` deve dar `feat/aaa-polish`. Nada foi enviado ao remoto; a `main` local e a remota estão na `v0.5.0` mais um commit.

## Estado no fim da sessão #4 (2026-11-11)

A `v0.6.0` saiu da `feat/aaa-polish`, integrada na `main` (S-17-02). A Parte 1 do ROADMAP está feita, menos dois itens: a S-16-01, que está `[!]` (baselines do Playwright e e2e completo), e a S-12-03, que está `[~]` (balanceamento dos dois heróis novos). O quadro item a item e as pendências numeradas estão em `docs/PROGRESS.md`, seção "Fechamento da sessão #4".

## Ordem do que falta

1. **S-17-03** conferir os binários publicados da `v0.6.0`: checksums, a versão do APK e o `.exe` portable abrindo até o menu. Se a máquina não abrir o `.exe` sem interação, o item fica `[!]` e o PO testa.
2. **S-16-01** rodar `bun run test:e2e` e regenerar as baselines nos quatro alvos (o fluxo de nova run agora passa pela escolha de herói).
3. **S-12-03** fechar o Fuzilado em Normal e o Coveiro em Nightmare. O bot `kite` (`packages/game/src/bot/policy.ts`) já avalia armas de fogo; a próxima alavanca proposta é perfuração 1 na pistola. Medir com duas seeds.
4. As pendências 3 a 8 de `docs/PROGRESS.md` (legibilidade instável, capturas não abertas, sobreposição do level-up em 896×414, texto de "cinco biomas").
5. **S-18** arte medium poly: começa pelo teste de viabilidade (S-18-01) e para no herói de prova (S-18-03) para o PO aprovar.

## Decisões do PO que valem

- Câmera 25% mais perto com contorno; números em Inter; quatro mecânicas novas (corpos persistentes, três heróis, seed diária, sinergias).
- Áudio: teto de 5.000 créditos ElevenLabs nesta leva; 2.200 já usados. Saldo medido: 42.910, renovação em 2026-11-14.
- Git: branch `feat/aaa-polish`, um commit por item, sem push até a S-17.
- Arte: depois da `v0.6.0`, o jogo inteiro vira 3D medium poly pintado à mão, por IA image-to-3D (AssetFurnace, motor Pixal3D) a partir das concept arts; gore orgânico; horda de 100 no desktop; voxel só na branch `voxel-legacy` (`355fc20`). Detalhe no ADR-0029 e na Parte 1B do ROADMAP.
- Instalações autorizadas para a S-18, com versão fixa: AssetFurnace, glTF Transform e `toktx`. Cada download de pesos mostra origem, tamanho e licença ao PO antes. Nuvem da ferramenta e GPU alugada são gasto e precisam de novo aval.
- A trilha S-15 (Blockbench) foi cancelada.

## Como olhar o jogo

- Servidor com a API de debug: `GC_DEBUG_API=1 bunx vite --config apps/web/vite.config.ts --port 5199`, em background. A porta 5173 costuma estar ocupada por outro projeto do PO: não use nem mate.
- `http://localhost:5199/?debug=1&seed=7` entra direto numa run. `window.gc.ready` vira `true`; `window.gc.debug` tem `state()`, `grantGold(n)`, `grantXp(n)`, `endRound()`, `openShop()`, `spawnElite()`, `toBossFrame()`, `killHero()`, `setHeroHp(f)`, `stillLife(lista)` (procure `window.gc.debug = {` em `apps/web/src/main.tsx`).
- Capturas: script Node com o Playwright do repositório. O esqueleto abaixo funciona; guarde scripts e imagens fora do repositório.

```js
import { createRequire } from "node:module";
const require = createRequire("C:/dev/grim-cubes/package.json");
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await page.goto("http://localhost:5199/?debug=1&seed=7");
await page.waitForFunction(() => window.gc?.ready === true, null, { timeout: 90_000 });
await page.screenshot({ path: "saida.png", timeout: 120_000 });
await browser.close();
```

- Alvos obrigatórios de toda mudança visual: 1920×1080, 2560×1440, 896×414 e 800×360 (os dois últimos com `hasTouch` e `isMobile`). Olhe as imagens antes de aceitar.
- A captura é renderizada por software (SwiftShader), mais escura que numa GPU real.

## Orquestração

- Regras do PO: agentes em paralelo e worktrees só com "sim" explícito na tarefa. Na sessão #4 o PO aprovou até três `senior` em paralelo: um no checkout principal e dois em worktrees (`../grim-cubes-wt2` e `../grim-cubes-wt3`). A integração foi por rebase no worktree e cherry-pick na `feat/aaa-polish`, com `git add` de caminhos exatos. Um `git add` de pasta inteira já levou trabalho alheio para o commit errado. Agentes em sequência não precisam de pergunta. Implementação vai para o agente `senior`, tarefa mecânica para o `estagiario`, pesquisa para o `researcher`.
- Um agente `senior` leva de 20 a 55 minutos por briefing de 3 a 5 itens. Dê a ele o objetivo, os arquivos, os asserts do ROADMAP, como rodar o jogo e o formato do relatório. Peça um commit por item e `git add` só dos arquivos dele.
- Relatório de agente é alegação: confira o `git log`, rode `bun run typecheck`, `bun run lint` e os testes da pasta, e olhe as capturas.
- Enquanto um agente trabalha, não edite `ROADMAP.md`, `CHANGELOG.md`, `apps/web/src/main.tsx` nem os documentos que ele toca; faça trabalho em arquivos separados e commite depois dele.
- Se o PO escrever direto para um subagente, o pedido não chega ao orquestrador. Peça que ele fale com a sessão principal.

## Regras que mais pegam

- Um commit por item, em inglês, Conventional Commits, rodapé `Refs: ROADMAP#<ID>`; no mesmo commit: `[x]` no ROADMAP, linha no `[Unreleased]` do CHANGELOG e o documento afetado.
- O hook de commit roda segredos, markdownlint, biome e `data:check`. Nunca use `--no-verify`. Esquema de `data/*.json` novo ou alterado precisa bater com `data/schema`.
- Nenhuma dependência nova sem o PO; números de jogo em `data/*.json`; cores por tokens; texto pela pasta `locales/` (pt-BR e en); sem `any`.
- Não leia nem altere o `.env`. `bun` carrega as variáveis sozinho; `ELEVENLABS_PLAN=creator` vai na linha de comando do `audio:generate`.
- Comando longo com `python - <<'EOF'` falha no shell desta máquina quando passa de alguns milhares de caracteres: escreva o script num arquivo e rode o arquivo. Arquivo gravado por script precisa sair em LF.
- Com a máquina ocupada, `tools/sim/lib.test.ts` (soak) estoura o timeout; rode sozinho antes de concluir que quebrou.

## Pontas soltas conhecidas

- As baselines de `tests/visual/__screenshots__` são anteriores ao HUD novo; `bun run test:e2e` vai divergir até a S-16-01.
- Só o bioma do cemitério foi capturado depois da mudança de contraste; faltam os outros quatro.
- Não capturados: baú de elite, carta dupla de level-up, número de dano crítico, dash desbloqueado no HUD mobile.
- Em 800×360 a barra do chefe fica a cerca de 8 px da arma e da carteira. Fora de um round o timer fica invisível e sobra a placa "ROUND n".
- Na loja, "Almas" mostra as almas do perfil e o HUD mostra as da run, com o mesmo ícone (entra na S-05-03).
- `sfx_ui_rarity_rare` e `sfx_ui_timer_tick` ficam abaixo do alvo de loudness por serem transientes no teto de pico.
- Máquina do PO: RTX 4060 de 8 GB de VRAM, 32 GB de RAM, 25 GB livres no disco C, WSL Ubuntu. O AssetFurnace foi testado com 16 a 24 GB; por isso a S-18-01 é um teste de viabilidade.
- O MCP do Blockbench aceitou conexão e não respondeu ao handshake; ficou sem diagnóstico e virou legado.
- PixelLab com assinatura expirada. Pendências de conta, custo e loja estão em `todo-later.md`.

## Quando parar e perguntar

Dinheiro, conta, segredo, loja, apagar dados, push fora da S-17, instalar ferramenta ou baixar pesos de modelo, mudança de escopo ou de direção de arte, e o herói de prova da S-18-03. Para perguntas ao PO, use `interview-me` com opções de escolha.

## Ao fechar a sessão

Atualize `docs/PROGRESS.md`, o `ROADMAP.md` (checkboxes e estado de itens parciais), o `CHANGELOG.md`, o `todo-later.md` se algo de conta ou custo mudou, e este arquivo, para a sessão seguinte começar do ponto certo.
