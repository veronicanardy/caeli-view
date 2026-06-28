import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { collectPendingTextures } from '@/Components/Radar/Scene/sceneWarmupGpu';

/** Textura com `image` definido, como uma já decodificada pelo loader. */
function loadedTexture(): THREE.Texture {
    const tex = new THREE.Texture();
    tex.image = { width: 1, height: 1 } as unknown as HTMLImageElement;
    return tex;
}

function meshWith(material: THREE.Material): THREE.Mesh {
    return new THREE.Mesh(new THREE.BufferGeometry(), material);
}

describe('collectPendingTextures', () => {
    it('coleta texturas de materiais padrão (map)', () => {
        const scene = new THREE.Scene();
        const tex = loadedTexture();
        scene.add(meshWith(new THREE.MeshBasicMaterial({ map: tex })));

        const pending = collectPendingTextures(scene, new WeakSet());
        expect(pending).toContain(tex);
    });

    it('coleta texturas dentro de uniforms de ShaderMaterial (corpos com shader próprio)', () => {
        const scene = new THREE.Scene();
        const tex = loadedTexture();
        const material = new THREE.ShaderMaterial({ uniforms: { dayMap: { value: tex } } });
        scene.add(meshWith(material));

        const pending = collectPendingTextures(scene, new WeakSet());
        expect(pending).toContain(tex);
    });

    it('ignora texturas sem imagem (ainda não decodificadas)', () => {
        const scene = new THREE.Scene();
        const tex = new THREE.Texture(); // sem .image
        scene.add(meshWith(new THREE.MeshBasicMaterial({ map: tex })));

        expect(collectPendingTextures(scene, new WeakSet())).toHaveLength(0);
    });

    it('não recoleta texturas já marcadas como enviadas', () => {
        const scene = new THREE.Scene();
        const tex = loadedTexture();
        scene.add(meshWith(new THREE.MeshBasicMaterial({ map: tex })));

        const uploaded = new WeakSet<THREE.Texture>();
        expect(collectPendingTextures(scene, uploaded)).toContain(tex);
        // Segunda passada: já está no WeakSet, não deve voltar.
        expect(collectPendingTextures(scene, uploaded)).toHaveLength(0);
    });

    it('coleta cada textura uma vez mesmo compartilhada por vários meshes', () => {
        const scene = new THREE.Scene();
        const tex = loadedTexture();
        scene.add(meshWith(new THREE.MeshBasicMaterial({ map: tex })));
        scene.add(meshWith(new THREE.MeshStandardMaterial({ map: tex })));

        const pending = collectPendingTextures(scene, new WeakSet());
        expect(pending.filter((t) => t === tex)).toHaveLength(1);
    });
});
