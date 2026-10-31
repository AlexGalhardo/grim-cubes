# Grim Cubes — Brainstorming (Etapa 2)

Entrevista estruturada entre o Diretor/Arquiteto (sessão Claude Code) e o Product Owner (Alex). Base: `docs/web-search.md`.

Status: **lotes 1–6 respondidos em 2026-10-31**; restate aprovado pelo PO (§7.1). **Etapa concluída.**

Regras do documento:

- Perguntas em lotes de 3 a 5, por tema. Cada pergunta traz opções com prós/contras e a recomendação do Diretor.
- Respostas são transcritas literalmente na seção "Resposta" e a decisão fechada vai para a tabela de decisões.
- O que não for decidido vai para "Itens adiados" com o motivo.

## Sumário

1. [Hipótese inicial](#1-hipótese-inicial)
2. [Lote 1 — Inconsistências do briefing e nome](#2-lote-1--inconsistências-do-briefing-e-nome)
3. [Lote 2 — Game design e mecânicas](#3-lote-2--game-design-e-mecânicas)
4. [Lote 3 — Economia, progressão e balanceamento](#4-lote-3--economia-progressão-e-balanceamento)
5. [Lote 4 — Implementação técnica](#5-lote-4--implementação-técnica)
6. [Lote 5 — Art bible e áudio](#6-lote-5--art-bible-e-áudio)
7. [Lote 6 — Monetização, demo, escopo e prazos](#7-lote-6--monetização-demo-escopo-e-prazos)
8. [Decisões](#8-decisões)
9. [Itens adiados](#9-itens-adiados)

## 1. Hipótese inicial

Hipótese do Diretor sobre o que o PO quer: um survivor-like 3D voxel sombrio, jogável em 15 a 40 minutos por run, que se diferencie de Brotato/VS por mundo infinito, chefes recorrentes e tom grimdark, vendido como premium em três plataformas com uma demo única que funcione como funil.

Confiança: ~55%. Faltam: o que acontece de fato nos rounds de chefe, a duração alvo de uma run, o que a demo inclui, se o nome se mantém e qual é o escopo mínimo da 1.0 (mobile junto ou depois).

## 2. Lote 1 — Inconsistências do briefing e nome

### P1. Nome do jogo

Contexto: nenhuma colisão encontrada em Steam, Google Play, GitHub e redes; domínios `.com` e `.com.br` livres; bases de marca não consultadas (ver `docs/web-search.md` §2).

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Manter "Grim Cubes" e registrar domínios agora; consulta de marca manual na fase ESTRUTURA | Nome já tem identidade; zero retrabalho; domínios baratos | Risco residual de marca até a consulta |
| B. Trocar agora para a shortlist (Gravecube, Voxgrim, Gravevox) | Nomes mais únicos, menos genéricos | Perde o nome que o PO já escolheu; mesma necessidade de consulta |
| C. Manter como nome de trabalho e decidir só antes da página Steam | Adia o custo | Toda a doc e o repositório ficam com nome provisório |

Recomendação: **A**.

Resposta (2026-10-31): A — manter "Grim Cubes"; registrar domínios; consulta de marca na fase ESTRUTURA.

### P2. O que acontece nos rounds 10, 20, 30…

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Um chefe por dezena, mesmo modelo escalado linearmente; horda comum reduzida continua spawnando | Mais barato (1 asset de chefe); fácil de balancear | Monótono num jogo infinito |
| B. Arena limpa: só o chefe, spawns pausam até ele morrer | Momento "evento" claro; leitura fácil | Quebra o pilar "inimigos de todos os lados"; chefe vira duelo |
| C. Roster de 3 a 5 chefes únicos; ordem fixa até o round 50, depois sorteio com modificadores de elite; horda reduzida continua | Variedade sustenta o infinito; cada chefe ensina um padrão | Mais assets e mais balanceamento |

Recomendação: **C**, entregue em fases: A no PROTÓTIPO (1 chefe), C no ALPHA (3 chefes), 5 chefes no BETA.

Resposta (2026-10-31): C — roster de chefes em fases (1 no PROTÓTIPO, 3 no ALPHA, 5 no BETA); horda reduzida continua.

### P3. Duração de um round e fim do round de chefe

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Rampa Brotato: round 1 = 20 s, +5 s por round até 60 s; chefe sem timer (termina ao morrer), com "enrage" a cada 60 s | Validado por 2M+ de cópias; ritmo cresce com o build | Run longa em rounds altos (round 30 ≈ 25 min) |
| B. Fixo 45 s por round, chefe 90 s com timeout (chefe foge, sem recompensa) | Previsível; run de 30 rounds ≈ 25 min | Chefe que foge frustra; início lento |
| C. Round termina por quota de kills (ex.: 30 + 10 × round), sem timer | Sem tempo morto; jogador controla ritmo | Difícil de balancear com build fraco; round 20+ vira maratona |

Recomendação: **A**.

Resposta (2026-10-31): A — rampa Brotato (20 s, +5 s por round até 60 s); chefe sem timer, enrage a cada 60 s.

### P4. O que a demo inclui

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Rounds 1 a 10 incluindo o chefe do round 10; ao vencer, tela de compra; desbloqueios da demo carregam para o jogo completo | Chefe é o clímax e o gancho; progresso preservado reduz atrito de compra | Jogador "completa" um ciclo e pode se satisfazer |
| B. Rounds 1 a 9; o chefe aparece e a demo corta (cliffhanger) | Gancho forte | Pode parecer truque; Steam exige que a demo seja experiência justa |
| C. Demo por tempo (30 min) ignorando rounds | Simples de explicar | Ignora a estrutura de rounds, que é a identidade do jogo |

Recomendação: **A**.

Resposta (2026-10-31): A — rounds 1–10 incluindo o chefe do round 10; desbloqueios carregam para o jogo completo.

### P5. Onde fica a loja ("NPC da loja")

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Tela de loja entre rounds (Brotato), com o NPC como retrato/"vendedor" da tela | Mais barato e legível; fórmulas do Brotato aplicam direto | NPC não existe no mundo |
| B. NPC físico que surge perto do jogador ao fim do round; interagir abre a loja; próximo round começa ao fechar | Tema sandbox; NPC vira personagem (voz ElevenLabs) | Mais trabalho (spawn, animação, interação); mobile precisa de botão |
| C. NPC fixo num posto do mapa; jogador precisa voltar até ele | Mundo com âncora | Contradiz "sem bordas, anda livremente"; backtracking chato |

Recomendação: **A no PROTÓTIPO, B no ALPHA** (a tela de loja vira o diálogo do NPC).

Resposta (2026-10-31): A — tela de loja entre rounds no PROTÓTIPO; NPC físico no ALPHA.

## 3. Lote 2 — Game design e mecânicas

### P6. Como o jogador ataca

Opções: A) auto-ataque com mira automática no inimigo mais próximo (Brotato/VS); B) mira manual no cursor/stick; C) híbrido com botão de foco. Recomendação: A (funciona igual em teclado, gamepad e touch).

Resposta (2026-10-31): A — auto-ataque + mira automática.

### P7. Quantas armas simultâneas

Opções: A) 6 slots com armas repetíveis e fusão (Brotato); B) 1 arma principal + passivos e árvore de habilidades; C) 4 slots, uma de cada tipo. Recomendação: A.

Resposta (2026-10-31): **B — 1 arma principal + passivos** (PO divergiu da recomendação; menos "build porn", mais legibilidade e menos balanceamento).

### P8. Troca e evolução da arma única

Opções: A) comprar substitui a atual (vende a antiga) e cada arma tem 4 tiers comprados como upgrade; B) inventário com até 3 armas e troca rápida; C) arma fixa escolhida no início da run. Recomendação: A.

Resposta (2026-10-31): A — comprar substitui; upgrade por tier (Comum/Incomum/Raro/Lendário); espada começa no tier 1.

### P9. Elites

Opções: A) 1 elite por round sorteado (20%, só em rounds comuns), modificador visível, ~10× HP, baú Lendário garantido, pity a cada 5 rounds; B) onda de 3–5 elites; C) 20% puro sem pity nem drop. Recomendação: A.

Resposta (2026-10-31): A.

### P10. Árvore de habilidades

Opções: A) meta-árvore permanente entre runs com moeda persistente (VS PowerUps / Hades Mirror); B) árvore dentro da run via level-up; C) ambas. Recomendação: A.

Resposta (2026-10-31): A — meta-árvore permanente.

### P11. Progressão dentro da run

Opções: A) loja + level-up com escolha de 1 entre 3 bônus de stat (materiais dão ouro e XP); B) só loja; C) só level-up. Recomendação: A.

Resposta (2026-10-31): A.

### P12. Personagens na 1.0

Opções: A) 1 herói com identidade forte, mais personagens pós-lançamento por marcos; B) 3 arquétipos na 1.0; C) herói único com skins. Recomendação: A.

Resposta (2026-10-31): A — 1 herói na 1.0.

## 4. Lote 3 — Economia, progressão e balanceamento

### P13. Moedas

Opções: A) ouro na run (zera ao morrer) + almas persistentes (meta-árvore); B) 1 moeda; C) 3 moedas. Recomendação: A.

Resposta (2026-10-31): A.

### P14. Níveis de dificuldade

Opções: A) 3 níveis (Normal/Grim/Nightmare) como multiplicador total, desbloqueados ao chegar ao round 20 no anterior; B) dificuldade única; C) Danger 0–5. Recomendação: A.

Resposta (2026-10-31): A.

### P15. Morte e duração alvo

Opções: A) permadeath, run boa = 20–30 rounds (~16–26 min de combate); B) permadeath, 40–50 rounds; C) 1 ressurreição por run. Recomendação: A.

Resposta (2026-10-31): A.

### P16. Raridades e stats

Opções: A) Brotato como baseline (4 raridades com tetos 60/25/8%, ~10 stats com caps, fórmulas de preço/reroll); B) modelo próprio simples (3 raridades, 6 stats); C) modelo profundo (5 raridades, 15+ stats, sets). Recomendação: A.

Resposta (2026-10-31): A.

### P17. Mundo procedural

Opções: A) terreno plano + props por chunk, biomas por distância do spawn; B) terreno com altura; C) plano sem biomas. Recomendação: A.

Resposta (2026-10-31): A.

## 5. Lote 4 — Implementação técnica

### P18. Câmera

Opções: A) perspectiva com FOV baixo (~30°), elevação ~55°, ângulo fixo, segue o herói com suavização, zoom leve (Diablo 4); B) ortográfica pura (54,7°); C) perspectiva com rotação livre. Recomendação: A.

Resposta (2026-10-31): A.

### P19. Simulação / ECS

Opções: A) `bitecs` 0.4.0 (SoA, TypedArrays, zero deps); B) estrutura própria SoA; C) `miniplex` 2.0.0. Recomendação: A.

Resposta (2026-10-31): A — bitecs (dependência aprovada pelo PO nesta resposta).

### P20. Empacotador Electron

Opções: A) `electron-builder` 26.18.0; B) Electron Forge 8.0.1; C) Tauri 2. Recomendação: A.

Resposta (2026-10-31): A — electron-builder.

### P21. Git hooks

Opções: A) `lefthook` 2.2.2; B) Husky 9.1.7 + lint-staged; C) simple-git-hooks. Recomendação: A.

Resposta (2026-10-31): A — lefthook.

### P22. Estado engine ↔ HUD

Opções: A) `useSyncExternalStore` com store próprio mínimo, HUD a 10–15 Hz; B) zustand 5.0.16; C) CustomEvent no DOM. Recomendação: A.

Resposta (2026-10-31): A — useSyncExternalStore puro.

## 6. Lote 5 — Art bible e áudio

### P23. Escala de voxel

Opções: A) Hytale: 1 unidade = 1 m, personagens 64 px/unidade, props/terreno 32 px/unidade; B) Minecraft 16 px/bloco; C) 32 px uniforme. Recomendação: A.

Resposta (2026-10-31): A.

### P24. Gore

Opções: A) gore alto estilizado (sangue escuro em partículas cúbicas e decals, desmembramento em cubos, execuções de chefe, toggle nas opções, classificação M/18); B) gore médio sem desmembramento; C) extremo sem toggle. Recomendação: A.

Resposta (2026-10-31): A.

### P25. Voz

Opções: A) NPC da loja (~20 falas) + chefes (3–5 falas cada), inglês, gerado em lote e versionado; B) sem voz na 1.0; C) narrador + NPC + chefes. Recomendação: A.

Resposta (2026-10-31): A.

### P26. Música e SFX

Opções: A) SFX via ElevenLabs Sound Effects + trilhas via ElevenLabs Music, em lote no build, plano Creator durante a produção; B) SFX ElevenLabs + música CC0/licenciada; C) tudo CC0/jsfxr. Recomendação: A.

Resposta (2026-10-31): A.

## 7. Lote 6 — Monetização, demo, escopo e prazos

### P27. Preço

Opções: A) US$ 9,99 firme com 10% de desconto nas 2 primeiras semanas, preços regionais pela ferramenta da Valve; B) US$ 7,99; C) US$ 4,99. Recomendação: A.

Resposta (2026-10-31): A.

### P28. Modelo no Google Play

Opções: A) app único grátis até o round 10 + compra única via Play Billing desbloqueia o jogo completo; B) app pago + app demo separado; C) app pago sem demo. Recomendação: A.

Resposta (2026-10-31): A.

### P29. Versão web

Opções: A) web = só demo gratuita com links para Steam e Play, sem backend de licença; B) web vendida com login e entitlement no servidor; C) web completa grátis. Recomendação: A.

Resposta (2026-10-31): A.

### P30. Plataformas na 1.0

Opções: A) 1.0 = demo web + Steam (Windows); Android na 1.1, 1–3 meses depois; B) tudo junto; C) Android indefinido. Recomendação: A.

Resposta (2026-10-31): A.

### P31. Prazo

Opções: A) 1.0 em ~6 meses (abr/2027), demo pública em jan/2027 antes do Next Fest de fev/2027; fases ESTRUTURA 2 sem, PROTÓTIPO 6 sem, ALPHA 8 sem, BETA 6 sem, RC 2 sem; ~20 h/semana; B) 1.0 em ~3 meses; C) sem prazo. Recomendação: A.

Resposta (2026-10-31): A.

## 7.1 Declaração de intenção (restate)

- Resultado: survivor-like 3D voxel grimdark, rounds infinitos com chefe a cada 10, mundo procedural plano e infinito, 1 herói, 1 arma por vez com 4 tiers, loja entre rounds, meta-árvore permanente.
- Usuário: jogador de Brotato/VS que quer o mesmo loop em 3D, com tom DOOM/40k e runs de 15–30 min, em PC (Steam) e depois Android.
- Por que agora: Next Fest fev/2027 como janela de wishlists; stack web permite 3 plataformas com um código.
- Sucesso: demo pública em jan/2027; 1.0 na Steam em abr/2027 a US$ 9,99; Android 1.1 até jul/2027; round 20–30 como run média; 60 fps com 100 inimigos no desktop alvo.
- Restrição: 1 pessoa + agentes, ~20 h/semana; sem dependência nova sem aprovação; áudio só com plano pago ElevenLabs.
- Fora de escopo da 1.0: Android, multiplayer, terreno com altura, personagens extras, rotação de câmera, venda na web, narrador.

Confirmação do PO: **aprovado em 2026-10-31** ("Sim, aprovado").

## 7.2 Adendos do PO (2026-10-31, após o restate)

### A1. Alvos de tela

O jogo deve ser focado e otimizado para 4 tamanhos de tela (dados fornecidos pelo PO; fontes secundárias citadas por ele: specclear, tech2geek, testmuai; não verificadas pelo Diretor):

| Alvo | Resolução/viewport | Participação | Fonte (via PO) |
| --- | --- | --- | --- |
| Desktop 1 | 1920 × 1080 | 50,52% dos monitores principais Steam (jul/2026) | Steam Hardware Survey via specclear `[não verificado]` |
| Desktop 2 | 2560 × 1440 | 27,04% (set/2026), +5,18 pontos | Steam Hardware Survey via tech2geek `[não verificado]` |
| Mobile 1 | 414 × 896 CSS px (~6,1", classe iPhone XR/11) | 12,12% (jun/2026) | Statcounter via testmuai `[não verificado]` |
| Mobile 2 | 360 × 800 CSS px (~6,5", classe Galaxy A) | 9,19% (jun/2026) | Statcounter via testmuai `[não verificado]` |

Decisão: D31. Detalhes de layout em `docs/gdd.md` §29 e `docs/art-bible.md` §17.

### A2. Prompts de concept art

Na Etapa 6, além de `prompt-workers.md`, criar `prompt-concept-arts.md` na raiz: prompts detalhados, específicos e técnicos para gerar concept arts do jogo "finalizado" no ChatGPT Plus, com base no Art Bible e no GDD (gameplay, HUD, UI, menu, loja etc.), em versões web, desktop e mobile. Decisão: D32.

### A3. Design system

O Art Bible deve conter o design system completo (tokens, tipografia, componentes, estados, motion, breakpoints). Decisão: D33. Implementado em `docs/art-bible.md` §16.

## 8. Decisões

| ID | Decisão | Origem | Data |
| --- | --- | --- | --- |
| D01 | Nome: "Grim Cubes" mantido; domínios a registrar; consulta de marca na ESTRUTURA | P1 | 2026-10-31 |
| D02 | Rounds múltiplos de 10: roster de 3–5 chefes únicos, ordem fixa até o 50, depois sorteio com modificadores; horda reduzida continua | P2 | 2026-10-31 |
| D03 | Round comum: 20 s + 5 s/round até 60 s; round de chefe sem timer, enrage a cada 60 s | P3 | 2026-10-31 |
| D04 | Demo: rounds 1–10 com chefe; tela de compra ao vencer; progresso da demo persiste | P4 | 2026-10-31 |
| D05 | Loja: tela entre rounds (PROTÓTIPO) → NPC físico que surge ao fim do round (ALPHA) | P5 | 2026-10-31 |
| D06 | Combate: auto-ataque com mira automática no inimigo mais próximo | P6 | 2026-10-31 |
| D07 | 1 arma principal por vez; comprar substitui; 4 tiers por arma via upgrade na loja; espada tier 1 inicial | P7, P8 | 2026-10-31 |
| D08 | Elite: 20% por round comum, 1 elite com modificador visível, ~10× HP, baú Lendário garantido, pity a cada 5 rounds sem elite | P9 | 2026-10-31 |
| D09 | Skill tree = meta-árvore permanente entre runs, comprada com moeda persistente | P10 | 2026-10-31 |
| D10 | Na run: materiais dão ouro + XP; level-up escolhe 1 de 3 bônus de stat; loja vende itens e upgrades | P11 | 2026-10-31 |
| D11 | 1 herói jogável na 1.0; mais personagens pós-lançamento por marcos | P12 | 2026-10-31 |
| D12 | Moedas: ouro (run, zera ao morrer) e almas (persistente, compra a meta-árvore) | P13 | 2026-10-31 |
| D13 | Dificuldades Normal/Grim/Nightmare como multiplicador total de HP/dano; desbloqueio ao chegar ao round 20 no nível anterior | P14 | 2026-10-31 |
| D14 | Permadeath sem continue; alvo de run boa = rounds 20–30 | P15 | 2026-10-31 |
| D15 | Raridades, stats, chance por tier e fórmulas de loja: baseline Brotato, ajustado por playtest | P16 | 2026-10-31 |
| D16 | Mundo: terreno plano com props por chunk; biomas por distância do spawn | P17 | 2026-10-31 |
| D17 | Câmera: perspectiva FOV baixo, elevação ~55°, ângulo fixo sem rotação, segue o herói | P18 | 2026-10-31 |
| D18 | Simulação em ECS com bitecs 0.4.0 (dependência aprovada) | P19 | 2026-10-31 |
| D19 | Desktop: Electron 45.2.1 + electron-builder 26.18.0 (NSIS/portable) | P20 | 2026-10-31 |
| D20 | Hooks: lefthook 2.2.2 (sem Husky/lint-staged) | P21 | 2026-10-31 |
| D21 | Estado engine↔HUD: store próprio + useSyncExternalStore; HUD a 10–15 Hz | P22 | 2026-10-31 |
| D22 | Escala: 1 unidade = 1 m; personagens 64 px/unidade; props e terreno 32 px/unidade | P23 | 2026-10-31 |
| D23 | Gore alto estilizado com toggle; sangue escuro cúbico, desmembramento em cubos, execuções de chefe; mira M/18 | P24 | 2026-10-31 |
| D24 | Voz (ElevenLabs TTS, inglês): NPC da loja e chefes, geradas em lote no build e versionadas | P25 | 2026-10-31 |
| D25 | SFX e música via ElevenLabs (Sound Effects + Music), geradas em lote; plano Creator na produção | P26 | 2026-10-31 |
| D26 | Preço US$ 9,99 em todas as lojas; 10% de desconto nas 2 primeiras semanas; regional pela Valve | P27 | 2026-10-31 |
| D27 | Google Play: app único grátis até o round 10 + compra única via Play Billing | P28 | 2026-10-31 |
| D28 | Web (Vercel): só demo gratuita com links para as lojas; sem backend de licença | P29 | 2026-10-31 |
| D29 | 1.0 = demo web + Steam Windows; Android na 1.1 (1–3 meses depois) | P30 | 2026-10-31 |
| D30 | Prazo: demo pública jan/2027 (Next Fest fev/2027); 1.0 abr/2027; fases 2/6/8/6/2 semanas; ~20 h/semana | P31 | 2026-10-31 |
| D31 | Alvos de tela: 1920×1080, 2560×1440 (desktop); 414×896 e 360×800 CSS px em landscape (mobile) | A1 | 2026-10-31 |
| D32 | Etapa 6 inclui `prompt-concept-arts.md` (prompts para ChatGPT Plus; versões web, desktop, mobile) | A2 | 2026-10-31 |
| D33 | Art Bible contém o design system completo | A3 | 2026-10-31 |
| D34 | Nomes diegéticos do GDD (Carrasco, Mercador de Ossos, Ossuário, chefes, biomas) e dash só via Ossuário confirmados; dependências de dev e worktrees/paralelismo aprovados; LICENSE proprietária; concept arts em `references/concept-arts/` | Bloqueios do PROGRESS | 2026-10-31 |

## 9. Itens adiados

| Item | Motivo | Quando revisitar |
| --- | --- | --- |
| Personagens extras (3 arquétipos) | Escopo da 1.0 reduzido a 1 herói | Pós-1.0, por marcos |
| NPC físico da loja | Tela entre rounds primeiro | ALPHA |
| Narrador grimdark | Custo de roteiro e créditos | Pós-1.0 |
| Terreno com altura | Custo de pathing/câmera/performance | Avaliar após 1.0 |
| Venda na web com entitlement | Exige backend e Vercel Pro | Avaliar após Android |
| Rotação de câmera | Legibilidade e mobile | Não planejado |
| Steam Deck / Linux / macOS | Fora do briefing | Avaliar após 1.0 |
| Consulta de marca INPI/USPTO/EUIPO | Não acessível por ferramenta | Tarefa manual na fase ESTRUTURA |
