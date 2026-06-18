/**
 * Texto de transparência (afiliação, fontes e limites da visualização).
 *
 * Responsabilidade: ser a fonte única do copy de transparência usado tanto no rodapé global
 * (AppLayout) quanto dentro do guia do radar (TechnicalManual), evitando duplicar o texto entre
 * lugares. Não renderiza nada nem decide layout, só devolve as strings por locale.
 */

export type TransparencyCopy = {
    label: string;
    title: string;
    subtitle: string;
    paragraphs: string[];
};

export function transparencyCopy(locale: 'pt-BR' | 'en'): TransparencyCopy {
    if (locale === 'en') {
        return {
            label: 'Transparency',
            title: 'Sources and visualization limits',
            subtitle: 'Independent educational interface built around public space data.',
            paragraphs: [
                'CaeliView is an independent project and is not affiliated with, sponsored by, or endorsed by NASA, JPL, or Caltech.',
                'Data sources: NASA/JPL CNEOS, NASA/JPL Horizons, and NASA public APIs, as indicated throughout the experience.',
                'Visualizations are educational and may use visual scale choices, approximations, and fallbacks. For official information, consult the original sources.',
            ],
        };
    }

    return {
        label: 'Transparência',
        title: 'Fontes e limites da visualização',
        subtitle: 'Interface educativa independente construída a partir de dados públicos do espaço.',
        paragraphs: [
            'CaeliView é um projeto independente e não é afiliado, patrocinado ou endossado pela NASA, JPL ou Caltech.',
            'Fontes de dados: NASA/JPL CNEOS, NASA/JPL Horizons e APIs públicas da NASA, conforme indicado ao longo da experiência.',
            'As visualizações são educativas e podem usar escolhas visuais de escala, aproximações e fallbacks. Para informações oficiais, consulte as fontes originais.',
        ],
    };
}
