import React, { useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Coins,
  Fuel,
  Pause,
  Shield,
  Zap,
} from 'lucide-react';
import type {
  ControlMode,
  InputState,
  LevelConfig,
  LiveTelemetry,
} from '../game/types';

interface RacingHUDProps {
  telemetry: LiveTelemetry;
  level: LevelConfig | null;
  controlMode: ControlMode;
  inputRef: React.MutableRefObject<InputState>;
  onPause: () => void;
  onCycleCamera: () => void;
}

export const RacingHUD: React.FC<RacingHUDProps> = ({
  telemetry,
  level,
  controlMode,
  inputRef,
  onPause,
  onCycleCamera,
}) => {
  const [wheelAngle, setWheelAngle] = useState(0);
  const wheelCenterRef = useRef<{ x: number; y: number } | null>(null);
  const activePointersRef = useRef<{
    left: Set<number>;
    right: Set<number>;
    gas: Set<number>;
    brake: Set<number>;
    boost: Set<number>;
  }>({
    left: new Set(),
    right: new Set(),
    gas: new Set(),
    brake: new Set(),
    boost: new Set(),
  });

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

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Compact HUD Bar (no backdrop-blur over WebGL) */}
      <div className="flex items-start justify-between gap-2">
        {/* Left: Level & Distance Progress */}
        <div className="pointer-events-auto bg-[#111318]/85 border border-white/15 rounded-md px-3 py-1.5 min-w-[165px] sm:min-w-[230px]">
          <div className="flex items-center justify-between gap-3 text-xs">
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
        <div className="pointer-events-auto hidden sm:flex items-center gap-4 bg-[#111318]/85 border border-white/15 rounded-md px-3.5 py-1.5">
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

        {/* Right: Score, Coins, Camera & Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <div className="bg-[#111318]/85 border border-white/15 rounded-md px-2.5 sm:px-3 py-1.5 flex items-center gap-2.5">
            <div className="text-right leading-tight">
              <div className="font-mono-tabular text-xs sm:text-sm font-bold text-white">
                {telemetry.score.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">SCORE</div>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-mono-tabular text-xs font-bold">
              <Coins className="w-3.5 h-3.5" />+{telemetry.sessionCoins}
            </div>
          </div>

          <button
            type="button"
            onClick={onCycleCamera}
            aria-label="Switch camera view"
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111318]/85 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause race"
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111318]/85 hover:bg-[#1f232c] border border-white/15 text-white cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Compact Fuel Bar + Event Banner */}
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        <div className="sm:hidden flex items-center gap-3 bg-[#111318]/80 border border-white/15 rounded px-2.5 py-1">
          <Fuel
            className={`w-3.5 h-3.5 ${
              lowFuel ? 'text-rose-400' : 'text-emerald-400'
            }`}
          />
          <span className="font-mono-tabular text-[11px] font-bold text-white">
            {Math.round(telemetry.fuelPct)}%
          </span>
          <span className="text-white/25">·</span>
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono-tabular text-[11px] font-bold text-white">
            {Math.round(telemetry.integrityPct)}%
          </span>
        </div>

        {telemetry.eventText && (
          <div
            className={`px-4 py-1 rounded font-display text-base sm:text-lg font-bold tracking-wider shadow-lg ${
              telemetry.eventTone === 'bonus'
                ? 'bg-emerald-500 text-slate-950'
                : telemetry.eventTone === 'warn'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-400 text-slate-950'
            }`}
          >
            {telemetry.eventText}
          </div>
        )}

        {lowFuel && !telemetry.eventText && (
          <div className="px-3 py-0.5 rounded bg-rose-600/90 text-white font-display text-xs font-bold tracking-wide">
            LOW FUEL — COLLECT GREEN CANISTERS
          </div>
        )}
      </div>

      {/* Bottom Ergonomic Touch Controls + Speed Readout */}
      <div className="flex items-end justify-between gap-2 pb-1">
        {/* Bottom-Left: Steering Controls */}
        <div className="pointer-events-auto flex items-end gap-2 touch-control">
          {controlMode === 'buttons' && (
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
            <div className="bg-[#111318]/80 border border-white/15 rounded-md px-3 py-2 text-xs font-semibold text-amber-300">
              Tilt Device to Steer
            </div>
          )}
        </div>

        {/* Bottom-Center: Desktop Speed + Gear + Keyboard Legend */}
        <div className="hidden md:flex flex-col items-center gap-1 pointer-events-none">
          <div className="bg-[#111318]/85 border border-white/15 rounded-md px-4 py-1.5 flex items-baseline gap-3">
            <span className="font-mono-tabular text-2xl font-bold text-white">
              {telemetry.speedKmh}
            </span>
            <span className="text-xs font-semibold text-slate-400">KM/H</span>
            <span className="text-white/20">|</span>
            <span className="font-display text-base font-bold text-amber-400">
              G{telemetry.gear}
            </span>
          </div>
          <span className="text-[11px] text-white/60 bg-black/50 px-2.5 py-0.5 rounded">
            A / D Steer · W Gas · S Brake · Space Boost · C Cam
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
              inputRef.current.throttle = true;
            }}
            onPointerUp={(e) => {
              activePointersRef.current.boost.delete(e.pointerId);
              inputRef.current.boost =
                activePointersRef.current.boost.size > 0;
              if (activePointersRef.current.gas.size === 0) {
                inputRef.current.throttle = inputRef.current.boost;
              }
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.boost.delete(e.pointerId);
              inputRef.current.boost = false;
              if (activePointersRef.current.gas.size === 0) {
                inputRef.current.throttle = false;
              }
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
              inputRef.current.throttle = true;
            }}
            onPointerUp={(e) => {
              activePointersRef.current.gas.delete(e.pointerId);
              inputRef.current.throttle =
                activePointersRef.current.gas.size > 0 ||
                activePointersRef.current.boost.size > 0;
            }}
            onPointerCancel={(e) => {
              activePointersRef.current.gas.delete(e.pointerId);
              inputRef.current.throttle =
                activePointersRef.current.boost.size > 0;
            }}
            className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-[#1c1f26]/85 active:bg-emerald-500/90 active:text-slate-950 border border-white/25 flex flex-col items-center justify-center text-white font-display font-bold text-xs"
          >
            <div className="w-8 h-1 bg-emerald-400 mb-2 rounded-full" />
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};
