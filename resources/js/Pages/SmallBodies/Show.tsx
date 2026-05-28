import { Head } from '@inertiajs/react';
import { BadgeInfo, Fingerprint, Orbit, Sparkles } from 'lucide-react';
import { ComponentType, lazy, Suspense } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { EmptyState } from '@/Components/EmptyState';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { AsteroidUsefulSummary } from '@/Components/SmallBodies/AsteroidUsefulSummary';
import { EmptyScientificData } from '@/Components/SmallBodies/EmptyScientificData';
import { InteractiveApproachTimeline } from '@/Components/SmallBodies/InteractiveApproachTimeline';
import { ObjectDistanceComparison } from '@/Components/SmallBodies/ObjectDistanceComparison';
import { OrbitalDossierHeader } from '@/Components/SmallBodies/OrbitalDossierHeader';
import { OrbitalElementsVisualGrid } from '@/Components/SmallBodies/OrbitalElementsVisualGrid';
import { PhysicalDataVisualCards } from '@/Components/SmallBodies/PhysicalDataVisualCards';
import { SimplifiedApproachDiagram } from '@/Components/SmallBodies/SimplifiedApproachDiagram';
import { VelocityIndicator } from '@/Components/SmallBodies/VelocityIndicator';
import { useTranslation } from '@/i18n';
import { compactKm, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { PageProps, SmallBody, SmallBodyCloseApproach } from '@/types';

const AsteroidScaleComparison = lazy(() =>
    import('@/Components/SmallBodies/AsteroidScaleComparison').then((module) => ({ default: module.AsteroidScaleComparison })),
);

type Props = PageProps<{
    smallBody: SmallBody | null;
    source?: string | null;
    error?: string | null;
}>;

export default function SmallBodiesShow({ smallBody, source, error }: Props) {
    const { t } = useTranslation();
    const primaryApproach = mostRelevantApproach(smallBody?.closeApproaches ?? []);
    const diameter = diameterEstimate(smallBody);

    return (
        <AppLayout>
            <Head title={smallBody?.primaryName ?? t('object.title.fallback')} />
            {smallBody ? <OrbitalDossierHeader smallBody={smallBody} /> : null}
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <ErrorMessage message={error} />
                {!smallBody ? (
                    <EmptyState title={t('object.empty.title')} message={t('object.empty.message')} />
                ) : (
                    <>
                        <div className="text-sm text-white/55">
                            <span>{t('object.breadcrumb.observatory')}</span>
                            <span className="mx-2 text-white/25">/</span>
                            <span className="text-white/80">{smallBody.primaryName}</span>
                        </div>

                        <section className="section-slide">
                            <SectionTitle title={t('object.main.title')} subtitle={t('object.main.subtitle')} />
                            <div className="mt-4">
                                <AsteroidUsefulSummary
                                    smallBody={smallBody}
                                    approach={primaryApproach}
                                    source={source}
                                    diameterMinMeters={diameter.minMeters}
                                    diameterMaxMeters={diameter.maxMeters}
                                    diameterAverageMeters={diameter.averageMeters}
                                />
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.model.title')} subtitle={t('object.model.estimated')} />
                            <div className="mt-4">
                                <Suspense fallback={<ModelSkeleton label={t('object.model.loading')} />}>
                                    <AsteroidScaleComparison
                                        diameterMinMeters={diameter.minMeters}
                                        diameterMaxMeters={diameter.maxMeters}
                                        diameterAverageMeters={diameter.averageMeters}
                                        label={t('object.model.estimated')}
                                        note={t('object.model.realUnavailable')}
                                    />
                                </Suspense>
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.identity.title')} subtitle={t('object.identity.subtitle')} />
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <IdentityCard icon={Fingerprint} label="SPK ID" value={smallBody.spkId ?? 'Ainda sem SPK na resposta'} />
                                <IdentityCard icon={BadgeInfo} label={t('object.designation')} value={smallBody.designation ?? 'Designação não retornada'} />
                                <IdentityCard icon={Orbit} label="Classe orbital" value={smallBody.orbitClassDescription ?? smallBody.orbitClass ?? t('object.orbitClass.pending')} />
                                <IdentityCard icon={Sparkles} label="Tipo" value={smallBody.objectType === 'comet' ? 'Cometa' : smallBody.objectType === 'asteroid' ? 'Asteroide' : 'Pequeno corpo'} />
                                <IdentityCard icon={BadgeInfo} label="Magnitude H" value={formatNumber(smallBody.absoluteMagnitude, 2)} />
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.visual.title')} subtitle={t('object.visual.subtitle')} />
                            <div className="mt-4 space-y-5">
                                <ObjectDistanceComparison approach={primaryApproach} />
                                <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                                    <VelocityIndicator velocityKmS={primaryApproach?.relativeVelocityKmS} />
                                </div>
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.physical.title')} subtitle={t('object.physical.subtitle')} />
                            <div className="mt-4">
                                <PhysicalDataVisualCards smallBody={smallBody} />
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.orbit.title')} subtitle={`Trajetória calculada pelo JPL${smallBody.epoch ? ` na época ${smallBody.epoch}` : ''}.`} />
                            <div className="mt-4">
                                <OrbitalElementsVisualGrid elements={smallBody.orbitalElements} />
                            </div>
                        </section>

                        <SimplifiedApproachDiagram smallBody={smallBody} approach={primaryApproach} />

                        <section className="section-slide">
                            <SectionTitle title={t('object.approaches.title')} subtitle={t('object.approaches.subtitle')} />
                            <div className="mt-4">
                                <InteractiveApproachTimeline approaches={smallBody.closeApproaches} />
                            </div>
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.history.title')} subtitle={t('object.history.subtitle')} />
                            <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-glow">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-white/10 text-sm">
                                        <thead className="text-left text-white/60">
                                            <tr>
                                                <th className="px-5 py-4 font-medium">Data</th>
                                                <th className="px-5 py-4 font-medium">Período</th>
                                                <th className="px-5 py-4 font-medium">Distância da Terra</th>
                                                <th className="px-5 py-4 font-medium">Comparação com a Lua</th>
                                                <th className="px-5 py-4 font-medium">Velocidade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {smallBody.closeApproaches.map((approach, index) => (
                                                <tr key={`${approach.date}-${index}`} className="transition hover:bg-white/[0.04]">
                                                    <td className="px-5 py-4 text-white/70">{approach.date ?? t('common.noDate')}</td>
                                                    <td className="px-5 py-4 text-white/70">{approachMoment(approach)}</td>
                                                    <td className="px-5 py-4 text-white/70">{compactKm(approach.distanceKm)}</td>
                                                    <td className="px-5 py-4 text-white/70">{lunarDistanceLabel(lunarDistanceFromKm(approach.distanceKm) ?? approach.distanceLunar)}</td>
                                                    <td className="px-5 py-4 text-white/70">{formatNumber(approach.relativeVelocityKmH, 0)} km/h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section className="section-slide rounded-lg border border-white/10 bg-white/[0.045] p-6 text-sm leading-relaxed text-white/65 shadow-glow">
                            <SectionTitle title={t('object.units.title')} subtitle={t('object.units.body')} />
                        </section>

                        <section className="section-slide">
                            <SectionTitle title={t('object.notes.title')} subtitle={t('object.notes.subtitle')} />
                            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] p-6 text-sm leading-relaxed text-white/65 shadow-glow">
                                <p>{t('object.notes.body')}</p>
                            </div>
                        </section>

                        {!smallBody.physicalParameters.length ? (
                            <EmptyScientificData title={t('object.noPhysical.title')} message={t('object.noPhysical.message')} />
                        ) : null}
                    </>
                )}
            </section>
        </AppLayout>
    );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        </div>
    );
}

function IdentityCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string; value: string }) {
    return (
        <article className="card-enter rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <Icon className="size-5 text-signal-cyan" aria-hidden={true} />
            <p className="mt-4 text-xs text-white/45">{label}</p>
            <p className="mt-1 break-words text-base font-semibold text-white">{value}</p>
        </article>
    );
}

function ModelSkeleton({ label }: { label: string }) {
    return (
        <div className="grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] shadow-glow lg:grid-cols-[1.08fr_0.92fr]">
            <div className="min-h-[22rem] animate-pulse bg-white/[0.045]" />
            <div className="space-y-4 p-6">
                <p className="flex items-center gap-3 text-sm text-white/60"><span className="size-2.5 rounded-full bg-signal-cyan" />{label}</p>
                <div className="h-10 rounded bg-white/[0.055]" />
                <div className="h-10 rounded bg-white/[0.055]" />
                <div className="h-10 rounded bg-white/[0.055]" />
            </div>
        </div>
    );
}

function approachMoment(approach: SmallBodyCloseApproach): string {
    if (!approach.date) {
        return 'Sem data';
    }

    return new Date(approach.date.replace(/-/g, ' ')).getTime() < Date.now() ? 'Passada' : 'Futura';
}

function mostRelevantApproach(approaches: SmallBodyCloseApproach[]): SmallBodyCloseApproach | null {
    return approaches
        .filter((approach) => approach.distanceKm !== null)
        .slice()
        .sort((left, right) => (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY))[0]
        ?? approaches[0]
        ?? null;
}

function diameterEstimate(smallBody: SmallBody | null): { minMeters: number | null; maxMeters: number | null; averageMeters: number | null } {
    if (!smallBody) {
        return { minMeters: null, maxMeters: null, averageMeters: null };
    }

    if (smallBody.diameterKm) {
        const meters = smallBody.diameterKm * 1000;

        return { minMeters: meters, maxMeters: meters, averageMeters: meters };
    }

    if (!smallBody.absoluteMagnitude) {
        return { minMeters: null, maxMeters: null, averageMeters: null };
    }

    const brightRockAlbedo = 0.25;
    const darkRockAlbedo = 0.05;
    const minKm = diameterFromMagnitude(smallBody.absoluteMagnitude, brightRockAlbedo);
    const maxKm = diameterFromMagnitude(smallBody.absoluteMagnitude, darkRockAlbedo);
    const minMeters = minKm * 1000;
    const maxMeters = maxKm * 1000;

    return {
        minMeters,
        maxMeters,
        averageMeters: (minMeters + maxMeters) / 2,
    };
}

function diameterFromMagnitude(absoluteMagnitude: number, albedo: number): number {
    return (1329 / Math.sqrt(albedo)) * (10 ** (-absoluteMagnitude / 5));
}
