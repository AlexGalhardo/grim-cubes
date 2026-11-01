# ADR-0025 — Slots de save, checkpoint por round e pausa

Status: aceito. Data: 2026-10-31. Decisões do PO de 2026-10-31. Emenda o ADR-0009 (que dizia "sem save de run"); o resto do ADR-0009 (envelope, checksum, `.bak`, Auto-Cloud, pasta fixa no Electron) continua valendo.

## Contexto

O ADR-0009 decidiu não salvar a run: fechar o jogo a abandonava, para evitar save scumming e o custo de serializar o mundo. O PO pediu três coisas que mudam isso: vários perfis na mesma máquina (três slots), retomar a run depois de fechar o jogo (Continuar) e uma pausa de verdade, com saída para o menu sem perder a run.

## Alternativas consideradas

- Manter "sem save de run": o jogador perde a run ao fechar o jogo ou ao sair pelo menu; contraria o pedido do PO.
- Save completo do mundo a qualquer momento (inimigos, projéteis, VFX): serialização cara e save scumming no meio do combate.
- Checkpoint só na loja: o jogador sai na loja e volta nela; parecido com o escolhido, mas reabriria a loja com outro sorteio.

## Decisão

- **Três slots** (`SLOT_COUNT = 3`), cada um um perfil completo: almas, Ossuário, recordes, estatísticas, marcos, skins e a run em andamento. Settings, teclas e o último slot usado ficam globais, na chave `save`. Chaves `slot1` a `slot3`, cada uma com `.bak`, validadas na web e no Electron. O save único dos schemas 1 a 9 vira o slot 1 na primeira carga, com o checksum conferido (schema 10, dbc7607).
- **Checkpoint por round:** ao começar cada round (depois da loja), o slot grava o estado da run: round, ouro, XP, nível, HP, itens, arma e tier, modificadores escolhidos, rerolls, dificuldade, seed, o estado dos dez streams de RNG e a posição do herói. Inimigos, projéteis e VFX não entram: ao retomar, o round recomeça limpo, com a mesma economia, build e sorteios. Morrer ou terminar a run apaga o checkpoint (463c14f).
- **Continuar** no menu abre o último slot usado e retoma a run dele; sem run, abre o perfil e vai para a escolha de dificuldade. **Novo jogo** escolhe o slot; um slot ocupado só é sobrescrito com confirmação.
- **Pausa** a qualquer momento (Esc, Start ou o botão de pausa no toque): Continuar, Opções e "Sair para o menu" com confirmação; sair mantém a run no checkpoint do início do round atual (81e9ff0).

## Consequências

- O save scumming fica limitado a repetir o round inteiro desde o início, com os mesmos sorteios: não há como reverter um golpe ou um baú no meio do round.
- O save cresce com a run (itens e streams de RNG), ainda dentro do limite de 64 KB do parser.
- Cada mudança no estado da run exige migração de schema e um teste de retomada; o determinismo da retomada depende dos streams de RNG gravados.
- O Auto-Cloud sincroniza os três slots e os `.bak` (`*.json` em `saves/`).

## Referências

ADR-0009; SDD 06 §2 e §2.1; GDD §21.4; commits dbc7607, 463c14f e 81e9ff0; ROADMAP A-07-06.
