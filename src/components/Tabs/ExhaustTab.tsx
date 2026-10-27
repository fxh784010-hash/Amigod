import React from 'react';
import { EngineConfig } from '../../types/engine';
import { Flame, Activity, Disc, Radio } from 'lucide-react';

interface ExhaustTabProps {
  config: EngineConfig;
  onChangeConfig: (newConfig: Partial<EngineConfig>) => void;
}

export const ExhaustTab: React.FC<ExhaustTabProps> = ({ config, onChangeConfig }) => {
  // Acoustic resonance frequency calculation
  const speedOfSound = 450; // m/s in hot exhaust gas
  const fResonance = Math.round(speedOfSound / (4 * Math.max(0.5, config.exhaustPipeLengthM)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 text-xs font-mono">
      {/* 1. Exhaust Outlets & Tips */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Radio size={14} />
            <span>EXHAUST OUTLETS</span>
          </span>
          <span className="text-emerald-400 font-bold">{config.exhaustOutlets} Tips</span>
        </div>

        <div>
          <label className="text-neutral-400 block mb-1.5">NUMBER OF OUTLETS</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 6, 8, 10, 12].map((num) => (
              <button
                key={num}
                onClick={() => onChangeConfig({ exhaustOutlets: num })}
                className={`py-2 rounded text-center font-bold transition cursor-pointer border ${
                  config.exhaustOutlets === num
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {num} {num === 1 ? 'Tip' : 'Tips'}
              </button>
            ))}
          </div>
        </div>

        {/* Flame Mode Toggle */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className={config.exhaustFlames ? 'text-orange-400' : 'text-neutral-500'} />
            <div>
              <div className="font-semibold text-neutral-200">EXHAUST FLAME MODE</div>
              <div className="text-[10px] text-neutral-500">Visual fire jets from exhaust tips</div>
            </div>
          </div>
          <button
            onClick={() => onChangeConfig({ exhaustFlames: !config.exhaustFlames })}
            className={`px-3 py-1.5 rounded font-bold text-xs border transition cursor-pointer ${
              config.exhaustFlames
                ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
          >
            {config.exhaustFlames ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 2. Pipe Acoustics & Resonance */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Activity size={14} />
            <span>PIPE RESONANCE & FLOW</span>
          </span>
          <span className="text-cyan-400 font-bold">{fResonance} Hz</span>
        </div>

        {/* Pipe Length */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>PIPE LENGTH (RUNNERS + MIDPIPE)</span>
            <span className="text-neutral-200">{config.exhaustPipeLengthM.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.5"
            step="0.1"
            value={config.exhaustPipeLengthM}
            onChange={(e) => onChangeConfig({ exhaustPipeLengthM: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>1.0m (High Pitch)</span>
            <span>2.2m (Tuned)</span>
            <span>3.5m (Deep Bass)</span>
          </div>
        </div>

        {/* Pipe Diameter */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>PIPE DIAMETER</span>
            <span className="text-neutral-200">{config.exhaustPipeDiameterIn.toFixed(2)}"</span>
          </div>
          <input
            type="range"
            min="1.75"
            max="4.5"
            step="0.25"
            value={config.exhaustPipeDiameterIn}
            onChange={(e) => onChangeConfig({ exhaustPipeDiameterIn: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>2.0" (Backpressure)</span>
            <span>3.0" (Sport)</span>
            <span>4.5" (Open Race)</span>
          </div>
        </div>
      </div>

      {/* 3. Muffler & Acoustic Damping */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Disc size={14} />
            <span>MUFFLER & RESTRICTION</span>
          </span>
          <span className="text-neutral-300 uppercase">{config.mufflerType.replace('_', ' ')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'straight_pipe', name: 'Straight Pipe', desc: 'Zero damping, maximum rasp & raw flame roar' },
            { id: 'performance', name: 'Performance', desc: 'Free-flow high-RPM throatiness' },
            { id: 'resonated', name: 'Resonated', desc: 'Eliminates drone, deep bass tone' },
            { id: 'chambered', name: 'Chambered', desc: 'Quiet stock OEM baffle restriction' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => onChangeConfig({ mufflerType: m.id as any })}
              className={`p-2 rounded text-left border transition cursor-pointer flex flex-col gap-1 ${
                config.mufflerType === m.id
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
              }`}
            >
              <span className="font-bold text-xs">{m.name}</span>
              <span className="text-[10px] opacity-70 leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
