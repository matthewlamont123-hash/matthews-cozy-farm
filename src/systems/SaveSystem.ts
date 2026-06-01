import type { ToolMode } from '../game/types'
import type { GameSave, GameSaveV1, GameSaveV2, GameSaveV3, GameSaveV4 } from '../game/types'
import type { FieldId } from '../data/fields'
import type { TractorId } from '../data/tractors'
import type { WeatherKind } from './Weather'
import { DEFAULT_AUTOMATION } from './Automation'
import type { AchievementStats } from './Achievements'
import type { FieldManager } from './FieldManager'
import type { Inventory } from './Inventory'
import type { DiscoveryJournal } from './DiscoveryJournal'

const KEY = 'cozy-farm-sim-save-v4'
const KEY_V3 = 'cozy-farm-sim-save-v3'

export function saveGame(state: {
  coins: number
  fieldManager: FieldManager
  inventory: Inventory
  upgrades: Set<string>
  decors: Set<string>
  selectedCrop: string
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
  discoveredCrops: Set<string>
  gameDay: number
  useRealSeason: boolean
  weather: WeatherKind
  ownedTractors: Set<TractorId>
  journal: DiscoveryJournal
  activeEvent: string | null
  eventTimer: number
}): void {
  const payload: GameSaveV4 = {
    v: 4,
    coins: state.coins,
    capacity: state.inventory.capacity,
    seeds: Object.fromEntries(state.inventory.seeds),
    harvest: Object.fromEntries(state.inventory.harvest),
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
    discoveredCrops: [...state.discoveredCrops],
    gameDay: state.gameDay,
    useRealSeason: state.useRealSeason,
    weather: state.weather,
    activeField: state.fieldManager.activeId,
    unlockedFields: [...state.fieldManager.unlocked],
    fieldData: state.fieldManager.serializeFields() as GameSaveV4['fieldData'],
    starterExpansions: state.fieldManager.starterExpansions,
    ownedTractors: [...state.ownedTractors],
    journal: state.journal.toJSON(),
    activeEvent: state.activeEvent,
    eventTimer: state.eventTimer,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

function migrateV3(data: GameSaveV3): GameSaveV4 {
  const discovered: string[] = [...(data.discoveredHybrids ?? [])]
  for (const id of [...discovered]) {
    if (id === 'rainbowCarrot') discovered.push('disc_rainbow_carrot')
    if (id === 'moonCorn') discovered.push('disc_moon_corn')
    if (id === 'sparkPlum') discovered.push('disc_spark_plum')
    if (id === 'candyMelon') discovered.push('disc_candy_melon')
  }
  const uniqueDisc = [...new Set(discovered.map((id) => (id.startsWith('disc_') ? id : `legacy_${id}`)))]
  const expansions = Math.max(0, data.gridW - 3)
  return {
    v: 4,
    coins: data.coins,
    capacity: data.capacity,
    seeds: data.seeds as Record<string, number>,
    harvest: data.harvest as Record<string, number>,
    upgrades: data.upgrades,
    decors: data.decors,
    selectedCrop: data.selectedCrop,
    tool: data.tool,
    automation: data.automation,
    dailyStreak: data.dailyStreak,
    lastDailyClaim: data.lastDailyClaim,
    comboCount: data.comboCount,
    comboTimer: data.comboTimer,
    prestigeLevel: data.prestigeLevel,
    stats: data.stats,
    unlockedAchievements: data.unlockedAchievements,
    activeQuestId: data.activeQuestId,
    questProgress: data.questProgress,
    completedQuestIds: data.completedQuestIds,
    discoveredCrops: uniqueDisc.filter((id) => id.startsWith('disc_')),
    gameDay: data.gameDay,
    useRealSeason: data.useRealSeason,
    weather: data.weather,
    activeField: 'starter',
    unlockedFields: ['starter'],
    fieldData: {
      starter: {
        w: data.gridW,
        h: data.gridH,
        tiles: data.tiles,
        equipment: { irrigation: 0, fertilizer: 0, tractorId: null },
      },
    },
    starterExpansions: expansions,
    ownedTractors: data.upgrades.includes('tractor_1') ? ['rowRunner'] : ['rusty'],
    journal: {
      crops: Object.fromEntries(uniqueDisc.filter((id) => id.startsWith('disc_')).map((id) => [id, Date.now()])),
      mutations: [],
      tractors: data.upgrades.includes('tractor_1') ? ['rowRunner'] : ['rusty'],
      fields: ['starter'],
    },
    activeEvent: null,
    eventTimer: 0,
  }
}

function migrateV2(data: GameSaveV2): GameSaveV4 {
  return migrateV3({
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
  })
}

function migrateV1(data: GameSaveV1): GameSaveV4 {
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

export function loadGame(): GameSaveV4 | null {
  try {
    const keys = [KEY, KEY_V3, 'cozy-farm-sim-save-v2', 'cozy-farm-sim-save-v1']
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const data = JSON.parse(raw) as GameSave
      if (data.v === 4) return data as GameSaveV4
      if (data.v === 3) return migrateV3(data as GameSaveV3)
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
  localStorage.removeItem(KEY_V3)
  localStorage.removeItem('cozy-farm-sim-save-v2')
  localStorage.removeItem('cozy-farm-sim-save-v1')
}

export function applyLoadedFields(fm: FieldManager, save: GameSaveV4): void {
  fm.hydrate(
    save.unlockedFields as FieldId[],
    save.activeField as FieldId,
    save.fieldData as Parameters<FieldManager['hydrate']>[2],
    save.starterExpansions,
  )
}
