import type { TractorId, TractorDef } from './tractors'

export type FieldId =
  | 'starter'
  | 'orchard'
  | 'greenhouse'
  | 'wetlands'
  | 'meadow'
  | 'crystal'
  | 'sky'

export type IrrigationTier = 0 | 1 | 2 | 3
export type FertilizerTier = 0 | 1 | 2 | 3

export interface FieldEquipment {
  irrigation: IrrigationTier
  fertilizer: FertilizerTier
  tractorId: TractorId | null
}

export interface FieldDef {
  id: FieldId
  name: string
  emoji: string
  description: string
  unlockCost: number
  baseSize: number
  maxSize: number
  theme: { grass: string; grassLight: string; soil: string; sky: string }
  bonuses: { growth?: number; sell?: number; mutation?: number }
}

export const FIELD_LIST: FieldDef[] = [
  {
    id: 'starter',
    name: 'Starter Field',
    emoji: '🌱',
    description: 'Your cozy first plot. Basic crops thrive here.',
    unlockCost: 0,
    baseSize: 3,
    maxSize: 9,
    theme: { grass: '#7ec86a', grassLight: '#9ed87f', soil: '#c48a58', sky: '#dceef8' },
    bonuses: {},
  },
  {
    id: 'orchard',
    name: 'Sunny Orchard',
    emoji: '🍎',
    description: 'Fruit trees and long-grow crops. Higher profits.',
    unlockCost: 450,
    baseSize: 4,
    maxSize: 6,
    theme: { grass: '#8ecf6a', grassLight: '#b8e88a', soil: '#b87848', sky: '#ffe8c8' },
    bonuses: { sell: 1.08 },
  },
  {
    id: 'greenhouse',
    name: 'Glass Greenhouse',
    emoji: '🪴',
    description: 'Warm glass speeds growth and mutation luck.',
    unlockCost: 950,
    baseSize: 4,
    maxSize: 5,
    theme: { grass: '#6ec89a', grassLight: '#9ee8bf', soil: '#a88458', sky: '#e8f8ff' },
    bonuses: { growth: 1.25, mutation: 1.15 },
  },
  {
    id: 'wetlands',
    name: 'Misty Wetlands',
    emoji: '🐸',
    description: 'Water crops and exclusive combos flourish.',
    unlockCost: 1900,
    baseSize: 5,
    maxSize: 6,
    theme: { grass: '#5aaa8a', grassLight: '#7ec8aa', soil: '#8a6848', sky: '#c8dce8' },
    bonuses: { growth: 1.1, sell: 1.05 },
  },
  {
    id: 'meadow',
    name: 'Flower Meadow',
    emoji: '🌸',
    description: 'Flowers bloom with pollination sell bonuses.',
    unlockCost: 3200,
    baseSize: 4,
    maxSize: 6,
    theme: { grass: '#9ed87f', grassLight: '#c8f0a8', soil: '#c49868', sky: '#ffe0f0' },
    bonuses: { sell: 1.12, mutation: 1.08 },
  },
  {
    id: 'crystal',
    name: 'Crystal Valley',
    emoji: '💎',
    description: 'Crystal mutations sparkle here.',
    unlockCost: 5800,
    baseSize: 5,
    maxSize: 7,
    theme: { grass: '#7ec8d8', grassLight: '#b8e8f8', soil: '#a87888', sky: '#d8e8ff' },
    bonuses: { mutation: 1.35, sell: 1.1 },
  },
  {
    id: 'sky',
    name: 'Sky Farm',
    emoji: '☁️',
    description: 'Floating island endgame. UFO tractor territory.',
    unlockCost: 14000,
    baseSize: 5,
    maxSize: 7,
    theme: { grass: '#a8d8ff', grassLight: '#d8f0ff', soil: '#c8a878', sky: '#f0f8ff' },
    bonuses: { growth: 1.15, sell: 1.2, mutation: 1.2 },
  },
]

export const FIELDS: Record<FieldId, FieldDef> = Object.fromEntries(
  FIELD_LIST.map((f) => [f.id, f]),
) as Record<FieldId, FieldDef>

export const IRRIGATION_LABEL: Record<IrrigationTier, string> = {
  0: 'None',
  1: 'Basic Sprinkler',
  2: 'Advanced Sprinkler',
  3: 'Golden Sprinkler',
}

export const FERTILIZER_LABEL: Record<FertilizerTier, string> = {
  0: 'None',
  1: 'Growth Boost',
  2: 'Yield Boost',
  3: 'Mutation Boost',
}

export const IRRIGATION_COST: Record<Exclude<IrrigationTier, 0>, number> = {
  1: 80,
  2: 280,
  3: 850,
}

export const FERTILIZER_COST: Record<Exclude<FertilizerTier, 0>, number> = {
  1: 70,
  2: 260,
  3: 780,
}

export function irrigationGrowthMult(tier: IrrigationTier): number {
  return tier === 0 ? 1 : tier === 1 ? 1.08 : tier === 2 ? 1.18 : 1.3
}

export function fertilizerSellMult(tier: FertilizerTier): number {
  return tier === 0 ? 1 : tier === 1 ? 1 : tier === 2 ? 1.15 : 1.1
}

export function fertilizerMutationMult(tier: FertilizerTier): number {
  return tier === 0 ? 1 : tier === 1 ? 1 : tier === 2 ? 1 : 1.25
}

export function defaultEquipment(fieldId?: FieldId): FieldEquipment {
  const eq: FieldEquipment = { irrigation: 0, fertilizer: 0, tractorId: null }
  if (fieldId === 'starter') eq.tractorId = 'rusty'
  return eq
}

export function tractorEffectTags(t: TractorDef): string[] {
  const tags: string[] = []
  if (t.harvestRadius <= 0) tags.push('1 tile harvest')
  else tags.push(`${1 + t.harvestRadius * 2}×${1 + t.harvestRadius * 2} harvest area`)
  if (t.autoPlant) tags.push('Auto-plant')
  if (t.autoWater) tags.push('Auto-water')
  if (t.mutationBonus > 0) tags.push(`+${Math.round(t.mutationBonus * 100)}% mutations`)
  if (t.sellBonus > 0) tags.push(`+${Math.round(t.sellBonus * 100)}% sell`)
  if (t.hover) tags.push('Hovering')
  return tags
}
