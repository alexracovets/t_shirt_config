import type { BufferGeometry } from "three";

export interface ExportEntry {
    geometry:   BufferGeometry;
    color:      string;
    patternUrl: string; // "" = no pattern for this part
}

// ─── UV bounds ────────────────────────────────────────────────────────────────

function getUVBounds(entries: Record<string, ExportEntry>) {
    let minU =  Infinity, maxU = -Infinity;
    let minV =  Infinity, maxV = -Infinity;

    for (const { geometry } of Object.values(entries)) {
        const uv = geometry.attributes.uv;
        if (!uv) continue;
        for (let i = 0; i < uv.count; i++) {
            const u = uv.getX(i), v = uv.getY(i);
            if (u < minU) minU = u;
            if (u > maxU) maxU = u;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        }
    }

    return {
        minU: isFinite(minU) ? minU : 0,
        maxU: isFinite(maxU) ? maxU : 1,
        minV: isFinite(minV) ? minV : 0,
        maxV: isFinite(maxV) ? maxV : 1,
    };
}

// ─── Build SVG <path> d="" for one geometry ───────────────────────────────────
// UV → SVG coords: x = (u - minU) / uvW * svgW,  y = (1 - v - minV) / uvH * svgH

function buildPath(
    geometry: BufferGeometry,
    minU: number, minV: number,
    uvW: number,  uvH: number,
    svgW: number, svgH: number,
): string {
    const uv    = geometry.attributes.uv;
    const index = geometry.index;
    if (!uv) return "";

    const px = (i: number) => (((uv.getX(i) - minU) / uvW) * svgW).toFixed(3);
    const py = (i: number) => (((1 - uv.getY(i) - minV) / uvH) * svgH).toFixed(3);

    const parts: string[] = [];

    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
            parts.push(`M${px(a)},${py(a)}L${px(b)},${py(b)}L${px(c)},${py(c)}Z`);
        }
    } else {
        for (let i = 0; i < uv.count; i += 3) {
            parts.push(`M${px(i)},${py(i)}L${px(i+1)},${py(i+1)}L${px(i+2)},${py(i+2)}Z`);
        }
    }

    return parts.join(" ");
}

// ─── Load image → data URL ────────────────────────────────────────────────────

function loadAsDataURL(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width  = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d")!.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// ─── SVG export ───────────────────────────────────────────────────────────────

export async function exportUVtoSVG(
    entries: Record<string, ExportEntry>,
): Promise<void> {
    const { minU, maxU, minV, maxV } = getUVBounds(entries);
    const uvW = maxU - minU || 1;
    const uvH = maxV - minV || 1;

    // Output size: keep real UV proportions, 2048px on the longer axis
    const MAX = 2048;
    let svgW: number, svgH: number;
    if (uvW >= uvH) {
        svgW = MAX;
        svgH = Math.round(MAX * (uvH / uvW));
    } else {
        svgH = MAX;
        svgW = Math.round(MAX * (uvW / uvH));
    }

    // Preload pattern images (deduplicated)
    const dataURLCache = new Map<string, string | null>();
    for (const { patternUrl } of Object.values(entries)) {
        if (patternUrl && !dataURLCache.has(patternUrl)) {
            dataURLCache.set(patternUrl, await loadAsDataURL(patternUrl));
        }
    }

    const defs:   string[] = [];
    const layers: string[] = [];
    let clipIdx = 0;

    for (const [part, { geometry, color, patternUrl }] of Object.entries(entries)) {
        const d = buildPath(geometry, minU, minV, uvW, uvH, svgW, svgH);
        if (!d) continue;

        const clipId = `c${clipIdx++}-${part}`;
        defs.push(`<clipPath id="${clipId}"><path d="${d}"/></clipPath>`);

        // Base color fill
        layers.push(`<path d="${d}" fill="${color}"/>`);

        // Pattern overlay — only if this part has a pattern
        if (patternUrl) {
            const dataUrl = dataURLCache.get(patternUrl);
            if (dataUrl) {
                layers.push(
                    `<image href="${dataUrl}" x="0" y="0" ` +
                    `width="${svgW}" height="${svgH}" ` +
                    `clip-path="url(#${clipId})" ` +
                    `style="mix-blend-mode:multiply"/>`,
                );
            }
        }
    }

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
        ` width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
        `<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>`,
        `<defs>${defs.join("")}</defs>`,
        ...layers,
        `</svg>`,
    ].join("\n");

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "uv_layout.svg"; a.click();
    URL.revokeObjectURL(url);
}
