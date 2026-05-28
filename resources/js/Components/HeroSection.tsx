import { Link } from '@inertiajs/react';
import { ArrowRight, Earth, Orbit, Radar } from 'lucide-react';
import { MissionStatCard } from './MissionStatCard';
import { SpaceBackground } from './SpaceBackground';

export function HeroSection() {
    return (
        <SpaceBackground>
            <section className="border-b border-white/10">
                <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-3 py-1 text-sm text-signal-cyan">
                            <Radar className="size-4" aria-hidden="true" />
                            Observatório digital com dados da NASA
                        </div>
                        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                            Um observatório digital para acompanhar o cosmos
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
                            Acompanhe aproximações cósmicas e contemple registros reais do nosso planeta em uma experiência de descoberta.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link className="inline-flex items-center gap-2 rounded bg-signal-cyan px-5 py-3 text-sm font-semibold text-space-950 shadow-glow transition hover:bg-white" href="/radar">
                                Iniciar observação
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                            <Link className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]" href="/epic">
                                Contemplar a Terra
                            </Link>
                        </div>
                    </div>

                    <div className="relative min-h-[30rem] overflow-hidden rounded-xl border border-white/10 bg-space-950/70 shadow-glow backdrop-blur">
                        <div className="absolute inset-0 star-field opacity-40" aria-hidden="true" />
                        <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-signal-cyan/25" aria-hidden="true" />
                        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" aria-hidden="true" />
                        <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a78bfa]/20" aria-hidden="true" />
                        <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#76e4b5_0,#1c6b78_35%,#10202f_70%)] shadow-[0_0_80px_rgba(84,214,214,0.28)]" aria-label="Ilustração estilizada da Terra vista de um painel orbital" />
                        <div className="absolute left-[18%] top-[22%] flex items-center gap-2 rounded-lg border border-white/10 bg-space-900/80 px-3 py-2 text-sm text-white/75 backdrop-blur">
                            <Orbit className="size-4 text-signal-amber" aria-hidden="true" />
                            NeoWs: dados orbitais
                        </div>
                        <div className="absolute bottom-[18%] right-[12%] flex items-center gap-2 rounded-lg border border-white/10 bg-space-900/80 px-3 py-2 text-sm text-white/75 backdrop-blur">
                            <Earth className="size-4 text-signal-mint" aria-hidden="true" />
                            EPIC: imagens reais
                        </div>
                    </div>
                </div>

                <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
                    <MissionStatCard label="NeoWs" value="7 dias" description="Intervalo máximo por consulta, validado no backend." />
                    <MissionStatCard label="EPIC" value="NASA" description="Imagens reais da Terra, buscadas por data." />
                    <MissionStatCard label="Segurança" value="0 keys" description="Nenhuma chave sensível exposta ao navegador." />
                </div>
            </section>
        </SpaceBackground>
    );
}
