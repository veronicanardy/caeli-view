# Controls

Esta pasta concentra os componentes de controle e UX do `Radar`.

O objetivo aqui é organizar a interface que permite ao usuário:

- ajustar filtros e datas;
- abrir ajuda contextual;
- acionar focos e referências visuais;
- navegar pelo manual do mapa.

## Responsabilidade da pasta

`Controls` deve cuidar de:

- composição de interface;
- estado local de interação;
- botões, formulários, toasts, flyouts e barras de ferramentas;
- apresentação do manual e da ajuda contextual.

`Controls` não deve cuidar de:

- cálculo de efemérides;
- ranking de objetos;
- seleção global de domínio;
- trajetórias, integração orbital ou mecânica celeste pesada;
- acesso direto a Horizons, SBDB, CAD ou outras regras centrais de dados.

Quando algum componente precisar exibir conteúdo técnico ou educativo, a lógica visual pode ficar aqui, mas a lógica de domínio deve permanecer fora desta pasta.

## Organização atual

### Shell E Ajuda

- `MapManualModal.tsx`: shell do modal do manual, com arraste, resize, abas e fechamento. Quando a página tem o tutorial interativo (`Tutorial/RadarTutorialProvider`), o header exibe o botão "Rever tutorial", que fecha o guia e reinicia o tutorial.
- `WelcomeToast.tsx`: toast de primeira visita para radar e órbita. Fica suprimido enquanto o tutorial interativo está ativo ou prestes a abrir; ao concluir/pular, o tutorial marca as chaves legadas para os toasts não reaparecerem de forma redundante.

### Manual

- `Manual/`: subpasta com o conteúdo do manual do mapa.
- `Manual/FriendlyManual.tsx`: guia de leitura em linguagem mais amigável.
- `Manual/TechnicalManual.tsx`: explicações técnicas, fórmulas e limitações.
- `Manual/ManualParts.tsx`: blocos visuais reutilizáveis do manual.
- `Manual/ManualDiagrams.tsx`: diagramas SVG usados pelo manual.
- `Manual/manualCuriosities.tsx`: curiosidades e FAQ com respostas em ReactNode (SVGs inline, PT-BR e EN).

### Rigor Científico No Manual

`FriendlyManual.tsx` e `TechnicalManual.tsx` cobrem avisos científicos obrigatórios:

- **Órbita osculadora**: a elipse exibida no modo órbita é calculada a partir dos elementos atuais; não é simulação dinâmica nem previsão futura. Perturbações planetárias não são integradas localmente.
- **Escala linear única**: distâncias estão em escala linear em UA (sem compressão), fiéis às proporções reais entre os corpos; a aproximação é revelada por zoom de câmera, não esticando a régua. Os tamanhos dos corpos são ampliados à parte. A régua log antiga só existe por trás de `?log`. Avisos inline na cena reforçam isso.
- **Posições simbólicas**: objetos sem trajetória Horizons têm posição estimada pela distância da aproximação máxima; o ângulo na cena não tem significado físico.
- **Tamanho dos corpos**: raios visuais amplificados para legibilidade (um asteroide real seria sub-pixel).

Qualquer mudança de linguagem nesses manuais deve preservar esses quatro avisos.
- `Manual/manualTypes.ts`: tipos locais compartilhados pelo manual e por controles relacionados.

### Controles Principais Da Cena

- `SceneToolbar.tsx`: toolbar com Reset de vista, toggle de labels e fullscreen. Usa `Tooltip` para os três botões. Carrega os marcadores `data-tutorial` `camera-controls`, `toggle-labels`, `toggle-fullscreen` e `reset-view` usados pelo tutorial interativo (contrato em `../Tutorial/README.md`).
- `MobileActionBar.tsx`: barra de ações inferior do mobile (abaixo de lg:), com as três portas de entrada da interface: Objetos, Filtros e Guia. Oculta enquanto um sheet ou card ocupa o rodapé. Os botões espelham os marcadores `data-tutorial` do desktop (`object-list-toggle`, `radar-filters`, `radar-guide`); o tutorial resolve por visibilidade.
- `ReferenceControls.tsx`: atalhos de foco para Sol, Terra, Lua e planetas, exibidos com símbolos astronômicos Unicode (☉ ♁ ☽ ✦). O cluster de botões carrega `data-tutorial="reference-controls"` para o passo de referências do tutorial. A prop `labelsAlwaysVisible` força os rótulos de texto abaixo de sm: (uso nos sheets mobile, onde há largura).
- `Tooltip.tsx`: tooltip customizado do observatório — aparece imediatamente no hover e some após 2 s. Suporta `side` (bottom/top), `align` (center/left/right) e `hideDelay`.

### Filtros E Formulários

- `ObservationControls.tsx`: formulário principal de data, tipo e busca.
- `CompactConsoleBar.tsx`: barra de filtros do topo da página, somente desktop (a página esconde abaixo de lg:). No mobile os mesmos filtros vivem no bottom sheet aberto pela `MobileActionBar`. Marcada com `data-tutorial="radar-filters"`.
- `RadarObjectControls.tsx`: controle de critério e quantidade de objetos mostrados na cena 3D. Os grupos carregam `data-tutorial="radar-filter-criterion"` e `data-tutorial="radar-filter-limit"`; o sheet mobile de filtros (`../Panels/MobileFiltersSheetContent.tsx`) duplica esses marcadores e o tutorial resolve o alvo filtrando por visibilidade real.

## Remoção do radar 2D

O controle `RadarFilters.tsx` foi removido junto com o radar 2D/SVG. A seleção principal de objetos agora fica em `RadarObjectControls.tsx`, usada pelo radar 3D.

## Diretrizes De Manutenção

- Prefira componentes pequenos com responsabilidade única.
- Se um arquivo começar a misturar shell interativo com muito conteúdo editorial, extraia.
- Tipos compartilhados entre controles devem ficar em arquivos próprios quando isso reduzir acoplamento.
- Comentários devem ser curtos, úteis e em português.
- Evite transformar esta pasta em lugar de lógica de domínio.

## Sinal De Alerta Para Refatoração

Vale separar um componente quando ele começar a acumular ao mesmo tempo:

- estado de interação;
- conteúdo textual grande;
- SVGs/diagramas;
- blocos auxiliares internos demais;
- regras de apresentação reutilizáveis.

Nesses casos, a divisão preferencial é:

- shell do componente principal;
- subcomponentes visuais;
- tipos compartilhados;
- conteúdo estático em arquivos próprios.
