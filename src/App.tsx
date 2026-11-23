/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Coins,
  Flag,
  Fuel,
  Gauge,
  MapPin,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Smartphone,
  Star,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { GarageModal } from './components/GarageModal';
import { LevelsModal } from './components/LevelsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RacingHUD } from './components/RacingHUD';
import { SettingsModal } from './components/SettingsModal';
import { RacingAudioEngine } from './game/audio';
import {
  BIOMES,
  CARS,
  DEFAULT_UPGRADES,
  getEffectiveCarStats,
  getUpgradeCost,
  INITIAL_SAVE_STATE,
  LEVELS,
  loadSaveState,
  persistSaveState,
  TOTAL_LEVELS,
} from './game/data';
import { RacingCanvas } from './game/RacingCanvas';
import type {
  BiomeId,
  CameraPreset,
  CarUpgrades,
  GameStatus,
  InputState,
  LevelConfig,
  LiveTelemetry,
  SaveState,
} from './game/types';

const INITIAL_TELEMETRY: LiveTelemetry = {
  speedKmh: 0,
  rpm: 900,
  gear: 1,
  fuelPct: 100,
  integrityPct: 100,
  distanceM: 0,
  targetDistanceM: 1000,
  score: 0,
  sessionCoins: 0,
  closePasses: 0,
  levelNumber: 1,
  status: 'menu',
  eventText: null,
  eventTone: 'info',
};

export default function App() {
  const [save, setSave] = useState<SaveState>(() => loadSaveState());
  const [status, setStatus] = useState<GameStatus>('menu');
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(LEVELS[0]);
  const [endlessBiome, setEndlessBiome] = useState<BiomeId>('city');
  const [menuPreviewEndless, setMenuPreviewEndless] = useState(false);
  const [showMiniCar, setShowMiniCar] = useState(true);
  const [runNonce, setRunNonce] = useState(1);

  const [showGarage, setShowGarage] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'controls' | 'playstore'>(
    'controls'
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [telemetry, setTelemetry] = useState<LiveTelemetry>(INITIAL_TELEMETRY);
  const [finalOutcome, setFinalOutcome] = useState<{
    outcome: 'won' | 'crashed' | 'out_of_fuel';
    telemetry: LiveTelemetry;
    stars: number;
  } | null>(null);

  const inputRef = useRef<InputState>({
    steer: 0,
    throttle: false,
    brake: false,
    boost: false,
    horn: false,
  });

  const audio = useMemo(() => new RacingAudioEngine(), []);

  useEffect(() => {
    audio.setEnabled(save.soundEnabled);
  }, [audio, save.soundEnabled]);

  useEffect(() => {
    persistSaveState(save);
  }, [save]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    return () => audio.dispose();
  }, [audio]);

  const currentCar = useMemo(
    () => CARS.find((c) => c.id === save.selectedCarId) ?? CARS[0],
    [save.selectedCarId]
  );

  const currentUpgrades = useMemo(
    () => save.upgradesByCar[currentCar.id] ?? DEFAULT_UPGRADES,
    [save.upgradesByCar, currentCar.id]
  );

  const currentStats = useMemo(
    () => getEffectiveCarStats(currentCar, currentUpgrades),
    [currentCar, currentUpgrades]
  );

  const cycleCamera = useCallback(() => {
    const order: CameraPreset[] = ['cockpit', 'chase', 'dash', 'hood'];
    setSave((prev) => {
      const next = order[(order.indexOf(prev.cameraPreset) + 1) % order.length];
      return { ...prev, cameraPreset: next };
    });
  }, []);

  const handleToggleMotionSteer = useCallback(async () => {
    const turningOn =
      save.controlMode !== 'arrows_motion' && save.controlMode !== 'tilt';
    if (turningOn) {
      const DevOrient = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DevOrient?.requestPermission === 'function') {
        try {
          await DevOrient.requestPermission();
        } catch {
          // ignore
        }
      }
      const DevMotion = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DevMotion?.requestPermission === 'function') {
        try {
          await DevMotion.requestPermission();
        } catch {
          // ignore
        }
      }
      setSave((prev) => ({ ...prev, controlMode: 'arrows_motion' }));
    } else {
      setSave((prev) => ({ ...prev, controlMode: 'buttons' }));
    }
  }, [save.controlMode]);

  // Keyboard controls
  useEffect(() => {
    const keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false,
      horn: false,
    };

    const syncKeys = () => {
      inputRef.current.steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      inputRef.current.throttle = keys.up || keys.space;
      inputRef.current.brake = keys.down;
      inputRef.current.boost = keys.space;
      inputRef.current.horn = keys.horn;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      audio.unlock();
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
      if (e.code === 'Space') keys.space = true;
      if (e.code === 'KeyH') keys.horn = true;
      if (e.code === 'KeyC') cycleCamera();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setStatus((prev) =>
          prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev
        );
      }
      syncKeys();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
      if (e.code === 'Space') keys.space = false;
      if (e.code === 'KeyH') keys.horn = false;
      syncKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [audio, cycleCamera]);

  // Android / Mobile Hybrid Tilt + Shake Steering (works alongside Left/Right arrows!)
  useEffect(() => {
    const motionActive =
      save.controlMode === 'tilt' || save.controlMode === 'arrows_motion';
    if (!motionActive || status !== 'playing') return;

    let orientationSteer = 0;
    let shakeImpulse = 0;
    let wasMotionSteering = false;
    let lastAccel = 0;

    const applySteer = () => {
      const combined = Math.max(
        -1,
        Math.min(1, orientationSteer + shakeImpulse)
      );
      if (Math.abs(combined) > 0.09) {
        inputRef.current.steer = combined;
        wasMotionSteering = true;
      } else if (wasMotionSteering) {
        inputRef.current.steer = 0;
        wasMotionSteering = false;
      }
      shakeImpulse *= 0.85;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const raw = isLandscape ? e.beta ?? 0 : e.gamma ?? 0;
      orientationSteer = Math.max(-1, Math.min(1, raw / 26));
      applySteer();
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const acc = e.acceleration ?? e.accelerationIncludingGravity;
      if (!acc) return;
      const lateral = isLandscape ? acc.y ?? 0 : acc.x ?? 0;
      // Detect crisp lateral shake/flick impulses as well as sustained device lean
      const delta = lateral - lastAccel;
      lastAccel = lateral;
      if (Math.abs(delta) > 2.4 && e.acceleration) {
        shakeImpulse = Math.max(-1, Math.min(1, delta / 7.5));
      } else if (!e.acceleration && e.accelerationIncludingGravity) {
        // Fallback when only gravity+motion is reported: map lateral tilt cleanly
        orientationSteer = Math.max(-1, Math.min(1, -lateral / 5.5));
      }
      applySteer();
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      if (wasMotionSteering) inputRef.current.steer = 0;
    };
  }, [save.controlMode, status]);

  const startRace = (level: LevelConfig | null) => {
    audio.unlock();
    inputRef.current = {
      steer: 0,
      throttle: false,
      brake: false,
      boost: false,
      horn: false,
    };
    setActiveLevel(level);
    setMenuPreviewEndless(level === null);
    setFinalOutcome(null);
    setShowGarage(false);
    setShowLevels(false);
    setShowSettings(false);
    setRunNonce((n) => n + 1);
    setStatus('playing');
  };

  const handleRaceEnd = useCallback(
    (
      outcome: 'won' | 'crashed' | 'out_of_fuel',
      finalTel: LiveTelemetry
    ) => {
      inputRef.current = {
        steer: 0,
        throttle: false,
        brake: false,
        boost: false,
        horn: false,
      };
      setStatus(outcome);

      let stars = 0;
      if (outcome === 'won') {
        stars = 1;
        if (finalTel.integrityPct >= 75) stars += 1;
        if (finalTel.fuelPct >= 20 && finalTel.closePasses >= 2) stars += 1;
        else if (finalTel.integrityPct >= 95) stars = 3;
      }

      setFinalOutcome({ outcome, telemetry: finalTel, stars });

      setSave((prev) => {
        const nextCoins = prev.coins + finalTel.sessionCoins;
        const nextStars = { ...prev.levelStars };
        let nextHighest = prev.highestUnlockedLevel;

        if (outcome === 'won' && finalTel.levelNumber > 0) {
          nextStars[finalTel.levelNumber] = Math.max(
            nextStars[finalTel.levelNumber] ?? 0,
            stars
          );
          if (
            finalTel.levelNumber >= prev.highestUnlockedLevel &&
            prev.highestUnlockedLevel < TOTAL_LEVELS
          ) {
            nextHighest = finalTel.levelNumber + 1;
          }
        }

        const nextBestEndless =
          finalTel.levelNumber === 0
            ? Math.max(prev.bestEndlessScore, finalTel.score)
            : prev.bestEndlessScore;

        return {
          ...prev,
          coins: nextCoins,
          highestUnlockedLevel: nextHighest,
          levelStars: nextStars,
          bestEndlessScore: nextBestEndless,
        };
      });
    },
    []
  );

  const handleBuyCar = (carId: string) => {
    const spec = CARS.find((c) => c.id === carId);
    if (!spec) return;
    setSave((prev) => {
      if (prev.unlockedCars.includes(carId) || prev.coins < spec.unlockCost)
        return prev;
      return {
        ...prev,
        coins: prev.coins - spec.unlockCost,
        unlockedCars: [...prev.unlockedCars, carId],
        selectedCarId: carId,
        upgradesByCar: {
          ...prev.upgradesByCar,
          [carId]: prev.upgradesByCar[carId] ?? { ...DEFAULT_UPGRADES },
        },
      };
    });
  };

  const handleUpgradeCar = (carId: string, stat: keyof CarUpgrades) => {
    const spec = CARS.find((c) => c.id === carId);
    if (!spec) return;
    setSave((prev) => {
      const upg = prev.upgradesByCar[carId] ?? { ...DEFAULT_UPGRADES };
      const curLvl = upg[stat];
      if (curLvl >= 5) return prev;
      const cost = getUpgradeCost(stat, curLvl, spec.unlockCost);
      if (prev.coins < cost) return prev;

      return {
        ...prev,
        coins: prev.coins - cost,
        upgradesByCar: {
          ...prev.upgradesByCar,
          [carId]: {
            ...upg,
            [stat]: curLvl + 1,
          },
        },
      };
    });
  };

  const handleClaimBonusCoins = () => {
    audio.unlock();
    audio.playPickup('coin');
    setSave((prev) => ({ ...prev, coins: prev.coins + 250 }));
  };

  const nextCareerLevel =
    LEVELS.find((l) => l.levelNumber === save.highestUnlockedLevel) ??
    LEVELS[0];

  const biomeList: { id: BiomeId; label: string }[] = [
    { id: 'city', label: 'City' },
    { id: 'mountain', label: 'Mountain' },
    { id: 'desert', label: 'Desert' },
    { id: 'coastal', label: 'Coastal' },
    { id: 'night', label: 'Night' },
  ];

  const canvasLevel =
    status === 'menu'
      ? menuPreviewEndless
        ? null
        : nextCareerLevel
      : activeLevel;

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Fullscreen 3D Cockpit Racing Viewport */}
      <RacingCanvas
        carId={save.selectedCarId}
        upgrades={currentUpgrades}
        level={canvasLevel}
        endlessBiome={endlessBiome}
        status={status}
        cameraPreset={save.cameraPreset}
        showMiniCar={showMiniCar}
        runNonce={runNonce}
        inputRef={inputRef}
        audio={audio}
        onTelemetry={setTelemetry}
        onRaceEnd={handleRaceEnd}
      />

      {/* Offline Status Toast */}
      {!isOnline && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 shadow">
          Offline Mode — Ready to Race
        </div>
      )}

      {/* Active Gameplay HUD */}
      {status === 'playing' && (
        <RacingHUD
          telemetry={telemetry}
          level={activeLevel}
          controlMode={save.controlMode}
          cameraPreset={save.cameraPreset}
          showMiniCar={showMiniCar}
          inputRef={inputRef}
          onPause={() => setStatus('paused')}
          onCycleCamera={cycleCamera}
          onSelectCamera={(preset) =>
            setSave((prev) => ({ ...prev, cameraPreset: preset }))
          }
          onToggleMotionSteer={handleToggleMotionSteer}
          onToggleMiniCar={() => setShowMiniCar((v) => !v)}
        />
      )}

      {/* Main Menu Overlay (Unobstructed Center Cockpit View) */}
      {status === 'menu' && (
        <div
          className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5"
          onPointerDown={() => audio.unlock()}
        >
          {/* Top Bar */}
          <header className="pointer-events-auto flex items-center justify-between gap-3">
            <div className="bg-[#111318]/90 border border-white/15 rounded-md px-3.5 py-2 flex items-center gap-3">
              <div className="w-2.5 h-6 rounded-xs bg-amber-400" />
              <div>
                <h1 className="font-display text-base sm:text-xl font-bold tracking-wider text-white leading-none whitespace-nowrap">
                  NEW BABY DRIVER
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  3D Cockpit Highway Racing · {TOTAL_LEVELS} Levels
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block">
                <PWAInstallButton compact />
              </div>

              {/* Coin Counter (Screenshot 3 style) */}
              <div className="flex items-center gap-2 bg-[#111318]/90 border border-white/15 rounded-md px-3 py-1.5">
                <span className="font-mono-tabular text-sm font-bold text-white">
                  {save.coins}
                </span>
                <Coins className="w-4 h-4 text-amber-400" />
                <button
                  type="button"
                  onClick={handleClaimBonusCoins}
                  title="Claim +250 Coins"
                  className="flex items-center justify-center w-6 h-6 rounded-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSave((p) => ({ ...p, soundEnabled: !p.soundEnabled }))
                }
                aria-label="Toggle audio"
                className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111318]/90 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer"
              >
                {save.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsTab('playstore');
                  setShowSettings(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 h-10 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">APK / Play Store</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsTab('controls');
                  setShowSettings(true);
                }}
                aria-label="Open settings"
                className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111318]/90 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Bottom Unified Dock (keeps center 3D cockpit unobstructed) */}
          <div className="pointer-events-auto mx-auto w-full max-w-4xl bg-[#13151b]/92 border border-white/15 rounded-lg p-3 sm:p-4 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Current Car + Stats Summary */}
              <div className="flex items-center justify-between md:justify-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base sm:text-lg font-bold text-white">
                      {currentCar.name}
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {currentCar.scoreMultiplier}x SCORE
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5 font-mono-tabular">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-sky-400" />
                      {currentStats.topSpeedKmh} km/h
                    </span>
                    <span className="text-white/25">·</span>
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                      {currentStats.fuelCapacity} L
                    </span>
                    <span className="text-white/25">·</span>
                    <span>
                      LVL {save.highestUnlockedLevel}/{TOTAL_LEVELS}
                    </span>
                  </div>
                </div>

                {/* Mobile Install Button */}
                <div className="sm:hidden">
                  <PWAInstallButton compact />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGarage(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded bg-[#23262f] hover:bg-[#2d313d] border border-white/15 text-sm font-display font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  <Wrench className="w-4 h-4 text-amber-400" />
                  GARAGE
                </button>

                <button
                  type="button"
                  onClick={() => setShowLevels(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded bg-[#23262f] hover:bg-[#2d313d] border border-white/15 text-sm font-display font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="w-4 h-4 text-sky-400" />
                  {TOTAL_LEVELS} LEVELS
                </button>

                <button
                  type="button"
                  onClick={() => startRace(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-display font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  ENDLESS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuPreviewEndless(false);
                    startRace(nextCareerLevel);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-sm sm:text-base font-display font-bold text-slate-950 transition cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  RACE LVL {nextCareerLevel.levelNumber}
                </button>
              </div>
            </div>

            {/* Endless Road Biome Quick Picker (previews live in 3D when clicked!) */}
            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">
                Endless Road Environment:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {biomeList.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setEndlessBiome(b.id);
                      setMenuPreviewEndless(true);
                    }}
                    className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer whitespace-nowrap ${
                      endlessBiome === b.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {status === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-lg bg-[#1d1f24] border border-white/15 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white tracking-wide">
              RACE PAUSED
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeLevel
                ? `Level ${activeLevel.levelNumber} · ${activeLevel.name}`
                : `Endless Drive · ${BIOMES[endlessBiome].name}`}
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('playing')}
                className="w-full py-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
              >
                RESUME RACE
              </button>
              <button
                type="button"
                onClick={() => startRace(activeLevel)}
                className="w-full py-2.5 rounded bg-white/10 hover:bg-white/15 text-white font-display font-bold text-sm cursor-pointer"
              >
                RESTART
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 rounded bg-white/10 hover:bg-white/15 text-white font-display font-bold text-sm cursor-pointer"
              >
                CONTROLS &amp; AUDIO
              </button>
              <button
                type="button"
                onClick={() => setStatus('menu')}
                className="w-full py-2.5 rounded bg-transparent border border-white/15 hover:bg-white/5 text-slate-300 font-display font-bold text-sm cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Race Summary Modal (Won / Crashed / Out of Fuel) */}
      {(status === 'won' ||
        status === 'crashed' ||
        status === 'out_of_fuel') &&
        finalOutcome && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-lg bg-[#1c1e24] border border-white/15 p-6 shadow-2xl">
              <div className="text-center">
                {finalOutcome.outcome === 'won' ? (
                  <>
                    <div className="inline-flex items-center gap-1.5 text-emerald-400 font-display text-xs font-bold tracking-widest mb-1">
                      <Flag className="w-4 h-4" />
                      STAGE COMPLETE
                    </div>
                    <h2 className="font-display text-3xl font-bold text-white">
                      LEVEL {finalOutcome.telemetry.levelNumber} CLEARED
                    </h2>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {[1, 2, 3].map((st) => (
                        <Star
                          key={st}
                          className={`w-8 h-8 ${
                            st <= finalOutcome.stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1.5 text-rose-400 font-display text-xs font-bold tracking-widest mb-1">
                      {finalOutcome.outcome === 'out_of_fuel'
                        ? 'TANK EMPTY'
                        : 'VEHICLE WRECKED'}
                    </div>
                    <h2 className="font-display text-3xl font-bold text-white">
                      {finalOutcome.outcome === 'out_of_fuel'
                        ? 'OUT OF FUEL'
                        : 'CRASHED!'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {finalOutcome.outcome === 'out_of_fuel'
                        ? 'Upgrade Fuel Tank in Garage or grab green fuel cans on road.'
                        : 'Upgrade Handling in Garage or weave cleanly through traffic.'}
                    </p>
                  </>
                )}
              </div>

              {/* Telemetry Summary Grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
                <div className="bg-[#13151a] border border-white/10 rounded p-3">
                  <div className="text-[11px] text-slate-400">DISTANCE</div>
                  <div className="font-mono-tabular font-bold text-white text-lg">
                    {(finalOutcome.telemetry.distanceM / 1000).toFixed(2)} km
                  </div>
                </div>
                <div className="bg-[#13151a] border border-white/10 rounded p-3">
                  <div className="text-[11px] text-slate-400">SCORE</div>
                  <div className="font-mono-tabular font-bold text-white text-lg">
                    {finalOutcome.telemetry.score.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#13151a] border border-white/10 rounded p-3">
                  <div className="text-[11px] text-slate-400">CLOSE PASSES</div>
                  <div className="font-mono-tabular font-bold text-sky-400 text-lg">
                    {finalOutcome.telemetry.closePasses}
                  </div>
                </div>
                <div className="bg-[#13151a] border border-white/10 rounded p-3">
                  <div className="text-[11px] text-slate-400">COINS EARNED</div>
                  <div className="font-mono-tabular font-bold text-amber-400 text-lg flex items-center gap-1">
                    <Coins className="w-4 h-4" />+
                    {finalOutcome.telemetry.sessionCoins}
                  </div>
                </div>
              </div>

              {/* Post-Race Actions */}
              <div className="mt-5 flex flex-col gap-2">
                {finalOutcome.outcome === 'won' &&
                  activeLevel &&
                  activeLevel.levelNumber < TOTAL_LEVELS && (
                    <button
                      type="button"
                      onClick={() =>
                        startRace(LEVELS[activeLevel.levelNumber])
                      }
                      className="w-full py-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      NEXT LEVEL ({activeLevel.levelNumber + 1})
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startRace(activeLevel)}
                    className="py-2.5 rounded bg-white/10 hover:bg-white/15 text-white font-display font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RETRY
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('menu');
                      setShowGarage(true);
                    }}
                    className="py-2.5 rounded bg-white/10 hover:bg-white/15 text-amber-300 font-display font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-4 h-4" />
                    GARAGE
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setStatus('menu')}
                  className="w-full py-2 rounded border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  BACK TO MENU
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Garage Modal (Screenshot 3 Layout) */}
      {showGarage && (
        <GarageModal
          save={save}
          onClose={() => setShowGarage(false)}
          onSelectCar={(carId) =>
            setSave((prev) => ({ ...prev, selectedCarId: carId }))
          }
          onBuyCar={handleBuyCar}
          onUpgradeCar={handleUpgradeCar}
          onClaimBonusCoins={handleClaimBonusCoins}
        />
      )}

      {/* 550-Level Career Selector */}
      {showLevels && (
        <LevelsModal
          save={save}
          onSelectLevel={(lvl) => startRace(lvl)}
          onClose={() => setShowLevels(false)}
        />
      )}

      {/* Settings & Android Play Store Guide */}
      {showSettings && (
        <SettingsModal
          save={save}
          initialTab={settingsTab}
          onUpdateSettings={(patch) =>
            setSave((prev) => ({ ...prev, ...patch }))
          }
          onResetProgress={() => {
            setSave({ ...INITIAL_SAVE_STATE });
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
