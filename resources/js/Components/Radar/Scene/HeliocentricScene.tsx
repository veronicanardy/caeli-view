/**
 * Cena heliocêntrica do objeto selecionado.
 *
 * Responsabilidade: renderizar Sol, órbita Kepleriana e posição atual estimada
 * do asteroide quando o modo orbital está ativo e os elementos orbitais são
 * utilizáveis. Não cria fallback de dados nem recalcula ranking.
 */

import { useEffect, useMemo, useState } from 'react';
import type { OrbitalElements } from '@/types';
import { buildHeliocentricOrbit, orbitGeometryFromElements, sampleHeliocentricEllipseAtNu, ORBIT_AU_SCALE, ORBIT_ELLIPSE_SEGMENTS } from '@/lib/sceneEphemeris';
import { trueAnomalyNow } from '@/lib/keplerOrbit';
import { FocusProtectedHtml, ScreenLabel } from '../Overlays/SceneLabels';
import { Sun } from '../Bodies/Sun/Sun';
import { OrbitLineHelio } from '../Trajectory/HeliocentricLines';
import { SUN_RADIUS_SCENE } from '../Bodies/bodyRenderConstants';

const ASTEROID_RADIUS_HELIO = 0.06;

type HeliocentricSceneProps = {
    elements: OrbitalElements;
    asteroidName: string;
    color: string;
    locale: 'pt-BR' | 'en';
};

export function HeliocentricScene({
    elements,
    asteroidName,
    color,
    locale,
}: HeliocentricSceneProps) {
    const en = locale === 'en';

    // Linha e posição DEVEM usar o mesmo número de segmentos (ORBIT_ELLIPSE_SEGMENTS): a posição é
    // amostrada na própria polilinha (sampleHeliocentricEllipseAtNu, abaixo). Se a linha for desenhada
    // com outra contagem, ela vira um polígono diferente e o asteroide volta a sair da linha — o
    // sintoma que a amostragem corrige só se as duas polilinhas forem idênticas.
    const orbitPoints = useMemo(
        () => buildHeliocentricOrbit(elements, ORBIT_ELLIPSE_SEGMENTS),
        [elements],
    );

    // Posição AMOSTRADA NA MESMA POLILINHA da órbita (no ν atual), não na curva ideal — o asteroide
    // cai exatamente sobre a linha desenhada, mesma garantia dos planetas. Desvio zero em qualquer
    // distância, inclusive no afélio de cometas.
    const sampleAt = (date: Date): [number, number, number] | null => {
        const g = orbitGeometryFromElements(elements);
        const nu = trueAnomalyNow(elements, date);
        if (!g || nu === null) return null;
        return sampleHeliocentricEllipseAtNu(g, nu, ORBIT_ELLIPSE_SEGMENTS);
    };
    const [asteroidScenePos, setAsteroidScenePos] = useState<[number, number, number] | null>(() => sampleAt(new Date()));
    useEffect(() => {
        const tick = () => setAsteroidScenePos(sampleAt(new Date()));
        tick();
        const id = window.setInterval(tick, 60 * 1000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elements]);

    return (
        <group>
            <directionalLight position={[0, 0, 0]} intensity={2.2} color="#fff6e8" />
            <pointLight position={[0, 0, 0]} intensity={0.5} distance={ORBIT_AU_SCALE * 8} color="#ffdca8" />
            <Sun position={[0, 0, 0]} radius={SUN_RADIUS_SCENE} locale={locale} />

            {orbitPoints ? <OrbitLineHelio points={orbitPoints} color={color} opacity={0.95} /> : null}

            {asteroidScenePos ? (
                <group position={asteroidScenePos}>
                    <mesh>
                        <sphereGeometry args={[ASTEROID_RADIUS_HELIO, 24, 24]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.7} />
                    </mesh>
                    <ScreenLabel position={[0, ASTEROID_RADIUS_HELIO + 0.18, 0]} emphasized protectFromFocus={false}>
                        <span className="font-semibold">{asteroidName}</span>
                    </ScreenLabel>
                </group>
            ) : (
                <FocusProtectedHtml position={[0, ORBIT_AU_SCALE * 0.4, 0]}>
                    <div className="rounded-md border border-amber-400/40 bg-space-950/90 px-3 py-2 text-[12px] text-amber-100">
                        {en
                            ? 'Position on this orbit unavailable — elements lack a perihelion epoch.'
                            : 'Posição nesta órbita indisponível — elementos sem época de periélio.'}
                    </div>
                </FocusProtectedHtml>
            )}
        </group>
    );
}
