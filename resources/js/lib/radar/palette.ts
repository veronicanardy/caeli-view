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
    { future: '#00e896', current: '#00e896', past: '#00804f' },  // mint
    { future: '#00aaff', current: '#00aaff', past: '#005c99' },  // sky
    { future: '#ff9900', current: '#ff9900', past: '#995400' },  // amber
    { future: '#ff3d8a', current: '#ff3d8a', past: '#991040' },  // rose
    { future: '#a855f7', current: '#a855f7', past: '#5c1fa6' },  // lavender
] as const;

export type Palette = (typeof OBJECT_PALETTE)[number];
