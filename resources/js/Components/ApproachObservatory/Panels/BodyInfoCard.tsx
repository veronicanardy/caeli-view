/**
 * Card informativo para corpos celestes de referência (Terra, Lua, Mercúrio…).
 *
 * Design: mesmo container do FocusCard — altura fixa, posição consistente.
 * Conteúdo: dados físicos básicos + contexto de papel no Caeli.
 * Não substitui o FocusCard de asteroides — coexistem em slots diferentes.
 */

interface BodyFact {
    labelPt: string;
    labelEn: string;
    value: string;
}

interface BodyConfig {
    namePt: string;
    nameEn: string;
    subtitlePt: string;
    subtitleEn: string;
    contextPt: string;
    contextEn: string;
    dotColor: string;
    facts: BodyFact[];
}

const BODIES: Record<'earth' | 'moon' | 'sun' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune', BodyConfig> = {
    sun: {
        namePt: 'Sol',
        nameEn: 'Sun',
        subtitlePt: 'Estrela · Centro do Sistema Solar',
        subtitleEn: 'Star · Center of the Solar System',
        contextPt: 'A estrela que ancora todo o sistema. Sua luz define o lado diurno dos corpos e sua gravidade mantém planetas, asteroides e cometas em movimento ao seu redor.',
        contextEn: 'The star that anchors the whole system. Its light defines the daylight side of bodies, and its gravity keeps planets, asteroids, and comets moving around it.',
        dotColor: '#f5c842',
        facts: [
            { labelPt: 'Distância da Terra',  labelEn: 'Distance from Earth',  value: '149,6 mi km (1 UA) / 149.6M km (1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '1.392.700 km (109× a Terra)' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '~25 dias (equador) / ~25 days (equator)' },
            { labelPt: 'Temperatura (sup.)',  labelEn: 'Temperature (surf.)',   value: '~5.500 °C / ~9.900 °F' },
            { labelPt: 'Tipo espectral',      labelEn: 'Spectral type',        value: 'G2V (anã amarela / yellow dwarf)' },
        ],
    },

    earth: {
        namePt: 'Terra',
        nameEn: 'Earth',
        subtitlePt: 'Planeta · Referência do Radar',
        subtitleEn: 'Planet · Radar Reference',
        contextPt: 'O ponto de partida do radar. É daqui que as distâncias fazem sentido: cada aproximação, escala e trajetória é interpretada em relação ao nosso planeta.',
        contextEn: 'The radar’s starting point. From here, distances gain meaning: every approach, scale, and trajectory is interpreted in relation to our planet.',
        dotColor: '#4a9eff',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '149,6 milhões km (1 UA) / 149.6 million km (1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.742 km' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '365,25 dias / 365.25 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24 horas / 24 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '1 Lua / Moon' },
        ],
    },

    moon: {
        namePt: 'Lua',
        nameEn: 'Moon',
        subtitlePt: 'Satélite natural · Régua de escala',
        subtitleEn: 'Natural satellite · Scale marker',
        contextPt: 'A régua mais intuitiva do espaço próximo. Quando um objeto aparece a 1 DL, ele está aproximadamente à distância média entre a Terra e a Lua.',
        contextEn: 'The most intuitive ruler for nearby space. When an object appears at 1 LD, it is roughly at the average distance between Earth and the Moon.',
        dotColor: '#c2c4c8',
        facts: [
            { labelPt: 'Distância da Terra',  labelEn: 'Distance from Earth',  value: '~384.400 km (1 DL)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '3.474 km (27% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '27,3 dias / 27.3 days' },
            { labelPt: 'Rotação',             labelEn: 'Rotation',             value: 'Síncrona (face travada / tidally locked)' },
            { labelPt: 'Fases',               labelEn: 'Phases',               value: 'Ciclo de 29,5 dias / 29.5-day cycle' },
        ],
    },

    mercury: {
        namePt: 'Mercúrio',
        nameEn: 'Mercury',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Pequeno, veloz e extremo. Mercúrio dá uma volta ao redor do Sol em apenas 88 dias e percorre a órbita mais elíptica entre os oito planetas — ora mais distante, ora perigosamente próximo do Sol, onde suas condições ficam ainda mais severas.',
        contextEn: 'Small, fast, and extreme. Mercury completes an orbit around the Sun in only 88 days and follows the most elliptical orbit among the eight planets — at times farther away, at times dangerously close to the Sun, where its already harsh conditions become even more severe.',
        dotColor: '#b0b8c8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '57,9 mi km (0,387 UA) / 57.9M km (0.387 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '4.880 km (38% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '88 dias / 88 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '58,6 dias / 58.6 days' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
        ],
    },

    venus: {
        namePt: 'Vênus',
        nameEn: 'Venus',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Quase do tamanho da Terra, mas com um destino completamente diferente: atmosfera densa, calor extremo e nuvens que refletem tanta luz que o tornam o planeta mais brilhante no nosso céu.',
        contextEn: 'Nearly Earth-sized, but with a completely different fate: a dense atmosphere, extreme heat, and clouds so reflective that they make it the brightest planet in our sky.',
        dotColor: '#c8b870',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '108,2 mi km (0,723 UA) / 108.2M km (0.723 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.104 km (95% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '224,7 dias / 224.7 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '243 dias (retrógrado) / 243 days (retrograde)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
        ],
    },

    mars: {
        namePt: 'Marte',
        nameEn: 'Mars',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'O planeta vermelho. Sua cor vem do óxido de ferro na superfície, e sua órbita é mais elíptica que a da Terra — por isso sua distância até nós varia bastante ao longo dos anos.',
        contextEn: 'The Red Planet. Its color comes from iron oxide on the surface, and its orbit is more elliptical than Earth’s — which is why its distance from us varies significantly over the years.',
        dotColor: '#c87070',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '227,9 mi km (1,524 UA) / 227.9M km (1.524 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '6.779 km (53% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '687 dias / 687 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24,6 horas / 24.6 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Dois / Two' },
        ],
    },

    jupiter: {
        namePt: 'Júpiter',
        nameEn: 'Jupiter',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'O gigante gravitacional do Sistema Solar. Júpiter é tão massivo que influencia a arquitetura de órbitas, captura luas e perturba trajetórias de pequenos corpos.',
        contextEn: 'The Solar System’s gravitational giant. Jupiter is so massive that it shapes orbital architecture, captures moons, and perturbs the paths of small bodies.',
        dotColor: '#c8a060',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '778,5 mi km (5,203 UA) / 778.5M km (5.203 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '142.984 km (11,2× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '11,86 anos / 11.86 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '9h 55min (mais rápido do SS)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '95 (Io, Europa, Ganimedes, Calisto…)' },
        ],
    },

    saturn: {
        namePt: 'Saturno',
        nameEn: 'Saturn',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'O planeta dos anéis. Eles parecem sólidos à distância, mas são formados por incontáveis fragmentos de gelo e rocha orbitando em uma estrutura fina e imensa.',
        contextEn: 'The ringed planet. From afar, the rings look solid, but they are made of countless pieces of ice and rock orbiting in a vast, thin structure.',
        dotColor: '#c8a840',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '1.432 mi km (9,537 UA) / 1.432B km (9.537 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '120.536 km (9,45× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '29,46 anos / 29.46 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '10h 39min' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '146 (Titã, Encélado, Réia…)' },
        ],
    },

    uranus: {
        namePt: 'Urano',
        nameEn: 'Uranus',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'Um planeta quase deitado. Urano provavelmente foi tombado por colisões gigantescas no início do Sistema Solar; por isso avança pela órbita como se estivesse rolando, com estações longas e muito incomuns.',
        contextEn: 'A planet almost lying on its side. Uranus was likely tilted by giant collisions early in the Solar System, so it moves along its orbit as if it were rolling, creating long and unusual seasons.',
        dotColor: '#4ab8c8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '2.871 mi km (19,2 UA) / 2.871B km (19.2 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '51.118 km (4× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '84 anos / 84 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '17h 14min (retrógrado)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '28 (Titânia, Oberon, Ariel…)' },
        ],
},

    neptune: {
        namePt: 'Netuno',
        nameEn: 'Neptune',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'Azul, distante e dinâmico. Netuno recebe pouca luz solar, mas sua atmosfera ainda produz ventos violentos e sistemas climáticos intensos.',
        contextEn: 'Blue, distant, and dynamic. Neptune receives little sunlight, yet its atmosphere still produces violent winds and intense weather systems.',
        dotColor: '#2878d8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '4.495 mi km (30,1 UA) / 4.495B km (30.1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '49.528 km (3,9× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '165 anos / 165 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '16h 6min' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '16 (Tritão, Nereida…)' },
        ],
    },
};
import type { Ref } from 'react';
import { PanelShell } from './PanelShell';

interface BodyInfoCardProps {
    body: 'earth' | 'moon' | 'sun' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
    onClose: () => void;
    locale: 'pt-BR' | 'en';
    mobileTopAlign?: boolean;
    panelRef?: Ref<HTMLDivElement>;
}

export function BodyInfoCard({ body, onClose, locale, mobileTopAlign, panelRef }: BodyInfoCardProps) {
    const en = locale === 'en';
    const cfg = BODIES[body];

    // Split bilingual values at " / " for clean display
    const val = (raw: string) => {
        const parts = raw.split(' / ');
        return en ? (parts[1] ?? parts[0]) : parts[0];
    };

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close' : 'Fechar'}
            eyebrow={en ? cfg.subtitleEn : cfg.subtitlePt}
            title={en ? cfg.nameEn : cfg.namePt}
            dotColor={cfg.dotColor}
            className="flex h-[24vh] max-h-[24vh] flex-col sm:h-auto sm:max-h-none w-[min(17rem,calc(100vw-6rem))] sm:w-[min(22rem,48%)]"
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            {/* Context note + facts — scroll em mobile quando o conteúdo ultrapassa max-h */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:overflow-visible">
                <div className="px-2.5 pb-2.5 pt-1.5 pr-1.5 sm:px-3 sm:pb-3 sm:pt-2 sm:pr-2">
                    <p className="text-[12px] leading-relaxed text-white/55 sm:text-[13px]">
                        {en ? cfg.contextEn : cfg.contextPt}
                    </p>

                    {/* Facts */}
                    <dl className="mt-2 space-y-1 text-[12px] sm:mt-2.5 sm:text-[13px]">
                        {cfg.facts.map((f) => (
                            <div key={f.labelEn} className="flex items-baseline justify-between gap-3">
                                <dt className="shrink-0 text-white/45">{en ? f.labelEn : f.labelPt}</dt>
                                <dd className="text-right font-medium text-white/80">{val(f.value)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </PanelShell>
    );
}
