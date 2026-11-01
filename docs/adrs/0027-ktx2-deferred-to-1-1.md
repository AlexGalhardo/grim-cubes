# ADR-0027 — KTX2 e `toktx` adiados para a 1.1

Status: aceito. Data: 2026-11-01. Emenda a consequência de CI do ADR-0011. Decisão do PO na A-01-02 (opção B).

## Contexto

O orçamento de memória da demo fechou sem KTX2: texturas ≈ 5,2 MB contra o teto de 160 MB (estado da A-01-02 em 2026-10-31, com LRU de áudio e emissivo fora dos presets baixos). `toktx` é um binário do KTX-Software (Apache-2.0), não um pacote npm. Sem ele o `assets:build` marca `ktx2: false`.

## Alternativas consideradas

- A) Instalar `toktx` com versão fixa no job `build-web` agora. Ganha tempo de carga no mobile e cumpre o assert original de arquivos `.ktx2` no CI.
- B) Adiar KTX2 para a 1.1 (M-01-04) e emendar o assert da A-01-02 para o orçamento já medido. Recomendação do Orq, aceita pelo PO.

## Decisão

A 1.0 não instala `toktx` e não gera KTX2. O pipeline segue com `ktx2: false`. O assert da A-01-02 passa a ser o orçamento medido (texturas dentro de 160 MB), não a presença de `.ktx2` no CI. O carregamento condicional (`engine.getCaps().textureETC2`) e o binário no CI voltam na M-01-04, quando o Android precisar do ganho de tempo de carga.

## Consequências

- A demo web não usa textura comprimida. O teto de 160 MB continua folgado com PNG.
- A M-01-04 segue aberta: preset Baixo, KTX2 e capturas mobile dependem deste binário naquela fase.
- Nenhuma dependência npm nova.

## Referências

ADR-0011; SDD 09; ROADMAP A-01-02 e M-01-04.
