/**
 * Color palette assigned to the "closest now" asteroids by index. Selected/non-selected entries
 * stay legible against the dark background; warm hues bias each object so collisions in 3D space
 * stay parseable when objects cross paths.
 *
 * `past` is a solid hex (no rgba): THREE.Color ignores the alpha channel of rgba() strings and
 * would warn + render it white. The faintness of the past trail comes from material opacity, not
 * the color string.
 */
export const OBJECT_PALETTE = [
    { future: '#76e4b5', current: '#a6f0d4', past: '#9fb4ad' },  // mint
    { future: '#7cc4f5', current: '#a8d8fa', past: '#9fb0bf' },  // sky
    { future: '#f5b676', current: '#fad19c', past: '#bfae9c' },  // amber
    { future: '#e88ab8', current: '#f1afcc', past: '#bfa6b2' },  // rose
    { future: '#c7a8f0', current: '#dac4f5', past: '#b3a6bf' },  // lavender
] as const;

export type Palette = (typeof OBJECT_PALETTE)[number];
