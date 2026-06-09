/**
 * Responsabilidade: paleta de cores atribuída aos asteroides "closest now" por índice.
 *
 * As cores de cada entrada permanecem legíveis sobre o fundo escuro do radar; os matizes quentes
 * diferenciam os objetos visualmente quando suas trajetórias se cruzam na cena 3D.
 *
 * Por que `past` é hex sólido (sem rgba): THREE.Color ignora o canal alpha de strings rgba() e
 * renderizaria branco em vez de transparente. O esmaecimento da trilha passada vem da opacidade
 * do material, não da string de cor.
 */
export const OBJECT_PALETTE = [
    { future: '#76e4b5', current: '#a6f0d4', past: '#9fb4ad' },  // mint
    { future: '#7cc4f5', current: '#a8d8fa', past: '#9fb0bf' },  // sky
    { future: '#f5b676', current: '#fad19c', past: '#bfae9c' },  // amber
    { future: '#e88ab8', current: '#f1afcc', past: '#bfa6b2' },  // rose
    { future: '#c7a8f0', current: '#dac4f5', past: '#b3a6bf' },  // lavender
] as const;

export type Palette = (typeof OBJECT_PALETTE)[number];
