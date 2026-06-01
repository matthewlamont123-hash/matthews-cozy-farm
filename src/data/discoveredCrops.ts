import type { CropDefinition, CropSeason } from './crops'
import { DISCOVERY_RECIPES } from './discoveries'
import type { DiscoveryRecipe } from './discoveries'

export type DiscoveredCropId = (typeof DISCOVERY_RECIPES)[number]['result']

export type DiscoveredCropDefinition = Omit<CropDefinition, 'isHybrid' | 'unlockUpgradeId'> & {
  id: DiscoveredCropId
  isDiscovered: true
  seedBuyPrice: 0
}

const SEASONS: CropSeason[] = ['spring', 'summer', 'autumn']

const COZY_PALETTES: ReadonlyArray<Pick<DiscoveredCropDefinition, 'stalk' | 'accent' | 'top'>> = [
  { stalk: '#79c069', accent: '#e8a04f', top: '#ff9f43' },
  { stalk: '#6ba84f', accent: '#f4d35e', top: '#ffe066' },
  { stalk: '#5d9c4b', accent: '#e84b6a', top: '#ff6b81' },
  { stalk: '#4f8f46', accent: '#d64545', top: '#ff6b5b' },
  { stalk: '#6d8b3d', accent: '#e67e22', top: '#f39c12' },
  { stalk: '#5d9c4b', accent: '#9b7bb8', top: '#b39ddb' },
  { stalk: '#4a7c59', accent: '#4b6cb7', top: '#6c8ae4' },
  { stalk: '#8b7355', accent: '#f4c430', top: '#ffd54f' },
  { stalk: '#6ba84f', accent: '#c4a574', top: '#d4a574' },
  { stalk: '#c4a35a', accent: '#e8d090', top: '#f4d35e' },
  { stalk: '#4f8f46', accent: '#6a4c93', top: '#8e6bb8' },
  { stalk: '#5d9c4b', accent: '#2e7d32', top: '#ef5350' },
  { stalk: '#79c069', accent: '#ff6b81', top: '#ff9f43' },
  { stalk: '#6ba84f', accent: '#b39ddb', top: '#ffe066' },
  { stalk: '#4a7c59', accent: '#9b7bb8', top: '#6c8ae4' },
  { stalk: '#5d9c4b', accent: '#ff6b81', top: '#ef5350' },
  { stalk: '#7cb342', accent: '#ffb74d', top: '#ffa726' },
  { stalk: '#689f38', accent: '#ce93d8', top: '#ab47bc' },
]

function cropFromRecipe(recipe: DiscoveryRecipe, index: number): DiscoveredCropDefinition {
  const colors = COZY_PALETTES[index % COZY_PALETTES.length]
  return {
    id: recipe.result as DiscoveredCropId,
    name: recipe.name,
    emoji: recipe.emoji,
    rarity: recipe.rarity,
    season: SEASONS[index % SEASONS.length],
    baseGrowSeconds: recipe.growSeconds,
    seedBuyPrice: 0,
    sellPrice: recipe.sellPrice,
    isDiscovered: true,
    stalk: colors.stalk,
    accent: colors.accent,
    top: colors.top,
  }
}

export const DISCOVERED_CROPS: Record<DiscoveredCropId, DiscoveredCropDefinition> = Object.fromEntries(
  DISCOVERY_RECIPES.map((recipe, index) => [recipe.result, cropFromRecipe(recipe, index)]),
) as Record<DiscoveredCropId, DiscoveredCropDefinition>

export const DISCOVERED_CROP_LIST = Object.values(DISCOVERED_CROPS)
