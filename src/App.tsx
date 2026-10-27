/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EngineConfig, EngineState, AudioMixerSettings, AudioDebugData } from './types/engine';
import { ENGINE_PRESETS, DEFAULT_MIXER_SETTINGS } from './data/presets';
import { EnginePhysics } from './physics/EnginePhysics';
import { AudioEngine } from './audio/AudioEngine';
import { EngineScene } from './graphics/EngineScene';
import { Header } from './components/Header';
import { Viewport3D } from './components/Viewport3D';
import { GaugeCluster } from './components/GaugeCluster';
import { ControlPedal } from './components/ControlPedal';
import { BottomDock } from './components/BottomDock';
import { CustomBuilderModal } from './components/Tabs/CustomBuilderModal';
import { Footer } from './components/Footer';

export default function App() {
  // Current active engine configuration
  const [currentConfig, setCurrentConfig] = useState<EngineConfig>(ENGINE_PRESETS[4]); // default to V8 Muscle for deep punchy rumble!
  const [mixerSettings, setMixerSettings] = useState<AudioMixerSettings>(DEFAULT_MIXER_SETTINGS);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Engine state for React UI re-renders (throttled)
  const [engineState, setEngineState] = useState<EngineState>(() => {
    const phys = new EnginePhysics(ENGINE_PRESETS[4]);
    return phys.getState();
  });

  // Audio Debug telemetry
  const [debugData, setDebugData] = useState<AudioDebugData>({
    firesPerSec: 0,
    currentRpm: 0,
    crankAngleDeg: 0,
    activeCylinder: 1,
    audioNodesCount: 28,
    exhaustResonanceFreqHz: 140,
    limiterState: 'OFF',
    intakeIntensity: 0,
    combustionPressure: 0,
    outputRms: 0
  });

  // Physics, Audio, and 3D Scene instance refs
  const physicsRef = useRef<EnginePhysics | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const sceneRef = useRef<EngineScene | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const uiThrottleTimerRef = useRef<number>(0);
  const isRevvingRef = useRef<boolean>(false);

  // 1. Initialize Physics & Audio Engine on Mount
  useEffect(() => {
    const physics = new EnginePhysics(currentConfig);
    physicsRef.current = physics;

    const audio = new AudioEngine(mixerSettings);
    audioRef.current = audio;

    // Main 60fps simulation tick loop
    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // Rev pedal continuous ramp up while held
      if (isRevvingRef.current) {
        const curThrottle = physics.getState().throttle;
        physics.setThrottle(Math.min(1.0, curThrottle + 2.8 * dt));
      } else if (physics.getState().throttle > 0 && !isRevvingRef.current && physics.getState().targetRpm === 0) {
        // If throttle was set via rev and released, smoothly return
      }

      // Update Engine Physics
      physics.update(dt);
      const state = physics.getState();

      // Update Audio Engine
      audio.update(state, physics.getConfig());

      // Update 3D Kinematics
      if (sceneRef.current) {
        sceneRef.current.update(state);
      }

      // Throttle React State updates to ~24fps to ensure smooth 60fps WebGL/Audio performance
      uiThrottleTimerRef.current += dt;
      if (uiThrottleTimerRef.current > 0.04) {
        uiThrottleTimerRef.current = 0;
        setEngineState({ ...state });
        setDebugData(audio.getAudioDebugData(state));
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      audio.destroy();
    };
  }, []);

  // Update physics and scene when engine configuration changes
  const handleConfigChange = useCallback((newConfigPartial: Partial<EngineConfig>) => {
    setCurrentConfig((prev) => {
      const merged: EngineConfig = { ...prev, ...newConfigPartial };
      physicsRef.current?.setConfig(merged);
      return merged;
    });
  }, []);

  // Preset Selection
  const handleSelectPreset = useCallback((preset: EngineConfig) => {
    setCurrentConfig(preset);
    physicsRef.current?.setConfig(preset);
  }, []);

  // Toggle Start / Stop Ignition
  const handleToggleStart = useCallback(async () => {
    if (!physicsRef.current || !audioRef.current) return;

    // Web Audio API unlock on user click
    await audioRef.current.init();
    audioRef.current.resumeContext();

    const currentState = physicsRef.current.getState();
    if (currentState.isRunning) {
      physicsRef.current.stop();
    } else {
      physicsRef.current.start();
    }
  }, []);

  // Throttle changes from slider or quick step pills
  const handleThrottleChange = useCallback((value: number) => {
    physicsRef.current?.setThrottle(value);
  }, []);

  // Rev Button Handlers
  const handleRevStart = useCallback(async () => {
    if (!audioRef.current) return;
    await audioRef.current.init();
    audioRef.current.resumeContext();

    if (!physicsRef.current?.getState().isRunning) {
      physicsRef.current?.start();
    }
    isRevvingRef.current = true;
  }, []);

  const handleRevEnd = useCallback(() => {
    isRevvingRef.current = false;
    // Release throttle back to idle
    physicsRef.current?.setThrottle(0);
  }, []);

  // Mute toggle
  const handleToggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const muted = audioRef.current.toggleMute();
    setIsMuted(muted);
  }, []);

  // Audio Mixer changes
  const handleChangeMixerSettings = useCallback((newSettings: Partial<AudioMixerSettings>) => {
    setMixerSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      audioRef.current?.setMixerSettings(updated);
      return updated;
    });
  }, []);

  // Reset Mixer Defaults
  const handleResetMixerDefaults = useCallback(() => {
    setMixerSettings(DEFAULT_MIXER_SETTINGS);
    audioRef.current?.setMixerSettings(DEFAULT_MIXER_SETTINGS);
  }, []);

  // Manual Test Triggers
  const handleTestPop = useCallback(() => {
    audioRef.current?.triggerPopSound(
      engineState.rpm || 5000,
      currentConfig.redlineRpm,
      currentConfig.popsAggressiveness
    );
  }, [engineState.rpm, currentConfig]);

  const handleTestBov = useCallback(() => {
    audioRef.current?.triggerBlowOffValve();
  }, []);

  // Reset Engine to default V8
  const handleResetEngine = useCallback(() => {
    const v8 = ENGINE_PRESETS[4];
    setCurrentConfig(v8);
    physicsRef.current?.setConfig(v8);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Application Header */}
      <Header
        currentConfig={currentConfig}
        onSelectPreset={handleSelectPreset}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenCustomBuilder={() => setIsBuilderOpen(true)}
        onResetEngine={handleResetEngine}
        isRunning={engineState.isRunning}
      />

      {/* Main Experience Viewport: 3D Engine Visualization */}
      <main className="flex-1 relative flex flex-col">
        <Viewport3D
          config={currentConfig}
          state={engineState}
          engineSceneRef={sceneRef}
        />

        {/* Live Gauges, Tachometer & Dyno Cluster */}
        <GaugeCluster state={engineState} config={currentConfig} />

        {/* Big Responsive Throttle & Ignition Controls */}
        <ControlPedal
          state={engineState}
          onToggleStart={handleToggleStart}
          onThrottleChange={handleThrottleChange}
          onRevStart={handleRevStart}
          onRevEnd={handleRevEnd}
        />

        {/* Collapsible Tabbed Bottom Controls Dock */}
        <BottomDock
          config={currentConfig}
          onChangeConfig={handleConfigChange}
          mixerSettings={mixerSettings}
          onChangeMixerSettings={handleChangeMixerSettings}
          onResetMixerDefaults={handleResetMixerDefaults}
          debugData={debugData}
          state={engineState}
          audio={audioRef.current}
          onTestPop={handleTestPop}
          onTestBov={handleTestBov}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Custom Engine Builder & Storage Modal */}
      <CustomBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        currentConfig={currentConfig}
        onApplyEngine={handleSelectPreset}
      />
    </div>
  );
}
