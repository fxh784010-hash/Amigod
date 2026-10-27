import React, { useRef, useEffect } from 'react';
import { Camera, Maximize2, Flame, Eye } from 'lucide-react';
import { EngineScene } from '../graphics/EngineScene';
import { EngineConfig, EngineState } from '../types/engine';

interface Viewport3DProps {
  config: EngineConfig;
  state: EngineState;
  engineSceneRef: React.MutableRefObject<EngineScene | null>;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ config, state, engineSceneRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new EngineScene(containerRef.current, config);
    engineSceneRef.current = scene;

    return () => {
      scene.destroy();
      engineSceneRef.current = null;
    };
  }, []);

  // When engine config layout or cylinders change, rebuild 3D engine meshes
  useEffect(() => {
    if (engineSceneRef.current) {
      engineSceneRef.current.rebuildEngine3D(config);
    }
  }, [config.cylinders, config.layout, config.vAngle, config.exhaustOutlets, config.boreMm, config.strokeMm]);

  // Handle camera view preset clicks
  const handleCameraChange = (preset: 'iso' | 'cutaway' | 'exhaust' | 'top') => {
    engineSceneRef.current?.setCameraView(preset);
  };

  return (
    <div className="relative w-full h-full min-h-[320px] sm:min-h-[440px] lg:min-h-[500px] bg-neutral-950 overflow-hidden flex flex-col">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Top Overlays: Camera controls & Active Cylinder readout */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {/* Engine Spec Badge */}
        <div className="pointer-events-auto bg-neutral-900/85 backdrop-blur-md border border-neutral-800 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">LAYOUT</span>
            <span className="text-xs font-display font-bold text-white tracking-wider uppercase">
              {config.layout} {config.cylinders} CYL ({config.displacementCc}cc)
            </span>
          </div>
          <div className="h-6 w-[1px] bg-neutral-800" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">ORDER</span>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {config.firingOrder.join('-')}
            </span>
          </div>
        </div>

        {/* Camera Preset Quick Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-neutral-900/85 backdrop-blur-md border border-neutral-800 p-1 rounded-lg shadow-lg">
          <button
            onClick={() => handleCameraChange('iso')}
            className="px-2 py-1 text-[11px] font-mono rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            title="Isometric View"
          >
            ISO
          </button>
          <button
            onClick={() => handleCameraChange('cutaway')}
            className="px-2 py-1 text-[11px] font-mono rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            title="Side Cutaway View"
          >
            SIDE
          </button>
          <button
            onClick={() => handleCameraChange('exhaust')}
            className="px-2 py-1 text-[11px] font-mono rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            title="Exhaust Manifold View"
          >
            EXHAUST
          </button>
          <button
            onClick={() => handleCameraChange('top')}
            className="px-2 py-1 text-[11px] font-mono rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            title="Top View"
          >
            TOP
          </button>
        </div>
      </div>

      {/* Floating Active Cylinder & Flame indicator overlay */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-10 flex items-center gap-2">
        <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded px-2.5 py-1 text-[11px] font-mono text-neutral-300 flex items-center gap-2">
          <span>FIRING:</span>
          <span className="font-bold text-emerald-400 text-xs">CYL #{state.activeCylinder}</span>
        </div>
        {state.exhaustFlameIntensity > 0.1 && (
          <div className="bg-red-950/80 border border-red-500/50 rounded px-2.5 py-1 text-[11px] font-mono text-red-400 flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <Flame size={12} className="text-orange-400 animate-bounce" />
            <span>EXHAUST FLAME</span>
          </div>
        )}
      </div>
    </div>
  );
};
