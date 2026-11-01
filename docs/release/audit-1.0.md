# Auditoria de lançamento 1.0 (R-01-05)

Responsável: Esp. Base: a pré-auditoria de segurança de 2026-10-31 (`main` 086ca3e) e a revisão de 2026-10-31 (`main` 8f160fc) feitas para este documento. Cada item é `[x]` com o comando e o resultado, ou `[ ]` com o que falta. Os itens marcados **RC** só fecham na branch `release/1.0` (R-01-01), sobre a build candidata.

Assert da R-01-05: itens verificados com os comandos usados; `secrets-scan` em todos os arquivos rastreados; `bunx biome ci`; SBOM de `tools/sbom`; inventário de assets por licença; todo `.meta.json` de áudio com `plan` ≠ `free`; e2e sem violação de CSP no console (web e Electron); zero pendências P0.

## Resumo

| Área | Estado em 2026-10-31 | Pendências |
| --- | --- | --- |
| Segredos | limpo na árvore e no histórico | repetir na RC |
| Electron | sandbox, isolamento, navegação presa, fuses | repetir no `.exe` da RC; console sem violação de CSP |
| Web (Vercel) | CSP e headers corretos; debug fora do build | console sem violação de CSP na URL de produção; HSTS no domínio próprio |
| Save | validação completa (schema 12) | repetir na RC |
| Telemetria | sem PII, opt-in | serviço e armazenamento (decisão do PO) |
| Dependências | 3 vulnerabilidades só em ferramentas de dev | bump quando houver correção estável |
| Licenças | áudio 119/119 pago; imagens de IA registradas; SBOM sem licenças | licenças no SBOM; fontes |
| Art Bible §13 | sem IP de terceiros visto nos modelos; exceção para imagens 2D de IA registrada | revisar a key art contra a §13 na RC |

## 1. Segredos

- [x] `git ls-files` (só arquivos existentes) passado ao `bun tools/secrets-scan`: exit 0, nenhum achado, 1.969 arquivos (2026-10-31). O comando do assert, `git ls-files -z | xargs -0 bun tools/secrets-scan`, falha quando a árvore tem um arquivo rastreado apagado sem commit (`prompt-concept-arts.md` no dia): na RC, rodar sobre a árvore limpa da tag.
- [x] Histórico: padrões de chave ElevenLabs, GitHub, Slack, AWS, chave privada e atribuições a `api_key`/`secret`/`token`/`password` nas linhas adicionadas de `git log -p --all`, sem imprimir valores. Dois falsos positivos (variável vazia no `.env.example`; valor `sk-t...` de teste em `tools/audio-generate/index.test.ts`).
- [x] `.env` e `.env.*` no `.gitignore`; nenhum `.pfx`, `.pem` ou `config.vdf` rastreado.
- [x] Workflows: actions fixadas por SHA, sem `pull_request_target`, `permissions` declarado em cada workflow; secrets da Steam no ambiente `steam` com o PO como revisor.
- [ ] **RC** — Repetir as três verificações na tag `v1.0.0-rc.1`.

## 2. Electron

- [x] `app.enableSandbox()`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, DevTools só fora do pacote (`apps/electron/src/main.ts`).
- [x] `setWindowOpenHandler` nega tudo; `will-navigate` e `will-redirect` só aceitam `app://game/`; permissões pedidas e checadas sempre negadas.
- [x] Protocolo `app://` com `resolveAppPath` recusando travessia e escape malformado (`paths.test.ts`); CSP idêntica à do `vercel.json` (diff vazio).
- [x] Fuses no `electron-builder.yml`: `runAsNode`, `enableNodeOptionsEnvironmentVariable` e `enableNodeCliInspectArguments` desligados; `enableEmbeddedAsarIntegrityValidation` e `onlyLoadAppFromAsar` ligados (ADR-0021).
- [x] Save por IPC: só chaves de `STORAGE_KEYS` viram arquivo, só o remetente `app://game/` é aceito, escrita atômica com fila por arquivo, arquivo grande demais lido como ausente (`saveFiles.test.ts`).
- [ ] **RC** — No `.exe` da RC: `ELECTRON_RUN_AS_NODE=1` não executa JS, `--inspect` não abre depurador, e o console do jogo não mostra violação de CSP numa run curta.
- [ ] **RC** — Quando o `steamworks.js` entrar (A-06-01): revisar o preload novo (nada de Node na página).

## 3. Web (Vercel)

- [x] `vercel.json`: CSP com `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self' blob:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP; `immutable` só em `/assets/*` e `manifest.json` revalidado.
- [x] `bun run build` e busca por `gc.debug`, `toBossFrame` e `grantGold` em `dist/assets/*.js`: nada. A API de debug fica fora do build de release.
- [ ] **RC** — Console sem violação de CSP na URL de produção (depende do secret de bypass do PO para o smoke, ou de acesso público à demo).
- [ ] `Strict-Transport-Security` quando a demo ganhar domínio próprio (o `*.vercel.app` já envia HSTS).
- [x] Rollback documentado (ADR-0026).

## 4. Save

- [x] `packages/core/src/save.ts` (schema 12): limite de 64 KB, chaves `__proto__`, `constructor` e `prototype` recusadas, listas de no máximo 256, contadores inteiros com teto, settings por faixa ou lista (inclusive remap de teclas e botões sem tecla reservada ou repetida), slots e checkpoint validados; checksums dos schemas antigos conferidos com teste; checksum adulterado recusado.
- [ ] Antes do schema seguinte: lista explícita de chaves por schema no `coveredBy` em vez do `Object.keys` do schema 8 (P3 da pré-auditoria).
- [ ] **RC** — Repetir os testes de save e de migração na build candidata.

## 5. Telemetria

- [x] Lista fechada de eventos (`session_start`, `run_start`, `run_end`, `boss_killed`, `error`), props limpas, `error` só com tipo e nome (nunca mensagem, pilha ou caminho), desligada por padrão, contador de erros só com a telemetria ligada (ADR-0023, `telemetry.test.ts`).
- [ ] Serviço e armazenamento (decisão do PO). Quando entrar: `connect-src` da CSP só para o endpoint, envio sem identificadores, política de privacidade publicada e linkada na página da Steam.

## 6. Dependências

- [x] `bun audit` (2026-10-31): 3 vulnerabilidades, só em ferramentas de desenvolvimento, fora do bundle do jogo: `re2js` 2.8.6 (alta) e `katex` 0.16.47 (baixa) via `markdownlint-cli2`; `minimatch` (moderada) via `electron-builder`.
- [ ] Subir `markdownlint-cli2` e `electron-builder` para a primeira versão estável com a correção (Dívidas do PROGRESS).
- [ ] **RC** — `bun audit` na tag: nenhuma vulnerabilidade em dependência de runtime.
- [x] `bunx biome ci .`: 612 arquivos, nada a corrigir.

## 7. Licenças e inventário de assets

- [x] Áudio: 119 de 119 `meta.json` com `plan: "creator"` (70 SFX, 9 músicas, 40 falas); o `tools/guards` recusa `plan` ausente ou `free`.
- [ ] O `assets:build` recusar `plan: free` com teste negativo (A-05-02).
- [x] SBOM: `bun tools/sbom/index.ts --out <pasta>` gera `grim-cubes_0.4.0.sbom.json` com 734 componentes.
- [ ] O SBOM não traz a licença de nenhum componente (734 sem `licenses`). Preencher a partir do `package.json` de cada pacote, para o inventário de licenças da 1.0 (Est).
- [x] Modelos e texturas: gerados por `tools/assets-gen` e refinados no Blockbench pelo projeto (sem asset de terceiros).
- [x] **Imagens 2D geradas por IA** (decisão do PO de 2026-10-31: aceitar e registrar a origem): a key art do menu (`public/menu/menu-1.webp`) e os retratos da loja (`public/portraits/hero.webp`, `public/portraits/merchant.webp`) vêm do gerador de imagens do ChatGPT, com os prompts versionados (`prompt-concept-art-menu.md`, `prompt-settings.md`). A Art Bible §13 foi emendada para permitir imagens 2D de UI e marketing geradas por IA com registro; os três arquivos estão em `docs/legal/third-party.md` com origem, ferramenta, prompt, data e o resumo dos termos da OpenAI sobre o output; o checklist da Steam tem o item de declarar o conteúdo gerado por IA.
- [ ] Transcrever no `docs/legal/third-party.md` a cláusula de titularidade do output e a data de vigência dos termos de uso da OpenAI (<https://openai.com/policies/terms-of-use/>); a página não pôde ser lida pelos agentes em 2026-10-31 (HTTP 403).
- [ ] **Fontes:** o `theme.css` pede "PixelFont" e "Inter", mas nenhum arquivo de fonte é embarcado; a UI cai na monoespaçada e na sans do sistema. Escolher e embarcar fontes OFL (ADR-0013) e registrá-las no `third-party.md`.

## 8. Art Bible §13 (IP e tom)

- [x] Revisão visual dos 78 modelos nas capturas em jogo (B-03-01): nenhum símbolo, nome ou silhueta de Warhammer 40k, DOOM, Alien, Predator, Minecraft, Hytale ou Roblox visto.
- [x] Sangue em vinho escuro e sem `#FF0000` (paleta do Art Bible §3; checklist B-03-01, item 4).
- [ ] **RC** — Revisar a key art e os textos da página da Steam contra a §13 (a key art segue "o estilo" das capas de DOOM, segundo o prompt: conferir que não há logo, arma ou personagem reconhecível).

## 9. Pendências P0

- [ ] **RC** — Zero P0 abertos no `docs/PROGRESS.md` (Bloqueios e Dívidas) e nos relatórios do Esp.
