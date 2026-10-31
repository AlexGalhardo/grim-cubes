# Blockbench + MCP

Como o Claude Code conversa com o Blockbench instalado na máquina do PO para refinar os modelos do jogo (herói, armas,
inimigos, chefes, NPC, props e tiles), e qual é o fluxo de trabalho do agente de arte.

## 1. Peças

| Peça | Versão | Onde |
| --- | --- | --- |
| Blockbench (desktop) | 5.2.2 | `C:\Program Files\Blockbench\Blockbench.exe` |
| Plugin [Blockbench MCP](https://jasonjgardner.github.io/blockbench-mcp-plugin/) | 1.10.1 (estável; exige Blockbench ≥ 5.0.0) | release do GitHub, ver §2 |
| Servidor MCP | HTTP streamable em `http://localhost:3000/bb-mcp` | aberto pelo plugin, só com o Blockbench rodando |
| Configuração do Claude Code | `.mcp.json` na raiz (escopo de projeto, servidor `blockbench`) | versionado |

O plugin escuta só em loopback (`localhost`, padrão das configurações dele), sem exposição na rede. Porta e endpoint
ficam em **Settings > General > MCP Server Port / MCP Server Endpoint** do Blockbench; se forem trocados, atualize o
`.mcp.json`.

## 2. Instalação (uma vez, pelo PO)

1. Baixe o plugin fixado na versão estável, nunca o canal `nightly`:
   `https://github.com/jasonjgardner/blockbench-mcp-plugin/releases/download/v1.10.1/mcp.js`
   (SHA-256 conferido em 2026-10-31: `caf94540e50257eaeb5aa51ab4b34b56aa6ac258a0f8c0bee2025c2cf18d5db9`).
2. No Blockbench: **File > Plugins > Load Plugin from File** e escolha o `mcp.js` baixado. Carregar de arquivo
   fixa a versão; "Load Plugin from URL" apontando para o site atualiza sozinho e foge da regra de versões exatas.
3. Reinicie o Blockbench. A barra de status mostra o servidor MCP ativo; confira com
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/bb-mcp` (qualquer resposta HTTP, não `000`).
4. Abra o Claude Code na raiz do projeto: ele detecta o `.mcp.json` e pede para aprovar o servidor `blockbench`
   (uma vez). Equivalente manual: `claude mcp add blockbench --transport http http://localhost:3000/bb-mcp --scope project`.
5. `/mcp` no Claude Code deve listar `blockbench` como conectado. As ferramentas aparecem como
   `mcp__blockbench__*` e só existem enquanto o Blockbench estiver aberto.

Atualizar o plugin: troque a versão e o SHA-256 acima no mesmo commit, depois de ler o changelog da release.

## 3. Ferramentas usadas

O plugin expõe cerca de 100 ferramentas (referência completa no site). As do fluxo do jogo:

| Grupo | Ferramentas | Uso |
| --- | --- | --- |
| Projeto | recurso `blockbench://project/{id}.bbmodel`, `list_views` | ler o `.bbmodel` vivo (com edições não salvas e textura embutida) |
| Cubos e grupos | `place_cube`, ferramentas de edição de cubo e de grupo, `update_armature` | silhueta e detalhe por geometria |
| Textura | `activate_texture`, `paint_with_brush`, `draw_shape_tool`, `gradient_tool` | pintura pixel a pixel na paleta |
| Animação | ferramentas de animação e keyframes | clipes do Art Bible §8 |
| Captura | `create_offscreen_view`, `capture_screenshot`, `capture_app_screenshot` | conferir silhueta e leitura sem mexer na viewport do PO |
| Histórico | `undo`, `redo` | toda edição é reversível no Blockbench |

Ferramentas marcadas como `experimental` no site só com motivo registrado no HANDOFF.

## 4. Fonte da verdade e o gerador

- Os `.bbmodel` versionados em `assets/src/models/<categoria>/<nome>.bbmodel` (mais `<nome>_d.png`) são a fonte (D5).
  O `bun run assets:build` converte para glTF, atlas e VAT; não existe export manual de glTF.
- `bun run assets:gen` (`tools/assets-gen`) gera os placeholders por script. Um modelo refinado no Blockbench entra em
  `assets/src/models/authored.json` (`"models": ["hero/hero", ...]`) e o gerador nunca mais o sobrescreve; os demais
  continuam regeneráveis. O teste `never overwrites a model listed in authored.json` cobre a regra.
- Quem refina primeiro gera o placeholder atual (`bun run assets:gen`), abre no Blockbench, refina, grava por cima e
  registra o nome em `authored.json` no mesmo commit.

## 5. Restrições que o build valida (não negociáveis)

Do Art Bible §5, §6, §7, §8 e §14 e do `tools/assets-build`:

- Formato **Generic Model**; só cubos e quads; rotações em múltiplos de 22,5° (45° só em cabos e cabelos).
- Uma textura por modelo, chamada `<nome>_d.png`, lado múltiplo de 32 px; ≤ 12 cores, nenhuma `#FFFFFF`/`#000000`,
  cores só dos tokens da paleta (`tools/assets-gen/palette.ts`, espelho de `packages/ui/src/theme.css`).
- Escala de `PIXELS_PER_UNIT` por categoria (`tools/assets-build/bbmodel.ts`); alturas e larguras da tabela §5.1 (testadas).
- Hierarquia `root > body > head|arm_l|arm_r|weapon_socket`, `root > leg_l|leg_r`; `weapon_socket` no herói e no
  Mercador, `hit_socket` nos inimigos e chefes.
- Orçamento de elementos por classe (§5.1/§5.4); props com no máximo 48 cubos.
- Clipes obrigatórios de §8 por categoria (`REQUIRED_CLIPS` em `tools/assets-build/rules.ts`), nomes exatos: herói `idle`, `run`, `attack_melee`, `attack_ranged`, `hit`, `dash`, `death`, `victory`; inimigos `idle`, `walk`, `attack`, `hit`, `death` (o VAT é assado deles); chefes `idle`, `walk`, `enrage`, `phase_change`, `death_execution`; NPC `emerge`, `idle`, `talk`, `hand_over`, `submerge`.
- Origem no centro da base (y = 0), frente em +Z.

## 6. Fluxo de trabalho do agente de arte (Art)

Papel em `prompt-workers.md` §2; definição em `.claude/agents/blockbench-artist.md`; passo a passo na skill
`.claude/skills/blockbench-art/SKILL.md`.

1. **Pré-checagem**: `/mcp` mostra `blockbench` conectado. Sem conexão, o agente não edita `.bbmodel` à mão como
   substituto: avisa o Orq e trabalha na fila sem Blockbench (§7).
2. **Escolha** do próximo asset do backlog `docs/art/blockbench-backlog.md` (ordem: herói, armas, inimigos 1–8,
   chefes, Mercador, props, tiles).
3. **Abrir** o `.bbmodel` atual no Blockbench; capturar "antes" com `capture_screenshot` (offscreen, câmera frontal e
   3/4) em `docs/art/review/<nome>/before-*.png`.
4. **Refinar**: silhueta primeiro (validar em preto sólido a 64 px), depois textura, depois animação; manter grupos,
   sockets e clipes existentes (o jogo depende dos nomes).
5. **Gravar**: ler o recurso `blockbench://project/{id}.bbmodel`, salvar em `assets/src/models/<categoria>/<nome>.bbmodel`
   e a textura em `<nome>_d.png`; registrar em `authored.json`.
6. **Validar**:
   - `bun run assets:build` (orçamento, nomes, sockets, atlas, VAT);
   - `bunx vitest run tools/assets-gen tools/assets-build tools/bake-vat` (escala, oráculo do VAT por tipo);
   - `bun run data:check`;
   - captura in-game pela rota de revisão `?art=<id>` (build com `GC_DEBUG_API=1`) e "depois" em
     `docs/art/review/<nome>/after-*.png`.
7. **HANDOFF** ao Orq com o checklist do Art Bible §14 marcado, antes/depois e as baselines visuais afetadas (o Orq
   regenera as linux no CI com `update-snapshots`; o agente só gera win32 quando pedido).
8. O Esp revisa contra o Art Bible §14 antes do merge.

## 7. Sem Blockbench aberto

Trabalho útil sem a conexão: auditar os modelos atuais contra o Art Bible e escrever o backlog com o que melhorar em
cada um (silhueta, leitura a 64 px, paleta, animação), preparar referências em `docs/art/`, e propor ajustes no
gerador (`tools/assets-gen`) para os placeholders que ainda não foram refinados.

## 8. Segurança

- O servidor MCP só aceita conexões locais; não troque o endereço para `0.0.0.0`.
- O plugin roda dentro do Blockbench com acesso ao disco; só a versão fixada acima, conferida pelo SHA-256.
- O servidor headless `bbmodel` (via `npx github:...`) não é usado: puxaria código sem versão fixa.

## 9. Diagnóstico

Teste do servidor (no terminal, não no console do Blockbench); a resposta precisa trazer `serverInfo`:

```sh
curl -s -m 5 -X POST http://127.0.0.1:3000/bb-mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'
```

| Sintoma | Causa vista em 2026-10-31 | Correção |
| --- | --- | --- |
| Console mostra `[MCP] Server listening…`, a porta aceita a conexão, mas o `curl` volta 0 bytes e nada aparece no console | `mcp.js` carregado de outra build (não o asset da release fixada; o SHA-256 não bate) | Desinstalar o plugin e carregar o arquivo da release v1.10.1 conferido pelo SHA-256 da §2 |
| `curl` sem `-m` trava o terminal | O GET abre um stream SSE que não termina | Sempre usar `-m 5` e POST com `initialize` |
| "Unexpected number" no console do Blockbench | O `curl` foi colado no DevTools, que só aceita JavaScript | Rodar o `curl` no terminal |

## 10. Armadilhas do Blockbench 5.2.2

Achados de 2026-10-31 ao refinar herói, armas e Carcaça. O `.bbmodel` exportado pelo Blockbench não entra no `assets:build` sem estes cuidados.

1. **Chave do animador = uuid do grupo.** O `assets-build` casa cada animador com o grupo pela chave de `animations[].animators`. Ao carregar um modelo e criar keyframes, o Blockbench pode gravar o animador com um uuid aleatório; o clipe então fica sem alvo e o oráculo do VAT falha com `missing animation group <clipe>`. Antes de gravar, reescreva as chaves com o uuid do grupo de mesmo nome e remova animadores vazios (o `getBoneAnimator` cria um por grupo consultado).
2. **Sinal das rotações x e y.** Ao carregar um arquivo 4.10 (o formato dos modelos gerados por script), o Blockbench exibe as rotações de animação (eixos x e y) com o sinal invertido; um arquivo 5.0 (o que o próprio Blockbench grava) abre sem inverter. Na gravação, o plugin MCP escreve o valor exibido. Quem carrega, mexe e regrava arquivos 5.0 sem corrigir espelha as trilhas que não tocou, a cada ciclo. Regra segura: não confiar na exibição; guardar a tabela das trilhas com os valores do arquivo (convenção do brief: inclinação para a frente = positivo no corpo, negativo no braço), recriar todas as chaves e, ao gravar, negar x e y das chaves `rotation` (z e `position` não mudam). Depois comparar o arquivo com a tabela. O `tools/assets-gen/index.ts` gera as animações originais, que servem de referência.
3. **Trilha em todos os clipes.** O Babylon, no teste do oráculo, deixa a pose final de um clipe valendo no clipe seguinte quando este não anima o osso. Um osso com pose fora do repouso em um clipe (ex.: `arm_r` estendido na Carcaça) precisa ter trilha em todos os clipes do modelo, senão o erro do VAT passa de 1e-5.
4. **Formato 5.0.** O Blockbench 5.2.2 exporta `format_version` 5.0 (grupos fora do outliner). O `assets-build` lê o 5.0 direto; o herói ficou em 4.10 porque o teste `bbmodel5.test.ts` o usa como fixture.
5. **Carregar um `.bbmodel` do disco.** `Codecs.project.load(json, { path })` abre o modelo sem textura; a textura entra com `texture.fromPath('<nome>_d.png')`. Textura pintada no canvas do Blockbench é gravada com `canvas.toDataURL('image/png')` em `<nome>_d.png`.
6. **Validar antes de gravar no checkout.** Salve o modelo no repositório só quando estiver completo e validado, e registre-o em `authored.json` no mesmo passo.
