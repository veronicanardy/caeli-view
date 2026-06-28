/**
 * Preview de foto real estática de uma nave no topo do card de foco.
 *
 * Responsabilidade: mostrar a foto/arte oficial da nave (NASA/JPL) no mesmo frame e estilo do
 * BodyImagePreview dos corpos celestes, com crédito embutido. Espelha aquele componente de propósito,
 * para nave e planeta terem a mesma identidade visual no card. As imagens são servidas localmente
 * (/images/spacecraft/), não buscam URL externa.
 *
 * Quando a nave não tem foto cadastrada (ou o arquivo falha ao carregar), cai no SpacecraftCardPreview
 * (ilustração SVG), que nunca quebra. Assim a foto é um aprimoramento progressivo: o card funciona com
 * ou sem ela, e adicionar a foto de uma nave nova é só registrar a entrada aqui e soltar o arquivo.
 */

import { useState } from 'react';
import { knownSpacecraftById } from '../Bodies/Spacecraft/knownSpacecraft';
import { SpacecraftCardPreview } from './SpacecraftCardPreview';

type ImageConfig = {
    src: string;
    credit: string;
    /** cover preenche o frame (pode cortar bordas); contain mostra a nave inteira. Default contain. */
    fit?: 'cover' | 'contain';
    position?: string;
    /** Escala fina do conteúdo no frame, quando a nave fica pequena ou grande demais. */
    scale?: number;
};

/**
 * Foto por id sintético da nave (spacecraft:<horizonsId>), casando com knownSpacecraftId. Naves sem
 * entrada aqui usam a ilustração SVG. Arquivos em public/images/spacecraft/, servidos em
 * /images/spacecraft/. Todas são arte conceitual oficial NASA enquadrada na própria sonda (preenche o
 * frame, lê bem em miniatura). Voyager 1 e 2 usam artes DISTINTAS (PIA17049 vs PIA26353), não a mesma
 * imagem das gêmeas. Fontes: Voyager PIA17049/PIA26353, Juno PIA21770, Pioneer 10 (Pioneer mission
 * page), New Horizons PIA10075. Crédito = a atribuição oficial de cada imagem.
 */
const SPACECRAFT_IMAGE: Record<string, ImageConfig> = {
    // cover por padrão. position aponta para ONDE a sonda está em cada foto (várias não a têm no centro
    // do quadro), centralizando a nave no frame; scale aproxima quando ela aparece pequena. Juno fica em
    // cover puro: a sonda já cai bem na faixa central do recorte.
    'spacecraft:-31': { src: '/images/spacecraft/voyager-1.jpg',    credit: 'NASA/JPL-Caltech', position: '40% 42%', scale: 1.1 },
    'spacecraft:-32': { src: '/images/spacecraft/voyager-2.jpg',    credit: 'NASA/JPL-Caltech', position: '50% 48%', scale: 1.15 },
    'spacecraft:-23': { src: '/images/spacecraft/pioneer-10.jpg',   credit: 'NASA',             position: '45% 45%' },
    'spacecraft:-98': { src: '/images/spacecraft/new-horizons.jpg', credit: 'NASA/JHUAPL/SwRI', position: '38% 60%' },
    'spacecraft:-61': { src: '/images/spacecraft/juno.jpg',         credit: 'NASA/JPL-Caltech' },
};

export function SpacecraftImagePreview({ id, name }: { id: string; name: string }) {
    const config = SPACECRAFT_IMAGE[id];
    const [failed, setFailed] = useState(false);

    // Sem foto cadastrada ou falha de carga: cai na ilustração SVG (nunca quebra).
    if (!config || failed) {
        const craft = knownSpacecraftById(id);
        return <SpacecraftCardPreview name={craft?.name ?? name} />;
    }

    const { src, credit, fit = 'cover', position = 'center', scale } = config;

    return (
        <div className="mx-3 mt-1.5 lg:mx-4 lg:mt-2.5">
            {/* cover (zoom para preencher): a foto ocupa o frame inteiro, sem bordas pretas que davam o
                aspecto de "quadrado" destacado no card. As fotos têm resolução muito acima do frame, então
                o zoom não pixela. O recorte pode cortar bordas da cena; objectPosition por nave mantém a
                sonda enquadrada. */}
            <div
                className="relative h-14 overflow-hidden rounded-xl border border-white/6 lg:h-[clamp(3.5rem,9vh,7rem)]"
                style={{ background: '#000' }}
            >
                <img
                    src={src}
                    alt={name}
                    className="absolute inset-0 h-full w-full"
                    style={{
                        objectFit: fit,
                        objectPosition: position,
                        transform: scale !== undefined ? `scale(${scale})` : undefined,
                        transformOrigin: 'center',
                    }}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                />
                <p className="absolute bottom-1.5 right-2 z-10 text-[9px] text-white/25 tracking-wide">{credit}</p>
            </div>
        </div>
    );
}
