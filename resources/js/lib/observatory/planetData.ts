/**
 * Physical and visual constants for "ambient" planets rendered in the Radar scene.
 *
 * These planets are not the focus of the observatory (that's Earth + NEOs + Sun), but
 * they enrich the scientific and visual context. Each entry carries:
 *   physicalRadiusDl  — true radius in lunar-distance units (for science/scale reference)
 *   visualRadiusDl    — exaggerated radius actually rendered (same exaggeration factor as
 *                       Earth ~47× and Moon ~10×, so relative proportions feel familiar)
 *   rotationPeriodS   — sidereal rotation period in seconds (for real-time spin)
 *   axialTiltDeg      — obliquity relative to the ecliptic (for axis orientation)
 *   texturePath       — public path to the surface map; null triggers the procedural fallback
 *   fallbackColor     — hex color used when texturePath is unavailable or still loading
 *
 * WHY separate physicalRadiusDl from visualRadiusDl:
 * At the log-compressed radar scale, Mercury's real radius (0.00635 DL) would be sub-pixel.
 * We keep the scientific value explicit so future consumers can label distances correctly,
 * while the visual value drives the rendered sphere.
 *
 * Sources:
 *   - Radii:              IAU Working Group on Cartographic Coordinates and Rotational Elements 2015
 *   - Rotation periods:   NASA Planetary Fact Sheet (Williams 2022)
 *   - Axial tilt:         IAU WGCCRE 2015 pole orientation (sub-degree for Mercury)
 */

const KM_PER_LD = 384_400;

export interface PlanetDatum {
    /** IAU mean radius, km → DL. */
    physicalRadiusDl: number;
    /** Rendered radius in scene units (DL, log-compressed). */
    visualRadiusDl: number;
    /** Sidereal rotation period, seconds. */
    rotationPeriodS: number;
    /** Obliquity of the ecliptic, degrees. IAU WGCCRE 2015. */
    axialTiltDeg: number;
    /** Public path to the 2K surface texture, or null for fallback. */
    texturePath: string | null;
    /** Fallback sphere color when no texture is loaded. */
    fallbackColor: string;
}

/**
 * Mercury's physical constants.
 *
 * physicalRadiusDl = 2439.7 km / 384400 km/DL = 0.006346 DL
 *
 * Visual exaggeration target: roughly the same visual footprint as the Moon marker (0.035 DL),
 * which uses ~10× exaggeration over its true 0.00451 DL. Mercury is slightly larger physically
 * but should feel small and distant, so we cap it at 0.028 DL (~44× physical) — visible but
 * unambiguously smaller than Earth (0.11 DL) and similar in apparent size to Moon.
 *
 * Rotation: 58.6462 Earth days (IAU, synodic resonance 3:2 with orbital period).
 * Axial tilt: 0.034° — essentially upright relative to the ecliptic; renders as no perceptible tilt.
 */
export const MERCURY: PlanetDatum = {
    physicalRadiusDl: 2_439.7 / KM_PER_LD,          // 0.00635 DL — true radius
    visualRadiusDl: 0.028,                             // rendered radius (~44× exaggeration)
    rotationPeriodS: 58.6462 * 24 * 3600,             // 5_067,013 s ≈ 58.65 days
    axialTiltDeg: 0.034,                               // near-zero obliquity (IAU WGCCRE 2015)
    texturePath: '/images/mercury/mercury-2k.jpg',
    fallbackColor: '#a89880',                          // warm grey matching real surface albedo
};
