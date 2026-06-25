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
                'Data sources: NASA NeoWs, NASA APOD, NASA EPIC (DSCOVR), NASA/JPL CNEOS, and NASA/JPL Horizons, along with public imagery made available by NASA, JPL, and associated missions, subject to their usage guidelines and the credits indicated throughout the experience.',
                'Visualizations are educational and may use visual scale choices, approximations, and fallbacks.',
                'Data is provided as is, with no guarantee of accuracy or timeliness, and does not replace official sources. CaeliView is not responsible for decisions made based on this visualization.',
            ],
        };
    }

    return {
        label: 'Transparência',
        title: 'Fontes e limites da visualização',
        subtitle: 'Interface educativa independente construída a partir de dados públicos do espaço.',
        paragraphs: [
            'CaeliView é um projeto independente e não é afiliado, patrocinado ou endossado pela NASA, JPL ou Caltech.',
            'Fontes de dados: NASA NeoWs, NASA APOD, NASA EPIC (DSCOVR), NASA/JPL CNEOS e NASA/JPL Horizons, além de imagens públicas disponibilizadas pela NASA, JPL e missões associadas, observadas as diretrizes de uso e os créditos indicados ao longo da experiência.',
            'As visualizações são educativas e podem usar escolhas visuais de escala, aproximações e fallbacks.',
            'Os dados são fornecidos como estão, sem garantia de exatidão ou atualidade, e não substituem as fontes oficiais. O CaeliView não se responsabiliza por decisões tomadas com base nesta visualização.',
        ],
    };
}
