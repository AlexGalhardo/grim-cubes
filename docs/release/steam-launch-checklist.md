# Checklist de lançamento Steam

Microtarefa B-05-03 (`ROADMAP.md`). Resp: PO + Orq. Cada item vira `[x]` com a data e, quando houver, o link ou a captura em `docs/release/captures/`. Itens marcados **PO** só o PO pode fazer (conta, pagamento, App ID, preço, aceite de termos). O assert da B-05-03 exige todos os itens marcados e a build de release enviada para revisão da Valve com a confirmação capturada.

Referências: ADR-0008 (Electron e assinatura), ADR-0009 (Auto-Cloud), ADR-0018 (plataformas e preço), ADR-0021 (shell Electron), SDD 10 §2 (build e Steam), SDD 12 (secrets do ambiente `steam`), GDD §20 e §26.

## Prazos

| Marco | Data alvo | Regra |
| --- | --- | --- |
| Taxa paga e conta Steamworks ativa | assim que possível | a Valve exige 30 dias entre o pagamento da taxa do app e o lançamento |
| Página "em breve" pública | ≥ 2 semanas antes da demo (2027-01-24) | a página precisa passar pela revisão da Valve antes |
| Demo pública e Next Fest | 2027-01-24 / fev 2027 | A-06-03 |
| Build 1.0 enviada para revisão | ≥ 7 dias antes da data de lançamento | assert da B-05-03 |
| Lançamento 1.0 | abr 2027 | o botão de lançamento é manual, na conta do PO |

## 1. Conta e App IDs

- [ ] **PO** — Conta Steamworks com taxa do app paga (US$ 100), dados fiscais e bancários aprovados. Data: ____
- [ ] **PO** — App ID do jogo criado. Registrar em `docs/legal/accounts.md` (sem credenciais) e no secret `STEAM_APP_ID` do ambiente `steam`. Data: ____
- [ ] **PO** — App ID da demo criado e associado ao jogo base; secret `STEAM_DEMO_APP_ID`. Data: ____
- [ ] **PO** — Conta de build dedicada (só permissão de upload de builds), com Steam Guard; secrets `STEAM_BUILD_ACCOUNT` e `STEAM_CONFIG_VDF` no ambiente `steam`, com o PO como revisor obrigatório. Data: ____
- [ ] Orq — `docs/legal/accounts.md` lista App IDs, depots e branches, sem senha nem token. Data: ____

## 2. Build e depots

- [ ] S2 — `electron-builder.yml` ganha o alvo `dir` (pasta `win-unpacked`): a Steam instala arquivos soltos, não o instalador NSIS nem o portable. Data: ____
- [ ] S2 — `steamworks.js` 0.4.0 inicializado com o App ID real e `steam_api64.dll` em `extraResources` (A-06-01, ADR-0021); `window.gcDesktop.steam` passa a `true` só dentro da Steam. Data: ____
- [ ] S2 — Teste do overlay da Steam sem flags; se exigir `--in-process-gpu`, decidir ou desligar o overlay e registrar no ADR-0008. Data: ____
- [ ] Orq — Depot Windows do jogo (`<AppID>+1`) e depot Windows da demo criados; mapeamento do conteúdo para a pasta `win-unpacked`. Data: ____
- [ ] Orq — Opções de inicialização do jogo e da demo: executável `Grim Cubes.exe`, sistema Windows 64 bits, sem argumentos. Data: ____
- [ ] Orq — Branches: `beta` (testers, B-04-03) e `default` (público). Build da 1.0 no `default`. Data: ____

### Passo a passo do `steam-upload`

Roda num workflow manual (`environment: steam`, aprovado pelo PO) ou localmente pelo PO. Nunca com credencial no repositório.

1. Gerar a build: `bun run build:electron` na tag da versão (saída em `release/win-unpacked/`).
2. Conferir: o executável abre em tela cheia e uma run curta funciona.
3. Escrever `tools/steam/app_build_<AppID>.vdf` (sem segredos), com `appid`, `desc` igual à tag (`v1.0.0`), `contentroot` em `release/win-unpacked`, `buildoutput` fora do repositório e o `depot_build_<DepotID>.vdf` com `FileMapping { LocalPath "*" DepotPath "." recursive 1 }`.
4. Para o `beta`, `setlive "beta"` no `app_build`. O `default` não aceita `setlive` pelo steamcmd: a build vai ao ar pelo painel do Steamworks.
5. Rodar `steamcmd +login "$STEAM_BUILD_ACCOUNT" +run_app_build "<caminho>/app_build_<AppID>.vdf" +quit`, com o `config.vdf` restaurado do secret `STEAM_CONFIG_VDF` (evita o Steam Guard a cada upload).
6. No Steamworks → Builds: conferir o BuildID, o tamanho e a descrição; pôr no ar na branch certa.
7. Instalar pelo cliente Steam numa máquina limpa, abrir, jogar até o round 2 e fechar. Registrar o BuildID aqui.
8. Repetir os passos 3 a 7 para a demo com o App ID da demo (build `web-demo`, ou build do Electron com `__IS_DEMO__`).

## 3. Página da loja

- [ ] Est + PO — Textos finais em pt-BR e inglês: descrição curta, longa, recursos (`docs/marketing/steam-page.md`, A-06-02). Data: ____
- [ ] S1 + PO — Capsules nos tamanhos atuais do Steamworks: cabeçalho, pequena, principal, vertical, fundo da página e os itens de biblioteca (capa, hero e logo). Conferir os tamanhos no painel no dia do envio. Data: ____
- [ ] S1 — Pelo menos 5 capturas em 1920×1080 de um build de captura (sem HUD de debug). Data: ____
- [ ] PO — Trailer de 60 s (A-06-02). Data: ____
- [ ] Orq — Tags, gênero (ação, roguelite, sobrevivência), modos (um jogador) e suporte a controle: completo (teclado, mouse e gamepad navegam todas as telas, A-07-02). Data: ____
- [ ] Orq — Requisitos de sistema mínimos e recomendados (Windows 10/11 64 bits, GPU com WebGL2), a partir do bench com GPU real (P-07-05). Data: ____
- [ ] Orq — Idiomas: interface e legendas em português (Brasil) e inglês; áudio de voz em inglês só nas falas de chefe e do Mercador. Data: ____
- [ ] **PO** — Política de privacidade publicada e linkada na página (a telemetria é opt-in, ADR-0023). Data: ____
- [ ] **PO** — Página "em breve" enviada para revisão e aprovada pela Valve. Data: ____

## 4. Preço e regiões

- [ ] **PO** — Preço base US$ 9,99 (ADR-0018). Data: ____
- [ ] **PO** — Preços regionais pela sugestão da Valve ("Propose Pricing"), revisados em BRL e nas moedas principais. Data: ____
- [ ] **PO** — Desconto de lançamento (decidir sim ou não e o percentual, dentro das regras de desconto da Steam). Data: ____
- [ ] **PO** — Regiões de venda: todas, salvo restrição que o PO decidir. Data: ____

## 5. Classificação etária e conteúdo

- [ ] **PO** — Content survey da Steam: violência frequente contra criaturas não humanas, sangue e desmembramento em cubos (gore ligável nas `Options`), sem conteúdo sexual, sem apostas. Data: ____
- [ ] **PO** — Questionário IARC no Steamworks, para as classificações regionais (inclui ClassInd no Brasil, PEGI e ESRB quando aplicável). Registrar as classificações recebidas. Data: ____

## 6. Conquistas

- [ ] S2 — As 10 conquistas da 1.0 (SDD 10 §2) cadastradas no Steamworks com nomes em pt-BR e inglês e ícones de 64×64 (obtida e não obtida). Data: ____
- [ ] S2 — `achievement.activate` ligado aos eventos do jogo; conferido numa conta de teste (captura). Data: ____
- [ ] Orq — Conquistas publicadas no Steamworks. Data: ____

## 7. Saves na nuvem

- [x] S2 — O save do Electron precisa de um arquivo em disco para o Auto-Cloud: hoje fica no IndexedDB do Chromium (pasta do perfil, arquivos LevelDB), que não é seguro sincronizar. Gravar o envelope do save (com checksum) em `saves/` na pasta de dados do app (ADR-0009). Feito: arquivos em `%APPDATA%\grim-cubes\saves`, caminho fixado no código (não muda com o nome do pacote). Data: 2026-10-31
- [ ] Orq — Auto-Cloud configurado: raiz `WinAppDataRoaming` (ou a pasta escolhida), subpasta `grim-cubes/saves` (`%APPDATA%\grim-cubes\saves`, em minúsculas e fixa), padrão `*.json`, cota de bytes e de arquivos. Data: ____
- [ ] PO — Teste em duas máquinas: o save sincroniza e um conflito mostra a escolha da Steam. Data: ____

## 8. Steam Deck

- [ ] Orq — Fora do escopo da 1.0 (ADR-0008). A Valve classifica o jogo sozinha; registrar o resultado quando sair. Data: ____
- [ ] S2 — Se o PO quiser "verificado" depois: resolução 1280×800, textos legíveis, controle em todas as telas e teclado virtual na seed. Data: ____

## 9. Demo

- [ ] Orq — Build da demo com o limite do Coveiro, a tela `DemoEnd` e o selo DEMO (P-07-01); o progresso da demo não abre conteúdo do jogo completo. Data: ____
- [ ] S2 — Botões "Adicionar à lista de desejos" e "Jogar o jogo completo" da `DemoEnd` ligados às URLs reais (hoje desabilitados). Data: ____
- [ ] **PO** — Inscrição no Next Fest de fevereiro de 2027 (A-06-03), com captura da confirmação. Data: ____

## 10. Envio para revisão e lançamento

- [ ] Orq — Release `v1.0.0` publicado no GitHub (R-02-01), com a mesma build do depot. Data: ____
- [ ] Orq — Build 1.0 no `default` (passo a passo da §2), checklist de lançamento interno ok (R-01-05: auditoria de segurança do Esp). Data: ____
- [ ] **PO** — Página e build enviadas para revisão ≥ 7 dias antes da data de lançamento. Captura da confirmação em `docs/release/captures/`. Data: ____
- [ ] **PO** — Data de lançamento confirmada no Steamworks. Data: ____
- [ ] **PO** — Botão de lançamento no dia. Data: ____
- [ ] Orq — Monitorar os primeiros 7 dias (R-02-04): reembolsos, avaliações, crash reports. Data: ____
