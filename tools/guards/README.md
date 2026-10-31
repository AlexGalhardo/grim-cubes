# Guards contra regressão

`guards.test.ts` roda com a suíte unit (pre-push e CI) e falha quando um commit apaga ou reverte trabalho sem avisar. Nasceu do commit 59eb086, que removeu `hittable.ts` e testes do S2 sem que nenhum teste falhasse.

Três verificações:

1. **Arquivos essenciais** (`essential.json`): todos precisam existir. A lista só deve crescer.
2. **Áudio**: cada entrada de `assets/src/audio/prompts.json` tem `.mp3` e `.meta.json`, nenhum arquivo gerado fica sem entrada, nenhum `meta.plan` é `free` ou ausente, e o número de entradas por tipo não cai abaixo do piso de `floors.json` (`audio`).
3. **Quantidade de testes** (`floors.json`, `tests`): o número de casos (`test(`, `it(` e `.each`) por pasta não pode cair abaixo do piso.

## Subir os pisos (depois de adicionar testes ou áudio)

1. Rode `bun tools/guards/measure.ts`. Ele imprime a contagem atual por pasta.
2. Copie os números para `floors.json` (`tests`). Para o áudio, ajuste `audio` com a nova quantidade por tipo.
3. Commite junto com a mudança que justifica o novo piso.

## Baixar um piso ou tirar um arquivo essencial

Só quando a remoção for intencional (teste obsoleto, arquivo movido). Edite `floors.json` ou `essential.json` no mesmo commit da remoção e explique o motivo na mensagem. Se o teste falhar e você não removeu nada de propósito, o trabalho foi apagado por engano: restaure em vez de baixar o piso.

## Limite

Os guards pegam apagamento e reversão de arquivos ou de testes. Uma reversão parcial de lógica só é pega por teste de comportamento.
