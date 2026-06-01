import type { CropId, GameCropId } from '../data/crops'

export type ToolMode = 'hoe' | 'water' | 'plant' | 'harvest'

export interface TileState {
  kind: 'grass' | 'soil' | 'crop'
  cropId?: GameCropId
  /** 0..1 growth progress */
  growth: number
  /** Boosts growth speed until harvest */
  watered: boolean
  /** Tile squash bounce after harvest 0..1 */
  bounce: number
  /** Brief upward pop on harvest 0..1 */
  pop: number
  /** Remaining picks for multi-harvest crops */
  harvestsLeft?: number
  /** Brief flash when automation touches tile 0..1 */
  autoFlash?: number
  /** Crop mutation variant */
  mutation?: 'golden' | 'giant' | 'crystal' | 'rainbow'
}

export interface SerialTile {
  k: 'g' | 's' | 'c'
  c?: string
  g?: number
  w?: boolean
  h?: number
  m?: 'golden' | 'giant' | 'crystal' | 'rainbow'
}

export type AutomationKind = 'till' | 'plant' | 'water' | 'harvest' | 'sell'

export interface AutomationLevels {
  till: number
  plant: number
  water: number
  harvest: number
  sell: number
}

export interface GameSaveV1 {
  v: 1
  coins: number
  gridW: number
  gridH: number
  tiles: SerialTile[][]
  seeds: Partial<Record<CropId, number>>
  harvest: Partial<Record<CropId, number>>
  upgrades: string[]
  decors: string[]
  selectedCrop: CropId
  tool: ToolMode
}

export interface GameSaveV2 {
  v: 2
  coins: number
  gridW: number
  gridH: number
  tiles: SerialTile[][]
  seeds: Partial<Record<CropId, number>>
  harvest: Partial<Record<CropId, number>>
  capacity: number
  upgrades: string[]
  decors: string[]
  selectedCrop: CropId
  tool: ToolMode
  automation: AutomationLevels
  dailyDay: number
  dailyStreak: number
  lastDailyClaim: number
  comboCount: number
  comboTimer: number
}

export interface GameSaveV3 {
  v: 3
  coins: number
  gridW: number
  gridH: number
  tiles: SerialTile[][]
  seeds: Partial<Record<CropId, number>>
  harvest: Partial<Record<CropId, number>>
  capacity: number
  upgrades: string[]
  decors: string[]
  selectedCrop: CropId
  tool: ToolMode
  automation: AutomationLevels
  dailyStreak: number
  lastDailyClaim: number
  comboCount: number
  comboTimer: number
  prestigeLevel: number
  stats: {
    totalHarvests: number
    totalSells: number
    totalCoinsEarned: number
    maxCombo: number
    questsCompleted: number
    prestiges: number
    hybridsDiscovered: number
    dailyStreakBest: number
  }
  unlockedAchievements: string[]
  activeQuestId: string | null
  questProgress: number
  completedQuestIds: string[]
  discoveredHybrids: CropId[]
  gameDay: number
  useRealSeason: boolean
  weather: 'sunny' | 'rainy' | 'cloudy'
}

export interface GameSaveV4 {
  v: 4
  coins: number
  capacity: number
  seeds: Partial<Record<string, number>>
  harvest: Partial<Record<string, number>>
  upgrades: string[]
  decors: string[]
  selectedCrop: string
  tool: ToolMode
  automation: AutomationLevels
  dailyStreak: number
  lastDailyClaim: number
  comboCount: number
  comboTimer: number
  prestigeLevel: number
  stats: GameSaveV3['stats']
  unlockedAchievements: string[]
  activeQuestId: string | null
  questProgress: number
  completedQuestIds: string[]
  discoveredCrops: string[]
  gameDay: number
  useRealSeason: boolean
  weather: 'sunny' | 'rainy' | 'cloudy'
  activeField: string
  unlockedFields: string[]
  fieldData: Record<string, { w: number; h: number; tiles: SerialTile[][]; equipment: { irrigation: number; fertilizer: number; tractorId: string | null } }>
  starterExpansions: number
  ownedTractors: string[]
  journal: { crops: Record<string, number>; mutations: string[]; tractors: string[]; fields: string[] }
  activeEvent: string | null
  eventTimer: number
  /** Legacy v3 grid kept for migration reference */
  gridW?: number
  gridH?: number
  tiles?: SerialTile[][]
}

export type GameSave = GameSaveV1 | GameSaveV2 | GameSaveV3 | GameSaveV4
