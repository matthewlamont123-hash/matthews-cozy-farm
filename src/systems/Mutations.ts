import type { TileState } from '../game/types'

export type MutationKind = 'golden' | 'giant' | 'crystal' | 'rainbow'

export const MUTATION_LABEL: Record<MutationKind, string> = {
  golden: 'Golden',
  giant: 'Giant',
  crystal: 'Crystal',
  rainbow: 'Rainbow',
}

export const MUTATION_EMOJI: Record<MutationKind, string> = {
  golden: '✨',
  giant: '📏',
  crystal: '💎',
  rainbow: '🌈',
}

export const MUTATION_SELL_MULT: Record<MutationKind, number> = {
  golden: 2,
  giant: 1.75,
  crystal: 2.5,
  rainbow: 3.5,
}

const BASE_CHANCE = 0.018

export function rollMutationOnMature(chanceMult: number): MutationKind | null {
  const roll = Math.random()
  const c = BASE_CHANCE * chanceMult
  if (roll > c) return null
  const r = Math.random()
  if (r < 0.4) return 'golden'
  if (r < 0.65) return 'giant'
  if (r < 0.85) return 'crystal'
  return 'rainbow'
}

export function applyMutationToTile(t: TileState, kind: MutationKind): void {
  if (t.kind !== 'crop') return
  t.mutation = kind
}

export function mutationSellMult(kind: MutationKind | undefined): number {
  if (!kind) return 1
  return MUTATION_SELL_MULT[kind]
}
