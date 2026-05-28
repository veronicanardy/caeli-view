/**
 * Earth and Moon body orientation in scene space.
 *
 * Two responsibilities:
 *  - orientEarth: keep the real geographic subsolar point pointing at the Sun while preserving the
 *    23.44° axial tilt (the lit hemisphere AND the correct continents).
 *  - orientMoonTidal: keep the lunar near-side facing Earth (tidal lock) with the lunar north pole
 *    aligned with scene up as closely as possible.
 *
 * Both functions are PURE in the sense that for a given input they always set the same rotation;
 * THREE.Group / THREE.Mesh are mutated only via .quaternion to avoid allocating new transforms.
 */

import * as THREE from 'three';

/**
 * Direction (unit vector, MODEL space) of a geographic point (lat, lon) on a THREE.SphereGeometry
 * carrying a standard equirectangular map (Greenwich centered, u=0.5 at lon=0).
 *
 * Three's SphereGeometry positions vertices as:
 *   x = -cos(phi)·sin(theta),  y = cos(theta),  z = sin(phi)·sin(theta),  where phi = u·2π.
 * For a Greenwich-centered equirectangular, u = lon/360 + 0.5, so phi = lon + π and the texel for
 * (lat, lon) lands on:
 *   x =  cos(lon)·cos(lat)
 *   y =  sin(lat)
 *   z = -sin(lon)·cos(lat)
 *
 * Sanity: Greenwich (0,0) → (1, 0, 0). 90°E → (0, 0, -1). 90°W → (0, 0, 1). North pole → (0,1,0).
 */
export function geoToModelDir(latDeg: number, lonDeg: number): THREE.Vector3 {
    const lat = (latDeg * Math.PI) / 180;
    const lon = (lonDeg * Math.PI) / 180;
    const cl = Math.cos(lat);
    return new THREE.Vector3(Math.cos(lon) * cl, Math.sin(lat), -Math.sin(lon) * cl);
}

/**
 * Earth's axial obliquity in radians (IAU 2006 mean value for J2000.0: 23.4393°). The Earth's
 * rotation axis sits 23.44° off the ecliptic normal — a fact the previous orientation forced
 * to zero by snapping the north pole to scene +Y.
 */
export const EARTH_OBLIQUITY_RAD = (23.4393 * Math.PI) / 180;

/**
 * The Earth's true rotation axis, expressed in scene axes. In ecliptic J2000 the celestial north
 * pole is (0, -sin ε, cos ε). The scene swaps Y/Z (x_scene = x_ecl, y_scene = z_ecl, z_scene = y_ecl),
 * so the polar axis becomes (0, cos ε, -sin ε) in scene coordinates. This vector is INERTIAL: it
 * does not move with the Sun-Earth direction, so we get the seasons for free (winter solstice in
 * the north when the axis tilts AWAY from the Sun, etc.).
 */
export const EARTH_POLAR_AXIS_SCENE = new THREE.Vector3(
    0,
    Math.cos(EARTH_OBLIQUITY_RAD),
    -Math.sin(EARTH_OBLIQUITY_RAD),
);

/**
 * Orients the Earth with its TRUE rotation axis (23.44° off the ecliptic normal, fixed in inertial
 * space) AND keeps the real subsolar point pointing at the Sun.
 *
 * Two physical constraints that must both hold:
 *   1. The model north pole (model +Y) must map to the inertial polar axis EARTH_POLAR_AXIS_SCENE.
 *   2. The subsolar geographic point (latitude/longitude where the Sun is overhead now) must end up
 *      on the Sun direction.
 *
 * Both constraints are geometrically compatible because the subsolar latitude is, by construction,
 * the Sun's declination of-date: the angle between the Sun direction and the equatorial plane equals
 * the subsolar latitude. So the basis built from {polar axis, subsolar→Sun} is orthonormal up to
 * floating-point error, and Gram-Schmidt on Up cleans residuals without distorting the geometry.
 */
export function orientEarth(
    group: THREE.Group,
    sunDirection: [number, number, number],
    subsolarLatDeg: number,
    subsolarLonDeg: number,
): void {
    const sun = new THREE.Vector3(...sunDirection).normalize();

    // Source frame (model space, before rotation): model north pole is +Y, subsolar texel direction
    // comes from the equirectangular UV convention shared with geoToModelDir.
    const srcUp = new THREE.Vector3(0, 1, 0);
    const srcForward = geoToModelDir(subsolarLatDeg, subsolarLonDeg);

    // Target frame (world space): up = inertial polar axis (TRUE tilt), forward = Sun direction.
    const tgtUp = EARTH_POLAR_AXIS_SCENE.clone();
    const tgtForward = sun.clone();

    // Gram-Schmidt: right = up × forward; re-derive forward from right to absorb residual non-
    // orthogonality (sub-arc-second of-date vs. J2000 precession is the only source of slack).
    const buildBasis = (up: THREE.Vector3, forward: THREE.Vector3): THREE.Matrix4 => {
        let right = new THREE.Vector3().crossVectors(up, forward);
        if (right.lengthSq() < 1e-6) right = new THREE.Vector3(1, 0, 0); // sun on a pole — degenerate
        right.normalize();
        const fwd = new THREE.Vector3().crossVectors(right, up).normalize();
        return new THREE.Matrix4().makeBasis(fwd, up, right);
    };

    const src = buildBasis(srcUp, srcForward);
    const tgt = buildBasis(tgtUp, tgtForward);

    // Rotation = target · inverse(source). Both bases are orthonormal, so inverse = transpose.
    const rot = tgt.multiply(src.transpose());
    group.quaternion.setFromRotationMatrix(rot);
}

/**
 * Tidally-locks the Moon mesh: the lunar near-side (texture's lat=0, lon=0 — the +X model axis,
 * by the same equirectangular convention as Earth) is rotated to face the scene origin (Earth),
 * while the lunar north pole stays as close to scene +Y as possible.
 *
 * Same target-basis construction as orientEarth(): build orthonormal source and target frames,
 * read the rotation off basis · transpose(basis). The Moon is parented in a group placed at its
 * scene position, so the "Earth direction" in mesh-local space is just −scenePosition normalised.
 */
export function orientMoonTidal(mesh: THREE.Mesh, scenePosition: [number, number, number]): void {
    const earthDir = new THREE.Vector3(-scenePosition[0], -scenePosition[1], -scenePosition[2]);
    if (earthDir.lengthSq() < 1e-9) return; // Moon at origin: leave it as-is.
    earthDir.normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);

    // Source: near-side direction in model space (textured (0,0) = +X), plus the model north pole.
    const srcForward = new THREE.Vector3(1, 0, 0);
    const srcUp = new THREE.Vector3(0, 1, 0);

    // Target: near-side must face Earth (origin); lunar north stays near scene up.
    const tgtForward = earthDir.clone();
    let tgtRight = new THREE.Vector3().crossVectors(worldUp, tgtForward);
    if (tgtRight.lengthSq() < 1e-6) tgtRight = new THREE.Vector3(1, 0, 0); // Earth near a lunar pole
    tgtRight.normalize();
    const tgtUp = new THREE.Vector3().crossVectors(tgtForward, tgtRight).normalize();

    let srcRight = new THREE.Vector3().crossVectors(srcUp, srcForward);
    if (srcRight.lengthSq() < 1e-6) srcRight = new THREE.Vector3(0, 0, 1);
    srcRight.normalize();
    const srcUpO = new THREE.Vector3().crossVectors(srcForward, srcRight).normalize();

    const src = new THREE.Matrix4().makeBasis(srcForward, srcUpO, srcRight);
    const tgt = new THREE.Matrix4().makeBasis(tgtForward, tgtUp, tgtRight);
    const rot = tgt.multiply(src.transpose());
    mesh.quaternion.setFromRotationMatrix(rot);
}
