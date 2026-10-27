export type EngineLayout = 'inline' | 'v' | 'boxer' | 'single';

export interface EngineConfig {
  id: string;
  name: string;
  cylinders: number;
  layout: EngineLayout;
  vAngle: number; // degrees (e.g. 60, 90 for V; 180 for Boxer)
  displacementCc: number;
  boreMm: number;
  strokeMm: number;
  compressionRatio: number;
  idleRpm: number;
  redlineRpm: number;
  firingOrder: number[]; // 1-indexed cylinder order
  
  // Exhaust configuration
  exhaustOutlets: number; // 1, 2, 3, 4, 6, 8, 10, 12
  exhaustPipeLengthM: number; // meters e.g. 2.2
  exhaustPipeDiameterIn: number; // inches e.g. 2.5
  mufflerType: 'straight_pipe' | 'performance' | 'resonated' | 'chambered';
  exhaustFlames: boolean;
  
  // Turbocharger
  turboEnabled: boolean;
  maxBoostBar: number;
  turboSpoolRate: number;
  
  // Pops & Bangs
  popsEnabled: boolean;
  popsAggressiveness: number; // 0 to 100%
}

export interface AudioMixerSettings {
  masterGain: number; // 0 to 1.5
  combustionGain: number; // 0 to 1.5
  exhaustGain: number; // 0 to 1.5
  intakeGain: number; // 0 to 1.5
  mechanicalGain: number; // 0 to 1.5
  turboGain: number; // 0 to 1.5
  popsGain: number; // 0 to 1.5
  bassBoost: number; // 0 to 1.5
  sampleMixRatio: number; // 0 = 100% procedural, 1 = 100% custom samples
}

export interface EngineState {
  isRunning: boolean;
  rpm: number;
  targetRpm: number;
  throttle: number; // 0 to 1
  crankAngleRad: number; // 0 to 4*PI (720 deg for 4-stroke cycle)
  cycleFraction: number; // 0 to 1 across 720 degrees
  firingRateHz: number; // fires per second = (RPM * cylinders) / 120
  activeCylinder: number;
  isLimiterActive: boolean;
  
  // Dynamic performance telemetry
  torqueNm: number;
  horsepowerHp: number;
  boostBar: number;
  engineTempC: number;
  exhaustTempC: number;
  oilPressureBar: number;
  afr: number; // air-fuel ratio e.g. 14.7 or 12.5
  
  // Visuals / audio triggers
  combustionFlashes: number[]; // intensity per cylinder 0..1
  exhaustFlameIntensity: number; // 0..1
  popTrigger: boolean;
}

export interface AudioDebugData {
  firesPerSec: number;
  currentRpm: number;
  crankAngleDeg: number;
  activeCylinder: number;
  audioNodesCount: number;
  exhaustResonanceFreqHz: number;
  limiterState: 'OFF' | 'SOFT CUT' | 'HARD CUT';
  intakeIntensity: number;
  combustionPressure: number;
  outputRms: number;
}
