# Listas

## Responsabilidade da pasta

Esta pasta concentra componentes de apresentacao do observatorio que renderizam listas, cards e tabelas a partir de dados ja calculados, interpretados ou preparados por outras camadas.

O foco aqui e transformar dados recebidos via props em interface legivel, consistente e facil de manter.

## O que pode conter

- Listas, cards e tabelas de aproximacoes, destaques e insights.
- Helpers locais de apresentacao.
- Formatacao de textos, labels, badges, datas e estados visuais.
- Pequena logica derivada de UI, como escolher um texto, um status visual ou um agrupamento simples baseado nos dados recebidos.
- Componentes auxiliares internos criados apenas para reduzir duplicacao visual.

## O que nao deve conter

- Chamadas de API, fetch, polling ou integracoes externas.
- Calculo orbital, fisica, efemerides, propagacao de trajetoria ou logica cientifica pesada.
- Ranking global, curadoria principal ou decisoes centrais de prioridade entre objetos.
- Geracao de fallback de Horizons, CAD ou qualquer outra fonte de dados.
- Mutacao de estado global do observatorio alem de callbacks de interacao recebidos por props.
- Conversao de ausencia de dados em dado real inventado.

## Limite aceitavel para logica de apresentacao

E aceitavel manter nesta pasta apenas a logica necessaria para apresentar melhor os dados, por exemplo:

- escolher um label de status;
- formatar data, hora ou distancia;
- montar textos descritivos;
- preparar uma estrutura simples reutilizavel entre desktop e mobile.

Se a logica passar a decidir comportamento cientifico, recalcular dados de dominio, buscar dados externos ou redefinir a classificacao central dos objetos, ela deve sair desta pasta.

## Componentes atuais

- `RadarSceneObjectListItem.tsx`
- `UnifiedApproachTable.tsx`

## Regra explicita para IA

Ao editar esta pasta, a IA nao deve colocar aqui:

- calculo orbital ou matematica pesada;
- chamadas de API;
- fallback de Horizons, CAD ou equivalentes;
- ranking global dos objetos;
- logica que altere a verdade dos dados recebidos.

Se precisar desse tipo de regra, implemente em outra camada e passe o resultado pronto para os componentes de `Lists`.
