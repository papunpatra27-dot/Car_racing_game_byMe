import React, { useState } from 'react';
import {
  Check,
  Coins,
  Fuel,
  Gauge,
  Lock,
  Plus,
  SlidersHorizontal,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CARS,
  DEFAULT_UPGRADES,
  getEffectiveCarStats,
  getUpgradeCost,
} from '../game/data';
import type { CarUpgrades, SaveState } from '../game/types';

interface GarageModalProps {
  save: SaveState;
  onClose: () => void;
  onSelectCar: (carId: string) => void;
  onBuyCar: (carId: string) => void;
  onUpgradeCar: (carId: string, stat: keyof CarUpgrades) => void;
  onClaimBonusCoins: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  save,
  onClose,
  onSelectCar,
  onBuyCar,
  onUpgradeCar,
  onClaimBonusCoins,
}) => {
  const [inspectedCarId, setInspectedCarId] = useState<string>(
    save.selectedCarId
  );

  const car = CARS.find((c) => c.id === inspectedCarId) ?? CARS[0];
  const isUnlocked = save.unlockedCars.includes(car.id);
  const isSelected = save.selectedCarId === car.id;
  const upgrades = save.upgradesByCar[car.id] ?? DEFAULT_UPGRADES;
  const effective = getEffectiveCarStats(car, upgrades);

  const upgradeRows: {
    key: keyof CarUpgrades;
    label: string;
    valueText: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'engine',
      label: 'Engine',
      valueText: `${effective.accel} m/s²`,
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'speed',
      label: 'Top Speed',
      valueText: `${effective.topSpeedKmh} km/h`,
      icon: <Gauge className="w-4 h-4 text-sky-400" />,
    },
    {
      key: 'fuel',
      label: 'Fuel Tank',
      valueText: `${effective.fuelCapacity} L`,
      icon: <Fuel className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'handling',
      label: 'Handling',
      valueText: `${effective.handling} lat`,
      icon: <SlidersHorizontal className="w-4 h-4 text-rose-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-lg bg-[#232429] border border-white/15 shadow-2xl overflow-hidden">
        {/* Top Header Strip matching Screenshot 3 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1b1c20] border-b border-white/10">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wider text-white">
              GARAGE
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Coin Counter + Green '+' Button (Screenshot 3 style) */}
            <div className="flex items-center gap-2 bg-[#141519] border border-white/10 rounded px-3 py-1.5">
              <span className="font-mono-tabular text-sm sm:text-base font-bold text-white">
                {save.coins}
              </span>
              <Coins className="w-4 h-4 text-amber-400" />
              <button
                type="button"
                onClick={onClaimBonusCoins}
                title="Claim +250 Sponsor Bonus Coins"
                className="ml-1 flex items-center justify-center w-6 h-6 rounded-sm bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close garage"
              className="flex items-center justify-center w-8 h-8 rounded-sm bg-neutral-300 hover:bg-white text-neutral-900 transition cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Horizontal Car Cards Strip matching Screenshot 3 */}
        <div className="px-4 sm:px-6 pt-4 pb-3 overflow-x-auto garage-scroll">
          <div className="flex gap-3 sm:gap-4 min-w-max">
            {CARS.map((item) => {
              const owned = save.unlockedCars.includes(item.id);
              const active = save.selectedCarId === item.id;
              const inspecting = inspectedCarId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInspectedCarId(item.id)}
                  className={`group relative flex flex-col w-52 sm:w-64 rounded-sm overflow-hidden bg-[#f4f5f7] text-left transition cursor-pointer ${
                    inspecting
                      ? 'ring-3 ring-amber-400 shadow-lg'
                      : 'opacity-90 hover:opacity-100 ring-1 ring-white/20'
                  }`}
                >
                  {/* Top-right Score Multiplier Label (Screenshot 3 exact style) */}
                  <div className="absolute top-2 right-2.5 z-10 font-display text-sm sm:text-base font-bold text-neutral-800 tracking-tight">
                    {item.scoreMultiplier}x SCORE
                  </div>

                  {/* Top-left Status Marker */}
                  <div className="absolute top-2 left-2.5 z-10 flex items-center gap-1 text-xs font-bold">
                    {active ? (
                      <span className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded-sm">
                        <Check className="w-3 h-3" />
                        ACTIVE
                      </span>
                    ) : owned ? (
                      <span className="bg-neutral-800 text-white px-2 py-0.5 rounded-sm">
                        OWNED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-neutral-900/90 text-amber-400 px-2 py-0.5 rounded-sm font-mono-tabular">
                        <Lock className="w-3 h-3" />
                        {item.unlockCost}
                      </span>
                    )}
                  </div>

                  {/* Studio Car Render */}
                  <div className="w-full h-36 sm:h-42 bg-[#f4f5f7] overflow-hidden flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                        item.id === 'hyper_obsidian'
                          ? 'object-[50%_20%] scale-125'
                          : 'object-center'
                      }`}
                    />
                  </div>

                  {/* Bottom Car Title Strip */}
                  <div className="w-full px-3 py-2 bg-[#16171b] text-white flex items-center justify-between border-t border-neutral-300/30">
                    <span className="font-display text-sm font-bold truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Car Upgrade Bay & Action Bar */}
        <div className="px-4 sm:px-6 py-4 bg-[#191a1f] border-t border-white/10 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 4 Upgrade Controls (Engine, Top Speed, Fuel, Handling) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {upgradeRows.map((row) => {
                const lvl = upgrades[row.key];
                const maxed = lvl >= 5;
                const cost = getUpgradeCost(row.key, lvl, car.unlockCost);
                const canAfford = save.coins >= cost;

                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 rounded bg-[#23252c] border border-white/10 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          {row.icon}
                          {row.label}
                        </span>
                        <span className="font-mono-tabular text-xs font-bold text-white">
                          {row.valueText}
                        </span>
                      </div>

                      {/* 5-step upgrade level bar */}
                      <div className="mt-1.5 flex gap-1">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`h-1.5 flex-1 rounded-xs ${
                              step <= lvl ? 'bg-amber-400' : 'bg-white/12'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!isUnlocked || maxed || !canAfford}
                      onClick={() => onUpgradeCar(car.id, row.key)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono-tabular whitespace-nowrap shrink-0 transition ${
                        !isUnlocked
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                          : maxed
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                              : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {maxed ? 'MAX' : `${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Equip / Unlock Primary Action */}
            <div className="flex md:flex-col items-center md:items-stretch justify-between gap-2 md:w-52 shrink-0">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCar(car.id);
                    onClose();
                  }}
                  className={`w-full py-3 px-4 rounded font-display text-base font-bold tracking-wide transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isSelected ? 'EQUIPPED · DRIVE' : 'EQUIP CAR'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={save.coins < car.unlockCost}
                  onClick={() => onBuyCar(car.id)}
                  className={`w-full py-3 px-4 rounded font-display text-base font-bold tracking-wide flex items-center justify-center gap-2 transition ${
                    save.coins >= car.unlockCost
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  BUY · {car.unlockCost}
                </button>
              )}
              <p className="text-[11px] text-slate-400 text-center hidden md:block">
                {isUnlocked
                  ? 'Upgrades apply to this vehicle immediately.'
                  : 'Earn coins in races or claim sponsor bonus (+).'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
