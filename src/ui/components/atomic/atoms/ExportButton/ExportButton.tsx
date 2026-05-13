"use client";

import { useConfiguratorStore } from "@store";
import { exportUVtoSVG } from "@utils/exportUV";
import type { ShirtPart } from "@store";

export const ExportButton = () => {
    const { partColors, partPatterns, meshRefs } = useConfiguratorStore();

    const handleSVG = () => {
        const entries = Object.fromEntries(
            Object.entries(meshRefs)
                .filter(([, mesh]) => mesh?.geometry)
                .map(([part, mesh]) => [
                    part,
                    {
                        geometry:   mesh!.geometry,
                        color:      partColors[part as ShirtPart],
                        patternUrl: partPatterns[part as ShirtPart] ?? "",
                    },
                ])
        ) as Parameters<typeof exportUVtoSVG>[0];

        if (Object.keys(entries).length === 0) return;
        exportUVtoSVG(entries);
    };

    return (
        <div className="mx-4 mb-4 mt-auto">
            <button
                onClick={handleSVG}
                className="w-full py-2 px-3 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
            >
                Експорт SVG
            </button>
        </div>
    );
};
