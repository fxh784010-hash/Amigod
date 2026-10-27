import { EngineConfig, EngineState, AudioMixerSettings, AudioDebugData } from '../types/engine';
import { SampleManager, SampleType } from './SampleManager';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sampleManager: SampleManager | null = null;

  // Master bus nodes
  private masterGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private softClipperNode: WaveShaperNode | null = null;
  private bassBoostFilter: BiquadFilterNode | null = null;

  // Mixer gain buses
  private combustionBus: GainNode | null = null;
  private exhaustBus: GainNode | null = null;
  private subBassBus: GainNode | null = null;
  private intakeBus: GainNode | null = null;
  private mechanicalBus: GainNode | null = null;
  private harmonicsBus: GainNode | null = null;
  private turbulenceBus: GainNode | null = null;
  private turboBus: GainNode | null = null;
  private popsBus: GainNode | null = null;

  // Layer 1 & 2: Combustion & Exhaust Pulse Oscillators & Filters
  private combustionOsc: OscillatorNode | null = null;
  private combustionGain: GainNode | null = null;
  private combustionShaper: WaveShaperNode | null = null;
  private combustionFilter: BiquadFilterNode | null = null;

  private exhaustOsc: OscillatorNode | null = null;
  private exhaustGain: GainNode | null = null;
  private exhaustResonanceFilter: BiquadFilterNode | null = null;
  private exhaustMufflerFilter: BiquadFilterNode | null = null;
  private exhaustPanner: StereoPannerNode | null = null;

  // Layer 3: Exhaust Sub-Bass Thump
  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;

  // Layer 4: Intake Rush & Formant
  private intakeNoiseNode: AudioBufferSourceNode | null = null;
  private intakeGain: GainNode | null = null;
  private intakeFilter: BiquadFilterNode | null = null;

  // Layer 5: Mechanical & Crank ticking
  private mechanicalOsc: OscillatorNode | null = null;
  private mechanicalGain: GainNode | null = null;
  private valveTickOsc: OscillatorNode | null = null;
  private valveTickGain: GainNode | null = null;
  private mechanicalFilter: BiquadFilterNode | null = null;

  // Layer 6: Harmonics (2nd & 4th orders)
  private harmonic2Osc: OscillatorNode | null = null;
  private harmonic2Gain: GainNode | null = null;
  private harmonic4Osc: OscillatorNode | null = null;
  private harmonic4Gain: GainNode | null = null;

  // Layer 7 & 8: Turbulence & Air Flow
  private exhaustNoiseNode: AudioBufferSourceNode | null = null;
  private turbulenceGain: GainNode | null = null;
  private turbulenceFilter: BiquadFilterNode | null = null;

  // Layer 9: Turbocharger (spool whistle & compressor flutter)
  private turboSpoolOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private turboFilter: BiquadFilterNode | null = null;
  private blowoffGain: GainNode | null = null;

  // Sound Pack Hybrid Sources
  private sampleSourceNodes: Map<SampleType, AudioBufferSourceNode> = new Map();
  private sampleGainNodes: Map<SampleType, GainNode> = new Map();
  private sampleMixGain: GainNode | null = null;
  private proceduralMixGain: GainNode | null = null;

  // Noise buffers cache
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  // State caches
  private currentConfig: EngineConfig | null = null;
  private mixerSettings: AudioMixerSettings;
  private lastPopTrigger: boolean = false;
  private audioNodesCount: number = 28;
  private calculatedResonanceHz: number = 140;

  constructor(defaultSettings: AudioMixerSettings) {
    this.mixerSettings = { ...defaultSettings };
  }

  public async init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.sampleManager = new SampleManager(this.ctx);

    // Pre-create shared noise buffers for high-efficiency looping
    this.createNoiseBuffers();

    // Setup Master Bus Architecture
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(this.mixerSettings.masterGain, this.ctx.currentTime);

    // Limiter / Compressor to avoid any digital clipping while delivering massive punch
    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-4.0, this.ctx.currentTime);
    this.compressorNode.knee.setValueAtTime(6.0, this.ctx.currentTime);
    this.compressorNode.ratio.setValueAtTime(14.0, this.ctx.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressorNode.release.setValueAtTime(0.05, this.ctx.currentTime);

    // Soft Clipper WaveShaper
    this.softClipperNode = this.ctx.createWaveShaper();
    this.softClipperNode.curve = this.createSoftClipCurve(512) as Float32Array<ArrayBuffer>;
    this.softClipperNode.oversample = '2x';

    // Bass Boost Low-Shelf Filter
    this.bassBoostFilter = this.ctx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.bassBoostFilter.gain.setValueAtTime(3.5 * this.mixerSettings.bassBoost, this.ctx.currentTime);

    // Routing: Buses -> BassBoost -> MasterGain -> Compressor -> SoftClipper -> Destination
    this.bassBoostFilter.connect(this.masterGainNode);
    this.masterGainNode.connect(this.compressorNode);
    this.compressorNode.connect(this.softClipperNode);
    this.softClipperNode.connect(this.ctx.destination);

    // Hybrid crossfade gain buses
    this.proceduralMixGain = this.ctx.createGain();
    this.proceduralMixGain.gain.setValueAtTime(1.0 - this.mixerSettings.sampleMixRatio, this.ctx.currentTime);
    this.proceduralMixGain.connect(this.bassBoostFilter);

    this.sampleMixGain = this.ctx.createGain();
    this.sampleMixGain.gain.setValueAtTime(this.mixerSettings.sampleMixRatio, this.ctx.currentTime);
    this.sampleMixGain.connect(this.bassBoostFilter);

    // Create Sub-Mixer Buses connected to proceduralMixGain
    this.combustionBus = this.ctx.createGain();
    this.combustionBus.gain.setValueAtTime(this.mixerSettings.combustionGain, this.ctx.currentTime);
    this.combustionBus.connect(this.proceduralMixGain);

    this.exhaustBus = this.ctx.createGain();
    this.exhaustBus.gain.setValueAtTime(this.mixerSettings.exhaustGain, this.ctx.currentTime);
    this.exhaustBus.connect(this.proceduralMixGain);

    this.subBassBus = this.ctx.createGain();
    this.subBassBus.gain.setValueAtTime(1.2, this.ctx.currentTime);
    this.subBassBus.connect(this.proceduralMixGain);

    this.intakeBus = this.ctx.createGain();
    this.intakeBus.gain.setValueAtTime(this.mixerSettings.intakeGain, this.ctx.currentTime);
    this.intakeBus.connect(this.proceduralMixGain);

    this.mechanicalBus = this.ctx.createGain();
    this.mechanicalBus.gain.setValueAtTime(this.mixerSettings.mechanicalGain, this.ctx.currentTime);
    this.mechanicalBus.connect(this.proceduralMixGain);

    this.harmonicsBus = this.ctx.createGain();
    this.harmonicsBus.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.harmonicsBus.connect(this.proceduralMixGain);

    this.turbulenceBus = this.ctx.createGain();
    this.turbulenceBus.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.turbulenceBus.connect(this.proceduralMixGain);

    this.turboBus = this.ctx.createGain();
    this.turboBus.gain.setValueAtTime(this.mixerSettings.turboGain, this.ctx.currentTime);
    this.turboBus.connect(this.proceduralMixGain);

    this.popsBus = this.ctx.createGain();
    this.popsBus.gain.setValueAtTime(this.mixerSettings.popsGain, this.ctx.currentTime);
    this.popsBus.connect(this.bassBoostFilter); // pops go directly with huge headroom

    // Setup the 10 synthesis layers
    this.setupProceduralLayers();
  }

  public getSampleManager(): SampleManager | null {
    return this.sampleManager;
  }

  private createSoftClipCurve(length: number): Float32Array {
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const x = (i * 2) / length - 1;
      // Hyperbolic tangent saturation gives warm analog tube clipping without harsh digital edge
      curve[i] = Math.tanh(x * 1.4) / Math.tanh(1.4);
    }
    return curve;
  }

  private createCombustionPulseCurve(length: number): Float32Array {
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const x = (i * 2) / length - 1;
      // Asymmetric shockwave response: sudden positive pressure spike, smooth negative rebound
      if (x > 0) {
        curve[i] = Math.pow(x, 0.6) * 1.25;
      } else {
        curve[i] = -Math.pow(Math.abs(x), 1.8) * 0.8;
      }
    }
    return curve;
  }

  private createNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds looping

    // White noise
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Pink / brownian noise (1/f) for realistic turbulence rush
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  private setupProceduralLayers() {
    if (!this.ctx || !this.combustionBus || !this.exhaustBus || !this.subBassBus || !this.intakeBus || !this.mechanicalBus || !this.harmonicsBus || !this.turbulenceBus || !this.turboBus) return;

    const t = this.ctx.currentTime;

    // --- LAYER 1: COMBUSTION PULSE LAYER ---
    // Custom non-linear saw-pulse oscillator shaped by combustion curve
    this.combustionOsc = this.ctx.createOscillator();
    this.combustionOsc.type = 'sawtooth';
    this.combustionOsc.frequency.setValueAtTime(30, t);

    this.combustionShaper = this.ctx.createWaveShaper();
    this.combustionShaper.curve = this.createCombustionPulseCurve(1024) as Float32Array<ArrayBuffer>;
    this.combustionShaper.oversample = '2x';

    this.combustionFilter = this.ctx.createBiquadFilter();
    this.combustionFilter.type = 'lowpass';
    this.combustionFilter.frequency.setValueAtTime(800, t);
    this.combustionFilter.Q.setValueAtTime(2.0, t);

    this.combustionGain = this.ctx.createGain();
    this.combustionGain.gain.setValueAtTime(0, t);

    this.combustionOsc.connect(this.combustionShaper);
    this.combustionShaper.connect(this.combustionFilter);
    this.combustionFilter.connect(this.combustionGain);
    this.combustionGain.connect(this.combustionBus);
    this.combustionOsc.start();

    // --- LAYER 2: EXHAUST PULSE & RESONANCE ---
    this.exhaustOsc = this.ctx.createOscillator();
    this.exhaustOsc.type = 'triangle';
    this.exhaustOsc.frequency.setValueAtTime(30, t);

    this.exhaustResonanceFilter = this.ctx.createBiquadFilter();
    this.exhaustResonanceFilter.type = 'bandpass';
    this.exhaustResonanceFilter.frequency.setValueAtTime(140, t);
    this.exhaustResonanceFilter.Q.setValueAtTime(4.5, t);

    this.exhaustMufflerFilter = this.ctx.createBiquadFilter();
    this.exhaustMufflerFilter.type = 'lowpass';
    this.exhaustMufflerFilter.frequency.setValueAtTime(2200, t);
    this.exhaustMufflerFilter.Q.setValueAtTime(0.7, t);

    this.exhaustGain = this.ctx.createGain();
    this.exhaustGain.gain.setValueAtTime(0, t);

    this.exhaustPanner = this.ctx.createStereoPanner();
    this.exhaustPanner.pan.setValueAtTime(0, t);

    this.exhaustOsc.connect(this.exhaustResonanceFilter);
    this.exhaustResonanceFilter.connect(this.exhaustMufflerFilter);
    this.exhaustMufflerFilter.connect(this.exhaustGain);
    this.exhaustGain.connect(this.exhaustPanner);
    this.exhaustPanner.connect(this.exhaustBus);
    this.exhaustOsc.start();

    // --- LAYER 3: EXHAUST SUB-BASS THUMP (Low-end body punch) ---
    this.subBassOsc = this.ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.setValueAtTime(25, t);

    this.subBassGain = this.ctx.createGain();
    this.subBassGain.gain.setValueAtTime(0, t);

    this.subBassOsc.connect(this.subBassGain);
    this.subBassGain.connect(this.subBassBus);
    this.subBassOsc.start();

    // --- LAYER 4: INTAKE AIR RUSH ---
    if (this.pinkNoiseBuffer) {
      this.intakeNoiseNode = this.ctx.createBufferSource();
      this.intakeNoiseNode.buffer = this.pinkNoiseBuffer;
      this.intakeNoiseNode.loop = true;

      this.intakeFilter = this.ctx.createBiquadFilter();
      this.intakeFilter.type = 'bandpass';
      this.intakeFilter.frequency.setValueAtTime(450, t);
      this.intakeFilter.Q.setValueAtTime(3.0, t);

      this.intakeGain = this.ctx.createGain();
      this.intakeGain.gain.setValueAtTime(0, t);

      this.intakeNoiseNode.connect(this.intakeFilter);
      this.intakeFilter.connect(this.intakeGain);
      this.intakeGain.connect(this.intakeBus);
      this.intakeNoiseNode.start();
    }

    // --- LAYER 5: MECHANICAL CRANK & VALVE TICK ---
    this.mechanicalOsc = this.ctx.createOscillator();
    this.mechanicalOsc.type = 'triangle';
    this.mechanicalOsc.frequency.setValueAtTime(20, t);

    this.valveTickOsc = this.ctx.createOscillator();
    this.valveTickOsc.type = 'square';
    this.valveTickOsc.frequency.setValueAtTime(10, t);

    this.valveTickGain = this.ctx.createGain();
    this.valveTickGain.gain.setValueAtTime(0, t);

    this.mechanicalFilter = this.ctx.createBiquadFilter();
    this.mechanicalFilter.type = 'highpass';
    this.mechanicalFilter.frequency.setValueAtTime(1400, t);

    this.mechanicalGain = this.ctx.createGain();
    this.mechanicalGain.gain.setValueAtTime(0, t);

    this.valveTickOsc.connect(this.valveTickGain);
    this.valveTickGain.connect(this.mechanicalFilter);
    this.mechanicalOsc.connect(this.mechanicalGain);
    this.mechanicalFilter.connect(this.mechanicalGain);
    this.mechanicalGain.connect(this.mechanicalBus);
    this.mechanicalOsc.start();
    this.valveTickOsc.start();

    // --- LAYER 6: ENGINE ROTATIONAL HARMONICS ---
    this.harmonic2Osc = this.ctx.createOscillator();
    this.harmonic2Osc.type = 'sawtooth';
    this.harmonic2Osc.frequency.setValueAtTime(60, t);
    this.harmonic2Gain = this.ctx.createGain();
    this.harmonic2Gain.gain.setValueAtTime(0, t);
    this.harmonic2Osc.connect(this.harmonic2Gain);
    this.harmonic2Gain.connect(this.harmonicsBus);
    this.harmonic2Osc.start();

    this.harmonic4Osc = this.ctx.createOscillator();
    this.harmonic4Osc.type = 'triangle';
    this.harmonic4Osc.frequency.setValueAtTime(120, t);
    this.harmonic4Gain = this.ctx.createGain();
    this.harmonic4Gain.gain.setValueAtTime(0, t);
    this.harmonic4Osc.connect(this.harmonic4Gain);
    this.harmonic4Gain.connect(this.harmonicsBus);
    this.harmonic4Osc.start();

    // --- LAYER 7 & 8: EXHAUST TURBULENCE / GAS JET NOISE ---
    if (this.whiteNoiseBuffer) {
      this.exhaustNoiseNode = this.ctx.createBufferSource();
      this.exhaustNoiseNode.buffer = this.whiteNoiseBuffer;
      this.exhaustNoiseNode.loop = true;

      this.turbulenceFilter = this.ctx.createBiquadFilter();
      this.turbulenceFilter.type = 'bandpass';
      this.turbulenceFilter.frequency.setValueAtTime(1800, t);
      this.turbulenceFilter.Q.setValueAtTime(1.5, t);

      this.turbulenceGain = this.ctx.createGain();
      this.turbulenceGain.gain.setValueAtTime(0, t);

      this.exhaustNoiseNode.connect(this.turbulenceFilter);
      this.turbulenceFilter.connect(this.turbulenceGain);
      this.turbulenceGain.connect(this.turbulenceBus);
      this.exhaustNoiseNode.start();
    }

    // --- LAYER 9: TURBOCHARGER SPOOL & COMPRESSOR ---
    this.turboSpoolOsc = this.ctx.createOscillator();
    this.turboSpoolOsc.type = 'sine';
    this.turboSpoolOsc.frequency.setValueAtTime(900, t);

    this.turboFilter = this.ctx.createBiquadFilter();
    this.turboFilter.type = 'bandpass';
    this.turboFilter.frequency.setValueAtTime(2400, t);
    this.turboFilter.Q.setValueAtTime(6.0, t);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, t);

    this.blowoffGain = this.ctx.createGain();
    this.blowoffGain.gain.setValueAtTime(0, t);

    this.turboSpoolOsc.connect(this.turboFilter);
    this.turboFilter.connect(this.turboGain);
    this.turboGain.connect(this.turboBus);
    this.turboSpoolOsc.start();
  }

  public update(state: EngineState, config: EngineConfig) {
    if (!this.ctx || !this.combustionOsc || !this.combustionGain) return;
    this.currentConfig = config;

    const t = this.ctx.currentTime;
    const isRunning = state.isRunning && state.rpm > 50;

    if (!isRunning) {
      // Smooth fade out to dead silence
      const fadeTime = 0.05;
      this.combustionGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.exhaustGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.subBassGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.intakeGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.mechanicalGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.valveTickGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.harmonic2Gain?.gain.setTargetAtTime(0, t, fadeTime);
      this.harmonic4Gain?.gain.setTargetAtTime(0, t, fadeTime);
      this.turbulenceGain?.gain.setTargetAtTime(0, t, fadeTime);
      this.turboGain?.gain.setTargetAtTime(0, t, fadeTime);
      return;
    }

    // 1. CALCULATE EXACT 4-STROKE FIRING FREQUENCY
    // fires per second = (RPM * number of cylinders) / 120
    const firesPerSec = Math.max(10, (state.rpm * config.cylinders) / 120);
    const revsPerSec = Math.max(5, state.rpm / 60);

    // 2. EXHAUST ACOUSTIC RESONANCE CALCULATION
    // Speed of sound in exhaust gas (approx 450 m/s at 500°C)
    // Quarter-wave resonator frequency: f = v / (4 * L)
    const exhaustGasSpeedOfSound = 440 + (state.exhaustTempC - 300) * 0.15;
    const pipeLength = Math.max(0.8, config.exhaustPipeLengthM);
    const pipeDiameterIn = config.exhaustPipeDiameterIn;
    const fResonance = exhaustGasSpeedOfSound / (4 * pipeLength);
    this.calculatedResonanceHz = Math.round(fResonance);

    // 3. IDLE PULSE VS ROAR DYNAMICS
    // At idle (e.g. 750 RPM on 4-cyl = 25 fires/sec): human ear resolves distinct thuds!
    // As RPM increases, pulses merge into dense tone
    const rpmFrac = Math.min(1.0, (state.rpm - config.idleRpm) / (config.redlineRpm - config.idleRpm));
    const isIdle = state.rpm <= config.idleRpm + 150 && state.throttle < 0.08;

    // Firing order phase jitter (cross-plane V8 vs flat-plane / inline)
    let bankPhaseInterference = 1.0;
    if (config.layout === 'v' && config.cylinders === 8 && config.vAngle === 90) {
      // Cross-plane V8 rumble: asymmetric pulse spacing on each bank creates rhythmic low-end lope
      const lopeMod = Math.sin(t * (revsPerSec * 0.5) * 2 * Math.PI) * 0.18;
      bankPhaseInterference = 1.0 + lopeMod;
    }

    // Set Combustion Pulse Oscillator
    this.combustionOsc.frequency.setTargetAtTime(firesPerSec, t, 0.02);

    // Combustion intensity increases with throttle & cylinder displacement
    const throttleFactor = 0.4 + 0.6 * Math.pow(state.throttle, 1.2);
    const dispFactor = Math.min(1.5, Math.max(0.7, config.displacementCc / 3000));
    
    // Limiter fuel cut: drop combustion gain immediately during fuel cut!
    const limiterCutMultiplier = state.isLimiterActive && (state.rpm >= config.redlineRpm - 40)
      ? 0.15
      : 1.0;

    const targetCombustionGain = (isIdle ? 0.75 : 0.85) * throttleFactor * dispFactor * limiterCutMultiplier;
    this.combustionGain?.gain.setTargetAtTime(targetCombustionGain, t, 0.015);

    // Combustion filter: opens up as RPM and throttle increase
    const combCutoff = 400 + firesPerSec * 2.8 + state.throttle * 3000;
    this.combustionFilter?.frequency.setTargetAtTime(Math.min(9000, combCutoff), t, 0.03);

    // 4. EXHAUST PULSE & PIPE ACOUSTICS
    this.exhaustOsc?.frequency.setTargetAtTime(firesPerSec, t, 0.02);
    
    // Resonant peak tuned to pipe length & diameter
    this.exhaustResonanceFilter?.frequency.setTargetAtTime(fResonance, t, 0.05);
    // Diameter changes Q factor: wider pipe = deeper, slightly broader resonance; narrower pipe = sharp restrictive rasp
    const resonanceQ = Math.max(1.8, 5.0 - (pipeDiameterIn - 2.0) * 0.9);
    this.exhaustResonanceFilter?.Q.setTargetAtTime(resonanceQ, t, 0.05);

    // Muffler attenuation
    let mufflerCutoff = 8000;
    if (config.mufflerType === 'chambered') mufflerCutoff = 1800;
    else if (config.mufflerType === 'resonated') mufflerCutoff = 3200;
    else if (config.mufflerType === 'performance') mufflerCutoff = 5500;
    else if (config.mufflerType === 'straight_pipe') mufflerCutoff = 14000;

    this.exhaustMufflerFilter?.frequency.setTargetAtTime(mufflerCutoff, t, 0.05);

    // Exhaust outlet count creates spatial width and bank phasing
    // 1 outlet = mono center; multiple outlets = wider stereo presence and richer phasing
    const outletFactor = Math.min(1.4, 0.8 + config.exhaustOutlets * 0.08);
    const targetExhaustGain = (0.7 + state.throttle * 0.5) * outletFactor * bankPhaseInterference * limiterCutMultiplier;
    this.exhaustGain?.gain.setTargetAtTime(targetExhaustGain, t, 0.02);

    // 5. SUB-BASS THUMP LAYER (The chest-thumping low-frequency presence)
    // Runs at firing rate or half firing rate (crank rotational rate)
    const subBassFreq = Math.max(22, Math.min(130, firesPerSec * 0.5));
    this.subBassOsc?.frequency.setTargetAtTime(subBassFreq, t, 0.02);
    const subBassLevel = (isIdle ? 0.9 : 0.6 + state.throttle * 0.4) * dispFactor * (pipeDiameterIn / 2.5);
    this.subBassGain?.gain.setTargetAtTime(subBassLevel, t, 0.02);

    // 6. INTAKE SOUND (Vacuum air rush & throttle body suction)
    const intakeCutoff = 300 + state.throttle * 1800 + (state.rpm / config.redlineRpm) * 800;
    this.intakeFilter?.frequency.setTargetAtTime(intakeCutoff, t, 0.03);
    const intakeLevel = Math.max(0.08, state.throttle * 0.95);
    this.intakeGain?.gain.setTargetAtTime(intakeLevel, t, 0.02);

    // 7. MECHANICAL / CRANK / VALVE TRAIN SOUND
    this.mechanicalOsc?.frequency.setTargetAtTime(revsPerSec, t, 0.02);
    // Valve train operates at half crankshaft speed (camshaft turns 1:2)
    this.valveTickOsc?.frequency.setTargetAtTime(revsPerSec * 0.5, t, 0.02);
    const mechLevel = 0.35 + (state.rpm / config.redlineRpm) * 0.35;
    this.mechanicalGain?.gain.setTargetAtTime(mechLevel, t, 0.03);
    this.valveTickGain?.gain.setTargetAtTime(isIdle ? 0.3 : 0.15, t, 0.03);

    // 8. ROTATIONAL HARMONICS
    this.harmonic2Osc?.frequency.setTargetAtTime(firesPerSec * 2, t, 0.02);
    this.harmonic4Osc?.frequency.setTargetAtTime(firesPerSec * 3, t, 0.02);
    const harmGain = (0.15 + state.throttle * 0.45) * rpmFrac;
    this.harmonic2Gain?.gain.setTargetAtTime(harmGain * 0.7, t, 0.03);
    this.harmonic4Gain?.gain.setTargetAtTime(harmGain * 0.4, t, 0.03);

    // 9. EXHAUST TURBULENCE NOISE
    const turbCutoff = 1000 + state.throttle * 3500 + firesPerSec * 3.0;
    this.turbulenceFilter?.frequency.setTargetAtTime(turbCutoff, t, 0.03);
    const turbGain = (0.1 + state.throttle * 0.55) * (config.mufflerType === 'straight_pipe' ? 1.3 : 0.8);
    this.turbulenceGain?.gain.setTargetAtTime(turbGain, t, 0.03);

    // 10. TURBOCHARGER SOUND
    if (config.turboEnabled) {
      // Spool frequency: 900 Hz idle up to 3800 Hz peak boost
      const spoolFreq = 850 + (state.boostBar / Math.max(0.5, config.maxBoostBar)) * 2800;
      this.turboSpoolOsc?.frequency.setTargetAtTime(spoolFreq, t, 0.04);
      this.turboFilter?.frequency.setTargetAtTime(spoolFreq, t, 0.04);
      const turboLoudness = (state.boostBar / Math.max(0.5, config.maxBoostBar)) * 0.75;
      this.turboGain?.gain.setTargetAtTime(turboLoudness, t, 0.03);
    } else {
      this.turboGain?.gain.setTargetAtTime(0, t, 0.03);
    }

    // 11. POPS & BANGS DETONATION TRIGGER
    if (state.popTrigger && !this.lastPopTrigger) {
      this.triggerPopSound(state.rpm, config.redlineRpm, config.popsAggressiveness);
    }
    this.lastPopTrigger = state.popTrigger;
  }

  // Trigger high-impact procedural exhaust detonation (Pop / Bang / Crackle)
  public triggerPopSound(rpm: number, redline: number, aggressiveness: number) {
    if (!this.ctx || !this.popsBus) return;
    const t = this.ctx.currentTime;

    const isHeavyBang = Math.random() < (aggressiveness / 100) * 0.65;
    const duration = isHeavyBang ? 0.14 : 0.08;

    // Explosive noise burst
    const popNoise = this.ctx.createBufferSource();
    popNoise.buffer = this.whiteNoiseBuffer;

    const popFilter = this.ctx.createBiquadFilter();
    popFilter.type = 'bandpass';
    popFilter.frequency.setValueAtTime(isHeavyBang ? 280 : 750 + Math.random() * 500, t);
    popFilter.Q.setValueAtTime(isHeavyBang ? 2.5 : 4.0, t);

    const popGain = this.ctx.createGain();
    const peakVolume = isHeavyBang ? 1.5 : 0.9;
    popGain.gain.setValueAtTime(peakVolume, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Sub-bass thud accompanying heavy bang
    if (isHeavyBang) {
      const subBoom = this.ctx.createOscillator();
      subBoom.type = 'sine';
      subBoom.frequency.setValueAtTime(140, t);
      subBoom.frequency.exponentialRampToValueAtTime(35, t + duration);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(1.2, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      subBoom.connect(subGain);
      subGain.connect(this.popsBus);
      subBoom.start(t);
      subBoom.stop(t + duration);
    }

    popNoise.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(this.popsBus);
    popNoise.start(t);
    popNoise.stop(t + duration);
  }

  // Blow-off valve release whoosh on sudden throttle release
  public triggerBlowOffValve() {
    if (!this.ctx || !this.turboBus || !this.pinkNoiseBuffer) return;
    const t = this.ctx.currentTime;
    const bvd = this.ctx.createBufferSource();
    bvd.buffer = this.pinkNoiseBuffer;

    const bvf = this.ctx.createBiquadFilter();
    bvf.type = 'highpass';
    bvf.frequency.setValueAtTime(2200, t);

    const bvg = this.ctx.createGain();
    bvg.gain.setValueAtTime(0.85, t);
    bvg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    bvd.connect(bvf);
    bvf.connect(bvg);
    bvg.connect(this.turboBus);
    bvd.start(t);
    bvd.stop(t + 0.35);
  }

  public setMixerSettings(newSettings: Partial<AudioMixerSettings>) {
    this.mixerSettings = { ...this.mixerSettings, ...newSettings };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (newSettings.masterGain !== undefined && this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.mixerSettings.masterGain, t, 0.05);
    }
    if (newSettings.combustionGain !== undefined && this.combustionBus) {
      this.combustionBus.gain.setTargetAtTime(this.mixerSettings.combustionGain, t, 0.05);
    }
    if (newSettings.exhaustGain !== undefined && this.exhaustBus) {
      this.exhaustBus.gain.setTargetAtTime(this.mixerSettings.exhaustGain, t, 0.05);
    }
    if (newSettings.intakeGain !== undefined && this.intakeBus) {
      this.intakeBus.gain.setTargetAtTime(this.mixerSettings.intakeGain, t, 0.05);
    }
    if (newSettings.mechanicalGain !== undefined && this.mechanicalBus) {
      this.mechanicalBus.gain.setTargetAtTime(this.mixerSettings.mechanicalGain, t, 0.05);
    }
    if (newSettings.turboGain !== undefined && this.turboBus) {
      this.turboBus.gain.setTargetAtTime(this.mixerSettings.turboGain, t, 0.05);
    }
    if (newSettings.popsGain !== undefined && this.popsBus) {
      this.popsBus.gain.setTargetAtTime(this.mixerSettings.popsGain, t, 0.05);
    }
    if (newSettings.bassBoost !== undefined && this.bassBoostFilter) {
      this.bassBoostFilter.gain.setTargetAtTime(3.5 * this.mixerSettings.bassBoost, t, 0.05);
    }
    if (newSettings.sampleMixRatio !== undefined) {
      this.proceduralMixGain?.gain.setTargetAtTime(1.0 - this.mixerSettings.sampleMixRatio, t, 0.05);
      this.sampleMixGain?.gain.setTargetAtTime(this.mixerSettings.sampleMixRatio, t, 0.05);
    }
  }

  public getMixerSettings(): AudioMixerSettings {
    return { ...this.mixerSettings };
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(
        this.isMuted ? 0 : this.mixerSettings.masterGain,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getAudioDebugData(state: EngineState): AudioDebugData {
    return {
      firesPerSec: Math.round(state.firingRateHz * 10) / 10,
      currentRpm: Math.round(state.rpm),
      crankAngleDeg: Math.round((state.crankAngleRad * 180) / Math.PI) % 720,
      activeCylinder: state.activeCylinder,
      audioNodesCount: this.audioNodesCount,
      exhaustResonanceFreqHz: this.calculatedResonanceHz,
      limiterState: state.isLimiterActive ? 'HARD CUT' : (state.rpm > (this.currentConfig?.redlineRpm || 7000) - 200 ? 'SOFT CUT' : 'OFF'),
      intakeIntensity: Math.round(state.throttle * 100),
      combustionPressure: Math.round((state.torqueNm / 40) * 10) / 10,
      outputRms: state.isRunning ? Number((0.4 + state.throttle * 0.5).toFixed(2)) : 0
    };
  }

  public resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public destroy() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
