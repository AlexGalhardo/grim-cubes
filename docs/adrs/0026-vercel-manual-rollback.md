# ADR-0026 — Rollback manual do deploy da Vercel

Status: aceito. Data: 2026-10-31. Pendência da B-05-02.

## Contexto

A demo web sai da Vercel pela integração com o GitHub: cada push na `main` gera um deploy de produção no projeto `galhardos-projects/grim-cubes` (SDD 10 §1, SDD 12). Não há workflow próprio de deploy; o `deploy-web.yml` só roda o smoke depois do deploy. Se um deploy quebrar a demo pública (tela preta, erro no boot, save ilegível), precisamos voltar à versão anterior em minutos, sem esperar um commit de correção passar pelo CI.

## Alternativas consideradas

- Corrigir para frente (revert na `main` e novo deploy): passa pelo CI e pelo build inteiro, o que leva vários minutos com a demo quebrada.
- Workflow próprio de deploy com rollback automático pelo smoke: mais código e um token da Vercel no CI, sem ganho real enquanto o smoke depende do secret de bypass do PO.
- Bloquear o deploy automático da `main` e promover à mão: protege, mas atrasa cada correção e depende de alguém para promover.

## Decisão

Rollback manual pela própria Vercel, com o caminho registrado aqui:

1. Confirmar a quebra: smoke vermelho (`deploy-web.yml`) ou relato com captura.
2. Voltar a produção para o deploy anterior bom: no painel do projeto, aba Deployments, "Instant Rollback" no deploy de produção anterior; ou pela CLI, `vercel rollback <url-do-deploy-bom>` (com `vercel link` no repositório). No plano Hobby, o Instant Rollback só volta para o deploy de produção imediatamente anterior; para um mais antigo, usar "Promote to Production" nele.
3. Depois do rollback, a Vercel deixa de promover sozinha os deploys novos da `main` para produção. Registrar o incidente em `docs/PROGRESS.md` (Dívidas) com o deploy quebrado e o restaurado.
4. Corrigir na `main` (revert ou fix), esperar o CI verde e o deploy de preview, conferir com o smoke e então religar a promoção ("Undo Rollback" ou promover o deploy novo no painel).
5. Os assets têm nomes com hash e cache `immutable`; o `manifest.json` é revalidado a cada carga, então o rollback troca o jogo inteiro sem cache misturado.

Quem executa: o Orq, com a CLI da Vercel já ligada ao projeto, ou o PO pelo painel. Nenhum segredo novo é necessário.

## Consequências

- O tempo de recuperação fica em minutos e não depende do CI.
- Enquanto o rollback estiver ativo, pushes na `main` não chegam à produção: o passo 4 precisa ser feito, senão a demo fica parada na versão antiga.
- Um save gravado pela versão nova com schema mais alto é recusado pela versão antiga (aviso `notice.newer`, nada é salvo na sessão); o save não se perde, e volta a abrir quando a versão nova retornar.

## Referências

SDD 10 §1; SDD 12; ADR-0012; `vercel.json`; `tools/smoke`; `.github/workflows/deploy-web.yml`.
