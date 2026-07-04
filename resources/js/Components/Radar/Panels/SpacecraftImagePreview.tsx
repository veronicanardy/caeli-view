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
 * /images/spacecraft/. Todas são arte oficial NASA enquadrada na própria sonda (preenche o frame, lê
 * bem em miniatura). Voyager 1 e 2 usam artes DISTINTAS (PIA17049 vs PIA26353), não a mesma imagem das
 * gêmeas; Pioneer 10 e 11 também (foto da missão vs pintura de Wilson Hurley em Saturno). Fontes:
 * Voyager PIA17049/PIA26353, Juno PIA21770, Pioneer 10 (Pioneer mission page), Pioneer 11
 * ARC-2000-80-HC-251, New Horizons PIA10075, James Webb (arte conceitual GSFC/STScI), Parker Solar
 * Probe (arte JHUAPL "Observing the Sun"), Europa Clipper PIA26068. Crédito = a atribuição oficial de
 * cada imagem.
 */
const SPACECRAFT_IMAGE: Record<string, ImageConfig> = {
    // cover por padrão. position aponta para ONDE a sonda está em cada foto (várias não a têm no centro
    // do quadro), centralizando a nave no frame; scale aproxima quando ela aparece pequena. Juno fica em
    // cover puro: a sonda já cai bem na faixa central do recorte.
    'spacecraft:-31': { src: '/images/spacecraft/voyager-1.jpg',    credit: 'NASA/JPL-Caltech', position: '40% 42%', scale: 1.1 },
    'spacecraft:-32': { src: '/images/spacecraft/voyager-2.jpg',    credit: 'NASA/JPL-Caltech', position: '50% 48%', scale: 1.15 },
    'spacecraft:-23': { src: '/images/spacecraft/pioneer-10.jpg',   credit: 'NASA',             position: '45% 45%' },
    // Pintura em Saturno digitalizada de um cartão com borda branca: o scale empurra a borda pra fora
    // do recorte e a faixa fica em Saturno com a sonda em primeiro plano.
    'spacecraft:-24': { src: '/images/spacecraft/pioneer-11.jpg',   credit: 'NASA/Ames/Wilson Hurley', position: '50% 58%', scale: 1.25 },
    'spacecraft:-98': { src: '/images/spacecraft/new-horizons.jpg', credit: 'NASA/JHUAPL/SwRI', position: '38% 60%' },
    'spacecraft:-61': { src: '/images/spacecraft/juno.jpg',         credit: 'NASA/JPL-Caltech' },
    'spacecraft:-170': { src: '/images/spacecraft/jwst.jpg',        credit: 'NASA-GSFC/CIL',    position: '45% 42%' },
    'spacecraft:-96': { src: '/images/spacecraft/parker-solar-probe.jpg', credit: 'NASA/JHUAPL/Steve Gribben', position: '42% 55%' },
    'spacecraft:-159': { src: '/images/spacecraft/europa-clipper.jpg',    credit: 'NASA/JPL-Caltech', position: '50% 60%' },
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
