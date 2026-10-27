import React from 'react';
import { Gauge, Zap, Flame, Thermometer, Wind, Activity } from 'lucide-react';
import { EngineConfig, EngineState } from '../types/engine';

interface GaugeClusterProps {
  state: EngineState;
  config: EngineConfig;
}

export const GaugeCluster: React.FC<GaugeClusterProps> = ({ state, config }) => {
  const redline = config.redlineRpm;
  const rpmPercent = Math.min(100, (state.rpm / redline) * 100);
  const isRedline = state.rpm >= redline - 200;

  // Dyno curve generation for live SVG mini chart
  const dynoPointsCount = 20;
  const points: { rpm: number; hp: number; torque: number }[] = [];
  const dispL = config.displacementCc / 1000;
  const basePeakTorque = dispL * 105 * (config.compressionRatio / 10.0) * (1 + (config.turboEnabled ? config.maxBoostBar * 0.8 : 0));
  const peakHp = Math.round((basePeakTorque * (redline * 0.85)) / 7127);

  for (let i = 0; i <= dynoPointsCount; i++) {
    const curRpm = (i / dynoPointsCount) * redline;
    const frac = curRpm / redline;
    const tCurve = basePeakTorque * Math.max(0.2, Math.sin(frac * Math.PI * 0.85 + 0.1));
    const hpVal = Math.round((tCurve * curRpm) / 7127);
    points.push({ rpm: curRpm, hp: hpVal, torque: Math.round(tCurve) });
  }

  // Current operating point on dyno
  const currentDynoX = Math.min(100, (state.rpm / redline) * 100);
  const currentDynoY = peakHp > 0 ? Math.min(100, (state.horsepowerHp / peakHp) * 100) : 0;

  return (
    <div className="w-full bg-neutral-900/90 border-t border-neutral-800 p-3 sm:p-4 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
        
        {/* Main Tachometer Cluster (5 Cols) */}
        <div className="md:col-span-5 bg-neutral-950/80 border border-neutral-800/90 rounded-xl p-3 sm:p-4 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                ENGINE TACHOMETER
              </span>
            </div>
            {state.isLimiterActive ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-600 text-white animate-pulse">
                REV LIMITER!
              </span>
            ) : (
              <span className="text-[11px] font-mono text-neutral-500">
                LIMIT: {redline} RPM
              </span>
            )}
          </div>

          {/* Big RPM Number Display */}
          <div className="flex items-baseline justify-between my-1">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl sm:text-5xl font-mono-numbers font-black tracking-tight ${
                  isRedline ? 'text-red-500' : 'text-emerald-400'
                }`}
              >
                {Math.round(state.rpm)}
              </span>
              <span className="text-xs font-mono text-neutral-400 font-semibold uppercase">RPM</span>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono text-neutral-400">FIRING RATE</div>
              <div className="text-lg font-mono-numbers font-bold text-neutral-200">
                {Math.round(state.firingRateHz)} <span className="text-[11px] font-normal text-neutral-500">Hz</span>
              </div>
            </div>
          </div>

          {/* RPM Bar Graph with Redline Zone */}
          <div className="w-full mt-2">
            <div className="w-full h-3.5 bg-neutral-900 rounded-md overflow-hidden p-0.5 border border-neutral-800 flex relative">
              {/* Green/Yellow zone */}
              <div
                className={`h-full rounded-sm transition-all duration-75 ${
                  isRedline
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                }`}
                style={{ width: `${rpmPercent}%` }}
              />
              {/* Redline marker tick */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500"
                style={{ left: `${((redline - 600) / redline) * 100}%` }}
              />
            </div>
            {/* Ticks numbers */}
            <div className="flex justify-between text-[9px] font-mono text-neutral-500 mt-1">
              <span>0</span>
              <span>{Math.round(redline * 0.25)}</span>
              <span>{Math.round(redline * 0.5)}</span>
              <span>{Math.round(redline * 0.75)}</span>
              <span className="text-red-500 font-bold">{redline}</span>
            </div>
          </div>
        </div>

        {/* Live Dyno Graph (3 Cols) */}
        <div className="md:col-span-3 bg-neutral-950/80 border border-neutral-800/90 rounded-xl p-3 shadow-inner flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-cyan-400" />
              <span>LIVE DYNO</span>
            </span>
            <span className="text-[10px] text-emerald-400">● HP / ■ NM</span>
          </div>

          {/* Mini Dyno Curve SVG */}
          <div className="relative w-full h-20 bg-neutral-900/60 rounded border border-neutral-800/80 overflow-hidden my-1">
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
              {/* Grid lines */}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#262626" strokeDasharray="2,2" />
              <line x1="50" y1="0" x2="50" y2="50" stroke="#262626" strokeDasharray="2,2" />
              
              {/* HP Curve (Cyan) */}
              <path
                d={points.reduce((acc, p, i) => {
                  const x = (p.rpm / redline) * 100;
                  const y = 50 - (p.hp / Math.max(1, peakHp)) * 46;
                  return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                }, '')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
              />

              {/* Torque Curve (Amber) */}
              <path
                d={points.reduce((acc, p, i) => {
                  const x = (p.rpm / redline) * 100;
                  const y = 50 - (p.torque / Math.max(1, basePeakTorque * 1.1)) * 44;
                  return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                }, '')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="2,1"
              />

              {/* Operating Point Indicator Dot */}
              {state.isRunning && (
                <circle
                  cx={currentDynoX}
                  cy={50 - (currentDynoY * 0.46)}
                  r="3.5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <div className="text-cyan-400">
              <span className="font-bold text-sm">{state.horsepowerHp}</span> HP
            </div>
            <div className="text-amber-400">
              <span className="font-bold text-sm">{state.torqueNm}</span> Nm
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry Multi-Gauges (4 Cols) */}
        <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Boost Gauge */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>BOOST</span>
              <Wind size={12} className="text-teal-400" />
            </div>
            <div className="text-base font-mono-numbers font-bold text-neutral-100 my-0.5">
              {config.turboEnabled ? `${state.boostBar.toFixed(2)}` : 'N/A'}
              <span className="text-[10px] font-normal text-neutral-500 ml-1">bar</span>
            </div>
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full transition-all duration-75"
                style={{ width: `${(state.boostBar / Math.max(0.1, config.maxBoostBar)) * 100}%` }}
              />
            </div>
          </div>

          {/* Oil Pressure */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>OIL PRESS</span>
              <Activity size={12} className="text-amber-400" />
            </div>
            <div className="text-base font-mono-numbers font-bold text-neutral-100 my-0.5">
              {state.oilPressureBar}
              <span className="text-[10px] font-normal text-neutral-500 ml-1">bar</span>
            </div>
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-75"
                style={{ width: `${(state.oilPressureBar / 7.0) * 100}%` }}
              />
            </div>
          </div>

          {/* Exhaust Gas Temperature (EGT) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>EXH TEMP</span>
              <Flame size={12} className="text-orange-400" />
            </div>
            <div className="text-base font-mono-numbers font-bold text-neutral-100 my-0.5">
              {Math.round(state.exhaustTempC)}
              <span className="text-[10px] font-normal text-neutral-500 ml-1">°C</span>
            </div>
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-150"
                style={{ width: `${((state.exhaustTempC - 200) / 700) * 100}%` }}
              />
            </div>
          </div>

          {/* Coolant Engine Temp */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>ENG TEMP</span>
              <Thermometer size={12} className="text-blue-400" />
            </div>
            <div className="text-base font-mono-numbers font-bold text-neutral-100 my-0.5">
              {Math.round(state.engineTempC)}
              <span className="text-[10px] font-normal text-neutral-500 ml-1">°C</span>
            </div>
            <div className="text-[9px] font-mono text-emerald-400">OPTIMAL</div>
          </div>

          {/* Air Fuel Ratio (AFR) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>AFR</span>
              <Zap size={12} className="text-emerald-400" />
            </div>
            <div className="text-base font-mono-numbers font-bold text-neutral-100 my-0.5">
              {state.afr.toFixed(1)}
              <span className="text-[10px] font-normal text-neutral-500 ml-1">:1</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-400">
              {state.afr < 13.0 ? 'RICH' : state.afr > 15.0 ? 'LEAN' : 'STOICH'}
            </div>
          </div>

          {/* Throttle Position Readout */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>THROTTLE</span>
              <span className="text-emerald-400 font-bold">{Math.round(state.throttle * 100)}%</span>
            </div>
            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full transition-all duration-75"
                style={{ width: `${state.throttle * 100}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
