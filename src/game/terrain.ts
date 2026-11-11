import { BridgeSpan, PickupItem, RoadsideProp, TerrainRock, WorldSpec } from './types';

const SEGMENT_STEP = 5.0; // meters between spline control vertices

function hash1D(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export class TerrainGenerator {
  private world: WorldSpec;
  private seed: number;
  private controlHeights: Map<number, number> = new Map();
  public pickups: PickupItem[] = [];
  public rocks: TerrainRock[] = [];
  public bridges: BridgeSpan[] = [];
  public props: RoadsideProp[] = [];
  private generatedUpToIndex = -10;
  private nextPickupId = 1;
  private nextPropId = 1;
  private nextFuelMeter = 95;

  constructor(world: WorldSpec, seed = 1337) {
    this.world = world;
    this.seed = seed;
    this.reset(world, seed);
  }

  public reset(world: WorldSpec, seed = 1337): void {
    this.world = world;
    this.seed = seed;
    this.controlHeights.clear();
    this.pickups = [];
    this.rocks = [];
    this.bridges = [];
    this.props = [];
    this.generatedUpToIndex = -10;
    this.nextPickupId = 1;
    this.nextPropId = 1;
    this.nextFuelMeter = 90;

    for (let i = -10; i <= 6; i++) {
      this.controlHeights.set(i, 0);
    }
    this.generatedUpToIndex = 6;
    this.ensureGeneratedUpTo(260);
  }

  private getControlPoint(idx: number): number {
    const existing = this.controlHeights.get(idx);
    if (existing !== undefined) return existing;

    if (idx <= 5) {
      this.controlHeights.set(idx, 0);
      return 0;
    }

    const x = idx * SEGMENT_STEP;
    const difficulty = Math.min(2.4, 1.0 + x / 1200);
    const amp = this.world.hillAmplitude * difficulty;
    const freq = this.world.hillFrequency;

    // Multi-octave smooth organic hills
    const wave1 = Math.sin(x * freq + this.seed * 0.1) * amp;
    const wave2 = Math.cos(x * freq * 0.47 - this.seed * 0.23) * (amp * 0.55);
    const wave3 = Math.sin(x * freq * 1.9 + idx * 0.35) * (amp * 0.22);
    const micro = (hash1D(idx + this.seed) - 0.5) * this.world.roughness * 3.2 * difficulty;

    // Gradual ramp-in from flat starting pad
    const ramp = Math.min(1, Math.max(0, (idx - 5) / 8));
    const h = (wave1 + wave2 + wave3 + micro) * ramp;

    this.controlHeights.set(idx, h);
    return h;
  }

  public ensureGeneratedUpTo(maxX: number): void {
    const targetIdx = Math.ceil(maxX / SEGMENT_STEP) + 12;
    while (this.generatedUpToIndex < targetIdx) {
      this.generatedUpToIndex++;
      const idx = this.generatedUpToIndex;
      const h = this.getControlPoint(idx);
      const x = idx * SEGMENT_STEP;

      if (x < 35) continue;

      // Occasional suspension bridge across a valley
      const lastBridgeEnd =
        this.bridges.length > 0 ? this.bridges[this.bridges.length - 1].endX : -999;
      if (
        x > lastBridgeEnd + 95 &&
        hash1D(idx * 3.1 + this.seed) < this.world.bridgeChance * 0.16
      ) {
        const spanIndices = 5;
        const startX = x;
        const endX = (idx + spanIndices) * SEGMENT_STEP;
        const startY = h;
        // Depress valley points under bridge and set other end
        for (let b = 1; b < spanIndices; b++) {
          this.controlHeights.set(idx + b, startY - 5.5 - b * 0.4);
        }
        const endY = startY + (hash1D(idx * 9.7) - 0.5) * 2.2;
        this.controlHeights.set(idx + spanIndices, endY);
        this.bridges.push({
          startX,
          endX,
          startY,
          endY,
          sag: 0.65,
        });
      }

      // Spawn fuel canisters at guaranteed intervals so runs are fair and strategic
      if (x >= this.nextFuelMeter) {
        const groundY = this.getHeightAt(x);
        this.pickups.push({
          id: this.nextPickupId++,
          x,
          y: groundY + 1.15,
          type: 'fuel',
          value: 100,
          collected: false,
          collectAnim: 0,
        });
        this.nextFuelMeter += 105 + Math.min(55, x * 0.025);
        continue;
      }

      // Spawn coin arcs every ~45m
      if (idx % 9 === 0 && hash1D(idx * 7.13 + this.seed) > 0.25) {
        const count = 5 + Math.floor(hash1D(idx * 2.3) * 4);
        for (let c = 0; c < count; c++) {
          const cx = x + c * 2.4;
          const arcBoost = Math.sin((c / (count - 1)) * Math.PI) * 1.45;
          const cy = this.getHeightAt(cx) + 1.05 + arcBoost;
          const isGem = c === Math.floor(count / 2) && hash1D(idx * 19.1) > 0.78;
          this.pickups.push({
            id: this.nextPickupId++,
            x: cx,
            y: cy,
            type: isGem ? 'gem' : 'coin',
            value: isGem ? 50 : Math.round(10 * this.world.coinMultiplier),
            collected: false,
            collectAnim: 0,
          });
        }
      }

      // Spawn surface rocks/bumps outside bridges
      const onBridge = this.bridges.some((br) => x >= br.startX - 4 && x <= br.endX + 4);
      if (!onBridge && idx % 7 === 0 && hash1D(idx * 11.7 + this.seed) < this.world.rockChance) {
        const rRadius = 0.35 + hash1D(idx * 5.9) * 0.38;
        this.rocks.push({
          x,
          y: this.getRawSplineHeightAt(x),
          radius: rRadius,
          seed: hash1D(idx * 13.3),
        });
      }

      // Spawn interactive roadside props (crates, hazard barrels, trail markers)
      if (!onBridge && idx % 6 === 0 && hash1D(idx * 23.9 + this.seed) > 0.42) {
        const propRoll = hash1D(idx * 41.3 + this.seed);
        const propType: RoadsideProp['type'] =
          propRoll < 0.48 ? 'crate' : propRoll < 0.85 ? 'barrel' : 'marker';
        const px = x + (hash1D(idx * 17.7) - 0.5) * 1.8;
        const py = this.getHeightAt(px) + 0.42;
        this.props.push({
          id: this.nextPropId++,
          x: px,
          y: py,
          zOffset: (hash1D(idx * 29.1) - 0.5) * 0.85,
          vx: 0,
          vy: 0,
          angle: 0,
          omega: 0,
          type: propType,
          hit: false,
          hitTime: 0,
        });
      }
    }
  }

  public getRawSplineHeightAt(x: number): number {
    const fIdx = x / SEGMENT_STEP;
    const i1 = Math.floor(fIdx);
    const t = fIdx - i1;

    const p0 = this.getControlPoint(i1 - 1);
    const p1 = this.getControlPoint(i1);
    const p2 = this.getControlPoint(i1 + 1);
    const p3 = this.getControlPoint(i1 + 2);

    return catmullRom(p0, p1, p2, p3, t);
  }

  public getBridgeAt(x: number): BridgeSpan | null {
    for (let i = 0; i < this.bridges.length; i++) {
      const b = this.bridges[i];
      if (x >= b.startX && x <= b.endX) {
        return b;
      }
    }
    return null;
  }

  public getHeightAt(x: number): number {
    // Check if on suspension bridge deck
    const bridge = this.getBridgeAt(x);
    if (bridge) {
      const u = (x - bridge.startX) / (bridge.endX - bridge.startX);
      const linearY = bridge.startY + (bridge.endY - bridge.startY) * u;
      const catenarySag = Math.sin(u * Math.PI) * bridge.sag;
      return linearY - catenarySag;
    }

    let h = this.getRawSplineHeightAt(x);

    // Add smooth rock bump contribution if near a rock obstacle
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      const dx = x - r.x;
      if (Math.abs(dx) < r.radius * 1.35) {
        const norm = dx / (r.radius * 1.35);
        const dome = Math.cos(norm * Math.PI * 0.5);
        h += dome * dome * r.radius * 0.72;
      }
    }

    return h;
  }

  public getSurfaceInfo(x: number): {
    height: number;
    nx: number;
    ny: number;
    slopeAngle: number;
    isBridge: boolean;
  } {
    const eps = 0.12;
    const hL = this.getHeightAt(x - eps);
    const hR = this.getHeightAt(x + eps);
    const hC = (hL + hR) * 0.5;
    const dy = hR - hL;
    const dx = eps * 2;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const slopeAngle = Math.atan2(dy, dx);
    const isBridge = this.getBridgeAt(x) !== null;

    return {
      height: hC,
      nx,
      ny,
      slopeAngle,
      isBridge,
    };
  }
}
