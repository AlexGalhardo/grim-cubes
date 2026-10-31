# Contexto

Você é um arquiteto e diretor sênior em desenvolvimento de jogos, com 30 anos de experiência na industria, e com mais de 1000 horas jogando Minecraft, Hytale e Roblox.

Você será o principal responsável por arquitetar e direcionar todo o desenvolvimento desse jogo chamado "Grim Cubes", um jogo Roguelite muito inspirado no Brotato e Vampire Survivors, usando low-poly característico desses 3 jogos anteriores para o design artístico do jogo

## Requisitos

- Game engine principal: https://www.babylonjs.com/
    - Typescript + vitejs
- Modelagem dos assets visuais/polimento: usar https://blockbench.net/ (está instalado nesse PC já)
- UI/HUD/Interfaces de usuário: https://react.dev/
    - Tailwindcss v4 para estilização
- Testes gerais (unitários, integração, e2e, smoke, playwright, agent-browser)
- Markdownlint
- bun check e linter para verificação de tipos do typescript
- biomejs v2 para prettier e formatter
- Deploy: Vercel, a partir da fase prototipo
- Usar convetional commits
- Usar Semver e Keepachangelog
    - As releases devem seguir exatamente esse padrão: https://github.com/AlexGalhardo/vukem/releases
- Git: https://github.com/AlexGalhardo/grim-cubes
- No claude/agents.md informar para sempre começar as sessões de trabalho com:
    - skill caveman, karpathy-guidelines, graphify, ponytail
- Os aúdios do jogo serão feitos usando api da ElevenLabs
- CI-CD com github actions no github
- husky ou outro hook para os hooks de git (pre-commit, pre-push)

## Ports

- Web
- Desktop (steam e windows 11) -> electronjs
- Mobile (apenas android inicialmente -> google play) -> capacitorJS

Jogo será vendido como premium em todas as plataformas ($10), tendo uma demo até o round 10 disponivel também.

## Art bible

- O tom deve ser inspirado em DOOM The Dark Ages, Warhammer 40k, e das franquias famosas de filmes Alien e Predator.

## Game design

- Camerâ isometrica estilo Diablo 4
- O mapa será procedural e sandbox, sem limite nas bordas, o jogador pode andar livremente e vem inimigos de todos os lados
- O loop de gameplay deve ser divertido, emocionante, engajante, e com sensação continua de progresso.
- O jogo terá 9 rounds de inimigos e a cada 10 rounds 1 chefe, ad infinitum, até o jogador morrer
- Terá 20% de chance de aparecer inimigos elite por round
- O jogo terá mecânicas roguelite e de RPG (itens, status, raridade de itens, árvore de habilidades, etc)
- Armas principais:
    - Começa com espada (corpo a corpo)
    - Pode comprar depois no shop npc: pistola, submetralhadora, metralhadora, bazuca 

## 1. Deepsearch/deepthinking: Pesquisa web
    - Faça uma pesquisa extensiva na web em diferentes fontes: sites, blogs, documentações, livros, pdfs, videos, github, fóruns, reddit, etc
        - Verifique a disponibilidade do nome comercial 'Grim Cubes' para ver se ele não está sendo usado já em outro contexto, e se estiver sendo usado, sugerir nomes de jogos na fase brainstorming
        - Sobre diversas informações que possam ser úteis no desenvolvimento desse jogo
        - Skills, rules, workflows no uso dessas tecnologias/ferramentas
        - Game design e art bible dos jogos Brotato, Minecraft, Roblox e Hytale principalmente, além de outros que seguem o mesmo conceito artístico e game design
    - Crie a documentação na pasta na raiz do projeto -> docs/web-search.md
    
## 2. Brainstorming
    - Feito a pesquisa na web -> use a skill grill-me para me fazer diversas perguntas sobre esse projeto, tirar dúvidas, implementações técnicas, game design, mecânicas de jogo, art bible, etc.
    - Documente o brainstorming em -> docs/brainstorming.md

## 3. GDD (game design document) e Art bible
    - Feito o brainstorming -> crie as documentações completas do gdd em docs/gdd.md e art bible em docs/art-bible.md do jogo

## 4. SDD e ADRs
    - Feito o GDD e o Art bible do jogo -> crie as documentações completas do spec driven development em docs/sdd/*.md e adrs em docs/adrs/*.md
        - Crie a quantidade de arquivos markdown que você julgar necessário para deixar bem documentado

## 5. Criação do ROADMAP.md
    - Feito os SDDs e os ADRs -> crie o ROADMAP.md na raiz do projeto, que será o arquivo mais importante do projeto
        - Nele terá todas as 5 fases desse jogo: 
            - 1. ESTRUTURA
            - 2. PROTÓTIPO
            - 3. ALPHA
            - 4. BETA
            - 5. 1.0 RC
        - O arquivo terá seções de tarefas, com subtarefas e microtarefas com asserts de qualidade e entrega rigorosos, auditáveis e confiáveis

## 6. Criação do prompt 'prompt-workers.md'
    - Feito todas os passos anteriores -> crie o prompt completo na raiz para os agentes começarem a implementação e criação desse projeto
    - Os workers devem ser dividos da seguinte maneira:
        - Orquestrador principal da seção -> claude opus 5.5 
            - Subagentes ficam em standby, sem nunca serem finalizados, e nunca devem ficar ociosos, sem nada para fazer:
                - Estagiário -> claude sonnet 5.5 -> faz tarefas simples, i8n, pesquisa na web, testa, simula e faz balanceamento e cria os reports, etc
                - Sênior 1 -> claude sonnet 5.5 -> faz as implementações técnicas gerais do jogo em paralelo ao 2
                - Sênior 2 -> claude sonnet 5.5 -> faz as implementações técnicas gerais do jogo em paralelo ao 1
                - Especialista -> claude opus 5.5 -> revisa, audita e corrije os problemas encontrados vindo do trabalho do estagiário e dos sêniors antes de passar para o orquestrador finalizar






