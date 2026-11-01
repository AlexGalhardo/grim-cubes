# SDD 10 — Build e ports

Decisões: D19 (Electron + electron-builder), D28 (web = demo), D29 (Android 1.1), D27 (Play: grátis + IAP). Versões em `docs/web-search.md` §5.1 e §7.

## 1. Web (Vite 8)

- `apps/web/vite.config.ts`: `root` = `apps/web`; plugins `@vitejs/plugin-react` e `@tailwindcss/vite`; `publicDir: "../../public"` (o `public/assets` gerado pelo `assets:build` é servido em `/assets` e copiado para o `dist`); `assetsInclude: ["**/*.glb", "**/*.ktx2"]`; `build.outDir: "../../dist"`; `build.rolldownOptions.output.manualChunks` separando `babylon` e `react` (o chunk `game` e `build.target: "es2022"` ainda não estão no config; hoje vale o target padrão do Vite 8); `server.port` 5173 com `strictPort`; `define` com `__APP_VERSION__` (do `package.json`), `__BUILD_TARGET__` (`"web" | "electron" | "android"`, `"web"` em `dev`), `__IS_DEMO__` e `__DEBUG_API__` (verdadeiro só com `GC_DEBUG_API=1`; o build de e2e e o de bench ligam, o de release não).
- Modos: `vite build --mode web-demo` (define `__IS_DEMO__ = true`), `--mode electron`, `--mode android`. Flags de demo vêm do build, não de runtime (ADR-0012). Só o `web-demo` é usado hoje; `electron` e `android` são provisórios até P-07-02 e M-01-02.
- Assets grandes em `public/assets` com hash no nome (gerado pelo pipeline, não versionado), servidos com `Cache-Control: public, max-age=31536000, immutable`.
- `vercel.json`: `installCommand` `bun install --frozen-lockfile`, `buildCommand` `bun run build`, `outputDirectory` `dist`, `rewrites` SPA para tudo que não é `/assets/` (`/((?!assets/).*)` → `/index.html`) e `headers` de cache para `/assets/*`; sem COOP/COEP (não há SharedArrayBuffer).
- Vercel: projeto `grim-cubes-demo`, deploy de preview por PR e produção em `main` pela integração GitHub da Vercel (sem workflow de deploy próprio); o `deploy-web.yml` só roda o smoke depois do deploy de produção (SDD 12). Plano Hobby enquanto for só demo não comercial `[confirmar fair use antes da página Steam]`; Pro se a Vercel considerar promoção de produto pago como uso comercial.

## 2. Electron (Steam, Windows 11)

Implementado em P-07-02 sem Steam (não há App ID; o `steamworks.js` e o preload de achievements descritos abaixo continuam futuros). Electron 45.2.1 e electron-builder 26.18.0, versões exatas em `devDependencies`.

- `apps/electron/src/main.ts`: `BrowserWindow` em tela cheia (F11 ou Alt+Enter alternam), `webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }`, `app.enableSandbox()`, menu removido, DevTools só fora do build empacotado, instância única, permissões do navegador sempre negadas. O jogo carrega por um esquema próprio, `app://game/`, registrado como privilegiado (`standard`, `secure`, `supportFetchAPI`, `stream`): o build usa URLs absolutas (`/assets/...`), que `file://` não serve. `protocol.handle` mapeia o caminho para `dist/` (`paths.ts` recusa `..` e `%2e%2e`) e acrescenta a mesma CSP do `vercel.json` e `nosniff` a cada resposta. `will-navigate` bloqueia tudo que não seja `app://game/` e `setWindowOpenHandler` nega toda janela nova.
- `apps/electron/src/preload.ts`: expõe só `window.gcDesktop = { platform, steam: false }` por `contextBridge`.
- O main e o preload são empacotados por `bun build --target=node --format=cjs --external=electron` em `apps/electron/dist/` (sem `tsc` de emissão; o typecheck do projeto `apps/electron` continua em `bun check -b`). O `main` do `package.json` aponta para `apps/electron/dist/main.cjs`.
- `electron-builder.yml`: `appId: com.alexgalhardo.grimcubes`, alvos `nsis` (não one-click, escolhe a pasta) e `portable` em x64, `asar: true`, `files` só `dist/**`, `apps/electron/dist/**` e `package.json` (sem `node_modules`: o Vite já embute as bibliotecas), `publish: null`. Nomes: `GrimCubes-Setup-<versão>.exe` e `GrimCubes-<versão>-portable.exe`, em `release/` (no `.gitignore`).
- Sem assinatura: `CSC_IDENTITY_AUTO_DISCOVERY=false`. O certificado é do PO (B-04-01); até lá o SmartScreen avisa na primeira execução. O ícone do executável é o padrão do Electron até existir um `.ico`.
- Fuses (`electronFuses` no `electron-builder.yml`): `runAsNode`, `enableNodeOptionsEnvironmentVariable` e `enableNodeCliInspectArguments` desligados; `enableEmbeddedAsarIntegrityValidation` e `onlyLoadAppFromAsar` ligados. Conferido no executável empacotado: abre normalmente, `ELECTRON_RUN_AS_NODE` não executa JS e `--inspect` não abre o depurador. O main também nega `setPermissionCheckHandler` e bloqueia `will-redirect` fora de `app://game/`, e `paths.ts` recusa escapes de URL malformados.
- Ícone: o Art desenha `assets/src/icons/app/app_{16,32,48,256}.png`; `tools/build-electron` empacota os quatro em `build/icon.ico` (`ico.ts`, PNG embutido, sem dependência; o `build/` está no `.gitignore`) e o electron-builder o usa. O `app_256.png` é o favicon (`public/favicon.png`, referenciado em `apps/web/index.html`). A pasta `app` fica fora do atlas de ícones de UI (`assets:build`).
- Alvo `dir` (`win-unpacked`): o `electron-builder.yml` gera também a pasta `release/win-unpacked/`, que é o que o `steam-upload` enviará; o `release.yml` não a anexa ao GitHub Release.
- Save em arquivo (ADR-0009): o envelope do save fica em `<userData>/saves/<chave>.json` (chaves de `STORAGE_KEYS`, como `save` e `save.bak`). O preload expõe `window.gcDesktop.storage` (`read`, `write`, `backup`) por IPC (`storage:read|write|backup`); o main só aceita a chamada de `app://game/`, valida a chave contra `STORAGE_KEYS` (o nome do arquivo nunca vem da página), limita o valor a `MAX_VALUE_BYTES` e escreve em `<arquivo>.tmp` com `rename` por cima (atômico), em fila por arquivo. `backup("save")` copia para `save.bak` do mesmo jeito. Na primeira execução com arquivos, `migrateStorage` copia para a pasta o que o IndexedDB da mesma origem já tinha (só as chaves que ainda não existem como arquivo). A web continua no IndexedDB.
- Release: o job `desktop` do `release.yml` (windows-latest, depois do job `release`, que só roda com o CI verde) executa `bun run build:electron` na tag `v*` e anexa os dois `.exe` com `gh release upload --clobber`, e acrescenta o SHA-256 dos dois ao `checksums.txt` do release.
- Flags de GPU: nenhum por padrão (ver a nota do overlay Steam abaixo).

- Overlay Steam (futuro): `--in-process-gpu` e `--disable-direct-composition` só se o overlay Steam exigir (teste no PROTÓTIPO; ADR-0008). Se instável: overlay desligado e documentado.
- `steamworks.js` 0.4.0 no main: `init(appId)`, `electronEnableSteamOverlay()`, achievements (`achievement.activate`), `cloud` não usado (Auto-Cloud). Preload expõe `window.gc.steam = { unlockAchievement(id), isDemo(), getLanguage() }` via `contextBridge`.
- Achievements 1.0 (10): primeira morte; round 10; matar o Coveiro; round 20; round 30; 1.000 kills; 10.000 kills; comprar 1 ramo inteiro do Ossuário; matar uma elite Explosiva sem tomar dano; vencer em Grim.
- Com o Steam (futuro): `extraResources` do `electron-builder.yml` levam o `steam_api64.dll`.
- Assinatura: `win.sign` com certificado OV (arquivo `.pfx` em secret do CI) quando existir; sem certificado, build não assinado (SmartScreen aceito na fase BETA; ADR-0008).
- Build: `bun run build:electron` (`tools/build-electron`) = `data:check` + `assets:build` + `vite build --mode electron` + `bun build` do main e do preload + `electron-builder --win nsis portable --x64`. Saída em `release/`.
- Steam: dois App IDs (jogo e demo); depots `windows`; upload via `steamcmd` em workflow manual (`steam-deploy`), com `STEAM_BUILD_ACCOUNT` e `STEAM_CONFIG_VDF` em secrets. Branch `beta` para testers, `default` para release.

## 3. Android (Capacitor 8) — versão 1.1

O scaffold de medição (B-04-04) existe: `apps/android` com Capacitor 8.6.0 e `bun run build:android`, que gera um APK de debug (`release/grim-cubes_<versão>_android.apk`) para sideload. Os plugins, o AAB assinado e o billing continuam provisórios até M-01-02 e M-01-03.

- `apps/android/capacitor.config.ts`: `appId: com.alexgalhardo.grimcubes`, `webDir: ../../dist` (o Vite gera o `dist` na raiz), `android: { allowMixedContent: false, backgroundColor: "#14121C" }`, `server: undefined` (assets locais).
- Plugins: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/screen-orientation` (lock landscape), `@capacitor/filesystem` (save), `@capacitor/status-bar` (immersive). Billing: `@capacitor-community/in-app-purchases` ou `@revenuecat/purchases-capacitor` `[decidir em ADR na fase BETA, após checar manutenção]`.
- `AndroidManifest.xml`: `android:screenOrientation="sensorLandscape"`, `configChanges` com `density|orientation|screenSize|keyboardHidden`, `hardwareAccelerated="true"`.
- Gradle: AGP 8.13.0, Gradle 8.14.3, Kotlin 2.2.20, `minSdk 24`, `compileSdk 36`, `targetSdk 36`; AAB assinado com keystore em secret.
- Render: `hardwareScalingLevel` dinâmico (`SceneOptimizer`) começando em 1 / 1,5 do DPR para manter render interno ≈ 1344 × 621 (GDD §29); KTX2 ETC1S; blob shadows; cap de inimigos 60.
- Play Billing: produto único `full_version` (one-time, US$ 9,99); `queryPurchases` no boot; `flags.fullVersion = true`; restauração automática.
- Publicação: conta pessoal exige closed test de 12 testers por 14 dias antes da produção (`docs/web-search.md` §7.2); IARC preenchido como M/18 por gore.

## 4. Scripts (`package.json`)

| Script | Comando |
| --- | --- |
| `dev` | `vite --config apps/web/vite.config.ts` |
| `build` | `bun run data:check && bun run assets:build && vite build --config apps/web/vite.config.ts --mode web-demo` |
| `build:electron` | `bun tools/build-electron/index.ts` (a cadeia do §2) |
| `build:android` | `bun tools/build-android/index.ts`: `data:check`, `assets:build`, `vite build --mode android`, `cap sync`, `gradlew assembleDebug`. O `bundleRelease` assinado fica para a M-01-02 |
| `typecheck` | `bun check -b` |
| `lint` | `biome ci .` |
| `lint:md` | `markdownlint-cli2 "**/*.md"` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `test:smoke` | `bun tools/smoke/run.ts` (Playwright) |
| `test:perf` | `playwright test --config tools/perf/playwright.config.ts` (bench do SDD 14 §4; exige build com `GC_DEBUG_API=1`) |
| `sim` | `bun tools/sim/index.ts` |
| `assets:gen` | `bun tools/assets-gen/index.ts` (gera os `.bbmodel` e `_d.png` placeholder) |
| `assets:build` | `bun tools/assets-build/index.ts` |
| `audio:generate` | `bun tools/audio-generate/index.ts` |
| `data:check` | `bun tools/data-check/index.ts` |
| `release` | `bun tools/release/index.ts` (SDD 13) |

Bun é o gerenciador e runner; Vite/Vitest/Playwright rodam sob Node (shebang) por compatibilidade (ADR-0003).
