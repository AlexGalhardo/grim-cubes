# Grim Cubes — ROADMAP

Versão 0.3.0 — 2026-11-11. Reescrito do zero para ser executado com `/goal`; a Parte 1B (arte medium poly) entrou no mesmo dia. A versão anterior (fases ESTRUTURA a 1.1 ANDROID, com todo o histórico de itens concluídos) está no git: `git show v0.5.0:ROADMAP.md`.

Estado de partida: `v0.5.0` publicada, protótipo jogável do round 1 ao chefe, demo web na Vercel, build Windows e APK de debug. Alvo comercial: demo pública em 2027-01-24 e Steam Next Fest de 2027-02-22 a 2027-03-01.

## Meta para o /goal

Cole o texto abaixo depois de `/goal`:

```text
Todos os itens da Parte 1 do ROADMAP.md estão marcados [x] com os asserts verificados, ou [!] com o bloqueio registrado em docs/PROGRESS.md, e `bun run typecheck && bun run lint && bun run lint:md && bun run test` termina com exit 0 na branch feat/aaa-polish.
```

A Parte 1B (arte medium poly) começa depois da `v0.6.0` e tem pontos de parada para o PO. A Parte 2 não entra na meta: depende do PO, de hardware, de loja ou de data.

## Como ler este arquivo

- **Parte 1** é o trabalho que o agente faz sozinho, na ordem em que aparece. **Parte 2** é o que só fecha com o PO.
- Formato de cada item:

```text
- [ ] **ID** Descrição. Deps: IDs.
  - Asserts: verificações objetivas (comando e resultado, arquivo, `data-testid`, métrica).
```

- Status: `[ ]` pendente, `[~]` em andamento, `[x]` concluído com asserts verificados, `[!]` bloqueado por algo fora do alcance do agente (motivo em `docs/PROGRESS.md`), `[-]` cancelado pelo PO.
- IDs da Parte 1: `S-<trilha>-<item>`. A Parte 2 mantém os IDs antigos (`E`, `P`, `A`, `B`, `R`, `M`), para que `docs/PROGRESS.md` e os commits antigos continuem apontando para o item certo.

## Regras de execução

1. Um commit por item, em inglês, Conventional Commits, com rodapé `Refs: ROADMAP#<ID>`. Branch `feat/aaa-polish`. Sem push até a trilha S-17, que faz o merge na `main`, o push e a release a pedido do PO. Nunca `push --force`.
2. Antes de marcar `[x]`: `bun run typecheck`, `bun run lint` e o teste do que foi tocado. Mudança visual também exige captura nos quatro alvos (1920×1080, 2560×1440, 896×414, 800×360).
3. Nenhuma dependência nova. Números de balanceamento só em `data/*.json`. Cores só por tokens de `packages/ui/src/theme.css`. Texto de UI só pelos catálogos de `locales/` (pt-BR e en).
4. `Math.random` proibido em `packages/game`; nada alocado por frame em `simulate` ou `sync`.
5. Todo item que muda regra de jogo roda `bun run sim --check` e fica dentro das faixas do GDD §25.
6. Todo item atualiza no mesmo commit o documento que descreve o que mudou (GDD, Art Bible, SDD ou ADR) e a seção `[Unreleased]` do `CHANGELOG.md`. `docs/PROGRESS.md` é atualizado ao fechar cada trilha.
7. Decisão que envolve dinheiro, conta, segredo, loja ou apagar dados para o item e vira pergunta ao PO. O resto o agente decide e registra.

## Decisões do PO que valem para este ROADMAP (2026-11-11)

| Tema | Decisão |
| --- | --- |
| Legibilidade | câmera 25% mais perto e luz de contorno em herói e inimigos |
| Números | Inter com dígitos tabulares; títulos continuam em Pixelify Sans |
| Mecânicas novas | corpos e sangue persistentes, 3 heróis, seed diária com ranking local, sinergias por etiqueta |
| Áudio | até 5.000 créditos ElevenLabs em SFX de UI |
| Git | branch `feat/aaa-polish`, commits atômicos, sem push até o fim |
| Release de teste | ao fim da Parte 1, merge na `main`, push e `v0.6.0` com `.exe` e `.apk` para o PO baixar e testar (S-17) |
| Releases | editar `v0.1.0` a `v0.5.0` para incluir o link de commit em cada linha |
| PixelLab | assinatura expirada; nenhum asset depende dele |
| Arte 3D | troca para medium poly pintado à mão depois da `v0.6.0`, jogo inteiro, modelos por IA image-to-3D (AssetFurnace, Pixal3D) a partir das concept arts; gore orgânico; voxel só na branch `voxel-legacy`; S-15 cancelada (Parte 1B, ADR-0029) |

---

## Parte 1 — Trabalho do agente (conta no /goal)

### S-00 Releases no padrão vukem

- [x] **S-00-01** O corpo de cada GitHub Release traz o link do commit no fim de cada linha, como em `AlexGalhardo/vukem`; `tools/release` gera o corpo assim e os cinco releases publicados são regenerados. Os binários anexados não mudam.
  - Asserts: para cada tag de `v0.1.0` a `v0.5.0`, `gh release view <tag> --json body -q .body` contém `/commit/` em toda linha de item; `gh release view <tag> --json assets` lista os mesmos arquivos de antes; teste em `tools/release/lib.test.ts` cobre o formato; `docs/sdd/13-release-versioning.md` descreve o formato.

### S-01 Legibilidade do combate

- [x] **S-01-01** Câmera 25% mais perto: `camera.radius` 38 → 28,5 e `camera.radiusMobile` 34 → 25,5 em `data/render.json`; o anel de spawn continua fora da tela nos quatro alvos; a fade de props e as setas de borda continuam corretas.
  - Asserts: teste em `packages/game` ou `packages/render` prova que a distância mínima de spawn é maior que a meia-diagonal visível em 16:9 e em 896×414; herói com altura ≥ 58 px na captura `combat-desktop-1080`; GDD §5 e ADR-0017 emendados.
- [x] **S-01-02** Luz de contorno em herói, inimigos, elites e chefes, com cor por papel (herói osso, inimigo comum neutro, elite e chefe brasa), configurada no bloco de render de `data/render.json` e desligada no preset Mínimo.
  - Asserts: teste unitário do bloco de configuração e do corte por preset; `bun run test:perf` sem regressão de `drawCalls`; captura de combate nos quatro alvos; Art Bible §4 atualizada.
- [x] **S-01-03** Separação de valor na cena: chão com menos ruído e mais escuro que os personagens, pickups e projéteis como os pontos mais claros, vinheta mais leve.
  - Asserts: `reports/legibility.json`, gerado por script em `tools/ux-capture`, registra a luminância média do chão, do herói e dos inimigos na captura de combate, com contraste herói/chão ≥ 3:1 e inimigo/chão ≥ 2,5:1; Art Bible §3 e §4 atualizadas.

- [x] **S-01-04** Números de dano legíveis sobre a cena nova: hoje saem escuros e na fonte pixel ("15" lê "IS"). Dígitos claros com contorno escuro, crítico em destaque, tamanho proporcional à câmera nova.
  - Asserts: teste do atlas ou da configuração dos números em `packages/render/src/vfx`; captura de combate em 1920×1080 e 896×414 com números de dano lidos sem ambiguidade; Art Bible §9 atualizada.

### S-02 Números legíveis

- [x] **S-02-01** Todo número da UI sai da Inter com dígitos tabulares: a face `GC Digits` em `theme.css` recorta da Inter os dígitos e os sinais que andam com eles e vem primeiro em `--font-display`, `--font-mono` e no token novo `--font-num`, de modo que nenhum componente precisa de classe e nenhum número novo escapa.
  - Asserts: `packages/ui/src/fonts.test.ts` prova que a face cobre `0-9 % + , . / : × −`, não cobre letras e vem primeiro nas três pilhas; captura da loja mostra preços e ouro em Inter; Art Bible §16.2 atualizada. (Mecanismo trocado em 2026-11-11: a classe por componente do texto original deixava de fora os números dentro de frases, como "+4% dano".)

### S-03 HUD in-run

- [x] **S-03-01** `HudState` ganha o que o GDD §21.2 pede e hoje falta: tempo restante do round, almas da run, arma atual com tier, itens agrupados com contador, abates e marcadores de fase do chefe. Publicado a 12 Hz, sem alocação por frame.
  - Asserts: teste do view model em `apps/web`; teste que o snapshot reaproveita arrays quando nada mudou; SDD 07 §2 atualizado.
- [x] **S-03-02** HUD em grade de quatro cantos. Topo-esquerda: retrato do herói, HP e XP com nível. Topo-centro: round e timer grandes, ou a barra do chefe. Topo-direita: ouro e almas com ícone, velocidade, pausa. Base-esquerda: arma com pips de tier e faixa de itens. Nada cobre o herói nem o anel de 6 u ao redor dele.
  - Asserts: `data-testid` `hud-hp`, `hud-xp`, `hud-round`, `hud-timer`, `hud-gold`, `hud-souls`, `hud-weapon`, `hud-items`, `hud-kills` presentes; teste de layout prova que nenhum elemento do HUD invade o retângulo central nos quatro alvos; `a11y.test.tsx` verde; capturas nos quatro alvos.
- [x] **S-03-03** HUD mobile: HP e XP compactos, round e timer no centro, joystick à esquerda, dash e pausa à direita, margens pela safe area, alvos de toque ≥ 48 px.
  - Asserts: capturas em 896×414 e 800×360 sem sobreposição; teste de componente dos tamanhos mínimos de toque.
- [x] **S-03-04** Barra do chefe com placa de nome, pips de fase e pulso de fúria; aviso de HP baixo na barra do herói; contagem regressiva destacada nos últimos 5 s do round.
  - Asserts: testes de `BossBar` e `Bar` para os estados; captura `boss` nos quatro alvos.

### S-04 Level-up

- [x] **S-04-01** Cartas no tamanho do Art Bible (220×300 no desktop, 180×240 em 896×414, 160×220 em 800×360) com ícone grande, nome, valor atual → novo, moldura de raridade e tecla no canto. Entrada em `steps`, no máximo 300 ms, desligada com `prefers-reduced-motion`.
  - Asserts: `CardView` com nome, valor atual, valor novo e raridade; testes de `LevelUp` para teclado, controle e toque; capturas `levelup` e `chest` nos quatro alvos.
- [x] **S-04-02** Painel de atributos atuais à esquerda no desktop (GDD §21.1) e botão de troca de cartas visível com a dica da tecla ou do botão.
  - Asserts: teste de componente; painel some nos alvos mobile sem cortar as cartas.

### S-05 Loja

- [~] **S-05-01** Ofertas de arma mostram ícone próprio, dano e ataques por segundo; ofertas de item mostram o efeito e a etiqueta de sinergia (depois da S-14). Estado em 2026-11-11: ícone, dano, ataques por segundo (a melhoria mostra o nível seguinte) e o efeito do item, inclusive os efeitos sem modificador de atributo, estão prontos; falta a etiqueta de sinergia, que depende da S-14.
  - Asserts: teste de `Shop` com fixture de arma e de item; nenhuma oferta usa o ícone genérico.
- [x] **S-05-02** Prévia nos atributos: ao focar ou passar o mouse numa oferta, cada atributo afetado mostra o delta em verde ou vermelho antes da compra.
  - Asserts: `data-testid="shop-delta-<stat>"` aparece com o valor certo no teste; funciona por teclado e por controle.
- [x] **S-05-03** Limpeza de layout: o ouro aparece uma vez, a grade de itens mostra os itens e uma linha vazia em vez de 16 slots, o botão de upgrade da arma fica junto da arma, e em mobile os atributos cabem sem rolar a tela inteira.
  - Asserts: um único `shop-gold` no DOM; capturas `shop` nos quatro alvos; `screens.pad.test.tsx` verde.

### S-06 Resultados

- [x] **S-06-01** Tela de resultados com resumo da build (arma, itens com ícone e contador), tempo de run, dano por fonte em barras, quem matou o herói com nome e ícone, contador de almas em destaque e progresso até o próximo desbloqueio. Os três botões têm o mesmo tamanho e a mesma linha de base.
  - Asserts: `ResultsViewModel` com os campos novos e teste do view model; a causa da morte nunca é "Desconhecido" numa morte real (teste com dano de inimigo, de elite, de chefe e próprio); capturas `results` nos quatro alvos.

### S-07 Menu e chamada comercial

- [x] **S-07-01** Menu com hierarquia: botão principal de destaque, recordes por dificuldade legíveis, selo "DEMO" visível e brasas animadas em CSS sobre a key art (paradas com `prefers-reduced-motion`).
  - Asserts: teste de `Menu`; capturas `menu` nos quatro alvos; navegação por controle intacta.
- [x] **S-07-02** Botão "Wishlist na Steam" no menu, no fim da demo e nos resultados da demo, ligado por uma URL de configuração de build. Sem URL, o botão não aparece.
  - Asserts: teste com e sem a URL; no Electron o link abre no navegador do sistema pelo canal já validado; `todo-later.md` registra que a URL depende do App ID (E-05-03).

### S-08 Dificuldade, Ossuário e Opções

- [x] **S-08-01** Dificuldade: foco e seleção com aparências diferentes, caixa de seleção no estilo do jogo, uma linha de sabor por dificuldade.
  - Asserts: teste de componente distingue `aria-checked` de foco; captura `difficulty` nos quatro alvos.
- [x] **S-08-02** Ossuário: nó bloqueado com contraste AA, estado comprado, comprável e bloqueado distinguíveis sem cor, área vazia da tela aproveitada.
  - Asserts: contraste medido no teste de tokens; captura `ossuary` nos quatro alvos.
- [x] **S-08-03** Opções: o seletor de qualidade não quebra linha, o brilho neutro mostra 100%, e a tela cabe em 800×360 sem corte.
  - Asserts: captura `options` nos quatro alvos; teste do rótulo do brilho.

### S-09 Ícones que faltam

- [x] **S-09-01** Ícone próprio para cada arma e cada magia automática, no mesmo padrão dos 84 existentes (grade de 14×14 blocos, só cores da paleta, leitura pela forma), gerados por script e registrados em `assets/src/models/authored.json`.
  - Asserts: um PNG por id de `data/weapons.json` em `assets/src/icons/weapon`; `bun run assets:build` exit 0; teste que todo id de arma resolve um ícone; Art Bible §11 atualizada.

### S-10 Áudio de UI

- [x] **S-10-01** SFX de UI que faltam (abrir level-up, escolher carta, revelar raridade, compra, compra negada, transição de tela, contagem de almas, desbloqueio), gerados com `bun run audio:generate` dentro do teto de 5.000 créditos e ligados aos eventos da UI. Estado: os 11 SFX foram gerados (commit `21368ef`, 2.200 créditos estimados) e estão ligados aos eventos por `apps/web/src/audio/uiSounds.ts`; `sfx_ui_hero_select` e `sfx_ui_synergy` entram com as telas da S-12-02 e da S-14-02.
  - Asserts: `docs/audio/credits.md` soma a rodada e o total da rodada é ≤ 5.000; cada arquivo tem `.meta.json` com plano `creator` e loudness medido; `bun run assets:build` exit 0; teste que cada evento de UI toca o SFX certo.

### S-11 Corpos e sangue persistentes

- [x] **S-11-01** Restos de inimigos e manchas de sangue ficam no chão a run inteira, dentro de um teto por preset definido em `data/render.json`; ao estourar o teto, os mais antigos e mais distantes do herói somem primeiro. O gore reduzido das Opções continua valendo. O sistema de teto e descarte não depende do estilo da arte: o visual em cubos é trocado por gore orgânico na S-18-08.
  - Asserts: teste do teto e da ordem de descarte; `bun run test:perf` com `frameP99` dentro da tolerância de `tools/perf/compare.ts`; nada alocado por frame (teste de alocação existente verde); captura do round 10 com o chão marcado; GDD §23 e Art Bible §9 atualizados.

### S-12 Três heróis

- [ ] **S-12-01** Dados de três heróis (arma inicial, atributos base e passiva): o Carrasco atual e dois novos, com nomes diegéticos propostos pelo agente e registrados para confirmação do PO. Esquema em `data/schema` e validação em `data:check`.
  - Asserts: `bun run data:check` exit 0; teste que cada herói inicia a run com a arma e a passiva certas; GDD §7 atualizado.
- [ ] **S-12-02** Tela de escolha de herói entre os slots e a dificuldade, com retrato, arma, passiva e condição de desbloqueio; desbloqueios pelos marcos de `data/milestones.json`; o herói escolhido fica no checkpoint da run.
  - Asserts: teste de componente e de navegação por controle; migração do save com teste (versão do esquema sobe); captura nos quatro alvos; SDD 06 atualizado.
- [ ] **S-12-03** Balanceamento: `bun run sim --check` passa para os três heróis nas três dificuldades.
  - Asserts: `reports/balance-*.json` com os três heróis dentro das faixas do GDD §25.

### S-13 Seed diária

- [ ] **S-13-01** "Desafio diário" no menu: seed derivada da data UTC, dificuldade Normal, herói do dia, uma tentativa pontuada por dia por slot e tabela local dos últimos 30 dias (round, tempo, abates). O ranking online espera o App ID (Parte 2).
  - Asserts: teste de que a mesma data gera a mesma seed e o mesmo herói; teste de que a segunda tentativa do dia não pontua; migração do save com teste; captura da tela nos quatro alvos; GDD §20 atualizado.

### S-14 Sinergias por etiqueta

- [x] **S-14-01** Cada item ganha uma ou duas etiquetas de um conjunto de seis; juntar 2, 4 e 6 da mesma etiqueta dá bônus definidos em `data/synergies.json`, com esquema e `data:check`.
  - Asserts: `bun run data:check` exit 0; todo item de `data/items.json` tem etiqueta; teste de aplicação e remoção dos bônus; GDD §15 atualizado.
- [ ] **S-14-02** A loja e o HUD mostram as etiquetas e o progresso de cada sinergia; a prévia da S-05-02 inclui o bônus que a compra ativaria.
  - Asserts: testes de `Shop` e do HUD; capturas `shop` nos quatro alvos.
- [x] **S-14-03** Balanceamento: `bun run sim --check` dentro das faixas com as sinergias ligadas.
  - Asserts: `reports/balance-*.json` atualizado; nenhuma faixa do GDD §25 violada.

### S-15 Modelos 3D no Blockbench

Cancelada pelo PO em 2026-11-11: a arte muda para 3D medium poly depois da `v0.6.0` (trilha S-18), então refinar os modelos voxel deixou de valer o esforço. O plugin MCP do Blockbench também não respondeu nesta sessão.

- [-] **S-15-01** Herói, os 8 inimigos comuns e os chefes revisados no Blockbench para a câmera nova. Substituída pela S-18.
- [-] **S-15-02** Modelos próprios dos dois heróis novos da S-12. Substituída pela S-18; até lá eles usam o modelo do Carrasco recolorido.

### S-16 Fechamento

- [ ] **S-16-01** Baselines do Playwright regeneradas nos quatro alvos para todas as telas tocadas e `bun run test:e2e` verde na máquina local.
  - Asserts: `bun run test:e2e` exit 0; nenhuma baseline antiga de tela tocada sobra em `tests/visual/__screenshots__/`.
- [ ] **S-16-02** Documentação alinhada: GDD §21, Art Bible §11, §16 e §17, SDD 07, `CHANGELOG.md` `[Unreleased]`, `docs/PROGRESS.md`, `AGENTS.md` e `CLAUDE.md` se algum comando ou convenção mudou, `todo-later.md` para o que virou pendência de loja.
  - Asserts: `bun run lint:md` exit 0; `tools/changelog-check` verde.
- [ ] **S-16-03** Validação final completa.
  - Asserts: `bun run typecheck && bun run lint && bun run lint:md && bun run test` exit 0; `bun run build` exit 0; `bun run sim --check` exit 0.

### S-17 Release de teste para o PO

Pedido do PO em 2026-11-11: ao fim da Parte 1, uma release nova com o `.exe` e o `.apk` prontos para baixar e testar. É o único item que faz merge na `main`, push e tag; tudo antes dele fica na `feat/aaa-polish`.

- [x] **S-17-01** `release.yml` também gera e anexa o APK de debug (`bun run build:android`), para que a release saia completa sem passo manual. Deps: S-16-03.
  - Asserts: o workflow tem o job do APK e inclui o arquivo em `checksums.txt`; `docs/sdd/12-ci-cd.md` e `docs/sdd/13-release-versioning.md` descrevem o asset.
- [ ] **S-17-02** Merge da `feat/aaa-polish` na `main` (sem `--force`), push, CI verde e `bun run release minor --publish`, que publica a `v0.6.0`. Deps: S-17-01.
  - Asserts: `gh run list --branch main --limit 1` com `conclusion: success` no commit da tag; `gh release view v0.6.0 --json assets` lista `GrimCubes-Setup-0.6.0.exe`, `GrimCubes-0.6.0-portable.exe`, `grim-cubes_0.6.0_android.apk`, `checksums.txt` e o SBOM; o corpo da release segue o formato da S-00-01; `CHANGELOG.md` tem a seção `[0.6.0]`; `docs/PROGRESS.md` registra a release e os links de download.
- [ ] **S-17-03** Conferência dos binários publicados: o `.exe` portable baixado da release abre e chega ao menu, e o APK baixado tem a versão `0.6.0`.
  - Asserts: `sha256sum` dos arquivos baixados confere com `checksums.txt`; captura do menu do executável em `reports/`; `aapt dump badging` (ou equivalente) mostra `versionName='0.6.0'`. Se a máquina não tiver como abrir o `.exe` sem interação, o item fica `[!]` com o motivo e o PO testa.

---

## Parte 1B — Arte 3D medium poly (depois da v0.6.0)

Decisão do PO em 2026-11-11, registrada no ADR-0029. Esta parte só começa com a `v0.6.0` publicada (S-17) e entra na meta do `/goal` depois dela. O passo a passo de cada asset é a skill `medium-poly-art`; o agente é o `medium-poly-artist`.

| Tema | Decisão |
| --- | --- |
| Escopo | o jogo inteiro: heróis, inimigos, chefes, NPC, cenário, props, armas, projéteis e pickups |
| Produção | IA image-to-3D a partir das concept arts de `references/concept-arts/`, com limpeza, rig e animação no Blender 5.3 já instalado |
| Ferramenta | AssetFurnace (`github.com/Bingeljell/image-to-3dlab`, Apache-2.0), motor Pixal3D; Hunyuan3D proibido (pesos não licenciados para UE, Reino Unido e Coreia do Sul) |
| Estilo | pintado à mão, material simples: um albedo por modelo com luz e sombra desenhadas |
| Gore | partículas e decals orgânicos no lugar dos cubos de sangue |
| Horda | 100 inimigos simultâneos no desktop; só o preset Mínimo e o celular podem baixar |
| Voxel | preservado só na branch `voxel-legacy` (commit `355fc20`); sai da `main` na S-18-09 |
| Instalações autorizadas | AssetFurnace, glTF Transform e KTX-Software (`toktx`), com versão fixa; cada download de pesos mostra origem, tamanho e licença ao PO antes |

Fatos medidos em 2026-11-11 que condicionam o plano: a máquina do PO tem uma RTX 4060 com 8 GB de VRAM, 32 GB de RAM, 25 GB livres no disco C e WSL Ubuntu instalado. A ferramenta foi testada pelos autores com 16 a 24 GB de VRAM, tem "teste limitado" no Windows nativo e o MCP dela não foi testado no Windows. Os pesos do Pixal3D ocupam 8,4 GB. Por isso a trilha começa por um teste de viabilidade.

### S-18 Troca de arte

- [ ] **S-18-01** Viabilidade e instalação. Mostrar ao PO a origem, o tamanho e a licença do instalador e dos pesos do Pixal3D; instalar o AssetFurnace numa versão fixa; conectar o MCP `assetfurnace`; gerar o Carrasco a partir de `hero-headsman.png` no Windows nativo e, se falhar, no WSL Ubuntu. Se não rodar em 8 GB de VRAM, parar: a nuvem da ferramenta e GPU alugada custam dinheiro e são decisão do PO. Deps: S-17-02.
  - Asserts: `docs/art/medium-poly/feasibility.md` com a versão instalada, onde rodou, tempo por modelo, pico de VRAM e o caminho do GLB gerado; `docs/legal/third-party.md` com a versão e os hashes; a resposta do PO sobre a rota (local, nuvem ou GPU alugada) em `docs/PROGRESS.md`; ADR-0029 emendado com o resultado.
- [ ] **S-18-02** Pipeline de GLB: `assets/src/models/**/*.glb` entra no `assets:build` com as validações do SDD 09 §6 (triângulos por categoria, um albedo, lado da textura, clipes obrigatórios, sockets, escala, `.provenance.json` com `commercial-clear`). Malha com skin para herói, chefes e NPC; VAT para a horda; atlas por categoria. glTF Transform entra como dependência de desenvolvimento em versão exata. Sem dependência nova de runtime. Deps: S-18-01.
  - Asserts: `bun run assets:build` exit 0 com o GLB da S-18-01; testes do conversor e de cada validação; `docs/sdd/09-asset-pipeline.md` §6 deixa de dizer "planejado".
- [ ] **S-18-03** Herói de prova: o Carrasco em medium poly, limpo para 3 a 6 mil triângulos, rigado e com os oito clipes de `REQUIRED_CLIPS` (idle, run, attack_melee, attack_ranged, hit, dash, death, victory), rodando no jogo. **Ponto de parada: o PO aprova ou reprova antes de qualquer outro modelo.** Reprovado, a `main` continua voxel e o ADR-0029 é revisto. Deps: S-18-02.
  - Asserts: capturas nos quatro alvos, lado a lado com o voxel; `bun run test:perf` dentro da tolerância; `bun run ux:legibility` passa; aprovação do PO registrada em `docs/PROGRESS.md`.
- [ ] **S-18-04** Guia de estilo escrito a partir do herói aprovado: Art Bible §1, §5 a §10, §13 e §14 e GDD §1 reescritos para o medium poly pintado à mão (proporções, orçamento, textura, animação, o que evitar, checklist de aprovação). Deps: S-18-03.
  - Asserts: `bun run lint:md` exit 0; nenhuma seção do Art Bible descreve voxel como direção atual; a regra de que modelo 3D só nasce no Blockbench (§13) sai.
- [ ] **S-18-05** Os 8 inimigos comuns e suas variantes, na horda com VAT. Inimigo não humanoide (sanguessuga, vigia) com rig manual. Teto da horda por preset: 100 no desktop; o preset Mínimo e o celular podem cair para cerca de 60 com mais vida por inimigo, se o `test:perf` exigir. Deps: S-18-04.
  - Asserts: `bun run test:perf` com `frameP99` dentro da tolerância no cenário `round20`; `bun run sim --check` dentro das faixas se o teto mudar; capturas `enemy-*` e `horde-types`.
- [ ] **S-18-06** Os 5 chefes, os elites, o Mercador de Ossos e os dois heróis novos da S-12. Deps: S-18-04.
  - Asserts: capturas nos quatro alvos; clipes de fase, fúria e morte conferidos em captura; tela de escolha de herói com os três modelos.
- [ ] **S-18-07** Cenário e props dos 5 biomas (chão, túmulos, árvores, ruínas, props quebráveis), com a separação de valor da S-01-03 mantida. Deps: S-18-04.
  - Asserts: capturas `biome-*` nos quatro alvos; `reports/legibility.json` passa nos 5 biomas.
- [ ] **S-18-08** Armas, projéteis e pickups no estilo novo, e gore orgânico: partículas e decals de sangue e pedaços de malha no lugar dos cubos, inclusive nos corpos persistentes da S-11 e na opção de gore reduzido. Deps: S-18-05.
  - Asserts: capturas de combate nos quatro alvos; `bun run test:perf` dentro da tolerância; nada alocado por frame; Art Bible §9 e GDD §23 atualizados.
- [ ] **S-18-09** Limpeza: o caminho voxel (`.bbmodel`, `assets:gen`, skill e agente do Blockbench, `docs/blockbench.md`, `.mcp.json` do Blockbench) sai da `main`; documentação, key art e textos da loja revisados; a pergunta sobre manter o nome "Grim Cubes" respondida pelo PO (`todo-later.md`). Deps: S-18-05 a S-18-08.
  - Asserts: `bun run typecheck && bun run lint && bun run lint:md && bun run test && bun run build` exit 0; nenhum `.bbmodel` na `main`; a branch `voxel-legacy` continua existindo.
- [ ] **S-18-10** Release `v0.7.0` com o `.exe` e o `.apk` da arte nova. Deps: S-18-09.
  - Asserts: os mesmos da S-17-02, para a `v0.7.0`.

---

## Parte 2 — Depende do PO, de hardware, de loja ou de data (fora do /goal)

Os IDs são os da versão anterior. O detalhe de cada assert está em `git show v0.5.0:ROADMAP.md`.

### Contas, loja e marketing

| ID | O que falta | Depende de |
| --- | --- | --- |
| E-05-02 | registrar `grimcubes.com` e `grimcubes.com.br`; `docs/legal/domains.md` | PO (pagamento) |
| E-05-03 | conta Steamworks (US$ 100), App ID do jogo e da demo | PO (pagamento) |
| E-05-04 | secret `ELEVENLABS_API_KEY` no ambiente `audio` do GitHub | PO (segredo) |
| A-06-01 | Steamworks real: achievements, Auto-Cloud, dois builds Electron | E-05-03 |
| A-06-02 | página Steam: capsules, 5 capturas, trailer de 60 s, preço | E-05-03, Parte 1 concluída |
| A-06-03 | demo pública em 2027-01-24 e inscrição no Next Fest | A-06-02 |
| A-06-04 | endpoint e envio em lote da telemetria opt-in | decisão do PO (ADR-0023) |
| B-05-03 | submissão do build à Valve | A-06-01 |
| S-13 online | ranking online da seed diária | E-05-03 |

### Hardware e playtest

| ID | O que falta | Depende de |
| --- | --- | --- |
| P-07-05 | bench com GPU real e relatório no Chrome mobile | máquina e aparelho do PO |
| P-07-06 | `docs/playtests/2026-12-protótipo.md`, 3 sessões | pessoas |
| A-07-04 | playtests da ALPHA, 6 sessões | pessoas |
| B-03-04 | calibração de juice por playtest em `data/render.json` | A-07-04 |
| B-04-02 | checklist manual de Xbox e DualSense | controles do PO |
| B-04-03 | beta fechado na Steam, ≥ 50 runs, crash-free ≥ 99,5% | A-06-01 |
| B-04-04 | `reports/perf-android-<device>.json` | aparelho do PO |
| R-01-02 | soak de 2 h com GPU real | máquina do PO |
| R-01-03 | `reports/perf-final-*.json` nos quatro alvos | máquina e aparelho do PO |
| A-01-03 | PR de demonstração do job `perf` (sleep de 5 ms) e o revert | push e CI |

### Releases

| ID | O que falta | Depende de |
| --- | --- | --- |
| A-07-05 | a versão da demo pública (`v0.6.x`, depois da `v0.6.0` de teste da S-17) | aprovação do PO sobre a `v0.6.0` |
| B-05-04 | `v0.7.0`, `v0.8.0`, `v0.9.0` | fases seguintes |
| R-01-01 | `v1.0.0-rc.1` na branch `release/1.0` | conteúdo da 1.0 fechado |
| R-01-05 | pendências da auditoria que só fecham na RC | R-01-01 |
| R-02-01 a R-02-05 | `v1.0.0`, upload Steam, demo com "Comprar na Steam", monitoramento de 7 dias, retrospectiva | R-01-01, A-06-01 |
| E-01-06 | proteção da `main` | decisão do PO (hoje desligada de propósito) |

### 1.1 Android

| ID | O que falta | Depende de |
| --- | --- | --- |
| M-01-01 | conta Google Play, secrets do ambiente `android`, Data safety | PO (pagamento) |
| M-01-02, M-01-02b | Capacitor 8 completo, AAB assinado, `flags.fullVersion` | M-01-01 |
| M-01-03 | Play Billing do produto `full_version` | M-01-01 |
| M-01-04 | preset Baixo, KTX2, capturas nos dois alvos mobile | aparelho do PO |
| M-01-05, M-01-06 | closed test de 14 dias, produção e `v1.1.0` | M-01-01 |

## Calendário

| Marco | Data | Versão |
| --- | --- | --- |
| Parte 1 concluída e release de teste (S-17) | até 2026-12-13 | `v0.6.0` |
| Viabilidade da ferramenta de image-to-3D (S-18-01) | logo depois da `v0.6.0` | — |
| Herói de prova em medium poly (S-18-03) | até 2026-12-20 | — |
| Página Steam no ar (A-06-02) | 2027-01-10 | — |
| Demo pública (A-06-03) | 2027-01-24 | `v0.6.x` |
| Steam Next Fest | 2027-02-22 a 2027-03-01 | `v0.6.x` |
| BETA | 2027-03-02 a 2027-04-04 | `v0.7.0` a `v0.9.0` |
| 1.0 RC e lançamento | 2027-04-05 a 2027-04-30 | `v1.0.0-rc.N`, `v1.0.0` |
| 1.1 Android | 2027-05-03 a 2027-06-27 | `v1.1.0` |

## Orçamento de assets

| Fonte | Disponível em 2026-11-11 | Uso planejado |
| --- | --- | --- |
| ElevenLabs (Creator) | 42.910 créditos até 2026-11-14; 124.333 por mês depois | S-10: até 5.000. O resto fica de reserva para trailer e falas |
| PixelLab | assinatura expirada, US$ 0,05 | nenhum |
| Blender 5.3 | instalado, sem custo | limpeza, rig e animação dos modelos da S-18 |
| AssetFurnace (image-to-3D) | não instalado; grátis rodando local, cerca de US$ 0,20 por personagem na nuvem da ferramenta | S-18, local se a RTX 4060 de 8 GB aguentar; a nuvem só com o aval do PO |
| Blockbench | instalado | legado da branch `voxel-legacy` |
| Ícones 2D | gerados por script do repositório | S-09 |

## Riscos

| # | Risco | Sinal de alerta | Resposta |
| --- | --- | --- | --- |
| R1 | Câmera mais perto mostra inimigos nascendo na tela | teste de spawn da S-01-01 falha | aumentar o raio mínimo de spawn em `data/rounds.json`, nunca afrouxar o teste |
| R2 | Corpos persistentes derrubam o fps | `frameP99` fora da tolerância | baixar o teto por preset; preset Mínimo sem persistência |
| R3 | Três heróis e sinergias quebram o balanceamento | `sim --check` fora das faixas | ajustar só `data/*.json`; se não fechar, o item fica `[~]` com o relatório anexado |
| R8 | A ferramenta de image-to-3D não roda na RTX 4060 de 8 GB do PO | teste da S-18-01 falha no Windows e no WSL | parar e levar ao PO as rotas pagas (nuvem da ferramenta ou GPU alugada); nenhum gasto sem o aval dele |
| R4 | Modelos de IA image-to-3D saem inconsistentes ou pesados demais para a horda | herói de prova (S-18-03) reprovado ou `frameP99` fora da tolerância | parar na S-18-03; o voxel da `voxel-legacy` continua sendo a versão jogável; alternativas são pack comprado ou artista |
| R7 | Troca de arte a 10 semanas da demo pública | S-18 não fecha até 2027-01-10 | a demo de 2027-01-24 sai com a arte que estiver completa; não misturar estilos numa mesma build pública |
| R5 | Escopo cresce além deste arquivo | tarefa sem ID | não entra; vira pergunta ao PO |
| R6 | Migração de save (S-12, S-13) perde progresso | teste de migração falha | migração com teste a partir de um save real da `v0.5.0` antes de qualquer mudança de esquema |

## Métricas de acompanhamento

| Métrica | Fonte | Alvo |
| --- | --- | --- |
| Itens da Parte 1 concluídos | este arquivo | 100% |
| Cobertura (`game`, `core`, `ui`) | CI | 80, 85 e 60% |
| `frameP99` em 1080p, 1440p, mobile-l e mobile-s | `reports/perf-*` | ≤ 20, 18, 40 e 40 ms |
| Round mediano (sim greedy, Normal) | `reports/sim-*` | 18 a 26 |
| Wishlists | Steamworks | 3.000 em jan/2027, 10.000 em mar/2027 |
| Créditos ElevenLabs usados | `docs/audio/credits.md` | ≤ 5.000 nesta leva |
