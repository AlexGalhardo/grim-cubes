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

Mapa `screen → componente` (GDD §21.1): `Title`, `MainMenu`, `Difficulty`, `Hud` (sempre montado durante a run), `LevelUp`, `Shop`, `BossIntro` (só banner), `Results`, `Ossuary`, `Options`, `DemoEnd`, `Pause`. Cada tela é um componente em `packages/ui/src/screens/`.

Hoje existem `LevelUp`, `Shop` e `Results` (com contagem animada das almas) e o HUD inline no `App` (barras de HP e XP, round, nível e ouro), todos em `packages/ui/src/components/<Nome>/<Nome>.tsx`, junto com `Panel`, `Button`, `Bar` e `VirtualJoystick`. As telas são `role="dialog"` e escutam teclado em `window` (`1`–`3` para cartas, atalhos da loja, Enter para recomeçar). A pasta `screens/` e as demais telas são provisórias até A-07/P-07-01. O texto fixo em português no TSX ("Round", "Lv") fica até a tarefa de locales (B-05-01).

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

Art Bible §16.8: foco visível, `aria-label` em ícones, `aria-live` só para eventos raros, contraste; `prefers-reduced-motion` respeitado via tokens de motion.

## 7. Testes

- Unit (Vitest + Testing Library): cada componente do design system renderiza estados; `useGame` não re-renderiza quando o seletor devolve o mesmo valor; comandos enfileiram.
- Integration: `Shop` com `ShopState` fixture executa compra, reroll, lock e dispara comandos corretos.
- Visual: capturas nos 4 alvos.
- E2E (Playwright): fluxo Título → Menu → Jogar → morrer (via cheat de debug) → Resultados → Ossuário comprar nó → Menu. Hoje cobre boot, level-up, loja, resultados (almas e recorde persistem no reload) e fade, num build com `GC_DEBUG_API=1`; Título, Menu e Ossuário são provisórios até A-04/A-07.
