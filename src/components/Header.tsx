import React from 'react';
import { Volume2, VolumeX, Sparkles, Wrench, RotateCcw } from 'lucide-react';
import { EngineConfig } from '../types/engine';
import { ENGINE_PRESETS } from '../data/presets';

interface HeaderProps {
  currentConfig: EngineConfig;
  onSelectPreset: (preset: EngineConfig) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenCustomBuilder: () => void;
  onResetEngine: () => void;
  isRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentConfig,
  onSelectPreset,
  isMuted,
  onToggleMute,
  onOpenCustomBuilder,
  onResetEngine,
  isRunning
}) => {
  return (
    <header className="w-full bg-neutral-950/90 border-b border-neutral-800/80 px-4 py-2.5 z-30 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-display text-lg shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              FX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-wider text-white">
                  FX ENGINE LAB
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  v2.0
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 tracking-wide font-sans flex items-center gap-1.5">
                <span>Real Engine Sound & Mechanics</span>
                <span className="text-neutral-600">•</span>
                <span className="text-emerald-500/90 font-medium">Dev: FX HAMZA</span>
              </div>
            </div>
          </div>

          {/* Engine Running status pill */}
          <div className="sm:hidden flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold border ${
                isRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {isRunning ? 'RUNNING' : 'OFF'}
            </span>
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Preset Selector & Action Toolbar */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 rounded-lg p-1">
            <span className="text-[11px] font-mono text-neutral-400 pl-2 pr-1 hidden md:inline">PRESET:</span>
            <select
              value={currentConfig.id}
              onChange={(e) => {
                const found = ENGINE_PRESETS.find((p) => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-neutral-950 text-neutral-200 text-xs font-mono font-medium rounded px-2.5 py-1.5 border border-neutral-700 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {ENGINE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Builder Button */}
          <button
            onClick={onOpenCustomBuilder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-semibold text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer active:scale-95"
          >
            <Wrench size={13} />
            <span>BUILD ENGINE</span>
          </button>

          {/* Reset Engine Button */}
          <button
            onClick={onResetEngine}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition cursor-pointer"
            title="Reset to Default"
          >
            <RotateCcw size={14} />
          </button>

          {/* Audio Mute toggle on Desktop */}
          <button
            onClick={onToggleMute}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition text-xs font-mono cursor-pointer"
            title="Toggle Mute"
          >
            {isMuted ? (
              <>
                <VolumeX size={14} className="text-red-400" />
                <span className="text-red-400">MUTED</span>
              </>
            ) : (
              <>
                <Volume2 size={14} className="text-emerald-400" />
                <span className="text-emerald-400">AUDIO ON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
