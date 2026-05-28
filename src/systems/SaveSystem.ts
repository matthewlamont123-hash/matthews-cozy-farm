import type { CropId } from '../data/crops'
import type { GameSave, GameSaveV1, GameSaveV2, GameSaveV3, ToolMode } from '../game/types'
import type { WeatherKind } from './Weather'
import { DEFAULT_AUTOMATION } from './Automation'
import type { AchievementStats } from './Achievements'
import type { Farm } from './Farm'
import type { Inventory } from './Inventory'

const KEY = 'cozy-farm-sim-save-v3'
const KEY_V2 = 'cozy-farm-sim-save-v2'

export function saveGame(state: {
  coins: number
  farm: Farm
  inventory: Inventory
  upgrades: Set<string>
  decors: Set<string>
  selectedCrop: CropId
  tool: ToolMode
  automation: typeof DEFAULT_AUTOMATION
  dailyStreak: number
  lastDailyClaim: number
  comboCount: number
  comboTimer: number
  prestigeLevel: number
  stats: AchievementStats
  unlockedAchievements: Set<string>
  activeQuestId: string | null
  questProgress: number
  completedQuestIds: string[]
  discoveredHybrids: Set<CropId>
  gameDay: number
  useRealSeason: boolean
  weather: WeatherKind
}): void {
  const payload: GameSaveV3 = {
    v: 3,
    coins: state.coins,
    gridW: state.farm.w,
    gridH: state.farm.h,
    tiles: state.farm.serializeTiles(),
    seeds: Object.fromEntries(state.inventory.seeds) as Partial<Record<CropId, number>>,
    harvest: Object.fromEntries(state.inventory.harvest) as Partial<Record<CropId, number>>,
    capacity: state.inventory.capacity,
    upgrades: [...state.upgrades],
    decors: [...state.decors],
    selectedCrop: state.selectedCrop,
    tool: state.tool,
    automation: { ...state.automation },
    dailyStreak: state.dailyStreak,
    lastDailyClaim: state.lastDailyClaim,
    comboCount: state.comboCount,
    comboTimer: state.comboTimer,
    prestigeLevel: state.prestigeLevel,
    stats: state.stats,
    unlockedAchievements: [...state.unlockedAchievements],
    activeQuestId: state.activeQuestId,
    questProgress: state.questProgress,
    completedQuestIds: state.completedQuestIds,
    discoveredHybrids: [...state.discoveredHybrids],
    gameDay: state.gameDay,
    useRealSeason: state.useRealSeason,
    weather: state.weather,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

function migrateV2(data: GameSaveV2): GameSaveV3 {
  return {
    v: 3,
    coins: data.coins,
    gridW: data.gridW,
    gridH: data.gridH,
    tiles: data.tiles,
    seeds: data.seeds,
    harvest: data.harvest,
    capacity: data.capacity,
    upgrades: data.upgrades,
    decors: data.decors,
    selectedCrop: data.selectedCrop,
    tool: data.tool,
    automation: data.automation,
    dailyStreak: data.dailyStreak,
    lastDailyClaim: data.lastDailyClaim,
    comboCount: data.comboCount,
    comboTimer: data.comboTimer,
    prestigeLevel: 0,
    stats: {
      totalHarvests: 0,
      totalSells: 0,
      totalCoinsEarned: data.coins,
      maxCombo: data.comboCount,
      questsCompleted: 0,
      prestiges: 0,
      hybridsDiscovered: 0,
      dailyStreakBest: data.dailyStreak,
    },
    unlockedAchievements: [],
    activeQuestId: null,
    questProgress: 0,
    completedQuestIds: [],
    discoveredHybrids: [],
    gameDay: 0,
    useRealSeason: true,
    weather: 'sunny',
  }
}

function migrateV1(data: GameSaveV1): GameSaveV3 {
  return migrateV2({
    v: 2,
    coins: data.coins,
    gridW: data.gridW,
    gridH: data.gridH,
    tiles: data.tiles,
    seeds: data.seeds,
    harvest: data.harvest,
    capacity: 16,
    upgrades: data.upgrades,
    decors: data.decors,
    selectedCrop: data.selectedCrop,
    tool: data.tool,
    automation: { ...DEFAULT_AUTOMATION },
    dailyDay: 0,
    dailyStreak: 0,
    lastDailyClaim: -1,
    comboCount: 0,
    comboTimer: 0,
  })
}

export function loadGame(): GameSaveV3 | null {
  try {
    const keys = [KEY, KEY_V2, 'cozy-farm-sim-save-v1']
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const data = JSON.parse(raw) as GameSave
      if (data.v === 3) return data as GameSaveV3
      if (data.v === 2) return migrateV2(data as GameSaveV2)
      if (data.v === 1) return migrateV1(data as GameSaveV1)
    }
    return null
  } catch {
    return null
  }
}

export function clearSave(): void {
  localStorage.removeItem(KEY)
  localStorage.removeItem(KEY_V2)
  localStorage.removeItem('cozy-farm-sim-save-v1')
}

export function applyLoadedFarm(farm: Farm, save: GameSaveV3): void {
  farm.resize(save.gridW, save.gridH)
  farm.loadTiles(save.tiles)
}
