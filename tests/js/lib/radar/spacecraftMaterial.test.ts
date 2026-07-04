/**
 * Testes da receita pura de materiais das naves (lib/radar/spacecraftMaterial.ts).
 *
 * Responsabilidade: travar as decisões que corrigiram o visual lavado das naves. Metal mantém a
 * cor/F0 da NASA (a compensação de exposição só vale para o diffuse dielétrico), o envMap fica em
 * intensidade física, o emissivo autorado do GLB é preservado, o material autorado transparente
 * vira recorte (nunca blending) e o `exposure` por modelo só amplia a fração dielétrica, com teto.
 */

import { describe, expect, it } from 'vitest';
import {
    SPACECRAFT_ALPHA_TEST,
    SPACECRAFT_EMISSIVE,
    SPACECRAFT_ENV_INTENSITY,
    SPACECRAFT_MAX_METALNESS,
    SPACECRAFT_WHITE_METAL_THRESHOLD,
    SUN_EXPOSURE_COMPENSATION,
    WHITE_METAL_EXPOSURE_COMPENSATION,
    spacecraftMaterialRecipe,
    type SpacecraftMaterialInput,
} from '@/lib/radar/spacecraftMaterial';

/** Entrada padrão dos testes; cada caso sobrescreve só o que exercita. Brightness baixo (metal com
 * cor real, ex: ouro) por padrão, para não disparar o desconto de metal quase branco à toa. */
const input = (overrides: Partial<SpacecraftMaterialInput> = {}): SpacecraftMaterialInput => ({
    metalness: 0,
    brightness: 0.5,
    hasAuthoredEmissive: false,
    authoredTransparent: false,
    exposure: 1,
    ...overrides,
});

describe('spacecraftMaterialRecipe', () => {
    it('dielétrico puro recebe a compensação de exposição cheia no diffuse', () => {
        expect(spacecraftMaterialRecipe(input()).colorScale).toBeCloseTo(SUN_EXPOSURE_COMPENSATION, 10);
    });

    it('metal puro mantém a cor da NASA intacta (F0 sem compensação)', () => {
        expect(spacecraftMaterialRecipe(input({ metalness: 1 })).colorScale).toBe(1);
    });

    it('material misto interpola a compensação pelo metalness', () => {
        const recipe = spacecraftMaterialRecipe(input({ metalness: 0.5 }));
        expect(recipe.colorScale).toBeGreaterThan(SUN_EXPOSURE_COMPENSATION);
        expect(recipe.colorScale).toBeLessThan(1);
        expect(recipe.colorScale).toBeCloseTo(SUN_EXPOSURE_COMPENSATION + (1 - SUN_EXPOSURE_COMPENSATION) * 0.5, 10);
    });

    it('exposure do modelo amplia só a fração dielétrica, com teto em 1', () => {
        expect(spacecraftMaterialRecipe(input({ exposure: 2 })).colorScale).toBeCloseTo(SUN_EXPOSURE_COMPENSATION * 2, 10);
        expect(spacecraftMaterialRecipe(input({ exposure: 100 })).colorScale).toBe(1);
        expect(spacecraftMaterialRecipe(input({ metalness: 1, exposure: 2 })).colorScale).toBe(1);
    });

    it('metalness sai com o teto de segurança (fio de diffuse garantido)', () => {
        expect(spacecraftMaterialRecipe(input({ metalness: 1 })).metalness).toBe(SPACECRAFT_MAX_METALNESS);
        expect(spacecraftMaterialRecipe(input({ metalness: 0.3 })).metalness).toBe(0.3);
    });

    it('metalness fora da faixa é normalizado antes de decidir', () => {
        const recipe = spacecraftMaterialRecipe(input({ metalness: 2 }));
        expect(recipe.colorScale).toBe(1);
        expect(recipe.metalness).toBe(SPACECRAFT_MAX_METALNESS);
    });

    it('envMap fica em intensidade física (o reescalo antigo lavava tudo de branco)', () => {
        expect(spacecraftMaterialRecipe(input()).envMapIntensity).toBe(SPACECRAFT_ENV_INTENSITY);
        expect(SPACECRAFT_ENV_INTENSITY).toBeLessThanOrEqual(1);
    });

    it('emissivo autorado do GLB é preservado; sem autorado entra o piso de legibilidade', () => {
        expect(spacecraftMaterialRecipe(input({ hasAuthoredEmissive: true })).emissiveIntensity).toBe(0);
        expect(spacecraftMaterialRecipe(input()).emissiveIntensity).toBe(SPACECRAFT_EMISSIVE);
    });

    it('piso de emissivo cai com o metalness (metal já reflete o envMap sozinho)', () => {
        expect(spacecraftMaterialRecipe(input({ metalness: 1 })).emissiveIntensity).toBe(0);
        expect(spacecraftMaterialRecipe(input({ metalness: 0.5 })).emissiveIntensity).toBeCloseTo(SPACECRAFT_EMISSIVE * 0.5, 10);
    });

    it('material autorado transparente vira recorte; o opaco fica sem recorte', () => {
        expect(spacecraftMaterialRecipe(input({ authoredTransparent: true })).alphaTest).toBe(SPACECRAFT_ALPHA_TEST);
        expect(spacecraftMaterialRecipe(input()).alphaTest).toBe(0);
        expect(SPACECRAFT_ALPHA_TEST).toBeGreaterThan(0);
        expect(SPACECRAFT_ALPHA_TEST).toBeLessThan(1);
    });

    it('metal quase branco (foil, sem matiz a perder) recebe desconto para não estourar', () => {
        const whiteMetal = spacecraftMaterialRecipe(input({ metalness: 1, brightness: 1 }));
        expect(whiteMetal.colorScale).toBeCloseTo(WHITE_METAL_EXPOSURE_COMPENSATION, 10);
        expect(whiteMetal.colorScale).toBeLessThan(1);
    });

    it('metal com cor real (abaixo do threshold de branco) mantém o F0 intacto', () => {
        const coloredMetal = spacecraftMaterialRecipe(input({ metalness: 1, brightness: SPACECRAFT_WHITE_METAL_THRESHOLD }));
        expect(coloredMetal.colorScale).toBe(1);
    });

    it('desconto de metal branco é proporcional ao metalness (dielétrico não é afetado)', () => {
        const recipe = spacecraftMaterialRecipe(input({ metalness: 0, brightness: 1 }));
        expect(recipe.colorScale).toBeCloseTo(SUN_EXPOSURE_COMPENSATION, 10);
    });
});
