import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DriverId, DriverSpec, GraphicsQuality, VehicleId, VehicleSpec, WorldSpec } from './types';
import { VehiclePhysicsEngine } from './physics';

// Module-scope reusable scratch objects (Zero GC in render loop)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

function createProceduralTerrainTexture(
  renderer: THREE.WebGLRenderer,
  topHex: string,
  edgeHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, edgeHex);
  grad.addColorStop(0.2, topHex);
  grad.addColorStop(0.8, topHex);
  grad.addColorStop(1, edgeHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Dirt tire-track ruts down the center of the trail
  ctx.fillStyle = 'rgba(120, 63, 20, 0.36)';
  ctx.fillRect(0, 145, 512, 58);
  ctx.fillRect(0, 310, 512, 58);

  // Organic grass blades, gravel pebbles & wildflowers
  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 78.233) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 45.164) * 0.5 + 0.5) * 512;
    const w = 4 + (i % 14);
    const h = 2 + (i % 5);
    ctx.fillStyle = i % 9 === 0 ? '#fde047' : i % 3 === 0 ? '#14532d' : edgeHex;
    ctx.globalAlpha = i % 9 === 0 ? 0.55 : 0.28;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createProceduralCliffTexture(
  renderer: THREE.WebGLRenderer,
  subHex: string,
  deepHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, subHex);
  grad.addColorStop(0.45, '#5c3416');
  grad.addColorStop(1, deepHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Top rim stacked stone blocks (matching reference image ledge)
  for (let col = 0; col < 8; col++) {
    const bx = col * 64;
    ctx.fillStyle = col % 2 === 0 ? '#a67b5b' : '#8c6239';
    ctx.strokeStyle = '#2b1404';
    ctx.lineWidth = 4;
    ctx.fillRect(bx + 2, 4, 60, 48);
    ctx.strokeRect(bx + 2, 4, 60, 48);
    ctx.fillStyle = 'rgba(255, 248, 220, 0.24)';
    ctx.fillRect(bx + 6, 8, 52, 10);
  }

  // Faceted rocky cliff strata
  for (let i = 0; i < 180; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 512;
    const y = 60 + (Math.cos(i * 37.3) * 0.5 + 0.5) * 440;
    const w = 22 + (i % 46);
    const h = 14 + (i % 28);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(166, 123, 91, 0.38)' : 'rgba(38, 18, 4, 0.42)';
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(12, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createProceduralBumpTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1400; i++) {
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 78.233) * 0.5 + 0.5) * 256;
    const r = 2 + (i % 8);
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#202020';
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 4);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createVehicleLiveryTexture(
  renderer: THREE.WebGLRenderer,
  spec: VehicleSpec
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = spec.primaryColor;
  ctx.fillRect(0, 0, 512, 256);

  if (spec.id === 'monster') {
    // Hot-rod yellow/orange/red flames on electric blue body
    const grad = ctx.createLinearGradient(512, 0, 80, 0);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.45, '#f97316');
    grad.addColorStop(1, '#dc2626');
    ctx.fillStyle = grad;
    for (let row = 0; row < 3; row++) {
      const yOff = row * 85;
      ctx.beginPath();
      ctx.moveTo(512, yOff + 10);
      ctx.lineTo(220, yOff + 25);
      ctx.lineTo(310, yOff + 48);
      ctx.lineTo(120, yOff + 58);
      ctx.lineTo(260, yOff + 75);
      ctx.lineTo(512, yOff + 82);
      ctx.closePath();
      ctx.fill();
    }
  } else if (spec.id === 'buggy') {
    // Red & orange racing flames on golden yellow body
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(512, 20);
    ctx.lineTo(160, 60);
    ctx.lineTo(280, 120);
    ctx.lineTo(90, 165);
    ctx.lineTo(290, 210);
    ctx.lineTo(512, 240);
    ctx.closePath();
    ctx.fill();
  } else if (spec.id === 'jeep') {
    // Crisp white mountain peak door graphic + subtle Rubicon stripe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(150, 210);
    ctx.lineTo(235, 95);
    ctx.lineTo(290, 155);
    ctx.lineTo(345, 80);
    ctx.lineTo(425, 210);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 212, 512, 14);
  } else if (spec.id === 'rally') {
    // Twin white racing stripes + #23 number plate
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 88, 512, 26);
    ctx.fillRect(0, 142, 512, 26);
    ctx.fillRect(195, 48, 120, 160);
    ctx.fillStyle = '#090d16';
    ctx.font = '900 92px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('23', 255, 160);
  } else if (spec.id === 'dirtbike') {
    // Lime green motocross shroud + #27 white number plate
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(160, 40, 190, 175);
    ctx.fillStyle = '#090d16';
    ctx.font = '900 105px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('27', 255, 165);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createCrateTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(120, 120);
  ctx.moveTo(120, 8);
  ctx.lineTo(8, 120);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createBarrelTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 28, 128, 24);
  ctx.fillRect(0, 76, 128, 24);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 128, 8);
  ctx.fillRect(0, 120, 128, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createHillRushSignTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#854d1e';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#2b1404';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);

  // Plank dividers
  ctx.fillStyle = '#3b2313';
  ctx.fillRect(0, 42, 256, 4);
  ctx.fillRect(0, 84, 256, 4);

  ctx.fillStyle = '#fffbeb';
  ctx.font = '900 44px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HILL', 128, 54);
  ctx.fillText('RUSH', 128, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ThreeOffroadRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private vehicleSpotLight: THREE.SpotLight;

  // Dynamic terrain ribbon mesh + cliff face
  private terrainGeo: THREE.BufferGeometry;
  private terrainMat: THREE.MeshStandardMaterial;
  private terrainMesh: THREE.Mesh;
  private cliffGeo: THREE.BufferGeometry;
  private cliffMat: THREE.MeshStandardMaterial;
  private cliffMesh: THREE.Mesh;
  private terrainSegments = 104;

  // Distant 3D Alpine Mountain Range & Reflective Valley Lake
  private mountainInstancedMesh: THREE.InstancedMesh;
  private snowCapInstancedMesh: THREE.InstancedMesh;
  private lakeMesh: THREE.Mesh;
  private lakeMat: THREE.MeshPhysicalMaterial;

  // Instanced Multi-Tier 3D Pine Forests, Rocks, Bridges, Pickups & Roadside Props
  private propTrunksMesh: THREE.InstancedMesh;
  private propCanopyBottomMesh: THREE.InstancedMesh;
  private propCanopyMidMesh: THREE.InstancedMesh;
  private propCanopyTopMesh: THREE.InstancedMesh;
  private rocksInstancedMesh: THREE.InstancedMesh;
  private bridgePlanksInstancedMesh: THREE.InstancedMesh;
  private bridgePilingInstancedMesh: THREE.InstancedMesh;
  private coinInstancedMesh: THREE.InstancedMesh;
  private fuelInstancedMesh: THREE.InstancedMesh;
  private crateInstancedMesh: THREE.InstancedMesh;
  private barrelInstancedMesh: THREE.InstancedMesh;
  private particleInstancedMesh: THREE.InstancedMesh;

  // 3D Landmark Pools: Wooden "HILL RUSH" Signs & Lookout Watchtowers
  private signGroups: THREE.Group[] = [];
  private watchtowerGroups: THREE.Group[] = [];
  private watchtowerFlags: THREE.Mesh[] = [];

  // Composite 12-part Vehicle Group + Working Coil-Over Shocks + Volumetric Light Beams
  private vehicleGroup: THREE.Group;
  private chassisGroup: THREE.Group;
  private driverGroup: THREE.Group;
  private frontBumperGroup: THREE.Group;
  private roofAccessoryGroup: THREE.Group;
  private frontRightWheelGroup: THREE.Group;
  private frontLeftWheelGroup: THREE.Group;
  private rearRightWheelGroup: THREE.Group;
  private rearLeftWheelGroup: THREE.Group;
  private frontCoilGroup: THREE.Group;
  private rearCoilGroup: THREE.Group;
  private contactShadowMesh: THREE.Mesh;

  private currentVehicleId: VehicleId | null = null;
  private currentDriverId: DriverId | null = null;
  private currentWorldId: string | null = null;

  constructor(mountEl: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      mountEl.clientWidth || window.innerWidth,
      mountEl.clientHeight || window.innerHeight
    );

    mountEl.innerHTML = '';
    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1E78D6');
    this.scene.fog = new THREE.FogExp2('#BAE6FD', 0.0085);

    // Mandatory RoomEnvironment + PMREMGenerator reflection map for realistic metallic clearcoat
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const aspect =
      (mountEl.clientWidth || window.innerWidth) /
      (mountEl.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 280);
    this.camera.position.set(6, 4, 22);

    // Studio 3-Point + Hemisphere Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3f2e1e, 0.88);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 2.15);
    this.keyLight.position.set(16, 32, 20);
    this.keyLight.castShadow = !isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    const d = 24;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    this.rimLight.position.set(-14, 18, -16);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Active Vehicle Headlight / Roof Floodlight SpotLight illuminating the trail ahead
    this.vehicleSpotLight = new THREE.SpotLight(0xfef08a, 4.5, 36, Math.PI * 0.24, 0.55, 1.2);
    this.vehicleSpotLight.castShadow = false;
    this.scene.add(this.vehicleSpotLight);
    this.scene.add(this.vehicleSpotLight.target);

    const sharedBumpTex = createProceduralBumpTexture(this.renderer);

    // 1. Dynamic 3D Terrain Ribbon (top driving track) + Front Cliff Face
    this.terrainGeo = this.createRibbonGeometry(this.terrainSegments);
    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.06,
      bumpMap: sharedBumpTex,
      bumpScale: 0.14,
    });
    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    this.cliffGeo = this.createCliffGeometry(this.terrainSegments);
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.08,
      bumpMap: sharedBumpTex,
      bumpScale: 0.28,
    });
    this.cliffMesh = new THREE.Mesh(this.cliffGeo, this.cliffMat);
    this.cliffMesh.receiveShadow = true;
    this.scene.add(this.cliffMesh);

    // 2. Distant 3D Snow-Capped Alpine Mountain Range (18 monumental peaks)
    const mountainGeo = new THREE.ConeGeometry(22, 42, 5);
    mountainGeo.translate(0, 21, 0);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true,
    });
    this.mountainInstancedMesh = new THREE.InstancedMesh(mountainGeo, mountainMat, 18);
    this.mountainInstancedMesh.frustumCulled = false;
    this.scene.add(this.mountainInstancedMesh);

    const snowCapGeo = new THREE.ConeGeometry(9.6, 18.2, 5);
    snowCapGeo.translate(0, 33.1, 0);
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
    });
    this.snowCapInstancedMesh = new THREE.InstancedMesh(snowCapGeo, snowCapMat, 18);
    this.snowCapInstancedMesh.frustumCulled = false;
    this.scene.add(this.snowCapInstancedMesh);

    // 3. Reflective 3D Mountain Valley Lake
    const lakeGeo = new THREE.PlaneGeometry(240, 34, 32, 8);
    lakeGeo.rotateX(-Math.PI * 0.5);
    this.lakeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      metalness: 0.25,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      bumpMap: sharedBumpTex,
      bumpScale: 0.06,
    });
    this.lakeMesh = new THREE.Mesh(lakeGeo, this.lakeMat);
    this.lakeMesh.position.set(0, -4.2, -26);
    this.lakeMesh.receiveShadow = true;
    this.scene.add(this.lakeMesh);

    // 4. Multi-Tier 3D Pine Forest Trees (85 instances x 3 foliage cones + trunk)
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.4, 7);
    trunkGeo.translate(0, 1.2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.propTrunksMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, 85);
    this.propTrunksMesh.frustumCulled = false;
    this.scene.add(this.propTrunksMesh);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.62,
      metalness: 0.08,
      flatShading: true,
    });
    const canopyBottomGeo = new THREE.ConeGeometry(1.55, 2.4, 7);
    canopyBottomGeo.translate(0, 2.5, 0);
    this.propCanopyBottomMesh = new THREE.InstancedMesh(canopyBottomGeo, canopyMat, 85);
    this.propCanopyBottomMesh.frustumCulled = false;
    this.scene.add(this.propCanopyBottomMesh);

    const canopyMidGeo = new THREE.ConeGeometry(1.22, 2.1, 7);
    canopyMidGeo.translate(0, 3.8, 0);
    this.propCanopyMidMesh = new THREE.InstancedMesh(canopyMidGeo, canopyMat, 85);
    this.propCanopyMidMesh.frustumCulled = false;
    this.scene.add(this.propCanopyMidMesh);

    const canopyTopGeo = new THREE.ConeGeometry(0.88, 1.8, 7);
    canopyTopGeo.translate(0, 5.0, 0);
    this.propCanopyTopMesh = new THREE.InstancedMesh(canopyTopGeo, canopyMat, 85);
    this.propCanopyTopMesh.frustumCulled = false;
    this.scene.add(this.propCanopyTopMesh);

    // 5. 3D Wooden "HILL RUSH" Trail Signboards & Lookout Watchtowers
    const signTex = createHillRushSignTexture(this.renderer);
    for (let i = 0; i < 3; i++) {
      const sg = this.build3DHillRushSign(signTex);
      this.signGroups.push(sg);
      this.scene.add(sg);
    }
    for (let i = 0; i < 3; i++) {
      const { group, flag } = this.build3DWatchtower();
      this.watchtowerGroups.push(group);
      this.watchtowerFlags.push(flag);
      this.scene.add(group);
    }

    // 6. InstancedMesh for 3D Boulders
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.82,
      metalness: 0.14,
      bumpMap: sharedBumpTex,
      bumpScale: 0.12,
    });
    this.rocksInstancedMesh = new THREE.InstancedMesh(rockGeo, rockMat, 45);
    this.rocksInstancedMesh.frustumCulled = false;
    this.scene.add(this.rocksInstancedMesh);

    // 7. InstancedMesh for 3D Wooden Suspension Bridge Planks & Pilings
    const plankGeo = new THREE.BoxGeometry(1.15, 0.24, 4.8);
    const plankMat = new THREE.MeshStandardMaterial({
      color: 0x9a5b25,
      roughness: 0.85,
      metalness: 0.08,
    });
    this.bridgePlanksInstancedMesh = new THREE.InstancedMesh(plankGeo, plankMat, 48);
    this.bridgePlanksInstancedMesh.frustumCulled = false;
    this.scene.add(this.bridgePlanksInstancedMesh);

    const pilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 6.5, 8);
    const pilingMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.bridgePilingInstancedMesh = new THREE.InstancedMesh(pilingGeo, pilingMat, 16);
    this.bridgePilingInstancedMesh.frustumCulled = false;
    this.scene.add(this.bridgePilingInstancedMesh);

    // 8. InstancedMesh for 3D Coins & Gems
    const coinGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.15, 20);
    coinGeo.rotateX(Math.PI * 0.5);
    const coinMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      metalness: 0.95,
      roughness: 0.14,
      clearcoat: 1.0,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
    });
    this.coinInstancedMesh = new THREE.InstancedMesh(coinGeo, coinMat, 60);
    this.coinInstancedMesh.frustumCulled = false;
    this.scene.add(this.coinInstancedMesh);

    // 9. InstancedMesh for 3D Fuel Jerrycans
    const fuelGeo = new THREE.BoxGeometry(0.7, 0.88, 0.4);
    const fuelMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      metalness: 0.48,
      roughness: 0.28,
      clearcoat: 0.85,
    });
    this.fuelInstancedMesh = new THREE.InstancedMesh(fuelGeo, fuelMat, 20);
    this.fuelInstancedMesh.frustumCulled = false;
    this.scene.add(this.fuelInstancedMesh);

    // 10. Interactive 3D Roadside Crates & Hazard Barrels
    const crateGeo = new THREE.BoxGeometry(0.84, 0.84, 0.84);
    const crateMat = new THREE.MeshStandardMaterial({
      map: createCrateTexture(this.renderer),
      roughness: 0.78,
      metalness: 0.12,
    });
    this.crateInstancedMesh = new THREE.InstancedMesh(crateGeo, crateMat, 30);
    this.crateInstancedMesh.frustumCulled = false;
    this.scene.add(this.crateInstancedMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.94, 14);
    const barrelMat = new THREE.MeshPhysicalMaterial({
      map: createBarrelTexture(this.renderer),
      roughness: 0.35,
      metalness: 0.45,
      clearcoat: 0.6,
    });
    this.barrelInstancedMesh = new THREE.InstancedMesh(barrelGeo, barrelMat, 30);
    this.barrelInstancedMesh.frustumCulled = false;
    this.scene.add(this.barrelInstancedMesh);

    // 11. 3D Instanced Particles (Mud Clods, Dust Puffs, Exhaust Smoke & Sparks)
    const partGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.1,
    });
    this.particleInstancedMesh = new THREE.InstancedMesh(partGeo, partMat, 140);
    this.particleInstancedMesh.frustumCulled = false;
    this.scene.add(this.particleInstancedMesh);

    // 12. Initialize Vehicle Hierarchy, 3D Cartoon Driver, Detachable Parts & Helical Coil-Over Shocks
    this.vehicleGroup = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.driverGroup = new THREE.Group();
    this.frontBumperGroup = new THREE.Group();
    this.roofAccessoryGroup = new THREE.Group();
    this.frontRightWheelGroup = new THREE.Group();
    this.frontLeftWheelGroup = new THREE.Group();
    this.rearRightWheelGroup = new THREE.Group();
    this.rearLeftWheelGroup = new THREE.Group();
    this.frontCoilGroup = this.buildHelicalShockStrut();
    this.rearCoilGroup = this.buildHelicalShockStrut();

    // Soft radial contact shadow plane grounded beneath vehicle
    const shadowPlaneGeo = new THREE.PlaneGeometry(4.6, 2.8);
    shadowPlaneGeo.rotateX(-Math.PI * 0.5);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.contactShadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    this.scene.add(this.contactShadowMesh);

    this.vehicleGroup.add(this.chassisGroup);
    this.vehicleGroup.add(this.driverGroup);
    this.vehicleGroup.add(this.frontBumperGroup);
    this.vehicleGroup.add(this.roofAccessoryGroup);
    this.vehicleGroup.add(this.frontRightWheelGroup);
    this.vehicleGroup.add(this.frontLeftWheelGroup);
    this.vehicleGroup.add(this.rearRightWheelGroup);
    this.vehicleGroup.add(this.rearLeftWheelGroup);
    this.vehicleGroup.add(this.frontCoilGroup);
    this.vehicleGroup.add(this.rearCoilGroup);
    this.scene.add(this.vehicleGroup);
  }

  private buildHelicalShockStrut(): THREE.Group {
    const g = new THREE.Group();
    // Chrome inner damper piston shaft
    const shaftGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 10);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    g.add(shaft);

    // Anodized upper shock body cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.42, 12);
    bodyGeo.translate(0, 0.22, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.28,
    });
    g.add(new THREE.Mesh(bodyGeo, bodyMat));

    // 6 Helical Coil Spring Rings
    const ringGeo = new THREE.TorusGeometry(0.13, 0.032, 8, 16);
    ringGeo.rotateX(Math.PI * 0.42);
    const coilMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      metalness: 0.45,
      roughness: 0.25,
      clearcoat: 0.8,
    });
    for (let c = 0; c < 6; c++) {
      const ring = new THREE.Mesh(ringGeo, coilMat);
      ring.position.y = -0.35 + c * 0.14;
      g.add(ring);
    }
    return g;
  }

  private build3DHillRushSign(signTex: THREE.CanvasTexture): THREE.Group {
    const g = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.22, 2.8, 0.22);
    postGeo.translate(0, 1.4, 0);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.9,
      metalness: 0.05,
    });
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.x = -0.85;
    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.x = 0.85;
    g.add(leftPost, rightPost);

    const boardGeo = new THREE.BoxGeometry(2.5, 1.35, 0.18);
    const boardMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.78,
      metalness: 0.08,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2.15, 0.08);
    board.rotation.z = 0.05;
    g.add(board);
    return g;
  }

  private build3DWatchtower(): { group: THREE.Group; flag: THREE.Mesh } {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a21,
      roughness: 0.86,
      metalness: 0.06,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
    });

    // 4 Corner Support Timber Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.18, 4.8, 7);
    legGeo.translate(0, 2.4, 0);
    const offsets = [
      [-1.1, -1.1],
      [1.1, -1.1],
      [-1.1, 1.1],
      [1.1, 1.1],
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(ox, 0, oz);
      g.add(leg);
    });

    // Observation Deck Platform
    const deckGeo = new THREE.BoxGeometry(2.9, 0.28, 2.9);
    const deck = new THREE.Mesh(deckGeo, darkWoodMat);
    deck.position.y = 3.4;
    g.add(deck);

    // Railing
    const railGeo = new THREE.BoxGeometry(2.8, 0.14, 2.8);
    const rail = new THREE.Mesh(railGeo, woodMat);
    rail.position.y = 4.0;
    g.add(rail);

    // Pitched Pyramid Roof
    const roofGeo = new THREE.ConeGeometry(2.35, 1.45, 4);
    roofGeo.rotateY(Math.PI * 0.25);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.y = 5.35;
    g.add(roof);

    // Flagpole & Waving Red Pennant Flag
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
    const pole = new THREE.Mesh(
      poleGeo,
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
    );
    pole.position.y = 6.4;
    g.add(pole);

    const flagGeo = new THREE.BoxGeometry(0.95, 0.42, 0.05);
    flagGeo.translate(0.48, 0, 0);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0, 6.85, 0);
    g.add(flag);

    return { group: g, flag };
  }

  public setQuality(quality: GraphicsQuality): void {
    if (isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    switch (quality) {
      case 'LOW':
        this.renderer.setPixelRatio(Math.min(dpr, 1.0));
        this.renderer.shadowMap.enabled = false;
        break;
      case 'MEDIUM':
        this.renderer.setPixelRatio(Math.min(dpr, 1.25));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'HIGH':
        this.renderer.setPixelRatio(Math.min(dpr, 1.75));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'ULTRA':
        this.renderer.setPixelRatio(Math.min(dpr, 2.0));
        this.renderer.shadowMap.enabled = true;
        break;
    }
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private createRibbonGeometry(segments: number): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const vertsPerCol = 2;
    const vertexCount = (segments + 1) * vertsPerCol;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      uvs[i * 4 + 0] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;

      if (i < segments) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  private createCliffGeometry(segments: number): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      uvs[i * 4 + 0] = u;
      uvs[i * 4 + 1] = 1;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 0;

      if (i < segments) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  public syncWorldTheme(world: WorldSpec): void {
    if (this.currentWorldId === world.id) return;
    this.currentWorldId = world.id;

    this.scene.background = new THREE.Color(world.skyTop);
    this.scene.fog = new THREE.FogExp2(world.horizonFog, 0.0082);

    this.hemiLight.color.setHex(world.ambientLightHex);
    this.hemiLight.groundColor.set(world.terrainDeep);
    this.keyLight.color.setHex(world.sunLightHex);

    if (this.terrainMat.map) this.terrainMat.map.dispose();
    this.terrainMat.map = createProceduralTerrainTexture(
      this.renderer,
      world.terrainTop,
      world.terrainEdge
    );
    this.terrainMat.color.set('#ffffff');
    this.terrainMat.needsUpdate = true;

    if (this.cliffMat.map) this.cliffMat.map.dispose();
    this.cliffMat.map = createProceduralCliffTexture(
      this.renderer,
      world.terrainSub,
      world.terrainDeep
    );
    this.cliffMat.color.set('#ffffff');
    this.cliffMat.needsUpdate = true;

    const canopyMat = this.propCanopyBottomMesh.material as THREE.MeshStandardMaterial;
    canopyMat.color.set(world.mountainMid);

    const mountainMat = this.mountainInstancedMesh.material as THREE.MeshStandardMaterial;
    mountainMat.color.set(world.mountainFar);

    this.lakeMesh.visible =
      world.id === 'green_valley' ||
      world.id === 'snow_mountains' ||
      world.id === 'dark_forest';
  }

  /**
   * Builds a bespoke 12-part procedural 3D vehicle model (THREE.Group)
   * with custom PBR clearcoat livery texture, tubular roll cage, detachable roof light bar,
   * expressive 3D cartoon driver character (6 selectable characters), detachable front bumper,
   * and 4 knobby 3D mud wheels.
   */
  public syncVehicleModel(spec: VehicleSpec, driver: DriverSpec): void {
    if (this.currentVehicleId === spec.id && this.currentDriverId === driver.id) return;
    this.currentVehicleId = spec.id;
    this.currentDriverId = driver.id;

    this.chassisGroup.clear();
    this.driverGroup.clear();
    this.frontBumperGroup.clear();
    this.roofAccessoryGroup.clear();
    this.frontRightWheelGroup.clear();
    this.frontLeftWheelGroup.clear();
    this.rearRightWheelGroup.clear();
    this.rearLeftWheelGroup.clear();

    const liveryTex = createVehicleLiveryTexture(this.renderer, spec);

    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      map: liveryTex,
      color: 0xffffff,
      metalness: 0.62,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.45,
      roughness: 0.65,
    });

    const cagePaintMat = new THREE.MeshPhysicalMaterial({
      color: spec.id === 'buggy' ? 0xfacc15 : 0x1e293b,
      metalness: 0.65,
      roughness: 0.25,
      clearcoat: 0.8,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.96,
      roughness: 0.12,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.58,
      clearcoat: 1.0,
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 3.2,
      roughness: 0.15,
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.4,
      roughness: 0.2,
    });

    const lightBeamConeMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // 1. Primary Silhouette: Sculpted Beveled Chassis Hull (ExtrudeGeometry)
    const hullShape = new THREE.Shape();
    const halfWb = spec.wheelbase * 0.58;
    if (spec.id === 'dirtbike') {
      hullShape.moveTo(-halfWb * 0.85, 0.08);
      hullShape.lineTo(halfWb * 0.85, 0.18);
      hullShape.lineTo(halfWb * 0.48, 0.68);
      hullShape.lineTo(-halfWb * 0.18, 0.52);
      hullShape.lineTo(-halfWb * 0.92, 0.58);
      hullShape.closePath();
    } else if (spec.id === 'buggy') {
      hullShape.moveTo(-halfWb, 0.05);
      hullShape.lineTo(halfWb * 1.08, 0.02);
      hullShape.lineTo(halfWb * 0.72, 0.44);
      hullShape.lineTo(-halfWb * 0.78, 0.5);
      hullShape.closePath();
    } else if (spec.id === 'rally') {
      hullShape.moveTo(-halfWb * 1.1, 0.02);
      hullShape.lineTo(halfWb * 1.14, 0.0);
      hullShape.lineTo(halfWb * 0.96, 0.44);
      hullShape.lineTo(halfWb * 0.36, 0.84);
      hullShape.lineTo(-halfWb * 0.56, 0.84);
      hullShape.lineTo(-halfWb * 1.06, 0.5);
      hullShape.closePath();
    } else {
      // Jeep / Monster / Heavy Pickup
      hullShape.moveTo(-halfWb * 1.06, 0.06);
      hullShape.lineTo(halfWb * 1.1, 0.06);
      hullShape.lineTo(halfWb * 1.04, 0.56);
      hullShape.lineTo(halfWb * 0.42, 0.6);
      hullShape.lineTo(halfWb * 0.22, 1.06);
      hullShape.lineTo(-halfWb * 0.54, 1.06);
      hullShape.lineTo(-halfWb * 0.6, 0.6);
      hullShape.lineTo(-halfWb * 1.06, 0.58);
      hullShape.closePath();
    }

    const bodyDepth = spec.id === 'dirtbike' ? 0.36 : 1.32;
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      steps: 1,
      depth: bodyDepth,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 4,
    });
    hullGeo.translate(0, -0.18, -bodyDepth * 0.5);
    // Normalize UV coordinates so procedural livery maps cleanly across the side profile
    const posAttr = hullGeo.attributes.position as THREE.BufferAttribute;
    const uvAttr = hullGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      uvAttr.setXY(
        i,
        (vx + halfWb * 1.2) / (halfWb * 2.4),
        (vy + 0.2) / 1.35
      );
    }
    uvAttr.needsUpdate = true;

    const hullMesh = new THREE.Mesh(hullGeo, bodyPaintMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    this.chassisGroup.add(hullMesh);

    // 2. Sculpted Flared Wheel Arch Fenders (for 4-wheeled vehicles)
    if (spec.id !== 'dirtbike') {
      const fenderGeo = new THREE.BoxGeometry(0.95, 0.14, bodyDepth + 0.28);
      const frontFender = new THREE.Mesh(fenderGeo, trimMat);
      frontFender.position.set(spec.wheelbase * 0.48, 0.18, 0);
      const rearFender = new THREE.Mesh(fenderGeo, trimMat);
      rearFender.position.set(-spec.wheelbase * 0.48, 0.18, 0);
      this.chassisGroup.add(frontFender, rearFender);
    }

    // 3. Vehicle-Specific Signature Features (Roof Rack, Roll Cage, Rear WRC Wing, Forks)
    if (spec.id === 'rally') {
      // Iconic Rear WRC Wing Spoiler (in detachable roofAccessoryGroup)
      const wingBladeGeo = new THREE.BoxGeometry(0.38, 0.06, bodyDepth * 1.06);
      const wingBlade = new THREE.Mesh(wingBladeGeo, bodyPaintMat);
      wingBlade.position.set(-halfWb * 1.05, 0.66, 0);
      wingBlade.rotation.z = -0.18;
      this.roofAccessoryGroup.add(wingBlade);

      const strutGeo = new THREE.BoxGeometry(0.14, 0.34, 0.06);
      const strutR = new THREE.Mesh(strutGeo, trimMat);
      strutR.position.set(-halfWb * 0.98, 0.5, bodyDepth * 0.38);
      const strutL = strutR.clone();
      strutL.position.z = -bodyDepth * 0.38;
      this.roofAccessoryGroup.add(strutR, strutL);
    } else if (spec.id === 'dirtbike') {
      // Gold Inverted Motocross Front Forks & Handlebars
      const forkGeo = new THREE.CylinderGeometry(0.045, 0.038, 1.15, 8);
      const forkMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.88,
        roughness: 0.18,
      });
      const forkR = new THREE.Mesh(forkGeo, forkMat);
      forkR.position.set(halfWb * 0.62, 0.18, 0.14);
      forkR.rotation.z = 0.42;
      const forkL = forkR.clone();
      forkL.position.z = -0.14;
      this.chassisGroup.add(forkR, forkL);
    } else {
      // Detachable Tubular Roof Light Bar with 4 High-Intensity Floodlights
      const barGeo = new THREE.CylinderGeometry(0.048, 0.048, bodyDepth * 0.96, 8);
      barGeo.rotateX(Math.PI * 0.5);
      const roofBar = new THREE.Mesh(barGeo, cagePaintMat);
      const roofY = spec.id === 'buggy' ? 0.76 : 0.94;
      const roofX = spec.id === 'buggy' ? 0.08 : 0.15;
      roofBar.position.set(roofX, roofY, 0);
      this.roofAccessoryGroup.add(roofBar);

      // 4 Roof Floodlight Pods + Volumetric Light Cone
      const podGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.1, 12);
      podGeo.rotateZ(Math.PI * 0.5);
      for (let i = 0; i < 4; i++) {
        const zOff = (i - 1.5) * (bodyDepth * 0.22);
        const pod = new THREE.Mesh(podGeo, headlightMat);
        pod.position.set(roofX + 0.06, roofY + 0.09, zOff);
        this.roofAccessoryGroup.add(pod);
      }

      // Volumetric Roof Floodlight Beam Cone
      const roofConeGeo = new THREE.ConeGeometry(1.65, 6.8, 16, 1, true);
      roofConeGeo.translate(0, -3.4, 0);
      roofConeGeo.rotateZ(Math.PI * 0.5 - 0.16);
      const roofCone = new THREE.Mesh(roofConeGeo, lightBeamConeMat);
      roofCone.position.set(roofX + 0.12, roofY + 0.08, 0);
      this.roofAccessoryGroup.add(roofCone);
    }

    // 4. Windshield / Canopy
    if (spec.id !== 'dirtbike') {
      const windshieldGeo = new THREE.BoxGeometry(0.08, 0.46, bodyDepth * 0.88);
      const windshield = new THREE.Mesh(windshieldGeo, glassMat);
      windshield.position.set(halfWb * 0.3, 0.64, 0);
      windshield.rotation.z = 0.38;
      this.chassisGroup.add(windshield);
    }

    // 5. Expressive 3D Cartoon Driver Character (4 Male, 2 Female) in this.driverGroup
    this.build3DCartoonDriver(driver);

    // 6. Detachable Heavy-Duty Steel Bull-Bar Front Bumper & Red Tow Hook
    if (spec.id !== 'dirtbike') {
      const bumperGeo = new THREE.CylinderGeometry(0.068, 0.068, bodyDepth * 1.08, 10);
      bumperGeo.rotateX(Math.PI * 0.5);
      const frontBumper = new THREE.Mesh(bumperGeo, trimMat);
      frontBumper.position.set(halfWb * 1.14, 0.05, 0);
      this.frontBumperGroup.add(frontBumper);

      const hookGeo = new THREE.BoxGeometry(0.12, 0.08, 0.16);
      const hookMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const hook = new THREE.Mesh(hookGeo, hookMat);
      hook.position.set(halfWb * 1.18, 0.05, 0);
      this.frontBumperGroup.add(hook);
    }

    // 7. Dual Glowing Headlights, Volumetric Headlight Cones & Taillights
    const lampGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.09, 12);
    lampGeo.rotateZ(Math.PI * 0.5);
    const headR = new THREE.Mesh(lampGeo, headlightMat);
    headR.position.set(halfWb * 1.1, 0.26, bodyDepth * 0.35);
    const headL = headR.clone();
    headL.position.z = -bodyDepth * 0.35;
    this.chassisGroup.add(headR, headL);

    // Volumetric Front Headlight Beam Cone
    const headConeGeo = new THREE.ConeGeometry(1.35, 5.8, 14, 1, true);
    headConeGeo.translate(0, -2.9, 0);
    headConeGeo.rotateZ(Math.PI * 0.5 - 0.08);
    const headCone = new THREE.Mesh(headConeGeo, lightBeamConeMat);
    headCone.position.set(halfWb * 1.12, 0.26, 0);
    this.chassisGroup.add(headCone);

    const tailR = new THREE.Mesh(lampGeo, taillightMat);
    tailR.position.set(-halfWb * 1.06, 0.26, bodyDepth * 0.35);
    const tailL = tailR.clone();
    tailL.position.z = -bodyDepth * 0.35;
    this.chassisGroup.add(tailR, tailL);

    // 8. Twin Chrome Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.58, 10);
    exhaustGeo.rotateZ(Math.PI * 0.38);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust.position.set(-halfWb * 1.02, 0.02, bodyDepth * 0.42);
    this.chassisGroup.add(exhaust);

    // 9. Build High-Detail 3D Knobby Mud-Terrain Wheels (Tire + 12 Tread Lugs + Alloy Rim + 6 Spokes + Brake Rotor)
    const buildWheel = (radius: number): THREE.Group => {
      const wg = new THREE.Group();
      const tireWidth =
        spec.id === 'monster' ? 0.58 : spec.id === 'dirtbike' ? 0.22 : 0.42;

      const tireGeo = new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, tireWidth, 24);
      tireGeo.rotateX(Math.PI * 0.5);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x171717,
        roughness: 0.88,
        metalness: 0.08,
      });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wg.add(tire);

      // 12 3D Raised Offroad Tread Lugs around the circumference
      const lugCount = 12;
      const lugGeo = new THREE.BoxGeometry(radius * 0.22, radius * 0.12, tireWidth * 1.04);
      for (let l = 0; l < lugCount; l++) {
        const a = (l / lugCount) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, tireMat);
        lug.position.set(Math.cos(a) * radius * 0.93, Math.sin(a) * radius * 0.93, 0);
        lug.rotation.z = a + Math.PI * 0.5;
        wg.add(lug);
      }

      // Deep-Dish Metallic Alloy Rim
      const rimGeo = new THREE.CylinderGeometry(
        radius * 0.56,
        radius * 0.56,
        tireWidth + 0.04,
        18
      );
      rimGeo.rotateX(Math.PI * 0.5);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wg.add(rim);

      // Colored Beadlock Ring
      const beadGeo = new THREE.TorusGeometry(radius * 0.56, 0.028, 8, 20);
      const beadMat = new THREE.MeshStandardMaterial({
        color: spec.accentColor,
        metalness: 0.85,
        roughness: 0.2,
      });
      const beadFront = new THREE.Mesh(beadGeo, beadMat);
      beadFront.position.z = tireWidth * 0.5 + 0.02;
      const beadBack = beadFront.clone();
      beadBack.position.z = -tireWidth * 0.5 - 0.02;
      wg.add(beadFront, beadBack);

      // 3 Crossed Spokes (6-spoke star pattern) so wheel rotation is crisp
      const spokeGeo = new THREE.BoxGeometry(radius * 1.06, 0.075, tireWidth + 0.06);
      for (let sp = 0; sp < 3; sp++) {
        const spoke = new THREE.Mesh(spokeGeo, beadMat);
        spoke.rotation.z = (sp * Math.PI) / 3;
        wg.add(spoke);
      }

      return wg;
    };

    const zTrack = spec.id === 'dirtbike' ? 0 : 0.76;
    this.frontRightWheelGroup.add(buildWheel(spec.frontWheelRadius));
    this.frontRightWheelGroup.position.z = zTrack;

    if (spec.id !== 'dirtbike') {
      this.frontLeftWheelGroup.add(buildWheel(spec.frontWheelRadius));
      this.frontLeftWheelGroup.position.z = -zTrack;
    }

    this.rearRightWheelGroup.add(buildWheel(spec.rearWheelRadius));
    this.rearRightWheelGroup.position.z = zTrack;

    if (spec.id !== 'dirtbike') {
      this.rearLeftWheelGroup.add(buildWheel(spec.rearWheelRadius));
      this.rearLeftWheelGroup.position.z = -zTrack;
    }
  }

  private build3DCartoonDriver(driver: DriverSpec): void {
    const suitMat = new THREE.MeshStandardMaterial({
      color: driver.outfitPrimary,
      roughness: 0.45,
      metalness: 0.15,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: driver.visorColor,
      roughness: 0.25,
      metalness: 0.5,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: driver.skinColor,
      roughness: 0.55,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: driver.hairColor,
      roughness: 0.65,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.2,
    });

    // Racing Jacket Torso
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.17, 0.28, 6, 12),
      suitMat
    );
    torso.position.set(-0.08, 0.46, 0);
    this.driverGroup.add(torso);

    // Arms reaching toward steering wheel
    const armGeo = new THREE.CapsuleGeometry(0.055, 0.24, 4, 8);
    armGeo.rotateZ(Math.PI * 0.35);
    const armR = new THREE.Mesh(armGeo, suitMat);
    armR.position.set(0.06, 0.52, 0.16);
    const armL = armR.clone();
    armL.position.z = -0.16;
    this.driverGroup.add(armR, armL);

    // Expressive Cartoon Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 16, 16),
      skinMat
    );
    head.position.set(-0.04, 0.81, 0);
    this.driverGroup.add(head);

    // Cartoon Eyes (Right & Left facing camera/forward)
    const eyeGeo = new THREE.SphereGeometry(0.036, 8, 8);
    const eyeR = new THREE.Mesh(eyeGeo, darkMat);
    eyeR.position.set(0.14, 0.83, 0.08);
    const eyeL = eyeR.clone();
    eyeL.position.z = -0.08;
    this.driverGroup.add(eyeR, eyeL);

    // Character-Specific Headgear & Hair
    if (driver.headgearType === 'cap') {
      // Rex: Backwards Red Cap + Forehead Goggles
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        suitMat
      );
      dome.position.set(-0.04, 0.83, 0);
      this.driverGroup.add(dome);

      const bill = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.035, 0.22),
        suitMat
      );
      bill.position.set(-0.26, 0.86, 0);
      bill.rotation.z = 0.2;
      this.driverGroup.add(bill);

      const goggles = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.09, 0.34),
        accentMat
      );
      goggles.position.set(0.12, 0.9, 0);
      this.driverGroup.add(goggles);
    } else if (driver.headgearType === 'horned_helmet') {
      // Duke: Steel Helmet + Viking Horns + Thick Braided Beard
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.225, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 })
      );
      helmet.position.set(-0.04, 0.83, 0);
      this.driverGroup.add(helmet);

      const hornGeo = new THREE.ConeGeometry(0.055, 0.24, 8);
      const hornR = new THREE.Mesh(hornGeo, accentMat);
      hornR.position.set(-0.04, 0.98, 0.22);
      hornR.rotation.x = 0.55;
      const hornL = hornR.clone();
      hornL.position.z = -0.22;
      hornL.rotation.x = -0.55;
      this.driverGroup.add(hornR, hornL);

      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        hairMat
      );
      beard.position.set(0.06, 0.7, 0);
      this.driverGroup.add(beard);
    } else if (driver.headgearType === 'visor_helmet') {
      // Maya (Female): High Flowing Ponytail + Neon Racing Visor
      const hairTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        hairMat
      );
      hairTop.position.set(-0.04, 0.83, 0);
      this.driverGroup.add(hairTop);

      const ponytail = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.36, 10),
        hairMat
      );
      ponytail.position.set(-0.28, 0.84, 0);
      ponytail.rotation.z = 1.1;
      this.driverGroup.add(ponytail);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.08, 0.36),
        accentMat
      );
      visor.position.set(0.12, 0.87, 0);
      this.driverGroup.add(visor);
    } else if (driver.headgearType === 'moto_goggles') {
      // Axel: Tall Spiky Mohawk + Cyber-Goggles
      for (let s = 0; s < 4; s++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.065, 0.24, 6),
          new THREE.MeshStandardMaterial({
            color: driver.hairColor,
            emissive: driver.hairColor,
            emissiveIntensity: 0.3,
          })
        );
        spike.position.set(-0.14 + s * 0.08, 1.06, 0);
        spike.rotation.z = -0.2 + s * 0.12;
        this.driverGroup.add(spike);
      }
      const goggles = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.38),
        accentMat
      );
      goggles.position.set(0.12, 0.83, 0);
      this.driverGroup.add(goggles);
    } else if (driver.headgearType === 'desert_goggles') {
      // Zara (Female): Gold Bandana + Twin Braided Pigtails + Goggles
      const bandana = new THREE.Mesh(
        new THREE.CylinderGeometry(0.215, 0.215, 0.09, 14),
        accentMat
      );
      bandana.position.set(-0.04, 0.9, 0);
      this.driverGroup.add(bandana);

      const braidGeo = new THREE.CapsuleGeometry(0.05, 0.26, 4, 8);
      const braidR = new THREE.Mesh(braidGeo, hairMat);
      braidR.position.set(-0.12, 0.68, 0.2);
      braidR.rotation.z = 0.35;
      const braidL = braidR.clone();
      braidL.position.z = -0.2;
      this.driverGroup.add(braidR, braidL);
    } else {
      // Viktor: White Open-Face Pro Rally Helmet + Crimson Visor
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 16, 16),
        new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, clearcoat: 1.0, roughness: 0.12 })
      );
      helmet.position.set(-0.04, 0.82, 0);
      this.driverGroup.add(helmet);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.11, 0.34),
        accentMat
      );
      visor.position.set(0.11, 0.85, 0);
      this.driverGroup.add(visor);
    }
  }

  public renderScene(
    engine: VehiclePhysicsEngine,
    timeSec: number,
    isTurntable = false
  ): void {
    this.syncWorldTheme(engine.world);
    this.syncVehicleModel(engine.spec, engine.driver);

    const s = engine.state;
    const minX = engine.camX - 32;
    const maxX = engine.camX + 42;
    const span = maxX - minX;

    // 1. Update 3D Terrain Ribbon & Cliff vertices around camera window
    const tPos = this.terrainGeo.attributes.position as THREE.BufferAttribute;
    const cPos = this.cliffGeo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i <= this.terrainSegments; i++) {
      const u = i / this.terrainSegments;
      const wx = minX + u * span;
      const wy = engine.terrain.getHeightAt(wx);

      tPos.setXYZ(i * 2 + 0, wx, wy, 2.4);
      tPos.setXYZ(i * 2 + 1, wx, wy, -2.4);

      cPos.setXYZ(i * 2 + 0, wx, wy, 2.4);
      cPos.setXYZ(i * 2 + 1, wx, wy - 20, 3.5);
    }

    tPos.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();
    cPos.needsUpdate = true;
    this.cliffGeo.computeVertexNormals();

    if (this.terrainMat.map) {
      this.terrainMat.map.offset.x = minX * 0.22;
    }
    if (this.cliffMat.map) {
      this.cliffMat.map.offset.x = minX * 0.18;
    }

    // 2. Update Distant 3D Snow-Capped Alpine Mountain Range & Reflective Valley Lake
    const peakStep = 26;
    const firstPeakIdx = Math.floor((engine.camX * 0.35 - 180) / peakStep);
    for (let i = 0; i < 18; i++) {
      const pIdx = firstPeakIdx + i;
      const px = engine.camX * 0.65 + pIdx * peakStep;
      const pz = -54 - (Math.abs(Math.sin(pIdx * 13.7)) * 24);
      const scaleW = 0.85 + (Math.sin(pIdx * 7.3) * 0.5 + 0.5) * 0.65;
      const scaleH = 0.78 + (Math.cos(pIdx * 19.1) * 0.5 + 0.5) * 0.75;

      _dummy.position.set(px, -8, pz);
      _dummy.rotation.set(0, pIdx * 0.9, 0);
      _dummy.scale.set(scaleW, scaleH, scaleW);
      _dummy.updateMatrix();
      this.mountainInstancedMesh.setMatrixAt(i, _dummy.matrix);
      this.snowCapInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mountainInstancedMesh.instanceMatrix.needsUpdate = true;
    this.snowCapInstancedMesh.instanceMatrix.needsUpdate = true;
    this.snowCapInstancedMesh.visible =
      engine.world.id !== 'desert_run' && engine.world.id !== 'volcanic_land';

    // Update Reflective 3D Mountain Lake position & wave ripples
    this.lakeMesh.position.x = engine.camX;
    this.lakeMesh.position.y = engine.camY * 0.25 - 6.2;
    if (this.lakeMat.bumpMap) {
      this.lakeMat.bumpMap.offset.x = timeSec * 0.08 + engine.camX * 0.01;
      this.lakeMat.bumpMap.offset.y = timeSec * 0.05;
    }

    // 3. Update Multi-Tier 3D Pine Trees + 3D Landmarks ("HILL RUSH" Signs & Watchtowers)
    const treeStep = 4.2;
    const firstTreeIdx = Math.floor((minX - 15) / treeStep);
    let signPoolIdx = 0;
    let towerPoolIdx = 0;

    for (let i = 0; i < 85; i++) {
      const tIdx = firstTreeIdx + i;
      const tx = tIdx * treeStep + Math.sin(tIdx * 19.3) * 1.3;
      const ty = engine.terrain.getRawSplineHeightAt(tx) - 0.12;
      const tz = -3.1 - (Math.abs(Math.sin(tIdx * 7.1)) * 11);
      const scale = 0.85 + (Math.sin(tIdx * 31.7) * 0.5 + 0.5) * 0.65;

      // Place 3D Wooden "HILL RUSH" Signboards every 18th slot along the ridge
      if (((tIdx % 18) + 18) % 18 === 0 && signPoolIdx < this.signGroups.length) {
        const sg = this.signGroups[signPoolIdx++];
        sg.position.set(tx, ty, -2.55);
        sg.visible = true;
      }

      // Place 3D Wooden Lookout Watchtowers every 18th slot offset by 9
      if (((tIdx % 18) + 18) % 18 === 9 && towerPoolIdx < this.watchtowerGroups.length) {
        const wg = this.watchtowerGroups[towerPoolIdx];
        const flag = this.watchtowerFlags[towerPoolIdx];
        wg.position.set(tx, ty - 0.2, -4.4);
        wg.visible = true;
        flag.rotation.y = Math.sin(timeSec * 5.5 + tIdx) * 0.28;
        towerPoolIdx++;
      }

      _dummy.position.set(tx, ty, tz);
      _dummy.rotation.set(0, tIdx * 1.1, 0);
      _dummy.scale.set(scale, scale, scale);
      _dummy.updateMatrix();
      this.propTrunksMesh.setMatrixAt(i, _dummy.matrix);
      this.propCanopyBottomMesh.setMatrixAt(i, _dummy.matrix);
      this.propCanopyMidMesh.setMatrixAt(i, _dummy.matrix);
      this.propCanopyTopMesh.setMatrixAt(i, _dummy.matrix);

      _color.set(engine.world.mountainMid).offsetHSL(0, 0, Math.sin(tIdx * 5.3) * 0.08);
      this.propCanopyBottomMesh.setColorAt(i, _color);
      this.propCanopyMidMesh.setColorAt(i, _color);
      this.propCanopyTopMesh.setColorAt(i, _color);
    }

    for (let i = signPoolIdx; i < this.signGroups.length; i++) {
      this.signGroups[i].visible = false;
    }
    for (let i = towerPoolIdx; i < this.watchtowerGroups.length; i++) {
      this.watchtowerGroups[i].visible = false;
    }

    this.propTrunksMesh.instanceMatrix.needsUpdate = true;
    this.propCanopyBottomMesh.instanceMatrix.needsUpdate = true;
    this.propCanopyMidMesh.instanceMatrix.needsUpdate = true;
    this.propCanopyTopMesh.instanceMatrix.needsUpdate = true;
    if (this.propCanopyBottomMesh.instanceColor) {
      this.propCanopyBottomMesh.instanceColor.needsUpdate = true;
    }
    if (this.propCanopyMidMesh.instanceColor) {
      this.propCanopyMidMesh.instanceColor.needsUpdate = true;
    }
    if (this.propCanopyTopMesh.instanceColor) {
      this.propCanopyTopMesh.instanceColor.needsUpdate = true;
    }

    // 4. Update 3D Wooden Suspension Bridges
    let plankIdx = 0;
    let pilingIdx = 0;
    for (let b = 0; b < engine.terrain.bridges.length; b++) {
      const br = engine.terrain.bridges[b];
      if (br.endX < minX - 5 || br.startX > maxX + 5) continue;

      if (pilingIdx + 3 < 16) {
        const posts = [
          [br.startX, br.startY, 2.1],
          [br.startX, br.startY, -2.1],
          [br.endX, br.endY, 2.1],
          [br.endX, br.endY, -2.1],
        ];
        posts.forEach(([px, py, pz]) => {
          _dummy.position.set(px, py - 1.2, pz);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.setScalar(1);
          _dummy.updateMatrix();
          this.bridgePilingInstancedMesh.setMatrixAt(pilingIdx++, _dummy.matrix);
        });
      }

      const numPlanks = 16;
      for (let p = 0; p <= numPlanks && plankIdx < 48; p++) {
        const u = p / numPlanks;
        const px = br.startX + (br.endX - br.startX) * u;
        const py = engine.terrain.getHeightAt(px);
        _dummy.position.set(px, py + 0.06, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.bridgePlanksInstancedMesh.setMatrixAt(plankIdx++, _dummy.matrix);
      }
    }
    for (let i = plankIdx; i < 48; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.bridgePlanksInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = pilingIdx; i < 16; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.bridgePilingInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.bridgePlanksInstancedMesh.instanceMatrix.needsUpdate = true;
    this.bridgePilingInstancedMesh.instanceMatrix.needsUpdate = true;

    // 5. Update 3D Rocks InstancedMesh
    let rockInstanceIdx = 0;
    for (let i = 0; i < engine.terrain.rocks.length && rockInstanceIdx < 45; i++) {
      const r = engine.terrain.rocks[i];
      if (r.x >= minX - 5 && r.x <= maxX + 5) {
        _dummy.position.set(r.x, r.y + r.radius * 0.35, 0);
        _dummy.rotation.set(r.seed * 3, r.seed * 6, 0);
        _dummy.scale.set(r.radius * 1.25, r.radius * 0.85, r.radius * 1.15);
        _dummy.updateMatrix();
        this.rocksInstancedMesh.setMatrixAt(rockInstanceIdx++, _dummy.matrix);
      }
    }
    for (let i = rockInstanceIdx; i < 45; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.rocksInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.rocksInstancedMesh.instanceMatrix.needsUpdate = true;

    // 6. Update Interactive 3D Roadside Props (Crates & Hazard Barrels)
    let crateIdx = 0;
    let barrelIdx = 0;
    for (let i = 0; i < engine.terrain.props.length; i++) {
      const prop = engine.terrain.props[i];
      if (prop.x < minX - 6 || prop.x > maxX + 6 || prop.hitTime > 2.4) continue;

      _dummy.position.set(prop.x, prop.y, prop.zOffset);
      _dummy.rotation.set(
        prop.hit ? prop.angle * 0.7 : 0,
        prop.id * 0.8 + (prop.hit ? prop.angle * 0.5 : 0),
        prop.angle
      );
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();

      if (prop.type === 'barrel' && barrelIdx < 30) {
        this.barrelInstancedMesh.setMatrixAt(barrelIdx++, _dummy.matrix);
      } else if (crateIdx < 30) {
        this.crateInstancedMesh.setMatrixAt(crateIdx++, _dummy.matrix);
      }
    }
    for (let i = crateIdx; i < 30; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.crateInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = barrelIdx; i < 30; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.barrelInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.crateInstancedMesh.instanceMatrix.needsUpdate = true;
    this.barrelInstancedMesh.instanceMatrix.needsUpdate = true;

    // 7. Update 3D Pickups (Coins & Fuel Jerrycans)
    let coinIdx = 0;
    let fuelIdx = 0;
    for (let i = 0; i < engine.terrain.pickups.length; i++) {
      const p = engine.terrain.pickups[i];
      if (p.collected || p.x < minX - 4 || p.x > maxX + 4) continue;
      if (p.type === 'fuel' && fuelIdx < 20) {
        _dummy.position.set(p.x, p.y + Math.sin(timeSec * 3.5 + p.id) * 0.14, 0);
        _dummy.rotation.set(0, Math.sin(timeSec * 2 + p.id) * 0.35, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.fuelInstancedMesh.setMatrixAt(fuelIdx++, _dummy.matrix);
      } else if (coinIdx < 60) {
        _dummy.position.set(p.x, p.y + Math.sin(timeSec * 4 + p.id) * 0.12, 0);
        _dummy.rotation.set(0, timeSec * 3.2 + p.id * 0.5, 0);
        _dummy.scale.setScalar(p.type === 'gem' ? 1.25 : 1.0);
        _dummy.updateMatrix();
        this.coinInstancedMesh.setMatrixAt(coinIdx++, _dummy.matrix);
      }
    }
    for (let i = coinIdx; i < 60; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.coinInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = fuelIdx; i < 20; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.fuelInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.coinInstancedMesh.instanceMatrix.needsUpdate = true;
    this.fuelInstancedMesh.instanceMatrix.needsUpdate = true;

    // 8. Update 3D Instanced Particles (Mud Clods, Dust, Smoke, Sparks)
    let partIdx = 0;
    for (let i = 0; i < engine.particles.length && partIdx < 140; i++) {
      const pt = engine.particles[i];
      if (!pt.active) continue;
      const sc = Math.max(0.2, (pt.size / 6) * pt.alpha);
      _dummy.position.set(pt.x, pt.y, (i % 5 - 2) * 0.22);
      _dummy.rotation.set(timeSec * 4 + i, timeSec * 3 + i, 0);
      _dummy.scale.setScalar(sc);
      _dummy.updateMatrix();
      this.particleInstancedMesh.setMatrixAt(partIdx, _dummy.matrix);
      _color.set(pt.type === 'smoke' ? '#94a3b8' : pt.color);
      this.particleInstancedMesh.setColorAt(partIdx, _color);
      partIdx++;
    }
    for (let i = partIdx; i < 140; i++) {
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.particleInstancedMesh.instanceColor) {
      this.particleInstancedMesh.instanceColor.needsUpdate = true;
    }

    // 9. Update Composite Vehicle Group, 3D Cartoon Driver, Detachable Parts, Wheels & Shocks
    const turntableYaw = isTurntable ? Math.sin(timeSec * 0.65) * 0.36 : 0;
    this.chassisGroup.position.set(s.x, s.y, 0);
    this.chassisGroup.rotation.set(0, turntableYaw, s.angle);

    // Update 3D Cartoon Driver (Spring-Seat Bounce/Lean in Cockpit OR Flying Ragdoll when Ejected)
    if (s.driverEjected) {
      this.driverGroup.position.set(s.driverRagdollX, s.driverRagdollY, 0);
      this.driverGroup.rotation.set(
        Math.sin(timeSec * 12) * 0.4,
        turntableYaw,
        s.driverRagdollAngle
      );
    } else {
      const cosA = Math.cos(s.angle);
      const sinA = Math.sin(s.angle);
      const seatBounceX = -sinA * s.driverOffsetY;
      const seatBounceY = cosA * s.driverOffsetY;
      this.driverGroup.position.set(s.x + seatBounceX, s.y + seatBounceY, 0);
      this.driverGroup.rotation.set(0, turntableYaw, s.angle + s.driverLeanAngle);
    }

    // Update Detachable 3D Front Bumper
    if (s.frontBumper.detached) {
      this.frontBumperGroup.position.set(s.frontBumper.x, s.frontBumper.y, 0);
      this.frontBumperGroup.rotation.set(timeSec * 5, timeSec * 3, s.frontBumper.angle);
    } else {
      this.frontBumperGroup.position.set(s.x, s.y, 0);
      this.frontBumperGroup.rotation.set(0, turntableYaw, s.angle);
    }

    // Update Detachable 3D Roof Rack / Floodlights / Wing
    if (s.roofAccessory.detached) {
      this.roofAccessoryGroup.position.set(s.roofAccessory.x, s.roofAccessory.y, 0);
      this.roofAccessoryGroup.rotation.set(timeSec * 4, timeSec * 6, s.roofAccessory.angle);
    } else {
      this.roofAccessoryGroup.position.set(s.x, s.y, 0);
      this.roofAccessoryGroup.rotation.set(0, turntableYaw, s.angle);
    }

    this.frontRightWheelGroup.position.x = s.frontWheel.worldX;
    this.frontRightWheelGroup.position.y = s.frontWheel.worldY;
    this.frontRightWheelGroup.rotation.z = -s.frontWheel.angle;

    this.frontLeftWheelGroup.position.x = s.frontWheel.worldX;
    this.frontLeftWheelGroup.position.y = s.frontWheel.worldY;
    this.frontLeftWheelGroup.rotation.z = -s.frontWheel.angle;

    this.rearRightWheelGroup.position.x = s.rearWheel.worldX;
    this.rearRightWheelGroup.position.y = s.rearWheel.worldY;
    this.rearRightWheelGroup.rotation.z = -s.rearWheel.angle;

    this.rearLeftWheelGroup.position.x = s.rearWheel.worldX;
    this.rearLeftWheelGroup.position.y = s.rearWheel.worldY;
    this.rearLeftWheelGroup.rotation.z = -s.rearWheel.angle;

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);
    const fMountX = s.x + s.frontWheel.offsetX * cosA;
    const fMountY = s.y + s.frontWheel.offsetX * sinA;
    this.frontCoilGroup.position.set(
      (fMountX + s.frontWheel.worldX) * 0.5,
      (fMountY + s.frontWheel.worldY) * 0.5,
      0
    );
    const fLen = Math.hypot(
      s.frontWheel.worldX - fMountX,
      s.frontWheel.worldY - fMountY
    );
    this.frontCoilGroup.scale.set(1, Math.max(0.25, fLen), 1);
    this.frontCoilGroup.rotation.z =
      Math.atan2(s.frontWheel.worldY - fMountY, s.frontWheel.worldX - fMountX) -
      Math.PI * 0.5;

    const rMountX = s.x + s.rearWheel.offsetX * cosA;
    const rMountY = s.y + s.rearWheel.offsetX * sinA;
    this.rearCoilGroup.position.set(
      (rMountX + s.rearWheel.worldX) * 0.5,
      (rMountY + s.rearWheel.worldY) * 0.5,
      0
    );
    const rLen = Math.hypot(
      s.rearWheel.worldX - rMountX,
      s.rearWheel.worldY - rMountY
    );
    this.rearCoilGroup.scale.set(1, Math.max(0.25, rLen), 1);
    this.rearCoilGroup.rotation.z =
      Math.atan2(s.rearWheel.worldY - rMountY, s.rearWheel.worldX - rMountX) -
      Math.PI * 0.5;

    // Update Active Vehicle Headlight / Roof Floodlight SpotLight
    this.vehicleSpotLight.position.set(
      s.x + cosA * 1.4,
      s.y + sinA * 1.4 + 0.55,
      0
    );
    this.vehicleSpotLight.target.position.set(
      s.x + cosA * 14,
      s.y + sinA * 14 - 2.2,
      0
    );

    // Update contact shadow beneath vehicle
    const surf = engine.terrain.getSurfaceInfo(s.x);
    const heightAboveGround = Math.max(0, s.y - surf.height - 0.8);
    this.contactShadowMesh.position.set(s.x, surf.height + 0.05, 0);
    this.contactShadowMesh.rotation.z = surf.slopeAngle;
    const shadowMat = this.contactShadowMesh.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = Math.max(0.08, 0.58 - heightAboveGround * 0.08);

    // Move shadow-casting directional light with vehicle
    this.keyLight.position.set(engine.camX + 12, engine.camY + 26, 18);
    this.keyLight.target.position.set(engine.camX, engine.camY - 2, 0);
    this.rimLight.position.set(engine.camX - 12, engine.camY + 14, -14);
    this.rimLight.target.position.set(engine.camX, engine.camY, 0);

    // 10. Dynamic Speed-Reactive Camera FOV & Framing
    const targetFov = isTurntable
      ? 40
      : Math.min(50, 42 + Math.abs(s.vx) * 0.35);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * 0.12;
      this.camera.updateProjectionMatrix();
    }

    const shakeX = (Math.random() - 0.5) * engine.camShake * 0.55;
    const shakeY = (Math.random() - 0.5) * engine.camShake * 0.55;

    if (isTurntable) {
      this.camera.position.set(s.x + 1.8, s.y + 1.35, 9.8);
      this.camera.lookAt(s.x + 0.6, s.y + 0.35, 0);
    } else {
      const distZ = 17.2 / Math.max(0.58, engine.camZoom);
      this.camera.position.set(
        engine.camX + shakeX,
        engine.camY + 1.85 + shakeY,
        distZ
      );
      this.camera.lookAt(
        engine.camX + shakeX * 0.5,
        engine.camY + 0.25 + shakeY * 0.5,
        0
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.terrainGeo.dispose();
    this.terrainMat.dispose();
    this.cliffGeo.dispose();
    this.cliffMat.dispose();
    this.renderer.dispose();
  }
}
