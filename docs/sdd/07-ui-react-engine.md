# SDD 07 — UI React ↔ engine

Decisões: D21 (store próprio + `useSyncExternalStore`), D31 (4 alvos de tela), D33 (design system no Art Bible §16).

## 1. Montagem

```html
<div id="app">
	<canvas id="game" tabindex="0"></canvas>   <!-- Babylon; ocupa 100% -->
	<div id="ui"></div>                        <!-- React root; position: absolute; pointer-events: none -->
</div>
```

- A UI tem `pointer-events: none` por padrão; só painéis interativos ligam `pointer-events: auto`. Assim o canvas recebe cliques durante o jogo.
- Um único React root (`createRoot`) com `<App />`. No PROTÓTIPO, `apps/web/index.html` tem `canvas#game` e `div#ui` direto no `body` (sem `#app`), e o `App` decide o que mostrar pelos campos do snapshot (`cards` não vazio → `LevelUp`, `shop` não nulo → `Shop`, `results` não nulo → `Results`), não por `screen`. Isso é provisório até as telas de título, menu e pausa (A-07).

## 2. Store

`packages/core/src/store.ts`:

```ts
export interface Store<T> {
	get(): T;                                        // snapshot imutável
	subscribe(listener: (state: T) => void): () => void;
	publish(next: T): void;                          // só o game loop chama
}
```

- Snapshot atual (`HudState` em `packages/ui/src/App.tsx`, publicado pelo hook `publish` do loop a 12 Hz, `HUD_HZ` em `apps/web`, e só quando algum campo muda): `{ hp, maxHp, round, level, xp, xpNeeded, gold, cards, shop, stats, results }`. Os view models (`CardView`, `ShopViewModel`, `StatLineView`, `ResultsViewModel`) são montados em `apps/web` a partir do estado do jogo. O `GameSnapshot` completo abaixo é o alvo; os campos que faltam (screen, timer, souls, weapon, items, elite, boss, demo) entram com as telas que os usam.
- `GameSnapshot` alvo (publicado a 12 Hz, ou imediatamente em mudança de `screen`): `{ screen, round, timer, hp, maxHp, xp, xpToLevel, level, gold, souls, weapon: { id, tier }, items: Array<{ id, count }>, stats: PlayerStats, elite: { active, modifier, offscreenAngle } | null, boss: { name, hp, maxHp, phase, enrage } | null, shop: ShopState | null, cards: Card[] | null, results: RunResults | null, demo: { isDemo, blocked } }`.
- `MetaSnapshot` (publicado em mudanças): almas, Ossuário, recordes, opções.
- Hook: `useGame(selector)` = `useSyncExternalStore(store.subscribe, () => selector(store.get()))` com `selector` estável e igualdade por referência de campos; snapshots são construídos com reuso de sub-objetos não alterados para evitar re-render em cascata. Hoje o `App` usa `useSyncExternalStore(store.subscribe, store.get)` direto, sem seletor; isso é provisório até haver telas pesadas (Ossuário). O `cards` reaproveita o array enquanto a oferta não muda.
- Comandos da UI para o jogo, alvo: `commands.*` (funções puras que enfileiram em `CommandQueue`, consumida no próximo passo): `chooseCard(i)`, `buy(slot)`, `upgradeWeapon()`, `reroll()`, `toggleLock(slot)`, `closeShop()`, `pause()`, `resume()`, `abandonRun()`, `buyNode(id)`, `setOption(k, v)`. Hoje são callbacks em props do `App` (`onChooseCard`, `shopActions` com compra/reroll/lock/fechar, `onRestart`) que chamam os sistemas direto. Isso é seguro porque a run está pausada (`Paused`/`Shop`/`Results`) e nenhum passo roda junto, mas é provisório até haver replay (a fila garante a ordem determinística).

## 3. Telas

Mapa `screen → componente` (GDD §21.1; hoje a tela de título e o menu principal são um só componente, `Menu`): `Title`, `MainMenu`, `Difficulty`, `Hud` (sempre montado durante a run), `LevelUp`, `Shop`, `BossIntro` (só banner), `Results`, `Ossuary`, `Options`, `DemoEnd`, `Pause`. Cada tela é um componente em `packages/ui/src/screens/`.

Hoje existem, em `packages/ui/src/components/<Nome>/<Nome>.tsx`: `Menu` (título, Jogar, Ossuário, Opções e recordes por dificuldade; aparece numa carga limpa da página, e links com `seed`, `difficulty`, `tutorial`, `debug`, `bench`, `tips` ou `preset` entram direto no jogo), `Difficulty`, `Options` (preset de vídeo com automático, volumes, tremor, velocidade 1x–3x, telemetria opt-in e idioma, gravados em `meta.settings`), `LevelUp`, `Shop`, `Results` (com contagem animada das almas), `Ossuary` e `DemoEnd` (fim do build `web-demo` depois do Coveiro; selo "DEMO" no HUD), além do HUD inline no `App`. O `App` também tem, no canto superior direito, o botão de velocidade (1x/2x/3x, que a tecla TAB também alterna) ao lado de "Opções". Enquanto o menu está aberto, `simulate` não roda. O texto vem do catálogo de locales (`t()`).

Regras de implementação (React 19, sem dependência extra):

- Nenhum `useEffect` para sincronizar estado do jogo; tudo vem do store.
- Nenhum `setState` por frame. Números de dano, barras do chefe e timers que mudam todo frame são desenhados pela engine (texto em sprites) ou lidos do snapshot a 12 Hz; a barra de HP é CSS com `transition` de 100 ms.
- Listas (itens, nós) com `key` estável por id.
- Componentes do design system (Art Bible §16.5) em `packages/ui/src/components/`.
- Tailwind v4 com `@theme` em `packages/ui/src/theme.css` (tokens do Art Bible §16.9); nenhuma cor literal em TSX (regra de lint por regex no CI: `#[0-9a-f]{6}` proibido em `packages/ui/**/*.tsx`).

## 4. Input

- Teclado/mouse: listeners no `canvas` (foco) e no `window` para pausa; mapa remapeável em `Options.controls`; `InputState` (bitmask de direções + dash + pause) publicado para `game` a cada frame.
- Gamepad: `navigator.getGamepads()` lido por frame (polling); dead zone 0,2; navegação de UI por foco explícito (lista de focáveis por tela, D-pad/stick move o foco, A confirma, B volta).
- Touch (Android): `VirtualJoystick` (componente React com `pointer-events: auto`) escreve direto em `InputState` (sem passar por React state); botões dash/pausa idem. Multi-touch: joystick à esquerda, botões à direita; `touch-action: none` no root.
- Mobile landscape: `ScreenOrientation.lock("landscape")` via Capacitor (pode falhar em Android 16+ telas grandes: fallback é overlay "gire o dispositivo").

## 5. Layout responsivo (D31)

Breakpoints e regras do Art Bible §16.4 e §17. Implementação:

- `useViewport()` retorna `{ w, h, scale, target: "mobile-s" | "mobile-l" | "desktop" | "desktop-xl" }` a partir de `matchMedia`; `scale` aplica `--ui-scale` (1 / 1,25 / 1,5 conforme opção e auto em `desktop-xl`).
- Safe area: `padding: env(safe-area-inset-*)` no `#ui` (Capacitor expõe via `viewport-fit=cover`).
- HUD é um grid CSS 3×3 com áreas nomeadas (`tl tc tr / . . . / bl bc br`); mobile troca `br` por botões e `bl` por área do joystick.
- `useViewport`, `--ui-scale` automático e grid 3×3 do HUD: provisórios até A-07 (hoje o HUD é um bloco no canto superior esquerdo, e o `Button` usa `pointer-coarse:min-h-12` para o alvo de toque de 48 px).
- Testes visuais: os specs ficam em `tests/e2e/*.spec.ts` (boot, levelup, shop, results, fade, world, art-review) e gravam baselines em `tests/visual/__screenshots__/` nos 4 projetos do `playwright.config.ts`. A tolerância é definida no config (hoje `maxDiffPixelRatio` 0,02; a redução para `maxDiffPixels` + máscara do canvas está com o Est).

## 6. Acessibilidade

Navegação (A-07-02): toda tela modal usa `useDialogNav` (`packages/ui/src/nav/`). O foco vai ao primeiro controle (ou ao marcado com `data-autofocus`) e volta ao anterior ao fechar; Tab fica dentro da tela; setas movem o foco (menos em slider, select e campo de texto, que mantêm as suas); Esc cancela nas telas que podem ser dispensadas (dificuldade, Options, Ossuário). No gamepad, A clica no controle focado, B cancela e o D-pad ou o analógico esquerdo movem o foco, com repetição ao segurar (`createPadNav`). Só a tela do topo escuta, e `:focus-visible` desenha o contorno âmbar em todo controle. Loja, level-up, resultados, menu e `DemoEnd` não têm cancelamento. Acessibilidade visual na seção "Acessibilidade" da Options (todas em `meta.settings`, aplicadas no boot e ao vivo): brilho e contraste (sliders, `createVision` do render), modo daltônico (off, protanopia, deuteranopia, tritanopia), redução de flashes (também corta hit-stop e tremor), escala da UI (90, 100, 125 ou 150%, pela variável CSS `--ui-scale` e `zoom` na raiz do HUD) e gore completo ou reduzido (`vfx.setGore`). Controles remapeáveis na Options (`settings.keys`): mover (4 direções), dash, pausa, reroll e velocidade. Cada ação tem uma tecla própria e, no movimento, no dash e na pausa, teclas fixas extras (setas, Shift e P) que nenhuma outra ação pode tomar; Enter, as teclas 1-9 e F11 são reservadas, Tab só vale para a velocidade e Esc só para a pausa. No controle, o dash e a pausa também se remapeiam (`settings.pad`; o RB continua dando dash; o D-pad não pode ser usado), no mesmo padrão: a linha espera o próximo botão apertado, ignorando o que já estava segurado, e Esc cancela. O botão da ação espera a próxima tecla (Esc cancela) e a tela explica o conflito (`checkKey`, em `@gc/core`). Mercador (A-05-01): ao fim do round o estado `MerchantWait` põe o Mercador numa posição fixa a 6 u do herói, no lado oposto à média dos inimigos (ou à frente do herói, se não havia), com o evento `MerchantArrived`; o herói anda livre, sem inimigos. A loja abre ao chegar a 1,8 u, ao apertar Enter (ou tocar no aviso) a menos de 4 u, ou sozinha depois de 20 s. O HUD mostra uma seta para ele e o aviso "Fale com o Mercador [Enter]"; a primeira dica da run manda andar até ele. O estado público é `session.merchant.view` (`x`, `z`, `state`: arriving, waiting, leaving). O simulador e a tela `DemoEnd` usam `autoShop` (a loja abre direto, sem passos nem sorteio gastos). Valores em `data/rounds.json` (`flow.merchantWaitSeconds` e `merchant`).

Legendas das falas dos chefes (B-05-01): chaves `voice.<chefe>.<momento>` (entry, phase, death) nos dois locales, com o texto do `prompts.json`; quando uma fala toca (evento de chefe ou a entrada do `BossIntro`) a legenda aparece embaixo, como `role="status"` educado, por 4 s, mesmo se o arquivo de áudio faltar. A opção "Legendas das falas dos chefes" fica na Options, ligada por padrão (`settings.subtitles`). Em modo daltônico a raiz do HUD ganha `data-theme="cb"`: a paleta segura dos tokens `--color-cb-*` e uma forma por raridade (● ◆ ▲ ★) na loja. A escala da UI vale para a raiz do HUD, e os diálogos são filhos dela, então escalam junto (rolam quando o conteúdo passa da tela). `packages/ui/src/a11y.test.tsx` roda o axe-core nas telas principais (sem as regras de contraste e de região, que dependem de layout) e exige zero violações `serious` ou `critical`.

Art Bible §16.8: foco visível, `aria-label` em ícones, `aria-live` só para eventos raros, contraste; `prefers-reduced-motion` respeitado via tokens de motion.

## 7. Testes

- Unit (Vitest + Testing Library): cada componente do design system renderiza estados; `useGame` não re-renderiza quando o seletor devolve o mesmo valor; comandos enfileiram.
- Integration: `Shop` com `ShopState` fixture executa compra, reroll, lock e dispara comandos corretos.
- Visual: capturas nos 4 alvos.
- E2E (Playwright): fluxo Título → Menu → Jogar → morrer (via cheat de debug) → Resultados → Ossuário comprar nó → Menu. Hoje cobre boot, level-up, loja, resultados (almas e recorde persistem no reload) e fade, num build com `GC_DEBUG_API=1`; Título, Menu e Ossuário são provisórios até A-04/A-07.
