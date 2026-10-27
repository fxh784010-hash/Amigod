import React from 'react';
import { AudioMixerSettings } from '../../types/engine';
import { Volume2, Sliders, ShieldCheck } from 'lucide-react';

interface AudioMixerTabProps {
  settings: AudioMixerSettings;
  onChangeSettings: (newSettings: Partial<AudioMixerSettings>) => void;
  onResetDefaults: () => void;
}

export const AudioMixerTab: React.FC<AudioMixerTabProps> = ({
  settings,
  onChangeSettings,
  onResetDefaults
}) => {
  const mixerChannels = [
    { key: 'masterGain', label: 'MASTER VOLUME', min: 0, max: 1.5, step: 0.05, desc: 'Overall engine acoustic level' },
    { key: 'combustionGain', label: 'COMBUSTION PULSE', min: 0, max: 1.5, step: 0.05, desc: '4-stroke cylinder power stroke impulse' },
    { key: 'exhaustGain', label: 'EXHAUST RESONANCE', min: 0, max: 1.5, step: 0.05, desc: 'Pipe acoustic tuned body sound' },
    { key: 'bassBoost', label: 'SUB-BASS BODY THUMP', min: 0, max: 2.0, step: 0.1, desc: 'Low-frequency chest rumble & cylinder thump' },
    { key: 'intakeGain', label: 'INTAKE AIR RUSH', min: 0, max: 1.5, step: 0.05, desc: 'Throttle body suction & vacuum rush' },
    { key: 'mechanicalGain', label: 'MECHANICAL / CRANK', min: 0, max: 1.5, step: 0.05, desc: 'Crank rotation, rod motion & valve ticking' },
    { key: 'turboGain', label: 'TURBO SPOOL & WHISTLE', min: 0, max: 1.5, step: 0.05, desc: 'Compressor hiss and turbine whistle' },
    { key: 'popsGain', label: 'POPS & BANGS DETONATIONS', min: 0, max: 2.0, step: 0.1, desc: 'Violent unburnt fuel overrun crackles' }
  ];

  return (
    <div className="p-4 text-xs font-mono">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">MULTI-LAYER AUDIO MIXER CONSOLE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 text-[11px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">
            <ShieldCheck size={13} />
            <span>SOFT-CLIP LIMITER ACTIVE (NO CLIPPING)</span>
          </div>
          <button
            onClick={onResetDefaults}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 rounded transition cursor-pointer"
          >
            RESET MIX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {mixerChannels.map((ch) => {
          const value = (settings as any)[ch.key];
          return (
            <div
              key={ch.key}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-neutral-300 mb-1">
                <span className="font-semibold text-[11px]">{ch.label}</span>
                <span className="text-emerald-400 font-bold font-mono-numbers">
                  {Math.round((value / 1.0) * 100)}%
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 mb-2 h-6">{ch.desc}</p>
              <input
                type="range"
                min={ch.min}
                max={ch.max}
                step={ch.step}
                value={value}
                onChange={(e) => onChangeSettings({ [ch.key]: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
