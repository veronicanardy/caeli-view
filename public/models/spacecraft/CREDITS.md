# Créditos dos modelos 3D de naves

Modelos oficiais da NASA, de domínio público, baixados do NASA 3D Resources / NASA Science
(science.nasa.gov). Usados como representação real das naves no radar 3D. Formato glTF binário (.glb).

## Voyager.glb, sonda Voyager

Modelo da sonda Voyager (NASA). Voyager 1 e Voyager 2 são gêmeas, então o MESMO modelo serve às duas.

- Fonte: https://science.nasa.gov/resource/voyager-3d-model/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/v/Voyager.glb
- Crédito: NASA Visualization Technology Applications and Development (VTAD).

## Juno.glb, sonda Juno

Modelo da sonda Juno (orbitador de Júpiter da NASA).

- Fonte: https://science.nasa.gov/resource/juno-3d-model/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/j/Juno.glb
- Crédito: NASA Visualization Technology Applications and Development (VTAD).

## New_Horizons.glb, sonda New Horizons

Modelo da sonda New Horizons (missão a Plutão e ao cinturão de Kuiper).

- Fonte: https://science.nasa.gov/resource/new-horizons-3d-model/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/n/New_Horizons.glb
- Crédito: NASA Visualization Technology Applications and Development (VTAD).

## Pioneer_10.glb, sondas Pioneer 10 e Pioneer 11

Modelo da sonda Pioneer 10 (primeira a cruzar o cinturão de asteroides e sobrevoar Júpiter). Pioneer
10 e Pioneer 11 são gêmeas, então o MESMO modelo serve às duas.

- Fonte: https://science.nasa.gov/3d-resources/pioneer/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/pioneer-10/Pioneer%2010.glb
- Crédito: NASA/JPL/Eyes on the Solar System.

## JWST.glb, telescópio espacial James Webb

Modelo do telescópio James Webb (observatório infravermelho no ponto de equilíbrio L2).

- Fonte: https://science.nasa.gov/3d-resources/james-webb-space-telescope-a/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/james-webb-space-telescope-(a)/James%20Webb%20Space%20Telescope%20(A).glb
- Crédito: NASA/Goddard Space Flight Center.

## Parker_Solar_Probe.glb, sonda Parker Solar Probe

Modelo da sonda Parker Solar Probe (a nave que mergulha na coroa do Sol).

- Fonte: https://science.nasa.gov/resource/parker-solar-probe-3d-model/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/p/s/PSP.glb
- Crédito: NASA Visualization Technology Applications and Development (VTAD).

## Europa_Clipper.glb, sonda Europa Clipper

Modelo da sonda Europa Clipper (missão à lua Europa, de Júpiter). O arquivo original tem 34 MB, pesado
demais para a carga da cena; este foi otimizado localmente com gltf-transform, preservando a geometria
e os materiais oficiais: texturas limitadas a 512 px (a resolução que o próprio modelo usa na maioria
das peças), convertidas para WebP (EXT_texture_webp, suportado nativamente pelo three.js) e malha
quantizada (KHR_mesh_quantization, idem). Resultado: 9,6 MB, sem decodificadores externos.

- Fonte: https://science.nasa.gov/resource/europa-clipper-3d-model/
- Arquivo: https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/c/clipper_spacecraft.glb
- Crédito: NASA Visualization Technology Applications and Development (VTAD).

## Observações

- São dados públicos da NASA. Mantemos o crédito por boa prática, igual aos shape models de cometas
  (`/models/comets/CREDITS.md`) e asteroides.
- O marcador estilizado anterior (formas geométricas) foi substituído por estes modelos reais. A
  forma simbólica continua como FALLBACK quando o GLB não carrega (ver spacecraftModelRegistry.ts).
