"use client";

import { Suspense } from "react";
import { CanvasExperience } from "@organisms";
import { ColorPicker, ExportButton, PatternPicker } from "@atoms";

export default function Home() {
    return (
        <div className="flex h-screen w-full">
            <div className="flex-1 relative h-full">
                <CanvasExperience />
            </div>
            <aside className="w-64 border-l border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-lg font-semibold">T-shirt configurator</h1>
                </div>
                <ColorPicker />
                <PatternPicker />
                <Suspense fallback={null}>
                    <ExportButton />
                </Suspense>
            </aside>
        </div>
    );
}
