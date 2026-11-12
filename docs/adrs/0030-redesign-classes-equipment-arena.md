# ADR-0030 — Redesenho: classes, equipamento, arena que cresce e chefes a cada 5 rounds

Status: aceito (decisão do PO); execução na Parte 1A do `ROADMAP.md` (trilhas S-19 a S-27), versão `v0.7.0`, antes da arte medium poly (S-18). Data: 2026-11-12.

## Contexto

O PO jogou a `v0.6.0` até o round 15 e pediu outro loop (`TODO.md` da raiz, "Feedbacks"). O jogo atual tem armas trocáveis com 4 tiers, uma loja de itens, armas e consumíveis num Mercador que fica no mapa, sinergias por etiqueta, mundo procedural infinito, 5 chefes a cada 10 rounds e 4 biomas. A entrevista de 2026-11-12 fechou os pontos abertos.

## Decisão

1. **Rounds:** o round 1 dura 30 s; cada round soma 5 s; o teto dos rounds normais é 120 s. O round de chefe continua sem timer.
2. **Loja:**
   - Abre sozinha ao fim de cada round vencido e não há mais Mercador no mapa.
   - Vende só equipamento: capacete, armadura, calças, botas, anel e amuleto.
   - Cada slot tem nível de 1 a 10, e a loja nunca oferece peça pior que a equipada.
   - Os níveis 1 a 6 se compram com ouro.
   - Para os níveis 7 a 9, o jogador gasta **fragmentos de elite**; cada elite dropa 1 com 100% de chance.
   - Para o nível 10, gasta uma **relíquia**; cada chefe dropa 1 com 100% de chance.
   - O jogador escolhe o slot que sobe.
3. **Arena:** o mapa deixa de ser infinito. É um quadrado que cresce um pouco a cada round, com borda visível e intransponível.
4. **Classes:**
   - O herói não troca de arma.
   - **Warrior:** desbloqueado desde o início, com espada que atinge vários inimigos.
   - **Ranged:** desbloqueado ao matar o chefe do round 10. Usa um bumerangue que ricocheteia entre 3 alvos, chegando a 20 no nível 10 da arma.
   - **Mago:** desbloqueado ao matar o chefe do round 20. Usa um machado mágico que acerta em área circular; no nível 10 da arma, o raio dobra.
   - O Fuzilado e a Penitente da `v0.6.0` saem; o Carrasco vira o Warrior.
5. **Magias:**
   - Cada classe tem 4 ofensivas automáticas com recarga, uma cura e uma super.
   - A cura e a super são acionadas pelo jogador (tecla ou botão).
   - A super carrega com 100 abates no round. Cada uso aumenta em 5 os abates da próxima carga.
   - A super dura 5 s e atinge a área ao redor do herói.
6. **Ossuário:** vira uma árvore de quadrados ligados, que sobe cada magia (cura e super incluídas) até o nível 10, pago com almas.
7. **Chefes:**
   - São 10, nos rounds 5, 10, ..., 50. Cada um tem 5 ataques, escolhidos ao acaso, sempre com marcação vermelha no chão antes do golpe.
   - Depois do round 50 vem o modo infinito: inimigos e chefes sorteados.
8. **Biomas:** são 5 e trocam a cada 10 rounds (1–10, 11–20, …, 41–50). Do round 51 em diante, o bioma é sorteado.
9. **Clima:** cada bioma ganha VFX de ambiente (neblina, chuva, gelo caindo, vento, brasas), dentro do orçamento de partículas do preset.
10. **Fica da `v0.6.0`:** as cartas de level-up (atributos) e o desafio diário, que passa a sortear a classe do dia entre as desbloqueadas.
11. **Sai da `v0.6.0`:** sinergias e etiquetas, itens, armas e consumíveis da loja, o Mercador no mapa, o mundo infinito, os tiers de arma comprados e o rodízio de chefes a cada 10 rounds.
12. **Arte:** até a S-18, os 5 chefes novos, o 5º bioma e as classes usam modelos voxel existentes recoloridos ou adaptados. A S-18 passa a modelar as classes, os 10 chefes e os 5 biomas.

## Consequências

- O save sobe de versão. A migração converte a run em andamento para o Warrior e descarta itens e armas antigos sem quebrar o perfil. Almas, recordes e marcos ficam.
- O simulador de balanceamento precisa de bots para as três classes. O `kite` atual serve de base para o Ranged. As faixas do GDD §25 são revistas para o loop novo.
- Telas afetadas: loja, Ossuário, escolha de herói, HUD (botões de cura e super, barra de carga da super) e resultados.
- As baselines do Playwright (S-16-01) só fazem sentido depois do redesenho; a S-16-01 passa a depender da Parte 1A.
- A demo do Next Fest mostra os rounds 1 a 10 com o Warrior e os chefes dos rounds 5 e 10.

## Alternativas consideradas

- **Magias todas manuais:** dão mais controle, mas pesam no celular e mudam o gênero do jogo. Descartada.
- **Elites e chefes dropando a peça pronta:** é mais simples, mas o jogador perde a escolha do slot. O PO escolheu o material.
- **Manter sinergias aplicadas ao equipamento:** mais um sistema para balancear num loop novo. O PO escolheu removê-las.
- **Fazer junto com a arte medium poly:** geraria retrabalho de modelos. Descartada.
