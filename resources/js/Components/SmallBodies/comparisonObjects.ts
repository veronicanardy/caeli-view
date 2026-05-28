export type ComparisonObjectType = 'person' | 'car' | 'bus' | 'building' | 'christ' | 'plane' | 'liberty' | 'field';

export type ComparisonObject = {
    id: ComparisonObjectType;
    labelPt: string;
    labelEn: string;
    sizeMeters: number;
    dimensionPt: string;
    dimensionEn: string;
};

export const COMPARISON_OBJECTS: ComparisonObject[] = [
    { id: 'person', labelPt: 'Pessoa', labelEn: 'Person', sizeMeters: 1.7, dimensionPt: 'altura', dimensionEn: 'height' },
    { id: 'car', labelPt: 'Carro', labelEn: 'Car', sizeMeters: 4.5, dimensionPt: 'comprimento', dimensionEn: 'length' },
    { id: 'bus', labelPt: 'Ônibus', labelEn: 'Bus', sizeMeters: 12, dimensionPt: 'comprimento', dimensionEn: 'length' },
    { id: 'building', labelPt: 'Prédio de 10 andares', labelEn: '10-story building', sizeMeters: 30, dimensionPt: 'altura', dimensionEn: 'height' },
    { id: 'christ', labelPt: 'Cristo Redentor', labelEn: 'Christ the Redeemer', sizeMeters: 38, dimensionPt: 'altura', dimensionEn: 'height' },
    { id: 'plane', labelPt: 'Avião comercial', labelEn: 'Commercial aircraft', sizeMeters: 70, dimensionPt: 'comprimento', dimensionEn: 'length' },
    { id: 'liberty', labelPt: 'Estátua da Liberdade', labelEn: 'Statue of Liberty', sizeMeters: 93, dimensionPt: 'altura', dimensionEn: 'height' },
    { id: 'field', labelPt: 'Campo de futebol', labelEn: 'Football field', sizeMeters: 105, dimensionPt: 'comprimento', dimensionEn: 'length' },
];
