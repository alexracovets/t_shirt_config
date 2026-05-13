"use client";

import { useRef, useState, useEffect, useMemo } from "react";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@store";
import type { ShirtPart } from "@store";
import {
    Color, CanvasTexture, SRGBColorSpace, BackSide,
    ShaderMaterial, MeshBasicMaterial,
    AlwaysStencilFunc, ReplaceStencilOp, NotEqualStencilFunc, KeepStencilOp,
    MeshStandardMaterial,
} from "three";
import type { Mesh, BufferGeometry, MeshStandardMaterial as TMeshStd, Texture } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ThreeEvent } from "@react-three/fiber";
import { useDragGuard } from "@organisms/CanvasExperience/CanvasExperience";

interface TShirtGLTF extends GLTF {
    nodes: {
        "t-shirt_back":         { geometry: BufferGeometry };
        "t-shirt_inside":       { geometry: BufferGeometry };
        "t-shirt_sleeve_left":  { geometry: BufferGeometry };
        "t-shirt_sleeve_right": { geometry: BufferGeometry };
        "t-shirt_front":        { geometry: BufferGeometry };
        "t-shirt_collar":       { geometry: BufferGeometry };
    };
    materials: {
        shirt:        MeshStandardMaterial;
        shirt_inside: MeshStandardMaterial;
    };
}

const EMISSIVE_HOVER    = new Color("#FFD700");
const EMISSIVE_SELECTED = new Color("#FFD700");
const EMISSIVE_OFF      = new Color("#000000");

function usePatternImage(url: string): HTMLImageElement | null {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!url) {
            const id = setTimeout(() => setImg(null), 0);
            return () => clearTimeout(id);
        }
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload  = () => setImg(image);
        image.onerror = () => console.error("[Pattern] failed:", url);
        image.src = url;
    }, [url]);
    return img;
}

function buildColorTexture(color: string, patternImg: HTMLImageElement | null): CanvasTexture {
    const size   = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    if (patternImg) {
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(patternImg, 0, 0, size, size);
        ctx.globalCompositeOperation = "source-over";
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
}

function useColorTexture(color: string, patternImg: HTMLImageElement | null): CanvasTexture {
    const tex = useMemo(() => buildColorTexture(color, patternImg), [color, patternImg]);
    useEffect(() => () => { tex.dispose(); }, [tex]);
    return tex;
}

interface ShirtMeshProps {
    part:        ShirtPart;
    geometry:    BufferGeometry;
    normalMap:   Texture | null;
    aoRoughMap:  Texture | null;
}

function ShirtMesh({ part, geometry, normalMap, aoRoughMap }: ShirtMeshProps) {
    const meshRef = useRef<Mesh>(null!);
    const matRef  = useRef<TMeshStd>(null!);
    const [hovered, setHovered] = useState(false);
    const { partColors, partPatterns, selectedParts, togglePart, selectOnlyPart, registerMesh } = useConfiguratorStore();
    const isDragging = useDragGuard();
    const isSelected = selectedParts.has(part);
    const color      = partColors[part];
    const patternUrl = partPatterns[part];

    const patternImg = usePatternImage(patternUrl);
    const colorTex   = useColorTexture(color, patternImg);

    useEffect(() => {
        if (meshRef.current) registerMesh(part, meshRef.current);
    }, [part, registerMesh]);

    useFrame(({ clock: { elapsedTime } }) => {
        if (!matRef.current) return;
        const mat = matRef.current;
        if (!isSelected && !hovered) {
            if (mat.emissiveIntensity < 0.001) { mat.emissiveIntensity = 0; return; }
            mat.emissive.lerp(EMISSIVE_OFF, 0.1);
            mat.emissiveIntensity *= 0.9;
            return;
        }
        const tc = isSelected ? EMISSIVE_SELECTED : EMISSIVE_HOVER;
        const ti = isSelected ? 0.15 + Math.sin(elapsedTime * 2.5) * 0.05 : 0.1;
        mat.emissive.lerp(tc, 0.1);
        mat.emissiveIntensity += (ti - mat.emissiveIntensity) * 0.1;
    });

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (isDragging.current) return;
        if (e.shiftKey) togglePart(part);
        else            selectOnlyPart(part);
    };

    const stencilWriteMat = useMemo(() => {
        const m = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
        m.stencilWrite = true;
        m.stencilFunc  = AlwaysStencilFunc;
        m.stencilZPass = ReplaceStencilOp;
        m.stencilRef   = 1;
        return m;
    }, []);

    const outlineMat = useMemo(() => {
        const m = new ShaderMaterial({
            side: BackSide,
            depthTest: true,
            uniforms: { color: { value: new Color(0xffd700) }, thickness: { value: 0.006 } },
            vertexShader: `
                uniform float thickness;
                void main() {
                    vec3 n = normalize(normalMatrix * normal);
                    vec4 pos = modelViewMatrix * vec4(position, 1.0);
                    pos.xyz += n * thickness;
                    gl_Position = projectionMatrix * pos;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() { gl_FragColor = vec4(color, 1.0); }
            `,
        });
        m.stencilWrite = false;
        m.stencilFunc  = NotEqualStencilFunc;
        m.stencilRef   = 1;
        m.stencilFail  = KeepStencilOp;
        m.stencilZFail = KeepStencilOp;
        m.stencilZPass = KeepStencilOp;
        return m;
    }, []);

    return (
        <>
            <mesh
                ref={meshRef}
                geometry={geometry}
                onPointerUp={handlePointerUp}
                onPointerOver={(e) => { e.stopPropagation(); if (!isDragging.current) { setHovered(true); document.body.style.cursor = "pointer"; } }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
            >
                <meshStandardMaterial
                    ref={matRef}
                    map={colorTex}
                    normalMap={normalMap}
                    roughnessMap={aoRoughMap}
                    aoMap={aoRoughMap}
                    roughness={1}
                    metalness={0}
                    emissive={EMISSIVE_HOVER}
                    emissiveIntensity={0.0001}
                />
            </mesh>
            {isSelected && (
                <>
                    <mesh geometry={geometry} material={stencilWriteMat} renderOrder={1} />
                    <mesh geometry={geometry} material={outlineMat} renderOrder={2} />
                </>
            )}
        </>
    );
}

export function Test() {
    const { nodes, materials } = useGLTF("/shirt_pbr.gltf") as unknown as TShirtGLTF;

    const shirtMat  = materials.shirt;
    const insideMat = materials.shirt_inside;

    const normalMap  = shirtMat.normalMap  ?? null;
    const aoRoughMap = shirtMat.aoMap      ?? shirtMat.roughnessMap ?? null;

    return (
        <group dispose={null}>
            <ShirtMesh part="back"         geometry={nodes["t-shirt_back"].geometry}         normalMap={normalMap} aoRoughMap={aoRoughMap} />
            <ShirtMesh part="sleeve_left"  geometry={nodes["t-shirt_sleeve_left"].geometry}  normalMap={normalMap} aoRoughMap={aoRoughMap} />
            <ShirtMesh part="sleeve_right" geometry={nodes["t-shirt_sleeve_right"].geometry} normalMap={normalMap} aoRoughMap={aoRoughMap} />
            <ShirtMesh part="front"        geometry={nodes["t-shirt_front"].geometry}        normalMap={normalMap} aoRoughMap={aoRoughMap} />
            <ShirtMesh part="collar"       geometry={nodes["t-shirt_collar"].geometry}       normalMap={normalMap} aoRoughMap={aoRoughMap} />
            <mesh geometry={nodes["t-shirt_inside"].geometry} material={insideMat} />
        </group>
    );
}

if (typeof window !== "undefined") {
    useGLTF.preload("/shirt_pbr.gltf");
}
