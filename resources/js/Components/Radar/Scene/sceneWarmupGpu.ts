/**
 * Primitivas de pré-aquecimento da cena 3D do radar (compilar shaders e subir texturas
 * para a GPU), sem React.
 *
 * Responsabilidade: concentrar a parte que mexe com WebGL (varrer a cena por texturas
 * ainda não enviadas e subi-las; compilar materiais) para que ela seja reutilizada por
 * quem aquece em momentos ociosos (`SceneWarmup`) e por quem aquece DENTRO da barra de
 * carregamento (gate do primeiro frame em `RadarScene`). Antes essa lógica vivia só
 * dentro de `SceneWarmup.tsx`.
 *
 * Por que existe: as texturas dos corpos só sobem para a GPU, e os shaders só compilam,
 * na primeira vez que cada objeto entra no frame. Girar a câmera logo após entrar
 * revelava planetas ainda não renderizados e disparava esse custo de uma vez, congelando
 * o frame durante o gesto. Antecipar esse trabalho em momento controlado remove o engasgo.
 */

import * as THREE from 'three';

/**
 * Coleta as texturas com imagem já decodificada que ainda não foram enviadas à GPU,
 * a partir dos materiais da cena. Marca cada uma no `uploaded` para não recoletar.
 *
 * Cobre tanto materiais padrão (texturas como propriedades diretas: `map`, `normalMap`...)
 * quanto `ShaderMaterial` (texturas dentro de `uniforms`), porque Terra, Lua e Sol usam
 * shaders próprios.
 */
export function collectPendingTextures(scene: THREE.Scene, uploaded: WeakSet<THREE.Texture>): THREE.Texture[] {
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
            for (const value of Object.values(material)) considerTexture(value);
            const uniforms = (material as THREE.ShaderMaterial).uniforms;
            if (uniforms) {
                for (const uniform of Object.values(uniforms)) considerTexture(uniform?.value);
            }
        }
    });

    return pending;
}

/**
 * Aquece a cena uma vez: compila os materiais (sem bloquear o main thread, via
 * `compileAsync` + KHR_parallel_shader_compile quando disponível) e sobe para a GPU
 * todas as texturas pendentes neste instante.
 *
 * A subida das texturas é feita aqui de forma síncrona (todas de uma vez): o chamador
 * decide o contexto. Dentro da barra de carregamento, pagar esse custo de uma vez com a
 * cena ainda escondida é justamente o objetivo — o usuário não vê o engasgo porque ele
 * acontece atrás do overlay. Para aquecimento ocioso em rajada diluída, use o laço
 * próprio de `SceneWarmup`.
 *
 * Best-effort: contexto perdido, cena em transição ou textura descartada entre a coleta
 * e o upload não devem quebrar nada — só significam que aquele item será aquecido sob
 * demanda como antes.
 *
 * @returns Quantas texturas foram enviadas à GPU neste pass.
 */
export async function warmupSceneOnce(
    gl: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    uploaded: WeakSet<THREE.Texture>,
): Promise<number> {
    try {
        await gl.compileAsync(scene, camera);
    } catch {
        // Melhor esforço: não quebrar se o contexto estiver indisponível.
    }

    const pending = collectPendingTextures(scene, uploaded);
    for (const texture of pending) {
        try {
            gl.initTexture(texture);
        } catch {
            // Textura descartada entre coletar e subir — segue para a próxima.
        }
    }
    return pending.length;
}
