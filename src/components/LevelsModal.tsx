import React, { useState } from 'react';
import { ArrowLeftRight, Lock, MapPin, Star, Trophy, X } from 'lucide-react';
import { BIOMES, LEVELS, TOTAL_LEVELS } from '../game/data';
import type { BiomeId, LevelConfig, SaveState } from '../game/types';

interface LevelsModalProps {
  save: SaveState;
  onSelectLevel: (level: LevelConfig) => void;
  onClose: () => void;
}

const BIOME_BADGE: Record<BiomeId, { label: string; color: string }> = {
  city: { label: 'City', color: 'text-sky-300' },
  mountain: { label: 'Pine Pass', color: 'text-emerald-300' },
  desert: { label: 'Desert', color: 'text-orange-300' },
  coastal: { label: 'Coastal', color: 'text-cyan-300' },
  night: { label: 'Night', color: 'text-indigo-300' },
};

const TIERS = Array.from({ length: Math.ceil(TOTAL_LEVELS / 50) }, (_, i) => {
  const start = i * 50 + 1;
  const end = Math.min(TOTAL_LEVELS, (i + 1) * 50);
  return {
    id: i,
    label: `${start}–${end}`,
    range: [start, end] as [number, number],
  };
});

export const LevelsModal: React.FC<LevelsModalProps> = ({
  save,
  onSelectLevel,
  onClose,
}) => {
  const initialTier = Math.min(
    TIERS.length - 1,
    Math.floor((save.highestUnlockedLevel - 1) / 50)
  );
  const [activeTierIdx, setActiveTierIdx] = useState(initialTier);
  const tier = TIERS[activeTierIdx];

  const totalStars = Object.values(save.levelStars).reduce(
    (sum, s) => sum + s,
    0
  );

  const tierLevels = LEVELS.filter(
    (l) => l.levelNumber >= tier.range[0] && l.levelNumber <= tier.range[1]
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-lg bg-[#1d1f24] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#15171b] border-b border-white/10">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-wide text-white">
                {TOTAL_LEVELS} ROAD LEVELS
              </h2>
              <p className="text-xs text-slate-400">
                Levels {tier.range[0]}–{tier.range[1]} · Curves, Hills &amp; 5 Biomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#23262e] px-3 py-1.5 rounded text-xs font-mono-tabular font-bold text-amber-300">
              <Trophy className="w-3.5 h-3.5" />
              {totalStars} / {TOTAL_LEVELS * 3}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close level selector"
              className="flex items-center justify-center w-8 h-8 rounded-sm bg-neutral-300 hover:bg-white text-neutral-900 transition cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 11 Tier Tabs (50 levels each -> 550 total levels) */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-[#181a1f] border-b border-white/10 overflow-x-auto garage-scroll">
          {TIERS.map((t, idx) => {
            const active = idx === activeTierIdx;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTierIdx(idx)}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 50-Level Grid for Selected Tier */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {tierLevels.map((lvl) => {
            const unlocked = lvl.levelNumber <= save.highestUnlockedLevel;
            const stars = save.levelStars[lvl.levelNumber] ?? 0;
            const isCurrent = lvl.levelNumber === save.highestUnlockedLevel;
            const badge = BIOME_BADGE[lvl.biome];

            return (
              <button
                key={lvl.levelNumber}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectLevel(lvl)}
                title={`${BIOMES[lvl.biome].name} · ${lvl.name}`}
                className={`relative flex flex-col justify-between p-3 rounded border text-left transition ${
                  !unlocked
                    ? 'bg-[#141519] border-white/5 text-slate-500 cursor-not-allowed'
                    : isCurrent
                      ? 'bg-[#282b33] border-amber-400 hover:bg-[#313540] text-white cursor-pointer'
                      : 'bg-[#22252c] border-white/10 hover:border-white/30 text-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-lg font-bold leading-none">
                    {lvl.levelNumber}
                  </span>
                  {!unlocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  ) : lvl.twoWayTraffic ? (
                    <span
                      title="Two-Way Traffic"
                      className="text-amber-400 flex items-center gap-0.5 text-[10px] font-semibold"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      2W
                    </span>
                  ) : (
                    <span className={`text-[10px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="mt-1.5">
                  <div className="text-[11px] font-medium truncate text-slate-200">
                    {lvl.name}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-slate-400">
                    {(lvl.targetDistanceM / 1000).toFixed(1)} km · +
                    {lvl.coinReward}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3].map((st) => (
                    <Star
                      key={st}
                      className={`w-3.5 h-3.5 ${
                        st <= stars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
