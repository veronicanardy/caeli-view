import { Link } from '@inertiajs/react';
import { ArrowRight, DatabaseZap, Earth, Image, LockKeyhole, Orbit, Radar, Rocket, Satellite } from 'lucide-react';
import { Apod } from '@/types';
import { NasaHighlightCard } from './NasaHighlightCard';
import { OrbitalFeatureCard } from './OrbitalFeatureCard';
import { SpaceBackground } from './SpaceBackground';

type InteractiveHeroProps = {
    apod: Apod | null;
    apodError?: string | null;
};

export function InteractiveHero({ apod, apodError }: InteractiveHeroProps) {
    return (
        <SpaceBackground>
            <section className="border-b border-white/10">
                <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-3 py-1 text-sm text-signal-cyan">
                            <Radar className="size-4" aria-hidden="true" />
                            Observatório digital com dados reais da NASA
                        </div>
                        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                            Um observatório digital para acompanhar o cosmos
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
                            Entre aproximações cósmicas, imagens reais da Terra e registros astronômicos da NASA, o CaeliView transforma dados espaciais em uma experiência visual de descoberta.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link className="light-button inline-flex items-center gap-2 rounded bg-signal-cyan px-5 py-3 text-sm font-semibold text-space-950 shadow-glow" href="/radar">
                                Iniciar observação
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                            <Link className="light-button inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white" href="/epic">
                                Contemplar a Terra
                            </Link>
                            <Link className="light-button inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white" href="/apod">
                                Descoberta do dia
                            </Link>
                        </div>
                        <p className="mt-5 text-sm leading-6 text-white/55">
                            Dados reais da NASA, traduzidos em uma jornada visual.
                        </p>
                    </div>

                    <div className="orbital-panel relative min-h-[38rem] overflow-hidden rounded-xl border border-white/10 bg-space-950/76 p-4 shadow-glow backdrop-blur-xl sm:p-6">
                        <div className="absolute inset-0 star-field opacity-35" aria-hidden="true" />
                        <div className="orbital-ring absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                        <div className="orbital-ring orbital-ring-slow absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                        <div className="orbital-ring orbital-ring-wide absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />

                        <div className="relative z-10 mx-auto max-w-md pt-8">
                            <NasaHighlightCard apod={apod} error={apodError} />
                        </div>

                        <div className="relative z-20 mt-5 grid gap-3 sm:hidden">
                            <OrbitalFeatureCard href="/radar" icon={Orbit} title="Observatório de aproximações" description="Distâncias, velocidades e dimensões estimadas." tone="amber" />
                            <OrbitalFeatureCard href="/epic" icon={Earth} title="Planeta azul" description="Registros reais da Terra iluminada pelo Sol." tone="mint" />
                            <OrbitalFeatureCard href="/apod" icon={Image} title="Janela astronômica" description="Imagem ou vídeo astronômico da NASA." tone="violet" />
                            <OrbitalFeatureCard icon={LockKeyhole} title="Consulta segura" description="A chave da NASA fica longe do navegador." tone="cyan" />
                        </div>

                        <div className="pointer-events-none hidden sm:block">
                            <OrbitalFeatureCard href="/radar" icon={Orbit} title="Observatório de aproximações" description="Aproximações cósmicas com dados orbitais." tone="amber" className="pointer-events-auto absolute left-4 top-10 orbital-float-a" />
                            <OrbitalFeatureCard href="/epic" icon={Earth} title="Planeta azul" description="A Terra vista a milhões de quilômetros." tone="mint" className="pointer-events-auto absolute bottom-14 left-8 orbital-float-b" />
                            <OrbitalFeatureCard href="/apod" icon={Image} title="Janela astronômica" description="Uma descoberta nova para abrir o dia." tone="violet" className="pointer-events-auto absolute right-4 top-20 orbital-float-c" />
                            <OrbitalFeatureCard icon={LockKeyhole} title="Consultas seguras" description="Longe dos olhos do navegador." tone="cyan" className="pointer-events-auto absolute bottom-24 right-6 orbital-float-a" />
                            <OrbitalFeatureCard icon={DatabaseZap} title="Jornada fluida" description="Respostas rápidas durante a observação." tone="mint" className="pointer-events-auto absolute bottom-4 right-28 orbital-float-b" />
                        </div>

                        <div className="absolute right-8 top-1/2 hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60 backdrop-blur sm:flex">
                            <Satellite className="size-4 text-signal-cyan" aria-hidden="true" />
                            Laravel protege a missão
                        </div>
                        <Rocket className="absolute left-[52%] top-8 size-5 text-signal-amber orbiting-dot" aria-hidden="true" />
                    </div>
                </div>
            </section>
        </SpaceBackground>
    );
}
