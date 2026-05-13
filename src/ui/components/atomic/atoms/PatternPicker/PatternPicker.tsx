"use client";

import { useRef } from "react";
import { useConfiguratorStore, PATTERNS } from "@store";

export const PatternPicker = () => {
    const { partPatterns, selectedParts, setPatternForSelected } = useConfiguratorStore();
    const fileRef = useRef<HTMLInputElement>(null);

    const selectedArray = Array.from(selectedParts);
    const commonPattern = selectedArray.every((p) => partPatterns[p] === partPatterns[selectedArray[0]])
        ? partPatterns[selectedArray[0]]
        : null;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPatternForSelected(url);
        e.target.value = "";
    };

    return (
        <div className="flex flex-col gap-2 p-4 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pattern</span>

            <select
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                value={commonPattern ?? ""}
                onChange={(e) => setPatternForSelected(e.target.value)}
            >
                {PATTERNS.map(({ id, label, url }) => (
                    <option key={id} value={url}>{label}</option>
                ))}
            </select>

            <button
                onClick={() => fileRef.current?.click()}
                className="text-xs border border-dashed border-gray-300 rounded px-2 py-1.5 text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors text-left"
            >
                + Upload SVG / PNG
            </button>
            <input
                ref={fileRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFile}
            />
        </div>
    );
};
