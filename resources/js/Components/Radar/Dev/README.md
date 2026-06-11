# Dev

## Responsabilidade

Ferramentas de diagnóstico exclusivas de desenvolvimento da cena 3D do radar. Nada desta pasta participa do produto: os componentes só ativam em build de desenvolvimento e mediante flag explícita na URL.

## Estrutura

```txt
Dev/
  README.md
  PerfProbe.tsx
```

## PerfProbe

Sonda de performance montada dentro do Canvas principal. Ativa apenas com `import.meta.env.DEV` e `?perf` na URL (ex: `http://localhost:8000/radar?perf`).

Exibe em overlay fixo, atualizado 2x por segundo sem re-renders React:

- FPS e pior tempo de frame da janela;
- contagem de frames acima de 16 ms e de 33 ms;
- long tasks (quantidade e pior duração);
- draw calls, triângulos, geometrias, texturas e programas do renderer;
- heap JS (Chrome) e contagem de labels DOM portalados sobre o canvas.

O botão `labels` oculta todos os overlays HTML da cena via CSS. Uso: rotacionar a câmera com labels ligados e desligados comparando as métricas. Se as micro-travadas desaparecem com labels ocultos, o gargalo é composição/estilo do DOM (backdrop-blur dos labels), não a cena WebGL.

## Regra Para IA

Componentes desta pasta devem ser removíveis apagando a pasta e a linha de montagem correspondente. Não importe nada daqui em código de produto fora do ponto único de montagem, e não deixe a ativação depender de outra coisa além de build dev + flag explícita.
