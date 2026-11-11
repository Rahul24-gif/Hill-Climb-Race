import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Flame,
  Gift,
  Home,
  Pause,
  Play,
  Settings,
  ShoppingCart,
  Smartphone,
  Star,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import {
  DeathReason,
  DriverId,
  GameScreenState,
  GraphicsQuality,
  PlayerSaveData,
  RenderMode,
  RunSummary,
  UpgradeCategory,
  VehicleId,
  WeatherOverride,
  WorldId,
} from './game/types';
import {
  DRIVER_ORDER,
  DRIVERS,
  getEffectiveVehicleSpec,
  getUpgradeCost,
  loadPlayerSaveData,
  MAX_UPGRADE_LEVEL,
  savePlayerSaveData,
  UPGRADE_INFO,
  VEHICLES,
  WORLD_ORDER,
  WORLDS,
} from './game/data';
import { TerrainGenerator } from './game/terrain';
import { VehiclePhysicsEngine } from './game/physics';
import { isSoftwareGl, ThreeOffroadRenderer } from './game/renderer3d';
import { Illustrated2DRenderer } from './game/renderer2d';
import { soundEngine } from './game/audio';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import {
  AnalogSpeedometerDial,
  CartoonDriverAvatar,
  HillRushLogoLockup,
  IllustratedVehicleArt,
  UpgradePartIcon,
  VehicleSelectionHeaderBanner,
  WorldLandscapeThumb,
} from './components/IllustratedIcons';

const SHOWCASE_FIVE_VEHICLES: VehicleId[] = [
  'jeep',
  'monster',
  'buggy',
  'dirtbike',
  'rally',
];

const VEHICLE_CARD_THEMES: Record<
  VehicleId,
  {
    headerBg: string;
    headerText: string;
    borderColor: string;
    barFill: string;
  }
> = {
  jeep: {
    headerBg: 'from-red-500 via-red-600 to-red-700',
    headerText: 'text-white',
    borderColor: 'border-red-500/80',
    barFill: 'from-yellow-300 via-amber-400 to-orange-500',
  },
  monster: {
    headerBg: 'from-sky-400 via-blue-500 to-blue-700',
    headerText: 'text-white',
    borderColor: 'border-sky-400/80',
    barFill: 'from-cyan-300 via-sky-400 to-blue-500',
  },
  buggy: {
    headerBg: 'from-yellow-300 via-amber-400 to-amber-500',
    headerText: 'text-slate-950',
    borderColor: 'border-amber-400',
    barFill: 'from-yellow-200 via-yellow-400 to-amber-500',
  },
  dirtbike: {
    headerBg: 'from-lime-400 via-green-500 to-green-700',
    headerText: 'text-white',
    borderColor: 'border-lime-400/80',
    barFill: 'from-lime-300 via-lime-400 to-green-500',
  },
  rally: {
    headerBg: 'from-fuchsia-500 via-purple-600 to-purple-800',
    headerText: 'text-white',
    borderColor: 'border-purple-400/80',
    barFill: 'from-fuchsia-300 via-purple-400 to-purple-600',
  },
  pickup: {
    headerBg: 'from-orange-500 via-orange-600 to-red-700',
    headerText: 'text-white',
    borderColor: 'border-orange-400/80',
    barFill: 'from-amber-300 via-orange-400 to-red-500',
  },
};

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadPlayerSaveData());
  const [screen, setScreen] = useState<GameScreenState>('SPLASH');
  const [selectedUpgradeCat, setSelectedUpgradeCat] = useState<UpgradeCategory>('engine');
  const [settingsTab, setSettingsTab] = useState<'GRAPHICS' | 'AUDIO'>('GRAPHICS');
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const [hudState, setHudState] = useState({
    distance: 0,
    speedKmh: 0,
    fuel: 100,
    rpm: 0.1,
    runCoins: 0,
    frontCompMm: 0,
    rearCompMm: 0,
    pitchDeg: 0,
    airTime: 0,
    fps: 60,
    stuntComboMultiplier: 1,
    stuntComboLabel: '',
    stuntComboTimer: 0,
    driverStrain: 0,
    turboBoost: 0,
    engineTemp: 0,
    isOverheated: false,
  });

  const [pedalVisualState, setPedalVisualState] = useState({
    gas: false,
    brake: false,
  });

  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  const webglMountRef = useRef<HTMLDivElement | null>(null);
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
  const threeRendererRef = useRef<ThreeOffroadRenderer | null>(null);
  const renderer2dRef = useRef<Illustrated2DRenderer | null>(null);
  const engineRef = useRef<VehiclePhysicsEngine | null>(null);

  const screenRef = useRef<GameScreenState>(screen);
  screenRef.current = screen;

  const saveDataRef = useRef<PlayerSaveData>(saveData);
  saveDataRef.current = saveData;

  const inputsRef = useRef({
    gasHeld: false,
    brakeHeld: false,
    tiltValue: 0,
  });

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 2600);
  };

  useEffect(() => {
    savePlayerSaveData(saveData);
    const anyMuted =
      saveData.settings.sfxMuted ||
      (!saveData.settings.engineSoundOn &&
        !saveData.settings.coinSoundOn &&
        !saveData.settings.soundSettingsOn);
    soundEngine.setConfig(saveData.settings.masterVolume, anyMuted);
    if (threeRendererRef.current) {
      threeRendererRef.current.setQuality(saveData.settings.graphicsQuality);
    }
  }, [saveData]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const effSpec = getEffectiveVehicleSpec(
      saveData.selectedVehicle,
      saveData.upgrades[saveData.selectedVehicle],
      saveData.selectedDriver
    );
    const worldSpec = WORLDS[saveData.selectedWorld];
    const driverSpec = DRIVERS[saveData.selectedDriver] || DRIVERS.rex;
    if (screen !== 'PLAYING' && screen !== 'PAUSED') {
      engine.reset(effSpec, worldSpec, driverSpec);
    }
  }, [
    saveData.selectedVehicle,
    saveData.selectedWorld,
    saveData.selectedDriver,
    saveData.upgrades,
    screen,
  ]);

  useEffect(() => {
    const mountEl = webglMountRef.current;
    const canvas2d = canvas2dRef.current;
    if (!mountEl || !canvas2d) return;

    const initialSave = saveDataRef.current;
    const effSpec = getEffectiveVehicleSpec(
      initialSave.selectedVehicle,
      initialSave.upgrades[initialSave.selectedVehicle],
      initialSave.selectedDriver
    );
    const worldSpec = WORLDS[initialSave.selectedWorld];
    const driverSpec = DRIVERS[initialSave.selectedDriver] || DRIVERS.rex;
    const terrain = new TerrainGenerator(worldSpec, 1337);

    const physicsEngine = new VehiclePhysicsEngine(
      effSpec,
      worldSpec,
      terrain,
      {
        onCoinCollected: () => {
          if (saveDataRef.current.settings.coinSoundOn) {
            soundEngine.playCoin();
          }
        },
        onFuelCollected: () => {
          if (saveDataRef.current.settings.coinSoundOn) {
            soundEngine.playFuelPickup();
          }
        },
        onStuntBonus: () => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playStuntBonus();
          }
        },
        onStuntCombo: (multiplier) => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playStuntCombo(multiplier);
          }
        },
        onPropSmash: () => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playPropSmash();
          }
        },
        onLandingImpact: (intensity) => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playLandingImpact(intensity);
          }
        },
        onBottomOutSparks: () => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playBottomOutSparks();
          }
        },
        onBackfirePop: () => {
          if (saveDataRef.current.settings.engineSoundOn) {
            soundEngine.playBackfirePop();
          }
        },
        onPartDetach: () => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playPartDetach();
          }
        },
        onDriverEject: () => {
          if (saveDataRef.current.settings.soundSettingsOn) {
            soundEngine.playDriverEject();
          }
        },
        onGameOver: (reason) => {
          soundEngine.playCrash();
          soundEngine.stopEngine();
          handleEndRun(reason);
        },
      },
      driverSpec
    );
    engineRef.current = physicsEngine;

    const threeRenderer = new ThreeOffroadRenderer(mountEl);
    threeRenderer.setQuality(initialSave.settings.graphicsQuality);
    threeRendererRef.current = threeRenderer;

    const renderer2d = new Illustrated2DRenderer();
    renderer2dRef.current = renderer2d;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      threeRenderer.resize(w, h);
      canvas2d.width = w;
      canvas2d.height = h;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputsRef.current.gasHeld = true;
        setPedalVisualState((p) => (p.gas ? p : { ...p, gas: true }));
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputsRef.current.brakeHeld = true;
        setPedalVisualState((p) => (p.brake ? p : { ...p, brake: true }));
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenRef.current === 'PLAYING') {
          soundEngine.stopEngine();
          setScreen('PAUSED');
        } else if (screenRef.current === 'PAUSED') {
          if (saveDataRef.current.settings.engineSoundOn) {
            soundEngine.startEngine();
          }
          setScreen('PLAYING');
        }
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (screenRef.current === 'SPLASH') {
          e.preventDefault();
          soundEngine.playClick();
          setScreen('MAIN_MENU');
        } else if (screenRef.current === 'MAIN_MENU' || screenRef.current === 'GAME_OVER') {
          e.preventDefault();
          startNewRun();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputsRef.current.gasHeld = false;
        setPedalVisualState((p) => (!p.gas ? p : { ...p, gas: false }));
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputsRef.current.brakeHeld = false;
        setPedalVisualState((p) => (!p.brake ? p : { ...p, brake: false }));
      }
    };

    const onWindowBlur = () => {
      inputsRef.current.gasHeld = false;
      inputsRef.current.brakeHeld = false;
      setPedalVisualState({ gas: false, brake: false });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    let frameId = 0;
    let lastTime = performance.now();
    let lastHudUpdate = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();
    let measuredFps = 60;

    const afterDraw = (cb: () => void) => {
      const gl = threeRenderer.renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const clampedDt = Math.min(rawDt, 0.05);
      const timeSec = now / 1000;

      frameCounter++;
      if (now - fpsTimer >= 500) {
        measuredFps = Math.min(60, Math.round((frameCounter * 1000) / (now - fpsTimer)));
        frameCounter = 0;
        fpsTimer = now;
      }

      const activeScreen = screenRef.current;
      const currentSettings = saveDataRef.current.settings;

      if (activeScreen === 'PLAYING') {
        physicsEngine.stepFrame(
          clampedDt,
          {
            throttle: inputsRef.current.gasHeld,
            brake: inputsRef.current.brakeHeld,
            tiltInput: inputsRef.current.tiltValue,
          },
          currentSettings.cameraZoomAssist
        );

        if (currentSettings.engineSoundOn) {
          const maxSlip = Math.max(
            physicsEngine.state.rearWheel.slipRatio,
            physicsEngine.state.frontWheel.slipRatio
          );
          soundEngine.updateEngine(
            physicsEngine.state.rpm,
            physicsEngine.state.throttle,
            maxSlip,
            Math.abs(physicsEngine.state.vx)
          );
        }
      } else {
        physicsEngine.stepFrame(
          clampedDt,
          { throttle: false, brake: false, tiltInput: 0 },
          false
        );
      }

      if (currentSettings.renderMode === 'HYBRID_3D') {
        const isTurntable = activeScreen !== 'PLAYING' && activeScreen !== 'PAUSED';
        threeRenderer.renderScene(physicsEngine, timeSec, isTurntable);
      }

      const ctx2d = canvas2d.getContext('2d');
      if (ctx2d) {
        renderer2d.render(
          ctx2d,
          canvas2d.width,
          canvas2d.height,
          physicsEngine,
          currentSettings.renderMode,
          currentSettings.weatherOverride,
          timeSec
        );
      }

      if (now - lastHudUpdate > 55) {
        lastHudUpdate = now;
        const s = physicsEngine.state;
        setHudState({
          distance: Math.floor(physicsEngine.maxDistance),
          speedKmh: Math.round(Math.abs(s.vx) * 3.6),
          fuel: Math.round(s.fuel),
          rpm: s.rpm,
          runCoins: physicsEngine.runCoins,
          frontCompMm: Math.round(s.frontWheel.compression * 1000),
          rearCompMm: Math.round(s.rearWheel.compression * 1000),
          pitchDeg: Math.round((s.angle * 180) / Math.PI),
          airTime: s.airTime,
          fps: measuredFps,
          stuntComboMultiplier: physicsEngine.stuntComboMultiplier,
          stuntComboLabel: physicsEngine.stuntComboLabel,
          stuntComboTimer: physicsEngine.stuntComboTimer,
          driverStrain: Math.round(s.driverStrain * 100),
          turboBoost: Math.round(s.turboBoost * 100),
          engineTemp: Math.round(s.engineTemp * 100),
          isOverheated: s.isOverheated,
        });
      }

      if (isSoftwareGl && currentSettings.renderMode === 'HYBRID_3D') {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      soundEngine.stopEngine();
      threeRenderer.dispose();
    };
  }, []);

  const handleEndRun = (reason: DeathReason) => {
    const engine = engineRef.current;
    if (!engine) return;
    const curSave = saveDataRef.current;
    const worldId = curSave.selectedWorld;
    const dist = Math.floor(engine.maxDistance);
    const prevBest = curSave.bestDistanceByWorld[worldId] || 0;
    const isNewRecord = dist > prevBest;
    const newBest = Math.max(prevBest, dist);

    const updatedMissions = curSave.missions.map((m) => {
      if (m.completed) return m;
      let nextProg = m.progress;
      if (m.type === 'distance') nextProg = Math.max(m.progress, dist);
      if (m.type === 'coins') nextProg = m.progress + engine.runCoins;
      if (m.type === 'flips') nextProg = m.progress + engine.flipsCount;
      if (m.type === 'airtime') nextProg = m.progress + Math.round(engine.totalAirTime);
      if (m.type === 'fuel_pickups') nextProg = m.progress + engine.fuelPickupsCount;
      const done = nextProg >= m.target;
      return {
        ...m,
        progress: Math.min(m.target, nextProg),
        completed: done,
      };
    });

    const newTotalCoins = curSave.totalCoinsEarned + engine.runCoins;
    const newTotalFlips = curSave.totalFlips + engine.flipsCount;

    const updatedAchievements = curSave.achievements.map((ach) => {
      if (ach.unlocked) return ach;
      let nextP = ach.progress;
      if (ach.type === 'distance') nextP = Math.max(ach.progress, dist);
      if (ach.type === 'flips') nextP = newTotalFlips;
      if (ach.type === 'coins') nextP = newTotalCoins;
      const done = nextP >= ach.target;
      return {
        ...ach,
        progress: Math.min(ach.target, nextP),
        unlocked: done,
      };
    });

    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins + engine.runCoins,
      bestDistanceByWorld: {
        ...prev.bestDistanceByWorld,
        [worldId]: newBest,
      },
      totalDistance: prev.totalDistance + dist,
      totalFlips: newTotalFlips,
      totalCoinsEarned: newTotalCoins,
      missions: updatedMissions,
      achievements: updatedAchievements,
    }));

    setRunSummary({
      distance: dist,
      bestDistance: newBest,
      isNewRecord,
      coinsCollected: engine.runCoins,
      stuntBonusCoins: engine.stuntBonusCoins,
      flipsCount: engine.flipsCount,
      airTimeTotal: Number(engine.totalAirTime.toFixed(1)),
      wheelieBonusCount: engine.wheelieCount,
      deathReason: reason,
    });

    setScreen('GAME_OVER');
  };

  const startNewRun = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const curSave = saveDataRef.current;
    const effSpec = getEffectiveVehicleSpec(
      curSave.selectedVehicle,
      curSave.upgrades[curSave.selectedVehicle],
      curSave.selectedDriver
    );
    const worldSpec = WORLDS[curSave.selectedWorld];
    const driverSpec = DRIVERS[curSave.selectedDriver] || DRIVERS.rex;
    engine.reset(effSpec, worldSpec, driverSpec);
    setRunSummary(null);
    soundEngine.playClick();
    if (curSave.settings.engineSoundOn) {
      soundEngine.startEngine();
    }
    setScreen('PLAYING');
  };

  const handleSelectDriver = (dId: DriverId) => {
    const dSpec = DRIVERS[dId];
    soundEngine.playClick();
    setSaveData((prev) => ({ ...prev, selectedDriver: dId }));
    showToast(`Driver Equipped: ${dSpec.name} (${dSpec.perkTitle}: ${dSpec.perkDescription})`);
  };

  const handleSelectOrUnlockVehicle = (vId: VehicleId) => {
    const spec = VEHICLES[vId];
    if (saveData.unlockedVehicles.includes(vId)) {
      soundEngine.playClick();
      setSaveData((prev) => ({ ...prev, selectedVehicle: vId }));
      return;
    }
    if (saveData.coins < spec.unlockCost) {
      showToast(`Need ${spec.unlockCost.toLocaleString()} Coins to unlock ${spec.shortName}!`);
      return;
    }
    soundEngine.playUpgrade();
    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins - spec.unlockCost,
      unlockedVehicles: [...prev.unlockedVehicles, vId],
      selectedVehicle: vId,
    }));
    showToast(`${spec.name} Unlocked & Equipped!`);
  };

  const cycleGarageVehicle = (delta: number) => {
    const curIdx = SHOWCASE_FIVE_VEHICLES.indexOf(saveData.selectedVehicle);
    const baseIdx = curIdx >= 0 ? curIdx : 0;
    const nextIdx =
      (baseIdx + delta + SHOWCASE_FIVE_VEHICLES.length) %
      SHOWCASE_FIVE_VEHICLES.length;
    const nextId = SHOWCASE_FIVE_VEHICLES[nextIdx];
    handleSelectOrUnlockVehicle(nextId);
  };

  const handleUpgradeSelectedPart = () => {
    const vId = saveData.selectedVehicle;
    const curLvl = saveData.upgrades[vId][selectedUpgradeCat];
    if (curLvl >= MAX_UPGRADE_LEVEL) {
      showToast('Part is already at Maximum Level!');
      return;
    }
    const cost = getUpgradeCost(selectedUpgradeCat, curLvl);
    if (saveData.coins < cost) {
      showToast(`Not enough coins! Need ${cost.toLocaleString()} Coins.`);
      return;
    }
    soundEngine.playUpgrade();
    const nextUpgradesBought = (saveData.totalUpgradesBought || 0) + 1;

    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      totalUpgradesBought: nextUpgradesBought,
      upgrades: {
        ...prev.upgrades,
        [vId]: {
          ...prev.upgrades[vId],
          [selectedUpgradeCat]: curLvl + 1,
        },
      },
      achievements: prev.achievements.map((ach) =>
        ach.type === 'upgrades'
          ? {
              ...ach,
              progress: Math.min(ach.target, nextUpgradesBought),
              unlocked: nextUpgradesBought >= ach.target,
            }
          : ach
      ),
    }));
    showToast(`${UPGRADE_INFO[selectedUpgradeCat].name} upgraded to Lv.${curLvl + 1}!`);
  };

  const handleSelectOrUnlockWorld = (wId: WorldId) => {
    const wSpec = WORLDS[wId];
    if (saveData.unlockedWorlds.includes(wId)) {
      soundEngine.playClick();
      setSaveData((prev) => ({ ...prev, selectedWorld: wId }));
      setTimeout(() => startNewRun(), 60);
      return;
    }
    if (saveData.coins < wSpec.unlockCost) {
      showToast(`Need ${wSpec.unlockCost.toLocaleString()} Coins to unlock ${wSpec.name}!`);
      return;
    }
    soundEngine.playUpgrade();
    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins - wSpec.unlockCost,
      unlockedWorlds: [...prev.unlockedWorlds, wId],
      selectedWorld: wId,
    }));
    showToast(`${wSpec.name} Unlocked!`);
  };

  const handleClaimAllReadyMissions = () => {
    const ready = saveData.missions.filter((m) => m.completed && !m.claimed);
    if (ready.length === 0) {
      showToast('Complete missions on the trail to claim rewards!');
      return;
    }
    const totalReward = ready.reduce((acc, item) => acc + item.rewardCoins, 0);
    soundEngine.playUpgrade();
    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins + totalReward,
      missions: prev.missions.map((m) =>
        m.completed ? { ...m, claimed: true } : m
      ),
    }));
    showToast(`Claimed +${totalReward.toLocaleString()} Coins from Missions!`);
  };

  const handleClaimDailyChest = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (saveData.lastDailyRewardDate === today) {
      showToast('Already claimed today! Come back tomorrow.');
      return;
    }
    const reward = 1000;
    soundEngine.playUpgrade();
    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins + reward,
      lastDailyRewardDate: today,
      dailyStreak: prev.dailyStreak + 1,
    }));
    showToast('Daily Treasure Chest Claimed: +1000 Coins!');
  };

  const cycleWeatherOverride = () => {
    const order: WeatherOverride[] = ['AUTO', 'SUNNY', 'RAIN', 'SNOW', 'NIGHT'];
    const idx = order.indexOf(saveData.settings.weatherOverride);
    const next = order[(idx + 1) % order.length];
    soundEngine.playClick();
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, weatherOverride: next },
    }));
    showToast(`Weather Mode: ${next}`);
  };

  const toggleRenderMode = () => {
    const nextMode: RenderMode =
      saveData.settings.renderMode === 'HYBRID_3D' ? 'ILLUSTRATED_2D' : 'HYBRID_3D';
    soundEngine.playClick();
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, renderMode: nextMode },
    }));
    showToast(
      nextMode === 'HYBRID_3D'
        ? 'Graphics Mode: Full 3D PBR WebGL'
        : 'Graphics Mode: 2D Illustrated Art'
    );
  };

  const activeVehicleSpec = getEffectiveVehicleSpec(
    saveData.selectedVehicle,
    saveData.upgrades[saveData.selectedVehicle],
    saveData.selectedDriver
  );
  const activeDriverSpec = DRIVERS[saveData.selectedDriver] || DRIVERS.rex;
  const currentUpgradeLevel = saveData.upgrades[saveData.selectedVehicle][selectedUpgradeCat];
  const currentUpgradeCost = getUpgradeCost(selectedUpgradeCat, currentUpgradeLevel);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-950 select-none">
      {/* 1. WebGL 3D Viewport (when HYBRID_3D mode is active) */}
      <div
        ref={webglMountRef}
        className={`absolute inset-0 w-full h-full ${
          saveData.settings.renderMode === 'HYBRID_3D' ? 'block' : 'hidden'
        }`}
      />

      {/* 2. Illustrated 2D Canvas & Particle/Weather Viewport */}
      <canvas
        ref={canvas2dRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Toast Feedback Banner */}
      {toastBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-xl bg-amber-400 border-2 border-slate-950 text-slate-950 font-display font-extrabold text-sm shadow-2xl pointer-events-none">
          {toastBanner}
        </div>
      )}

      {/* ===================================================================
          PANEL 1: GAME TITLE & SPLASH SCREEN ("Tap to Start")
          Note: No duplicate DOM vehicle overlay so the grounded canvas vehicle
          rests cleanly on the rocky hill ridge without any floating mid-air car!
         =================================================================== */}
      {screen === 'SPLASH' && (
        <div
          onClick={() => {
            soundEngine.playClick();
            setScreen('MAIN_MENU');
          }}
          className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-4 cursor-pointer pointer-events-auto"
        >
          {/* Top-Center 3D Slanted HILL RUSH Logo */}
          <div className="mt-2">
            <HillRushLogoLockup size="lg" />
          </div>

          {/* Bottom "Tap to Start" Callout matching Panel 1 */}
          <div className="mb-5 px-10 py-3.5 rounded-2xl bg-slate-950/80 border-[3px] border-amber-400 shadow-[0_6px_0_#451a03,0_12px_24px_rgba(0,0,0,0.85)] animate-pulse">
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wider text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.95)]">
              Tap to Start
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 2: MAIN MENU (5 Glossy Golden Arcade Buttons)
         =================================================================== */}
      {screen === 'MAIN_MENU' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
          {/* Top Bar: Logo + Coins + Quick Reward Buttons */}
          <div className="flex items-start justify-between gap-4 pointer-events-auto">
            <div
              onClick={() => setScreen('SPLASH')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <HillRushLogoLockup size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Coin Counter Pill */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/85 border-2 border-amber-400 shadow-lg">
                <div className="w-6 h-6 rounded-full bg-amber-400 border-2 border-amber-700 flex items-center justify-center text-slate-950 font-black text-xs">
                  ★
                </div>
                <span className="font-display font-extrabold text-lg text-white font-mono-num">
                  {saveData.coins.toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('DAILY_REWARD');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-slate-950 text-slate-950 font-display font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95"
              >
                <Gift className="w-4 h-4" />
                <span>Daily Reward</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('MISSIONS');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-slate-950 text-slate-950 font-display font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95"
              >
                <Star className="w-4 h-4 fill-current" />
                <span>Missions</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('WORLDS');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 border-2 border-sky-400 text-sky-300 font-display font-bold text-xs shadow-lg hover:bg-slate-800"
              >
                World: {WORLDS[saveData.selectedWorld].name}
              </button>

              <button
                onClick={toggleRenderMode}
                className="px-3.5 py-2 rounded-xl bg-slate-950/90 border-2 border-amber-400 text-amber-300 font-display font-extrabold text-xs shadow-lg hover:bg-slate-900"
                title="Switch between Full 3D PBR WebGL and 2D Illustrated Art"
              >
                {saveData.settings.renderMode === 'HYBRID_3D' ? '3D PBR ON' : '2D ART ON'}
              </button>
            </div>
          </div>

          {/* Center Stack of 5 Glossy Yellow Arcade Buttons (Exact Match to Panel 2) */}
          <div className="my-auto mx-auto w-full max-w-xs sm:max-w-sm flex flex-col gap-3 pointer-events-auto">
            {/* 1. PLAY */}
            <button
              onClick={startNewRun}
              className="group relative flex items-center px-5 py-3.5 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-inner">
                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
              </div>
              <span className="flex-1 text-center font-display font-black text-2xl tracking-wider text-slate-950">
                PLAY
              </span>
            </button>

            {/* 2. GARAGE */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('GARAGE');
              }}
              className="group relative flex items-center px-5 py-3 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-700/30 border-2 border-slate-950 flex items-center justify-center">
                <Home className="w-5 h-5 text-slate-950" />
              </div>
              <span className="flex-1 text-center font-display font-black text-xl tracking-wider text-slate-950">
                GARAGE
              </span>
            </button>

            {/* 3. SHOP (Vehicle Upgrades) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('UPGRADES');
              }}
              className="group relative flex items-center px-5 py-3 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-700/30 border-2 border-slate-950 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-slate-950" />
              </div>
              <span className="flex-1 text-center font-display font-black text-xl tracking-wider text-slate-950">
                SHOP
              </span>
            </button>

            {/* 4. SETTINGS */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('SETTINGS');
              }}
              className="group relative flex items-center px-5 py-3 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-700/30 border-2 border-slate-950 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-950" />
              </div>
              <span className="flex-1 text-center font-display font-black text-xl tracking-wider text-slate-950">
                SETTINGS
              </span>
            </button>

            {/* 5. HIGH SCORES (Achievements & Records) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('ACHIEVEMENTS');
              }}
              className="group relative flex items-center px-5 py-3 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-700/30 border-2 border-slate-950 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-slate-950" />
              </div>
              <span className="flex-1 text-center font-display font-black text-xl tracking-wider text-slate-950">
                HIGH SCORES
              </span>
            </button>
          </div>

          {/* Bottom Bar: World Selection & Native Kotlin Export */}
          <div className="flex items-center justify-between text-xs text-white font-semibold pointer-events-auto">
            <button
              onClick={() => setScreen('WORLDS')}
              className="px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-amber-400 transition-colors"
            >
              Select World (6 Stages)
            </button>
            <button
              onClick={() => setScreen('ANDROID_EXPORT')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-amber-400 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Android Kotlin APK Source</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          VEHICLE SELECTION WINDOW ("Choose Your Ride")
          100% Matching the attached reference image:
          - Riveted Steel + Checkered Flag "VEHICLE SELECTION / Choose Your Ride" Banner
          - Scenic Alpine Valley Backdrop with Wooden "HILL RUSH" Sign & Watchtower
          - 5 Iconic Vehicles lined up side-by-side (Selected elevated on glowing stone pedestal)
          - 5 Color-Coded Metallic Stat Cards below (Red, Blue, Gold, Green, Purple)
          - Bottom Glossy Blue < and > Arrow Buttons + Golden "Select Vehicle" Button
         =================================================================== */}
      {screen === 'GARAGE' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto pointer-events-auto bg-sky-950">
          {/* Scenic Alpine Valley Background Layer with Wooden Sign, Mountains, Lake, Watchtower & Rocky Ledge */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Sky & Alpine Mountains SVG Backdrop */}
            <svg
              viewBox="0 0 1600 900"
              preserveAspectRatio="xMidYMid slice"
              className="w-full h-full object-cover"
            >
              <defs>
                <linearGradient id="vsSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D9BF0" />
                  <stop offset="45%" stopColor="#7DD3FC" />
                  <stop offset="100%" stopColor="#E0F2FE" />
                </linearGradient>
                <linearGradient id="vsLake" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
                <linearGradient id="vsLedgeRock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9A6B43" />
                  <stop offset="45%" stopColor="#6E4726" />
                  <stop offset="100%" stopColor="#3D2310" />
                </linearGradient>
              </defs>

              <rect width="1600" height="900" fill="url(#vsSky)" />

              {/* Snow-Capped Alpine Peaks */}
              <polygon points="120,470 460,150 780,470" fill="#60A5FA" />
              <polygon points="460,150 780,470 520,470" fill="#3B82F6" />
              <polygon points="460,150 350,255 430,240 460,265 540,235" fill="#FFFFFF" />

              <polygon points="520,470 810,200 1120,470" fill="#60A5FA" />
              <polygon points="810,200 1120,470 860,470" fill="#3B82F6" />
              <polygon points="810,200 720,285 795,270 845,295 895,275" fill="#FFFFFF" />

              <polygon points="940,470 1220,210 1520,470" fill="#60A5FA" />
              <polygon points="1220,210 1520,470 1260,470" fill="#3B82F6" />
              <polygon points="1220,210 1130,295 1205,280 1275,290" fill="#FFFFFF" />

              {/* Shimmering Valley Lake */}
              <rect x="0" y="420" width="1600" height="90" fill="url(#vsLake)" />

              {/* Evergreen Pine Forest Left & Right */}
              {[60, 130, 210, 290, 1290, 1490, 1550].map((tx, idx) => (
                <g key={idx} transform={`translate(${tx}, 435)`}>
                  <polygon points="0,-160 -45,0 45,0" fill="#14532D" />
                  <polygon points="0,-210 -38,-55 38,-55" fill="#166534" />
                  <polygon points="0,-250 -28,-115 28,-115" fill="#15803D" />
                </g>
              ))}

              {/* LEFT LANDMARK: Rustic Wooden "HILL RUSH" Trail Signboard */}
              <g transform="translate(120, 255) rotate(-6)">
                <rect x="-55" y="-50" width="18" height="170" fill="#5C3A21" stroke="#2B1404" strokeWidth="3" />
                <rect x="37" y="-50" width="18" height="170" fill="#5C3A21" stroke="#2B1404" strokeWidth="3" />
                <rect x="-88" y="-42" width="176" height="36" rx="5" fill="#9A5B25" stroke="#3B2313" strokeWidth="3" />
                <rect x="-88" y="-4" width="176" height="36" rx="5" fill="#854D1E" stroke="#3B2313" strokeWidth="3" />
                <rect x="-88" y="34" width="176" height="36" rx="5" fill="#9A5B25" stroke="#3B2313" strokeWidth="3" />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  fontFamily="'Chakra Petch', sans-serif"
                  fontWeight="900"
                  fontSize="40"
                  fill="#FFFBEB"
                >
                  HILL
                </text>
                <text
                  x="0"
                  y="44"
                  textAnchor="middle"
                  fontFamily="'Chakra Petch', sans-serif"
                  fontWeight="900"
                  fontSize="40"
                  fill="#FFFBEB"
                >
                  RUSH
                </text>
              </g>

              {/* RIGHT LANDMARK: Wooden Lookout Watchtower with Waving Red Flag */}
              <g transform="translate(1430, 310)">
                <line x1="-55" y1="30" x2="-34" y2="-115" stroke="#7C4A21" strokeWidth="10" />
                <line x1="55" y1="30" x2="34" y2="-115" stroke="#5C3A21" strokeWidth="10" />
                <line x1="-50" y1="15" x2="42" y2="-55" stroke="#854D1E" strokeWidth="6" />
                <line x1="50" y1="15" x2="-42" y2="-55" stroke="#854D1E" strokeWidth="6" />
                <line x1="-42" y1="-55" x2="34" y2="-112" stroke="#854D1E" strokeWidth="6" />
                <line x1="42" y1="-55" x2="-34" y2="-112" stroke="#854D1E" strokeWidth="6" />
                <rect x="-52" y="-125" width="104" height="16" fill="#9A5B25" stroke="#3B2313" strokeWidth="3" />
                <rect x="-36" y="-168" width="8" height="44" fill="#5C3A21" />
                <rect x="28" y="-168" width="8" height="44" fill="#5C3A21" />
                <polygon points="0,-206 -64,-166 64,-166" fill="#9A5B25" stroke="#3B2313" strokeWidth="3" />
                <line x1="0" y1="-206" x2="0" y2="-242" stroke="#1E293B" strokeWidth="3.5" />
                <polygon points="0,-240 34,-232 0,-222" fill="#EF4444" />
              </g>

              {/* Middle Lush Green Grass & Stacked Stone Ledge Where All 5 Vehicles Stand */}
              <path d="M0 475 Q400 462 800 472 T1600 468 L1600 900 L0 900 Z" fill="#16A34A" />
              <path d="M0 492 Q400 482 800 490 T1600 486 L1600 548 L0 548 Z" fill="#4ADE80" />
              <rect x="0" y="535" width="1600" height="365" fill="url(#vsLedgeRock)" />

              {/* Stacked Stone Rim Blocks along Ledge */}
              {Array.from({ length: 18 }).map((_, i) => (
                <rect
                  key={i}
                  x={i * 92}
                  y="526"
                  width="88"
                  height="42"
                  rx="8"
                  fill={i % 2 === 0 ? '#A67B5B' : '#8C6239'}
                  stroke="#3B2313"
                  strokeWidth="3"
                />
              ))}

              {/* Bottom Dirt & Grass Trail Foreground */}
              <path d="M0 785 Q800 755 1600 785 L1600 900 L0 900 Z" fill="#15803D" />
              <path d="M480 775 Q800 755 1120 775 L1260 900 L340 900 Z" fill="#B45309" opacity="0.75" />
            </svg>
          </div>

          {/* TOP HEADER ROW: Riveted Steel & Checkered Flag "VEHICLE SELECTION - Choose Your Ride" */}
          <div className="relative z-10 flex items-start justify-between px-3 sm:px-6 pt-2">
            {/* Left Spacer / Coins Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/90 border-2 border-amber-400 shadow-lg mt-2">
              <span className="text-amber-400 font-black">★</span>
              <span className="font-display font-black text-base sm:text-lg text-white font-mono-num">
                {saveData.coins.toLocaleString()}
              </span>
            </div>

            {/* Center Vehicle Selection Banner */}
            <div className="-mt-1">
              <VehicleSelectionHeaderBanner />
            </div>

            {/* Right Upgrade & Close Controls */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('UPGRADES');
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-950 text-slate-950 font-display font-black text-xs shadow-lg hover:brightness-110"
              >
                UPGRADES
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('MAIN_MENU');
                }}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border-2 border-slate-600 shadow-lg"
                title="Back to Main Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CENTER 5-VEHICLE LINEUP ON THE ROCKY LEDGE + 5 COLOR-CODED STAT CARDS BELOW */}
          <div className="relative z-10 my-auto px-2 sm:px-6 w-full max-w-[1440px] mx-auto">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3.5 items-end">
              {SHOWCASE_FIVE_VEHICLES.map((vId) => {
                const vSpec = getEffectiveVehicleSpec(vId, saveData.upgrades[vId]);
                const isSelected = saveData.selectedVehicle === vId;
                const theme = VEHICLE_CARD_THEMES[vId];

                return (
                  <div
                    key={vId}
                    onClick={() => handleSelectOrUnlockVehicle(vId)}
                    className="group cursor-pointer flex flex-col items-center"
                  >
                    {/* 1. Vehicle Showcase Area on the Rocky Ledge */}
                    <div
                      className={`relative flex flex-col items-center justify-end transition-all duration-300 ${
                        isSelected
                          ? '-translate-y-3 sm:-translate-y-5 scale-105 sm:scale-110 z-20'
                          : 'hover:-translate-y-1 opacity-95 hover:opacity-100'
                      }`}
                    >
                      {/* Radiant Golden Sunburst Aura behind Selected Vehicle */}
                      {isSelected && (
                        <div className="absolute -inset-6 sm:-inset-10 rounded-full bg-amber-300/35 blur-xl pointer-events-none animate-pulse" />
                      )}

                      <IllustratedVehicleArt
                        vehicleId={vId}
                        primaryColor={vSpec.primaryColor}
                        secondaryColor={vSpec.secondaryColor}
                        className="w-24 h-16 sm:w-44 sm:h-28 md:w-56 md:h-36 drop-shadow-[0_12px_14px_rgba(0,0,0,0.75)]"
                      />

                      {/* Glowing Golden Raised Stone Pedestal under Selected Vehicle */}
                      {isSelected ? (
                        <div className="w-full max-w-[230px] h-5 sm:h-7 -mt-2 rounded-t-2xl rounded-b-lg bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 border-2 border-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.85)]" />
                      ) : (
                        <div className="w-4/5 h-3 sm:h-4 -mt-1 rounded-full bg-black/35" />
                      )}
                    </div>

                    {/* 2. Color-Coded Metallic Vehicle Stat Card Below Ledge (Exact Match to Reference Image) */}
                    <div
                      className={`mt-2 w-full rounded-xl sm:rounded-2xl bg-slate-950/95 border-[2px] sm:border-[3px] transition-all duration-300 overflow-hidden shadow-2xl ${
                        isSelected
                          ? 'border-amber-300 ring-2 sm:ring-4 ring-amber-400/50 scale-[1.04] z-20 shadow-[0_0_28px_rgba(251,191,36,0.55)]'
                          : `${theme.borderColor} opacity-95 hover:opacity-100`
                      }`}
                    >
                      {/* Colored Beveled Top Title Banner ("Offroad Jeep", "Monster Truck", "Dune Buggy", "Dirt Bike", "Rally Car") */}
                      <div
                        className={`py-1 sm:py-2 px-1.5 text-center bg-gradient-to-b ${theme.headerBg} border-b-2 border-slate-950 shadow-inner`}
                      >
                        <h3
                          className={`font-display font-black italic text-[11px] sm:text-base md:text-lg tracking-tight truncate ${theme.headerText} drop-shadow`}
                        >
                          {vSpec.name}
                        </h3>
                      </div>

                      {/* 4 Stat Bars: Speed, Acceleration, Handling, Fuel */}
                      <div className="p-1.5 sm:p-3 space-y-1 sm:space-y-2 bg-gradient-to-b from-slate-900/95 to-slate-950">
                        {[
                          { label: 'Speed', val: vSpec.statSpeed },
                          { label: 'Acceleration', val: vSpec.statAcceleration },
                          { label: 'Handling', val: vSpec.statHandling },
                          { label: 'Fuel', val: vSpec.statFuel },
                        ].map((st) => (
                          <div
                            key={st.label}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2"
                          >
                            <span className="font-display font-bold text-[9px] sm:text-xs text-white truncate sm:w-20">
                              {st.label}
                            </span>
                            <div className="flex-1 h-2.5 sm:h-3.5 rounded-sm bg-slate-950 border border-slate-600 p-0.5 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-xs bg-gradient-to-r ${theme.barFill} transition-all duration-300`}
                                style={{ width: `${st.val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 6 CARTOON DRIVER SELECTOR STRIP (4 Male, 2 Female) WITH UNIQUE PERKS */}
            <div className="mt-2 sm:mt-3 bg-slate-950/90 border-2 border-amber-400/80 rounded-2xl p-2 sm:px-4 sm:py-2.5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-display font-black text-[10px] sm:text-xs uppercase">
                    6 Cartoon Drivers (4M · 2F)
                  </span>
                  <span className="font-display font-extrabold text-xs sm:text-sm text-white">
                    {activeDriverSpec.name}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-display font-bold text-emerald-300">
                  ★ Active Perk — {activeDriverSpec.perkTitle}: {activeDriverSpec.perkDescription}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                {DRIVER_ORDER.map((dId) => {
                  const drv = DRIVERS[dId];
                  const isDrvSelected = saveData.selectedDriver === dId;
                  return (
                    <button
                      key={dId}
                      onClick={() => handleSelectDriver(dId)}
                      className={`flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 rounded-xl border-2 transition-all text-left ${
                        isDrvSelected
                          ? 'bg-gradient-to-r from-amber-400/25 to-orange-500/25 border-amber-300 scale-[1.03] shadow-[0_0_16px_rgba(250,204,21,0.45)]'
                          : 'bg-slate-900/90 border-slate-700 hover:border-slate-400 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <CartoonDriverAvatar
                        driverId={dId}
                        className="w-8 h-8 sm:w-11 sm:h-11 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-display font-black text-[10px] sm:text-xs text-white truncate">
                            {drv.name}
                          </span>
                          <span
                            className={`px-1 rounded text-[9px] font-black ${
                              drv.gender === 'FEMALE'
                                ? 'bg-pink-500/30 text-pink-300 border border-pink-400/40'
                                : 'bg-sky-500/30 text-sky-300 border border-sky-400/40'
                            }`}
                          >
                            {drv.gender === 'FEMALE' ? 'F' : 'M'}
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-amber-300 font-semibold truncate">
                          {drv.perkTitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTTOM NAVIGATION BAR: Left Blue < Button, Center Golden "Select Vehicle" Button, Right Blue > Button */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 pb-3 sm:pb-5 pt-2">
            {/* Bottom-Left Glossy Blue < Arrow Button */}
            <button
              onClick={() => cycleGarageVehicle(-1)}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-sky-400 via-blue-500 to-blue-700 border-[3px] border-slate-950 shadow-[0_5px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.75)] flex items-center justify-center hover:brightness-110 active:translate-y-1 transition-all"
              aria-label="Previous Vehicle"
            >
              <ChevronLeft className="w-9 h-9 sm:w-12 sm:h-12 text-white stroke-[3.5] drop-shadow" />
            </button>

            {/* Bottom-Center Glossy Golden-Orange "Select Vehicle" Button */}
            <button
              onClick={startNewRun}
              className="px-10 sm:px-20 py-3 sm:py-4 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 border-[3px] border-slate-950 shadow-[0_6px_0_#451a03,0_12px_25px_rgba(0,0,0,0.8)] hover:brightness-105 active:translate-y-1 transition-all"
            >
              <span className="font-display font-black italic text-xl sm:text-3xl md:text-4xl tracking-wide text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                Select Vehicle
              </span>
            </button>

            {/* Bottom-Right Glossy Blue > Arrow Button */}
            <button
              onClick={() => cycleGarageVehicle(1)}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-sky-400 via-blue-500 to-blue-700 border-[3px] border-slate-950 shadow-[0_5px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.75)] flex items-center justify-center hover:brightness-110 active:translate-y-1 transition-all"
              aria-label="Next Vehicle"
            >
              <ChevronRight className="w-9 h-9 sm:w-12 sm:h-12 text-white stroke-[3.5] drop-shadow" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 4: VEHICLE UPGRADES (4 Vertical Part Cards + Green UPGRADE Button)
         =================================================================== */}
      {screen === 'UPGRADES' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-[3px] border-slate-600 shadow-2xl p-5 sm:p-7 flex flex-col justify-between max-h-[92vh] overflow-y-auto">
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 border-2 border-blue-300 shadow-lg">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                  Vehicle Upgrades ({activeVehicleSpec.name})
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-950 border-2 border-amber-400 font-mono-num text-white font-bold">
                  <span className="text-amber-400">★</span>
                  <span>{saveData.coins.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setScreen('MAIN_MENU')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4 Vertical Metallic Part Cards (Engine, Suspension, Tires, Fuel) matching Panel 4 */}
            <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {(['engine', 'suspension', 'tires', 'fuel'] as UpgradeCategory[]).map(
                (cat) => {
                  const info = UPGRADE_INFO[cat];
                  const lvl = saveData.upgrades[saveData.selectedVehicle][cat];
                  const isActive = selectedUpgradeCat === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedUpgradeCat(cat);
                      }}
                      className={`p-4 rounded-2xl border-[3px] flex flex-col items-center justify-between transition-all ${
                        isActive
                          ? 'bg-slate-800 border-amber-400 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                          : 'bg-slate-900/90 border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <div className="w-24 h-24 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-center mb-3 shadow-inner">
                        <UpgradePartIcon category={cat} />
                      </div>
                      <div className="font-display font-black text-lg text-white">
                        {info.name}
                      </div>
                      <div className="font-mono-num font-bold text-sm text-amber-400 mt-0.5">
                        Lv.{lvl}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {/* Selected Part Description */}
            <div className="text-center text-xs text-slate-300 mb-4">
              {UPGRADE_INFO[selectedUpgradeCat].description} (Current Level {currentUpgradeLevel}/{MAX_UPGRADE_LEVEL})
            </div>

            {/* Big Glossy Green UPGRADE Button with Coin Icon & Cost (Exact Match to Panel 4) */}
            <div className="flex justify-center">
              <button
                onClick={handleUpgradeSelectedPart}
                className="px-12 py-3 rounded-2xl bg-gradient-to-b from-lime-400 via-green-500 to-green-700 border-[3px] border-slate-950 shadow-[0_6px_0_#14532d] flex flex-col items-center hover:brightness-110 active:translate-y-1 transition-all"
              >
                <span className="font-display font-black text-2xl tracking-wider text-white drop-shadow">
                  UPGRADE
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-amber-400 border border-amber-800 flex items-center justify-center text-slate-950 font-black text-xs">
                    ★
                  </div>
                  <span className="font-display font-black text-xl text-white font-mono-num">
                    {currentUpgradeLevel >= MAX_UPGRADE_LEVEL
                      ? 'MAX'
                      : currentUpgradeCost.toLocaleString()}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 5: WORLD SELECTION (2x3 Grid of 6 Illustrated Worlds)
         =================================================================== */}
      {screen === 'WORLDS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border-[3px] border-slate-600 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 border-2 border-blue-300 shadow-lg">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                  World Selection
                </h2>
              </div>

              <button
                onClick={() => setScreen('MAIN_MENU')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2x3 Grid Matching Panel 5 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {WORLD_ORDER.map((wId) => {
                const w = WORLDS[wId];
                const isSelected = saveData.selectedWorld === wId;
                const isUnlocked = saveData.unlockedWorlds.includes(wId);

                return (
                  <button
                    key={wId}
                    onClick={() => handleSelectOrUnlockWorld(wId)}
                    className={`group rounded-2xl overflow-hidden border-[3px] flex flex-col transition-all ${
                      isSelected
                        ? 'border-amber-400 scale-[1.03] shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                        : 'border-slate-500 hover:border-white'
                    }`}
                  >
                    <div className="w-full h-28 sm:h-32 relative overflow-hidden">
                      <WorldLandscapeThumb worldId={wId} />
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-display font-black text-xs">
                            Unlock: {w.unlockCost} ★
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-full py-2.5 px-3 bg-slate-950 text-center border-t-2 border-slate-700">
                      <span className="font-display font-extrabold text-base sm:text-lg text-white">
                        {w.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 6: GAMEPLAY SCREEN + NEW 'STUNT COMBO' HUD INDICATOR
         =================================================================== */}
      {screen === 'PLAYING' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
          {/* TOP BAR (Matching Panel 6) */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left: Red Jerrycan + Glossy Green Fuel Bar + Gold Coin Counter */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/75 border-2 border-slate-700 rounded-2xl px-3.5 py-2 shadow-xl">
              {/* Fuel Jerrycan + Bar */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-8 rounded-md bg-red-600 border-2 border-slate-950 flex items-center justify-center text-white font-black text-xs shadow">
                  ⛽
                </div>
                <div className="w-28 sm:w-36 h-5 rounded-md bg-slate-900 border-2 border-slate-950 p-0.5 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-xs transition-all duration-150 ${
                      hudState.fuel <= 25
                        ? 'bg-gradient-to-r from-red-600 to-red-400'
                        : 'bg-gradient-to-r from-green-600 via-lime-400 to-green-400'
                    }`}
                    style={{ width: `${Math.max(0, hudState.fuel)}%` }}
                  />
                </div>
              </div>

              {/* Gold Coin Icon + Counter ("1250") */}
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 font-black text-xs shadow">
                  ★
                </div>
                <span className="font-display font-black text-xl text-white font-mono-num drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
                  {saveData.coins + hudState.runCoins}
                </span>
              </div>
            </div>

            {/* Top-Center: Active Cartoon Driver + Vehicle + Distance + Turbo/G-Force Bars + STUNT COMBO */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-3 bg-slate-950/80 border-2 border-slate-700 rounded-2xl px-4 py-1.5 shadow-xl">
                <CartoonDriverAvatar
                  driverId={saveData.selectedDriver}
                  className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
                />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs text-amber-400 font-display font-extrabold tracking-wider uppercase">
                    {activeVehicleSpec.name} · {activeDriverSpec.name}
                  </span>
                  <span className="font-display font-black text-xl sm:text-2xl text-white font-mono-num drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
                    {hudState.distance}m
                  </span>
                </div>
              </div>

              {/* Realistic Physics Gauges: Turbo Boost / Temp & Driver Bounce G-Force Strain */}
              <div className="flex items-center gap-2 bg-slate-950/75 border border-slate-700 rounded-xl px-3 py-1 shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-display font-black text-orange-400 uppercase">
                    {hudState.isOverheated ? 'OVERHEAT!' : 'TURBO'}
                  </span>
                  <div className="w-16 sm:w-20 h-2.5 rounded-sm bg-slate-900 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        hudState.isOverheated
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500'
                      }`}
                      style={{
                        width: `${Math.max(hudState.turboBoost, hudState.engineTemp)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-display font-black text-sky-300 uppercase">
                    G-BOUNCE
                  </span>
                  <div className="w-16 sm:w-20 h-2.5 rounded-sm bg-slate-900 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        hudState.driverStrain > 70
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-gradient-to-r from-sky-400 via-amber-400 to-red-500'
                      }`}
                      style={{ width: `${Math.min(100, hudState.driverStrain)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  NEW 'STUNT COMBO' INDICATOR IN GAMEPLAY HUD
                  Appears during jumps when the user performs air flips, showing
                  multiplier (x2, x3, x4...) and flip label with arcade styling!
                 =============================================================== */}
              {hudState.stuntComboTimer > 0 && (
                <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 border-[3px] border-yellow-200 shadow-[0_6px_0_#451a03,0_0_30px_rgba(250,204,21,0.85)] animate-bounce">
                  <Flame className="w-7 h-7 text-yellow-200 fill-yellow-300 shrink-0 drop-shadow" />
                  <div className="flex flex-col items-start">
                    <span className="font-display font-black italic text-xs sm:text-sm tracking-widest text-yellow-100 uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
                      STUNT COMBO · {hudState.stuntComboLabel || 'AIR FLIP!'}
                    </span>
                    <span className="font-display font-bold text-[11px] text-amber-100">
                      +{150 * Math.max(2, hudState.stuntComboMultiplier)} BONUS COINS
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-slate-950 border-2 border-yellow-300 shadow-inner">
                    <span className="font-display font-black italic text-2xl sm:text-3xl text-yellow-300 drop-shadow-[0_2px_4px_rgba(250,204,21,0.8)]">
                      x{Math.max(2, hudState.stuntComboMultiplier)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right: 3D/2D Switcher + Weather Switcher (Panel 8) + Golden Square Pause Button (Panel 6) */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={toggleRenderMode}
                className="px-3 py-2 rounded-xl bg-slate-950/85 border-2 border-amber-400 text-amber-300 font-display font-black text-xs shadow-lg hover:bg-slate-900"
                title="Toggle Full 3D PBR WebGL / 2D Illustrated Mode"
              >
                {saveData.settings.renderMode === 'HYBRID_3D' ? '3D PBR' : '2D ART'}
              </button>

              <button
                onClick={cycleWeatherOverride}
                className="p-2.5 rounded-xl bg-slate-950/80 border-2 border-slate-600 text-sky-300 hover:border-amber-400 shadow-lg"
                title="Cycle Dynamic Weather (Sunny / Rain / Snow / Night)"
              >
                {saveData.settings.weatherOverride === 'RAIN' ? (
                  <CloudRain className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-400" />
                )}
              </button>

              <button
                onClick={() => {
                  soundEngine.stopEngine();
                  setScreen('PAUSED');
                }}
                className="w-11 h-11 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-[3px] border-slate-950 flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95"
                aria-label="Pause"
              >
                <Pause className="w-5 h-5 text-slate-950 fill-current" />
              </button>
            </div>
          </div>

          {/* BOTTOM BAR: Metallic BRAKE Pedal + Circular Analog Speedometer + Metallic GAS Pedal (Exact Match to Panel 6) */}
          <div className="flex items-end justify-between gap-4">
            {/* LEFT: Brushed Silver Metallic BRAKE Pedal with 4 Grip Dots */}
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                inputsRef.current.brakeHeld = true;
                setPedalVisualState((p) => ({ ...p, brake: true }));
              }}
              onPointerUp={() => {
                inputsRef.current.brakeHeld = false;
                setPedalVisualState((p) => ({ ...p, brake: false }));
              }}
              onPointerCancel={() => {
                inputsRef.current.brakeHeld = false;
                setPedalVisualState((p) => ({ ...p, brake: false }));
              }}
              className={`pointer-events-auto w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 border-[4px] border-slate-900 shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between p-3 transition-transform ${
                pedalVisualState.brake ? 'scale-92 brightness-90 translate-y-1' : ''
              }`}
            >
              {/* 4 Black Metallic Grip Dots */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mt-1">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
              </div>
              <span className="font-display font-black text-base sm:text-lg tracking-wider text-slate-950">
                BRAKE
              </span>
            </button>

            {/* CENTER: Circular Analog Speedometer Gauge ("72 KM/H") */}
            <div className="flex flex-col items-center">
              {saveData.settings.showTelemetry && (
                <div className="mb-1 px-3 py-0.5 rounded-md bg-slate-950/75 text-[11px] font-mono-num text-slate-300">
                  {hudState.fps} FPS · Shock {hudState.rearCompMm}mm
                </div>
              )}
              <AnalogSpeedometerDial speedKmh={hudState.speedKmh} />
            </div>

            {/* RIGHT: Brushed Silver Metallic GAS Pedal with 4 Grip Dots */}
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                inputsRef.current.gasHeld = true;
                setPedalVisualState((p) => ({ ...p, gas: true }));
              }}
              onPointerUp={() => {
                inputsRef.current.gasHeld = false;
                setPedalVisualState((p) => ({ ...p, gas: false }));
              }}
              onPointerCancel={() => {
                inputsRef.current.gasHeld = false;
                setPedalVisualState((p) => ({ ...p, gas: false }));
              }}
              className={`pointer-events-auto w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 border-[4px] border-slate-900 shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between p-3 transition-transform ${
                pedalVisualState.gas ? 'scale-92 brightness-90 translate-y-1' : ''
              }`}
            >
              {/* 4 Black Metallic Grip Dots */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mt-1">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-inner" />
              </div>
              <span className="font-display font-black text-base sm:text-lg tracking-wider text-slate-950">
                GAS
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 12: PAUSE MENU (Resume, Restart, Settings, Main Menu)
         =================================================================== */}
      {screen === 'PAUSED' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4 pointer-events-auto">
          <div className="w-full max-w-xs flex flex-col gap-3.5 items-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center mb-1 shadow-xl">
              <Pause className="w-7 h-7 text-white fill-current" />
            </div>

            {[
              {
                label: 'Resume',
                action: () => {
                  soundEngine.playClick();
                  if (saveData.settings.engineSoundOn) soundEngine.startEngine();
                  setScreen('PLAYING');
                },
              },
              { label: 'Restart', action: startNewRun },
              {
                label: 'Settings',
                action: () => {
                  soundEngine.playClick();
                  setScreen('SETTINGS');
                },
              },
              {
                label: 'Main Menu',
                action: () => {
                  soundEngine.playClick();
                  setScreen('MAIN_MENU');
                },
              },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_5px_0_#451a03] font-display font-black text-xl text-slate-950 hover:brightness-105 active:translate-y-1 transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 13: GAME OVER SCREEN (Red 3D Title, Ejection Reason, Distance, Coins, Restart & Main Menu)
         =================================================================== */}
      {screen === 'GAME_OVER' && runSummary && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 pointer-events-auto">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900/95 border-[3px] border-slate-700 p-6 shadow-2xl flex flex-col items-center text-center">
            <h2 className="font-display font-black italic text-5xl sm:text-6xl text-red-500 drop-shadow-[0_5px_0_#090d16] tracking-wide">
              GAME OVER
            </h2>

            <div className="mt-2 px-4 py-1 rounded-xl bg-red-500/20 border border-red-400/50 text-amber-300 font-display font-black text-sm uppercase tracking-wider">
              {runSummary.deathReason === 'DRIVER_EJECTED'
                ? `${activeDriverSpec.name.toUpperCase()} EJECTED ON EXTREME BOUNCE!`
                : runSummary.deathReason === 'OUT_OF_FUEL'
                ? 'OUT OF FUEL!'
                : 'VEHICLE ROLLOVER CRASH!'}
            </div>

            <div className="my-4 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex items-center">
                <IllustratedVehicleArt
                  vehicleId={activeVehicleSpec.id}
                  primaryColor={activeVehicleSpec.primaryColor}
                  secondaryColor={activeVehicleSpec.secondaryColor}
                  className="w-44 h-28"
                  tilted
                />
                <CartoonDriverAvatar
                  driverId={saveData.selectedDriver}
                  className="w-14 h-14 -ml-6 mt-10 drop-shadow-lg"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <div className="font-display font-extrabold text-2xl text-white font-mono-num">
                  Distance: {runSummary.distance} m
                </div>
                <div className="font-display font-extrabold text-2xl text-amber-400 font-mono-num">
                  Coins: {saveData.coins}
                </div>
                <div className="text-xs text-slate-400">
                  Run Earned: +{runSummary.coinsCollected} Coins · Best: {runSummary.bestDistance}m
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 w-full max-w-sm">
              <button
                onClick={startNewRun}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_5px_0_#451a03] font-display font-black text-xl text-slate-950 hover:brightness-105 active:translate-y-1"
              >
                Restart
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('MAIN_MENU');
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-[3px] border-slate-950 shadow-[0_5px_0_#451a03] font-display font-black text-xl text-slate-950 hover:brightness-105 active:translate-y-1"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 10 & PANEL 14: GRAPHICS & AUDIO SETTINGS
         =================================================================== */}
      {screen === 'SETTINGS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border-[3px] border-slate-600 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettingsTab('GRAPHICS')}
                  className={`px-4 py-2 rounded-xl font-display font-black text-sm transition-colors ${
                    settingsTab === 'GRAPHICS'
                      ? 'bg-blue-600 text-white border-2 border-blue-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Graphics Quality
                </button>
                <button
                  onClick={() => setSettingsTab('AUDIO')}
                  className={`px-4 py-2 rounded-xl font-display font-black text-sm transition-colors ${
                    settingsTab === 'AUDIO'
                      ? 'bg-blue-600 text-white border-2 border-blue-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Audio & Sound
                </button>
              </div>
              <button
                onClick={() => setScreen('MAIN_MENU')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsTab === 'GRAPHICS' ? (
              <div className="mt-5 space-y-5">
                <h3 className="text-center font-display font-black text-2xl text-white">
                  Graphics Quality
                </h3>

                <div className="grid grid-cols-4 gap-2 p-2 rounded-2xl bg-slate-950 border-2 border-slate-700">
                  {(
                    [
                      { id: 'LOW', label: 'Low' },
                      { id: 'MEDIUM', label: 'Medium' },
                      { id: 'HIGH', label: 'High' },
                      { id: 'ULTRA', label: 'Ultra' },
                    ] as { id: GraphicsQuality; label: string }[]
                  ).map((q) => {
                    const active = saveData.settings.graphicsQuality === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() =>
                          setSaveData((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, graphicsQuality: q.id },
                          }))
                        }
                        className={`py-2.5 rounded-xl font-display font-black text-base transition-all ${
                          active
                            ? 'bg-gradient-to-b from-lime-400 to-green-600 text-white border-2 border-lime-200 shadow-lg'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {q.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-around py-2">
                  <button
                    onClick={() =>
                      setSaveData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          showTelemetry: !prev.settings.showTelemetry,
                        },
                      }))
                    }
                    className="flex items-center gap-2.5 font-display font-bold text-base text-white"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
                        saveData.settings.showTelemetry
                          ? 'bg-lime-500 border-lime-200 text-slate-950'
                          : 'bg-slate-800 border-slate-600'
                      }`}
                    >
                      {saveData.settings.showTelemetry && <Check className="w-5 h-5 stroke-[3]" />}
                    </div>
                    <span>Show FPS</span>
                  </button>

                  <button
                    onClick={() =>
                      setSaveData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          hapticsEnabled: !prev.settings.hapticsEnabled,
                        },
                      }))
                    }
                    className="flex items-center gap-2.5 font-display font-bold text-base text-white"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
                        saveData.settings.hapticsEnabled
                          ? 'bg-lime-500 border-lime-200 text-slate-950'
                          : 'bg-slate-800 border-slate-600'
                      }`}
                    >
                      {saveData.settings.hapticsEnabled && <Check className="w-5 h-5 stroke-[3]" />}
                    </div>
                    <span>Vibration</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(
                    [
                      { id: 'HYBRID_3D', label: 'Full 3D PBR WebGL (Default)' },
                      { id: 'ILLUSTRATED_2D', label: '2D Illustrated Art' },
                    ] as { id: RenderMode; label: string }[]
                  ).map((rm) => (
                    <button
                      key={rm.id}
                      onClick={() =>
                        setSaveData((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, renderMode: rm.id },
                        }))
                      }
                      className={`py-2 px-3 rounded-xl font-display font-bold text-xs border-2 ${
                        saveData.settings.renderMode === rm.id
                          ? 'bg-amber-400 border-white text-slate-950'
                          : 'bg-slate-950 border-slate-700 text-slate-300'
                      }`}
                    >
                      {rm.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setScreen('MAIN_MENU');
                    }}
                    className="px-14 py-3 rounded-2xl bg-gradient-to-b from-lime-400 via-green-500 to-green-700 border-[3px] border-slate-950 shadow-[0_5px_0_#14532d] font-display font-black text-xl text-white"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 flex flex-col items-center">
                  <svg viewBox="0 0 140 120" className="w-36 h-32">
                    <circle cx="70" cy="60" r="52" fill="rgba(56, 189, 248, 0.15)" />
                    <polygon points="28,45 52,45 82,22 82,98 52,75 28,75" fill="#94A3B8" stroke="#0F172A" strokeWidth="4" />
                    <ellipse cx="82" cy="60" rx="14" ry="38" fill="#334155" stroke="#0F172A" strokeWidth="4" />
                    <path d="M102 38 Q118 60 102 82" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                    <path d="M112 26 Q134 60 112 94" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  {[
                    {
                      key: 'engineSoundOn' as const,
                      label: 'Engine Sound',
                    },
                    {
                      key: 'coinSoundOn' as const,
                      label: 'Coin Sound',
                    },
                    {
                      key: 'musicAmbienceOn' as const,
                      label: 'Music & Ambience',
                    },
                    {
                      key: 'soundSettingsOn' as const,
                      label: 'Sound Settings',
                    },
                  ].map((item) => {
                    const checked = saveData.settings[item.key];
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          setSaveData((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              [item.key]: !prev.settings[item.key],
                            },
                          }))
                        }
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
                            checked
                              ? 'bg-lime-500 border-lime-200 text-slate-950'
                              : 'bg-slate-800 border-slate-600'
                          }`}
                        >
                          {checked && <Check className="w-5 h-5 stroke-[3]" />}
                        </div>
                        <span className="font-display font-bold text-lg text-white">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 11: MISSIONS & REWARDS (Wooden Board + Gift Box + Green CLAIM)
         =================================================================== */}
      {screen === 'MISSIONS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[4px] border-amber-950 p-5 shadow-2xl relative">
            <button
              onClick={() => setScreen('MAIN_MENU')}
              className="absolute top-4 right-4 p-2 rounded-xl bg-amber-950 text-amber-200 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="rounded-2xl bg-amber-100 border-[3px] border-amber-900 p-5 text-slate-900 shadow-inner">
              <div className="mx-auto max-w-xs py-1.5 px-4 rounded-xl bg-amber-300 border-2 border-amber-700 text-center mb-4">
                <h2 className="font-display font-black text-xl text-amber-950">
                  Complete Missions
                </h2>
              </div>

              <div className="space-y-3">
                {saveData.missions.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-300"
                  >
                    <div className="flex items-center gap-2.5">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-400 shrink-0" />
                      <div>
                        <div className="font-display font-black text-base text-slate-900">
                          {m.title}
                        </div>
                        <div className="text-xs text-slate-600 font-mono-num">
                          {m.progress} / {m.target} · +{m.rewardCoins} Coins
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-display font-bold text-xs ${
                        m.claimed
                          ? 'bg-slate-300 text-slate-600'
                          : m.completed
                          ? 'bg-lime-500 text-slate-950'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {m.claimed ? 'Claimed' : m.completed ? 'Ready!' : 'In Progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={handleClaimAllReadyMissions}
                className="px-14 py-3 rounded-2xl bg-gradient-to-b from-lime-400 via-green-500 to-green-700 border-[3px] border-slate-950 shadow-[0_5px_0_#14532d] font-display font-black text-2xl text-white"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 15: DAILY REWARDS (Treasure Chest + Day 1 1000 Coins + Claim)
         =================================================================== */}
      {screen === 'DAILY_REWARD' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-sky-800 via-slate-900 to-slate-950 border-[3px] border-amber-400 p-6 shadow-2xl flex flex-col items-center text-center relative">
            <button
              onClick={() => setScreen('MAIN_MENU')}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-8 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 border-2 border-slate-950 shadow-lg">
              <h2 className="font-display font-black text-2xl text-white drop-shadow">
                Daily Reward
              </h2>
            </div>

            <div className="my-6 flex items-center gap-6">
              <svg viewBox="0 0 140 120" className="w-36 h-32 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                <ellipse cx="70" cy="102" rx="58" ry="12" fill="#FACC15" />
                <rect x="24" y="54" width="92" height="46" rx="6" fill="#92400E" stroke="#451A03" strokeWidth="4" />
                <path d="M20 54 Q70 24 120 54 Z" fill="#B45309" stroke="#451A03" strokeWidth="4" />
                <rect x="38" y="38" width="10" height="62" fill="#FACC15" stroke="#451A03" strokeWidth="2" />
                <rect x="92" y="38" width="10" height="62" fill="#FACC15" stroke="#451A03" strokeWidth="2" />
                <rect x="62" y="48" width="16" height="20" rx="3" fill="#FEF08A" stroke="#451A03" strokeWidth="2.5" />
              </svg>

              <div className="text-left">
                <div className="font-display font-black text-3xl text-white">
                  Day {saveData.dailyStreak}
                </div>
                <div className="font-display font-black text-xl text-amber-400 mt-1">
                  1000 Coins
                </div>
              </div>
            </div>

            <button
              onClick={handleClaimDailyChest}
              className="px-14 py-3 rounded-2xl bg-gradient-to-b from-lime-400 via-green-500 to-green-700 border-[3px] border-slate-950 shadow-[0_5px_0_#14532d] font-display font-black text-2xl text-white hover:brightness-110 active:translate-y-1"
            >
              Claim
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANEL 16: ACHIEVEMENTS & PROGRESS (Trophy + Progress Bar + Star Rows)
         =================================================================== */}
      {screen === 'ACHIEVEMENTS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border-[3px] border-slate-600 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Trophy className="w-10 h-10 text-amber-400" />
                <div>
                  <h2 className="font-display font-black text-2xl text-white">
                    Achievements
                  </h2>
                  <div className="w-48 h-4 rounded-full bg-slate-800 border border-slate-600 p-0.5 mt-1">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: '45%' }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setScreen('MAIN_MENU')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {saveData.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-400 border-2 border-slate-950 flex items-center justify-center text-slate-950">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <div className="font-display font-black text-lg text-white">
                        {ach.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {ach.description} ({ach.progress}/{ach.target})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-display font-black text-xl text-amber-400 font-mono-num">
                    <Star className="w-5 h-5 fill-current" />
                    <span>{ach.rewardStars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          ANDROID NATIVE KOTLIN PROJECT EXPORT MODAL
         =================================================================== */}
      {screen === 'ANDROID_EXPORT' && (
        <AndroidProjectModal onClose={() => setScreen('MAIN_MENU')} />
      )}
    </div>
  );
}
