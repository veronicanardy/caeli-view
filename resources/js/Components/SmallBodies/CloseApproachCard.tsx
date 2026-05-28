import { Link } from '@inertiajs/react';
import { CalendarDays, MoveRight } from 'lucide-react';
import { compactKm, formatNumber } from '@/lib/format';
import { JplCloseApproach } from '@/types';
import { ApproachDistanceScale } from './ApproachDistanceScale';
import { ObjectTypeBadge } from './ObjectTypeBadge';
import { VelocityIndicator } from './VelocityIndicator';

export function CloseApproachCard({ approach }: { approach: JplCloseApproach }) {
    return (
        <Link
            href={`/radar/objetos/${encodeURIComponent(approach.detailId)}`}
            className="group rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow outline-none transition hover:-translate-y-1 hover:border-signal-cyan/35 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <ObjectTypeBadge type={approach.objectType} />
                    <h3 className="mt-3 text-lg font-semibold text-white">{approach.displayName}</h3>
                    <p className="mt-1 text-sm text-white/55">{approach.designation}</p>
                </div>
                <MoveRight className="size-5 text-white/35 transition group-hover:text-signal-cyan" aria-hidden="true" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-white/65">
                <CalendarDays className="size-4 text-signal-cyan" aria-hidden="true" />
                {approach.calendarDate ?? 'Data ainda sem precisão visual'}
            </div>
            <div className="mt-5 space-y-4">
                <ApproachDistanceScale distanceAu={approach.distanceAu} label={compactKm(approach.distanceKm)} />
                <VelocityIndicator velocityKmS={approach.relativeVelocityKmS} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <dt className="text-white/45">Corpo</dt>
                    <dd className="text-white/80">{approach.approachBody ?? 'Terra'}</dd>
                </div>
                <div>
                    <dt className="text-white/45">Magnitude H</dt>
                    <dd className="text-white/80">{formatNumber(approach.absoluteMagnitude, 2)}</dd>
                </div>
            </dl>
        </Link>
    );
}
