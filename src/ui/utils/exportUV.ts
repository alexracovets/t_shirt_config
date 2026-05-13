import type { BufferGeometry } from "three";

interface UVExportOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
}

// ─── PNG export ───────────────────────────────────────────────────────────────

function drawUVGeometry(
    ctx: CanvasRenderingContext2D,
    geometry: BufferGeometry,
    w: number,
    h: number,
    fillColor: string,
) {
    const uvAttr = geometry.attributes.uv;
    const index  = geometry.index;
    if (!uvAttr) return;

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
            ctx.moveTo(uvAttr.getX(a)*w, (1-uvAttr.getY(a))*h);
            ctx.lineTo(uvAttr.getX(b)*w, (1-uvAttr.getY(b))*h);
            ctx.lineTo(uvAttr.getX(c)*w, (1-uvAttr.getY(c))*h);
            ctx.closePath();
        }
    } else {
        for (let i = 0; i < uvAttr.count; i += 3) {
            ctx.moveTo(uvAttr.getX(i)*w,   (1-uvAttr.getY(i))*h);
            ctx.lineTo(uvAttr.getX(i+1)*w, (1-uvAttr.getY(i+1))*h);
            ctx.lineTo(uvAttr.getX(i+2)*w, (1-uvAttr.getY(i+2))*h);
            ctx.closePath();
        }
    }
    ctx.fill();
}

export function exportUVtoPNG(
    geometries: Record<string, { geometry: BufferGeometry; color: string }>,
    patternUrl: string,
    options: UVExportOptions = {},
): void {
    const { width = 2048, height = 2048, backgroundColor = "#ffffff" } = options;

    const doExport = (patternImg: HTMLImageElement | null) => {
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        for (const { geometry, color } of Object.values(geometries)) {
            drawUVGeometry(ctx, geometry, width, height, color);

            if (patternImg) {
                const uvAttr = geometry.attributes.uv;
                const index  = geometry.index;
                if (uvAttr) {
                    ctx.save();
                    ctx.beginPath();
                    if (index) {
                        for (let i = 0; i < index.count; i += 3) {
                            const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
                            ctx.moveTo(uvAttr.getX(a)*width, (1-uvAttr.getY(a))*height);
                            ctx.lineTo(uvAttr.getX(b)*width, (1-uvAttr.getY(b))*height);
                            ctx.lineTo(uvAttr.getX(c)*width, (1-uvAttr.getY(c))*height);
                            ctx.closePath();
                        }
                    }
                    ctx.clip();
                    ctx.globalCompositeOperation = "multiply";
                    ctx.drawImage(patternImg, 0, 0, width, height);
                    ctx.globalCompositeOperation = "source-over";
                    ctx.restore();
                }
            }
        }

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href     = url;
            a.download = "uv_layout.png";
            a.click();
            URL.revokeObjectURL(url);
        }, "image/png");
    };

    if (patternUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload  = () => doExport(img);
        img.onerror = () => doExport(null);
        img.src = patternUrl;
    } else {
        doExport(null);
    }
}

// ─── SVG export ───────────────────────────────────────────────────────────────

function getUVBounds(geometries: Record<string, { geometry: BufferGeometry }>): { minU: number; maxU: number; minV: number; maxV: number } {
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const { geometry } of Object.values(geometries)) {
        const uvAttr = geometry.attributes.uv;
        if (!uvAttr) continue;
        for (let i = 0; i < uvAttr.count; i++) {
            const u = uvAttr.getX(i);
            const v = uvAttr.getY(i);
            if (u < minU) minU = u;
            if (u > maxU) maxU = u;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        }
    }
    return {
        minU: minU === Infinity ? 0 : minU,
        maxU: maxU === -Infinity ? 1 : maxU,
        minV: minV === Infinity ? 0 : minV,
        maxV: maxV === -Infinity ? 1 : maxV,
    };
}

function buildUVPath(geometry: BufferGeometry, w: number, h: number): string {
    const uvAttr = geometry.attributes.uv;
    const index  = geometry.index;
    if (!uvAttr) return "";

    const parts: string[] = [];
    const pt = (i: number) =>
        `${(uvAttr.getX(i) * w).toFixed(2)},${((1 - uvAttr.getY(i)) * h).toFixed(2)}`;

    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
            parts.push(`M${pt(a)}L${pt(b)}L${pt(c)}Z`);
        }
    } else {
        for (let i = 0; i < uvAttr.count; i += 3) {
            parts.push(`M${pt(i)}L${pt(i+1)}L${pt(i+2)}Z`);
        }
    }
    return parts.join(" ");
}

export function exportUVtoSVG(
    geometries: Record<string, { geometry: BufferGeometry; color: string }>,
    patternUrl: string,
    options: UVExportOptions = {},
): void {
    const { width = 2048, backgroundColor = "#ffffff" } = options;

    // Compute actual UV bounding box to preserve real proportions
    const { minU, maxU, minV, maxV } = getUVBounds(geometries);
    const uvWidth  = maxU - minU || 1;
    const uvHeight = maxV - minV || 1;
    const aspect   = uvWidth / uvHeight;
    const svgW     = width;
    const svgH     = Math.round(width / aspect);

    const doExport = (patternDataUrl: string | null) => {
        const defs: string[] = [];
        const layers: string[] = [];

        let clipIndex = 0;
        for (const [part, { geometry, color }] of Object.entries(geometries)) {
            const pathD  = buildUVPath(geometry, svgW, svgH);
            if (!pathD) continue;

            const clipId = `clip-${part}-${clipIndex++}`;

            defs.push(`<clipPath id="${clipId}"><path d="${pathD}"/></clipPath>`);
            layers.push(`<path d="${pathD}" fill="${color}"/>`);

            if (patternDataUrl) {
                layers.push(
                    `<image href="${patternDataUrl}" x="0" y="0" width="${svgW}" height="${svgH}" ` +
                    `clip-path="url(#${clipId})" style="mix-blend-mode:multiply"/>`,
                );
            }
        }

        const svg = [
            `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `,
            `width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
            `<defs>${defs.join("")}</defs>`,
            `<rect width="${svgW}" height="${svgH}" fill="${backgroundColor}"/>`,
            ...layers,
            `</svg>`,
        ].join("\n");

        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "uv_layout.svg";
        a.click();
        URL.revokeObjectURL(url);
    };

    if (patternUrl) {
        // Convert pattern to data URL so it embeds into the SVG file
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const c   = document.createElement("canvas");
            c.width   = img.naturalWidth;
            c.height  = img.naturalHeight;
            c.getContext("2d")!.drawImage(img, 0, 0);
            doExport(c.toDataURL("image/png"));
        };
        img.onerror = () => doExport(null);
        img.src = patternUrl;
    } else {
        doExport(null);
    }
}
