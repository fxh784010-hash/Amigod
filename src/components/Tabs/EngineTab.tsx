import React, { useState } from 'react';
import { EngineConfig, EngineLayout } from '../../types/engine';
import { Sliders, Wrench, ShieldAlert } from 'lucide-react';

interface EngineTabProps {
  config: EngineConfig;
  onChangeConfig: (newConfig: Partial<EngineConfig>) => void;
}

const COMMON_FIRING_ORDERS: Record<number, number[][]> = {
  1: [[1]],
  2: [[1, 2]],
  3: [[1, 2, 3], [1, 3, 2]],
  4: [[1, 3, 4, 2], [1, 2, 4, 3], [1, 4, 3, 2]],
  5: [[1, 2, 4, 5, 3], [1, 5, 2, 3, 4]],
  6: [[1, 5, 3, 6, 2, 4], [1, 4, 2, 5, 3, 6], [1, 6, 2, 4, 3, 5]],
  8: [[1, 8, 4, 3, 6, 5, 7, 2], [1, 5, 4, 2, 6, 3, 7, 8], [1, 5, 3, 7, 4, 8, 2, 6]],
  10: [[1, 6, 5, 10, 2, 7, 3, 8, 4, 9], [1, 10, 9, 4, 3, 6, 5, 8, 7, 2]],
  12: [[1, 12, 4, 9, 2, 11, 6, 7, 3, 10, 5, 8], [1, 7, 5, 11, 3, 9, 6, 12, 2, 8, 4, 10]]
};

export const EngineTab: React.FC<EngineTabProps> = ({ config, onChangeConfig }) => {
  const [customOrderInput, setCustomOrderInput] = useState(config.firingOrder.join('-'));

  const handleCylinderCountChange = (count: number) => {
    let layout = config.layout;
    if (count === 1) layout = 'single';
    else if (count === 8 || count === 10 || count === 12) layout = 'v';

    const defaultOrders = COMMON_FIRING_ORDERS[count] || [[1]];
    const order = defaultOrders[0] || Array.from({ length: count }, (_, i) => i + 1);

    // Calculate displacement based on standard bore/stroke
    const bore = config.boreMm;
    const stroke = config.strokeMm;
    const disp = Math.round(Math.PI * Math.pow(bore / 20, 2) * (stroke / 10) * count);

    onChangeConfig({
      cylinders: count,
      layout,
      firingOrder: order,
      displacementCc: disp
    });
    setCustomOrderInput(order.join('-'));
  };

  const handleLayoutChange = (layout: EngineLayout) => {
    let vAngle = config.vAngle;
    if (layout === 'v') vAngle = 90;
    else if (layout === 'boxer') vAngle = 180;
    else vAngle = 0;

    onChangeConfig({ layout, vAngle });
  };

  const handleApplyCustomOrder = () => {
    const parts = customOrderInput
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= config.cylinders);

    if (parts.length === config.cylinders) {
      onChangeConfig({ firingOrder: parts });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 text-xs font-mono">
      {/* 1. Cylinders & Layout */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Wrench size={14} />
            <span>CYLINDERS & CONFIG</span>
          </span>
          <span className="text-neutral-400">{config.cylinders} Cylinders</span>
        </div>

        {/* Cylinder Count Buttons */}
        <div>
          <label className="text-neutral-400 block mb-1.5">CYLINDER COUNT</label>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
              <button
                key={num}
                onClick={() => handleCylinderCountChange(num)}
                className={`py-1.5 rounded text-center font-bold transition cursor-pointer border ${
                  config.cylinders === num
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Layout Buttons */}
        <div>
          <label className="text-neutral-400 block mb-1.5">ENGINE LAYOUT</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['inline', 'v', 'boxer', 'single'] as EngineLayout[]).map((layout) => (
              <button
                key={layout}
                onClick={() => handleLayoutChange(layout)}
                className={`py-1.5 rounded uppercase text-center font-bold transition cursor-pointer border ${
                  config.layout === layout
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>

        {/* V-Angle slider if V engine */}
        {config.layout === 'v' && (
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>V-BANK ANGLE</span>
              <span className="text-emerald-400 font-bold">{config.vAngle}°</span>
            </div>
            <input
              type="range"
              min="45"
              max="120"
              step="5"
              value={config.vAngle}
              onChange={(e) => onChangeConfig({ vAngle: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>60° (V6)</span>
              <span>72° (V10)</span>
              <span>90° (V8)</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Bore, Stroke & Displacement */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Sliders size={14} />
            <span>DISPLACEMENT & BORE</span>
          </span>
          <span className="text-emerald-400 font-bold">{config.displacementCc} cc</span>
        </div>

        {/* Bore */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>BORE DIAMETER</span>
            <span className="text-neutral-200">{config.boreMm} mm</span>
          </div>
          <input
            type="range"
            min="65"
            max="110"
            step="0.5"
            value={config.boreMm}
            onChange={(e) => {
              const bore = parseFloat(e.target.value);
              const disp = Math.round(
                Math.PI * Math.pow(bore / 20, 2) * (config.strokeMm / 10) * config.cylinders
              );
              onChangeConfig({ boreMm: bore, displacementCc: disp });
            }}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Stroke */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>STROKE LENGTH</span>
            <span className="text-neutral-200">{config.strokeMm} mm</span>
          </div>
          <input
            type="range"
            min="60"
            max="110"
            step="0.5"
            value={config.strokeMm}
            onChange={(e) => {
              const stroke = parseFloat(e.target.value);
              const disp = Math.round(
                Math.PI * Math.pow(config.boreMm / 20, 2) * (stroke / 10) * config.cylinders
              );
              onChangeConfig({ strokeMm: stroke, displacementCc: disp });
            }}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Compression Ratio */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>COMPRESSION RATIO</span>
            <span className="text-neutral-200">{config.compressionRatio.toFixed(1)}:1</span>
          </div>
          <input
            type="range"
            min="8.0"
            max="14.5"
            step="0.1"
            value={config.compressionRatio}
            onChange={(e) => onChangeConfig({ compressionRatio: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* 3. RPM Limits & Firing Order */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between text-neutral-300 font-semibold border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldAlert size={14} />
            <span>FIRING ORDER & LIMITS</span>
          </span>
          <span className="text-red-400 font-bold">{config.redlineRpm} RPM</span>
        </div>

        {/* Redline RPM */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>REV LIMITER (REDLINE)</span>
            <span className="text-red-400 font-bold">{config.redlineRpm} RPM</span>
          </div>
          <input
            type="range"
            min="5500"
            max="9500"
            step="100"
            value={config.redlineRpm}
            onChange={(e) => onChangeConfig({ redlineRpm: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* Idle RPM */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>IDLE SPEED</span>
            <span className="text-neutral-200">{config.idleRpm} RPM</span>
          </div>
          <input
            type="range"
            min="600"
            max="1200"
            step="25"
            value={config.idleRpm}
            onChange={(e) => onChangeConfig({ idleRpm: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Firing Order Selector & Custom Input */}
        <div>
          <label className="text-neutral-400 block mb-1">FIRING ORDER</label>
          {COMMON_FIRING_ORDERS[config.cylinders] && (
            <div className="flex flex-wrap gap-1 mb-2">
              {COMMON_FIRING_ORDERS[config.cylinders].map((order, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChangeConfig({ firingOrder: order });
                    setCustomOrderInput(order.join('-'));
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                    config.firingOrder.join('-') === order.join('-')
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {order.join('-')}
                </button>
              ))}
            </div>
          )}

          {/* Custom Firing Order input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customOrderInput}
              onChange={(e) => setCustomOrderInput(e.target.value)}
              placeholder="e.g. 1-3-4-2"
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleApplyCustomOrder}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-semibold text-xs transition cursor-pointer"
            >
              SET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
