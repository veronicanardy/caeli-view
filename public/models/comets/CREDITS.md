# Créditos dos modelos 3D de cometas

## 67p.glb, núcleo do cometa 67P/Churyumov-Gerasimenko

Modelo de forma científico real, derivado das imagens da câmera OSIRIS/NAVCAM da sonda Rosetta (ESA).

- Versão: SHAP4S (SPG, DLR), 50k facetas (24.997 vértices, 49.994 triângulos).
- Fonte original: PDS Small Bodies Node, dataset `RO-C-MULTI-5-67P-SHAPE-V2.0`
  (`data/triplate/spg_dlr/shap4s/cg_dlr_spg_shap4s_050k.wrl`).
- Crédito: ESA/Rosetta/DLR. Dado público da missão Rosetta.
- Convertido de VRML (.wrl) para GLB por `scripts/wrl-to-glb.mjs` (centralizado e normalizado para
  "maior eixo = 2", normais por vértice calculadas). A geometria é a real; só o formato mudou.

## comet_generic.glb, núcleo do cometa 9P/Tempel 1 (usado como genérico realista)

Modelo de forma científico REAL do núcleo do 9P/Tempel 1, derivado das imagens da missão Deep Impact
(NASA/JPL/UMD). Usado como representação genérica realista dos cometas SEM modelo próprio (Halley,
Encke, NEOWISE), por nenhuma sonda ter mapeado os núcleos deles de perto. É um núcleo de cometa real,
escuro e irregular, coerente com os asteroides reais da cena (e não um modelo cartoon).

- Versão: shape model 2012 (cartesiano), 16.022 vértices, 32.040 triângulos.
- Fonte original: PDS Small Bodies Node, dataset `dif-c-hriv_its_mri-5-tempel1-shape-v2.0`
  (`data/tempel1_2012_cart.wrl`).
- Crédito: NASA/JPL/UMD, missão Deep Impact. Dado público.
- Convertido de VRML (.wrl) para GLB por `scripts/wrl-to-glb.mjs`, igual ao 67P.

> Observação: por não haver shape model real de Halley/Encke/NEOWISE, os três compartilham este núcleo
> do Tempel 1 como forma representativa (variada por seed na cena). A cauda do cometa será adicionada
> manualmente depois (decisão da Verônica). O GLB atual é só o corpo.
