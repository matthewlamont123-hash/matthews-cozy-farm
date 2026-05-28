import type { AutomationKind } from '../game/types'
import type { AutomationLevels } from '../game/types'

export interface PetDef {
  id: string
  name: string
  emoji: string
  automation: AutomationKind
  minLevel: number
}

export const PETS: PetDef[] = [
  { id: 'mole', name: 'Diggy', emoji: '🐹', automation: 'till', minLevel: 1 },
  { id: 'bird', name: 'Pebbles', emoji: '🐦', automation: 'plant', minLevel: 1 },
  { id: 'frog', name: 'Splash', emoji: '🐸', automation: 'water', minLevel: 1 },
  { id: 'bunny', name: 'Hopper', emoji: '🐰', automation: 'harvest', minLevel: 1 },
  { id: 'cat', name: 'Merchant', emoji: '🐱', automation: 'sell', minLevel: 1 },
  { id: 'fox', name: 'Rusty', emoji: '🦊', automation: 'till', minLevel: 3 },
  { id: 'owl', name: 'Moonbeam', emoji: '🦉', automation: 'harvest', minLevel: 3 },
]

export interface PetSpot {
  id: string
  emoji: string
  x: number
  y: number
  phase: number
}

export function activePets(levels: AutomationLevels, farmOx: number, farmOy: number, farmSize: number): PetSpot[] {
  const spots: PetSpot[] = []
  let i = 0
  for (const pet of PETS) {
    if ((levels[pet.automation] ?? 0) < pet.minLevel) continue
    const angle = i * 1.2 + pet.minLevel
    spots.push({
      id: pet.id,
      emoji: pet.emoji,
      x: farmOx + farmSize + 20 + (i % 2) * 18,
      y: farmOy + 30 + i * 28,
      phase: angle,
    })
    i++
  }
  return spots
}
