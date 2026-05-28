import type { UnifiedApproach } from '@/types';

export type AsteroidIdentity = {
    rawName: string;
    permanentNumber: string | null;
    properName: string | null;
    provisionalDesignation: string | null;
    displayName: string;
    subtitle: string | null;
    aliases: string[];
};

export function normalizeAsteroidIdentity(rawName: string): AsteroidIdentity {
    const raw = rawName.trim() || 'Objeto monitorado';
    let permanentNumber: string | null = null;
    let properName: string | null = null;
    let provisionalDesignation: string | null = null;

    const onlyParens = raw.match(/^\(([^)]+)\)$/);
    if (onlyParens) {
        provisionalDesignation = clean(onlyParens[1]);
    }

    const numbered = raw.match(/^(\d+)\s+(.+?)(?:\s*\(([^)]+)\))?$/);
    if (numbered) {
        permanentNumber = clean(numbered[1]);
        let middle = clean(numbered[2]);
        let paren = clean(numbered[3] ?? null);
        if (middle && /^\(([^)]+)\)$/.test(middle)) {
            paren = clean(middle.slice(1, -1)) ?? paren;
            middle = null;
        }
        if (paren) provisionalDesignation = paren;

        if (middle && !/^\d{4}\s+[A-Z]{1,3}\d*$/i.test(middle)) {
            properName = middle;
        } else if (!provisionalDesignation && middle && /^\d{4}\s+[A-Z]{1,3}\d*$/i.test(middle)) {
            provisionalDesignation = middle;
        }
    } else if (!provisionalDesignation) {
        const inParens = raw.match(/\(([^)]+)\)/);
        if (inParens) provisionalDesignation = clean(inParens[1]);
    }

    if (!properName && !/^\d+$/.test(raw) && !provisionalDesignation) {
        properName = clean(raw);
    }

    const displayName = properName
        ?? provisionalDesignation
        ?? (permanentNumber ? `Objeto ${permanentNumber}` : stripOuterParens(raw));

    let subtitle: string | null = null;
    if (properName && permanentNumber && provisionalDesignation) {
        subtitle = `${permanentNumber} · designação ${provisionalDesignation}`;
    } else if ((properName && permanentNumber) || (permanentNumber && provisionalDesignation)) {
        subtitle = `Objeto numerado ${permanentNumber}`;
    } else if (provisionalDesignation) {
        subtitle = 'Designação provisória';
    }

    const aliases = dedupe([
        permanentNumber,
        properName,
        permanentNumber && properName ? `${permanentNumber} ${properName}` : null,
        provisionalDesignation,
        permanentNumber && provisionalDesignation ? `${permanentNumber} ${provisionalDesignation}` : null,
        displayName,
    ]);

    return {
        rawName: raw,
        permanentNumber,
        properName,
        provisionalDesignation,
        displayName,
        subtitle,
        aliases,
    };
}

export function resolveApproachIdentity(approach: UnifiedApproach): AsteroidIdentity {
    if (approach.displayName || approach.subtitle || approach.aliases?.length) {
        return {
            rawName: approach.rawName ?? approach.name,
            permanentNumber: approach.permanentNumber ?? null,
            properName: approach.properName ?? null,
            provisionalDesignation: approach.provisionalDesignation ?? approach.designation ?? null,
            displayName: approach.displayName ?? approach.name,
            subtitle: approach.subtitle ?? null,
            aliases: dedupe([
                ...(approach.aliases ?? []),
                approach.rawName ?? approach.name,
                approach.name,
                approach.designation ?? null,
            ]),
        };
    }

    return normalizeAsteroidIdentity(approach.rawName ?? approach.name);
}

function dedupe(items: Array<string | null | undefined>): string[] {
    const out: string[] = [];
    for (const item of items) {
        const value = clean(item);
        if (!value || out.includes(value)) continue;
        out.push(value);
    }
    return out;
}

function clean(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized ? normalized : null;
}

function stripOuterParens(value: string): string {
    const match = value.match(/^\(([^)]+)\)$/);
    return clean(match?.[1] ?? value) ?? 'Objeto monitorado';
}
