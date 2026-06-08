export type SceneVector3 = [number, number, number];

export interface PlanetBodyProps {
    position: SceneVector3;
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}