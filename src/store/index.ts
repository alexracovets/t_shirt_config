import { create } from "zustand";
import type { Mesh } from "three";

export type ShirtPart = "back" | "front" | "sleeve_left" | "sleeve_right" | "collar";

export const SHIRT_PARTS: { key: ShirtPart; label: string }[] = [
    { key: "front", label: "Перед" },
    { key: "back", label: "Зад" },
    { key: "sleeve_left", label: "Рукав лів." },
    { key: "sleeve_right", label: "Рукав прав." },
    { key: "collar", label: "Комір" },
];

export interface PatternItem {
    id: string;
    label: string;
    url: string;
}

export const PATTERNS: PatternItem[] = [
    { id: "none",         label: "Без узору",    url: "" },
    { id: "pattern_test", label: "Тест",          url: "/patterns/pattern_test.png" },
];

type PartColors   = Record<ShirtPart, string>;
type PartPatterns = Record<ShirtPart, string>;
type MeshRefs     = Partial<Record<ShirtPart, Mesh>>;

interface ConfiguratorStore {
    partColors: PartColors;
    partPatterns: PartPatterns;
    selectedParts: Set<ShirtPart>;
    hoveredPart: ShirtPart | null;
    meshRefs: MeshRefs;
    registerMesh: (part: ShirtPart, mesh: Mesh) => void;
    setHoveredPart: (part: ShirtPart | null) => void;
    togglePart: (part: ShirtPart) => void;
    selectOnlyPart: (part: ShirtPart) => void;
    clearSelection: () => void;
    setColorForSelected: (color: string) => void;
    setPatternForSelected: (url: string) => void;
    setPartColor: (part: ShirtPart, color: string) => void;
}

const DEFAULT_COLOR = "#898989";

export const useConfiguratorStore = create<ConfiguratorStore>((set) => ({
    partColors: {
        front: DEFAULT_COLOR, back: DEFAULT_COLOR,
        sleeve_left: DEFAULT_COLOR, sleeve_right: DEFAULT_COLOR,
        collar: DEFAULT_COLOR,
    },
    partPatterns: {
        front: "", back: "", sleeve_left: "", sleeve_right: "", collar: "",
    },
    selectedParts: new Set<ShirtPart>(["front"]),
    hoveredPart: null,
    meshRefs: {},

    registerMesh: (part, mesh) =>
        set((state) => ({ meshRefs: { ...state.meshRefs, [part]: mesh } })),

    setHoveredPart: (part) => set({ hoveredPart: part }),

    togglePart: (part) =>
        set((state) => {
            const next = new Set(state.selectedParts);
            if (next.has(part)) {
                if (next.size > 1) next.delete(part);
            } else {
                next.add(part);
            }
            return { selectedParts: next };
        }),

    selectOnlyPart: (part) =>
        set({ selectedParts: new Set<ShirtPart>([part]) }),

    clearSelection: () =>
        set({ selectedParts: new Set<ShirtPart>() }),

    setColorForSelected: (color) =>
        set((state) => {
            const updates: Partial<PartColors> = {};
            state.selectedParts.forEach((p) => { updates[p] = color; });
            return { partColors: { ...state.partColors, ...updates } };
        }),

    setPatternForSelected: (url) =>
        set((state) => {
            const updates: Partial<PartPatterns> = {};
            state.selectedParts.forEach((p) => { updates[p] = url; });
            return { partPatterns: { ...state.partPatterns, ...updates } };
        }),

    setPartColor: (part, color) =>
        set((state) => ({
            partColors: { ...state.partColors, [part]: color },
        })),
}));
