/**
 * Hook de textura progressiva (LOD) para corpos grandes e visíveis ao entrar (Lua, Terra).
 *
 * Responsabilidade: entregar primeiro uma textura LEVE (2k) para o radar abrir rápido e,
 * em segundo plano, carregar a versão NÍTIDA (8k) e trocá-la SEM travadinha. A troca só
 * acontece depois que a 8k já foi enviada à GPU (`initTexture`), então o consumidor pode
 * trocar apenas o valor do uniform do material, sem recriar o material nem recompilar o
 * shader. É a garantia anti-engasgo: o custo caro (download + upload GPU) é pago fora do
 * caminho do gesto; a troca em si é só um ponteiro já aquecido.
 *
 * Por que não só `useBodyTexture(highUrl)`: aí o corpo ficaria sem textura até a 8k baixar
 * (lento) ou apareceria com fallback liso. E trocar a referência da textura recriaria o
 * `ShaderMaterial` (memoizado por textura em `Moon`/`PlanetBody`), justamente a recompilação
 * que congela o frame. Este hook separa "o que mostrar agora" de "quando a nítida está pronta".
 *
 * Contrato:
 * - `texture`: a melhor textura disponível AGORA (a 2k até a 8k estar pronta na GPU; daí a 8k).
 *   O consumidor aplica isso ao criar o material e mantém o material ESTÁVEL.
 * - `highReady`: vira `true` uma única vez, quando a 8k já está na GPU. O consumidor escuta
 *   esse sinal num efeito e troca `uniforms.<map>.value` in-place (com `needsUpdate`).
 * - Só a 2k entra na conta da barra de carregamento (via `useBodyTexture`); a 8k carrega
 *   depois e nunca prende o overlay.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { useThree } from '@react-three/fiber';
import { useBodyTexture } from './useBodyTexture';
import { resolveProgressiveTexture } from '@/lib/radar/progressiveTexture';

/**
 * Atraso (ms) entre a 2k ficar pronta e a 8k começar a baixar. Dá folga para a efeméride e
 * as outras texturas 2k terminarem o boot antes da nítida disputar banda. Não é prazo rígido.
 */
const HIGH_LOAD_DELAY_MS = 1500;

export type ProgressiveBodyTexture = {
    /** Melhor textura disponível agora (2k → 8k quando pronta na GPU). `null` enquanto a 2k carrega. */
    texture: THREE.Texture | null;
    /** `true` quando a 8k já está na GPU e pode ser trocada in-place sem custo. */
    highReady: boolean;
};

/**
 * @param lowUrl     Caminho da textura leve (2k), carregada já e contada na barra.
 * @param highUrl    Caminho da textura nítida (8k), carregada em segundo plano.
 * @param colorSpace Espaço de cor (igual ao `useBodyTexture`: `srgb` para materiais comuns,
 *                   `raw` para shaders que convertem cor manualmente).
 */
export function useProgressiveBodyTexture(
    lowUrl: string,
    highUrl: string,
    colorSpace: 'srgb' | 'raw' = 'srgb',
): ProgressiveBodyTexture {
    const gl = useThree((s) => s.gl);
    const low = useBodyTexture(lowUrl, colorSpace);
    const [high, setHigh] = useState<THREE.Texture | null>(null);
    const [highUploaded, setHighUploaded] = useState(false);

    // A 8k só começa a baixar DEPOIS que a 2k chegou: assim ela nunca compete com o boot
    // (a 2k é quem a barra de carregamento espera). O download da nítida é puro segundo plano.
    const lowReady = low != null;

    useEffect(() => {
        if (!highUrl || !lowReady) return;

        let active = true;
        let loaded: THREE.Texture | null = null;
        const loader = new TextureLoader();

        // Adia o início da 8k para ela não disputar banda/CPU com o restante do carregamento
        // inicial (efeméride, outras 2k). Padrão alinhado ao preload adiado dos modelos GLB.
        const startTimer = setTimeout(() => {
            loader.load(
                highUrl,
                (tex) => {
                    if (!active) {
                        tex.dispose();
                        return;
                    }
                    tex.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                    tex.needsUpdate = true;
                    loaded = tex;

                    // Sobe a 8k para a GPU AQUI, antes de sinalizar pronta. É a parte cara; pagá-la
                    // agora (fora do gesto) é o que evita o engasgo no momento da troca.
                    try {
                        gl.initTexture(tex);
                    } catch {
                        // Contexto indisponível: seguimos mesmo assim; o upload acontecerá no
                        // primeiro uso. Sinalizamos pronta para não travar a melhoria de nitidez.
                    }
                    setHigh(tex);
                    setHighUploaded(true);
                },
                undefined,
                () => {
                    // Falha ao baixar a 8k: o corpo permanece na 2k para sempre. Sem erro para a UI.
                },
            );
        }, HIGH_LOAD_DELAY_MS);

        return () => {
            active = false;
            clearTimeout(startTimer);
            if (loaded) loaded.dispose();
        };
    }, [highUrl, colorSpace, gl, lowReady]);

    // A 2k é descartada pelo próprio `useBodyTexture`; aqui só descartamos a 8k que criamos.
    const highRef = useRef<THREE.Texture | null>(null);
    highRef.current = high;
    useEffect(() => () => { highRef.current?.dispose(); }, []);

    return resolveProgressiveTexture(low, high, highUploaded);
}
