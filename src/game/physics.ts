import {
  DeathReason,
  DriverSpec,
  FloatingNotification,
  Particle,
  PickupItem,
  RoadsideProp,
  VehiclePhysicsState,
  VehicleSpec,
  WheelPhysicsState,
  WorldSpec,
} from './types';
import { DRIVERS } from './data';
import { TerrainGenerator } from './terrain';

const FIXED_DT = 1 / 120; // 120Hz sub-stepping for rock-solid spring-damper stability
const PARTICLE_POOL_SIZE = 280;

export interface PhysicsEvents {
  onCoinCollected: (amount: number, isGem: boolean, worldX: number, worldY: number) => void;
  onFuelCollected: (worldX: number, worldY: number) => void;
  onStuntBonus: (title: string, subtext: string, bonusCoins: number, isFlip: boolean) => void;
  onStuntCombo?: (multiplier: number, label: string) => void;
  onPropSmash?: (type: RoadsideProp['type']) => void;
  onBottomOutSparks?: () => void;
  onBackfirePop?: () => void;
  onPartDetach?: (partName: string) => void;
  onDriverEject?: () => void;
  onLandingImpact: (intensity: number) => void;
  onGameOver: (reason: DeathReason) => void;
}

export class VehiclePhysicsEngine {
  public state: VehiclePhysicsState;
  public spec: VehicleSpec;
  public driver: DriverSpec;
  public world: WorldSpec;
  public terrain: TerrainGenerator;
  public particles: Particle[] = [];
  public notifications: FloatingNotification[] = [];
  private nextNotifId = 1;
  private accumulator = 0;
  private events: PhysicsEvents;

  // Run statistics
  public runCoins = 0;
  public stuntBonusCoins = 0;
  public flipsCount = 0;
  public totalAirTime = 0;
  public wheelieCount = 0;
  public fuelPickupsCount = 0;
  public maxDistance = 0;

  // Stunt Combo HUD state
  public stuntComboMultiplier = 0;
  public stuntComboLabel = '';
  public stuntComboTimer = 0;
  private currentJumpFlipsTriggered = 0;
  private consecutiveFlipChain = 0;
  private flipChainDecayTimer = 0;

  // Cooldowns & timers
  private bottomOutCooldown = 0;
  private gameOverDelayTimer = 0;
  private gameOverReported = false;
  private prevThrottle = 0;
  private dirtEmitAccumulatorRear = 0;
  private dirtEmitAccumulatorFront = 0;

  // Camera state
  public camX = 0;
  public camY = 2;
  public camZoom = 1.0;
  public camShake = 0;
  public hitstopTimer = 0;

  constructor(
    spec: VehicleSpec,
    world: WorldSpec,
    terrain: TerrainGenerator,
    events: PhysicsEvents,
    driver: DriverSpec = DRIVERS.rex
  ) {
    this.spec = spec;
    this.driver = driver;
    this.world = world;
    this.terrain = terrain;
    this.events = events;

    // Pre-allocate object pool for particles
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 1,
        type: 'dust',
      });
    }

    this.state = this.createInitialState(spec);
    this.settleOnGround();
  }

  private createInitialState(spec: VehicleSpec): VehiclePhysicsState {
    const startX = 6;
    const groundY = this.terrain.getHeightAt(startX);
    const restLen = spec.suspensionTravel;
    const eqComp = Math.min(
      restLen * 0.55,
      (spec.mass * 9.81 * 0.5) / Math.max(10000, spec.springStiffness)
    );
    const startY =
      groundY + spec.rearWheelRadius + (restLen - eqComp) + spec.cgHeight * 0.25;

    const rearWheel: WheelPhysicsState = {
      offsetX: -spec.wheelbase * 0.5,
      restLength: restLen,
      radius: spec.rearWheelRadius,
      compression: eqComp,
      compressionVel: 0,
      worldX: startX - spec.wheelbase * 0.5,
      worldY: groundY + spec.rearWheelRadius,
      angle: 0,
      omega: 0,
      grounded: true,
      groundNormalX: 0,
      groundNormalY: 1,
      slipRatio: 0,
      suspensionForce: spec.mass * 9.81 * 0.5,
    };

    const frontWheel: WheelPhysicsState = {
      offsetX: spec.wheelbase * 0.5,
      restLength: restLen,
      radius: spec.frontWheelRadius,
      compression: eqComp,
      compressionVel: 0,
      worldX: startX + spec.wheelbase * 0.5,
      worldY: groundY + spec.frontWheelRadius,
      angle: 0,
      omega: 0,
      grounded: true,
      groundNormalX: 0,
      groundNormalY: 1,
      slipRatio: 0,
      suspensionForce: spec.mass * 9.81 * 0.5,
    };

    return {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      frontWheel,
      rearWheel,
      fuel: 100,
      maxFuel: 100,
      rpm: 0.1,
      throttle: 0,
      brake: 0,
      airTime: 0,
      cumulativeAirAngle: 0,
      wheelieTime: 0,
      isDead: false,
      deathReason: 'NONE',
      lastLandingImpact: 0,
      driverOffsetY: 0,
      driverVelY: 0,
      driverLeanAngle: 0,
      driverLeanVel: 0,
      driverStrain: 0,
      driverEjected: false,
      driverRagdollX: startX,
      driverRagdollY: startY + 0.8,
      driverRagdollVx: 0,
      driverRagdollVy: 0,
      driverRagdollAngle: 0,
      driverRagdollOmega: 0,
      turboBoost: 0,
      engineTemp: 20,
      isOverheated: false,
      backfireTimer: 0,
      frontBumper: {
        id: 'front_bumper',
        detached: false,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        angle: 0,
        omega: 0,
      },
      roofAccessory: {
        id: 'roof_accessory',
        detached: false,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        angle: 0,
        omega: 0,
      },
    };
  }

  private settleOnGround(): void {
    for (let i = 0; i < 45; i++) {
      this.stepPhysicsSubstep(FIXED_DT, 0);
    }
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.omega = 0;
    this.state.airTime = 0;
    this.state.cumulativeAirAngle = 0;
    this.state.driverOffsetY = 0;
    this.state.driverVelY = 0;
    this.state.driverLeanAngle = 0;
    this.state.driverLeanVel = 0;
    this.state.driverStrain = 0;
    this.camX = this.state.x + 4;
    this.camY = this.state.y + 1.2;
  }

  public reset(spec: VehicleSpec, world: WorldSpec, driver: DriverSpec = this.driver): void {
    this.spec = spec;
    this.driver = driver;
    this.world = world;
    this.terrain.reset(world, Math.floor(Math.random() * 90000) + 1000);
    this.state = this.createInitialState(spec);
    this.settleOnGround();
    this.accumulator = 0;
    this.runCoins = 0;
    this.stuntBonusCoins = 0;
    this.flipsCount = 0;
    this.totalAirTime = 0;
    this.wheelieCount = 0;
    this.fuelPickupsCount = 0;
    this.maxDistance = 0;
    this.stuntComboMultiplier = 0;
    this.stuntComboLabel = '';
    this.stuntComboTimer = 0;
    this.currentJumpFlipsTriggered = 0;
    this.consecutiveFlipChain = 0;
    this.flipChainDecayTimer = 0;
    this.bottomOutCooldown = 0;
    this.gameOverDelayTimer = 0;
    this.gameOverReported = false;
    this.prevThrottle = 0;
    this.dirtEmitAccumulatorRear = 0;
    this.dirtEmitAccumulatorFront = 0;
    this.camX = this.state.x + 4;
    this.camY = this.state.y + 1.2;
    this.camZoom = 1.0;
    this.camShake = 0;
    this.hitstopTimer = 0;
    this.notifications = [];
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
  }

  public addNotification(text: string, subtext: string | undefined, color: string): void {
    this.notifications.push({
      id: this.nextNotifId++,
      text,
      subtext,
      x: this.state.x,
      y: this.state.y + 2.5,
      color,
      life: 0,
      maxLife: 1.65,
    });
  }

  public spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife: number,
    type: Particle['type']
  ): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.alpha = 1;
        p.life = 0;
        p.maxLife = maxLife;
        p.type = type;
        return;
      }
    }
  }

  private triggerPhysicsBounceBack(
    reasonLabel: string,
    impactIntensity: number,
    targetSlopeAngle: number
  ): void {
    const s = this.state;
    // Never eject driver or trigger Game Over — apply real elastic physics bounce-back!
    s.driverEjected = false;
    s.isDead = false;

    const clampedIntensity = Math.max(0.4, Math.min(1.5, impactIntensity));

    // 1. Elastic vertical rebound off suspension / roll-cage / tires
    const reboundVy = Math.max(4.8, Math.min(10.5, Math.abs(s.vy) * 0.62 + clampedIntensity * 4.2));
    s.vy = Math.max(s.vy, reboundVy);

    // 2. Self-righting angular bounce impulse back toward terrain slope angle
    const normalizedAngle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));
    const angleError = targetSlopeAngle - normalizedAngle;
    if (Math.abs(angleError) > 0.35) {
      s.omega = Math.max(-7.5, Math.min(7.5, s.omega * -0.45 + Math.sign(angleError) * (3.8 + clampedIntensity * 2.2)));
    } else {
      s.omega *= -0.5;
    }

    // 3. Elastic cartoon driver seat-spring bounce (bounces up in cockpit and springs back onto seat)
    s.driverVelY = Math.max(s.driverVelY, 3.4 + clampedIntensity * 2.4);
    s.driverOffsetY = Math.min(0.52, Math.max(s.driverOffsetY, 0.16));
    s.driverLeanVel += (Math.random() > 0.5 ? 1 : -1) * (2.5 + clampedIntensity * 1.8);
    s.driverStrain = Math.min(85, s.driverStrain + clampedIntensity * 22);

    this.camShake = Math.min(1.0, 0.45 + clampedIntensity * 0.4);
    this.addNotification('PHYSICS BOUNCE BACK!', reasonLabel, '#38BDF8');
    this.events.onLandingImpact(Math.min(1, clampedIntensity));
  }

  private detachNextVehiclePart(): void {
    const s = this.state;
    if (!s.frontBumper.detached) {
      s.frontBumper.detached = true;
      s.frontBumper.x = s.x + Math.cos(s.angle) * this.spec.wheelbase * 0.58;
      s.frontBumper.y = s.y + Math.sin(s.angle) * this.spec.wheelbase * 0.58 + 0.2;
      s.frontBumper.vx = s.vx * 1.15 + 4.5;
      s.frontBumper.vy = 6.2 + Math.random() * 3.0;
      s.frontBumper.angle = s.angle;
      s.frontBumper.omega = -11.0;
      this.addNotification('BUMPER SMASHED!', 'HEAVY BOUNCE IMPACT', '#F97316');
      this.events.onPartDetach?.('Front Bumper');
      return;
    }
    if (!s.roofAccessory.detached) {
      s.roofAccessory.detached = true;
      s.roofAccessory.x = s.x;
      s.roofAccessory.y = s.y + 0.85;
      s.roofAccessory.vx = s.vx * 0.9 - 2.5;
      s.roofAccessory.vy = 7.5 + Math.random() * 2.5;
      s.roofAccessory.angle = s.angle;
      s.roofAccessory.omega = 9.5;
      this.addNotification('ROOF RACK DETACHED!', 'CRITICAL CHASSIS HIT', '#F97316');
      this.events.onPartDetach?.('Roof Rack');
    }
  }

  public stepFrame(
    rawDt: number,
    inputs: { throttle: boolean; brake: boolean; tiltInput: number },
    zoomAssist: boolean
  ): void {
    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt, zoomAssist);
      return;
    }

    const rawThrottle = inputs.throttle && this.state.fuel > 0 && !this.state.isDead ? 1 : 0;

    // Detect throttle release after high turbo boost to pop exhaust backfire flames!
    if (this.prevThrottle > 0.5 && rawThrottle === 0 && this.state.turboBoost > 0.42 && !this.state.isDead) {
      this.state.backfireTimer = 0.26;
      this.events.onBackfirePop?.();
    }
    this.prevThrottle = rawThrottle;

    this.state.throttle = rawThrottle;
    this.state.brake = inputs.brake && !this.state.isDead ? 1 : 0;

    this.terrain.ensureGeneratedUpTo(this.state.x + 140);

    this.accumulator += dt;
    let subSteps = 0;
    while (this.accumulator >= FIXED_DT && subSteps < 8) {
      this.stepPhysicsSubstep(FIXED_DT, inputs.tiltInput);
      this.accumulator -= FIXED_DT;
      subSteps++;
    }

    // Handle delayed Game Over after driver ragdoll flight
    if (this.state.isDead && !this.gameOverReported) {
      if (this.gameOverDelayTimer > 0) {
        this.gameOverDelayTimer -= dt;
      } else {
        this.gameOverReported = true;
        this.events.onGameOver(this.state.deathReason);
      }
    }

    this.updateDetachablePartsAndRagdoll(dt);
    this.updatePickups(dt);
    this.updateRoadsideProps(dt);
    this.updateParticles(dt);
    this.updateNotifications(dt);
    this.updateCamera(dt, zoomAssist);
  }

  private updateDetachablePartsAndRagdoll(dt: number): void {
    const s = this.state;

    // Update flying detached front bumper & roof accessory
    const parts = [s.frontBumper, s.roofAccessory];
    for (let i = 0; i < parts.length; i++) {
      const pt = parts[i];
      if (!pt.detached) continue;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy -= this.world.gravity * 1.35 * dt;
      pt.angle += pt.omega * dt;
      const gY = this.terrain.getHeightAt(pt.x);
      if (pt.y < gY + 0.22) {
        pt.y = gY + 0.22;
        pt.vy = Math.abs(pt.vy) * 0.42;
        pt.vx *= 0.78;
        pt.omega *= 0.75;
      }
    }

    // Update flying ejected driver ragdoll with ground bounce
    if (s.driverEjected) {
      s.driverRagdollX += s.driverRagdollVx * dt;
      s.driverRagdollY += s.driverRagdollVy * dt;
      s.driverRagdollVy -= this.world.gravity * 1.25 * dt;
      s.driverRagdollAngle += s.driverRagdollOmega * dt;

      const ragGroundY = this.terrain.getHeightAt(s.driverRagdollX);
      if (s.driverRagdollY < ragGroundY + 0.45) {
        s.driverRagdollY = ragGroundY + 0.45;
        if (Math.abs(s.driverRagdollVy) > 2.2) {
          s.driverRagdollVy = Math.abs(s.driverRagdollVy) * 0.48;
          s.driverRagdollVx *= 0.75;
          s.driverRagdollOmega *= 0.8;
          // Spawn dust puff where driver ragdoll bounces
          for (let k = 0; k < 5; k++) {
            this.spawnParticle(
              s.driverRagdollX,
              ragGroundY + 0.2,
              (Math.random() - 0.5) * 4,
              Math.random() * 3 + 1,
              4.5,
              this.world.terrainSub,
              0.4,
              'dust'
            );
          }
        } else {
          s.driverRagdollVy = 0;
          s.driverRagdollVx *= 0.88;
          s.driverRagdollOmega *= 0.82;
        }
      }
    }
  }

  private stepPhysicsSubstep(dt: number, tiltInput: number): void {
    const s = this.state;
    const spec = this.spec;
    const world = this.world;

    if (this.bottomOutCooldown > 0) {
      this.bottomOutCooldown = Math.max(0, this.bottomOutCooldown - dt);
    }
    if (s.backfireTimer > 0) {
      s.backfireTimer = Math.max(0, s.backfireTimer - dt);
    }

    if (s.isDead) {
      s.vx *= 0.97;
      s.vy -= world.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const gY = this.terrain.getHeightAt(s.x);
      if (s.y < gY + 0.72) {
        s.y = gY + 0.72;
        s.vy = Math.abs(s.vy) * 0.32;
      }
      s.omega *= 0.92;
      s.angle += s.omega * dt;
      return;
    }

    const prevVx = s.vx;
    const prevVy = s.vy;

    // 1. Engine Turbo Boost & Temperature / Overheat Simulation
    const coolingBonus = 1 + this.driver.turboCoolingBonus;
    if (s.throttle > 0 && !s.isOverheated) {
      s.turboBoost = Math.min(1.0, s.turboBoost + dt * 0.52 * coolingBonus);
      const heatRate = s.rpm > 0.78 ? 11.5 / coolingBonus : 4.2 / coolingBonus;
      s.engineTemp = Math.min(100, s.engineTemp + heatRate * dt);
      if (s.engineTemp >= 100) {
        s.isOverheated = true;
        s.turboBoost = 0;
        s.backfireTimer = 0.35;
        this.addNotification('ENGINE OVERHEATED!', 'FEATHER THROTTLE TO COOL', '#EF4444');
        this.events.onBackfirePop?.();
      }
    } else {
      s.turboBoost = Math.max(0, s.turboBoost - dt * 1.4);
      const coolRate = (s.isOverheated ? 19.5 : 14.0) * coolingBonus;
      s.engineTemp = Math.max(20, s.engineTemp - coolRate * dt);
      if (s.isOverheated && s.engineTemp <= 64) {
        s.isOverheated = false;
      }
    }

    // 2. Fuel consumption
    if (s.fuel > 0) {
      const burnRate = (0.42 + s.throttle * 1.18 + s.brake * 0.45) * spec.fuelConsumptionRate;
      s.fuel = Math.max(0, s.fuel - (burnRate / spec.fuelCapacity) * 100 * dt);
    }

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);

    // Moment of inertia of vehicle chassis
    const inertia = spec.mass * (spec.wheelbase * spec.wheelbase * 0.3 + 0.42);

    let totalFx = 0;
    let totalFy = -spec.mass * world.gravity;
    let totalTorque = 0;

    // Aerodynamic drag
    const speedSq = s.vx * s.vx + s.vy * s.vy;
    const speed = Math.sqrt(speedSq);
    if (speed > 0.01) {
      const dragMag = 0.38 * speedSq;
      totalFx -= (s.vx / speed) * dragMag;
      totalFy -= (s.vy / speed) * dragMag;
    }

    const wasAirborne = !s.frontWheel.grounded && !s.rearWheel.grounded;
    const prevAirTime = s.airTime;
    const prevAirAngle = s.cumulativeAirAngle;

    // 3. Solve both wheels with True Asymmetric Spring-Damper Rebound & Tire Bounce Restitution
    const solveWheel = (w: WheelPhysicsState, isRear: boolean) => {
      const wasWheelGrounded = w.grounded;
      const mountX = s.x + w.offsetX * cosA + spec.cgHeight * 0.25 * sinA;
      const mountY = s.y + w.offsetX * sinA - spec.cgHeight * 0.25 * cosA;

      const surf = this.terrain.getSurfaceInfo(mountX);
      const maxReach = w.restLength + w.radius;
      const verticalDist = mountY - surf.height;

      if (verticalDist < maxReach) {
        const newCompression = Math.max(
          0,
          Math.min(w.restLength * 1.4, maxReach - verticalDist)
        );
        const compVel = (newCompression - w.compression) / dt;
        w.compression = newCompression;
        w.compressionVel = compVel;
        w.grounded = true;
        w.groundNormalX = surf.nx;
        w.groundNormalY = surf.ny;
        w.worldX = mountX;
        w.worldY = surf.height + w.radius;

        // Asymmetric Spring-Damper Law:
        // Compression uses full damping to absorb impact, while Rebound (compVel < 0)
        // uses lighter damping (0.36x) so the spring genuinely rebounds and bounces the car!
        const effectiveDamping =
          compVel >= 0 ? spec.dampingCoeff * 0.72 : spec.dampingCoeff * 0.32;
        const springForce = spec.springStiffness * w.compression * 1.12;
        const damperForce = effectiveDamping * compVel;

        // Tire Sidewall Bounce Restitution when slamming into ground or steep bumps
        let tireBounceForce = 0;
        if (!wasWheelGrounded && s.vy < -2.2) {
          tireBounceForce = Math.min(
            spec.mass * world.gravity * 2.2,
            Math.abs(s.vy) * spec.mass * 2.1
          );
        } else if (compVel > 2.2) {
          // Hitting a sudden steep transition or rock bump causes a lively upward kick
          tireBounceForce = compVel * spec.mass * 0.95;
        }

        // Check Suspension Bottom-Out (>92% compression at high compression velocity)
        if (newCompression >= w.restLength * 0.92 && compVel > 2.0) {
          tireBounceForce += spec.mass * world.gravity * 1.65;
          if (this.bottomOutCooldown <= 0) {
            this.bottomOutCooldown = 0.28;
            this.camShake = Math.max(this.camShake, 0.55);
            this.events.onBottomOutSparks?.();
            for (let sp = 0; sp < 8; sp++) {
              this.spawnParticle(
                w.worldX + (Math.random() - 0.5) * 0.8,
                w.worldY - w.radius * 0.5,
                -s.vx * 0.3 + (Math.random() - 0.5) * 7,
                Math.random() * 5 + 1.5,
                3.5 + Math.random() * 3,
                sp % 2 === 0 ? '#FEF08A' : '#F97316',
                0.35 + Math.random() * 0.25,
                'spark'
              );
            }
          }
        }

        const normalForce = Math.max(0, springForce + damperForce + tireBounceForce);
        w.suspensionForce = normalForce;

        const effNx = surf.nx * 0.74;
        const effNy = Math.max(0.52, surf.ny);
        const fSuspX = effNx * normalForce;
        const fSuspY = effNy * normalForce;

        totalFx += fSuspX;
        totalFy += fSuspY;

        // Suspension pitch torque: r x F
        const rx = mountX - s.x;
        const ry = mountY - s.y;
        totalTorque += (rx * fSuspY - ry * fSuspX) * 1.15;

        // Tangent direction along terrain slope
        const tx = surf.ny;
        const ty = -surf.nx;
        const vTangent = s.vx * tx + s.vy * ty;

        // Driven wheel torque (with Turbo Boost multiplier and Overheat penalty)
        const driveBias = isRear ? 0.64 : 0.48;
        const turboMultiplier = s.isOverheated
          ? 0.42
          : 1.0 + s.turboBoost * (0.24 + this.driver.turboCoolingBonus * 0.25);
        let driveForce = 0;

        if (s.throttle > 0 && s.fuel > 0) {
          const speedFactor = Math.max(
            0.12,
            1 - Math.max(0, vTangent) / (spec.maxWheelOmega * w.radius)
          );
          driveForce =
            (spec.engineTorque * turboMultiplier * driveBias * speedFactor) / w.radius;
          w.omega =
            vTangent / w.radius +
            s.throttle * (9.5 + s.turboBoost * 5.5) * (1 - speedFactor * 0.45);
        } else if (s.brake > 0) {
          if (vTangent > 0.6) {
            driveForce = -(spec.engineTorque * 0.88 * driveBias) / w.radius;
            w.omega = (vTangent / w.radius) * 0.35;
          } else {
            const revFactor = Math.max(
              0.15,
              1 - Math.abs(Math.min(0, vTangent)) / (spec.maxWheelOmega * w.radius * 0.55)
            );
            driveForce = -(spec.engineTorque * 0.6 * driveBias * revFactor) / w.radius;
            w.omega = vTangent / w.radius - 5.5;
          }
        } else {
          driveForce = -vTangent * 42;
          w.omega = vTangent / w.radius;
        }

        // Coulomb traction limit
        const maxTraction =
          (normalForce + spec.mass * world.gravity * 0.35) *
          spec.tireGrip *
          world.surfaceFriction;
        const clampedTraction = Math.max(-maxTraction, Math.min(maxTraction, driveForce));

        // Slip ratio calculation (higher when climbing steep slopes or accelerating hard)
        const rawSlip = Math.abs(driveForce - clampedTraction) / (maxTraction + 1);
        const slopeSlip = Math.max(0, -surf.nx) * s.throttle * 0.55;
        w.slipRatio = Math.min(
          1,
          rawSlip + slopeSlip + (s.throttle > 0 && Math.abs(vTangent) < 4.5 ? 0.48 : 0)
        );

        totalFx += tx * clampedTraction;
        totalFy += ty * clampedTraction;

        // Pitch reaction torque from traction
        if (isRear && s.throttle > 0) {
          totalTorque += clampedTraction * spec.cgHeight * 0.56;
        } else if (!isRear && s.brake > 0 && vTangent > 1.0) {
          totalTorque -= Math.abs(clampedTraction) * spec.cgHeight * 0.42;
        }

        w.angle += w.omega * dt;
      } else {
        // Wheel is airborne
        w.grounded = false;
        w.compressionVel = -w.compression / dt;
        w.compression = Math.max(0, w.compression - 3.6 * dt);
        w.suspensionForce = 0;
        w.slipRatio = 0;
        w.worldX = mountX;
        w.worldY = mountY - w.restLength;

        if (s.throttle > 0 && s.fuel > 0) {
          w.omega = Math.min(spec.maxWheelOmega * 1.15, w.omega + 32 * dt);
        } else if (s.brake > 0) {
          w.omega = Math.max(-spec.maxWheelOmega * 0.65, w.omega - 30 * dt);
        } else {
          w.omega *= 0.985;
        }
        w.angle += w.omega * dt;
      }
    };

    solveWheel(s.rearWheel, true);
    solveWheel(s.frontWheel, false);

    // 4. Air / Stunt Rotation Control
    const anyGrounded = s.rearWheel.grounded || s.frontWheel.grounded;
    const bothAirborne = !s.rearWheel.grounded && !s.frontWheel.grounded;

    const pitchInput = s.throttle - s.brake + tiltInput * 0.85;
    if (Math.abs(pitchInput) > 0.05) {
      const airScale = bothAirborne ? 2.2 : 0.72;
      totalTorque += pitchInput * spec.airTorque * airScale;
    }

    // Reduced grounded angular damping so the chassis pitches and bounces naturally over hills
    totalTorque -= s.omega * (anyGrounded ? 1850 : 450);

    // Integrate linear and angular velocities
    s.vx += (totalFx / spec.mass) * dt;
    s.vy += (totalFy / spec.mass) * dt;

    const maxVx = spec.maxWheelOmega * spec.rearWheelRadius * 1.22;
    s.vx = Math.max(-maxVx * 0.55, Math.min(maxVx, s.vx));

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (s.x < 2) {
      s.x = 2;
      s.vx = Math.max(0, s.vx);
    }

    s.omega += (totalTorque / inertia) * dt;
    s.omega = Math.max(-9.2, Math.min(9.2, s.omega));
    s.angle += s.omega * dt;

    // 5. Simulate Driver Seat-Spring Bounce, Head Whiplash & Ejection G-Force Logic
    const accelX = (s.vx - prevVx) / dt;
    const accelY = (s.vy - prevVy) / dt;

    // Driver vertical bounce spring in seat: reacts to chassis upward/downward jolt
    const seatSpringK = 145;
    const seatDampC = 11.5;
    const seatForceY = -seatSpringK * s.driverOffsetY - seatDampC * s.driverVelY - accelY * 0.042;
    s.driverVelY += seatForceY * dt;
    s.driverOffsetY = Math.max(-0.22, Math.min(0.65, s.driverOffsetY + s.driverVelY * dt));

    // Driver forward/backward lean whiplash: reacts to longitudinal acceleration & landing pitch
    const leanSpringK = 130;
    const leanDampC = 12;
    const leanTorque =
      -leanSpringK * s.driverLeanAngle -
      leanDampC * s.driverLeanVel -
      accelX * 0.055 +
      s.omega * 1.4;
    s.driverLeanVel += leanTorque * dt;
    s.driverLeanAngle = Math.max(-0.75, Math.min(0.75, s.driverLeanAngle + s.driverLeanVel * dt));

    // Decay driver strain over time when driving smoothly
    s.driverStrain = Math.max(0, s.driverStrain - dt * 24);

    // Instantaneous G-force spike from extreme vertical bounce or hard obstacle collision
    const gVertical = Math.abs(accelY) / 9.81;
    const gHorizontal = Math.abs(accelX) / 9.81;
    const bounceResistance = 1.0 + this.driver.bounceToleranceBonus;

    if (gVertical > 8.5 * bounceResistance || gHorizontal > 9.5 * bounceResistance) {
      const strainAdd = ((Math.max(gVertical, gHorizontal) - 7.5) * 6.5) / bounceResistance;
      s.driverStrain = Math.min(100, s.driverStrain + strainAdd);
    }

    // Normalize engine RPM for audio/HUD
    const targetRpm = Math.min(
      1.0,
      0.12 + s.throttle * 0.55 + (Math.abs(s.vx) / maxVx) * 0.45
    );
    s.rpm += (targetRpm - s.rpm) * 10 * dt;

    const distMeters = Math.max(0, s.x - 6);
    if (distMeters > this.maxDistance) {
      this.maxDistance = distMeters;
    }

    // Decay stunt combo HUD timer & flip chain timer
    if (this.stuntComboTimer > 0) {
      this.stuntComboTimer = Math.max(0, this.stuntComboTimer - dt);
      if (this.stuntComboTimer === 0) {
        this.stuntComboMultiplier = 0;
      }
    }
    if (this.flipChainDecayTimer > 0) {
      this.flipChainDecayTimer = Math.max(0, this.flipChainDecayTimer - dt);
      if (this.flipChainDecayTimer === 0) {
        this.consecutiveFlipChain = 0;
      }
    }

    // 6. Airborne Stunts, Hard Landing Evaluation, Part Detachment & Driver Ejection
    if (bothAirborne) {
      s.airTime += dt;
      s.cumulativeAirAngle += s.omega * dt;
      this.totalAirTime += dt;
      s.wheelieTime = 0;

      const liveFlips = Math.floor((Math.abs(s.cumulativeAirAngle) + 0.92) / (Math.PI * 2));
      if (liveFlips > this.currentJumpFlipsTriggered) {
        this.currentJumpFlipsTriggered = liveFlips;
        this.consecutiveFlipChain++;
        this.flipChainDecayTimer = 9.0;

        const comboMult = Math.max(2, Math.max(liveFlips, this.consecutiveFlipChain));
        const isBackflip = s.cumulativeAirAngle > 0;
        this.stuntComboMultiplier = comboMult;
        this.stuntComboLabel = `${isBackflip ? 'BACKFLIP' : 'FRONTFLIP'} COMBO`;
        this.stuntComboTimer = 3.2;

        this.events.onStuntCombo?.(comboMult, this.stuntComboLabel);
      }
    } else {
      if (wasAirborne && prevAirTime > 0.24) {
        const landingVy = Math.abs(prevVy);
        const impactSpeed = Math.min(1.4, landingVy / 12.5);
        s.lastLandingImpact = Math.min(1, impactSpeed);

        // Measure how crooked the vehicle is relative to terrain slope upon landing
        const groundSurf = this.terrain.getSurfaceInfo(s.x);
        const normalizedChassisAngle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));
        const slopeMismatch = Math.abs(normalizedChassisAngle - groundSurf.slopeAngle);

        // Add upward seat-spring bounce velocity to the driver on landing!
        s.driverVelY += landingVy * 0.42;

        // Calculate landing G-force severity combining vertical drop speed & pitch angle
        const landingSeverity =
          (landingVy / (15.5 * bounceResistance)) * (1 + slopeMismatch * 0.72);

        if (landingSeverity >= 1.05 || (landingVy > 11.5 && slopeMismatch > 0.95)) {
          // EXTREME BOUNCE / HARD LANDING -> REAL PHYSICS ELASTIC BOUNCE-BACK (NO EJECTION / NO GAME OVER!)
          this.detachNextVehiclePart();
          this.triggerPhysicsBounceBack('ELASTIC SUSPENSION REBOUND!', landingSeverity, groundSurf.slopeAngle);
        } else if (landingSeverity >= 0.72) {
          // Heavy bounce: elastic chassis rebound + seat spring bounce
          s.vy = Math.max(s.vy, landingVy * 0.42);
          s.driverStrain = Math.min(85, s.driverStrain + 35);
          this.detachNextVehiclePart();
        }

        if (impactSpeed > 0.22) {
          this.camShake = Math.min(1.0, impactSpeed * 0.85);
          this.events.onLandingImpact(Math.min(1, impactSpeed));
          if (impactSpeed > 0.72) {
            this.hitstopTimer = 0.035;
          }
          // Spawn landing dust, mud clods & sparks
          const burstCount = Math.round(6 + impactSpeed * 10);
          for (let p = 0; p < burstCount; p++) {
            this.spawnParticle(
              s.x + (Math.random() - 0.5) * 2.4,
              s.rearWheel.worldY - 0.25,
              (Math.random() - 0.5) * 9,
              Math.random() * 5.5 + 1.2,
              4 + Math.random() * 5.5,
              impactSpeed > 0.62 && p % 2 === 0 ? '#F59E0B' : this.world.terrainSub,
              0.45 + Math.random() * 0.35,
              impactSpeed > 0.62 && p % 2 === 0 ? 'spark' : p % 3 === 0 ? 'clod' : 'dust'
            );
          }
        }

        // Evaluate flips on landing
        const flips = Math.floor((Math.abs(prevAirAngle) + 0.92) / (Math.PI * 2));
        if (flips >= 1) {
          const isBackflip = prevAirAngle > 0;
          const activeMult = Math.max(flips > 1 ? flips : 1, this.stuntComboMultiplier || 1);
          const flipBonus = Math.round(
            flips * 250 * activeMult * (1 + this.driver.airSpinBonus * 0.5)
          );
          this.flipsCount += flips;
          this.stuntBonusCoins += flipBonus;
          this.runCoins += flipBonus;
          const label =
            activeMult >= 2
              ? `STUNT COMBO x${activeMult}!`
              : isBackflip
              ? 'BACKFLIP!'
              : 'FRONTFLIP!';
          this.addNotification(label, `+${flipBonus} COINS`, '#FACC15');
          this.events.onStuntBonus(label, `+${flipBonus} COINS`, flipBonus, true);
        } else if (prevAirTime >= 1.15) {
          const airBonus = Math.round(prevAirTime * 110);
          this.stuntBonusCoins += airBonus;
          this.runCoins += airBonus;
          this.addNotification(
            'BIG AIR TIME!',
            `${prevAirTime.toFixed(1)}s · +${airBonus}`,
            '#38BDF8'
          );
          this.events.onStuntBonus('BIG AIR TIME!', `+${airBonus} COINS`, airBonus, false);
        }
      }
      s.airTime = 0;
      s.cumulativeAirAngle = 0;
      this.currentJumpFlipsTriggered = 0;

      // On extreme hill-bouncing, apply elastic seat rebound instead of ejecting driver
      if (s.driverStrain >= 92 || (s.driverOffsetY > 0.5 && s.vy > 6.5)) {
        s.driverStrain = 75;
        s.driverVelY = -Math.abs(s.driverVelY) * 0.65;
      }

      // Check Wheelie bonus (rear wheel grounded, front wheel lifted)
      if (s.rearWheel.grounded && !s.frontWheel.grounded && s.angle > 0.22) {
        s.wheelieTime += dt;
        if (s.wheelieTime >= 1.6) {
          s.wheelieTime = 0;
          const wBonus = 150;
          this.wheelieCount++;
          this.stuntBonusCoins += wBonus;
          this.runCoins += wBonus;
          this.addNotification('WHEELIE MASTER!', `+${wBonus} COINS`, '#10B981');
          this.events.onStuntBonus('WHEELIE MASTER!', `+${wBonus} COINS`, wBonus, false);
        }
      } else {
        s.wheelieTime = Math.max(0, s.wheelieTime - dt * 0.5);
      }
    }

    // 7. Chassis Belly Minimum Clearance + Bouncy Belly Scrape
    const centerGroundY = this.terrain.getHeightAt(s.x);
    if (s.y < centerGroundY + 0.45) {
      s.y = centerGroundY + 0.45;
      if (s.vy < -1.8) {
        s.vy = Math.abs(s.vy) * 0.55; // Elastic rebound bounce off belly pan
      } else if (s.vy < 0) {
        s.vy = 0;
      }
    }

    // 8. Roll-Cage / Roof Ground Contact when Inverted -> Elastic Bounce-Back Upright (No Game Over!)
    const roofX = s.x - Math.sin(s.angle) * 0.95;
    const roofY = s.y + Math.cos(s.angle) * 0.95;
    const roofGround = this.terrain.getHeightAt(roofX);
    const normalizedAngle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));

    if (Math.abs(normalizedAngle) > 1.58 && roofY <= roofGround + 0.42) {
      const groundSurf = this.terrain.getSurfaceInfo(s.x);
      // Push chassis clear of ground and spring it upright onto its wheels
      s.y += Math.max(0.18, roofGround + 0.48 - roofY);
      s.vy = Math.max(5.6, Math.abs(s.vy) * 0.68);
      s.omega = (normalizedAngle > 0 ? -1 : 1) * 6.2;
      s.driverVelY = 3.2;
      s.driverOffsetY = 0.28;
      this.camShake = 0.65;

      // Spawn roll-cage bounce sparks
      for (let k = 0; k < 6; k++) {
        this.spawnParticle(
          roofX + (Math.random() - 0.5) * 1.2,
          roofGround + 0.15,
          (Math.random() - 0.5) * 7,
          Math.random() * 4.5 + 1.5,
          4.5,
          k % 2 === 0 ? '#F59E0B' : '#FEF08A',
          0.4,
          'spark'
        );
      }
      this.triggerPhysicsBounceBack('ROLL-CAGE BOUNCE BACK!', 0.95, groundSurf.slopeAngle);
    }

    // 9. Keep fuel topped up with emergency reserve so bounce runs never trigger sudden Game Over
    if (s.fuel <= 0) {
      s.fuel = 25;
      this.addNotification('RESERVE FUEL BOOST!', '+25% EMERGENCY TANK', '#10B981');
    }
  }

  private updatePickups(dt: number): void {
    const s = this.state;
    const pickupRadius = 1.85;

    for (let i = 0; i < this.terrain.pickups.length; i++) {
      const item: PickupItem = this.terrain.pickups[i];
      if (item.collected) {
        if (item.collectAnim < 1) {
          item.collectAnim = Math.min(1, item.collectAnim + dt * 4);
        }
        continue;
      }

      const dx = item.x - s.x;
      const dy = item.y - s.y;
      if (dx * dx + dy * dy <= pickupRadius * pickupRadius) {
        item.collected = true;
        if (item.type === 'fuel') {
          s.fuel = 100;
          this.fuelPickupsCount++;
          this.addNotification('FUEL REFILLED!', '100% TANK', '#10B981');
          this.events.onFuelCollected(item.x, item.y);
          for (let k = 0; k < 10; k++) {
            this.spawnParticle(
              item.x,
              item.y,
              (Math.random() - 0.5) * 6,
              Math.random() * 5 + 1,
              5,
              '#10B981',
              0.55,
              'fuel'
            );
          }
        } else {
          this.runCoins += item.value;
          const isGem = item.type === 'gem';
          if (isGem) {
            this.addNotification('RARE GEM!', `+${item.value} COINS`, '#22D3EE');
          }
          this.events.onCoinCollected(item.value, isGem, item.x, item.y);
          for (let k = 0; k < 6; k++) {
            this.spawnParticle(
              item.x,
              item.y,
              (Math.random() - 0.5) * 5,
              Math.random() * 4 + 1.5,
              4,
              isGem ? '#22D3EE' : '#FACC15',
              0.45,
              'coin'
            );
          }
        }
      }
    }
  }

  private updateRoadsideProps(dt: number): void {
    const s = this.state;
    const hitRadius = 1.95;

    for (let i = 0; i < this.terrain.props.length; i++) {
      const prop = this.terrain.props[i];
      if (prop.hit) {
        prop.hitTime += dt;
        if (prop.hitTime < 2.5) {
          prop.x += prop.vx * dt;
          prop.y += prop.vy * dt;
          prop.vy -= 14.5 * dt;
          prop.angle += prop.omega * dt;
        }
        continue;
      }

      const dx = prop.x - s.x;
      const dy = prop.y - s.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        prop.hit = true;
        prop.hitTime = 0;
        prop.vx = Math.max(4.5, s.vx * 1.25) + (Math.random() - 0.3) * 4.5;
        prop.vy = 6.5 + Math.abs(s.vx) * 0.38 + Math.random() * 3.5;
        prop.omega = (Math.random() > 0.5 ? 1 : -1) * (9 + Math.random() * 8);

        this.runCoins += 25;
        this.stuntBonusCoins += 25;
        this.events.onPropSmash?.(prop.type);

        const debrisColor =
          prop.type === 'barrel' ? '#EF4444' : prop.type === 'crate' ? '#B45309' : '#FACC15';
        for (let k = 0; k < 8; k++) {
          this.spawnParticle(
            prop.x,
            prop.y,
            (Math.random() - 0.2) * 8 + s.vx * 0.4,
            Math.random() * 6 + 2,
            4.5 + Math.random() * 4,
            k % 3 === 0 ? '#FDE047' : debrisColor,
            0.55 + Math.random() * 0.3,
            k % 3 === 0 ? 'spark' : 'clod'
          );
        }
      }
    }
  }

  /**
   * Speed- and Wheelspin-Proportional Tire Mud / Dirt Rooster-Tail Emitter
   * + Exhaust Backfire Flames & Overheat Smoke!
   */
  private updateParticles(dt: number): void {
    const s = this.state;

    const emitWheelMudSpray = (w: WheelPhysicsState, isRear: boolean): void => {
      if (!w.grounded) return;
      const wheelTangentialSpeed = Math.abs(w.omega * w.radius);
      const carSpeed = Math.abs(s.vx);
      const effectiveSpeed = Math.max(
        carSpeed,
        wheelTangentialSpeed * (0.65 + w.slipRatio * 0.6)
      );

      // Below 1.1 m/s: practically no dirt kicked up
      if (effectiveSpeed < 1.1) return;

      // Emission rate (particles per second) scales quadratically/linearly with speed:
      // Slow (2 m/s) -> ~5 particles/sec
      // Medium (10 m/s) -> ~45 particles/sec
      // Fast (22+ m/s) -> ~115+ particles/sec (thick rooster-tail mud & dirt spray!)
      const normalizedSpeed = Math.min(2.2, (effectiveSpeed - 1.1) / 11.5);
      const ratePerSec =
        (isRear ? 1 : 0.65) * (4 + normalizedSpeed * normalizedSpeed * 58);

      if (isRear) {
        this.dirtEmitAccumulatorRear += ratePerSec * dt;
      } else {
        this.dirtEmitAccumulatorFront += ratePerSec * dt;
      }

      let toEmit = isRear
        ? Math.floor(this.dirtEmitAccumulatorRear)
        : Math.floor(this.dirtEmitAccumulatorFront);
      if (isRear) {
        this.dirtEmitAccumulatorRear -= toEmit;
      } else {
        this.dirtEmitAccumulatorFront -= toEmit;
      }

      toEmit = Math.min(6, toEmit);
      const dirSign = w.omega >= 0 ? -1 : 1;

      for (let i = 0; i < toEmit; i++) {
        const isClod = Math.random() < 0.35 + normalizedSpeed * 0.28;
        const throwSpeedX =
          dirSign * (1.8 + effectiveSpeed * (0.38 + Math.random() * 0.25)) +
          (Math.random() - 0.5) * 2.2;
        const throwSpeedY =
          1.1 +
          normalizedSpeed * (2.8 + Math.random() * 2.6) +
          w.slipRatio * 2.2;
        const pSize = isClod
          ? 2.8 + normalizedSpeed * 2.4 + Math.random() * 2.2
          : 3.5 + normalizedSpeed * 3.2 + Math.random() * 3.0;

        this.spawnParticle(
          w.worldX + dirSign * w.radius * 0.45 + (Math.random() - 0.5) * 0.25,
          w.worldY - w.radius * 0.82,
          throwSpeedX,
          throwSpeedY,
          pSize,
          isClod
            ? Math.random() > 0.45
              ? '#5C2D0C'
              : '#3E1F08'
            : this.world.terrainSub,
          0.35 + normalizedSpeed * 0.22 + Math.random() * 0.2,
          isClod ? 'clod' : 'dust'
        );
      }
    };

    emitWheelMudSpray(s.rearWheel, true);
    emitWheelMudSpray(s.frontWheel, false);

    // Exhaust Smoke, Turbo Flames & Overheat Dark Smoke
    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);
    const exX = s.x - this.spec.wheelbase * 0.58 * cosA;
    const exY = s.y - this.spec.wheelbase * 0.58 * sinA + 0.25;

    if (s.backfireTimer > 0 && !s.isDead) {
      // Pop twin orange/cyan exhaust backfire flames!
      this.spawnParticle(
        exX,
        exY,
        -s.vx * 0.1 - cosA * (8 + Math.random() * 4),
        (Math.random() - 0.5) * 2.5,
        5.5 + Math.random() * 4,
        Math.random() > 0.35 ? '#F97316' : '#38BDF8',
        0.16,
        'flame'
      );
    }

    if ((s.throttle > 0 || s.isOverheated) && !s.isDead && Math.random() < 0.55) {
      this.spawnParticle(
        exX,
        exY,
        -s.vx * 0.2 - cosA * 3.2,
        1.4 + Math.random() * 1.4,
        s.isOverheated ? 6.5 + Math.random() * 5 : 4 + Math.random() * 4.5,
        s.isOverheated ? 'rgba(30, 41, 59, 0.82)' : 'rgba(148, 163, 184, 0.52)',
        s.isOverheated ? 0.72 : 0.52,
        'smoke'
      );
    }

    // Update active particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'dust' || p.type === 'clod' || p.type === 'spark') {
        p.vy -= 12.2 * dt;
      } else if (p.type === 'smoke') {
        p.size += dt * 6.5;
      }
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  private updateNotifications(dt: number): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      n.life += dt;
      n.y += dt * 1.35;
      if (n.life >= n.maxLife) {
        this.notifications.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number, zoomAssist: boolean): void {
    const s = this.state;
    // Follow ejected driver slightly if driver flew out!
    const focusX = s.driverEjected ? (s.x + s.driverRagdollX) * 0.5 : s.x;
    const focusY = s.driverEjected ? Math.max(s.y, s.driverRagdollY * 0.85) : s.y;

    const lookAheadX = Math.max(2.2, Math.min(9.5, 3.8 + s.vx * 0.34));
    const targetCamX = focusX + lookAheadX;
    const groundY = this.terrain.getHeightAt(focusX + 3);
    const targetCamY = Math.max(groundY + 1.8, focusY + 1.15 + Math.max(0, s.vy * 0.12));

    const damp = 1 - Math.exp(-6.5 * dt);
    this.camX += (targetCamX - this.camX) * damp;
    this.camY += (targetCamY - this.camY) * damp;

    const speedZoom = Math.min(0.22, Math.abs(s.vx) * 0.011);
    const jumpHeight = Math.max(0, focusY - groundY - 1.2);
    const airZoom = zoomAssist ? Math.min(0.32, jumpHeight * 0.045) : 0;
    const targetZoom = Math.max(0.62, 1.0 - speedZoom - airZoom);

    const zoomDamp = 1 - Math.exp(-3.8 * dt);
    this.camZoom += (targetZoom - this.camZoom) * zoomDamp;

    if (this.camShake > 0) {
      this.camShake = Math.max(0, this.camShake - dt * 2.8);
    }
  }
}
