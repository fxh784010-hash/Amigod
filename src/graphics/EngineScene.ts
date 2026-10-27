import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EngineConfig, EngineState } from '../types/engine';

export class EngineScene {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animationFrameId: number = 0;
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Visual engine root groups
  private engineRootGroup: THREE.Group;
  private crankshaftGroup: THREE.Group;
  private flywheelMesh: THREE.Mesh | null = null;
  private throttleValveMesh: THREE.Mesh | null = null;

  // Dynamic moving kinematic components per cylinder
  private pistonMeshes: THREE.Mesh[] = [];
  private rodGroups: THREE.Group[] = [];
  private combustionFlashLights: THREE.PointLight[] = [];
  private combustionFlashMeshes: THREE.Mesh[] = [];
  private exhaustFlameParticles: THREE.Points[] = [];

  // Current engine config cached
  private currentConfig: EngineConfig;
  private materials: { [key: string]: THREE.Material } = {};

  constructor(container: HTMLDivElement, initialConfig: EngineConfig) {
    this.container = container;
    this.currentConfig = initialConfig;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c0e);
    this.scene.fog = new THREE.FogExp2(0x0a0c0e, 0.04);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Setup Camera & Controls
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(3.2, 2.5, 4.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12.0;
    this.controls.maxPolarAngle = Math.PI * 0.48; // Don't flip below ground
    this.controls.target.set(0, 0.4, 0);
    this.controls.update();

    // 4. Studio Environment & Lighting (RoomEnvironment PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.setupLighting();

    // 5. Initialize Engine Object Hierarchies
    this.engineRootGroup = new THREE.Group();
    this.crankshaftGroup = new THREE.Group();
    this.engineRootGroup.add(this.crankshaftGroup);
    this.scene.add(this.engineRootGroup);

    // 6. Init Materials & Build Initial 3D Model
    this.initMaterials();
    this.rebuildEngine3D(initialConfig);

    // 7. Ground Grid & Contact Shadow
    this.setupGround();

    // 8. Resize listener
    window.addEventListener('resize', this.onResize);

    // 9. Start render loop
    this.animate();
  }

  private setupLighting() {
    // Key light: Warm automotive studio spot
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.8);
    keyLight.position.set(4, 6, 3);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cool fill light for metal definition
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    fillLight.position.set(-4, 3, -2);
    this.scene.add(fillLight);

    // Rim light from behind to highlight metallic edges and exhaust headers
    const rimLight = new THREE.DirectionalLight(0x10b981, 2.0);
    rimLight.position.set(0, 4, -5);
    this.scene.add(rimLight);

    // Subtle ambient hemisphere
    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x090a0f, 0.8);
    this.scene.add(hemiLight);
  }

  private initMaterials() {
    // High-end automotive PBR shaders
    this.materials['engineBlock'] = new THREE.MeshStandardMaterial({
      color: 0x1e2229, // dark graphite cast iron
      roughness: 0.55,
      metalness: 0.85
    });

    this.materials['cylinderLiner'] = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // honed steel
      roughness: 0.25,
      metalness: 0.9,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    this.materials['piston'] = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8, // forged aluminum
      roughness: 0.2,
      metalness: 0.92
    });

    this.materials['connectingRod'] = new THREE.MeshStandardMaterial({
      color: 0x71717a, // H-beam titanium / forged steel
      roughness: 0.35,
      metalness: 0.88
    });

    this.materials['crankshaft'] = new THREE.MeshStandardMaterial({
      color: 0x3f3f46, // billet steel crank
      roughness: 0.28,
      metalness: 0.95
    });

    this.materials['flywheel'] = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.4,
      metalness: 0.9
    });

    this.materials['exhaustHeaders'] = new THREE.MeshStandardMaterial({
      color: 0x996515, // heat-treated titanium / gold blued bronze
      roughness: 0.25,
      metalness: 0.95
    });

    this.materials['intakePlenum'] = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // carbon composite / dark intake runner
      roughness: 0.45,
      metalness: 0.5
    });

    this.materials['combustionFlash'] = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.0
    });
  }

  private setupGround() {
    // Grid floor
    const grid = new THREE.GridHelper(12, 24, 0x10b981, 0x1e293b);
    grid.position.y = -0.65;
    this.scene.add(grid);

    // Contact shadow grounding disc
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.64;
    this.scene.add(shadowMesh);
  }

  public rebuildEngine3D(config: EngineConfig) {
    this.currentConfig = config;

    // Clear previous dynamic meshes
    this.pistonMeshes = [];
    this.rodGroups = [];
    this.combustionFlashLights = [];
    this.combustionFlashMeshes = [];
    this.exhaustFlameParticles = [];

    // Remove old children from root
    while (this.engineRootGroup.children.length > 0) {
      this.engineRootGroup.remove(this.engineRootGroup.children[0]);
    }
    while (this.crankshaftGroup.children.length > 0) {
      this.crankshaftGroup.remove(this.crankshaftGroup.children[0]);
    }

    this.engineRootGroup.add(this.crankshaftGroup);

    const numCyls = config.cylinders;
    const layout = config.layout;
    const strokeM = config.strokeMm / 1000;
    const boreM = config.boreMm / 1000;

    // Scale engine visually for clear viewport presence
    const scale = 5.0; // scale up to pleasant 3D scene size
    const rCrank = (strokeM * 0.5) * scale; // crank throw radius
    const rodLen = rCrank * 3.5; // rod length to crank radius ratio approx 3.5:1
    const cylSpacing = Math.max(0.45, (boreM * 1.5) * scale);

    // Crankshaft main center shaft
    const totalLength = Math.max(1.4, (numCyls > 6 ? (numCyls / 2) : numCyls) * cylSpacing + 0.6);
    const crankCenterGeo = new THREE.CylinderGeometry(0.08, 0.08, totalLength, 24);
    crankCenterGeo.rotateX(Math.PI / 2);
    const crankMain = new THREE.Mesh(crankCenterGeo, this.materials['crankshaft']);
    this.crankshaftGroup.add(crankMain);

    // Flywheel at back end of crankshaft
    const flywheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.09, 32);
    flywheelGeo.rotateX(Math.PI / 2);
    this.flywheelMesh = new THREE.Mesh(flywheelGeo, this.materials['flywheel']);
    this.flywheelMesh.position.set(0, 0, -totalLength * 0.5 - 0.05);
    this.crankshaftGroup.add(this.flywheelMesh);

    // Calculate cylinder bank angles and positions based on layout
    // Inline: 1 bank straight up (0 deg)
    // V-engine: 2 banks (Bank 1: -vAngle/2, Bank 2: +vAngle/2)
    // Boxer: 2 banks at 180 deg (-90 deg and +90 deg)
    // Single: 1 cylinder at 0 deg
    const banks = layout === 'inline' || layout === 'single' ? 1 : 2;
    const bankAngleDeg = layout === 'v' ? (config.vAngle || 90) : (layout === 'boxer' ? 180 : 0);
    const halfBankRad = (bankAngleDeg * 0.5 * Math.PI) / 180;

    const cylsPerBank = Math.ceil(numCyls / banks);

    for (let c = 0; c < numCyls; c++) {
      const bankIndex = banks === 1 ? 0 : (c % 2);
      const indexInBank = banks === 1 ? c : Math.floor(c / 2);
      
      // Bank inclination angle
      const bankAngle = banks === 1 ? 0 : (bankIndex === 0 ? -halfBankRad : halfBankRad);

      // Z position along crankshaft
      const zOffset = -((cylsPerBank - 1) * cylSpacing) * 0.5 + indexInBank * cylSpacing + (bankIndex * 0.05);

      // 1. Crank throw / counterweight on crankshaft
      const throwAngle = (c * (4 * Math.PI / numCyls)) % (2 * Math.PI);
      const throwPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16),
        this.materials['crankshaft']
      );
      throwPin.rotation.x = Math.PI / 2;
      throwPin.position.set(
        Math.sin(throwAngle) * rCrank,
        Math.cos(throwAngle) * rCrank,
        zOffset
      );
      this.crankshaftGroup.add(throwPin);

      // Crank web counterweight
      const webGeo = new THREE.BoxGeometry(0.18, rCrank * 1.5, 0.04);
      const webMesh = new THREE.Mesh(webGeo, this.materials['crankshaft']);
      webMesh.position.set(
        -Math.sin(throwAngle) * (rCrank * 0.4),
        -Math.cos(throwAngle) * (rCrank * 0.4),
        zOffset - 0.04
      );
      webMesh.rotation.z = -throwAngle;
      this.crankshaftGroup.add(webMesh);

      // 2. Cylinder Liner (Outer transparent sleeve)
      const linerHeight = rCrank * 2 + 0.35;
      const linerRadius = (boreM * 0.5) * scale;
      const linerGeo = new THREE.CylinderGeometry(linerRadius, linerRadius, linerHeight, 24, 1, true);
      const linerMesh = new THREE.Mesh(linerGeo, this.materials['cylinderLiner']);
      
      // Position liner along bank angle
      const linerCenterDist = rodLen + rCrank * 0.5;
      linerMesh.position.set(
        Math.sin(bankAngle) * linerCenterDist,
        Math.cos(bankAngle) * linerCenterDist,
        zOffset
      );
      linerMesh.rotation.z = -bankAngle;
      this.engineRootGroup.add(linerMesh);

      // Cylinder head top cap
      const headCapGeo = new THREE.CylinderGeometry(linerRadius * 1.15, linerRadius * 1.15, 0.1, 24);
      const headCap = new THREE.Mesh(headCapGeo, this.materials['engineBlock']);
      headCap.position.set(
        Math.sin(bankAngle) * (linerCenterDist + linerHeight * 0.5),
        Math.cos(bankAngle) * (linerCenterDist + linerHeight * 0.5),
        zOffset
      );
      headCap.rotation.z = -bankAngle;
      this.engineRootGroup.add(headCap);

      // 3. Piston Mesh
      const pistonHeight = 0.22;
      const pistonGeo = new THREE.CylinderGeometry(linerRadius * 0.96, linerRadius * 0.96, pistonHeight, 24);
      const pistonMesh = new THREE.Mesh(pistonGeo, this.materials['piston']);
      pistonMesh.rotation.z = -bankAngle;
      pistonMesh.castShadow = !this.isSoftwareGl;
      this.engineRootGroup.add(pistonMesh);
      this.pistonMeshes.push(pistonMesh);

      // 4. Connecting Rod Group
      const rodGroup = new THREE.Group();
      const rodStemGeo = new THREE.BoxGeometry(0.045, rodLen, 0.04);
      const rodStem = new THREE.Mesh(rodStemGeo, this.materials['connectingRod']);
      rodStem.position.y = rodLen * 0.5;
      rodGroup.add(rodStem);

      // Big end bearing
      const bigEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), this.materials['connectingRod']);
      bigEnd.rotation.x = Math.PI / 2;
      rodGroup.add(bigEnd);

      // Small end bearing
      const smallEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), this.materials['connectingRod']);
      smallEnd.rotation.x = Math.PI / 2;
      smallEnd.position.y = rodLen;
      rodGroup.add(smallEnd);

      this.engineRootGroup.add(rodGroup);
      this.rodGroups.push(rodGroup);

      // 5. Combustion Flash PointLight & Glow Mesh inside each cylinder top
      const flashLight = new THREE.PointLight(0xff6600, 0, 1.5);
      flashLight.position.copy(headCap.position);
      this.engineRootGroup.add(flashLight);
      this.combustionFlashLights.push(flashLight);

      const flashMeshGeo = new THREE.SphereGeometry(linerRadius * 0.8, 12, 12);
      const flashMeshMat = (this.materials['combustionFlash'] as THREE.MeshBasicMaterial).clone();
      const flashMesh = new THREE.Mesh(flashMeshGeo, flashMeshMat);
      flashMesh.position.copy(headCap.position);
      this.engineRootGroup.add(flashMesh);
      this.combustionFlashMeshes.push(flashMesh);
    }

    // 6. Exhaust Headers & Outlets
    this.buildExhaustSystem(config, totalLength, cylSpacing);

    // 7. Intake Manifold & Butterfly Valve
    this.buildIntakePlenum(config, totalLength);

    // Center scene camera view based on engine scale
    this.controls.target.set(0, rodLen * 0.7, 0);
  }

  private buildExhaustSystem(config: EngineConfig, totalLength: number, cylSpacing: number) {
    const exhaustMaterial = this.materials['exhaustHeaders'];
    const outlets = Math.min(12, Math.max(1, config.exhaustOutlets));
    const pipeRadius = (config.exhaustPipeDiameterIn / 2.5) * 0.06;

    // Build curved exhaust manifold runner pipes
    const exhaustGroup = new THREE.Group();
    const pipePoints: THREE.Vector3[] = [];

    // Main collector tube along side
    const collectorGeo = new THREE.CylinderGeometry(pipeRadius * 1.3, pipeRadius * 1.3, totalLength * 1.1, 16);
    collectorGeo.rotateX(Math.PI / 2);
    const collectorLeft = new THREE.Mesh(collectorGeo, exhaustMaterial);
    collectorLeft.position.set(-0.85, 0.4, 0);
    exhaustGroup.add(collectorLeft);

    if (config.layout !== 'inline' && config.layout !== 'single') {
      const collectorRight = new THREE.Mesh(collectorGeo, exhaustMaterial);
      collectorRight.position.set(0.85, 0.4, 0);
      exhaustGroup.add(collectorRight);
    }

    // Exhaust tips with flame particle anchors at the rear
    const tipLength = 0.4;
    const tipRadius = pipeRadius * 1.5;
    const halfTips = Math.ceil(outlets / 2);

    for (let i = 0; i < outlets; i++) {
      const tipGeo = new THREE.CylinderGeometry(tipRadius, tipRadius * 1.1, tipLength, 16, 1, true);
      tipGeo.rotateX(Math.PI / 2);
      const tipMesh = new THREE.Mesh(tipGeo, exhaustMaterial);
      
      const isLeft = i % 2 === 0;
      const xSpread = isLeft ? (-0.4 - (i * 0.12)) : (0.4 + ((i - 1) * 0.12));
      tipMesh.position.set(xSpread, 0.25, -totalLength * 0.6 - tipLength * 0.5);
      exhaustGroup.add(tipMesh);

      // Create Flame Particle system for this tip
      const flamePoints = this.createFlameParticles();
      flamePoints.position.set(xSpread, 0.25, -totalLength * 0.6 - tipLength);
      exhaustGroup.add(flamePoints);
      this.exhaustFlameParticles.push(flamePoints);
    }

    this.engineRootGroup.add(exhaustGroup);
  }

  private createFlameParticles(): THREE.Points {
    const particleCount = 28;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 2] = -Math.random() * 0.5; // shoots backward

      // Vibrant flame colors: bright yellow-orange core fading to deep red/blue
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = Math.random() * 0.7 + 0.2;
      colors[i * 3 + 2] = 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  private buildIntakePlenum(config: EngineConfig, totalLength: number) {
    const intakeMaterial = this.materials['intakePlenum'];
    const intakeGroup = new THREE.Group();

    // Intake central plenum chamber sitting above cylinders
    const plenumGeo = new THREE.BoxGeometry(0.5, 0.25, totalLength * 0.85);
    const plenumMesh = new THREE.Mesh(plenumGeo, intakeMaterial);
    plenumMesh.position.set(0, 1.45, 0);
    intakeGroup.add(plenumMesh);

    // Throttle Body housing
    const tbHousingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 24);
    tbHousingGeo.rotateX(Math.PI / 2);
    const tbHousing = new THREE.Mesh(tbHousingGeo, this.materials['piston']);
    tbHousing.position.set(0, 1.45, totalLength * 0.45 + 0.18);
    intakeGroup.add(tbHousing);

    // Butterfly Throttle Plate (rotates 0 to 90 deg with throttle)
    const butterflyGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20);
    butterflyGeo.rotateX(Math.PI / 2);
    this.throttleValveMesh = new THREE.Mesh(butterflyGeo, this.materials['exhaustHeaders']);
    this.throttleValveMesh.position.copy(tbHousing.position);
    intakeGroup.add(this.throttleValveMesh);

    this.engineRootGroup.add(intakeGroup);
  }

  public update(state: EngineState) {
    const config = this.currentConfig;
    const numCyls = config.cylinders;
    const layout = config.layout;
    const strokeM = config.strokeMm / 1000;
    const scale = 5.0;
    const rCrank = (strokeM * 0.5) * scale;
    const rodLen = rCrank * 3.5;
    const cylSpacing = Math.max(0.45, (config.boreMm / 1000 * 1.5) * scale);

    const banks = layout === 'inline' || layout === 'single' ? 1 : 2;
    const bankAngleDeg = layout === 'v' ? (config.vAngle || 90) : (layout === 'boxer' ? 180 : 0);
    const halfBankRad = (bankAngleDeg * 0.5 * Math.PI) / 180;
    const cylsPerBank = Math.ceil(numCyls / banks);

    // 1. Rotate Crankshaft group
    // Crank rotates around Z-axis at state.crankAngleRad
    this.crankshaftGroup.rotation.z = state.crankAngleRad;

    // 2. Throttle Butterfly Valve Angle (0 = closed, 90 deg = open)
    if (this.throttleValveMesh) {
      this.throttleValveMesh.rotation.y = state.throttle * (Math.PI * 0.48);
    }

    // 3. Update each cylinder's 4-stroke kinematic positions (Piston & Connecting Rod)
    for (let c = 0; c < numCyls; c++) {
      if (!this.pistonMeshes[c] || !this.rodGroups[c]) continue;

      const bankIndex = banks === 1 ? 0 : (c % 2);
      const indexInBank = banks === 1 ? c : Math.floor(c / 2);
      const bankAngle = banks === 1 ? 0 : (bankIndex === 0 ? -halfBankRad : halfBankRad);
      const zOffset = -((cylsPerBank - 1) * cylSpacing) * 0.5 + indexInBank * cylSpacing + (bankIndex * 0.05);

      // Crank pin throw angle relative to crank rotation
      const throwAngle = (c * (4 * Math.PI / numCyls)) % (2 * Math.PI);
      const totalPinAngle = state.crankAngleRad + throwAngle;

      // Crank pin position in world coordinates (rotation around origin 0,0,zOffset)
      const pinX = Math.sin(totalPinAngle) * rCrank;
      const pinY = Math.cos(totalPinAngle) * rCrank;

      // Angle of crank pin relative to cylinder bank axis
      const theta = totalPinAngle - bankAngle;

      // Exact 4-stroke slider-crank kinematic stroke displacement formula:
      // s(theta) = r * cos(theta) + sqrt(l^2 - r^2 * sin^2(theta))
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const pistonDistanceAlongAxis = rCrank * cosTheta + Math.sqrt(Math.max(0.01, rodLen * rodLen - rCrank * rCrank * sinTheta * sinTheta));

      // Piston position along bank vector
      const pistonX = Math.sin(bankAngle) * pistonDistanceAlongAxis;
      const pistonY = Math.cos(bankAngle) * pistonDistanceAlongAxis;

      this.pistonMeshes[c].position.set(pistonX, pistonY, zOffset);

      // Connecting rod connects crank pin (pinX, pinY) to wrist pin (pistonX, pistonY)
      const rodGroup = this.rodGroups[c];
      rodGroup.position.set(pinX, pinY, zOffset);

      // Rod angle towards piston wrist pin
      const dx = pistonX - pinX;
      const dy = pistonY - pinY;
      const rodAngle = Math.atan2(dx, dy);
      rodGroup.rotation.z = -rodAngle;

      // 4. Combustion Flash in cylinder
      const flash = state.combustionFlashes[c] || 0;
      if (this.combustionFlashLights[c]) {
        this.combustionFlashLights[c].intensity = flash * 3.5;
      }
      if (this.combustionFlashMeshes[c]) {
        const mat = this.combustionFlashMeshes[c].material as THREE.MeshBasicMaterial;
        mat.opacity = flash * 0.85;
      }
    }

    // 4. Exhaust Flame animation & scaling
    const flameIntensity = state.exhaustFlameIntensity || 0;
    for (let p = 0; p < this.exhaustFlameParticles.length; p++) {
      const points = this.exhaustFlameParticles[p];
      const mat = points.material as THREE.PointsMaterial;
      mat.opacity = flameIntensity > 0.05 ? Math.min(1.0, flameIntensity * 1.2) : 0;
      
      // Jitter flame particles for authentic fire motion
      if (flameIntensity > 0.05) {
        const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const count = posAttr.count;
        for (let i = 0; i < count; i++) {
          posAttr.setZ(i, -0.1 - Math.random() * (0.3 + flameIntensity * 0.7));
          posAttr.setX(i, (Math.random() - 0.5) * 0.12 * (1 + flameIntensity));
          posAttr.setY(i, (Math.random() - 0.5) * 0.12 * (1 + flameIntensity));
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  private animate = () => {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Camera presets
  public setCameraView(preset: 'iso' | 'cutaway' | 'exhaust' | 'top') {
    switch (preset) {
      case 'iso':
        this.camera.position.set(3.2, 2.5, 4.2);
        break;
      case 'cutaway':
        this.camera.position.set(4.5, 1.2, 0);
        break;
      case 'exhaust':
        this.camera.position.set(1.5, 1.2, -4.5);
        break;
      case 'top':
        this.camera.position.set(0, 5.5, 0.5);
        break;
    }
    this.controls.update();
  }

  public destroy() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationFrameId);

    // Dispose geometries and materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    Object.values(this.materials).forEach(m => m.dispose());

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
