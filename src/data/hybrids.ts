import type { CropId } from './crops'

export interface HybridRecipe {
  id: string
  result: CropId
  parentA: CropId
  parentB: CropId
  cost: number
  seedYield: number
}

export const HYBRID_RECIPES: HybridRecipe[] = [
  { id: 'h_rainbow_carrot', result: 'rainbowCarrot', parentA: 'carrot', parentB: 'strawberry', cost: 35, seedYield: 3 },
  { id: 'h_moon_corn', result: 'moonCorn', parentA: 'corn', parentB: 'wheat', cost: 40, seedYield: 3 },
  { id: 'h_spark_plum', result: 'sparkPlum', parentA: 'blueberry', parentB: 'lavender', cost: 65, seedYield: 2 },
  { id: 'h_candy_melon', result: 'candyMelon', parentA: 'watermelon', parentB: 'strawberry', cost: 80, seedYield: 2 },
]

export function findRecipe(a: CropId, b: CropId): HybridRecipe | undefined {
  return HYBRID_RECIPES.find(
    (r) =>
      (r.parentA === a && r.parentB === b) ||
      (r.parentA === b && r.parentB === a),
  )
}
