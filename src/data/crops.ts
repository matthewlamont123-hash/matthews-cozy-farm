export type CropId =
  | 'turnip'
  | 'carrot'
  | 'corn'
  | 'wheat'
  | 'potato'
  | 'strawberry'
  | 'sunflower'
  | 'tomato'
  | 'eggplant'
  | 'pumpkin'
  | 'lavender'
  | 'blueberry'
  | 'watermelon'
  | 'goldenApple'
  | 'rainbowCarrot'
  | 'moonCorn'
  | 'sparkPlum'
  | 'candyMelon'

export type CropRarity = 'common' | 'uncommon' | 'rare' | 'gold' | 'rainbow'
export type CropSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'yearRound'

export type GameCropId = CropId | string

export interface CropDefinition {
  id: GameCropId
  name: string
  emoji: string
  rarity: CropRarity
  season: CropSeason
  /** Base seconds until fully grown (before watering-can multiplier). */
  baseGrowSeconds: number
  seedBuyPrice: number
  sellPrice: number
  /** Upgrade node id required to buy seeds — undefined = unlocked from start. */
  unlockUpgradeId?: string
  /** Multi-harvest: how many times crop can be picked before removal */
  maxHarvests?: number
  /** Fraction of base grow time for regrow after first pick */
  regrowRatio?: number
  /** Hybrid crops must be discovered via breeding */
  isHybrid?: boolean
  stalk: string
  accent: string
  top: string
}

export const SEASON_LABEL: Record<CropSeason, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
  yearRound: 'All season',
}

export const RARITY_LABEL: Record<CropRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  gold: 'Gold',
  rainbow: 'Rainbow',
}

export const CROPS: Record<CropId, CropDefinition> = {
  turnip: {
    id: 'turnip',
    name: 'Turnip',
    emoji: '🥬',
    rarity: 'common',
    season: 'spring',
    baseGrowSeconds: 6,
    seedBuyPrice: 1,
    sellPrice: 5,
    stalk: '#79c069',
    accent: '#e8f0d8',
    top: '#f5f5dc',
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    emoji: '🥕',
    rarity: 'common',
    season: 'spring',
    baseGrowSeconds: 10,
    seedBuyPrice: 2,
    sellPrice: 8,
    stalk: '#79c069',
    accent: '#e8a04f',
    top: '#ff9f43',
  },
  corn: {
    id: 'corn',
    name: 'Corn',
    emoji: '🌽',
    rarity: 'common',
    season: 'summer',
    baseGrowSeconds: 14,
    seedBuyPrice: 4,
    sellPrice: 16,
    stalk: '#6ba84f',
    accent: '#f4d35e',
    top: '#ffe066',
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    emoji: '🌾',
    rarity: 'common',
    season: 'summer',
    baseGrowSeconds: 12,
    seedBuyPrice: 3,
    sellPrice: 12,
    unlockUpgradeId: 'crop_tier_1',
    stalk: '#c4a35a',
    accent: '#e8d090',
    top: '#f4d35e',
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    emoji: '🥔',
    rarity: 'common',
    season: 'autumn',
    baseGrowSeconds: 16,
    seedBuyPrice: 5,
    sellPrice: 18,
    unlockUpgradeId: 'crop_tier_1',
    stalk: '#6ba84f',
    accent: '#c4a574',
    top: '#d4a574',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    emoji: '🍓',
    rarity: 'uncommon',
    season: 'spring',
    baseGrowSeconds: 18,
    seedBuyPrice: 8,
    sellPrice: 28,
    unlockUpgradeId: 'crop_tier_1',
    maxHarvests: 3,
    regrowRatio: 0.45,
    stalk: '#5d9c4b',
    accent: '#e84b6a',
    top: '#ff6b81',
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    emoji: '🌻',
    rarity: 'uncommon',
    season: 'summer',
    baseGrowSeconds: 22,
    seedBuyPrice: 10,
    sellPrice: 32,
    unlockUpgradeId: 'crop_tier_2',
    stalk: '#6ba84f',
    accent: '#8b6914',
    top: '#ffd54f',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    rarity: 'uncommon',
    season: 'summer',
    baseGrowSeconds: 24,
    seedBuyPrice: 14,
    sellPrice: 42,
    unlockUpgradeId: 'crop_tier_2',
    maxHarvests: 4,
    regrowRatio: 0.5,
    stalk: '#4f8f46',
    accent: '#d64545',
    top: '#ff6b5b',
  },
  eggplant: {
    id: 'eggplant',
    name: 'Eggplant',
    emoji: '🍆',
    rarity: 'uncommon',
    season: 'autumn',
    baseGrowSeconds: 26,
    seedBuyPrice: 16,
    sellPrice: 48,
    unlockUpgradeId: 'crop_tier_2',
    stalk: '#4f8f46',
    accent: '#6a4c93',
    top: '#8e6bb8',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Pumpkin',
    emoji: '🎃',
    rarity: 'rare',
    season: 'autumn',
    baseGrowSeconds: 38,
    seedBuyPrice: 22,
    sellPrice: 68,
    unlockUpgradeId: 'crop_tier_3',
    stalk: '#6d8b3d',
    accent: '#e67e22',
    top: '#f39c12',
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    rarity: 'rare',
    season: 'spring',
    baseGrowSeconds: 32,
    seedBuyPrice: 24,
    sellPrice: 72,
    unlockUpgradeId: 'crop_tier_3',
    maxHarvests: 2,
    regrowRatio: 0.55,
    stalk: '#5d9c4b',
    accent: '#9b7bb8',
    top: '#b39ddb',
  },
  blueberry: {
    id: 'blueberry',
    name: 'Blueberry',
    emoji: '🫐',
    rarity: 'gold',
    season: 'summer',
    baseGrowSeconds: 42,
    seedBuyPrice: 32,
    sellPrice: 95,
    unlockUpgradeId: 'crop_tier_4',
    maxHarvests: 5,
    regrowRatio: 0.4,
    stalk: '#4a7c59',
    accent: '#4b6cb7',
    top: '#6c8ae4',
  },
  watermelon: {
    id: 'watermelon',
    name: 'Watermelon',
    emoji: '🍉',
    rarity: 'gold',
    season: 'summer',
    baseGrowSeconds: 55,
    seedBuyPrice: 45,
    sellPrice: 120,
    unlockUpgradeId: 'crop_tier_4',
    stalk: '#5d9c4b',
    accent: '#2e7d32',
    top: '#ef5350',
  },
  goldenApple: {
    id: 'goldenApple',
    name: 'Golden Apple',
    emoji: '🍎',
    rarity: 'rainbow',
    season: 'yearRound',
    baseGrowSeconds: 70,
    seedBuyPrice: 80,
    sellPrice: 260,
    unlockUpgradeId: 'crop_tier_5',
    stalk: '#8b7355',
    accent: '#f4c430',
    top: '#ffd54f',
  },
  rainbowCarrot: {
    id: 'rainbowCarrot',
    name: 'Rainbow Carrot',
    emoji: '🌈',
    rarity: 'rare',
    season: 'spring',
    baseGrowSeconds: 24,
    seedBuyPrice: 28,
    sellPrice: 85,
    isHybrid: true,
    stalk: '#79c069',
    accent: '#ff6b81',
    top: '#ff9f43',
  },
  moonCorn: {
    id: 'moonCorn',
    name: 'Moon Corn',
    emoji: '🌙',
    rarity: 'uncommon',
    season: 'summer',
    baseGrowSeconds: 20,
    seedBuyPrice: 18,
    sellPrice: 52,
    isHybrid: true,
    stalk: '#6ba84f',
    accent: '#b39ddb',
    top: '#ffe066',
  },
  sparkPlum: {
    id: 'sparkPlum',
    name: 'Spark Plum',
    emoji: '✨',
    rarity: 'gold',
    season: 'summer',
    baseGrowSeconds: 48,
    seedBuyPrice: 55,
    sellPrice: 140,
    isHybrid: true,
    maxHarvests: 2,
    regrowRatio: 0.5,
    stalk: '#4a7c59',
    accent: '#9b7bb8',
    top: '#6c8ae4',
  },
  candyMelon: {
    id: 'candyMelon',
    name: 'Candy Melon',
    emoji: '🍬',
    rarity: 'gold',
    season: 'summer',
    baseGrowSeconds: 52,
    seedBuyPrice: 60,
    sellPrice: 155,
    isHybrid: true,
    stalk: '#5d9c4b',
    accent: '#ff6b81',
    top: '#ef5350',
  },
}

export const CROP_LIST = Object.values(CROPS)

export const CROP_BY_SEASON: Record<CropSeason, CropDefinition[]> = {
  spring: CROP_LIST.filter((c) => c.season === 'spring' || c.season === 'yearRound'),
  summer: CROP_LIST.filter((c) => c.season === 'summer' || c.season === 'yearRound'),
  autumn: CROP_LIST.filter((c) => c.season === 'autumn' || c.season === 'yearRound'),
  winter: CROP_LIST.filter((c) => c.season === 'yearRound'),
  yearRound: CROP_LIST.filter((c) => c.season === 'yearRound'),
}

export function cropUnlocked(
  def: CropDefinition,
  ownedUpgrades: Set<string>,
  discovered: Set<string> = new Set(),
): boolean {
  if (isDiscoveredCropId(def.id) || def.isHybrid) return discovered.has(def.id)
  if (!def.unlockUpgradeId) return true
  return ownedUpgrades.has(def.unlockUpgradeId)
}

export function sellPriceWithBonus(basePrice: number, valueMult: number): number {
  return Math.max(1, Math.floor(basePrice * valueMult))
}

/** 0..3 visible growth stage */
export function cropStage(growth: number): number {
  if (growth >= 0.85) return 3
  if (growth >= 0.5) return 2
  if (growth >= 0.22) return 1
  return 0
}

export function secondsRemaining(
  growth: number,
  baseGrowSeconds: number,
  growthSpeedMult: number,
  watered: boolean,
): number {
  const left = 1 - growth
  if (left <= 0) return 0
  const waterBoost = watered ? 1.55 : 1
  const rate = (growthSpeedMult * waterBoost) / Math.max(0.5, baseGrowSeconds)
  return Math.ceil(left / rate)
}

export function isMultiHarvest(def: CropDefinition): boolean {
  return (def.maxHarvests ?? 1) > 1
}

import { DISCOVERED_CROPS } from './discoveredCrops'

export function getCrop(id: string): CropDefinition {
  const base = (CROPS as Record<string, CropDefinition>)[id]
  if (base) return base
  const disc = (DISCOVERED_CROPS as Record<string, CropDefinition>)[id]
  if (disc) return disc
  return CROPS.turnip
}

export const ALL_CROPS = { ...CROPS, ...DISCOVERED_CROPS } as Record<string, CropDefinition>
export const ALL_CROP_LIST = Object.values(ALL_CROPS)

export function isDiscoveredCropId(id: string): boolean {
  return id.startsWith('disc_')
}
