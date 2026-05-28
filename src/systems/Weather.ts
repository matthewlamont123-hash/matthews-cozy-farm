export type WeatherKind = 'sunny' | 'rainy' | 'cloudy'

export const WEATHER_EMOJI: Record<WeatherKind, string> = {
  sunny: '☀️',
  rainy: '🌧️',
  cloudy: '☁️',
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: 'Sunny',
  rainy: 'Rainy',
  cloudy: 'Cloudy',
}

/** Growth multiplier from weather. */
export function weatherGrowthMult(kind: WeatherKind): number {
  if (kind === 'sunny') return 1.2
  return 1
}

/** Water automation interval multiplier (<1 = faster). */
export function weatherWaterMult(kind: WeatherKind): number {
  if (kind === 'rainy') return 0.5
  return 1
}

export class WeatherSystem {
  kind: WeatherKind = 'sunny'
  timer = 0
  duration = 55

  tick(dt: number): boolean {
    this.timer += dt
    if (this.timer < this.duration) return false
    this.timer = 0
    this.duration = 45 + Math.random() * 40
    const roll = Math.random()
    this.kind = roll < 0.35 ? 'rainy' : roll < 0.65 ? 'cloudy' : 'sunny'
    return true
  }

  hydrate(kind: WeatherKind): void {
    this.kind = kind
    this.timer = 0
  }
}
