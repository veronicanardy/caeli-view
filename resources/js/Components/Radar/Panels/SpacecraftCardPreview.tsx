/**
 * Ilustração da nave no topo do card de foco, no lugar do modelo 3D de asteroide.
 *
 * Responsabilidade: dar identidade visual sóbria a uma nave no card (uma sonda estilizada: corpo,
 * painéis solares e antena de prato), SEM abrir um segundo canvas WebGL como o AsteroidModelPreview
 * faz. Nave não é asteroide, então o modelo de rocha girando enganava; e cada nave usaria o mesmo
 * marcador estilizado da cena, não um shape model próprio. Ícone leve em SVG basta.
 *
 * Tom frio e discreto, alinhado ao marcador da cena (SpacecraftMarker) e ao visual do produto.
 */

const ICON_COLOR = '#9fc0e8';
const PANEL_COLOR = '#2b3a55';

export function SpacecraftCardPreview({ name }: { name: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <svg
                viewBox="0 0 120 80"
                role="img"
                aria-label={name}
                className="h-20 w-auto opacity-90"
            >
                {/* Painel solar esquerdo */}
                <rect x="6" y="34" width="34" height="12" rx="1.5" fill={PANEL_COLOR} stroke={ICON_COLOR} strokeOpacity="0.4" />
                <line x1="17" y1="34" x2="17" y2="46" stroke={ICON_COLOR} strokeOpacity="0.25" />
                <line x1="28" y1="34" x2="28" y2="46" stroke={ICON_COLOR} strokeOpacity="0.25" />
                {/* Painel solar direito */}
                <rect x="80" y="34" width="34" height="12" rx="1.5" fill={PANEL_COLOR} stroke={ICON_COLOR} strokeOpacity="0.4" />
                <line x1="91" y1="34" x2="91" y2="46" stroke={ICON_COLOR} strokeOpacity="0.25" />
                <line x1="102" y1="34" x2="102" y2="46" stroke={ICON_COLOR} strokeOpacity="0.25" />
                {/* Braços até o corpo */}
                <line x1="40" y1="40" x2="48" y2="40" stroke={ICON_COLOR} strokeOpacity="0.5" strokeWidth="1.5" />
                <line x1="72" y1="40" x2="80" y2="40" stroke={ICON_COLOR} strokeOpacity="0.5" strokeWidth="1.5" />
                {/* Corpo central */}
                <rect x="48" y="32" width="24" height="16" rx="2" fill={ICON_COLOR} fillOpacity="0.2" stroke={ICON_COLOR} strokeOpacity="0.7" strokeWidth="1.5" />
                {/* Antena de prato no topo */}
                <ellipse cx="60" cy="24" rx="12" ry="5" fill="none" stroke={ICON_COLOR} strokeOpacity="0.7" strokeWidth="1.5" />
                <line x1="60" y1="29" x2="60" y2="32" stroke={ICON_COLOR} strokeOpacity="0.6" strokeWidth="1.5" />
            </svg>
        </div>
    );
}
