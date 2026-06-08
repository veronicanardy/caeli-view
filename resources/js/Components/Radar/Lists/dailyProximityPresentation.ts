import { formatNumber } from '@/lib/format';
import type { AsteroidTrajectory } from '@/types';

type ObservatoryLocale = 'pt-BR' | 'en';

// Helpers de texto e status usados pelo DailyProximityList.
export function dailyReasonText(
    name: string,
    lunar: number | null,
    time: string,
    selectedDate: string,
    todaySelected: boolean,
    locale: ObservatoryLocale,
): string {
    const en = locale === 'en';
    const dateLabel = formatSelectedDay(selectedDate, locale);
    const lunarText = lunar !== null ? formatNumber(lunar, lunar < 10 ? 1 : 0) : null;

    if (todaySelected) {
        if (en) {
            return lunarText
                ? `${name} is listed because it is among the closest monitored objects right now, at ${lunarText} lunar distances. Closest approach: ${time}.`
                : `${name} is listed because it is among the closest monitored objects right now. Closest approach: ${time}.`;
        }

        return lunarText
            ? `${name} aparece porque est\u00E1 entre os objetos monitorados mais pr\u00F3ximos agora, a ${lunarText} dist\u00E2ncias lunares. M\u00E1xima aproxima\u00E7\u00E3o: ${time}.`
            : `${name} aparece porque est\u00E1 entre os objetos monitorados mais pr\u00F3ximos agora. M\u00E1xima aproxima\u00E7\u00E3o: ${time}.`;
    }

    if (en) {
        return lunarText
            ? `${name} is listed because its closest approach to Earth happens on ${dateLabel}, at ${lunarText} lunar distances. Maximum approach occurs at ${time}.`
            : `${name} is listed because its closest approach to Earth happens on ${dateLabel}. Maximum approach occurs at ${time}.`;
    }

    return lunarText
        ? `${name} est\u00E1 aqui porque sua m\u00E1xima aproxima\u00E7\u00E3o com a Terra ocorre em ${dateLabel}, a ${lunarText} dist\u00E2ncias lunares. A m\u00E1xima aproxima\u00E7\u00E3o ocorre \u00E0s ${time}.`
        : `${name} est\u00E1 aqui porque sua m\u00E1xima aproxima\u00E7\u00E3o com a Terra ocorre em ${dateLabel}. A m\u00E1xima aproxima\u00E7\u00E3o ocorre \u00E0s ${time}.`;
}

export function isToday(value: string): boolean {
    return value === localDateIso(new Date());
}

export function horizonsStatusLabel(
    trajectory: AsteroidTrajectory | null,
    isLoading: boolean,
    isFocus: boolean,
    locale: ObservatoryLocale,
): string {
    const en = locale === 'en';
    if (isLoading) return en ? 'Calculating now...' : 'Calculando agora...';
    if (trajectory?.status === 'available') return en ? 'Available' : 'Dispon\u00EDvel';
    if (trajectory?.status === 'fallback') return 'Fallback';
    if (trajectory?.status === 'unavailable') return en ? 'Unavailable' : 'Indispon\u00EDvel';
    return isFocus ? (en ? 'Waiting' : 'Aguardando') : (en ? 'Not requested' : 'N\u00E3o consultado');
}

export function motionText(
    state: AsteroidTrajectory['motionState'],
    currentLunar: number | null,
    locale: ObservatoryLocale,
): string {
    const en = locale === 'en';
    const distance = currentLunar !== null ? ` ${formatNumber(currentLunar, currentLunar < 10 ? 1 : 0)} DL` : '';

    if (state === 'approaching') {
        return en ? `Current Horizons point suggests the object is still approaching Earth.${distance}` : `O ponto atual do Horizons sugere que o objeto ainda est\u00E1 se aproximando da Terra.${distance}`;
    }

    if (state === 'receding') {
        return en ? `Current Horizons point suggests the object is moving away from Earth.${distance}` : `O ponto atual do Horizons sugere que o objeto est\u00E1 se afastando da Terra.${distance}`;
    }

    if (state === 'near_closest') {
        return en ? `Current Horizons point is near the closest-approach window.${distance}` : `O ponto atual do Horizons est\u00E1 perto da janela de m\u00E1xima aproxima\u00E7\u00E3o.${distance}`;
    }

    return en ? `Current position calculated, but motion direction is inconclusive.${distance}` : `Posi\u00E7\u00E3o atual calculada, mas a dire\u00E7\u00E3o do movimento \u00E9 inconclusiva.${distance}`;
}

export function distanceBandLabel(lunar: number | null, locale: ObservatoryLocale): string {
    const en = locale === 'en';
    if (lunar === null) return en ? 'Unknown' : 'Sem dist\u00E2ncia';
    if (lunar < 1) return en ? '0-1 LD \u00B7 Inside Moon' : '0-1 DL \u00B7 Dentro da Lua';
    if (lunar <= 5) return en ? '1-5 LD \u00B7 Very close' : '1-5 DL \u00B7 Muito pr\u00F3ximo';
    if (lunar <= 20) return en ? '5-20 LD \u00B7 Close' : '5-20 DL \u00B7 Pr\u00F3ximo';
    return en ? '20+ LD \u00B7 Monitored' : '20+ DL \u00B7 Monitorado';
}

export function formatApproachTime(value: string | null, locale: ObservatoryLocale): string {
    if (!value) return '\u2014';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formata o dia selecionado sem introduzir regra de negocio adicional.
function formatSelectedDay(value: string, locale: ObservatoryLocale): string {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parsed);
}
