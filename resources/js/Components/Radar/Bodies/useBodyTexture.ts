/**
 * Hook de carregamento de textura para corpos celestes.
 *
 * Responsabilidade: carregar texturas de forma imperativa com fallback seguro,
 * retornando null enquanto a textura ainda não está pronta. Não usa Suspense
 * para permitir que os corpos renderizem um fallback visual imediatamente.
 */

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

/**
 * Carrega uma textura de corpo celeste de forma imperativa e retorna `null`
 * enquanto ela ainda não está pronta.
 *
 *
 * Por que não usar `useLoader` diretamente?
 *
 * O `useLoader` do React Three Fiber trabalha com Suspense. Isso é ótimo em
 * muitos cenários, mas aqui os corpos precisam conseguir renderizar um fallback
 * visual imediatamente enquanto a textura ainda está carregando ou caso ela falhe.
 *
 * Com este hook:
 *
 * - o componente não quebra se a textura demorar;
 * - o componente pode renderizar um material fallback;
 * - falhas de carregamento não sobem como erro para a UI;
 * - a textura é descartada no cleanup para liberar memória de GPU;
 * - cada corpo decide como se comportar enquanto a textura está ausente.
 *
 * Contrato:
 *
 * - retorna `null` enquanto a textura ainda não carregou;
 * - retorna `THREE.Texture` quando o carregamento termina com sucesso;
 * - retorna `null` se a URL estiver vazia;
 * - retorna `null` se o carregamento falhar;
 * - não lança erro para a interface;
 * - descarta a textura carregada quando o componente desmonta ou quando a URL muda.
 *
 * Uso de `colorSpace`:
 *
 * - `srgb`: para texturas usadas diretamente por materiais comuns ou shaders que
 *   esperam a textura já no espaço sRGB do Three.js;
 * - `raw`: para shaders customizados que fazem a conversão de cor manualmente.
 *
 * Atenção:
 *
 * Este hook assume que a textura carregada pertence ao componente que o chamou.
 * Se no futuro for criado um cache compartilhado de texturas entre corpos, o
 * descarte manual com `dispose()` deverá ser movido para esse gerenciador/cache,
 * para evitar descartar uma textura ainda usada por outro componente.
 *
 * @param url Caminho público da imagem a ser carregada.
 * @param colorSpace Espaço de cor desejado para a textura.
 * @returns Textura carregada ou `null` enquanto ela não está disponível.
 */
export function useBodyTexture(
    url: string,
    colorSpace: 'srgb' | 'raw' = 'srgb',
): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        /**
         * Evita chamar `setTexture` depois que o componente desmontou ou depois
         * que uma nova URL/colorSpace iniciou outro carregamento.
         */
        let active = true;

        /**
         * Guarda a textura carregada nesta execução do effect para que ela possa
         * ser descartada corretamente no cleanup.
         */
        let loadedTexture: THREE.Texture | null = null;

        /**
         * URL vazia significa que não há textura configurada para o corpo.
         * Nesse caso, o componente chamador deve usar seu material fallback.
         */
        if (!url) {
            setTexture(null);

            return () => {
                active = false;
            };
        }

        const loader = new TextureLoader();

        loader.load(
            url,
            (loaded) => {
                if (!active) {
                    loaded.dispose();
                    return;
                }

                loadedTexture = loaded;

                if (colorSpace === 'srgb') {
                    loaded.colorSpace = THREE.SRGBColorSpace;
                } else {
                    loaded.colorSpace = THREE.NoColorSpace;
                }

                loaded.needsUpdate = true;
                setTexture(loaded);
            },
            undefined,
            () => {
                if (!active) return;

                setTexture(null);
            },
        );

        return () => {
            active = false;

            if (loadedTexture) {
                loadedTexture.dispose();
            }
        };
    }, [url, colorSpace]);

    return texture;
}