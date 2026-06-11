/**
 * Pré-aquecimento de shaders e texturas da cena 3D.
 *
 * Responsabilidade: compilar os programas de shader e subir as texturas para a
 * GPU de forma assíncrona logo após o carregamento, em vez de deixar o Three.js
 * fazer isso na primeira vez que cada objeto entra no frustum da câmera.
 *
 * Sem isso, rotacionar a câmera até revelar objetos ainda não renderizados
 * (planetas, Lua, modelos GLB) dispara compilação síncrona de vários shaders e
 * upload de texturas no mesmo frame — um long task de ~100ms+ que congela a
 * cena exatamente durante o gesto (diagnóstico via PerfProbe: prog 8→16,
 * tex 8→14 e long task de 128ms no instante da travada).
 *
 * Estratégia:
 *   - `compileAsync` usa KHR_parallel_shader_compile quando disponível e não
 *     bloqueia o main thread;
 *   - texturas novas sobem via `initTexture`, uma por frame, para diluir o
 *     custo de upload;
 *   - os passes são re-agendados em intervalos crescentes e quando `revision`
 *     muda, porque materiais e texturas chegam de forma assíncrona (efeméride,
 *     texturas 8k, GLBs com preload adiado).
 *
 * Não altera nada visual nem científico: apenas antecipa, em momentos ociosos,
 * trabalho que o renderer faria de qualquer forma no pior momento possível.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Momentos dos passes de warmup após montagem/mudança, em ms. Cobrem a chegada assíncrona de texturas e GLBs. */
const WARMUP_PASS_DELAYS_MS = [500, 2500, 6000, 12000, 25000];

/** Coleta as texturas ainda não enviadas à GPU a partir dos materiais da cena. */
function collectPendingTextures(scene: THREE.Scene, uploaded: WeakSet<THREE.Texture>): THREE.Texture[] {
    const pending: THREE.Texture[] = [];

    const considerTexture = (value: unknown) => {
        if (value instanceof THREE.Texture && value.image && !uploaded.has(value)) {
            uploaded.add(value);
            pending.push(value);
        }
    };

    scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
            if (!material) continue;
            // Materiais padrão expõem texturas como propriedades diretas (map, normalMap, ...).
            for (const value of Object.values(material)) considerTexture(value);
            // ShaderMaterial guarda texturas dentro dos uniforms.
            const uniforms = (material as THREE.ShaderMaterial).uniforms;
            if (uniforms) {
                for (const uniform of Object.values(uniforms)) considerTexture(uniform?.value);
            }
        }
    });

    return pending;
}

export function SceneWarmup({ revision }: { revision: string }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const camera = useThree((s) => s.camera);
    const uploadedTextures = useRef(new WeakSet<THREE.Texture>());

    useEffect(() => {
        let cancelled = false;
        const timers: number[] = [];

        const warmupPass = async () => {
            if (cancelled) return;
            try {
                // Compila todos os materiais da cena, visíveis ou não, sem bloquear o main thread.
                await gl.compileAsync(scene, camera);
            } catch {
                // Melhor esforço: contexto perdido ou cena em transição não devem quebrar nada.
            }
            if (cancelled) return;

            const pending = collectPendingTextures(scene, uploadedTextures.current);
            const uploadNext = () => {
                if (cancelled) return;
                const texture = pending.shift();
                if (!texture) return;
                try {
                    gl.initTexture(texture);
                } catch {
                    // Textura descartada entre a coleta e o upload — segue para a próxima.
                }
                requestAnimationFrame(uploadNext);
            };
            uploadNext();
        };

        for (const delay of WARMUP_PASS_DELAYS_MS) {
            timers.push(window.setTimeout(warmupPass, delay));
        }

        return () => {
            cancelled = true;
            timers.forEach((t) => window.clearTimeout(t));
        };
    }, [gl, scene, camera, revision]);

    return null;
}
