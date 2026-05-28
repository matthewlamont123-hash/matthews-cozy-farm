export type UpgradeCategory =
  | 'water'
  | 'tractor'
  | 'backpack'
  | 'land'
  | 'crops'
  | 'automation'
  | 'value'
  | 'decor'

export interface UpgradeNode {
  id: string
  name: string
  description: string
  category: UpgradeCategory
  cost: number
  /** Prerequisite upgrade ids */
  requires: string[]
  /** Effect payload interpreted by game systems */
  effect: UpgradeEffect
}

export type UpgradeEffect =
  | { type: 'water_tier'; tier: number; growthMult: number }
  | { type: 'tractor_radius'; radius: number }
  | { type: 'backpack_slots'; slots: number }
  | { type: 'grid_expand'; addRowsCols: number }
  | { type: 'unlock_crop_tier'; tier: number }
  | { type: 'decor'; decorId: string }
  | { type: 'automation'; kind: 'till' | 'plant' | 'water' | 'harvest' | 'sell'; level: number }
  | { type: 'crop_value'; mult: number }
  | { type: 'harvest_speed'; mult: number }

/** Ordered for display in the tree — parents before children via requires[] */
export const UPGRADE_NODES: UpgradeNode[] = [
  {
    id: 'water_1',
    name: 'Copper Can',
    description: 'Crops grow 12% faster.',
    category: 'water',
    cost: 0,
    requires: [],
    effect: { type: 'water_tier', tier: 1, growthMult: 1.12 },
  },
  {
    id: 'water_2',
    name: 'Steel Can',
    description: 'Crops grow 28% faster.',
    category: 'water',
    cost: 45,
    requires: ['water_1'],
    effect: { type: 'water_tier', tier: 2, growthMult: 1.28 },
  },
  {
    id: 'water_3',
    name: 'Rainbow Can',
    description: 'Crops grow 45% faster — cozy shimmer included.',
    category: 'water',
    cost: 180,
    requires: ['water_2'],
    effect: { type: 'water_tier', tier: 3, growthMult: 1.45 },
  },
  {
    id: 'water_4',
    name: 'Thunder Can',
    description: 'Crops grow 65% faster. Yes, thunder can be cozy.',
    category: 'water',
    cost: 520,
    requires: ['water_3'],
    effect: { type: 'water_tier', tier: 4, growthMult: 1.65 },
  },
  {
    id: 'water_5',
    name: 'Moonlight Can',
    description: 'Crops grow 85% faster under starlight.',
    category: 'water',
    cost: 1200,
    requires: ['water_4'],
    effect: { type: 'water_tier', tier: 5, growthMult: 1.85 },
  },

  {
    id: 'tractor_1',
    name: 'Lil Tractor',
    description: 'Harvest hits the clicked tile plus neighbors (3×3).',
    category: 'tractor',
    cost: 185,
    requires: [],
    effect: { type: 'tractor_radius', radius: 1 },
  },
  {
    id: 'tractor_2',
    name: 'Chunky Tractor',
    description: 'Bigger tractor, bigger grin — 5×5 harvest splash.',
    category: 'tractor',
    cost: 140,
    requires: ['tractor_1'],
    effect: { type: 'tractor_radius', radius: 2 },
  },
  {
    id: 'tractor_3',
    name: 'Mega Tractor',
    description: '7×7 harvest party. Respect the zucchini.',
    category: 'tractor',
    cost: 480,
    requires: ['tractor_2'],
    effect: { type: 'tractor_radius', radius: 3 },
  },

  {
    id: 'pack_1',
    name: 'Paper Satchel',
    description: '+8 harvest slots (stacked high).',
    category: 'backpack',
    cost: 0,
    requires: [],
    effect: { type: 'backpack_slots', slots: 16 },
  },
  {
    id: 'pack_2',
    name: 'Canvas Pack',
    description: 'Holds way more sparkly produce.',
    category: 'backpack',
    cost: 60,
    requires: ['pack_1'],
    effect: { type: 'backpack_slots', slots: 32 },
  },
  {
    id: 'pack_3',
    name: 'Mythic Tote',
    description: 'Absurd harvest capacity upgrade.',
    category: 'backpack',
    cost: 220,
    requires: ['pack_2'],
    effect: { type: 'backpack_slots', slots: 56 },
  },
  {
    id: 'pack_4',
    name: 'Pocket Dimension',
    description: 'You bought a wormhole at a farmers market.',
    category: 'backpack',
    cost: 700,
    requires: ['pack_3'],
    effect: { type: 'backpack_slots', slots: 96 },
  },
  {
    id: 'pack_5',
    name: 'Cloud Basket',
    description: 'Harvests float in a fluffy cloud pouch.',
    category: 'backpack',
    cost: 1500,
    requires: ['pack_4'],
    effect: { type: 'backpack_slots', slots: 140 },
  },

  {
    id: 'land_1',
    name: 'Extra Plot',
    description: 'Expand the farm grid by +1 in each direction.',
    category: 'land',
    cost: 25,
    requires: [],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },
  {
    id: 'land_2',
    name: 'Meadow Bump',
    description: 'Another cozy expansion wave.',
    category: 'land',
    cost: 90,
    requires: ['land_1'],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },
  {
    id: 'land_3',
    name: 'Horizon Patch',
    description: 'Your farm is basically a theme park now.',
    category: 'land',
    cost: 280,
    requires: ['land_2'],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },
  {
    id: 'land_4',
    name: 'Valley Stretch',
    description: 'Rolling hills of tillable joy.',
    category: 'land',
    cost: 650,
    requires: ['land_3'],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },
  {
    id: 'land_5',
    name: 'Kingdom Plot',
    description: 'A whole cozy kingdom of soil.',
    category: 'land',
    cost: 1400,
    requires: ['land_4'],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },
  {
    id: 'land_6',
    name: 'Infinite Meadow',
    description: 'Well, not infinite. But very big.',
    category: 'land',
    cost: 3200,
    requires: ['land_5'],
    effect: { type: 'grid_expand', addRowsCols: 1 },
  },

  {
    id: 'crop_tier_1',
    name: 'Berry Studies',
    description: 'Unlock wheat, potato, and strawberry seeds.',
    category: 'crops',
    cost: 18,
    requires: [],
    effect: { type: 'unlock_crop_tier', tier: 1 },
  },
  {
    id: 'crop_tier_2',
    name: 'Salsa Branch',
    description: 'Sunflowers, tomatoes, and eggplants join the catalog.',
    category: 'crops',
    cost: 55,
    requires: ['crop_tier_1'],
    effect: { type: 'unlock_crop_tier', tier: 2 },
  },
  {
    id: 'crop_tier_3',
    name: 'Autumn Vibes',
    description: 'Pumpkins and lavender are legal tender (almost).',
    category: 'crops',
    cost: 130,
    requires: ['crop_tier_2'],
    effect: { type: 'unlock_crop_tier', tier: 3 },
  },
  {
    id: 'crop_tier_4',
    name: 'Blue Period',
    description: 'Blueberries and watermelons — main-character energy.',
    category: 'crops',
    cost: 300,
    requires: ['crop_tier_3'],
    effect: { type: 'unlock_crop_tier', tier: 4 },
  },
  {
    id: 'crop_tier_5',
    name: 'Golden Orchard',
    description: 'Golden apple seeds — rare, shiny, smug.',
    category: 'crops',
    cost: 650,
    requires: ['crop_tier_4'],
    effect: { type: 'unlock_crop_tier', tier: 5 },
  },

  {
    id: 'auto_till_1',
    name: 'Sleepy Hoe',
    description: 'Auto-tills 1 grass tile every 8 seconds.',
    category: 'automation',
    cost: 75,
    requires: [],
    effect: { type: 'automation', kind: 'till', level: 1 },
  },
  {
    id: 'auto_till_2',
    name: 'Busy Hoe',
    description: 'Auto-tills faster — 1 tile every 5 seconds.',
    category: 'automation',
    cost: 220,
    requires: ['auto_till_1'],
    effect: { type: 'automation', kind: 'till', level: 2 },
  },
  {
    id: 'auto_till_3',
    name: 'Turbo Hoe',
    description: 'Auto-tills 2 tiles per tick, every 4 seconds.',
    category: 'automation',
    cost: 580,
    requires: ['auto_till_2'],
    effect: { type: 'automation', kind: 'till', level: 3 },
  },

  {
    id: 'auto_plant_1',
    name: 'Seed Sprinkler',
    description: 'Auto-plants your selected crop every 10 seconds.',
    category: 'automation',
    cost: 95,
    requires: ['auto_till_1'],
    effect: { type: 'automation', kind: 'plant', level: 1 },
  },
  {
    id: 'auto_plant_2',
    name: 'Seed Cannon',
    description: 'Plants faster — every 6 seconds, 2 tiles.',
    category: 'automation',
    cost: 280,
    requires: ['auto_plant_1'],
    effect: { type: 'automation', kind: 'plant', level: 2 },
  },
  {
    id: 'auto_plant_3',
    name: 'Seed Storm',
    description: 'Plants 3 tiles every 5 seconds.',
    category: 'automation',
    cost: 720,
    requires: ['auto_plant_2'],
    effect: { type: 'automation', kind: 'plant', level: 3 },
  },

  {
    id: 'auto_water_1',
    name: 'Drip Buddy',
    description: 'Waters 1 crop every 7 seconds.',
    category: 'automation',
    cost: 85,
    requires: ['auto_till_1'],
    effect: { type: 'automation', kind: 'water', level: 1 },
  },
  {
    id: 'auto_water_2',
    name: 'Mist Machine',
    description: 'Waters 2 crops every 5 seconds.',
    category: 'automation',
    cost: 260,
    requires: ['auto_water_1'],
    effect: { type: 'automation', kind: 'water', level: 2 },
  },
  {
    id: 'auto_water_3',
    name: 'Rain Cloud',
    description: 'Waters 4 crops every 4 seconds.',
    category: 'automation',
    cost: 680,
    requires: ['auto_water_2'],
    effect: { type: 'automation', kind: 'water', level: 3 },
  },

  {
    id: 'auto_harvest_1',
    name: 'Helpful Basket',
    description: 'Auto-harvests 1 mature crop every 9 seconds.',
    category: 'automation',
    cost: 120,
    requires: ['auto_plant_1'],
    effect: { type: 'automation', kind: 'harvest', level: 1 },
  },
  {
    id: 'auto_harvest_2',
    name: 'Harvest Hopper',
    description: 'Harvests 2 crops every 6 seconds.',
    category: 'automation',
    cost: 350,
    requires: ['auto_harvest_1'],
    effect: { type: 'automation', kind: 'harvest', level: 2 },
  },
  {
    id: 'auto_harvest_3',
    name: 'Mega Hopper',
    description: 'Harvests 4 crops every 5 seconds.',
    category: 'automation',
    cost: 900,
    requires: ['auto_harvest_2'],
    effect: { type: 'automation', kind: 'harvest', level: 3 },
  },

  {
    id: 'auto_sell_1',
    name: 'Market Bell',
    description: 'Auto-sells satchel when 80% full, every 15 seconds.',
    category: 'automation',
    cost: 150,
    requires: ['auto_harvest_1'],
    effect: { type: 'automation', kind: 'sell', level: 1 },
  },
  {
    id: 'auto_sell_2',
    name: 'Market Cart',
    description: 'Auto-sells at 60% full, every 10 seconds.',
    category: 'automation',
    cost: 420,
    requires: ['auto_sell_1'],
    effect: { type: 'automation', kind: 'sell', level: 2 },
  },
  {
    id: 'auto_sell_3',
    name: 'Market Express',
    description: 'Auto-sells at 40% full, every 7 seconds.',
    category: 'automation',
    cost: 1100,
    requires: ['auto_sell_2'],
    effect: { type: 'automation', kind: 'sell', level: 3 },
  },

  {
    id: 'value_1',
    name: 'Farmers Market',
    description: 'All crop sell prices +10%.',
    category: 'value',
    cost: 40,
    requires: [],
    effect: { type: 'crop_value', mult: 1.1 },
  },
  {
    id: 'value_2',
    name: 'Gourmet Stand',
    description: 'All crop sell prices +22%.',
    category: 'value',
    cost: 160,
    requires: ['value_1'],
    effect: { type: 'crop_value', mult: 1.22 },
  },
  {
    id: 'value_3',
    name: 'Golden Label',
    description: 'All crop sell prices +38%.',
    category: 'value',
    cost: 480,
    requires: ['value_2'],
    effect: { type: 'crop_value', mult: 1.38 },
  },
  {
    id: 'value_4',
    name: 'Legendary Stall',
    description: 'All crop sell prices +55%.',
    category: 'value',
    cost: 1100,
    requires: ['value_3'],
    effect: { type: 'crop_value', mult: 1.55 },
  },

  {
    id: 'speed_1',
    name: 'Quick Hands',
    description: 'Combo harvest window lasts longer (+15%).',
    category: 'value',
    cost: 30,
    requires: [],
    effect: { type: 'harvest_speed', mult: 1.15 },
  },
  {
    id: 'speed_2',
    name: 'Swift Picker',
    description: 'Combo bonus builds faster (+30%).',
    category: 'value',
    cost: 120,
    requires: ['speed_1'],
    effect: { type: 'harvest_speed', mult: 1.3 },
  },

  {
    id: 'decor_pinwheel',
    name: 'Toy Pinwheel',
    description: 'Spinny friend for the fence line.',
    category: 'decor',
    cost: 15,
    requires: [],
    effect: { type: 'decor', decorId: 'pinwheel' },
  },
  {
    id: 'decor_scarecrow',
    name: 'Soft Scarecrow',
    description: 'Scares… absolutely nothing. Very cute though.',
    category: 'decor',
    cost: 40,
    requires: ['decor_pinwheel'],
    effect: { type: 'decor', decorId: 'scarecrow' },
  },
  {
    id: 'decor_cloud',
    name: 'Happy Cloud',
    description: 'A little cloud that follows your farm mood.',
    category: 'decor',
    cost: 90,
    requires: ['decor_scarecrow'],
    effect: { type: 'decor', decorId: 'cloud' },
  },
]

export const BASE_PLOT_SIZE = 3
export const MAX_LAND_EXPANSIONS = 6

export function maxPlotSize(): number {
  return BASE_PLOT_SIZE + MAX_LAND_EXPANSIONS
}

export function getNode(id: string): UpgradeNode | undefined {
  return UPGRADE_NODES.find((n) => n.id === id)
}
