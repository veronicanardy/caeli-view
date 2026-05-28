import { Earth, Orbit, Rotate3D, Satellite } from 'lucide-react';
import { EarthGlobe } from '@/Components/Nasa/EarthGlobe';
import { AtmosphereGlow } from './AtmosphereGlow';
import { FloatingMissionCard } from './FloatingMissionCard';

export function EarthStage() {
    return (
        <div className="earth-stage group/earth relative min-h-[30rem] overflow-visible lg:min-h-[42rem]">
            {/* Atmosphere glow layer */}
            <div className="absolute inset-0 transition duration-700 group-hover/earth:translate-x-3 group-hover/earth:-translate-y-2" aria-hidden="true">
                <AtmosphereGlow />
            </div>

            {/* Cross-glow: bleeds left toward the text column — creates visual unity */}
            <div className="earth-cross-glow pointer-events-none absolute inset-0" aria-hidden="true" />

            <div className="earth-orbit-ring absolute left-1/2 top-1/2 size-[21rem] -translate-x-1/2 -translate-y-1/2 sm:size-[30rem] lg:size-[44rem]" aria-hidden="true" />
            <div className="earth-orbit-ring earth-orbit-ring-wide absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 sm:size-[36rem] lg:size-[52rem]" aria-hidden="true" />

            <div className="relative z-10 mx-auto flex min-h-[30rem] items-center justify-center lg:min-h-[42rem] lg:justify-end">
                <div className="earth-image-wrap relative size-[19rem] shrink-0 rounded-full sm:size-[28rem] lg:-mr-28 lg:size-[42rem] xl:-mr-40 xl:size-[48rem]">
                    <EarthGlobe />
                    <div className="earth-limb absolute inset-0 rounded-full" aria-hidden="true" />
                </div>
            </div>

            <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
                <FloatingMissionCard
                    href="/epic"
                    icon={Earth}
                    title="Planeta em perspectiva"
                    description="Registros reais da Terra em disco completo."
                    className="pointer-events-auto absolute left-4 top-[18%] w-64 earth-card-a"
                />
                <FloatingMissionCard
                    href="/radar"
                    icon={Orbit}
                    title="Aproximações cósmicas"
                    description="Velocidades, distâncias e dimensões estimadas."
                    className="pointer-events-auto absolute bottom-[20%] left-0 w-72 earth-card-b"
                />
                <FloatingMissionCard
                    href="/apod"
                    icon={Satellite}
                    title="Descobertas do dia"
                    description="Um novo registro astronômico para abrir a jornada."
                    className="pointer-events-auto absolute right-2 top-[14%] w-64 earth-card-c"
                />
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/60 backdrop-blur lg:bottom-10 lg:left-auto lg:right-4 lg:translate-x-0">
                <Rotate3D className="size-4 text-signal-mint" aria-hidden="true" />
                <span>Globo 3D interativo</span>
                <span className="hidden text-white/40 sm:inline">Textura: NASA Blue Marble</span>
            </div>
        </div>
    );
}
