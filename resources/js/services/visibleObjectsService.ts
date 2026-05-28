import * as Astronomy from 'astronomy-engine';
import { UserLocation } from '@/hooks/useUserLocation';

type ValidUserLocation = UserLocation & {
    latitude: number;
    longitude: number;
};

export type VisibleObject = {
    id: string;
    namePt: string;
    nameEn: string;
    symbol: string;
    altitude: number;
    azimuth: number;
    maxAltitude: number;
    statusPt: string;
    statusEn: string;
    detailPt: string;
    detailEn: string;
    visible: boolean;
};

const TARGETS = [
    { id: 'moon', body: Astronomy.Body.Moon, namePt: 'Lua', nameEn: 'Moon', symbol: '☾' },
    { id: 'venus', body: Astronomy.Body.Venus, namePt: 'Vênus', nameEn: 'Venus', symbol: '♀' },
    { id: 'mars', body: Astronomy.Body.Mars, namePt: 'Marte', nameEn: 'Mars', symbol: '♂' },
    { id: 'jupiter', body: Astronomy.Body.Jupiter, namePt: 'Júpiter', nameEn: 'Jupiter', symbol: '♃' },
    { id: 'saturn', body: Astronomy.Body.Saturn, namePt: 'Saturno', nameEn: 'Saturn', symbol: '♄' },
];

export function calculateVisibleObjects(location: ValidUserLocation, now = new Date()): VisibleObject[] {
    const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);

    return TARGETS.map((target) => {
        const current = horizontal(target.body, observer, now);
        const samples = nightSamples(observer, now).map((date) => ({
            date,
            horizontal: horizontal(target.body, observer, date),
        }));
        const visibleSamples = samples.filter((sample) => sample.horizontal.altitude >= 10);
        const best = samples.slice().sort((left, right) => right.horizontal.altitude - left.horizontal.altitude)[0];
        const visible = current.altitude >= 10 || visibleSamples.length > 0;
        const period = best ? periodLabel(best.date) : { pt: 'hoje', en: 'today' };
        const status = statusFor(current.altitude, best?.horizontal.altitude ?? current.altitude, visible, period);

        return {
            id: target.id,
            namePt: target.namePt,
            nameEn: target.nameEn,
            symbol: target.symbol,
            altitude: current.altitude,
            azimuth: current.azimuth,
            maxAltitude: best?.horizontal.altitude ?? current.altitude,
            statusPt: status.pt,
            statusEn: status.en,
            detailPt: `${Math.round(current.altitude)}° de altitude agora · pico de ${Math.round(best?.horizontal.altitude ?? current.altitude)}°`,
            detailEn: `${Math.round(current.altitude)}° altitude now · peaks at ${Math.round(best?.horizontal.altitude ?? current.altitude)}°`,
            visible,
        };
    });
}

export function moonIlluminationPercent(now = new Date()): number {
    const phase = Astronomy.MoonPhase(now);

    return Math.round(((1 - Math.cos(phase * Math.PI / 180)) / 2) * 100);
}

function horizontal(body: Astronomy.Body, observer: Astronomy.Observer, date: Date) {
    const equator = Astronomy.Equator(body, date, observer, true, true);

    return Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
}

function nightSamples(observer: Astronomy.Observer, now: Date): Date[] {
    const samples: Date[] = [];

    for (let hour = 0; hour <= 24; hour += 1) {
        const date = new Date(now.getTime() + hour * 60 * 60 * 1000);
        const sun = horizontal(Astronomy.Body.Sun, observer, date);

        if (sun.altitude < -4) {
            samples.push(date);
        }
    }

    return samples.length ? samples : Array.from({ length: 12 }, (_, index) => new Date(now.getTime() + (index + 1) * 2 * 60 * 60 * 1000));
}

function periodLabel(date: Date) {
    const hour = date.getHours();

    if (hour >= 18 && hour < 22) {
        return { pt: 'início da noite', en: 'early evening' };
    }

    if (hour >= 22 || hour < 2) {
        return { pt: 'noite', en: 'night' };
    }

    if (hour >= 2 && hour < 5) {
        return { pt: 'madrugada', en: 'late night' };
    }

    return { pt: 'antes do amanhecer', en: 'before dawn' };
}

function statusFor(currentAltitude: number, bestAltitude: number, visible: boolean, period: { pt: string; en: string }) {
    if (currentAltitude >= 25) {
        return { pt: 'Visível agora', en: 'Visible now' };
    }

    if (currentAltitude >= 10) {
        return { pt: 'Baixo no horizonte', en: 'Low on the horizon' };
    }

    if (visible && bestAltitude >= 25) {
        return { pt: `Melhor na ${period.pt}`, en: `Best in the ${period.en}` };
    }

    if (visible) {
        return { pt: 'Visível hoje, mas baixo', en: 'Visible today, but low' };
    }

    return { pt: 'Não favorável hoje', en: 'Not favorable today' };
}
