"use client";

import { Suspense, useRef, createContext, useContext, useEffect } from "react";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Center, Environment } from "@react-three/drei";
import { EffectComposer, Outline } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { Test } from "@atoms";
import { useConfiguratorStore } from "@store";

const DRAG_THRESHOLD = 4;

export const DragContext = createContext<React.RefObject<boolean>>({ current: false });
export const useDragGuard = () => useContext(DragContext);

function DragTracker({ isDragging }: { isDragging: React.RefObject<boolean> }) {
    const { gl } = useThree();
    useEffect(() => {
        const canvas = gl.domElement;
        let startX = 0;
        let startY = 0;
        const onDown = (e: PointerEvent) => {
            startX = e.clientX;
            startY = e.clientY;
            isDragging.current = false;
        };
        const onMove = (e: PointerEvent) => {
            if (isDragging.current) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.hypot(dx, dy) > DRAG_THRESHOLD) isDragging.current = true;
        };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
        };
    }, [gl, isDragging]);
    return null;
}

function OutlineEffect() {
    const { meshRefs, selectedParts } = useConfiguratorStore();

    const selected = Array.from(selectedParts)
        .map((part) => meshRefs[part])
        .filter((m): m is NonNullable<typeof m> => !!m);

    return (
        <EffectComposer autoClear={false} enabled={selected.length > 0}>
            <Outline
                selection={selected}
                blendFunction={BlendFunction.SCREEN}
                edgeStrength={4}
                pulseSpeed={0.0}
                visibleEdgeColor={0xffd700}
                hiddenEdgeColor={0x000000}
                kernelSize={KernelSize.LARGE}
                xRay={true}
            />
        </EffectComposer>
    );
}

export const CanvasExperience = () => {
    const { clearSelection } = useConfiguratorStore();
    const isDragging = useRef(false);

    return (
        <DragContext.Provider value={isDragging}>
            <div className="relative w-full h-full">
                <Canvas
                    camera={{ position: [0, 0, 3], fov: 45 }}
                    style={{ width: "100%", height: "100%" }}
                    gl={{ antialias: true, powerPreference: "high-performance", stencil: true }}
                    dpr={[1, 2]}
                    onPointerMissed={() => { if (!isDragging.current) clearSelection(); }}
                >
                    <DragTracker isDragging={isDragging} />
                    <Suspense fallback={null}>
                        <Environment preset="studio" environmentIntensity={1.2} />
                        <ambientLight intensity={0.3} />
                        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
                        <directionalLight position={[-5, 2, -3]} intensity={0.4} />
                        <Center position={[0, 0, 0]}>
                            <Test />
                        </Center>
                    </Suspense>
                    <OutlineEffect />
                    <OrbitControls enablePan={false} minDistance={1} maxDistance={5} makeDefault />
                </Canvas>
            </div>
        </DragContext.Provider>
    );
};
