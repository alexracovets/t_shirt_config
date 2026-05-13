"use client";

import { useConfiguratorStore, SHIRT_PARTS } from "@store";

const COLORS = [
    { label: "White", value: "#ffffff" },
    { label: "Black", value: "#1a1a1a" },
    { label: "Red", value: "#e63946" },
    { label: "Blue", value: "#457b9d" },
    { label: "Green", value: "#2d6a4f" },
    { label: "Yellow", value: "#f4d35e" },
    { label: "Pink", value: "#f7a8c4" },
    { label: "Orange", value: "#f4a261" },
];

export const ColorPicker = () => {
    const { partColors, selectedParts, togglePart, setColorForSelected } = useConfiguratorStore();

    const selectedArray = Array.from(selectedParts);
    const commonColor = selectedArray.every((p) => partColors[p] === partColors[selectedArray[0]])
        ? partColors[selectedArray[0]]
        : null;

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Сегмент <span className="normal-case text-gray-400">(shift для мультивибору)</span>
                </span>
                <div className="flex flex-wrap gap-1">
                    {SHIRT_PARTS.map(({ key, label }) => {
                        const isSelected = selectedParts.has(key);
                        return (
                            <button
                                key={key}
                                onClick={(e) => {
                                    if (e.shiftKey) {
                                        togglePart(key);
                                    } else {
                                        useConfiguratorStore.getState().selectOnlyPart(key);
                                    }
                                }}
                                className="px-2 py-1 text-xs rounded border transition-colors"
                                style={{
                                    borderColor: isSelected ? "#000" : "#d1d5db",
                                    backgroundColor: isSelected ? "#000" : "#fff",
                                    color: isSelected ? "#fff" : "#374151",
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Колір</span>
                <div className="flex flex-wrap gap-2">
                    {COLORS.map(({ label, value }) => (
                        <button
                            key={value}
                            title={label}
                            onClick={() => setColorForSelected(value)}
                            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                                backgroundColor: value,
                                borderColor: commonColor === value ? "#000" : "#d1d5db",
                                transform: commonColor === value ? "scale(1.2)" : undefined,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
