# Controls

Esta pasta concentra os componentes de controle e UX do `ApproachObservatory`.

O objetivo aqui é organizar a interface que permite ao usuário:
- ajustar filtros e datas;
- alternar vistas e modos de cena;
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

### Shell e ajuda

- `MapManualModal.tsx`
  Shell do modal do manual: arraste, resize, abas e fechamento.

- `WelcomeToast.tsx`
  Toasts de primeira visita para radar e órbita.

### Manual

- `Manual/`
  Subpasta com o conteúdo do manual do mapa.

- `Manual/FriendlyManual.tsx`
  Guia de leitura em linguagem mais amigável.

- `Manual/TechnicalManual.tsx`
  Explicações técnicas, fórmulas e limitações.

- `Manual/ManualParts.tsx`
  Blocos visuais reutilizáveis do manual.

- `Manual/ManualDiagrams.tsx`
  Diagramas SVG usados pelo manual.

- `Manual/manualCuriosities.ts`
  Conteúdo textual das curiosidades e FAQ.

- `Manual/manualTypes.ts`
  Tipos locais compartilhados pelo manual e por controles relacionados.

### Controles principais da cena

- `SceneToolbar.tsx`
  Toolbar de vistas, labels e fullscreen.

- `ReferenceControls.tsx`
  Atalhos de foco para Sol, Terra, Lua e planetas.

- `ViewButtons.tsx`
  Botões base usados pela toolbar.

### Filtros e formulários

- `ObservationControls.tsx`
  Formulário principal de data, tipo e busca.

- `CompactConsoleBar.tsx`
  Versão condensada dos controles para espaços menores.

- `RadarFilters.tsx`
  Abas de modo do radar.

- `RadarObjectControls.tsx`
  Controle de critério e quantidade de objetos mostrados.

## Diretrizes de manutenção

- Prefira componentes pequenos com responsabilidade única.
- Se um arquivo começar a misturar shell interativo com muito conteúdo editorial, extraia.
- Tipos compartilhados entre controles devem ficar em arquivos próprios quando isso reduzir acoplamento.
- Comentários devem ser curtos, úteis e em português.
- Evite transformar esta pasta em lugar de lógica de domínio.

## Sinal de alerta para refatoração

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
