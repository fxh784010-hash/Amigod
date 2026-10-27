import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Disc, Volume2, Wind, Music, Activity } from 'lucide-react';
import { EngineConfig, AudioMixerSettings, AudioDebugData, EngineState } from '../types/engine';
import { EngineTab } from './Tabs/EngineTab';
import { ExhaustTab } from './Tabs/ExhaustTab';
import { AudioMixerTab } from './Tabs/AudioMixerTab';
import { TurboTab } from './Tabs/TurboTab';
import { SoundPackTab } from './Tabs/SoundPackTab';
import { AudioDebugTab } from './Tabs/AudioDebugTab';
import { AudioEngine } from '../audio/AudioEngine';

interface BottomDockProps {
  config: EngineConfig;
  onChangeConfig: (newConfig: Partial<EngineConfig>) => void;
  mixerSettings: AudioMixerSettings;
  onChangeMixerSettings: (newSettings: Partial<AudioMixerSettings>) => void;
  onResetMixerDefaults: () => void;
  debugData: AudioDebugData;
  state: EngineState;
  audio: AudioEngine | null;
  onTestPop: () => void;
  onTestBov: () => void;
}

type TabKey = 'engine' | 'exhaust' | 'mixer' | 'turbo' | 'soundpack' | 'debug';

export const BottomDock: React.FC<BottomDockProps> = ({
  config,
  onChangeConfig,
  mixerSettings,
  onChangeMixerSettings,
  onResetMixerDefaults,
  debugData,
  state,
  audio,
  onTestPop,
  onTestBov
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('engine');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'engine', label: 'ENGINE', icon: <Cpu size={14} /> },
    { key: 'exhaust', label: 'EXHAUST', icon: <Disc size={14} /> },
    { key: 'mixer', label: 'AUDIO MIXER', icon: <Volume2 size={14} /> },
    { key: 'turbo', label: 'TURBO & POPS', icon: <Wind size={14} /> },
    { key: 'soundpack', label: 'SOUND PACK', icon: <Music size={14} /> },
    { key: 'debug', label: 'AUDIO DEBUG', icon: <Activity size={14} /> }
  ];

  return (
    <div className="w-full bg-neutral-950 border-t border-neutral-800 transition-all duration-300 select-none">
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* Dock Header Bar with Tab buttons & Collapse button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-850 bg-neutral-900/90 overflow-x-auto no-scrollbar gap-2">
          {/* Tab Navigation buttons */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key && !isCollapsed;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setIsCollapsed(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition cursor-pointer ml-auto"
            title={isCollapsed ? 'Show Controls' : 'Hide Controls'}
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={14} />
                <span className="hidden sm:inline">EXPAND</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span className="hidden sm:inline">COLLAPSE</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Content Panel (rendered when not collapsed) */}
        {!isCollapsed && (
          <div className="max-h-[380px] overflow-y-auto bg-neutral-950/95">
            {activeTab === 'engine' && (
              <EngineTab config={config} onChangeConfig={onChangeConfig} />
            )}
            {activeTab === 'exhaust' && (
              <ExhaustTab config={config} onChangeConfig={onChangeConfig} />
            )}
            {activeTab === 'mixer' && (
              <AudioMixerTab
                settings={mixerSettings}
                onChangeSettings={onChangeMixerSettings}
                onResetDefaults={onResetMixerDefaults}
              />
            )}
            {activeTab === 'turbo' && (
              <TurboTab
                config={config}
                onChangeConfig={onChangeConfig}
                onTestPop={onTestPop}
                onTestBov={onTestBov}
              />
            )}
            {activeTab === 'soundpack' && (
              <SoundPackTab
                audio={audio}
                sampleMixRatio={mixerSettings.sampleMixRatio}
                onMixRatioChange={(ratio) => onChangeMixerSettings({ sampleMixRatio: ratio })}
              />
            )}
            {activeTab === 'debug' && (
              <AudioDebugTab
                debugData={debugData}
                state={state}
                config={config}
                mixerSettings={mixerSettings}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
