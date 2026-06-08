/**
 * Tipos compartilhados dos corpos planetários da cena.
 *
 * Responsabilidade: centralizar contratos de props comuns a todos os planetas
 * ambiente, evitando duplicação entre Mercury, Venus, Mars e demais wrappers.
 */

export type SceneVector3 = [number, number, number];

export interface PlanetBodyProps {
    position: SceneVector3;
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}