export type BiomeId = 'city' | 'mountain' | 'desert' | 'coastal' | 'night';

export type DashStyle = 'classic' | 'modern' | 'muscle' | 'super' | 'gt' | 'hyper';

export type ControlMode = 'buttons' | 'wheel' | 'tilt';

export type CameraPreset = 'cockpit' | 'dash' | 'hood';

export interface CarUpgrades {
  engine: number; // 1..5
  speed: number; // 1..5
  fuel: number; // 1..5
  handling: number; // 1..5
}

export interface CarSpec {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  scoreMultiplier: number;
  unlockCost: number;
  bodyColor: number;
  interiorColor: number;
  dashColor: number;
  accentColor: number;
  dashStyle: DashStyle;
  enginePitch: number;
  baseStats: {
    topSpeedKmh: number;
    accel: number; // m/s^2 factor
    fuelCapacity: number; // seconds of full-throttle endurance base
    handling: number; // lateral m/s responsiveness
  };
}

export interface EffectiveCarStats {
  topSpeedKmh: number;
  accel: number;
  fuelCapacity: number;
  fuelBurnMultiplier: number;
  handling: number;
  braking: number;
}

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  chapterTitle: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  ambientSky: number;
  ambientGround: number;
  sunColor: number;
  sunIntensity: number;
  groundColor: number;
  shoulderColor: number;
  asphaltColor: string;
  centerLineColor: string;
  isNight: boolean;
}

export interface LevelConfig {
  levelNumber: number;
  name: string;
  biome: BiomeId;
  lanes: 3 | 4;
  twoWayTraffic: boolean;
  targetDistanceM: number;
  trafficDensity: number; // vehicles active simultaneously
  trafficSpeedKmh: number;
  fuelDrainFactor: number;
  coinReward: number;
}

export type GameStatus =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'won'
  | 'crashed'
  | 'out_of_fuel';

export interface LiveTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  fuelPct: number;
  integrityPct: number;
  distanceM: number;
  targetDistanceM: number;
  score: number;
  sessionCoins: number;
  closePasses: number;
  levelNumber: number; // 0 = endless
  status: GameStatus;
  eventText: string | null;
  eventTone: 'info' | 'bonus' | 'warn';
}

export interface SaveState {
  coins: number;
  unlockedCars: string[];
  selectedCarId: string;
  upgradesByCar: Record<string, CarUpgrades>;
  highestUnlockedLevel: number;
  levelStars: Record<number, number>;
  bestEndlessScore: number;
  controlMode: ControlMode;
  cameraPreset: CameraPreset;
  soundEnabled: boolean;
}

export interface InputState {
  steer: number; // -1 (left) to +1 (right)
  throttle: boolean;
  brake: boolean;
  boost: boolean;
}
