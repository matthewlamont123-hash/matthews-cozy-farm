import type { CropDefinition } from '../data/crops'

export type ActiveSeason = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASON_EMOJI: Record<ActiveSeason, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
}

export const SEASON_BONUS_SELL = 1.15
export const SEASON_BONUS_GROWTH = 1.1

/** Real-world month → season (Northern hemisphere cozy default). */
export function seasonFromMonth(month: number): ActiveSeason {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/** In-game rotating season from day counter. */
export function seasonFromGameDay(day: number): ActiveSeason {
  const seasons: ActiveSeason[] = ['spring', 'summer', 'autumn', 'winter']
  return seasons[Math.floor(day / 1) % 4]!
}

export function activeSeason(useRealSeason: boolean, gameDay: number, now = Date.now()): ActiveSeason {
  if (useRealSeason) return seasonFromMonth(new Date(now).getMonth())
  return seasonFromGameDay(gameDay)
}

export function isInSeason(crop: CropDefinition, season: ActiveSeason): boolean {
  if (crop.season === 'yearRound') return true
  return crop.season === season
}

export function seasonSellMult(crop: CropDefinition, season: ActiveSeason): number {
  return isInSeason(crop, season) ? SEASON_BONUS_SELL : 1
}

export function seasonGrowthMult(crop: CropDefinition, season: ActiveSeason): number {
  return isInSeason(crop, season) ? SEASON_BONUS_GROWTH : 1
}
