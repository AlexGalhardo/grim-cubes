# Grim Cubes — Pesquisa Web (Etapa 1)

Data da pesquisa: 2026-10-31. Autor: Diretor/Arquiteto-chefe (sessão Claude Code).
Método: 7 pesquisas paralelas (uma por tema) com subagentes de leitura (WebSearch + WebFetch), seguidas de verificação direta das afirmações críticas (versões npm/GitHub, páginas oficiais) pela sessão principal. Ver seção 12.

Legenda:

- Cada afirmação factual traz a URL ao lado.
- `[não verificado]` = não confirmado em fonte primária; tratar como hipótese.
- `[estimativa]` = número de agregador de terceiros, não oficial.
- `[inferência]` = conclusão nossa a partir dos achados, não afirmação de fonte.

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Tema 1 — Disponibilidade do nome "Grim Cubes"](#2-tema-1--disponibilidade-do-nome-grim-cubes)
3. [Tema 2 — Game design das referências](#3-tema-2--game-design-das-referências)
4. [Tema 3 — Art bible e tom sombrio](#4-tema-3--art-bible-e-tom-sombrio)
5. [Tema 4 — Stack, práticas e workflows](#5-tema-4--stack-práticas-e-workflows)
6. [Tema 5 — Técnicas: procedural, câmera, horda, colisão, mobile](#6-tema-5--técnicas-procedural-câmera-horda-colisão-mobile)
7. [Tema 6a — Ports: Electron/Steam, Capacitor/Google Play](#7-tema-6a--ports-electronsteam-capacitorgoogle-play)
8. [Tema 6b — Áudio: ElevenLabs e Babylon Audio Engine v2](#8-tema-6b--áudio-elevenlabs-e-babylon-audio-engine-v2)
9. [Tema 6c — Mercado, preço, demo e Next Fest](#9-tema-6c--mercado-preço-demo-e-next-fest)
10. [Tema 6d — Releases (padrão vukem), specs, licenças e classificação](#10-tema-6d--releases-padrão-vukem-specs-licenças-e-classificação)
11. [Riscos consolidados](#11-riscos-consolidados)
12. [Perguntas em aberto](#12-perguntas-em-aberto)
13. [Suposições](#13-suposições)
14. [Metodologia e verificação](#14-metodologia-e-verificação)

## 1. Resumo executivo

**Nome.** Nenhum jogo ou produto chamado "Grim Cubes" foi encontrado em Steam, Google Play, GitHub (fora o repositório do próprio projeto) ou redes sociais. `grimcubes.com` e `grimcubes.com.br` aparecem livres no RDAP. Bases de marca (USPTO, EUIPO, INPI) não foram acessíveis por ferramenta: risco de marca fica **médio** até consulta manual. Há 13 alternativas com `.com` livre (seção 2) caso a consulta de marca aponte conflito.

**Game design.** Brotato é a referência numérica mais rica e pública: 20 ondas de 20 s a 90 s, loja com fórmula de preço e reroll publicadas, 4 tiers de raridade com chance crescente por onda, escalonamento linear de HP/dano por onda, cap de 100 inimigos na tela, Danger 0–5 como multiplicador. Vampire Survivors contribui com XP por gemas, level-up com 3–4 opções e meta-progressão por ouro. Ambos custam ~US$ 5 na Steam; **US$ 10 fica acima dos comparáveis do gênero** e precisa de justificativa de conteúdo (ver seção 9).

**Arte.** Hytale publicou em dez/2025 um guia oficial de modelos (só cubos e quads, texturas múltiplas de 32 px, 64 px/unidade para personagens, sem branco/preto puros, sombras coloridas, sem PBR). Minecraft define 16 px por bloco de 1 m. Nenhuma fonte dá paleta hex; a paleta será definida no Art Bible por amostragem própria. Gore em voxel tende ao cartunesco (Paint the Town Red); o tom grimdark precisa vir de paleta, som e enquadramento.

**Stack.** Versões estáveis confirmadas hoje: Babylon.js 9.33.1, Vite 8.3.5 (Rolldown), React 19.3.1, Tailwind 4.3.3, Biome 2.6.4, TypeScript 7.0.2 (compilador Go), Bun 1.4.4, Vitest 5.0.5, Playwright 1.64.1, agent-browser 0.41.0, Electron 45.2.1, Capacitor 8.6.0. Husky está sem release desde nov/2024; lefthook 2.2.2 é a alternativa ativa e sem dependência Node.

**Técnicas.** Thin instances + Baked Vertex Animation (VAT) são o caminho oficial do Babylon para hordas animadas; relatos de fórum indicam ~2.000 instâncias a 60 fps com shader pesado e 10k a ~50 fps em desktop. Câmera ortográfica via `camera.mode = Camera.ORTHOGRAPHIC_CAMERA`. Mundo infinito: chunks + PRNG determinístico (hash de coordenadas) + `simplex-noise` 4.0.3; precisão de float resolvida com origin shifting ou o modo experimental "Large World Rendering" do Babylon 9.

**Ports e lojas.** Google Play exige target API 36 desde 2026-08-31 e teste fechado com 12 testers por 14 dias para contas pessoais. Steam Direct custa US$ 100 por app, com 21 dias entre pagamento e release e demo como App ID separado. Azure Artifact Signing (assinatura Windows) aceita indivíduos só dos EUA/Canadá: assinar o `.exe` a partir do Brasil exige certificado OV de terceiro `[custo não verificado]`. **Vercel Hobby proíbe uso comercial**: vender o jogo exige plano Pro.

**Áudio.** ElevenLabs tem Sound Effects API (0,5–30 s, ~200 créditos por geração) e licença comercial só em planos pagos (Starter US$ 6/mês). Babylon 9 tem Audio Engine v2 nativa (`CreateAudioEngineAsync`, `CreateSoundAsync`, buses, spatial): Howler não é necessário.

**Releases.** O padrão do repositório vukem é: tag `vX.Y.Z`, título igual à tag, corpo idêntico à seção do CHANGELOG (Keep a Changelog 1.1.0) com `### Added/Fixed/Security` e itens `**escopo:** Descrição (#PR) ([hash](url))`, assets com checksums, SBOM e atestação sigstore. Replicável com release automation em GitHub Actions.

## 2. Tema 1 — Disponibilidade do nome "Grim Cubes"

Triagem, não parecer jurídico.

### 2.1 Achados por canal

| Canal | Resultado | URL consultada | Acesso |
| --- | --- | --- | --- |
| Steam | 0 jogos com nome igual ou parecido. Resultados difusos: Terminal 81R, Cube & Star, Boinihi, Hopeless, Epics of Noche, Brain Busted | <https://store.steampowered.com/search/?term=grim+cubes> | fetch OK |
| Steam (`grimcubes`) | 0 resultados | <https://store.steampowered.com/search/?term=grimcubes> | fetch OK |
| Google Play | Nenhum nome exato. Próximos: Grim Tides, Cube Crusher 3D, Grand Cube: Farm Day | <https://play.google.com/store/search?q=grim%20cubes&c=apps> | fetch OK (lista truncada) |
| itch.io | Busca retornou a home; inconclusivo | <https://itch.io/search?q=grim+cubes> | fetch parcial |
| USPTO | Página sem formulário renderizado | <https://tmsearch.uspto.gov> | não acessível |
| EUIPO | ECONNRESET | <https://euipo.europa.eu/eSearch/> | não acessível |
| INPI | Tela de login, formulário não alcançado | <https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp> | não acessível |
| Domínio .com | HTTP 404 no RDAP = aparentemente livre | <https://rdap.verisign.com/com/v1/domain/grimcubes.com> | fetch 404 |
| Domínio .com.br | HTTP 404 no RDAP = aparentemente livre | <https://rdap.registro.br/domain/grimcubes.com.br> | fetch 404 |
| Domínio .io / .game | 404 em endpoint alternativo `[não verificado no registro oficial]` | <https://rdap.identitydigital.services/rdap/domain/grimcubes.io> | fetch 404 |
| GitHub | 3 repositórios; único relevante é `AlexGalhardo/grim-cubes` (o deste projeto, vazio) | <https://api.github.com/search/repositories?q=grim-cubes> | fetch OK |
| YouTube | Handle `@grimcubes` inexistente (404) | <https://www.youtube.com/@grimcubes> | fetch 404 |
| X, Instagram, TikTok, Reddit | Bloqueado ou sem conteúdo legível; inconclusivo | <https://x.com/grimcubes> | 402 / vazio |
| Busca geral | Nenhum jogo "Grim Cubes". Vizinhos de gênero (não de nome): CubeCube, Survive! MR.CUBE, Grim Horde, Grey Cubes | WebSearch | via busca |

### 2.2 Avaliação de risco

**Médio.** Nenhuma colisão de nome encontrada nas lojas; o risco é a ausência de consulta de marca e o fato de "Grim" e "Cube" serem termos muito usados em títulos. Nota: a busca de lojas é difusa, não literal.

### 2.3 Alternativas (caso a consulta de marca aponte conflito)

Checagem feita: `.com` via RDAP Verisign (404 = não registrado), Steam via busca (0 resultados), GitHub via API de busca. Todas abertas por fetch, exceto onde indicado.

| Nome | .com | Steam | GitHub | Observação |
| --- | --- | --- | --- | --- |
| Gravecube | livre | 0 | 0 | túmulo + cubo; fácil de falar |
| Dreadcube | livre | 0 | 0 | "dread" = pavor; checar marca |
| Blockwrath | livre | 0 | 0 | fúria + bloco |
| Voxelwrath | livre | 0 | 403 `[não verificado]` | voxel explícito + brutal |
| Cubewrath | livre | 0 | 0 | curto |
| Crypcube | livre | 0 | 0 | cripta |
| Morbicube | livre | 0 | 0 | pronúncia menos óbvia |
| Blockgrave | livre | 0 | 403 `[não verificado]` | bloco + túmulo |
| Ruincube | livre | 0 | 0 | ruína |
| Skullcube | livre | 0 | 0 | "skull" muito usado; risco de marca maior |
| Voxgrim | livre | 0 | 0 | voxel + grim; curto |
| Morbivox | livre | 0 | 403 `[não verificado]` | morbid + voxel |
| Gravevox | livre | 0 | 0 | túmulo + voxel; curto |

Já ocupados em `.com`: grimblock, grimvox, ashcube, bonecube, dreadblock, blockrot.

Shortlist sugerida para consulta de marca, se necessário: **Gravecube, Voxgrim, Gravevox**.

### 2.4 Implicações para o Grim Cubes

- Manter "Grim Cubes" como nome de trabalho. Registrar `grimcubes.com` e `grimcubes.com.br` cedo (custo baixo) se o nome for mantido.
- Fazer consulta manual de marca no INPI (classe 9 e 41) e no USPTO/EUIPO antes da página Steam pública. Isso é tarefa da fase ESTRUTURA no roadmap.
- Decidir o nome na Etapa 2 (brainstorming), com a shortlist acima como plano B.

### 2.5 Não verificado

- Marcas em USPTO, EUIPO e INPI.
- itch.io (busca retornou a home), Reddit, X, Instagram, TikTok.
- Apple App Store, Epic, Nintendo eShop, Discord e Twitch não foram checados.
- Disponibilidade real de compra dos domínios (RDAP apenas).

## 3. Tema 2 — Game design das referências

### 3.1 Brotato — estrutura de ondas e dificuldade

Fontes: <https://brotato.wiki.spellsandguns.com/Waves>, <https://brotato.wiki.spellsandguns.com/Enemies> (rev. 2026-09-30), <https://brotato.wiki.spellsandguns.com/Danger_Levels>. Afirmações de 20 s e cap de 100 verificadas diretamente pela sessão principal.

- Run = 20 ondas. Onda 20 é a final, com 1 ou 2 chefes.
- Duração: onda 1 = 20 s, +5 s por onda até 60 s (onda 9); ondas 10–19 = 60 s; onda 20 = 90 s.
- Endless: após a onda 20, cada onda dura 60 s e os inimigos ganham velocidade pelo "Endless Factor".
- Ondas de desafio: Danger 2–3 = 1 onda (11 ou 12); Danger 4–5 = 3 ondas (entre 11 e 18). Chance 40% horda / 60% elite nas duas primeiras; a terceira é sempre elite.
- Cap de **100 inimigos na tela**; excedente morre sem drop (exceto elite/chefe).
- Danger 0–5: DL2 introduz elites e hordas; DL3 +12% HP/dano; DL4 +26% e 3 ondas de desafio; DL5 +40% e 2 chefes simultâneos. Bônus são totais, não cumulativos.
- Elite sempre dropa Legendary Crate (item Tier 4) e cura 100 HP.

### 3.2 Brotato — escalonamento de inimigos

Fonte: <https://brotato.wiki.spellsandguns.com/Enemies>.

- HP e dano crescem **linearmente**: `valor(N) = base + (N − 1) × incremento`. Velocidade não muda por onda.
- Exemplos: Chaser 1 HP +1/onda; Charger 4 HP +2,5/onda e dano 1 +0,85/onda; Bruiser 20 HP +11/onda; Pursuer 10 HP +24/onda.
- Elites: 750 HP base. Chefes (onda 20): 29.250 HP base; dano de contato 30, projétil 23.
- Contagem de inimigos por onda: sem fórmula publicada.

### 3.3 Brotato — loja, raridade e economia

Fonte: <https://brotato.wiki.spellsandguns.com/Shop> (patch 1.1.4.0), <https://brotato.wiki.spellsandguns.com/Materials>, <https://brotato.wiki.spellsandguns.com/Weapons>.

- 4 slots por loja; cada slot 35% arma / 65% item. Ondas 1–2 garantem 2 armas + 2 itens; ondas 3–5 garantem 1 arma.
- Preço: `floor((Base + Onda + Base × 0,1 × Onda) × Shop_Price)`, mínimo 1.
- Reroll: incremento `max(1, floor(0,4 × onda))`; primeiro reroll `floor(0,75 × onda) + incremento`; reseta a cada loja. Onda 10 = 11 (+4); onda 20 = 23 (+8).
- Lock grátis e ilimitado; item travado mantém preço e sobrevive à próxima onda.
- Chance por tier (base, ganho/onda, teto, onda inicial): T1 100%; T2 0% +6%/onda teto 60% desde a onda 2; T3 0% +2%/onda teto 25% desde a 4; T4 0% +0,23%/onda teto 8% desde a 8. Luck multiplica (×1,5 com 50, ×2 com 100).
- Tiers: Common, Uncommon, Rare, Legendary. Fusão: duas armas iguais do mesmo tier viram uma do tier seguinte.
- Materiais dão XP e ouro ao mesmo tempo. Chance de drop: 100% até a onda 4; depois `100 − 1,5 × onda`, mínimo 50% (onda 34).
- Materiais não coletados vão para o "Bag" e caem na onda seguinte. Limite de 50 blobs no mapa (excedente soma no blob existente).
- Harvesting pago no fim da onda, crescendo 5% por disparo.
- Slots de arma: 6 na maioria dos personagens (1 a 24 em casos especiais).

### 3.4 Brotato — stats e meta-progressão

Fonte: <https://brotato.wiki.spellsandguns.com/Stats> (rev. dez/2024, pode estar defasada), <https://brotato.wiki.spellsandguns.com/Characters> (rev. 2026-09-23).

- Primários: Max HP, HP Regen, Life Steal (cap 10 HP/s), Damage (+1%/ponto), Melee/Ranged/Elemental Damage, Attack Speed (cap 12/s), Crit Chance (cap 100%), Engineering, Range, Armor (cada ponto ≈ +6,66% de dano absorvível), Dodge (cap 60%), Speed, Luck, Harvesting, Curse (DLC).
- Secundários: Consumable Heal, XP Gain, Pickup Range, Items Price, Explosion Damage/Size, Bounces, Piercing, Damage vs Bosses/Elites, Knockback, Double Material Chance, Free Rerolls, Enemies %, Enemy Speed %, Reroll Price %.
- Meta-progressão = **desbloqueio de conteúdo por marco** (matar N inimigos, coletar N materiais, vencer em Danger X). Não há stat permanente comprável.
- 64 personagens listados (14 DLC); 10 desbloqueados por padrão. Identidade por penalidade forte (Lucky: Luck +100, Attack Speed −60%; Jack: inimigos +175% HP, −70% quantidade, +200% materiais).

### 3.5 Brotato — negócio

- Early Access 2022-09-27; 1.0 em 2023-06-23; R$ 16,99 no Brasil; 96% de 32.722 reviews. <https://store.steampowered.com/app/1942280/Brotato/>
- Press release do 1.0: "over 2 million copies on Steam at $5". <https://www.gamedeveloper.com/press-release/brotato-10-release>
- Estimativas de terceiros: ~3–3,5 M cópias, ~US$ 12 M bruto `[estimativa]`. <https://raijin.gg/app/1942280/Brotato>, <https://steampulse.org/game/1942280>
- Demo na Steam Next Fest de junho/2022 (evento confirmado; "40.000 wishlists" `[não verificado]`).

### 3.6 Vampire Survivors

Fontes: <https://vampire.survivors.wiki/w/Reaper>, <https://vampire.survivors.wiki/w/Experience_Gem>, <https://vampire.survivors.wiki/w/Level_up>, <https://vampire.survivors.wiki/w/Growth>, <https://vampire.survivors.wiki/w/Gift>, <https://store.steampowered.com/app/1794680/Vampire_Survivors/>. A wiki Fandom retornou HTTP 402.

- Run de 30 min; Reaper aparece em 30:00 e a cada minuto depois, com 65.535 de dano e HP = 655.350 × nível do jogador.
- Gemas: azul até 2 XP, verde até 9, vermelha acima. Com mais de 400 gemas no chão, novas gemas se fundem numa vermelha.
- XP por nível: 5 (1→2), +10 por nível até o 20, +13 entre 21 e 40; degraus extras de +600 no nível 20 e +2.400 no 40. Nível máximo não publicado.
- Level-up: 3 ou 4 opções (a 4ª depende de Luck). Reroll, Skip e Banish são PowerUps comprados.
- Growth: PowerUp +3%/rank, máximo 5 ranks, custo inicial 900 de ouro.
- Evolução: arma base no nível máximo + passivo correspondente + baú de evolução (chefes a partir de 10 min). Evolução substitui a arma base.
- Meta-progressão: ouro persistente gasto em PowerUps permanentes e personagens (<https://en.wikipedia.org/wiki/Vampire_Survivors>, secundária).
- Steam: EA 2021-12-17; 1.0 em 2022-10-20; R$ 12,99; 98% de 128.467 reviews. Preço US$ 4,99 `[agregador]`.
- Versão web gratuita no itch.io funcionou como demo (<https://www.howtogeek.com/781765/play-hit-viral-game-vampire-survivors-for-free/>, secundária).
- Mobile: lançado grátis em 2022 com anúncio opcional; status atual de ads `[não verificado]`. <https://www.gamespot.com/articles/vampire-survivors-one-of-the-best-games-of-2022-surprise-releases-on-ios-and-android-for-free/1100-6509870/>
- Psicologia: análise sobre uso de mecânicas de "gambling" (animação de baús) e ganho gradual. <https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613>
- Galante: "I felt like it was a fair price for what I was offering". <https://www.pcgamer.com/uk/vampire-survivors-creator-didnt-have-a-vision-when-he-started-making-the-game-that-allowed-him-to-quit-his-job/>

### 3.7 Outros survivor-likes (especialmente 3D)

| Jogo | Dados | Fonte |
| --- | --- | --- |
| Halls of Torment | Godot; VS é a maior influência; 1.0 em 2024-09-24; 28.744 reviews; ~800 mil vendas `[estimativa]` | <https://www.w4games.com/blog/w4-games-news-1/interview-with-chasing-carrots-developer-of-halls-of-torment-120>, <https://store.steampowered.com/app/2218750/Halls_of_Torment/> |
| Deep Rock Galactic: Survivor | Visão de cima; 500 mil unidades em 1 semana de EA; 86% de 47.099 reviews | <https://mynewsdesk.com/uk/swipe-right/news/deep-rock-galactic-survivor-reaches-500000-units-sold-one-week-after-early-access-release-479844> |
| Army of Ruin | 3D, tags "Top-Down"/"Third Person"; 88% de 1.371; R$ 26,49 | <https://store.steampowered.com/app/1918040/Army_of_Ruin/> |
| Yet Another Zombie Survivors | 3D squad; 1.0 em 2026-08-20; 94% de 5.817; R$ 46,99; crítica: "squad is a bit too far up on the screen" | <https://store.steampowered.com/app/2163330/Yet_Another_Zombie_Survivors/>, <https://www.gamingonlinux.com/2026/08/yet-another-zombie-survivors-review/page=1/> |
| Soulstone Survivors | 3D isométrico; US$ 14,99 `[agregador, não verificado]` | — |

### 3.8 Balanceamento, juice e demo (princípios)

- Slay the Spire (GDC 2019, "Metrics Driven Design and Balance"): telemetria de todas as partidas dos testers combinada com feedback qualitativo. <https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019>, <https://www.gdcvault.com/browse/gdc-19/play/1025731>
- "Juice it or lose it" (Jonasson & Purho): "maximum output for minimum input"; tween, squash/stretch, som, cor, wobble. <https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough->
- Game Feel (Swink): definição citada por fonte secundária; valores de hitstop (50–100 ms) e screenshake `[não verificado]`.
- Demo: Brotato (Next Fest) e VS (web grátis) validam demo gratuita para jogo barato. Dados de conversão demo→compra: não encontrados.

### 3.9 Implicações para o Grim Cubes

- **Rounds**: adotar a rampa do Brotato como baseline (round 1 = 20 s, +5 s até 60 s no round 9, 60 s fixo depois; round de chefe = 90 s). Com rounds infinitos, usar o modelo Endless (60 s + fator de velocidade).
- **Escalonamento**: HP/dano linear por round com slope por tipo (`base + (N−1) × k`); exponencial só com teto. Cap de inimigos simultâneos (Brotato: 100) é o principal controle de performance e legibilidade em 3D.
- **Dificuldade**: camada "Danger" como multiplicador total separado do round.
- **Loja**: fórmula de preço e reroll do Brotato como baseline (uma linha cada). Lock grátis. Garantias nos primeiros rounds.
- **Economia**: materiais = XP + ouro; harvesting no fim do round; bag para não coletados; drop decrescente por round.
- **Stats**: 8–12 stats primários com tetos explícitos (Armor como multiplicador, Dodge e Crit com cap).
- **Meta-progressão**: desbloqueio por marco (barato) ou ouro persistente (VS, exige tabela de custo). Decidir na Etapa 2.
- **Câmera 3D**: a crítica a YAZS (squad alto na tela) mostra que o herói precisa ficar centrado; testar legibilidade com 100 inimigos antes de fixar ângulo.
- **Juice**: knockback + flash branco + squash/stretch primeiro (baratos); shake/hitstop calibrados por playtest.
- **Telemetria**: logar round alcançado, build e causa da morte desde o protótipo.
- **Preço**: os dois líderes custam ~US$ 5. US$ 10 precisa de justificativa (3D, mundo infinito, conteúdo) ou de teste de faixa.

## 4. Tema 3 — Art bible e tom sombrio

### 4.1 Minecraft (escala, textura, iluminação)

- 1 bloco = 16×16×16 px = 1 m³ (1 px ≈ 6,25 cm). <https://www.blockbench.net/wiki/guides/minecraft-style-guide>, <https://minecraft.wiki/w/Model>
- Skin: 64×64 px (Java). Modelo clássico 32 px de altura, 16 de largura, braços de 4 px; slim com braços de 3 px. <https://minecraft.wiki/w/Skin>
- Cabeça 8×8×8, tronco 8×12×4, membros 4×12×4 `[fonte secundária]`. <https://mcreator.net/node/55256>
- Smooth Lighting: AO por canto (cantos de blocos opacos escurecem). <https://minecraft.wiki/w/Smooth_Lighting>, <https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/>
- Guia de estilo (Blockbench): paleta restrita; sem antialias involuntário, banding ou "pillow shading"; dithering com moderação; rampas de cor com mudança de matiz; luz topo-esquerda em itens; contagem de elementos baixa; objetos redondos como um único cubo. <https://www.blockbench.net/wiki/guides/minecraft-style-guide>

### 4.2 Hytale (guia oficial de modelos, dez/2025)

Fonte única e primária: <https://hytale.com/news/2025/12/an-introduction-to-making-models-for-hytale> ("64px per unit" verificado diretamente).

- Estilo: "modern, stylized voxel game, with retro pixel-art textures". Pilares: Immersive, Fantasy, Stylized, Flexible. "Simplicity is key; it doesn't mean low quality."
- Proporções: personagens pequenos, robustos e cartunescos; formas "toylike"; esferas não permitidas.
- Geometria: só cubos (6 faces) e quads (2 faces). Sem edge loops, triângulos ou pirâmides. Silhueta primeiro.
- Textura: múltiplos de 32 px. Personagens/itens: **64 px por unidade**; props/blocos: **32 px por unidade**. Esticar eixos entre 0,7× e 1,3×.
- Cor: sem branco ou preto puros; sombras coloridas em vez de cinza dessaturado.
- Iluminação: sem PBR (sem roughness/normal). Sombra pintada + luzes reais + pós-processo (bloom, DoF, AO).
- Ferramenta: Blockbench + plugin Hytale.

### 4.3 Roblox

- Specs R15: bounding box mínimo 1,0×4,0×0,5 studs, máximo 8,0×10,0×4,0; partes devem preencher ≥50% da caixa; pose I/A/T; personagem voltado para +Z. <https://create.roblox.com/docs/en-us/avatar/character-bodies/specifications.md>
- Escalas: Classic, Rthro, Rthro Slender. <https://create.roblox.com/docs/art/accessories/body-scale>

### 4.4 Outros jogos voxel/low-poly e gore

- Paint the Town Red: voxels deformam ao receber dano, desmembramento com ragdoll; a loja fala em gore "cartoonishly over-the-top". Lição: voxel + gore sem direção vira comédia. <https://en.wikipedia.org/wiki/Paint_the_Town_Red_(video_game)>
- Voxel Doom (mod GZDoom, Cheello): cada pixel do sprite vira um voxel, preservando fidelidade; Cacowards 2022. <https://doomwiki.org/wiki/Voxel_Doom>
- Teardown: voxels no MagicaVoxel, iluminação ray-traced `[secundária]`. <https://www.techradar.com/gaming/consoles-pc/ray-tracing-is-so-crucial-to-teardown-that-the-world-goes-black-if-you-turn-it-off>
- Dead Cells: luz quente no herói vs sombra fria para leitura de perigo; saturação como pilar `[secundária]`. <https://gonintendo.com/archives/280488-dead-cells-dev-blog-art-design-deep-dive-giving-back-colors-to-cryptic-worlds>
- Cube World, Trove, Crossy Road, Stonehearth, Vintage Story: sem fonte primária útil `[não verificado]`.

### 4.5 Blockbench e pipeline para Babylon

- Exportação: OBJ, glTF/glb, FBX, STL, DAE. Animações só em glTF, DAE e FBX. glTF embute texturas e suporta filtragem pixel-perfect. <https://www.blockbench.net/wiki/guides/export-formats>
- `.bbmodel`: `resolution` ou, desde a 4.9, `per_texture_uv_size`; referência é o código-fonte. <https://www.blockbench.net/wiki/docs/bbmodel>
- Blockbench 5.0 mudou grupos e plugins (guia de migração). <https://www.blockbench.net/wiki/docs/plugin-upgrade-to-5.0>
- Babylon glTF loader: `@babylonjs/loaders`, `registerBuiltInLoaders` (dinâmico, recomendado); suporta Draco, meshopt, KHR_texture_basisu. <https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF>, <https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes>
- Sampling NEAREST em texturas importadas: ajustar após o load (fórum). <https://forum.babylonjs.com/t/how-can-i-set-texture-sampling-on-a-loaded-model/46155>

### 4.6 Tom sombrio: DOOM: The Dark Ages, Warhammer 40k, Alien, Predator

- DOOM TDA (Hugo Martin): sucessor espiritual do DOOM original, mais lento e "grounded", mais inimigos e arenas maiores; batalhas inspiradas em "300"; "a war against Hell"; Frank Miller como influência; cenário de ossos, correntes e tortura. <https://gamingbolt.com/doom-the-dark-ages-will-have-more-enemies-larger-arenas-and-slower-action-creative-director>, <https://www.shacknews.com/article/143702/doom-the-dark-ages-march-2025-interview>
- Paleta de DOOM TDA: nenhuma fonte com hex `[não verificado]`.
- Warhammer 40k Boltgun: cenário 3D blocado + inimigos em sprites pixel art; Boltgun 2 usa "3D pixels" em billboards. <https://news.xbox.com/en-us/?p=202509>, <https://www.creativebloq.com/3d/video-game-design/warhammer-40-000-boltgun-2s-lead-artist-reveals-how-they-made-pixel-art-feel-authentically-retro>
- Darktide: blockout para silhueta e paleta antes do detalhe. <https://devtrackers.gg/darktide/p/67a2496a-darktide-101-enemy-character-art-dev-blog>
- Games Workshop: política de 2021 trata fan content como infração, com ou sem monetização `[secundária]`. Evitar aquilas, nomes e trade dress.
- Alien: Isolation copia o visual industrial e sujo do filme de 1979 (Giger). <https://www.pcgamer.com/uk/the-making-of-horror-masterpiece-alien-isolation-it-was-a-giddy-exhausting-intense-time/>
- Predator: selva, camuflagem, visão térmica (Joel Hynek, 1987). <https://beforesandafters.com/2022/08/04/predator-vfx-supe-joel-hynek-recalls-the-days-of-optical-compositing-thermal-cameras-and-that-red-suit/>, <https://blog.playstation.com/?p=215949>

### 4.7 Regras extraíveis para o Art Bible

- Escala: escolher **uma** convenção. Recomendação: personagens 64 px/unidade e props/terreno 32 px/unidade (Hytale), com 1 unidade = 1 m. `[inferência]`
- Textura: múltiplos de 32 px; mesmo tamanho em todas as texturas de um modelo.
- Geometria: só cubos e quads; silhueta primeiro; contagem baixa de elementos.
- Cor: nunca branco/preto puros; sombras coloridas; paleta restrita com um acento saturado (sangue, luz de alerta).
- Iluminação: material unlit/flat ou standard (não PBR), AO pintada ou por vértice, luz principal + rim light, vinheta e fog para tom.
- Gore: sangue escuro, som e câmera carregam o tom; o voxel sozinho lê como cartoon.
- Pipeline: Blockbench → glTF/glb (animações + texturas embutidas) → Babylon com sampling NEAREST.
- Nenhuma fonte fornece hex; a paleta será definida por amostragem própria no Art Bible.

### 4.8 Não verificado

- Definição formal da Mojang do "estilo Minecraft"; medidas de partes do modelo só em fonte secundária.
- Hytale: conflito sobre o Model Maker antigo (<https://hytalemodding.dev/en/docs/established-information/server/content-categories/art-assets>).
- Paletas hex de qualquer referência.
- Jogos voxel de horror no Steam (MemeticBox, Floor Massacre, Lucid Blocks): URLs não confirmadas.

## 5. Tema 4 — Stack, práticas e workflows

### 5.1 Versões estáveis (verificadas diretamente em 2026-10-31)

Fonte de verificação: `registry.npmjs.org/<pkg>` (dist-tag `latest` e data `time`) e API de releases do GitHub, consultadas pela sessão principal. Pré-releases ignoradas.

| Item | Versão | Data | Requisito | Confirmação |
| --- | --- | --- | --- | --- |
| @babylonjs/core, /loaders | 9.33.1 | 2026-10-29 | — | npm + <https://github.com/BabylonJS/Babylon.js/releases/tag/9.33.1> |
| @babylonjs/havok | 1.3.14 | 2026-07-29 | — | npm |
| vite | 8.3.5 | 2026-10-21 | Node ^20.19 \|\| >=22.12 | npm + <https://github.com/vitejs/vite/releases/tag/v8.3.5> |
| @vitejs/plugin-react | 6.1.2 | 2026-10-05 | peer vite ^8 | npm |
| react, react-dom | 19.3.1 | 2026-10-14 | — | npm + <https://github.com/facebook/react/releases/tag/v19.3.1> |
| tailwindcss, @tailwindcss/vite | 4.3.3 | 2026-07-16 | peer vite ^5.2–^8 | npm + <https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.3> |
| @biomejs/biome | 2.6.4 | 2026-10-28 | binário nativo | npm + GitHub |
| typescript | 7.0.2 | 2026-07-08 (npm) | — | npm + <https://github.com/microsoft/TypeScript/releases/tag/v7.0.2> |
| bun | 1.4.4 | 2026-10-22 | standalone | <https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4> |
| @types/bun | 1.4.4 | 2026-10-23 | — | npm |
| vitest | 5.0.5 | 2026-10-15 | Node ^22.12 \|\| ^24 \|\| >=26 | npm + GitHub |
| @playwright/test | 1.64.1 | 2026-10-14 | Node >=20 | npm + GitHub |
| agent-browser | 0.41.0 | 2026-10-29 | engines node >=24 (só para build do fonte, segundo README) | npm + <https://github.com/vercel-labs/agent-browser/releases/tag/v0.41.0> |
| markdownlint-cli2 | 0.24.0 | 2026-10-21 | Node >=22 | npm |
| lefthook | 2.2.2 | 2026-10-13 | binário (npm, winget, scoop) | npm + GitHub |
| husky | 9.1.7 | 2024-11-18 | — | npm + GitHub (sem release há ~2 anos) |
| lint-staged | 17.6.0 | `[data não verificada]` | Node >=22.22.1 | npm |
| zustand | 5.0.16 | 2026-10-22 | — | npm |
| oven-sh/setup-bun | v2.2.0 | 2026-03-14 | — | <https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0> |
| actions/checkout | v7.0.1 | 2026-07-20 | — | GitHub |
| actions/setup-node | v7.1.0 | 2026-10-08 | — | GitHub |
| actions/upload-artifact | v7.0.2 | 2026-10-07 | — | GitHub |
| actions/download-artifact | v8.0.2 | 2026-10-07 | — | GitHub |
| actions/cache | v6.1.0 | CACHEDATE | — | GitHub |
| github/codeql-action | v4.39.1 | 2026-10-21 | — | GitHub |
| googleapis/release-please-action | v5.0.0 | 2026-04-22 | — | GitHub |
| changesets/action | v2.1.2 | 2026-09-07 | — | GitHub |

Nota: o GitHub de `ionic-team/capacitor` marca `7.6.10` como "latest release" (patch da linha 7), mas o dist-tag `latest` do npm é `8.6.0`; o npm prevalece. Ver seção 7.

### 5.2 Babylon.js — práticas e gotchas

- Babylon 9.0 anunciado em 2026-03-26 (Clustered Lighting, Flow Maps, Frame Graph). Sem lista oficial de breaking changes encontrada. <https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0>
- Pacotes ES6 `@babylonjs/*`; não misturar com o pacote legado `babylonjs`. <https://doc.babylonjs.com/setup/frameworkPackages/es6Support>, <https://doc.babylonjs.com/setup/frameworkPackages/npmSupport/>
- Tree-shaking: importar por caminho (`@babylonjs/core/Engines/engine.js`), não pelo barrel; a doc cita bundle de 2,3 MB para 700 KB. Imports de efeito colateral necessários para augmentations (ex.: `@babylonjs/core/Physics/physicsEngineComponent.js`).
- Não há guia oficial Babylon + Vite (página `/setup/frameworkPackages/vite` retorna 404). O setup Vite padrão funciona com os pacotes ES6 `[inferência]`.
- WebGPU: opt-in via `WebGPUEngine` + `initAsync()`; sem fallback automático para WebGL2; não é possível trocar engine de uma cena. <https://doc.babylonjs.com/setup/support/webGPU>
- Otimização: instances > clones; `scene.freezeActiveMeshes()` quando limitado por CPU; `material.freeze()`; `mesh.doNotSyncBoundingInfo` quebra picking. <https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene>
- glTF: `registerBuiltInLoaders` de `@babylonjs/loaders/dynamic`. <https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes>
- Havok: `HavokPlugin` + `scene.enablePhysics`; inicialização do WASM de `@babylonjs/havok` não mostrada na doc lida `[não verificado]`. <https://doc.babylonjs.com/features/featuresDeepDive/physics/usingPhysicsEngine>
- React + Babylon: **não há integração oficial**. Terceiros: `react-babylonjs` (<https://github.com/brianzinn/react-babylonjs>) e `Reactylon` (<https://github.com/simonedevit/reactylon>). Padrão mais simples: Babylon controla o `<canvas>`; React renderiza HUD por cima `[inferência]`.

### 5.3 Vite 8, React 19, Tailwind 4

- Vite 8 (2026-03-12): Rolldown é o único bundler; Oxc substitui esbuild. Renomeações: `build.rollupOptions` → `build.rolldownOptions`; `watch.chokidar` removido. <https://vite.dev/blog/announcing-vite8>, <https://vite.dev/guide/migration>
- `@vitejs/plugin-react` 6 sem Babel; React Compiler opt-in.
- Assets: `public/` sem hash; `src/assets` com hash; `assetsInclude` para `.glb`. <https://vite.dev/config/shared-options>
- Bun roda CLIs com shebang Node sob Node; `bun run --bun vite` força Bun. <https://bun.com/docs/cli/run>
- React: `useSyncExternalStore(subscribe, getSnapshot)` para estado externo; snapshot imutável, `subscribe` estável. <https://react.dev/reference/react/useSyncExternalStore>
- Zustand 5 com seletores evita re-render. <https://github.com/pmndrs/zustand>
- Tailwind v4: `@import "tailwindcss"` + plugin `@tailwindcss/vite`; config CSS-first com `@theme`; sem `tailwind.config.js` automático; navegadores Safari 16.4+, Chrome 111+, Firefox 128+; renomeações (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `!` no fim). <https://tailwindcss.com/docs/installation/using-vite>, <https://tailwindcss.com/docs/theme>, <https://tailwindcss.com/docs/upgrade-guide>

### 5.4 Biome 2, TypeScript 7, Bun

- Biome v2 (2025-06-17): lint + format para JS/TS/JSON/CSS/GraphQL/YAML/Markdown; HTML formatter experimental. Regras type-aware (`noFloatingPromises`, `noImportCycles`) no domínio `project`, sem depender do compilador TS; Scanner opt-in (~800 ms → ~2 s em 2k arquivos). <https://biomejs.dev/blog/biome-v2/>, <https://biomejs.dev/linter/>, <https://biomejs.dev/internals/language-support/>
- Biome defaults: `indentStyle: "tab"`, `indentWidth: 2`; definir `indentWidth: 4` explicitamente. `biome ci` no CI (não aceita `--staged`). VCS: `useIgnoreFile: true`. <https://biomejs.dev/reference/configuration/>, <https://biomejs.dev/guides/integrate-in-vcs/>
- TypeScript 7.0 (2026-07-08): compilador nativo em Go; `npm install -D typescript` já instala o novo `tsc`; sem API JS até 7.1; novos defaults `strict: true`, `module: esnext`, `types: []`, `noUncheckedSideEffectImports: true`; removidos `target: es5`, `baseUrl`, `moduleResolution: node10`. <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- Gotcha TS7: `types: []` exige listar `bun-types`/`vitest/globals` explicitamente.
- Bun 1.4.4: `bun.lock` texto; CI com `bun install --frozen-lockfile`. Vitest coverage `v8` não funciona em Bun (usar `istanbul` ou Node). <https://bun.sh/docs/install/lockfile>, <https://vitest.dev/guide/coverage>

### 5.5 Testes: Vitest, Playwright, agent-browser

- Vitest 5 browser mode: provider `playwright` recomendado (`@vitest/browser-playwright`). <https://vitest.dev/guide/browser/>
- Playwright CI oficial: checkout → setup-node → deps → `playwright install --with-deps` → `playwright test` → upload de `playwright-report/`. Container `mcr.microsoft.com/playwright:v1.64.1-noble` (versão deve bater com o pacote). <https://playwright.dev/docs/ci-intro>, <https://playwright.dev/docs/docker>
- WebGL headless: doc do Playwright não cita flags. Chromium: `--use-gl=angle --use-angle=swiftshader` (+ `--enable-unsafe-swiftshader`). Validar com `gl.getParameter(gl.RENDERER)`. <https://chromium.googlesource.com/chromium/src/+/798e59c5275d4131797e8ea2e96e6c6000256b58/docs/gpu/swiftshader.md>
- agent-browser (Vercel Labs, Apache-2.0, 0.x): `agent-browser open <url>`, `snapshot`, `click @e2`, `screenshot`, `wait --fn`; evitar `--load networkidle` em SPA; `--webgpu` usa SwiftShader no Linux e screenshot de canvas WebGPU headless sai preto no Windows/Linux (usar `--headed`). <https://github.com/vercel-labs/agent-browser>

### 5.6 Qualidade de docs, hooks e CI

- markdownlint-cli2: config `.markdownlint-cli2.jsonc` (`config`, `ignores`, `globs`). Regras a relaxar: MD013 (line length), MD033 (HTML), MD024 com `siblings_only` para CHANGELOG. <https://github.com/DavidAnson/markdownlint-cli2>, <https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md>
- Husky 9.1.7: última release em 2024-11-18; usa `core.hooksPath`. <https://github.com/typicode/husky/releases/tag/v9.1.7>
- lefthook 2.2.2: binário sem Node, `parallel: true`, `{staged_files}`, `stage_fixed`; instala via npm, winget ou scoop. <https://lefthook.dev/>
- GitHub Actions: `oven-sh/setup-bun@v2` lê `bun-version`, depois `packageManager`, depois `engines.bun`; cache por padrão. <https://github.com/oven-sh/setup-bun>
- Release automation: `release-please-action@v5` ou `changesets/action@v2`; docs de configuração não lidas.

### 5.7 Vercel

- **Hobby é só uso não comercial**: "Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan." (verificado diretamente). <https://vercel.com/docs/limits/fair-use-guidelines>
- Limites Hobby: upload estático 100 MB (Pro 1 GB); build 45 min; 100 deploys/dia; 100 GB de transferência/mês. <https://vercel.com/docs/limits>
- SPA: `rewrites` com `source: "/(.*)"` em `vercel.json` `[snippet não verificado literalmente]`. <https://vercel.com/docs/project-configuration>
- Cache: default `public, max-age=0, must-revalidate`; assets com hash devem usar `max-age=31536000, immutable`. <https://vercel.com/docs/caching/cache-control-headers>
- COOP/COEP: só necessários para `SharedArrayBuffer`/`crossOriginIsolated`; COEP `require-corp` bloqueia recursos cross-origin sem CORS. Não adicionar por padrão. <https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated>

### 5.8 Implicações para o Grim Cubes

- Pinar versões exatas (sem `^`) em `package.json`: as da tabela 5.1.
- Babylon com imports por caminho e loader dinâmico; `WebGPUEngine` só com feature detection e fallback manual para `Engine` (WebGL2).
- HUD React sobre canvas; estado do jogo em store externo (`useSyncExternalStore` puro ou zustand, decisão em ADR); HUD atualizado a 10–15 Hz, nunca por frame. `[inferência]`
- Biome com `indentWidth: 4` e `indentStyle: "tab"`; `biome ci` no CI; lefthook para pre-commit/pre-push (ADR).
- TypeScript 7 com `types` explícito; testar cedo com Vitest e Vite.
- Testes: Vitest (unit/integração, Node), Vitest browser mode ou Playwright para WebGL, agent-browser para smoke; CI com container oficial do Playwright.
- Vercel Pro antes de qualquer venda; assets grandes (glb, áudio) podem exigir CDN/Blob.
- Sem COOP/COEP até que Havok ou Workers com SAB exijam.

### 5.9 Não verificado

- Inicialização do WASM do Havok e se exige threads/COOP.
- Flag `--ignore-gpu-blocklist` no Playwright.
- Vitest/Playwright sob Bun runtime (sem guia oficial).
- `formatter.useEditorconfig` do Biome e respeito a `indent_size = 4`.
- Datas de release de Rolldown, lint-staged e specs.

## 6. Tema 5 — Técnicas: procedural, câmera, horda, colisão, mobile

### 6.1 Geração procedural infinita

- Sem receita oficial de chunks no Babylon; padrão da indústria: anel de chunks ao redor do jogador, geração em Web Worker, reciclagem de meshes `[inferência a partir de fontes gerais]`.
- Seed determinística: `hash(seed, cx, cz)` → PRNG (mulberry32, sfc32). <https://github.com/bryc/code/blob/master/jshash/PRNGs.md>
- Ruído: `simplex-noise` 4.0.3 (`createNoise2D(prng)`, named exports desde v4). <https://github.com/jwagner/simplex-noise.js>
- Precisão de float em mundos grandes: Babylon 9 tem "Large World Rendering" experimental (`useLargeWorldRendering`), API ainda instável (fórum); alternativa clássica é origin shifting manual. <https://forum.babylonjs.com/t/new-large-world-rendering-experimental/61114>
- Tamanho ideal de chunk: `[não verificado]`; definir por benchmark no protótipo.

### 6.2 Câmera isométrica (Diablo-like)

- `camera.mode = Camera.ORTHOGRAPHIC_CAMERA` + `orthoLeft/Right/Top/Bottom` em unidades de cena; zoom = alterar os bounds; recalcular no resize. <https://doc.babylonjs.com/typedoc/classes/_babylonjs_core.Camera>, <https://forum.babylonjs.com/t/using-orthographic-camera-mode-with-arcrotatecamera/12319>
- Isométrico clássico: `ArcRotateCamera` com `alpha = π/4` e `beta = atan(√2)` (≈54,7°; elevação ≈35,26°). Diablo 4 usa perspectiva com FOV baixo e ângulo mais alto; decidir ortho vs perspectiva no protótipo `[inferência]`.
- Picking do mouse no plano do chão (`scene.createPickingRay` + `Plane`): `[não verificado]` na doc; fórum.

### 6.3 Spawn massivo (horda)

- Thin instances: um mesh, um buffer de matrizes; `thinInstanceSetBuffer("matrix", buffer, 16, false)` (`staticBuffer` default virou `true` na PR #14679; passar `false` para atualizar por frame); `thinInstanceBufferUpdated`; um único bounding box para todas (culling tudo-ou-nada); buffers custom (cor). <https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances>, <https://github.com/BabylonJS/Babylon.js/pull/14679>
- Animação em massa: Baked Vertex Animation (`BakedVertexAnimationManager`), sem blend nem interpolação entre clipes. <https://doc.babylonjs.com/features/featuresDeepDive/animation/baked_texture_animations>
- Benchmarks de fórum (anedóticos): ~2.000 instâncias animadas a 60 fps com shader pesado; 10k a ~50 fps no Chrome. <https://forum.babylonjs.com/t/baked-animation-performance/32023>, <https://forum.babylonjs.com/t/mesh-with-thin-instance-slower-than-with-full-vertices/46756>
- LOD com thin instances: não existe nativamente `[não verificado]`. <https://doc.babylonjs.com/features/featuresDeepDive/mesh/LOD>
- Object pooling em TS: padrão geral, sem fonte específica.

### 6.4 Colisão e física

- Hordas: spatial hash 2D no plano XZ + círculos/AABB; separação simples (soft collision); sem engine de física completa `[inferência]`.
- Flow fields para hordas: "Crowd Pathfinding and Steering Using Flow Field Tiles" (Game AI Pro) `[autor não verificado]`.
- Havok: benchmark anedótico de 3.000 entidades a 60 fps; não validado para hordas. <https://forum.babylonjs.com/t/havok-physics-benchmark-multithreading-question/49009>
- Vampire Survivors sem pathfinding: `[não verificado]`.

### 6.5 Performance em mobile (Android WebView)

- `SceneOptimizer.OptimizeAsync(scene, SceneOptimizerOptions.ModerateDegradationAllowed())`. <https://doc.babylonjs.com/features/featuresDeepDive/scene/sceneOptimizer>
- Reduzir meshes/materiais antes de mexer em `hardwareScalingLevel`.
- Relato: `powerPreference` default reduziu memória em Android. <https://forum.babylonjs.com/t/webgl2-perfomance-issue-on-android-embeded-webview-vs-chrome/1319>
- KTX2: encoder novo em 9.33.1; decoder só ETC1S/UASTC. <https://doc.babylonjs.com/features/featuresDeepDive/materials/using/ktx2Compression>
- Orçamento numérico de draw calls para WebView: `[não verificado]`; medir no device alvo.

### 6.6 Game loop, ECS e persistência

- Fixed timestep com acumulador + interpolação (alpha), clamp de dt em 0,25 s. <https://gafferongames.com/post/fix_your_timestep/>
- ECS para TS: `bitecs` 0.4.0 (2025-12-06), `miniplex` 2.0.0 (2023-07-16); comparação `[não verificada]`. Decisão em ADR (ECS vs classes simples).
- Persistência web: `idb-keyval` 6.3.0 (IndexedDB); `@capacitor/preferences` só para chave-valor pequeno; `SharedArrayBuffer` exige `crossOriginIsolated`. <https://capacitorjs.com/docs/v7/apis/preferences>, <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer>

### 6.7 Implicações para o Grim Cubes

- Horda: 1 mesh por tipo de inimigo + thin instances + VAT; cap de inimigos simultâneos (começar em 100, como Brotato) e medir no Android alvo antes de subir.
- Simulação separada do render: ECS leve ou arrays estruturados (SoA), fixed timestep de 60 Hz, render interpolado.
- Colisão própria: spatial hash XZ + círculos; raycast só para projéteis. Havok fora do caminho crítico (talvez só para ragdoll/efeitos).
- Mundo: chunks + seed determinística + simplex-noise; origin shifting quando |pos| > ~2.000 unidades `[inferência]`.
- Câmera: começar com ArcRotateCamera fixa em perspectiva FOV baixo (mais parecido com Diablo 4), ortho como alternativa testável.
- Mobile: assets com atlas único, materiais unlit, sombras baratas ou blob shadows, `hardwareScalingLevel` dinâmico via SceneOptimizer.

### 6.8 Não verificado

- Tamanho de chunk ideal, orçamento de draw calls, benchmark de VAT em Android, LOD com thin instances, picking no plano, comparação de ECS.

## 7. Tema 6a — Ports: Electron/Steam, Capacitor/Google Play

### 7.1 Electron e Steam

| Item | Valor | Fonte |
| --- | --- | --- |
| Electron estável | 45.2.1 (2026-10-31), Chromium 156.0.8078.x, Node 24.22.x | <https://github.com/electron/electron/releases>, <https://www.electronjs.org/blog/electron-45-0> (verificado: "Chromium 156.0.8078.48, V8 15.6, and Node v24.22.0") |
| Ciclo | 8 semanas; suporte às 3 últimas majors | <https://www.electronjs.org/docs/latest/tutorial/electron-timelines> |
| electron-builder | 26.18.0 (npm, 2026-10-20) | npm |
| Electron Forge | `@electron-forge/cli` 8.0.1 (2026-09-29) | npm; tutorial oficial cita só Forge: <https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging> |
| Targets Windows (builder) | `nsis` default; `portable`, `msix`, `zip` | <https://www.electron.build/docs/win> |
| Assinatura Windows | `win.sign` tipo `azure` (Artifact Signing); SmartScreen: reputação por hash, OV e EV tratados igual | <https://www.electron.build/docs/features/code-signing/code-signing-win> |
| Azure Artifact Signing | Indivíduos: só EUA/Canadá; Basic 5.000 assinaturas/mês; ~US$ 9,99/mês `[preço não verificado]` | <https://learn.microsoft.com/azure/artifact-signing/quickstart> |
| steamworks.js | 0.4.0 (2024-08-06), MIT; módulo nativo no main process; `electronEnableSteamOverlay`; copiar redistributables | <https://github.com/ceifa/steamworks.js> |
| greenworks | 0.1.0, sem release; provavelmente abandonado `[não verificado]` | npm |
| Steam Direct | US$ 100/app, recuperável após US$ 1.000 | <https://partner.steamgames.com/doc/gettingstarted/appfee> |
| Prazos Steam | 21 dias entre taxa e release; "coming soon" ≥ 2 semanas; revisão 3–5 dias úteis | <https://partner.steamgames.com/doc/gettingstarted/onboarding>, <https://partner.steamgames.com/doc/store/releasing> |
| Demo | App ID separado, tipo "Demo", vinculado ao base; gratuito; sem expiração por tempo pela Valve | <https://partner.steamgames.com/doc/store/application/demos> (verificado) |
| Next Fest | Fev, jun, out; submeter ≥ 3 semanas antes; out/2026 (19–26) já passou; próximo fev/2027 | <https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest>, <https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027> |
| Preço | 37 moedas, 4 grupos regionais, "Propose Pricing"; mudanças só após 30 dias do release | <https://partner.steamgames.com/doc/store/pricing> |
| Steam Cloud | 100 MB por `FileWrite`; quotas no App Admin | <https://partner.steamgames.com/doc/features/cloud> |
| Revenue share | 30% base `[não verificado na doc oficial]` | — |
| Content survey | Obrigatória antes de store page e build | <https://partner.steamgames.com/doc/gettingstarted/contentsurvey> |

Gotchas (fontes secundárias): overlay Steam em Electron costuma exigir `--in-process-gpu` e `--disable-direct-composition`, com risco de crash e necessidade de repaint contínuo. <https://github.com/JamesMoulang/electron-steam-notes>. Steam Deck/Proton e Steam Input com Electron: `[não verificado]`.

Jogos web na Steam: CrossCode (HTML5 em NW.js). <https://giantbomb.com/wiki/Games/CrossCode>. Vampire Survivors começou em Phaser e migrou para Unity na 1.6. <https://vampire.survivors.wiki/w/Vampire_Survivors>

### 7.2 Capacitor e Google Play

| Item | Valor | Fonte |
| --- | --- | --- |
| @capacitor/core, /android | 8.6.0 (2026-10-28) | npm (verificado) |
| Requisitos Capacitor 8 | Node ≥ 22; Android Studio Otter 2025.2.1+; AGP 8.13.0; Gradle 8.14.3; Kotlin 2.2.20; minSdk 24 / compileSdk 36 / targetSdk 36 | <https://capacitorjs.com/docs/updating/8-0> (verificado) |
| WebView | Android 10+ usa Android System WebView; emulador não atualiza WebView | <https://capacitorjs.com/docs/android> |
| Plugins | `@capacitor/app` 8.1.2, `@capacitor/haptics` 8.0.2, `@capacitor/screen-orientation` 8.0.2 | npm |
| Gotcha orientação | `ScreenOrientation.lock` sem efeito em telas grandes no Android 16+; opt-out temporário não funciona no Android 17 | <https://capacitorjs.com/docs/updating/8-0> |
| Gotcha resize | Adicionar `density` em `configChanges` para evitar reload do WebView | mesma |
| Play target API | API 36 para novos apps e updates desde 2026-08-31; extensão solicitável até 2026-11-01 | <https://developer.android.com/google/play/requirements/target-sdk> (verificado) |
| Registro | US$ 25, único | <https://support.google.com/googleplay/android-developer/answer/6112435> |
| Closed test | ≥ 12 testers por 14 dias antes de produção (contas pessoais criadas após 2023-11-13) | <https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB> |
| Política de pagamento | Desbloqueio de conteúdo deve usar Play Billing | <https://support.google.com/googleplay/android-developer/answer/9858738> |
| Taxas | Tabela complexa por região (15%–30% + billing fee); extração ambígua, confirmar na página viva | <https://support.google.com/googleplay/android-developer/answer/112622> |
| WebGPU Android | Chrome 121+ em Android 12+ (Qualcomm/ARM); WebView: estimativa Chrome 146 `[não verificado]` | <https://developer.chrome.com/blog/new-in-webgpu-121> |
| Tauri 2 (alternativa) | `@tauri-apps/api` 2.12.4; usa WebView2/System WebView (comportamento WebGL varia por device) | <https://v2.tauri.app/reference/webview-versions/> |

### 7.3 Implicações para o Grim Cubes

- Electron 45.2.1 pinado; escolher **um** packager em ADR (Forge é o oficial; electron-builder documenta NSIS/portable e assinatura Azure).
- Assinatura Windows a partir do Brasil: Artifact Signing individual não atende; planejar certificado OV de terceiro ou aceitar aviso SmartScreen na fase inicial (Steam entrega o binário sem SmartScreen, mas o instalador fora da Steam não).
- Steam: planejar 21 dias entre taxa e release; demo como App ID separado; Next Fest fev/2027 como alvo de wishlists (exige demo ≥ 3 semanas antes).
- Android: targetSdk 36 / minSdk 24; 12 testers × 14 dias; demo gratuita + IAP "desbloquear jogo completo" via Play Billing é compatível com a política, mas o modelo exato (app pago vs IAP) decide-se na Etapa 2.
- Web: JS no cliente é inspecionável; limite da demo (round 10) e desbloqueio precisam de validação no servidor se a versão web for vendida `[inferência]`.
- Overlay Steam: testar cedo com flags; se instável, desligar overlay e documentar.

### 7.4 Não verificado

- Tamanho típico de app Electron/AAB; Steam Deck; achievements via steamworks.js; revenue share oficial; custo de certificado OV; status do greenworks; política de demo na Play; AAB obrigatório (consta como requisito conhecido, não reconfirmado).

## 8. Tema 6b — Áudio: ElevenLabs e Babylon Audio Engine v2

### 8.1 ElevenLabs

- Sound Effects: `POST https://api.elevenlabs.io/v1/sound-generation`; `text` (obrigatório), `duration_seconds` 0,5–30, `loop`, `prompt_influence` 0–1 (default 0,3), `model_id` default `eleven_text_to_sound_v2`, `output_format` default `mp3_44100_128`. <https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert> (campo `duration_seconds` verificado)
- Página de SFX diz 0,1–30 s e WAV 48 kHz para efeitos sem loop; API ref diz MP3 192 kbps exige Creator+ e PCM/WAV exige Pro+. Conflito: confirmar formato antes de fixar. <https://elevenlabs.io/docs/overview/capabilities/sound-effects>
- Music API: `POST /v1/music`, `music_length_ms` 3.000–600.000, `force_instrumental`. <https://elevenlabs.io/docs/api-reference/music/compose>
- SDK: `@elevenlabs/elevenlabs-js` 2.75.0 (2026-10-28), MIT. Alternativa sem dependência: `fetch` direto.
- Modelos TTS: eleven_v4, eleven_v4_turbo, eleven_v3, eleven_multilingual_v2 (pt), eleven_flash_v2_5. <https://elevenlabs.io/docs/overview/models>
- **Licença comercial**: plano Free não inclui licença comercial; planos pagos incluem; conteúdo gerado fora de assinatura paga não pode ser usado comercialmente. <https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform>. A página de SFX comercial diz que no Free é permitido com atribuição `[conflito entre páginas oficiais]`. <https://elevenlabs.io/sound-effects/commercial>
- Preços (lidos em 2026-10-31): Free 10.000 créditos; Starter US$ 6/mês 30.000; Creator US$ 22/mês 121.000; Pro US$ 99/mês 600.000. SFX ≈ 200 créditos por geração (≈150 SFX/mês no Starter, ≈605 no Creator, cálculo nosso). Music ≈ 900 créditos/min.
- Alternativas: jsfxr (Unlicense) <https://github.com/chr15m/jsfxr>; Kenney (CC0) <https://kenney.nl/support>; Freesound (licença por clipe).

### 8.2 Babylon Audio Engine v2

- `CreateAudioEngineAsync(options)` de `@babylonjs/core/AudioV2/webAudio/webAudioEngine`; `CreateSoundAsync(name, url|url[]|buffer, {loop, maxInstances, playbackRate, spatialEnabled})`; `CreateSoundBufferAsync`; `CreateStreamingSoundAsync` (HTMLMediaElement, para música); `CreateAudioBusAsync` + `sound.outBus`; spatial via `sound.spatial.attach(mesh)`. <https://doc.babylonjs.com/features/featuresDeepDive/audio/playingSoundsMusic>, <https://doc.babylonjs.com/typedoc/functions/_babylonjs_core.CreateAudioEngineAsync>
- Unlock: `await audioEngine.unlockAsync()` após gesto do usuário; há botão de unmute automático (`disableDefaultUI`) e `resumeOnInteraction`.
- Formatos: mp3 e wav em todos os navegadores; ogg na maioria; array de URLs usa o primeiro reconhecido.
- Breaking 8.0: engine legada é opt-in; funções async ganharam sufixo `Async` (fórum). <https://forum.babylonjs.com/t/audio-engine-breaking-change-for-babylon-js-8-0/56012>
- Autoplay Chrome: AudioContext criado antes do gesto nasce `suspended`. <https://developer.chrome.com/blog/autoplay>
- Howler 2.2.4 (2023-09-19): desnecessário com Audio v2.

### 8.3 Implicações para o Grim Cubes

- Gerar SFX/música em **script de build** (Bun) com a chave em variável de ambiente local (`ELEVENLABS_API_KEY`, nunca no bundle nem no repositório), versionar os arquivos gerados com metadados (prompt, modelo, data, plano). Nenhuma chamada em runtime.
- Assinar plano pago (Starter no mínimo) antes de gerar qualquer áudio que vá para a build vendida; Free só para protótipo descartável.
- Usar Audio Engine v2 do Babylon; música por streaming; SFX por buffer com `maxInstances`; mp3 com wav como fallback.
- Fluxo de unlock no primeiro clique do menu.
- `@elevenlabs/elevenlabs-js` é dependência nova: pedir aprovação; `fetch` direto é alternativa sem dependência.

### 8.4 Não verificado

- Comportamento exato de `loop`; formatos por plano; áudio em Android WebView (`setMediaPlaybackRequiresUserGesture`); termos de Music em plano pago; preços em BRL.

## 9. Tema 6c — Mercado, preço, demo e Next Fest

### 9.1 Achados

- Preços dos líderes: Brotato US$ 5 (press release do 1.0) e R$ 16,99; Vampire Survivors US$ 4,99 `[agregador]` e R$ 12,99. Não foram encontrados survivor-likes 2D em US$ 9,99; os 3D (Army of Ruin R$ 26,49; YAZS R$ 46,99; DRG Survivor US$ 12,99 `[agregador]`) cobram mais.
- Mobile premium: Dead Cells Android lançou a US$ 9,99 (2020) e caiu para US$ 3,99; Slay the Spire Android US$ 9,99. <https://toucharcade.com/2020/06/03/dead-cells-download-android-google-play-price-playdigious-premium/>, <https://www.droidgamers.com/news/slay-the-spire-the-acclaimed-roguelike-deck-builder-is-out-now-on-android-for-9-99/>
- Volume: 18.905 lançamentos na Steam em 2025 (+17% vs 2024) e +45% em 2026 até 27/09 `[estimativa]`. <https://www.steampageanalyzer.com/blog/how-many-games-release-on-steam>
- Demos no Next Fest jun/2026: 4.382 (+66% vs jun/2025) `[estimativa]`. <https://newsletter.gamediscover.co/p/steam-demo-showcases-officially-good>
- 68–88% das wishlists ganhas no Next Fest vêm de quem não baixou a demo; demo publicada meses antes rende ~2,5× a mediana de wishlists `[secundária]`. <https://newsletter.gamediscover.co/p/analysis-why-some-steam-wishlists>
- ~40% dos jogos de 2025 não recuperaram US$ 100 `[estimativa]`. <https://mp1st.com/news/40-of-steam-games-in-2025-earned-less-than-100>
- Preço regional BRL: sem tabela oficial; calculadora de terceiros sugere ~55% do USD `[estimativa]`. <https://partner.steamgames.com/pricing/explorer>
- Demo por rounds vs por tempo: Steam não impõe expiração; o limite é implementado no jogo.

### 9.2 Implicações para o Grim Cubes

- US$ 10 é o dobro dos comparáveis 2D, mas está na faixa dos 3D. Posicionar como survivor-like 3D com mundo infinito e chefes, ou revisar para US$ 7,99–9,99 com desconto de lançamento. Decisão na Etapa 2.
- Demo até o round 10 + chefe do round 10 como "cliffhanger"; publicar a demo meses antes do Next Fest (fev/2027).
- Android: modelo "grátis até round 10 + IAP de desbloqueio" é o mais compatível com Play Billing e com a demo única; app pago US$ 9,99 é mais simples porém sem funil.
- Métrica alvo de pré-lançamento: wishlists (GameDiscoverCo); registrar como métrica de sucesso no GDD.

### 9.3 Não verificado

- Dados diretos de Gamalytic/VG Insights; preço atual de Slay the Spire/Dead Cells no Play; taxa de conversão demo→compra.

## 10. Tema 6d — Releases (padrão vukem), specs, licenças e classificação

### 10.1 Padrão de releases do repositório vukem (verificado via `gh api`)

Fonte: <https://github.com/AlexGalhardo/vukem/releases>, API `repos/AlexGalhardo/vukem/releases` (paginada, 90+ releases) e `CHANGELOG.md` do branch `main`, lidos pela sessão principal em 2026-10-31.

- **Tag**: `vX.Y.Z` (ex.: `v0.34.0`). Submódulos usam `caminho/vX.Y.Z` (ex.: `drivers/postgres/v0.5.0`), sem assets.
- **Título**: igual à tag. Pré-releases iniciais (v0.0.1–v0.0.5) tinham título `vX.Y.Z — descrição`, padrão abandonado depois.
- **Pré-release**: `false` desde v0.3.0; `draft: false`; target `main`.
- **Corpo**: idêntico à seção da versão no `CHANGELOG.md`. Seções H3 na ordem Keep a Changelog (`### Added`, `### Changed`, `### Fixed`, `### Security`, ...), sem emojis, sem "Full Changelog", sem notas automáticas do GitHub.
- **Item**: `- **escopo:** Descrição em inglês, imperativo (#PR) ([hash7](https://github.com/<owner>/<repo>/commit/<hash40>))`.
- **Assets** (15 por release principal): `checksums.txt`, `checksums.txt.sigstore.json`, `vukem.intoto.jsonl`, `vukem_<versão>_<os>_<arch>.tar.gz` (linux/darwin) ou `.zip` (windows), cada binário com `.sbom.json`.
- **CHANGELOG.md**: `# Changelog`, parágrafo padrão Keep a Changelog 1.1.0 + SemVer, `## [Unreleased]` no topo, `## [X.Y.Z] - AAAA-MM-DD`, mesmos itens do corpo da release, rodapé com `[Unreleased]: .../compare/vX.Y.Z...HEAD` e `[X.Y.Z]: .../compare/vANT...vX.Y.Z`. Breaking marcado com `**BREAKING:**`.

Exemplo literal (trecho do corpo de `v0.34.0`):

```markdown
### Added

- **stripe:** Add subscription and checkout session list calls (#36) ([be4299a](https://github.com/AlexGalhardo/vukem/commit/be4299a26090782e825820bbe3824ba493d05e0d))
- **orm:** Add orm:"readonly" for columns the database computes (#37) ([7840707](https://github.com/AlexGalhardo/vukem/commit/7840707ff824ab8fa2f74e937b4c55b503002dce))

### Fixed

- **vukem:** Stop reporting a finished health check as busy (#42) ([5b7d969](https://github.com/AlexGalhardo/vukem/commit/5b7d969fb6d58ed297eb2abeb0ebbc292d8e8074))

### Security

- **openapi:** Add Info.License, plain-route security and 4XX responses (#52) ([518f09b](https://github.com/AlexGalhardo/vukem/commit/518f09bf42ac773cd09f7760f20205ee3471d60d))
```

Implicação: o Grim Cubes replica tag `vX.Y.Z`, título = tag, corpo = seção do CHANGELOG, itens com escopo em negrito e link de commit, assets com checksums (e SBOM/atestação quando houver binários Electron). Isso vira ADR na Etapa 4.

### 10.2 Especificações

- Conventional Commits 1.0.0: `<type>[scope][!]: <description>`; `feat` → MINOR, `fix` → PATCH, `!`/`BREAKING CHANGE` → MAJOR. <https://www.conventionalcommits.org/en/v1.0.0/>
- SemVer 2.0.0: `0.y.z` = desenvolvimento inicial, tudo pode mudar. <https://semver.org/>
- Keep a Changelog 1.1.0: Added, Changed, Deprecated, Removed, Fixed, Security; `[Unreleased]` no topo. <https://keepachangelog.com/en/1.1.0/>

### 10.3 Licenças, IP e classificação

- Fontes: SIL OFL 1.1 permite bundle em software com condições (Reserved Font Name). <https://openfontlicense.org/>
- Kenney: CC0, atribuição opcional. <https://kenney.nl/support>
- Freesound: licença por clipe (CC0 e CC BY ok para comercial; BY-NC não). <https://en.wikipedia.org/wiki/Freesound>
- Trade dress: Tetris Holding v. Xio Interactive (2012) reconheceu trade dress de estilo visual `[secundária]`. <https://www.loeb.com/zh-hans/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc>
- Games Workshop é agressiva com fan content `[secundária]`. Evitar aquilas, "Space Marine", nomes de facções.
- IARC (Google Play): questionário no Play Console; gore intenso tende a ESRB M / PEGI 16–18. <https://support.google.com/googleplay/answer/6209544>
- Steam content survey obrigatória; descritores exatos de violência `[não verificado]`.

### 10.4 Implicações para o Grim Cubes

- Criar `CHANGELOG.md` já na fase ESTRUTURA no formato vukem; automatizar release notes a partir dele.
- Elementos próprios (nomes, silhuetas, paleta, UI); "inspirado em" nunca "copiado de". Registrar no Art Bible a seção "O que evitar".
- Planejar classificação M/18 e marcar isso na página Steam e no IARC.

## 11. Riscos consolidados

| # | Risco | Impacto | Mitigação |
| --- | --- | --- | --- |
| R1 | Marca "Grim Cubes" não consultada em USPTO/EUIPO/INPI | Renomear tarde (perda de wishlists, domínio) | Consulta manual na fase ESTRUTURA; shortlist de alternativas pronta |
| R2 | Preço US$ 10 acima dos comparáveis 2D | Conversão baixa | Decidir posicionamento 3D na Etapa 2; testar desconto de lançamento |
| R3 | Performance de horda animada em Android WebView sem benchmark real | Reduzir cap de inimigos ou cortar mobile | Spike de performance no PROTÓTIPO com device alvo; cap configurável |
| R4 | Assinatura Windows (Artifact Signing só EUA/Canadá) | SmartScreen fora da Steam | Certificado OV de terceiro ou distribuir desktop só via Steam |
| R5 | Vercel Hobby proíbe uso comercial | Conta suspensa | Pro antes da venda; demo web pode ficar no Hobby `[verificar fair use]` |
| R6 | Licença ElevenLabs: conteúdo gerado no Free não é comercial | Retrabalho de áudio | Plano pago antes da geração definitiva; metadados por arquivo |
| R7 | Overlay Steam em Electron instável | Reviews negativas | Testar flags cedo; fallback sem overlay |
| R8 | TypeScript 7 sem API JS; ferramentas podem quebrar | Atrito de tooling | Biome não depende de tsc; validar Vitest/Vite cedo; fallback `@typescript/typescript6` |
| R9 | Google Play: targetSdk 36 e 12 testers × 14 dias | Atraso de lançamento Android | Entrar no roadmap da fase BETA |
| R10 | Gore em voxel vira cartoon | Tom errado | Art Bible com regras de sangue/som/câmera; testes de leitura |
| R11 | Saturação do gênero (milhares de demos por Next Fest) | Visibilidade baixa | Diferenciais claros (3D voxel sombrio, mundo infinito, chefes a cada 10) e demo meses antes do fest |
| R12 | Babylon 9 "Large World Rendering" experimental | API instável | Origin shifting próprio como plano A |
| R13 | Camada de IP (Warhammer/DOOM/Alien/Predator) | Takedown | Regras "o que evitar" no Art Bible |

## 12. Perguntas em aberto

Para a Etapa 2 (brainstorming):

1. Nome: manter "Grim Cubes" (com consulta de marca manual) ou adotar alternativa?
2. O que acontece exatamente nos rounds 10, 20, 30…: só chefe, chefe + horda, chefe escalando, chefes diferentes por dezena?
3. Duração do round: rampa Brotato (20→60 s) ou fixa? Round de chefe por tempo ou até matar o chefe?
4. Elites: 20% por round é chance independente ou com pity (garantia a cada N rounds)?
5. Loja: entre rounds (Brotato) ou NPC no mapa (briefing diz "NPC da loja")? Se NPC, ele aparece onde no mundo infinito?
6. Meta-progressão: desbloqueio por marco (Brotato) ou moeda persistente (VS)? Afeta a demo.
7. Demo: até o round 10 inclui o chefe? Meta-progressão persiste da demo para o jogo completo?
8. Preço: US$ 10 firme ou faixa US$ 7,99–9,99? Android: app pago ou grátis + IAP?
9. Câmera: ortográfica pura ou perspectiva FOV baixo (Diablo 4)? Rotação permitida?
10. Mundo: terreno plano com props ou com altura (colinas)? Biomas desde o início?
11. ECS (bitecs/miniplex) ou arquitetura própria sem dependência?
12. Packager Electron (Forge vs electron-builder) e hooks (lefthook vs Husky): decidir em ADR.
13. Versão web é vendida (exige backend de entitlement) ou só demo web + venda em Steam/Play?
14. Escopo mobile na 1.0 ou pós-lançamento?

## 13. Suposições

- "Round" do briefing equivale a "onda/wave" do Brotato.
- Versões "estáveis" = dist-tag `latest` do npm sem sufixo de pré-release, na data da pesquisa.
- O repositório `AlexGalhardo/grim-cubes` é do próprio autor do projeto.
- A pasta `C:\dev\grim-cubes` ainda não é repositório git; `.env` presente no diretório foi adicionado ao `.gitignore` criado nesta etapa.
- Fontes de fórum do Babylon.js são tratadas como relatos, não como especificação.

## 14. Metodologia e verificação

- 7 subagentes de pesquisa (somente leitura) rodaram em paralelo, um por tema: nome, game design, arte/tom, stack, ports, técnicas, áudio/mercado/releases. Cada um recebeu a instrução de nunca inventar URL, versão ou número e de marcar `[não verificado]`.
- A sessão principal verificou diretamente, em 2026-10-31: todas as versões npm da tabela 5.1 (dist-tag `latest` + data), releases GitHub de Bun, Electron, Capacitor, TypeScript, Biome e Vite, e trechos literais das páginas: Brotato Waves ("20 seconds… +5 seconds… 60 seconds"), Brotato Enemies ("100 enemies"), Hytale ("64px per unit"), Google Play ("API level 36"), Steam demos ("separate App ID"), Vercel ("non-commercial personal use only"), ElevenLabs (`duration_seconds`), Babylon (`thinInstanceSetBuffer`, `BakedVertexAnimationManager`), Electron 45 ("Chromium 156.0.8078.48"), Capacitor 8 (`targetSdkVersion`); e o corpo literal das releases do vukem via `gh api`.
- Arquivos criados nesta etapa: `docs/web-search.md`, `.editorconfig`, `.markdownlint-cli2.jsonc`, `.gitignore`.
- Limitações: bases de marca inacessíveis por ferramenta; Fandom (VS) retornou 402; itch.io retornou a home; benchmarks de performance são anedóticos.
