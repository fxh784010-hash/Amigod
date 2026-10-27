import React, { useRef, useEffect } from 'react';
import { Power, Flame, Zap } from 'lucide-react';
import { EngineState } from '../types/engine';

interface ControlPedalProps {
  state: EngineState;
  onToggleStart: () => void;
  onThrottleChange: (throttle: number) => void;
  onRevStart: () => void;
  onRevEnd: () => void;
}

export const ControlPedal: React.FC<ControlPedalProps> = ({
  state,
  onToggleStart,
  onThrottleChange,
  onRevStart,
  onRevEnd
}) => {
  const isRevvingRef = useRef(false);

  // Keyboard shortcut support: Space to REV, 's' to START/STOP
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isRevvingRef.current = true;
        onRevStart();
      } else if (e.code === 'KeyS' && !e.repeat) {
        e.preventDefault();
        onToggleStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        isRevvingRef.current = false;
        onRevEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onRevStart, onRevEnd, onToggleStart]);

  return (
    <div className="w-full bg-neutral-950 border-t border-neutral-800/80 px-3 sm:px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Ignition & Rev Buttons Cluster */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Main START / STOP ENGINE Button */}
          <button
            onClick={onToggleStart}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-display font-bold text-sm sm:text-base tracking-wider uppercase transition-all shadow-lg active:scale-95 cursor-pointer ${
              state.isRunning
                ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.35)]'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
            }`}
          >
            <Power size={18} className={state.isRunning ? 'animate-pulse' : ''} />
            <span>{state.isRunning ? 'STOP ENGINE' : 'START ENGINE'}</span>
          </button>

          {/* Big REV ENGINE Pedal Button (Hold to Rev) */}
          <button
            onMouseDown={onRevStart}
            onMouseUp={onRevEnd}
            onMouseLeave={onRevEnd}
            onTouchStart={(e) => {
              e.preventDefault();
              onRevStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onRevEnd();
            }}
            disabled={!state.isRunning}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display font-bold text-sm sm:text-base tracking-wider uppercase transition-all shadow-lg select-none cursor-pointer ${
              !state.isRunning
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60'
                : state.throttle > 0.7
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-95'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/40 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            }`}
          >
            <Flame size={18} className={state.throttle > 0.5 ? 'animate-bounce text-orange-600' : ''} />
            <span>REV ENGINE</span>
            <span className="text-[10px] font-mono opacity-60 hidden md:inline">[SPACE]</span>
          </button>
        </div>

        {/* Continuous Throttle Slider & Steppers */}
        <div className="w-full sm:flex-1 max-w-xl flex flex-col gap-1.5 bg-neutral-900/80 border border-neutral-800 p-2.5 sm:p-3 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-400" />
              <span className="font-semibold text-neutral-200">ACCELERATOR / THROTTLE</span>
            </span>
            <span className="text-emerald-400 font-bold font-mono-numbers text-sm">
              {Math.round(state.throttle * 100)}%
            </span>
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!state.isRunning}
              value={state.throttle}
              onChange={(e) => onThrottleChange(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Quick Throttle Step Pills */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {[0, 0.25, 0.5, 0.75, 1.0].map((step) => {
              const isSelected = Math.abs(state.throttle - step) < 0.05;
              return (
                <button
                  key={step}
                  disabled={!state.isRunning}
                  onClick={() => onThrottleChange(step)}
                  className={`flex-1 py-1 text-[11px] font-mono rounded border transition-all cursor-pointer disabled:opacity-30 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {Math.round(step * 100)}%
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
