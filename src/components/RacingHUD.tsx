import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Coins,
  Fuel,
  Megaphone,
  Minimize2,
  Pause,
  Shield,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import { getMyCarPipRect } from '../game/data';
import type {
  CameraPreset,
  ControlMode,
  InputState,
  LevelConfig,
  LiveTelemetry,
} from '../game/types';

interface RacingHUDProps {
  telemetry: LiveTelemetry;
  level: LevelConfig | null;
  controlMode: ControlMode;
  cameraPreset: CameraPreset;
  showMiniCar: boolean;
  inputRef: React.MutableRefObject<InputState>;
  onPause: () => void;
  onCycleCamera: () => void;
  onSelectCamera: (preset: CameraPreset) => void;
  onToggleMotionSteer: () => void;
  onToggleMiniCar: () => void;
}

const CAM_LABELS: Record<CameraPreset, string> = {
  cockpit: 'COCKPIT',
  chase: 'FULL CAR',
  dash: 'DASH',
  hood: 'HOOD',
};

export const RacingHUD: React.FC<RacingHUDProps> = ({
  telemetry,
  level,
  controlMode,
  cameraPreset,
  showMiniCar,
  inputRef,
  onPause,
  onCycleCamera,
  onSelectCamera,
  onToggleMotionSteer,
  onToggleMiniCar,
}) => {
  const [wheelAngle, setWheelAngle] = useState(0);
  const [honking, setHonking] = useState(false);
  const [carTouchActive, setCarTouchActive] = useState(false);
  const [winSize, setWinSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 390,
    h: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));
  const wheelCenterRef = useRef<{ x: number; y: number } | null>(null);
  const carSurgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (carSurgeTimeoutRef.current !== null) {
        window.clearTimeout(carSurgeTimeoutRef.current);
      }
    };
  }, []);

  const pipRect = getMyCarPipRect(winSize.w, winSize.h);
  const activePointersRef = useRef<{
    left: Set<number>;
    right: Set<number>;
    gas: Set<number>;
    brake: Set<number>;
    boost: Set<number>;
    horn: Set<number>;
    car: Set<number>;
  }>({
    left: new Set(),
    right: new Set(),
    gas: new Set(),
    brake: new Set(),
    boost: new Set(),
    horn: new Set(),
    car: new Set(),
  });

  const syncThrottle = () => {
    const p = activePointersRef.current;
    const surging = carSurgeTimeoutRef.current !== null;
    const held = p.gas.size > 0 || p.boost.size > 0 || p.car.size > 0;
    inputRef.current.throttle = held || surging;
    setCarTouchActive(p.car.size > 0 || surging);
  };

  const syncButtonSteer = () => {
    const l = activePointersRef.current.left.size > 0;
    const r = activePointersRef.current.right.size > 0;
    inputRef.current.steer = (r ? 1 : 0) - (l ? 1 : 0);
  };

  const progressPct =
    telemetry.targetDistanceM > 0
      ? Math.min(100, (telemetry.distanceM / telemetry.targetDistanceM) * 100)
      : 0;

  const lowFuel = telemetry.fuelPct < 22;
  const showArrows =
    controlMode === 'buttons' || controlMode === 'arrows_motion';
  const motionActive =
    controlMode === 'arrows_motion' || controlMode === 'tilt';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Touch/Hold Car Body (Full Car or Cockpit Hood/Wheel) to Speed Up */}
      <div
        aria-label="Touch car to accelerate"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointersRef.current.car.add(e.pointerId);
          if (carSurgeTimeoutRef.current !== null) {
            window.clearTimeout(carSurgeTimeoutRef.current);
          }
          carSurgeTimeoutRef.current = window.setTimeout(() => {
            carSurgeTimeoutRef.current = null;
            syncThrottle();
          }, 900);
          syncThrottle();
        }}
        onPointerUp={(e) => {
          activePointersRef.current.car.delete(e.pointerId);
          syncThrottle();
        }}
        onPointerCancel={(e) => {
          activePointersRef.current.car.delete(e.pointerId);
          syncThrottle();
        }}
        className="fixed left-[18%] right-[18%] top-[34%] bottom-[112px] z-0 pointer-events-auto touch-control"
      />
      {/* Live 3D "My Car" Corner Frame (matches Three.js scissor viewport 1:1) */}
      {cameraPreset !== 'chase' && showMiniCar && (
        <div
          style={{
            left: `${pipRect.left}px`,
            top: `${pipRect.top}px`,
            width: `${pipRect.width}px`,
            height: `${pipRect.height}px`,
          }}
          onClick={() => onSelectCamera('chase')}
          title="Tap to expand Full Car view"
          className="fixed z-20 pointer-events-auto rounded-md border border-amber-400/55 shadow-lg cursor-pointer flex items-start justify-between overflow-hidden"
        >
          <span className="bg-black/65 text-amber-300 font-display text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-br">
            MY CAR
          </span>
          <button
            type="button"
            aria-label="Hide My Car mini cam"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMiniCar();
            }}
            className="w-7 h-7 bg-black/75 hover:bg-black/95 text-white/90 hover:text-white flex items-center justify-center rounded-bl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {cameraPreset !== 'chase' && !showMiniCar && (
        <button
          type="button"
          style={{ left: `${pipRect.left}px`, top: `${pipRect.top}px` }}
          onClick={onToggleMiniCar}
          className="fixed z-20 pointer-events-auto bg-[#111318]/85 hover:bg-[#1a1f29] border border-amber-400/50 text-amber-300 font-display text-[10px] font-bold px-2.5 py-1.5 rounded cursor-pointer"
        >
          + MY CAR
        </button>
      )}

      {cameraPreset === 'chase' && (
        <button
          type="button"
          style={{ left: `${pipRect.left}px`, top: `${pipRect.top}px` }}
          onClick={() => onSelectCamera('cockpit')}
          title="Collapse Full Car back to Cockpit view"
          className="fixed z-20 pointer-events-auto bg-[#111318]/85 hover:bg-[#1a1f29] border border-amber-400/60 text-amber-300 font-display text-[11px] font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer shadow"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          COCKPIT
        </button>
      )}
      {/* Top Compact HUD Bar + Top-Aligned Ghost Event Banner (center screen stays 100% clear) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Level & Distance Progress */}
          <div className="pointer-events-auto bg-[#111318]/80 border border-white/15 rounded-md px-3 py-1.5 min-w-[150px] sm:min-w-[230px]">
            <div className="flex items-center justify-between gap-2.5 text-xs">
              <span className="font-display font-bold text-amber-400 whitespace-nowrap">
                {level ? `LVL ${level.levelNumber}` : 'ENDLESS'}
              </span>
              <span className="font-mono-tabular text-slate-200 font-semibold whitespace-nowrap">
                {level
                  ? `${(telemetry.distanceM / 1000).toFixed(2)} / ${(
                      telemetry.targetDistanceM / 1000
                    ).toFixed(1)} km`
                  : `${(telemetry.distanceM / 1000).toFixed(2)} km`}
              </span>
            </div>
            {level && (
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-100"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Center: Fuel + Integrity + Score */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-4 bg-[#111318]/80 border border-white/15 rounded-md px-3.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Fuel
                className={`w-4 h-4 ${
                  lowFuel ? 'text-rose-400' : 'text-emerald-400'
                }`}
              />
              <div className="w-20 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    lowFuel ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, telemetry.fuelPct)}%` }}
                />
              </div>
              <span className="font-mono-tabular text-xs font-bold text-white w-9">
                {Math.round(telemetry.fuelPct)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-400" />
              <span className="font-mono-tabular text-xs font-bold text-white">
                {Math.round(telemetry.integrityPct)}%
              </span>
            </div>
          </div>

          {/* Right: Score, Coins, Motion Toggle, Camera & Pause */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <div className="bg-[#111318]/80 border border-white/15 rounded-md px-2 sm:px-3 py-1.5 flex items-center gap-2">
              <div className="text-right leading-tight">
                <div className="font-mono-tabular text-xs sm:text-sm font-bold text-white">
                  {telemetry.score.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400">SCORE</div>
              </div>
              <div className="flex items-center gap-0.5 text-amber-400 font-mono-tabular text-xs font-bold">
                <Coins className="w-3.5 h-3.5" />+{telemetry.sessionCoins}
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMotionSteer}
              aria-label="Toggle Shake and Tilt Steering"
              title={
                motionActive
                  ? 'Device Shake/Tilt Steering ON (tap to switch)'
                  : 'Enable Device Shake/Tilt Steering + Arrows'
              }
              className={`flex items-center gap-1 px-2 h-10 rounded-md border text-[10px] font-display font-bold cursor-pointer transition ${
                motionActive
                  ? 'bg-amber-500/25 border-amber-400/70 text-amber-300'
                  : 'bg-[#111318]/80 border-white/15 text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {motionActive ? 'SHAKE ON' : 'SHAKE'}
              </span>
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              aria-label="Switch camera view"
              title="Switch Camera (Cockpit / Full Car / Dash / Hood)"
              className="flex items-center gap-1 px-2 h-10 rounded-md bg-[#111318]/80 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer text-[10px] font-display font-bold"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>{CAM_LABELS[cameraPreset]}</span>
            </button>

            <button
              type="button"
              onClick={onPause}
              aria-label="Pause race"
              className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111318]/80 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Compact Fuel Strip + Translucent Top Toast (never blocks center road or nearby vehicles!) */}
        <div className="flex flex-col items-center gap-1 pointer-events-none">
          <div className="sm:hidden flex items-center gap-2.5 bg-[#111318]/70 border border-white/10 rounded px-2.5 py-0.5">
            <Fuel
              className={`w-3 h-3 ${
                lowFuel ? 'text-rose-400' : 'text-emerald-400'
              }`}
            />
            <span className="font-mono-tabular text-[11px] font-bold text-white/90">
              {Math.round(telemetry.fuelPct)}%
            </span>
            <span className="text-white/25">·</span>
            <Shield className="w-3 h-3 text-sky-400" />
            <span className="font-mono-tabular text-[11px] font-bold text-white/90">
              {Math.round(telemetry.integrityPct)}%
            </span>
          </div>

          {telemetry.eventText && (
            <div
              className={`px-3 py-0.5 rounded font-display text-xs sm:text-sm font-semibold tracking-wider border ${
                telemetry.eventTone === 'bonus'
                  ? 'bg-emerald-500/12 border-emerald-400/35 text-emerald-200/85'
                  : telemetry.eventTone === 'warn'
                    ? 'bg-rose-500/15 border-rose-400/35 text-rose-200/90'
                    : 'bg-amber-400/12 border-amber-300/35 text-amber-200/85'
              }`}
            >
              {telemetry.eventText}
            </div>
          )}

          {lowFuel && !telemetry.eventText && (
            <div className="px-2.5 py-0.5 rounded bg-rose-500/15 border border-rose-400/35 text-rose-200/90 font-display text-[11px] font-semibold tracking-wide">
              LOW FUEL — COLLECT GREEN CANISTERS
            </div>
          )}

          {cameraPreset === 'chase' && (
            <div className="sm:hidden flex items-center justify-center gap-2 pt-0.5 pointer-events-none">
              {controlMode !== 'wheel' && (
                <div
                  className="w-8 h-8 rounded-full border-[3px] border-slate-200/80 bg-[#111318]/75 flex items-center justify-center relative transition-transform duration-75"
                  style={{
                    transform: `rotate(${Math.round(inputRef.current.steer * 65)}deg)`,
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400" />
                  <div className="w-full h-0.5 bg-slate-300/65" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-slate-900 absolute" />
                </div>
              )}
              <div className="bg-[#111318]/80 border border-white/15 rounded-md px-2.5 py-0.5 flex items-baseline gap-1.5">
                <span className="font-mono-tabular text-sm font-bold text-white">
                  {telemetry.speedKmh}
                </span>
                <span className="text-[9px] font-semibold text-slate-400">KM/H</span>
                <span className="font-display text-[11px] font-bold text-amber-400">
                  G{telemetry.gear}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Ergonomic Touch Controls + Horn + Steering + Pedals */}
      <div className="relative z-20 flex items-end justify-between gap-2 pb-1">
        {/* Bottom-Left: Horn + Steering Controls */}
        <div className="pointer-events-auto flex flex-col items-start gap-2 touch-control">
          {/* Dedicated Car Horn Button */}
          <button
            type="button"
            aria-label="Car Horn"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              activePointersRef.current.horn.add(e.pointerId);
              inputRef.current.horn = true;
              setHonking(true);
            }}
            onPointerUp={(e) => {
              activePointersRef.current.horn.delete(e.pointerId);
              const active = activePointersRef.current.horn.size > 0;
              inputRef.current.horn = active;
              setHonking(active);
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.horn.delete(e.pointerId);
              inputRef.current.horn = false;
              setHonking(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border font-display text-xs font-bold transition ${
              honking
                ? 'bg-amber-400 text-slate-950 border-amber-200 scale-95'
                : 'bg-[#111318]/75 text-amber-300 border-white/20 hover:bg-[#1a1e26]'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            HORN
          </button>

          <div className="flex items-end gap-2">
            {showArrows && (
              <>
                <button
                  type="button"
                  aria-label="Steer Left"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    activePointersRef.current.left.add(e.pointerId);
                    syncButtonSteer();
                  }}
                  onPointerUp={(e) => {
                    activePointersRef.current.left.delete(e.pointerId);
                    syncButtonSteer();
                  }}
                  onPointerCancel={(e) => {
                    activePointersRef.current.left.delete(e.pointerId);
                    syncButtonSteer();
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#111318]/75 active:bg-amber-500/80 active:text-slate-950 border border-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-9 h-9" />
                </button>

                <button
                  type="button"
                  aria-label="Steer Right"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    activePointersRef.current.right.add(e.pointerId);
                    syncButtonSteer();
                  }}
                  onPointerUp={(e) => {
                    activePointersRef.current.right.delete(e.pointerId);
                    syncButtonSteer();
                  }}
                  onPointerCancel={(e) => {
                    activePointersRef.current.right.delete(e.pointerId);
                    syncButtonSteer();
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#111318]/75 active:bg-amber-500/80 active:text-slate-950 border border-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-9 h-9" />
                </button>
              </>
            )}

            {controlMode === 'wheel' && (
              <div
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = e.currentTarget.getBoundingClientRect();
                  wheelCenterRef.current = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  };
                }}
                onPointerMove={(e) => {
                  if (!wheelCenterRef.current) return;
                  const dx = e.clientX - wheelCenterRef.current.x;
                  const clamped = Math.max(-1, Math.min(1, dx / 52));
                  inputRef.current.steer = clamped;
                  setWheelAngle(clamped * 75);
                }}
                onPointerUp={() => {
                  wheelCenterRef.current = null;
                  inputRef.current.steer = 0;
                  setWheelAngle(0);
                }}
                onPointerCancel={() => {
                  wheelCenterRef.current = null;
                  inputRef.current.steer = 0;
                  setWheelAngle(0);
                }}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-8 border-slate-200/80 bg-[#111318]/65 flex items-center justify-center relative cursor-grab active:cursor-grabbing"
                style={{ transform: `rotate(${wheelAngle}deg)` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-3 bg-amber-400" />
                <div className="w-full h-3 bg-slate-300/70" />
                <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-900 absolute" />
              </div>
            )}

            {controlMode === 'tilt' && (
              <div className="bg-[#111318]/75 border border-white/15 rounded-md px-3 py-2 text-xs font-semibold text-amber-300">
                Tilt / Shake Phone to Steer
              </div>
            )}
          </div>
        </div>

        {/* Bottom-Center: Speed + Gear (+ Compact Wheel Indicator in Chase Car view) */}
        <div className="hidden sm:flex flex-col items-center gap-1.5 pointer-events-none">
          {cameraPreset === 'chase' && controlMode !== 'wheel' && (
            <div
              className="w-16 h-16 rounded-full border-4 border-slate-200/65 bg-[#111318]/45 flex items-center justify-center relative transition-transform duration-75"
              style={{
                transform: `rotate(${Math.round(inputRef.current.steer * 65)}deg)`,
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-amber-400" />
              <div className="w-full h-1.5 bg-slate-300/60" />
              <div className="w-4 h-4 rounded-full bg-amber-500 border border-slate-900 absolute" />
            </div>
          )}

          <div className="bg-[#111318]/80 border border-white/15 rounded-md px-4 py-1.5 flex items-baseline gap-3">
            <span className="font-mono-tabular text-2xl font-bold text-white">
              {telemetry.speedKmh}
            </span>
            <span className="text-xs font-semibold text-slate-400">KM/H</span>
            <span className="text-white/20">|</span>
            <span className="font-display text-base font-bold text-amber-400">
              G{telemetry.gear}
            </span>
          </div>
          <span className="hidden md:inline text-[11px] text-white/60 bg-black/45 px-2.5 py-0.5 rounded">
            A / D Steer · W Gas · S Brake · H Horn · Space Boost · C Cam
          </span>
        </div>

        {/* Bottom-Right: Brake, Boost & Gas Pedals */}
        <div className="pointer-events-auto flex items-end gap-2 touch-control">
          <button
            type="button"
            aria-label="Nitro Boost"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              activePointersRef.current.boost.add(e.pointerId);
              inputRef.current.boost = true;
              syncThrottle();
            }}
            onPointerUp={(e) => {
              activePointersRef.current.boost.delete(e.pointerId);
              inputRef.current.boost =
                activePointersRef.current.boost.size > 0;
              syncThrottle();
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.boost.delete(e.pointerId);
              inputRef.current.boost = false;
              syncThrottle();
            }}
            className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-amber-500/80 active:bg-amber-400 border border-amber-300/60 flex flex-col items-center justify-center text-slate-950 font-display font-bold text-[10px]"
          >
            <Zap className="w-5 h-5" />
            NOS
          </button>

          <button
            type="button"
            aria-label="Brake Pedal"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              activePointersRef.current.brake.add(e.pointerId);
              inputRef.current.brake = true;
            }}
            onPointerUp={(e) => {
              activePointersRef.current.brake.delete(e.pointerId);
              inputRef.current.brake =
                activePointersRef.current.brake.size > 0;
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.brake.delete(e.pointerId);
              inputRef.current.brake = false;
            }}
            className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg bg-[#1c1f26]/85 active:bg-rose-600/90 border border-white/25 flex flex-col items-center justify-center text-white font-display font-bold text-xs"
          >
            <div className="w-8 h-1 bg-rose-400 mb-1.5 rounded-full" />
            BRAKE
          </button>

          <button
            type="button"
            aria-label="Gas Pedal"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              activePointersRef.current.gas.add(e.pointerId);
              syncThrottle();
            }}
            onPointerUp={(e) => {
              activePointersRef.current.gas.delete(e.pointerId);
              syncThrottle();
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.gas.delete(e.pointerId);
              syncThrottle();
            }}
            className={`w-16 h-24 sm:w-20 sm:h-28 rounded-lg border flex flex-col items-center justify-center font-display font-bold text-xs transition-colors ${
              carTouchActive
                ? 'bg-emerald-500/85 text-slate-950 border-emerald-200'
                : 'bg-[#1c1f26]/85 active:bg-emerald-500/90 active:text-slate-950 border-white/25 text-white'
            }`}
          >
            <div className="w-8 h-1 bg-emerald-400 mb-2 rounded-full" />
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};
