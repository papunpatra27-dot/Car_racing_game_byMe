import React, { useState } from 'react';
import { ArrowLeftRight, Lock, MapPin, Star, Trophy, X } from 'lucide-react';
import { BIOMES, LEVELS } from '../game/data';
import type { BiomeId, LevelConfig, SaveState } from '../game/types';

interface LevelsModalProps {
  save: SaveState;
  onSelectLevel: (level: LevelConfig) => void;
  onClose: () => void;
}

const CHAPTERS: { id: BiomeId; label: string; range: [number, number] }[] = [
  { id: 'city', label: '1–20 City', range: [1, 20] },
  { id: 'mountain', label: '21–40 Pine Pass', range: [21, 40] },
  { id: 'desert', label: '41–60 Desert', range: [41, 60] },
  { id: 'coastal', label: '61–80 Coastal', range: [61, 80] },
  { id: 'night', label: '81–100 Night', range: [81, 100] },
];

export const LevelsModal: React.FC<LevelsModalProps> = ({
  save,
  onSelectLevel,
  onClose,
}) => {
  const initialChapter = Math.min(
    4,
    Math.floor((save.highestUnlockedLevel - 1) / 20)
  );
  const [activeChapterIdx, setActiveChapterIdx] = useState(initialChapter);
  const chapter = CHAPTERS[activeChapterIdx];
  const biome = BIOMES[chapter.id];

  const totalStars = Object.values(save.levelStars).reduce(
    (sum, s) => sum + s,
    0
  );

  const chapterLevels = LEVELS.filter(
    (l) =>
      l.levelNumber >= chapter.range[0] && l.levelNumber <= chapter.range[1]
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
                100 ROAD LEVELS
              </h2>
              <p className="text-xs text-slate-400">{biome.chapterTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#23262e] px-3 py-1.5 rounded text-xs font-mono-tabular font-bold text-amber-300">
              <Trophy className="w-3.5 h-3.5" />
              {totalStars} / 300
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

        {/* 5 Biome Chapter Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-[#181a1f] border-b border-white/10 overflow-x-auto garage-scroll">
          {CHAPTERS.map((ch, idx) => {
            const active = idx === activeChapterIdx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChapterIdx(idx)}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* 20-Level Grid for Selected Chapter */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {chapterLevels.map((lvl) => {
            const unlocked = lvl.levelNumber <= save.highestUnlockedLevel;
            const stars = save.levelStars[lvl.levelNumber] ?? 0;
            const isCurrent = lvl.levelNumber === save.highestUnlockedLevel;

            return (
              <button
                key={lvl.levelNumber}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectLevel(lvl)}
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
                      2-Way
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {lvl.lanes}L
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

                {/* 3 Stars */}
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
