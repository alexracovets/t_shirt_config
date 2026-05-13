import type { BufferGeometry } from "three";

export interface Edge {
    x0: number; y0: number;
    x1: number; y1: number;
}

export function getUVBoundaryEdges(geometry: BufferGeometry): Edge[] {
    const uvAttr = geometry.attributes.uv;
    const index  = geometry.index;
    if (!uvAttr || !index) return [];

    const edgeCount = new Map<string, number>();
    const edgeData  = new Map<string, Edge>();

    const count = index.count;
    for (let i = 0; i < count; i += 3) {
        const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        for (let j = 0; j < 3; j++) {
            const a = tri[j];
            const b = tri[(j + 1) % 3];
            const key = a < b ? `${a}_${b}` : `${b}_${a}`;
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeData.has(key)) {
                edgeData.set(key, {
                    x0: uvAttr.getX(a), y0: uvAttr.getY(a),
                    x1: uvAttr.getX(b), y1: uvAttr.getY(b),
                });
            }
        }
    }

    const boundary: Edge[] = [];
    for (const [key, cnt] of edgeCount) {
        if (cnt === 1) boundary.push(edgeData.get(key)!);
    }
    return boundary;
}
