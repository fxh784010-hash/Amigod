import { EngineConfig, EngineState } from '../types/engine';

export class EnginePhysics {
  private config: EngineConfig;
  private state: EngineState;
  private lastThrottle: number = 0;
  private limiterTimer: number = 0;
  private isFuelCut: boolean = false;
  private popCooldown: number = 0;

  constructor(initialConfig: EngineConfig) {
    this.config = initialConfig;
    this.state = {
      isRunning: false,
      rpm: 0,
      targetRpm: 0,
      throttle: 0,
      crankAngleRad: 0,
      cycleFraction: 0,
      firingRateHz: 0,
      activeCylinder: 1,
      isLimiterActive: false,
      torqueNm: 0,
      horsepowerHp: 0,
      boostBar: 0,
      engineTempC: 85,
      exhaustTempC: 380,
      oilPressureBar: 0,
      afr: 14.7,
      combustionFlashes: new Array(initialConfig.cylinders).fill(0),
      exhaustFlameIntensity: 0,
      popTrigger: false
    };
  }

  public setConfig(config: EngineConfig) {
    this.config = config;
    if (this.state.combustionFlashes.length !== config.cylinders) {
      this.state.combustionFlashes = new Array(config.cylinders).fill(0);
    }
  }

  public getConfig(): EngineConfig {
    return this.config;
  }

  public getState(): EngineState {
    return this.state;
  }

  public start() {
    this.state.isRunning = true;
    if (this.state.rpm < this.config.idleRpm * 0.7) {
      this.state.rpm = this.config.idleRpm * 0.7; // Starter motor crank kick
    }
  }

  public stop() {
    this.state.isRunning = false;
    this.state.throttle = 0;
  }

  public setThrottle(val: number) {
    this.state.throttle = Math.max(0, Math.min(1, val));
  }

  public update(dtSeconds: number) {
    const dt = Math.min(dtSeconds, 0.05); // clamp delta time for stability

    // Reset single-frame triggers
    this.state.popTrigger = false;

    if (!this.state.isRunning) {
      // Natural engine spin down due to internal mechanical friction
      if (this.state.rpm > 0) {
        this.state.rpm = Math.max(0, this.state.rpm - 1800 * dt);
      }
      this.state.oilPressureBar = Math.max(0, this.state.oilPressureBar - 2.5 * dt);
      this.state.boostBar = Math.max(0, this.state.boostBar - 4.0 * dt);
      this.state.exhaustFlameIntensity = Math.max(0, this.state.exhaustFlameIntensity - 8.0 * dt);
      for (let i = 0; i < this.state.combustionFlashes.length; i++) {
        this.state.combustionFlashes[i] = Math.max(0, this.state.combustionFlashes[i] - 10.0 * dt);
      }
      this.state.firingRateHz = (this.state.rpm * this.config.cylinders) / 120;
      this.state.torqueNm = 0;
      this.state.horsepowerHp = 0;
      return;
    }

    // 1. Calculate Target RPM based on throttle and idle
    const idle = this.config.idleRpm;
    const redline = this.config.redlineRpm;
    
    // Non-linear throttle response curve (more sensitive at high end, crisp tip-in)
    const throttleCurve = Math.pow(this.state.throttle, 1.25);
    let targetRpm = idle + throttleCurve * (redline - idle);

    // 2. RPM Limiter logic (fuel & spark cut)
    if (this.state.rpm >= redline - 50) {
      this.state.isLimiterActive = true;
      this.limiterTimer += dt;
      // High-speed cut cycle (60ms cut, 45ms fire = 9.5Hz BRAAAP cadence)
      if (this.limiterTimer > 0.055) {
        this.isFuelCut = !this.isFuelCut;
        this.limiterTimer = 0;
        if (this.isFuelCut && this.config.exhaustFlames) {
          this.state.exhaustFlameIntensity = 1.0;
          this.state.popTrigger = true;
        }
      }
    } else {
      this.state.isLimiterActive = false;
      this.isFuelCut = false;
      this.limiterTimer = 0;
    }

    if (this.isFuelCut) {
      // Temporary drop during hard cut
      targetRpm = redline - 350;
    }

    // 3. Inertia & flywheel acceleration dynamics
    // Acceleration speed increases with throttle and cylinder displacement
    const accelRate = 4200 + (this.config.displacementCc / 1000) * 800; // RPM/sec
    const decelRate = 2600 + (this.config.compressionRatio * 120); // engine braking RPM/sec

    if (this.state.rpm < targetRpm) {
      this.state.rpm = Math.min(targetRpm, this.state.rpm + accelRate * dt);
    } else if (this.state.rpm > targetRpm) {
      this.state.rpm = Math.max(targetRpm, this.state.rpm - decelRate * dt);
    }

    // Slight idle wobble/hunt for hyper-realistic unevenness
    if (this.state.rpm <= idle + 100 && this.state.throttle < 0.05) {
      const idleJitter = (Math.sin(Date.now() * 0.012) * 15) + (Math.sin(Date.now() * 0.027) * 10);
      this.state.rpm = Math.max(idle - 50, this.state.rpm + idleJitter * dt * 8);
    }

    this.state.targetRpm = targetRpm;

    // 4. Update crank angle (4-stroke cycle = 4 * PI = 720 degrees)
    const revsPerSec = this.state.rpm / 60;
    const deltaRad = revsPerSec * 2 * Math.PI * dt;
    this.state.crankAngleRad = (this.state.crankAngleRad + deltaRad) % (4 * Math.PI);
    this.state.cycleFraction = this.state.crankAngleRad / (4 * Math.PI);

    // 5. Calculate real firing frequency: fires per second = (RPM * cylinders) / 120
    this.state.firingRateHz = (this.state.rpm * this.config.cylinders) / 120;

    // 6. Cylinder combustion phase tracking
    const numCyls = this.config.cylinders;
    const intervalRad = (4 * Math.PI) / numCyls;
    const currentStep = Math.floor(this.state.crankAngleRad / intervalRad);
    const firingIndex = currentStep % numCyls;
    
    // Map to active cylinder from firing order
    const firingOrder = this.config.firingOrder.length === numCyls
      ? this.config.firingOrder
      : Array.from({ length: numCyls }, (_, i) => i + 1);

    const activeCyl = firingOrder[firingIndex] || 1;
    this.state.activeCylinder = activeCyl;

    // Combustion flash inside active cylinder during top of stroke
    const phaseWithinStep = (this.state.crankAngleRad % intervalRad) / intervalRad;
    const flashIntensity = (phaseWithinStep < 0.28 && !this.isFuelCut)
      ? Math.sin((phaseWithinStep / 0.28) * Math.PI)
      : 0;

    for (let c = 0; c < numCyls; c++) {
      const cylNum = c + 1;
      if (cylNum === activeCyl && flashIntensity > 0) {
        this.state.combustionFlashes[c] = Math.max(this.state.combustionFlashes[c], flashIntensity);
      } else {
        this.state.combustionFlashes[c] = Math.max(0, this.state.combustionFlashes[c] - 14 * dt);
      }
    }

    // 7. Turbocharger boost simulation
    if (this.config.turboEnabled) {
      const spoolTarget = (this.state.rpm / redline) * this.state.throttle * this.config.maxBoostBar;
      const spoolSpeed = 3.5 * this.config.turboSpoolRate;
      this.state.boostBar += (spoolTarget - this.state.boostBar) * spoolSpeed * dt;
    } else {
      this.state.boostBar = 0;
    }

    // 8. Pops & Bangs overrun detection
    this.popCooldown = Math.max(0, this.popCooldown - dt);
    const throttleDropped = (this.lastThrottle > 0.35 && this.state.throttle < 0.12);
    if (
      this.config.popsEnabled &&
      this.popCooldown <= 0 &&
      throttleDropped &&
      this.state.rpm > 2800
    ) {
      const chance = (this.config.popsAggressiveness / 100);
      if (Math.random() < chance + 0.3) {
        this.state.popTrigger = true;
        this.popCooldown = 0.18 + Math.random() * 0.25;
        if (this.config.exhaustFlames) {
          this.state.exhaustFlameIntensity = 0.8 + Math.random() * 0.2;
        }
      }
    }
    this.lastThrottle = this.state.throttle;

    // Decay exhaust flame
    this.state.exhaustFlameIntensity = Math.max(0, this.state.exhaustFlameIntensity - 4.5 * dt);

    // 9. Dynamic Dyno Physics: Torque and HP Curves
    // Realistic volumetric efficiency curve peaking around 65-75% of redline
    const rpmFrac = this.state.rpm / redline;
    const veCurve = Math.sin(rpmFrac * Math.PI * 0.85 + 0.1); // bell curve
    const displacementL = this.config.displacementCc / 1000;
    const boostMultiplier = 1 + (this.state.boostBar * 0.85);

    // Naturally aspirated base torque approx 100 Nm per liter
    const baseTorque = displacementL * 105 * (this.config.compressionRatio / 10.0);
    const currentTorque = baseTorque * Math.max(0.15, veCurve) * (0.2 + 0.8 * this.state.throttle) * boostMultiplier;
    
    this.state.torqueNm = Math.round(currentTorque);
    // Metric Horsepower = (Torque * RPM) / 7127
    this.state.horsepowerHp = Math.round((this.state.torqueNm * this.state.rpm) / 7127);

    // 10. Thermal & Fluid telemetry
    // Oil pressure: 1.2 bar idle up to 6.2 bar high RPM
    this.state.oilPressureBar = Number((1.2 + (this.state.rpm / redline) * 5.0).toFixed(1));
    // Exhaust temperature: 380°C to 820°C
    const targetExhTemp = 360 + (this.state.rpm / redline) * 380 + (this.state.throttle * 140);
    this.state.exhaustTempC += (targetExhTemp - this.state.exhaustTempC) * 0.8 * dt;
    // AFR
    if (this.state.throttle > 0.8) {
      this.state.afr = 12.2; // rich power mix
    } else if (this.state.throttle < 0.05 && this.state.rpm > idle + 500) {
      this.state.afr = 17.0; // overrun cut
    } else {
      this.state.afr = 14.7; // stoichiometric
    }
  }
}
