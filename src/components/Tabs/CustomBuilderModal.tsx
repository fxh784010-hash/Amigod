import React, { useState, useEffect } from 'react';
import { EngineConfig, EngineLayout } from '../../types/engine';
import { X, Wrench, Save, Trash2, Check, RotateCcw } from 'lucide-react';

interface CustomBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: EngineConfig;
  onApplyEngine: (config: EngineConfig) => void;
}

const STORAGE_KEY = 'fx_saved_engines_v1';

export const CustomBuilderModal: React.FC<CustomBuilderModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyEngine
}) => {
  const [engineName, setEngineName] = useState(currentConfig.name);
  const [cylinders, setCylinders] = useState(currentConfig.cylinders);
  const [layout, setLayout] = useState<EngineLayout>(currentConfig.layout);
  const [vAngle, setVAngle] = useState(currentConfig.vAngle);
  const [boreMm, setBoreMm] = useState(currentConfig.boreMm);
  const [strokeMm, setStrokeMm] = useState(currentConfig.strokeMm);
  const [compressionRatio, setCompressionRatio] = useState(currentConfig.compressionRatio);
  const [idleRpm, setIdleRpm] = useState(currentConfig.idleRpm);
  const [redlineRpm, setRedlineRpm] = useState(currentConfig.redlineRpm);
  const [firingOrderStr, setFiringOrderStr] = useState(currentConfig.firingOrder.join('-'));

  // Exhaust
  const [exhaustOutlets, setExhaustOutlets] = useState(currentConfig.exhaustOutlets);
  const [exhaustPipeLengthM, setExhaustPipeLengthM] = useState(currentConfig.exhaustPipeLengthM);
  const [exhaustPipeDiameterIn, setExhaustPipeDiameterIn] = useState(currentConfig.exhaustPipeDiameterIn);
  const [mufflerType, setMufflerType] = useState(currentConfig.mufflerType);
  const [exhaustFlames, setExhaustFlames] = useState(currentConfig.exhaustFlames);

  // Turbo & Pops
  const [turboEnabled, setTurboEnabled] = useState(currentConfig.turboEnabled);
  const [maxBoostBar, setMaxBoostBar] = useState(currentConfig.maxBoostBar);
  const [popsEnabled, setPopsEnabled] = useState(currentConfig.popsEnabled);
  const [popsAggressiveness, setPopsAggressiveness] = useState(currentConfig.popsAggressiveness);

  // Saved Engines from localStorage
  const [savedEngines, setSavedEngines] = useState<EngineConfig[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedEngines(JSON.parse(data));
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displacementCc = Math.round(
    Math.PI * Math.pow(boreMm / 20, 2) * (strokeMm / 10) * cylinders
  );

  const handleBuildEngine = () => {
    const firingOrder = firingOrderStr
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= cylinders);

    const newConfig: EngineConfig = {
      id: `custom_${Date.now()}`,
      name: engineName.trim() || `Custom ${cylinders}-Cyl (${displacementCc}cc)`,
      cylinders,
      layout,
      vAngle: layout === 'v' ? vAngle : 0,
      displacementCc,
      boreMm,
      strokeMm,
      compressionRatio,
      idleRpm,
      redlineRpm,
      firingOrder: firingOrder.length === cylinders ? firingOrder : Array.from({ length: cylinders }, (_, i) => i + 1),
      exhaustOutlets,
      exhaustPipeLengthM,
      exhaustPipeDiameterIn,
      mufflerType,
      exhaustFlames,
      turboEnabled,
      maxBoostBar,
      turboSpoolRate: 1.5,
      popsEnabled,
      popsAggressiveness
    };

    onApplyEngine(newConfig);
    onClose();
  };

  const handleSaveEngine = () => {
    const firingOrder = firingOrderStr
      .split(/[-,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= cylinders);

    const newConfig: EngineConfig = {
      id: `saved_${Date.now()}`,
      name: engineName.trim() || `My ${layout.toUpperCase()}${cylinders}`,
      cylinders,
      layout,
      vAngle: layout === 'v' ? vAngle : 0,
      displacementCc,
      boreMm,
      strokeMm,
      compressionRatio,
      idleRpm,
      redlineRpm,
      firingOrder: firingOrder.length === cylinders ? firingOrder : Array.from({ length: cylinders }, (_, i) => i + 1),
      exhaustOutlets,
      exhaustPipeLengthM,
      exhaustPipeDiameterIn,
      mufflerType,
      exhaustFlames,
      turboEnabled,
      maxBoostBar,
      turboSpoolRate: 1.5,
      popsEnabled,
      popsAggressiveness
    };

    const updated = [newConfig, ...savedEngines.filter((e) => e.name !== newConfig.name)];
    setSavedEngines(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedEngines.filter((e) => e.id !== id);
    setSavedEngines(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadSaved = (saved: EngineConfig) => {
    setEngineName(saved.name);
    setCylinders(saved.cylinders);
    setLayout(saved.layout);
    setVAngle(saved.vAngle || 90);
    setBoreMm(saved.boreMm);
    setStrokeMm(saved.strokeMm);
    setCompressionRatio(saved.compressionRatio);
    setIdleRpm(saved.idleRpm);
    setRedlineRpm(saved.redlineRpm);
    setFiringOrderStr(saved.firingOrder.join('-'));
    setExhaustOutlets(saved.exhaustOutlets);
    setExhaustPipeLengthM(saved.exhaustPipeLengthM);
    setExhaustPipeDiameterIn(saved.exhaustPipeDiameterIn);
    setMufflerType(saved.mufflerType);
    setExhaustFlames(saved.exhaustFlames);
    setTurboEnabled(saved.turboEnabled);
    setMaxBoostBar(saved.maxBoostBar);
    setPopsEnabled(saved.popsEnabled);
    setPopsAggressiveness(saved.popsAggressiveness);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Wrench size={16} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">BUILD YOUR ENGINE</h2>
              <p className="text-xs font-mono text-neutral-400">
                Custom Mechanical & Acoustic Configuration Wizard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Engine Name */}
          <div>
            <label className="text-neutral-400 block mb-1.5">ENGINE NAME / LABEL</label>
            <input
              type="text"
              value={engineName}
              onChange={(e) => setEngineName(e.target.value)}
              placeholder="e.g. 5.0L Twin Turbo Flat-Plane V8"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Saved Engines Bar */}
          {savedEngines.length > 0 && (
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-3">
              <div className="text-[11px] text-neutral-400 mb-2 flex items-center justify-between">
                <span>SAVED CUSTOM ENGINES IN LOCAL STORAGE</span>
                <span className="text-emerald-400">{savedEngines.length} saved</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedEngines.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200"
                  >
                    <button
                      onClick={() => handleLoadSaved(saved)}
                      className="hover:text-emerald-400 font-bold transition cursor-pointer"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(saved.id)}
                      className="text-neutral-500 hover:text-red-400 ml-1 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cylinders */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <label className="text-neutral-400 block mb-1.5">CYLINDER COUNT: {cylinders}</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setCylinders(num);
                      const defaultOrder = Array.from({ length: num }, (_, i) => i + 1);
                      setFiringOrderStr(defaultOrder.join('-'));
                    }}
                    className={`py-1.5 rounded font-bold transition border cursor-pointer ${
                      cylinders === num
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <label className="text-neutral-400 block mb-1.5">LAYOUT: {layout.toUpperCase()}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['inline', 'v', 'boxer', 'single'] as EngineLayout[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`py-1.5 rounded uppercase font-bold transition border cursor-pointer ${
                      layout === l
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bore, Stroke & Redline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>BORE</span>
                <span className="text-white font-bold">{boreMm} mm</span>
              </div>
              <input
                type="range"
                min="65"
                max="105"
                step="1"
                value={boreMm}
                onChange={(e) => setBoreMm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
              />
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>STROKE</span>
                <span className="text-white font-bold">{strokeMm} mm</span>
              </div>
              <input
                type="range"
                min="65"
                max="105"
                step="1"
                value={strokeMm}
                onChange={(e) => setStrokeMm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
              />
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>REV LIMITER</span>
                <span className="text-red-400 font-bold">{redlineRpm} RPM</span>
              </div>
              <input
                type="range"
                min="5500"
                max="9500"
                step="100"
                value={redlineRpm}
                onChange={(e) => setRedlineRpm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-red-500"
              />
            </div>
          </div>

          {/* Firing Order & Outlets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <label className="text-neutral-400 block mb-1">FIRING ORDER (Hyphen separated)</label>
              <input
                type="text"
                value={firingOrderStr}
                onChange={(e) => setFiringOrderStr(e.target.value)}
                placeholder="e.g. 1-3-4-2"
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
              <label className="text-neutral-400 block mb-1.5">EXHAUST OUTLET COUNT</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 4, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => setExhaustOutlets(num)}
                    className={`py-1.5 rounded font-bold border transition cursor-pointer ${
                      exhaustOutlets === num
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    {num} Tips
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-neutral-400 text-xs">
            Calculated Displacement: <span className="text-emerald-400 font-bold">{displacementCc} cc</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveEngine}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold cursor-pointer transition active:scale-95"
            >
              <Save size={14} />
              <span>SAVE CONFIG</span>
            </button>

            <button
              onClick={handleBuildEngine}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold tracking-wider uppercase cursor-pointer transition active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Check size={16} />
              <span>CREATE & RUN ENGINE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
