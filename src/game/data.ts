import type {
  BiomeConfig,
  BiomeId,
  CarSpec,
  CarUpgrades,
  EffectiveCarStats,
  LevelConfig,
  SaveState,
} from './types';

export const CARS: CarSpec[] = [
  {
    id: 'compact_blue',
    name: 'E30 Street Coupe',
    subtitle: 'Classic Rear-Drive',
    image: '/src/assets/images/car_compact_blue_1795357892220.jpg',
    scoreMultiplier: 1.5,
    unlockCost: 0,
    bodyColor: 0x1678d4,
    interiorColor: 0x3b3530,
    dashColor: 0x2b2927,
    accentColor: 0x38bdf8,
    dashStyle: 'classic',
    enginePitch: 1.0,
    baseStats: {
      topSpeedKmh: 195,
      accel: 14.5,
      fuelCapacity: 100,
      handling: 9.0,
    },
  },
  {
    id: 'sedan_red',
    name: 'M-Line Sport Sedan',
    subtitle: 'Twin-Turbo Executive',
    image: '/src/assets/images/car_sedan_red_1795357892600.jpg',
    scoreMultiplier: 2.0,
    unlockCost: 1200,
    bodyColor: 0xd92638,
    interiorColor: 0x26282e,
    dashColor: 0x1b1d22,
    accentColor: 0xef4444,
    dashStyle: 'modern',
    enginePitch: 1.12,
    baseStats: {
      topSpeedKmh: 230,
      accel: 17.5,
      fuelCapacity: 112,
      handling: 10.2,
    },
  },
  {
    id: 'muscle_green',
    name: 'Emerald SS 454',
    subtitle: 'Big-Block Muscle',
    image: '/src/assets/images/car_muscle_green_1795357893266.jpg',
    scoreMultiplier: 2.5,
    unlockCost: 2600,
    bodyColor: 0x157a4c,
    interiorColor: 0x1f2220,
    dashColor: 0x181a18,
    accentColor: 0x34d399,
    dashStyle: 'muscle',
    enginePitch: 0.78,
    baseStats: {
      topSpeedKmh: 252,
      accel: 21.0,
      fuelCapacity: 120,
      handling: 10.6,
    },
  },
  {
    id: 'super_red',
    name: 'Stradale V8',
    subtitle: 'Mid-Engine Exotic',
    image: '/src/assets/images/car_super_red_1795357893714.jpg',
    scoreMultiplier: 3.0,
    unlockCost: 4800,
    bodyColor: 0xe81e25,
    interiorColor: 0x1c1c20,
    dashColor: 0x131316,
    accentColor: 0xf59e0b,
    dashStyle: 'super',
    enginePitch: 1.32,
    baseStats: {
      topSpeedKmh: 285,
      accel: 24.5,
      fuelCapacity: 126,
      handling: 12.2,
    },
  },
  {
    id: 'gt_yellow',
    name: 'Weissach GT3 RS',
    subtitle: 'Track Aero Coupe',
    image: '/src/assets/images/car_gt_yellow_1795357894340.jpg',
    scoreMultiplier: 3.5,
    unlockCost: 7500,
    bodyColor: 0xfacc15,
    interiorColor: 0x18191d,
    dashColor: 0x111216,
    accentColor: 0xfbbf24,
    dashStyle: 'gt',
    enginePitch: 1.42,
    baseStats: {
      topSpeedKmh: 312,
      accel: 27.5,
      fuelCapacity: 132,
      handling: 13.6,
    },
  },
  {
    id: 'hyper_obsidian',
    name: 'Obsidian Apex GT',
    subtitle: 'Carbon Prototype',
    image: '/src/assets/images/car_hyper_obsidian_1795357893429.jpg',
    scoreMultiplier: 4.0,
    unlockCost: 12000,
    bodyColor: 0x1e2028,
    interiorColor: 0x141519,
    dashColor: 0x0f1014,
    accentColor: 0xf59e0b,
    dashStyle: 'hyper',
    enginePitch: 1.54,
    baseStats: {
      topSpeedKmh: 345,
      accel: 31.5,
      fuelCapacity: 145,
      handling: 14.8,
    },
  },
];

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  city: {
    id: 'city',
    name: 'City Boulevard',
    chapterTitle: 'Chapter 1 · Metro Grid (Levels 1–20)',
    skyColor: 0xc2d5e8,
    fogColor: 0xc6d6e6,
    fogDensity: 0.0042,
    ambientSky: 0xdbeafe,
    ambientGround: 0x4b5563,
    sunColor: 0xfff7ed,
    sunIntensity: 1.65,
    groundColor: 0x6b7280,
    shoulderColor: 0x9ca3af,
    asphaltColor: '#484d57',
    centerLineColor: '#f8fafc',
    isNight: false,
  },
  mountain: {
    id: 'mountain',
    name: 'Pine Mountain Pass',
    chapterTitle: 'Chapter 2 · Alpine Pines (Levels 21–40)',
    skyColor: 0xb7d9f2,
    fogColor: 0xc8e1f0,
    fogDensity: 0.0046,
    ambientSky: 0xdbeafe,
    ambientGround: 0x3f4f38,
    sunColor: 0xfffbeb,
    sunIntensity: 1.75,
    groundColor: 0x5c6b43,
    shoulderColor: 0x7a7f6c,
    asphaltColor: '#4f545c',
    centerLineColor: '#f8fafc',
    isNight: false,
  },
  desert: {
    id: 'desert',
    name: 'Red Rock Canyon',
    chapterTitle: 'Chapter 3 · Desert Sunset (Levels 41–60)',
    skyColor: 0xe8b282,
    fogColor: 0xe8b68a,
    fogDensity: 0.0048,
    ambientSky: 0xfde68a,
    ambientGround: 0x7c4a2d,
    sunColor: 0xffedd5,
    sunIntensity: 1.85,
    groundColor: 0xb5764c,
    shoulderColor: 0xc7956d,
    asphaltColor: '#3f3d42',
    centerLineColor: '#fbbf24',
    isNight: false,
  },
  coastal: {
    id: 'coastal',
    name: 'Pacific Causeway',
    chapterTitle: 'Chapter 4 · Ocean Bridge (Levels 61–80)',
    skyColor: 0x93c5fd,
    fogColor: 0xbae6fd,
    fogDensity: 0.0038,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x0e7490,
    sunColor: 0xffffff,
    sunIntensity: 1.8,
    groundColor: 0x0d6b8a,
    shoulderColor: 0x94a3b8,
    asphaltColor: '#474c54',
    centerLineColor: '#f8fafc',
    isNight: false,
  },
  night: {
    id: 'night',
    name: 'Midnight Expressway',
    chapterTitle: 'Chapter 5 · Neon Night (Levels 81–100)',
    skyColor: 0x0b1020,
    fogColor: 0x0e152b,
    fogDensity: 0.0055,
    ambientSky: 0x334155,
    ambientGround: 0x090d16,
    sunColor: 0x93c5fd,
    sunIntensity: 0.75,
    groundColor: 0x161b26,
    shoulderColor: 0x262c3a,
    asphaltColor: '#1f232b',
    centerLineColor: '#eab308',
    isNight: true,
  },
};

const BIOME_ORDER: BiomeId[] = ['city', 'mountain', 'desert', 'coastal', 'night'];

const STAGE_ADJECTIVES = [
  'Morning',
  'Express',
  'Rush Hour',
  'Apex',
  'Slipstream',
  'Turbo',
  'Overdrive',
  'Grand',
  'Sprint',
  'Summit',
  'Canyon',
  'Horizon',
  'Velocity',
  'Thunder',
  'Crosswind',
  'Redline',
  'Switchback',
  'Midnight',
  'Legend',
  'Championship',
];

const BIOME_NOUNS: Record<BiomeId, string[]> = {
  city: ['Avenue', 'Boulevard', 'Loop', 'Viaduct', 'District'],
  mountain: ['Pass', 'Ridge', 'Timberway', 'Climb', 'Valley'],
  desert: ['Mesa', 'Freeway', 'Gorge', 'Stretch', 'Corridor'],
  coastal: ['Causeway', 'Bridge', 'Bayway', 'Overpass', 'Straits'],
  night: ['Expressway', 'Beltway', 'Tunnel', 'Skyway', 'Autobahn'],
};

export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, idx) => {
  const levelNumber = idx + 1;
  const chapterIndex = Math.floor(idx / 20);
  const posInChapter = idx % 20;
  const biome = BIOME_ORDER[chapterIndex];
  const adj = STAGE_ADJECTIVES[posInChapter];
  const noun = BIOME_NOUNS[biome][posInChapter % 5];

  const lanes: 3 | 4 = levelNumber % 3 === 0 || levelNumber > 40 ? 4 : 3;
  const twoWayTraffic =
    levelNumber >= 12 && (levelNumber % 2 === 0 || levelNumber > 50);

  // Target distance scales smoothly from 1,100m on Level 1 to 6,200m on Level 100
  const targetDistanceM = Math.round(1100 + idx * 51.5);

  // Traffic density scales from 7 cars to 21 cars active ahead
  const trafficDensity = Math.min(21, 7 + Math.floor(idx / 7));

  // Traffic speeds scale from 72 km/h to 148 km/h
  const trafficSpeedKmh = Math.round(72 + idx * 0.76);

  // Fuel drain slightly increases in higher levels, encouraging garage fuel upgrades
  const fuelDrainFactor = Number((0.92 + idx * 0.0085).toFixed(3));

  const coinReward = Math.round(180 + idx * 24 + (posInChapter === 19 ? 400 : 0));

  return {
    levelNumber,
    name: `${adj} ${noun}`,
    biome,
    lanes,
    twoWayTraffic,
    targetDistanceM,
    trafficDensity,
    trafficSpeedKmh,
    fuelDrainFactor,
    coinReward,
  };
});

export function getUpgradeCost(
  statKey: keyof CarUpgrades,
  currentLevel: number,
  carBaseCost: number
): number {
  const tierFactor = 1 + carBaseCost / 4000;
  const base =
    statKey === 'engine'
      ? 220
      : statKey === 'speed'
        ? 250
        : statKey === 'fuel'
          ? 200
          : 180;
  return Math.round(base * currentLevel * tierFactor);
}

export function getEffectiveCarStats(
  car: CarSpec,
  upgrades: CarUpgrades
): EffectiveCarStats {
  const eng = upgrades.engine - 1;
  const spd = upgrades.speed - 1;
  const fue = upgrades.fuel - 1;
  const hnd = upgrades.handling - 1;

  return {
    topSpeedKmh: Math.round(car.baseStats.topSpeedKmh + spd * 16),
    accel: Number((car.baseStats.accel + eng * 2.8).toFixed(1)),
    fuelCapacity: Math.round(car.baseStats.fuelCapacity + fue * 18),
    fuelBurnMultiplier: Number((1 - fue * 0.09).toFixed(2)),
    handling: Number((car.baseStats.handling + hnd * 1.4).toFixed(1)),
    braking: Number((28 + hnd * 4.5).toFixed(1)),
  };
}

export const DEFAULT_UPGRADES: CarUpgrades = {
  engine: 1,
  speed: 1,
  fuel: 1,
  handling: 1,
};

export const INITIAL_SAVE_STATE: SaveState = {
  coins: 2815,
  unlockedCars: ['compact_blue'],
  selectedCarId: 'compact_blue',
  upgradesByCar: {
    compact_blue: { ...DEFAULT_UPGRADES },
  },
  highestUnlockedLevel: 1,
  levelStars: {},
  bestEndlessScore: 0,
  controlMode: 'buttons',
  cameraPreset: 'cockpit',
  soundEnabled: true,
};

const STORAGE_KEY = 'new_baby_driver_save_v1';

export function loadSaveState(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_SAVE_STATE };
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      ...INITIAL_SAVE_STATE,
      ...parsed,
      unlockedCars:
        Array.isArray(parsed.unlockedCars) && parsed.unlockedCars.length > 0
          ? parsed.unlockedCars
          : ['compact_blue'],
      upgradesByCar: parsed.upgradesByCar ?? {
        compact_blue: { ...DEFAULT_UPGRADES },
      },
      levelStars: parsed.levelStars ?? {},
    };
  } catch {
    return { ...INITIAL_SAVE_STATE };
  }
}

export function persistSaveState(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
