import React, { useState } from 'react';
import { Upload, Play, Check, Trash2, Sliders, Music } from 'lucide-react';
import { SampleManager, SampleType } from '../../audio/SampleManager';
import { AudioEngine } from '../../audio/AudioEngine';

interface SoundPackTabProps {
  audio: AudioEngine | null;
  sampleMixRatio: number;
  onMixRatioChange: (ratio: number) => void;
}

export const SoundPackTab: React.FC<SoundPackTabProps> = ({
  audio,
  sampleMixRatio,
  onMixRatioChange
}) => {
  const [loadedFiles, setLoadedFiles] = useState<Record<SampleType, string | null>>({
    idle: null,
    low: null,
    mid: null,
    high: null,
    exhaust: null,
    intake: null,
    turbo: null
  });
  const [playingType, setPlayingType] = useState<SampleType | null>(null);

  const sampleSlots: { type: SampleType; label: string; desc: string }[] = [
    { type: 'idle', label: 'IDLE SAMPLE', desc: 'Sub 900 RPM discrete pulse loop' },
    { type: 'low', label: 'LOW RPM (1500-2500)', desc: 'Smooth low engine roar' },
    { type: 'mid', label: 'MID RPM (3000-5000)', desc: 'Full harmonic midrange snarl' },
    { type: 'high', label: 'HIGH RPM (6000+)', desc: 'Screaming top-end revs' },
    { type: 'exhaust', label: 'EXHAUST TUBE SAMPLE', desc: 'Direct tailpipe rumble' },
    { type: 'intake', label: 'INTAKE SAMPLE', desc: 'Induction roar and air suction' },
    { type: 'turbo', label: 'TURBO SAMPLE', desc: 'Compressor whistle and spool' }
  ];

  const handleFileUpload = async (type: SampleType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audio) return;

    try {
      audio.resumeContext();
      const sampleManager = audio.getSampleManager();
      if (sampleManager) {
        const fileName = await sampleManager.loadUserSample(type, file);
        setLoadedFiles((prev) => ({ ...prev, [type]: fileName }));
      }
    } catch (err) {
      console.error('Failed to load audio sample:', err);
    }
  };

  const handleTestPreview = (type: SampleType) => {
    if (!audio) return;
    const sampleManager = audio.getSampleManager();
    const buffer = sampleManager?.getSample(type);
    if (!buffer) return;

    audio.resumeContext();
    // Quick test play
    const ctx = (audio as any).ctx as AudioContext;
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    setPlayingType(type);
    source.onended = () => setPlayingType(null);
  };

  return (
    <div className="p-4 text-xs font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-800 gap-2">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-emerald-400" />
          <div>
            <div className="font-bold text-sm text-neutral-200 uppercase">ENGINE SOUND PACK STUDIO</div>
            <div className="text-[11px] text-neutral-400">
              Upload custom audio files (.wav, .mp3, .ogg) to blend with procedural engine synthesis
            </div>
          </div>
        </div>

        {/* Blend Ratio Slider */}
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
          <span className="text-[11px] text-neutral-400">HYBRID BLEND:</span>
          <span className="text-emerald-400 font-bold">{Math.round(sampleMixRatio * 100)}% SAMPLES</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sampleMixRatio}
            onChange={(e) => onMixRatioChange(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Upload Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sampleSlots.map((slot) => {
          const fileName = loadedFiles[slot.type];
          return (
            <div
              key={slot.type}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-neutral-200">{slot.label}</span>
                  {fileName && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <Check size={11} /> LOADED
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 mb-2 truncate">
                  {fileName || slot.desc}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/80">
                <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500 rounded text-neutral-200 cursor-pointer transition text-[11px]">
                  <Upload size={12} />
                  <span>{fileName ? 'REPLACE' : 'UPLOAD'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(slot.type, e)}
                    className="hidden"
                  />
                </label>

                {fileName && (
                  <button
                    onClick={() => handleTestPreview(slot.type)}
                    className={`p-1.5 rounded border transition cursor-pointer ${
                      playingType === slot.type
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                    title="Test Preview"
                  >
                    <Play size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
