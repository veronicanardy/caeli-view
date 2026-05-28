import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/Components/AppLayout';
import { EmptyState } from '@/Components/EmptyState';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { PageHeader } from '@/Components/PageHeader';
import { compactKm, formatDate, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { Asteroid, CloseApproach, PageProps } from '@/types';

type Props = PageProps<{
    asteroid: Asteroid | null;
    error?: string | null;
}>;

export default function AsteroidShow({ asteroid, error }: Props) {
    return (
        <AppLayout>
            <Head title={asteroid?.name ?? 'Asteroide'} />
            <PageHeader
                eyebrow="Detalhe NeoWs"
                title={asteroid?.name ?? 'Asteroide'}
                description="A classificação de potencialmente perigoso indica critérios orbitais e tamanho estimado para monitoramento astronômico. Não significa impacto previsto."
                actions={
                    <Link className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.12]" href="/radar">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Voltar ao Radar
                    </Link>
                }
            />
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <ErrorMessage message={error} />
                {!asteroid ? (
                    <EmptyState title="Asteroide não carregado" message="Não foi possível obter os detalhes agora. Tente novamente em alguns minutos." />
                ) : (
                    <>
                        <div className="grid gap-5 lg:grid-cols-3">
                            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-glow">
                                <p className="text-sm text-white/60">Diâmetro estimado</p>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {formatNumber(asteroid.estimatedDiameterMinKm, 3)} a {formatNumber(asteroid.estimatedDiameterMaxKm, 3)} km
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-glow">
                                <p className="text-sm text-white/60">Classificação</p>
                                <p className={`mt-2 text-2xl font-semibold ${asteroid.potentiallyHazardous ? 'text-signal-coral' : 'text-signal-mint'}`}>
                                    {asteroid.potentiallyHazardous ? 'Potencialmente perigoso' : 'Monitorado'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-glow">
                                <p className="text-sm text-white/60">Fonte externa</p>
                                {asteroid.nasaJplUrl ? (
                                    <a className="mt-2 inline-flex items-center gap-2 text-signal-cyan hover:text-white" href={asteroid.nasaJplUrl} target="_blank" rel="noreferrer">
                                        NASA JPL
                                        <ExternalLink className="size-4" aria-hidden="true" />
                                    </a>
                                ) : (
                                    <p className="mt-2 text-white/60">Link indisponível</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-glow">
                            <h2 className="text-lg font-semibold text-white">Histórico de aproximações com a Terra</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                                Esta tabela mostra registros conhecidos de aproximações deste objeto com a Terra, quando disponíveis na NASA NeoWs.
                            </p>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/10 text-sm">
                                    <thead className="text-left text-white/60">
                                        <tr>
                                            <th className="py-3 pr-4 font-medium">Data</th>
                                            <th className="py-3 pr-4 font-medium">Período</th>
                                            <th className="py-3 pr-4 font-medium">Corpo orbitado</th>
                                            <th className="py-3 pr-4 font-medium">Velocidade</th>
                                            <th className="py-3 pr-4 font-medium">Distância da Terra</th>
                                            <th className="py-3 pr-4 font-medium">Comparação com a Lua</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {earthApproaches(asteroid.closeApproaches).map((approach, index) => (
                                            <tr key={`${approach.date}-${index}`}>
                                                <td className="py-3 pr-4 text-white/70">{approach.dateTime ?? formatDate(approach.date)}</td>
                                                <td className="py-3 pr-4 text-white/70">{approachMoment(approach)}</td>
                                                <td className="py-3 pr-4 text-white/70">{orbitingBodyLabel(approach.orbitingBody)}</td>
                                                <td className="py-3 pr-4 text-white/70">{formatNumber(approach.velocityKmPerHour, 0)} km/h</td>
                                                <td className="py-3 pr-4 text-white/70">{compactKm(approach.missDistanceKm)}</td>
                                                <td className="py-3 pr-4 text-white/70">{lunarDistanceLabel(lunarDistanceFromKm(approach.missDistanceKm) ?? approach.missDistanceLunar)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </AppLayout>
    );
}

function earthApproaches(approaches: CloseApproach[]): CloseApproach[] {
    return approaches.filter((approach) => !approach.orbitingBody || ['earth', 'terra'].includes(approach.orbitingBody.toLowerCase()));
}

function approachMoment(approach: CloseApproach): string {
    const date = approach.dateTime ?? approach.date;

    if (!date) {
        return 'Sem data';
    }

    return new Date(date.replace(' ', 'T')).getTime() < Date.now() ? 'Passada' : 'Futura';
}

function orbitingBodyLabel(body: string | null): string {
    if (!body) {
        return 'Terra';
    }

    return body.toLowerCase() === 'earth' ? 'Terra' : body;
}
