# Para depois: legal, jurídico e lançamento

Lista única para o PO acompanhar o que fica para depois fora do código. Este arquivo é mantido junto com o desenvolvimento: quem fecha ou cria um item num dos documentos linkados atualiza a linha aqui no mesmo commit. O detalhe fica no documento linkado; aqui fica só o item, o dono e o gatilho.

Atualizado: 2026-10-31.

## 1. Jurídico e legal

- [ ] **Marca "Grim Cubes":** registrar números de processo ou capturas das buscas (INPI classes 9 e 41, USPTO, EUIPO). Dono: PO. Gatilho: antes do anúncio público (Next Fest, fev/2027). [`docs/legal/trademark-screening.md`](docs/legal/trademark-screening.md)
- [ ] **Nome do item "Grim Pact":** decidir (recomendação: "Grim Bargain", para não confundir com a dificuldade Grim). Dono: PO. Gatilho: antes da página da Steam. [`docs/PROGRESS.md`](docs/PROGRESS.md), Bloqueios, item 10
- [ ] **Domínios** `grimcubes.com` e `grimcubes.com.br`: registrar e anotar em `docs/legal/domains.md`. Dono: PO. Gatilho: antes da página da Steam. [`ROADMAP.md`](ROADMAP.md) E-05-02
- [ ] **Termos de uso e política de privacidade** (com LGPD e GDPR): a telemetria é opt-in e sem dados pessoais (ADR-0023), mas a Steam pede o link da política quando o jogo coleta dados. Dono: PO. Gatilho: antes de ligar o envio da telemetria e antes da página da Steam. [`docs/release/steam-launch-checklist.md`](docs/release/steam-launch-checklist.md) §3, [`docs/adrs/0023-telemetry-opt-in-local-sink.md`](docs/adrs/0023-telemetry-opt-in-local-sink.md)
- [ ] **EULA:** usar o padrão da Steam ou escrever uma própria (a `LICENSE` é proprietária, "All rights reserved"). Dono: PO. Gatilho: antes do envio da build 1.0 para revisão. [`LICENSE`](LICENSE)
- [ ] **Licenças de terceiros:**
  - [x] Fontes OFL: Pixelify Sans e Inter embarcadas em `public/fonts/` e registradas em `docs/legal/third-party.md` (0f4ac5a). Dono: S2.
  - [x] Áudio do ElevenLabs no plano Creator (uso comercial), registrado. [`docs/legal/third-party.md`](docs/legal/third-party.md)
  - [ ] Termos da OpenAI para as imagens de IA: transcrever a cláusula de titularidade do output e a data de vigência (a página não abriu para os agentes). Dono: PO. Gatilho: antes da R-01-05. [`docs/legal/third-party.md`](docs/legal/third-party.md)
  - [ ] Licenças das dependências no SBOM (hoje nenhum dos 734 componentes traz licença). Dono: Est. Gatilho: antes da RC. [`docs/release/audit-1.0.md`](docs/release/audit-1.0.md) §7
- [ ] **Declaração de conteúdo gerado por IA** (key art do menu e retratos de UI) no questionário de conteúdo da Steam. Dono: PO. Gatilho: envio da página para revisão. [`docs/release/steam-launch-checklist.md`](docs/release/steam-launch-checklist.md) §5
- [ ] **Classificação etária:** content survey da Steam e questionário IARC (gera ClassInd, PEGI e ESRB); no Google Play, o questionário IARC do Play Console. Dono: PO. Gatilho: página da Steam; publicação na 1.1. [`docs/release/steam-launch-checklist.md`](docs/release/steam-launch-checklist.md) §5
- [ ] **Empresa, impostos e conta bancária** para receber da Steam e do Google (dados fiscais, formulário de impostos dos EUA, conta para pagamentos). Dono: PO. Gatilho: antes de abrir a conta Steamworks. [`docs/release/steam-launch-checklist.md`](docs/release/steam-launch-checklist.md) §1

## 2. Steam

Detalhe completo, com prazos e o passo a passo do upload: [`docs/release/steam-launch-checklist.md`](docs/release/steam-launch-checklist.md).

- [ ] **Conta Steamworks** (taxa de US$ 100; a Valve exige 30 dias entre o pagamento e o lançamento). Dono: PO. Gatilho: já (a aprovação pode levar até 21 dias e a demo é em 2027-01-24). ROADMAP E-05-03
- [ ] **App IDs** do jogo e da demo, conta de build com Steam Guard e secrets no ambiente `steam`. Dono: PO. Gatilho: logo depois da conta. Checklist §1
- [ ] **Página da loja:** textos, capsules, 5 capturas em 1080p, trailer de 60 s, tags, requisitos; página "em breve" aprovada ≥ 2 semanas antes da demo. Dono: PO + Est + S1. ROADMAP A-06-02, checklist §3
- [ ] **Preço e regiões:** US$ 9,99, preços regionais sugeridos pela Valve, desconto de lançamento. Dono: PO. Checklist §4
- [ ] **Content survey, IARC e declaração de IA.** Dono: PO. Checklist §5
- [ ] **Conquistas:** as 10 da 1.0 com ícones, ligadas no jogo. Dono: S2. ROADMAP A-06-01, checklist §6
- [ ] **Auto-Cloud:** pasta `%APPDATA%\grim-cubes\saves`, padrão `*.json`, cotas; teste em duas máquinas. Dono: Orq + PO. Checklist §7
- [ ] **Demo e Next Fest** (fev/2027): build da demo, botões da `DemoEnd` com URLs reais, inscrição. Dono: Orq + PO. ROADMAP A-06-03, checklist §9
- [ ] **`steam-upload`:** conta de build e `config.vdf` em secret. Dono: PO + Orq. Checklist §2
- [ ] **Revisão da Valve:** página e build 1.0 enviadas ≥ 7 dias antes do lançamento, com captura da confirmação. Dono: PO. ROADMAP B-05-03, checklist §10
- [ ] **Assinatura do `.exe`:** comprar certificado ou distribuir só pela Steam (recomendação: só Steam até a 1.0). Dono: PO. ROADMAP B-04-01, PROGRESS Bloqueios item 9

## 3. Google Play (versão 1.1)

Detalhe nos itens M-01-* do [`ROADMAP.md`](ROADMAP.md).

- [ ] **Aprovar as dependências do Capacitor 8.** Dono: PO. Gatilho: abertura da fase BETA. ROADMAP B-04-04, PROGRESS Bloqueios item 3
- [ ] **Conta do Google Play** (taxa única de US$ 25 e verificação de identidade). Dono: PO. ROADMAP M-01-01
- [ ] **Closed test** com ≥ 12 testers por 14 dias seguidos, exigência para contas pessoais novas. Dono: PO + Est. ROADMAP M-01-05
- [ ] **Play Billing:** produto `full_version` (US$ 9,99) e escolha da biblioteca em ADR. Dono: S2 + PO. ROADMAP M-01-03
- [ ] **Data safety form** e questionário de classificação (IARC) no Play Console. Dono: PO. ROADMAP M-01-01
- [ ] **Ícones, capturas mobile e página da loja.** Dono: PO + S1. ROADMAP M-01-06
- [ ] **AAB assinado:** keystore de upload em secret e Play App Signing ativo. Dono: PO. ROADMAP M-01-01

## 4. Web (Vercel)

- [ ] **Domínio próprio** para a demo e `Strict-Transport-Security` no `vercel.json`. Dono: PO + S2. Gatilho: antes da demo pública. [`docs/release/audit-1.0.md`](docs/release/audit-1.0.md) §3
- [ ] **Proteção e smoke:** criar o secret `VERCEL_AUTOMATION_BYPASS_SECRET` agora; desligar a proteção SSO da produção ao publicar a demo. Dono: PO. PROGRESS Bloqueios item 4, ROADMAP E-04-02
- [ ] **Telemetria:** decidir o endpoint e o armazenamento (recomendação: Vercel Function com Blob, antes do Next Fest). Dono: PO. ROADMAP A-06-04, PROGRESS Bloqueios item 7
- [x] Rollback manual documentado. [`docs/adrs/0026-vercel-manual-rollback.md`](docs/adrs/0026-vercel-manual-rollback.md)

## 5. Operação

- [ ] **Secrets:** `ELEVENLABS_API_KEY` no ambiente `audio` do GitHub (o plano já está como variável); secrets da Steam (ambiente `steam`) e do Play (ambiente `android`) quando as contas existirem. Dono: PO. ROADMAP E-05-04, A-06-01, M-01-01
- [ ] **Bench com GPU real e no celular** (`BENCH_GPU=1 bun run test:perf` e o Chrome mobile), uma vez por release. Dono: PO. ROADMAP P-07-05, R-01-03, PROGRESS Bloqueios item 6
- [ ] **Playtests:** 3 sessões no protótipo e 6 na ALPHA, depois a calibração do juice e do regen. Dono: PO + Est. ROADMAP P-07-06, A-07-04, B-03-04
- [ ] **e2e e baselines:** decidir quando rodar o e2e para gerar as baselines das telas novas (hoje fora do CI por decisão do PO). Dono: PO. ROADMAP A-07-03, [`docs/adrs/0024-e2e-out-of-ci.md`](docs/adrs/0024-e2e-out-of-ci.md)
- [ ] **`toktx` e KTX2:** decidir (recomendação: adiar para a 1.1, o orçamento de memória já fecha sem KTX2). Dono: PO. ROADMAP A-01-02, PROGRESS Bloqueios item 2
- [ ] **Job de perf no CI:** aprovar ou recusar (recomendação: só sob pedido ou com rótulo `perf`). Dono: PO. ROADMAP A-01-03, PROGRESS Bloqueios item 5
- [ ] **`bun audit`:** subir `markdownlint-cli2` e `electron-builder` quando houver versão estável com a correção (vulnerabilidades só em ferramentas de desenvolvimento). Dono: Est. PROGRESS Dívidas
- [ ] **Proteção da `main`:** manter sem proteção enquanto os agentes integram direto (recomendação). Dono: PO. ROADMAP E-01-06, PROGRESS Bloqueios item 8
- [ ] **Aprovações manuais:** silhuetas (folha numerada), vídeos (P-01-04, P-04-05, A-03-01, A-05-01), teste com Xbox e DualSense (P-02-02, B-04-02), uma run completa no `.exe` (P-07-02). Dono: PO. PROGRESS Bloqueios item 12

## 6. Contas e custos

| Conta | Custo | Situação | Gatilho |
| --- | --- | --- | --- |
| ElevenLabs Creator | US$ 22/mês | ativa; renova em 14/11/2026 | decidir se renova ou desce de plano depois do áudio final (B-03-03) |
| Steamworks | US$ 100 por app, uma vez | a abrir | já (E-05-03) |
| Google Play | US$ 25, uma vez | a abrir | fase 1.1 (M-01-01) |
| Domínios | anual, por domínio | a registrar | antes da página da Steam (E-05-02) |
| Certificado de assinatura Windows | anual (opcional) | não comprado | antes da 1.0, se o PO quiser distribuir fora da Steam (B-04-01) |
| Vercel | Hobby hoje; Pro se a telemetria exigir | Hobby | decisão da telemetria (A-06-04) |
