/**
 * Conversor pontual VRML (IndexedFaceSet) -> GLB binário.
 *
 * Responsabilidade: ler o shape model do 67P (DLR/Rosetta, formato .wrl com `point [...]` e
 * `coordIndex [...]`), centralizar/normalizar a geometria para "maior eixo = 2" (mesma convenção dos
 * GLBs de asteroide, que o RealAsteroidModel re-normaliza), calcular normais por vértice e gravar um
 * GLB com um único mesh. Uso único (ferramenta de pipeline), não roda em produção.
 *
 * Uso: node scripts/wrl-to-glb.mjs <entrada.wrl> <saida.glb>
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
    console.error('Uso: node scripts/wrl-to-glb.mjs <entrada.wrl> <saida.glb>');
    process.exit(1);
}

const text = readFileSync(inPath, 'utf8');

function sliceBlock(label) {
    const start = text.indexOf(label);
    if (start < 0) throw new Error(`bloco "${label}" não encontrado`);
    const open = text.indexOf('[', start);
    const close = text.indexOf(']', open);
    return text.slice(open + 1, close);
}

/**
 * Extrai os números de um bloco VRML, removendo ANTES os comentários inline ("# ...") de cada linha.
 * Alguns shape models (ex.: Tempel 1) anotam cada vértice com "# 1", cujos dígitos contaminariam o
 * parse se não fossem removidos. O 67P não tem esses comentários, então a limpeza é inofensiva nele.
 */
function numbersFromBlock(label) {
    return sliceBlock(label)
        // Remove comentários inline ("# ...") até o fim da linha. Usa [^\n]* (não `.*$`) porque os
        // arquivos vêm com CRLF: `.` casa o `\r` e `$` sem flag `m` não ancora por linha, então `#.*$`
        // não removeria o comentário e os dígitos da tag ("# 1") contaminariam o parse.
        .replace(/#[^\n]*/g, '')
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
}

// Vértices: "x y z" repetidos.
const pointNums = numbersFromBlock('point');
const vertCount = Math.floor(pointNums.length / 3);

// Faces: triângulos terminados em -1 ("i j k -1").
const idxNums = numbersFromBlock('coordIndex');
const tris = [];
let cur = [];
for (const n of idxNums) {
    if (n === -1) {
        if (cur.length >= 3) tris.push([cur[0], cur[1], cur[2]]);
        cur = [];
    } else {
        cur.push(n);
    }
}

// Posições e bounds.
const pos = new Float32Array(pointNums.slice(0, vertCount * 3));
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertCount; i++) {
    for (let a = 0; a < 3; a++) {
        const v = pos[i * 3 + a];
        if (v < min[a]) min[a] = v;
        if (v > max[a]) max[a] = v;
    }
}
// Centraliza no centro do bounding box e escala para maior eixo = 2 (raio ~1).
const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
const maxAxis = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
const scale = 2 / maxAxis;
for (let i = 0; i < vertCount; i++) {
    for (let a = 0; a < 3; a++) {
        pos[i * 3 + a] = (pos[i * 3 + a] - center[a]) * scale;
    }
}

// Normais por vértice (média das normais de face).
const normals = new Float32Array(vertCount * 3);
for (const [ia, ib, ic] of tris) {
    const ax = pos[ia * 3], ay = pos[ia * 3 + 1], az = pos[ia * 3 + 2];
    const bx = pos[ib * 3], by = pos[ib * 3 + 1], bz = pos[ib * 3 + 2];
    const cx = pos[ic * 3], cy = pos[ic * 3 + 1], cz = pos[ic * 3 + 2];
    const e1 = [bx - ax, by - ay, bz - az];
    const e2 = [cx - ax, cy - ay, cz - az];
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const idx of [ia, ib, ic]) {
        normals[idx * 3] += nx;
        normals[idx * 3 + 1] += ny;
        normals[idx * 3 + 2] += nz;
    }
}
for (let i = 0; i < vertCount; i++) {
    const x = normals[i * 3], y = normals[i * 3 + 1], z = normals[i * 3 + 2];
    const len = Math.hypot(x, y, z) || 1;
    normals[i * 3] = x / len;
    normals[i * 3 + 1] = y / len;
    normals[i * 3 + 2] = z / len;
}

// Índices (uint32 -> componentType 5125).
const indices = new Uint32Array(tris.length * 3);
tris.forEach((t, i) => { indices[i * 3] = t[0]; indices[i * 3 + 1] = t[1]; indices[i * 3 + 2] = t[2]; });

// Normais bounds (não precisam ser exatos, mas POSITION exige min/max).
const posMin = [Infinity, Infinity, Infinity];
const posMax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertCount; i++) {
    for (let a = 0; a < 3; a++) {
        const v = pos[i * 3 + a];
        if (v < posMin[a]) posMin[a] = v;
        if (v > posMax[a]) posMax[a] = v;
    }
}

// Monta o buffer binário: POSITION | NORMAL | INDICES, cada um alinhado a 4 bytes.
function pad4(n) { return (4 - (n % 4)) % 4; }
const posBytes = Buffer.from(pos.buffer, 0, pos.byteLength);
const normBytes = Buffer.from(normals.buffer, 0, normals.byteLength);
const idxBytes = Buffer.from(indices.buffer, 0, indices.byteLength);

const parts = [];
let offset = 0;
const views = [];
for (const [name, buf] of [['pos', posBytes], ['norm', normBytes], ['idx', idxBytes]]) {
    views.push({ name, byteOffset: offset, byteLength: buf.length });
    parts.push(buf);
    offset += buf.length;
    const pad = pad4(offset);
    if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
}
const bin = Buffer.concat(parts);

const gltf = {
    asset: { version: '2.0', generator: 'wrl-to-glb.mjs (caeli-view)' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0, name: '67P_Churyumov_Gerasimenko' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{
        name: 'comet_nucleus',
        pbrMetallicRoughness: { baseColorFactor: [0.32, 0.30, 0.28, 1], metallicFactor: 0, roughnessFactor: 0.95 },
    }],
    accessors: [
        { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: posMin, max: posMax },
        { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
        { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
        { buffer: 0, byteOffset: views[0].byteOffset, byteLength: views[0].byteLength, target: 34962 },
        { buffer: 0, byteOffset: views[1].byteOffset, byteLength: views[1].byteLength, target: 34962 },
        { buffer: 0, byteOffset: views[2].byteOffset, byteLength: views[2].byteLength, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
};

// Empacota GLB: header + JSON chunk + BIN chunk.
const jsonStr = JSON.stringify(gltf);
const jsonBuf = Buffer.from(jsonStr, 'utf8');
const jsonPad = pad4(jsonBuf.length);
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
const binPad = pad4(bin.length);
const binChunk = Buffer.concat([bin, Buffer.alloc(binPad)]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

writeFileSync(outPath, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
console.log(`OK: ${vertCount} vértices, ${tris.length} triângulos -> ${outPath}`);
