export type TractorId =
  | 'rusty'
  | 'rowRunner'
  | 'seedSprinter'
  | 'harvestKing'
  | 'mutationMachine'
  | 'goldenHarvester'
  | 'rainbowBeast'
  | 'ufo'

export interface TractorDef {
  id: TractorId
  name: string
  emoji: string
  description: string
  unlockCost: number
  harvestRadius: number
  bodyColor: string
  cabColor: string
  autoPlant: boolean
  autoWater: boolean
  mutationBonus: number
  sellBonus: number
  hover?: boolean
}

export const TRACTOR_LIST: TractorDef[] = [
  {
    id: 'rusty',
    name: 'Rusty Tractor',
    emoji: '🚜',
    description: 'Starter clunker. Small 3×3 harvest splash.',
    unlockCost: 0,
    harvestRadius: 1,
    bodyColor: '#9aa0ab',
    cabColor: '#7a8494',
    autoPlant: false,
    autoWater: false,
    mutationBonus: 0,
    sellBonus: 0,
  },
  {
    id: 'rowRunner',
    name: 'Row Runner',
    emoji: '🚜',
    description: 'Drives rows — 3×3 harvest splash.',
    unlockCost: 220,
    harvestRadius: 1,
    bodyColor: '#e84b6a',
    cabColor: '#4b6cb7',
    autoPlant: false,
    autoWater: false,
    mutationBonus: 0,
    sellBonus: 0,
  },
  {
    id: 'seedSprinter',
    name: 'Seed Sprinter',
    emoji: '🌱',
    description: 'Auto-plants while you harvest nearby.',
    unlockCost: 480,
    harvestRadius: 1,
    bodyColor: '#6ba84f',
    cabColor: '#4b6cb7',
    autoPlant: true,
    autoWater: false,
    mutationBonus: 0,
    sellBonus: 0,
  },
  {
    id: 'harvestKing',
    name: 'Harvest King',
    emoji: '👑',
    description: '5×5 harvest radius. Feel like royalty.',
    unlockCost: 950,
    harvestRadius: 2,
    bodyColor: '#e8a830',
    cabColor: '#4b6cb7',
    autoPlant: false,
    autoWater: false,
    mutationBonus: 0,
    sellBonus: 0.05,
  },
  {
    id: 'mutationMachine',
    name: 'Mutation Machine',
    emoji: '🧬',
    description: 'Boosts mutation chances on this field.',
    unlockCost: 1800,
    harvestRadius: 2,
    bodyColor: '#9b7bb8',
    cabColor: '#6c8ae4',
    autoPlant: false,
    autoWater: false,
    mutationBonus: 0.4,
    sellBonus: 0,
  },
  {
    id: 'goldenHarvester',
    name: 'Golden Harvester',
    emoji: '✨',
    description: '7×7 radius + auto-collects mature crops slowly.',
    unlockCost: 3500,
    harvestRadius: 3,
    bodyColor: '#f4c430',
    cabColor: '#4b6cb7',
    autoPlant: false,
    autoWater: false,
    mutationBonus: 0.15,
    sellBonus: 0.12,
  },
  {
    id: 'rainbowBeast',
    name: 'Rainbow Beast',
    emoji: '🌈',
    description: 'Huge 4-radius harvest with rainbow trails.',
    unlockCost: 7200,
    harvestRadius: 4,
    bodyColor: '#ff6b81',
    cabColor: '#6c8ae4',
    autoPlant: true,
    autoWater: true,
    mutationBonus: 0.25,
    sellBonus: 0.18,
  },
  {
    id: 'ufo',
    name: 'UFO Tractor',
    emoji: '🛸',
    description: 'Endgame hover craft. Massive bonuses.',
    unlockCost: 18000,
    harvestRadius: 4,
    bodyColor: '#b39ddb',
    cabColor: '#4b6cb7',
    autoPlant: true,
    autoWater: true,
    mutationBonus: 0.5,
    sellBonus: 0.25,
    hover: true,
  },
]

export const TRACTORS: Record<TractorId, TractorDef> = Object.fromEntries(
  TRACTOR_LIST.map((t) => [t.id, t]),
) as Record<TractorId, TractorDef>
