import React from 'react';
import { AudioDebugData, EngineState, EngineConfig, AudioMixerSettings } from '../../types/engine';
import { Activity, Cpu, Radio, ShieldCheck, Zap } from 'lucide-react';

interface AudioDebugTabProps {
  debugData: AudioDebugData;
  state: EngineState;
  config: EngineConfig;
  mixerSettings: AudioMixerSettings;
}

export const AudioDebugTab: React.FC<AudioDebugTabProps> = ({
  debugData,
  state,
  config,
  mixerSettings
}) => {
  // Acoustic pipe wavelength: lambda = v / f
  const wavelengthM = (450 / Math.max(10, debugData.exhaustResonanceFreqHz)).toFixed(2);

  return (
    <div className="p-4 text-xs font-mono">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200 uppercase tracking-wider">
            AUDIO SYNTHESIS & ACOUSTICS TELEMETRY (DEBUG PANEL)
          </span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
          <span>CYCLE:</span>
          <span className="text-emerald-400 font-bold">{Math.round((state.cycleFraction * 720))}° / 720°</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {/* Firing Frequency */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">FIRING EVENTS / SEC</div>
          <div className="text-2xl font-mono-numbers font-black text-emerald-400 my-1">
            {debugData.firesPerSec} <span className="text-xs font-normal text-neutral-500">Hz</span>
          </div>
          <div className="text-[10px] text-neutral-400">
            = ({debugData.currentRpm} × {config.cylinders}) / 120
          </div>
        </div>

        {/* Current RPM */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">ROTATIONAL SPEED</div>
          <div className="text-2xl font-mono-numbers font-black text-neutral-200 my-1">
            {debugData.currentRpm} <span className="text-xs font-normal text-neutral-500">RPM</span>
          </div>
          <div className="text-[10px] text-neutral-400">
            {(debugData.currentRpm / 60).toFixed(1)} Revs/sec (Crank)
          </div>
        </div>

        {/* Active Cylinder */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">ACTIVE FIRING CYLINDER</div>
          <div className="text-2xl font-mono-numbers font-black text-amber-400 my-1">
            #{debugData.activeCylinder}
          </div>
          <div className="text-[10px] text-neutral-400">
            Order: {config.firingOrder.join('-')}
          </div>
        </div>

        {/* Exhaust Resonance */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">PIPE RESONANCE</div>
          <div className="text-2xl font-mono-numbers font-black text-cyan-400 my-1">
            {debugData.exhaustResonanceFreqHz} <span className="text-xs font-normal text-neutral-500">Hz</span>
          </div>
          <div className="text-[10px] text-neutral-400">
            λ = {wavelengthM} m (Quarter-Wave)
          </div>
        </div>

        {/* Active Audio Nodes */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">WEB AUDIO NODES</div>
          <div className="text-2xl font-mono-numbers font-black text-purple-400 my-1">
            {debugData.audioNodesCount}
          </div>
          <div className="text-[10px] text-neutral-400">
            Multi-Layer Bus Routing
          </div>
        </div>

        {/* Limiter State */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
          <div className="text-[10px] text-neutral-500 uppercase">LIMITER / FUEL-CUT</div>
          <div
            className={`text-lg font-mono-numbers font-black my-1.5 ${
              debugData.limiterState === 'HARD CUT'
                ? 'text-red-500 animate-pulse'
                : debugData.limiterState === 'SOFT CUT'
                ? 'text-amber-400'
                : 'text-neutral-400'
            }`}
          >
            {debugData.limiterState}
          </div>
          <div className="text-[10px] text-neutral-400">
            Target Cut: {config.redlineRpm} RPM
          </div>
        </div>
      </div>

      {/* Synthesis Buses Matrix */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
        <div className="text-neutral-300 font-semibold mb-2">LIVE AUDIO BUS LEVELS & ATTENUATION</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-neutral-500">Master Gain:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.masterGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Combustion Pulse:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.combustionGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Exhaust Resonance:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.exhaustGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Intake Suction:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.intakeGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Mechanical Friction:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.mechanicalGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Turbo Spool:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.turboGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Pops & Bangs:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.popsGain.toFixed(2)}x</span>
          </div>
          <div>
            <span className="text-neutral-500">Sub-Bass Boost:</span>
            <span className="text-neutral-200 font-bold ml-1.5">{mixerSettings.bassBoost.toFixed(2)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
