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
- Um único React root (`createRoot`) com `<App />` que renderiza a tela conforme `snapshot.screen`.

## 2. Store

`packages/core/src/store.ts`:

```ts
export interface Store<T> {
	get(): T;                               // snapshot imutável
	subscribe(cb: () => void): () => void;  // estável
	publish(next: T): void;                 // só o game loop chama
}
```

- `GameSnapshot` (publicado a 12 Hz, ou imediatamente em mudança de `screen`): `{ screen, round, timer, hp, maxHp, xp, xpToLevel, level, gold, souls, weapon: { id, tier }, items: Array<{ id, count }>, stats: PlayerStats, elite: { active, modifier, offscreenAngle } | null, boss: { name, hp, maxHp, phase, enrage } | null, shop: ShopState | null, cards: Card[] | null, results: RunResults | null, demo: { isDemo, blocked } }`.
- `MetaSnapshot` (publicado em mudanças): almas, Ossuário, recordes, opções.
- Hook: `useGame(selector)` = `useSyncExternalStore(store.subscribe, () => selector(store.get()))` com `selector` estável e igualdade por referência de campos; snapshots são construídos com reuso de sub-objetos não alterados para evitar re-render em cascata.
- Comandos da UI para o jogo: `commands.*` (funções puras que enfileiram em `CommandQueue`, consumida no próximo passo): `chooseCard(i)`, `buy(slot)`, `upgradeWeapon()`, `reroll()`, `toggleLock(slot)`, `closeShop()`, `pause()`, `resume()`, `abandonRun()`, `buyNode(id)`, `setOption(k, v)`.

## 3. Telas

Mapa `screen → componente` (GDD §21.1): `Title`, `MainMenu`, `Difficulty`, `Hud` (sempre montado durante a run), `LevelUp`, `Shop`, `BossIntro` (só banner), `Results`, `Ossuary`, `Options`, `DemoEnd`, `Pause`. Cada tela é um componente em `packages/ui/src/screens/`.

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
- Testes visuais: Playwright captura cada tela nos 4 viewports (`tests/visual/*.spec.ts`) e compara com baseline (`toHaveScreenshot`, `maxDiffPixelRatio: 0.01`).

## 6. Acessibilidade

Art Bible §16.8: foco visível, `aria-label` em ícones, `aria-live` só para eventos raros, contraste; `prefers-reduced-motion` respeitado via tokens de motion.

## 7. Testes

- Unit (Vitest + Testing Library): cada componente do design system renderiza estados; `useGame` não re-renderiza quando o seletor devolve o mesmo valor; comandos enfileiram.
- Integration: `Shop` com `ShopState` fixture executa compra, reroll, lock e dispara comandos corretos.
- Visual: capturas nos 4 alvos.
- E2E (Playwright): fluxo Título → Menu → Jogar → morrer (via cheat de debug) → Resultados → Ossuário comprar nó → Menu.
