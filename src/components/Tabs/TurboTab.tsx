import React from 'react';
import { EngineConfig } from '../../types/engine';
import { Wind, Flame, Volume2, Sparkles } from 'lucide-react';

interface TurboTabProps {
  config: EngineConfig;
  onChangeConfig: (newConfig: Partial<EngineConfig>) => void;
  onTestPop: () => void;
  onTestBov: () => void;
}

export const TurboTab: React.FC<TurboTabProps> = ({
  config,
  onChangeConfig,
  onTestPop,
  onTestBov
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-xs font-mono">
      {/* 1. Turbocharger System */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-teal-400">
            <Wind size={15} />
            <span>FORCED INDUCTION / TURBOCHARGER</span>
          </span>
          <button
            onClick={() => onChangeConfig({ turboEnabled: !config.turboEnabled })}
            className={`px-3 py-1 rounded font-bold border transition cursor-pointer ${
              config.turboEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white'
            }`}
          >
            {config.turboEnabled ? 'TURBO ON' : 'TURBO OFF'}
          </button>
        </div>

        {/* Max Boost */}
        <div className={!config.turboEnabled ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>MAX BOOST PRESSURE</span>
            <span className="text-teal-400 font-bold">{config.maxBoostBar.toFixed(2)} BAR</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            value={config.maxBoostBar}
            onChange={(e) => onChangeConfig({ maxBoostBar: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-teal-400"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>0.4 bar (Street)</span>
            <span>1.4 bar (Sport)</span>
            <span>2.5 bar (Drag Race)</span>
          </div>
        </div>

        {/* Spool Rate */}
        <div className={!config.turboEnabled ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>TURBINE SPOOL SPEED</span>
            <span className="text-neutral-200">{config.turboSpoolRate.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={config.turboSpoolRate}
            onChange={(e) => onChangeConfig({ turboSpoolRate: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Test Blow-off button */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onTestBov}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-950 hover:bg-neutral-900 border border-teal-500/40 text-teal-300 font-semibold cursor-pointer active:scale-95 transition"
          >
            <Sparkles size={12} />
            <span>TEST BLOW-OFF VALVE</span>
          </button>
        </div>
      </div>

      {/* 2. Pops & Bangs Overrun Tuning */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-orange-400">
            <Flame size={15} />
            <span>POPS & BANGS (ANTI-LAG OVERRUN)</span>
          </span>
          <button
            onClick={() => onChangeConfig({ popsEnabled: !config.popsEnabled })}
            className={`px-3 py-1 rounded font-bold border transition cursor-pointer ${
              config.popsEnabled
                ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white'
            }`}
          >
            {config.popsEnabled ? 'POPS ON' : 'POPS OFF'}
          </button>
        </div>

        {/* Aggressiveness */}
        <div className={!config.popsEnabled ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>BURBLE & DETONATION INTENSITY</span>
            <span className="text-orange-400 font-bold">{config.popsAggressiveness}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={config.popsAggressiveness}
            onChange={(e) => onChangeConfig({ popsAggressiveness: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>Mild Gurgle</span>
            <span>Gunshot Crackles</span>
            <span>Violent Backfires</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Pops detonate automatically when you rev to high RPM and lift off the throttle pedal, igniting unburnt fuel inside the glowing red exhaust headers.
        </p>

        {/* Test Pop Button */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onTestPop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-950 hover:bg-neutral-900 border border-orange-500/40 text-orange-400 font-semibold cursor-pointer active:scale-95 transition"
          >
            <Volume2 size={13} />
            <span>TRIGGER EXHAUST POP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
