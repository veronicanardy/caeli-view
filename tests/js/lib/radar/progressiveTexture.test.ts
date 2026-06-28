import { describe, expect, it } from 'vitest';
import { resolveProgressiveTexture } from '@/lib/radar/progressiveTexture';

// Usa strings no lugar de THREE.Texture: a decisão é genérica e não depende do tipo real.
const LOW = 'low-2k';
const HIGH = 'high-8k';

describe('resolveProgressiveTexture', () => {
    it('expõe nada enquanto a 2k não chegou', () => {
        expect(resolveProgressiveTexture(null, null, false)).toEqual({ texture: null, highReady: false });
    });

    it('expõe a 2k enquanto a 8k não está pronta', () => {
        expect(resolveProgressiveTexture(LOW, null, false)).toEqual({ texture: LOW, highReady: false });
    });

    it('continua na 2k se a 8k baixou mas ainda não subiu para a GPU', () => {
        // highUploaded=false: a 8k existe mas não está aquecida; trocar agora travaria.
        expect(resolveProgressiveTexture(LOW, HIGH, false)).toEqual({ texture: LOW, highReady: false });
    });

    it('troca para a 8k quando ela está pronta na GPU', () => {
        expect(resolveProgressiveTexture(LOW, HIGH, true)).toEqual({ texture: HIGH, highReady: true });
    });

    it('nunca marca highReady sem uma textura nítida disponível', () => {
        // Defensivo: highUploaded=true mas high=null não deve mentir que está pronta.
        expect(resolveProgressiveTexture(LOW, null, true)).toEqual({ texture: LOW, highReady: false });
    });
});
