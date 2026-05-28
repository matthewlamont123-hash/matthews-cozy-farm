import { CROP_LIST, CROPS, cropUnlocked, type CropId } from '../data/crops'

export interface ComboState {
  count: number
  timer: number
}

const COMBO_WINDOW = 2.8
const COMBO_BONUS_PER = 0.04
const COMBO_BONUS_CAP = 0.35

export function comboBonus(combo: ComboState, harvestSpeedMult: number): number {
  if (combo.count < 2) return 0
  const effective = Math.min(combo.count - 1, Math.floor(COMBO_BONUS_CAP / COMBO_BONUS_PER))
  return effective * COMBO_BONUS_PER * harvestSpeedMult
}

export function registerHarvestCombo(combo: ComboState, dt: number, harvestSpeedMult: number): void {
  combo.timer = COMBO_WINDOW * harvestSpeedMult
  combo.count += 1
  void dt
}

export function tickCombo(combo: ComboState, dt: number): void {
  if (combo.count <= 0) return
  combo.timer -= dt
  if (combo.timer <= 0) combo.count = 0
}

/** Day index from timestamp (local midnight). */
export function dayIndex(now = Date.now()): number {
  return Math.floor(now / 86_400_000)
}

export interface DailyReward {
  coins: number
  seeds: Partial<Record<CropId, number>>
  streak: number
}

export function computeDailyReward(streak: number): DailyReward {
  const s = Math.min(streak, 14)
  const coins = 15 + s * 8 + Math.floor(s * s * 1.5)
  const seeds: Partial<Record<CropId, number>> = {
    turnip: 3 + Math.floor(s / 2),
    carrot: 2 + Math.floor(s / 3),
  }
  if (s >= 3) seeds.corn = 2
  if (s >= 5) seeds.strawberry = 1
  if (s >= 7) seeds.tomato = 1
  if (s >= 10) seeds.pumpkin = 1
  return { coins, seeds, streak: s }
}

export function canClaimDaily(lastClaimDay: number, now = Date.now()): boolean {
  return dayIndex(now) > lastClaimDay
}

export function nextStreak(lastClaimDay: number, currentStreak: number, now = Date.now()): number {
  const today = dayIndex(now)
  if (today === lastClaimDay + 1) return currentStreak + 1
  if (today > lastClaimDay + 1) return 1
  return currentStreak
}

/** Small chance for bonus harvest value or free seed on manual harvest. */
export function rollRareBonus(
  cropId: CropId,
  ownedUpgrades: Set<string>,
): { type: 'coins'; amount: number } | { type: 'seed'; cropId: CropId } | null {
  const def = CROPS[cropId]
  let chance = 0.012
  if (def.rarity === 'rare') chance = 0.025
  if (def.rarity === 'gold') chance = 0.035
  if (def.rarity === 'rainbow') chance = 0.05
  if (ownedUpgrades.has('crop_tier_5')) chance *= 1.4

  if (Math.random() >= chance) return null

  if (Math.random() < 0.55) {
    return { type: 'coins', amount: Math.floor(def.sellPrice * (0.5 + Math.random() * 0.8)) }
  }

  const unlocked = CROP_LIST.filter((c) => cropUnlocked(c, ownedUpgrades))
  const pick = unlocked[Math.floor(Math.random() * unlocked.length)]
  return pick ? { type: 'seed', cropId: pick.id } : null
}

export function goldenWindfallChance(cropId: CropId): number {
  if (cropId === 'goldenApple') return 0.06
  if (cropId === 'watermelon' || cropId === 'pumpkin' || cropId === 'blueberry') return 0.035
  if (cropId === 'tomato' || cropId === 'lavender') return 0.018
  return 0.008
}
