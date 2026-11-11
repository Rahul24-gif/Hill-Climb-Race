export type VehicleId =
  | 'jeep'
  | 'monster'
  | 'buggy'
  | 'dirtbike'
  | 'rally'
  | 'pickup';

export type DriverId =
  | 'rex'
  | 'duke'
  | 'maya'
  | 'axel'
  | 'zara'
  | 'viktor';

export type WorldId =
  | 'green_valley'
  | 'desert_run'
  | 'snow_mountains'
  | 'dark_forest'
  | 'volcanic_land'
  | 'neon_city';

export type UpgradeCategory =
  | 'engine'
  | 'suspension'
  | 'tires'
  | 'fuel'
  | 'grip'
  | 'airControl';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export type RenderMode = 'ILLUSTRATED_2D' | 'HYBRID_3D';

export type WeatherOverride = 'AUTO' | 'SUNNY' | 'RAIN' | 'SNOW' | 'NIGHT';

export type GameScreenState =
  | 'SPLASH'
  | 'MAIN_MENU'
  | 'GARAGE'
  | 'UPGRADES'
  | 'WORLDS'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'SETTINGS'
  | 'MISSIONS'
  | 'DAILY_REWARD'
  | 'ACHIEVEMENTS'
  | 'ANDROID_EXPORT';

export interface DriverSpec {
  id: DriverId;
  name: string;
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  perkTitle: string;
  perkDescription: string;
  skinColor: string;
  hairColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
  headgearColor: string;
  visorColor: string;
  headgearType:
    | 'cap'
    | 'horned_helmet'
    | 'visor_helmet'
    | 'moto_goggles'
    | 'desert_goggles'
    | 'wrc_helmet';
  // Gameplay Perk Multipliers
  bounceToleranceBonus: number;
  torqueBonus: number;
  turboCoolingBonus: number;
  airSpinBonus: number;
  gripFuelBonus: number;
  topSpeedBonus: number;
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  shortName: string;
  tagline: string;
  unlockCost: number;
  // Stat Bars (1..100 for Garage UI matching Panel 3)
  statSpeed: number;
  statAcceleration: number;
  statHandling: number;
  statFuel: number;
  // Base Physics Parameters
  mass: number;
  wheelbase: number;
  cgHeight: number;
  frontWheelRadius: number;
  rearWheelRadius: number;
  springStiffness: number;
  dampingCoeff: number;
  suspensionTravel: number;
  engineTorque: number;
  maxWheelOmega: number;
  tireGrip: number;
  airTorque: number;
  fuelCapacity: number;
  fuelConsumptionRate: number;
  // Visual Styling
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  wheelStyle: 'offroad' | 'monster' | 'beadlock' | 'spoke' | 'rally' | 'heavy';
  bodyType: VehicleId;
}

export interface WorldSpec {
  id: WorldId;
  name: string;
  subtitle: string;
  unlockCost: number;
  gravity: number;
  surfaceFriction: number;
  roughness: number;
  hillAmplitude: number;
  hillFrequency: number;
  bridgeChance: number;
  rockChance: number;
  coinMultiplier: number;
  skyTop: string;
  skyBottom: string;
  horizonFog: string;
  mountainFar: string;
  mountainMid: string;
  terrainTop: string;
  terrainEdge: string;
  terrainSub: string;
  terrainDeep: string;
  ambientLightHex: number;
  sunLightHex: number;
  weatherType: 'none' | 'dust' | 'snow' | 'mist' | 'embers' | 'neon_rain';
}

export interface WheelPhysicsState {
  offsetX: number;
  restLength: number;
  radius: number;
  compression: number;
  compressionVel: number;
  worldX: number;
  worldY: number;
  angle: number;
  omega: number;
  grounded: boolean;
  groundNormalX: number;
  groundNormalY: number;
  slipRatio: number;
  suspensionForce: number;
}

export interface DetachablePartState {
  id: 'front_bumper' | 'roof_accessory';
  detached: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
}

export type DeathReason = 'NONE' | 'ROLLOVER' | 'OUT_OF_FUEL' | 'DRIVER_EJECTED';

export interface VehiclePhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  frontWheel: WheelPhysicsState;
  rearWheel: WheelPhysicsState;
  fuel: number;
  maxFuel: number;
  rpm: number;
  throttle: number;
  brake: number;
  airTime: number;
  cumulativeAirAngle: number;
  wheelieTime: number;
  isDead: boolean;
  deathReason: DeathReason;
  lastLandingImpact: number;
  // Driver Seat-Spring & Ejection Ragdoll Physics
  driverOffsetY: number;
  driverVelY: number;
  driverLeanAngle: number;
  driverLeanVel: number;
  driverStrain: number;
  driverEjected: boolean;
  driverRagdollX: number;
  driverRagdollY: number;
  driverRagdollVx: number;
  driverRagdollVy: number;
  driverRagdollAngle: number;
  driverRagdollOmega: number;
  // Engine Turbo Boost, Overheat & Backfire Flames
  turboBoost: number;
  engineTemp: number;
  isOverheated: boolean;
  backfireTimer: number;
  // Breakable / Detachable Vehicle Parts
  frontBumper: DetachablePartState;
  roofAccessory: DetachablePartState;
}

export interface PickupItem {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'fuel' | 'gem';
  value: number;
  collected: boolean;
  collectAnim: number;
}

export interface TerrainRock {
  x: number;
  y: number;
  radius: number;
  seed: number;
}

export interface BridgeSpan {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  sag: number;
}

export interface RoadsideProp {
  id: number;
  x: number;
  y: number;
  zOffset: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  type: 'crate' | 'barrel' | 'marker';
  hit: boolean;
  hitTime: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type:
    | 'dust'
    | 'clod'
    | 'smoke'
    | 'spark'
    | 'flame'
    | 'coin'
    | 'fuel'
    | 'snow'
    | 'ember'
    | 'leaf';
}

export interface FloatingNotification {
  id: number;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'distance' | 'coins' | 'flips' | 'airtime' | 'fuel_pickups';
  target: number;
  progress: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'distance' | 'flips' | 'coins' | 'upgrades';
  target: number;
  progress: number;
  rewardStars: number;
  rewardCoins: number;
  unlocked: boolean;
  claimed: boolean;
}

export type VehicleUpgradesMap = Record<UpgradeCategory, number>;

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  renderMode: RenderMode;
  weatherOverride: WeatherOverride;
  masterVolume: number;
  sfxMuted: boolean;
  engineSoundOn: boolean;
  coinSoundOn: boolean;
  musicAmbienceOn: boolean;
  soundSettingsOn: boolean;
  tiltControls: boolean;
  tiltSensitivity: number;
  hapticsEnabled: boolean;
  showTelemetry: boolean;
  cameraZoomAssist: boolean;
}

export interface PlayerSaveData {
  coins: number;
  gems: number;
  selectedVehicle: VehicleId;
  selectedDriver: DriverId;
  selectedWorld: WorldId;
  unlockedVehicles: VehicleId[];
  unlockedWorlds: WorldId[];
  upgrades: Record<VehicleId, VehicleUpgradesMap>;
  bestDistanceByWorld: Record<WorldId, number>;
  totalDistance: number;
  totalFlips: number;
  totalCoinsEarned: number;
  totalUpgradesBought: number;
  missions: Mission[];
  achievements: Achievement[];
  lastDailyRewardDate: string | null;
  dailyStreak: number;
  settings: GameSettings;
}

export interface RunSummary {
  distance: number;
  bestDistance: number;
  isNewRecord: boolean;
  coinsCollected: number;
  stuntBonusCoins: number;
  flipsCount: number;
  airTimeTotal: number;
  wheelieBonusCount: number;
  deathReason: DeathReason;
}
