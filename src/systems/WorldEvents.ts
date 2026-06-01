export type EmpireEventKind =
  | 'rainbowShower'
  | 'goldenRain'
  | 'meteor'
  | 'giantCrop'
  | 'merchant'

export const EVENT_LABEL: Record<EmpireEventKind, string> = {
  rainbowShower: 'Rainbow Shower',
  goldenRain: 'Golden Rain',
  meteor: 'Meteor Impact',
  giantCrop: 'Giant Crop Event',
  merchant: 'Traveling Merchant',
}

export const EVENT_EMOJI: Record<EmpireEventKind, string> = {
  rainbowShower: '🌈',
  goldenRain: '🪙',
  meteor: '☄️',
  giantCrop: '📏',
  merchant: '🎪',
}

export interface ActiveEvent {
  kind: EmpireEventKind
  timer: number
  duration: number
}

export class WorldEventSystem {
  active: ActiveEvent | null = null
  cooldown = 30
  private cdTimer = 0

  tick(dt: number): EmpireEventKind | null {
    if (this.active) {
      this.active.timer -= dt
      if (this.active.timer <= 0) this.active = null
      return null
    }
    this.cdTimer += dt
    if (this.cdTimer < this.cooldown) return null
    this.cdTimer = 0
    this.cooldown = 90 + Math.random() * 120
    const kinds: EmpireEventKind[] = [
      'rainbowShower',
      'goldenRain',
      'meteor',
      'giantCrop',
      'merchant',
    ]
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!
    this.active = { kind, timer: 12 + Math.random() * 8, duration: 20 }
    return kind
  }

  mutationMult(): number {
    if (!this.active) return 1
    if (this.active.kind === 'rainbowShower') return 2.5
    if (this.active.kind === 'giantCrop') return 1.8
    return 1
  }

  growthMult(): number {
    if (!this.active) return 1
    if (this.active.kind === 'goldenRain') return 1.4
    if (this.active.kind === 'meteor') return 1.25
    return 1
  }

  coinBonus(): number {
    if (!this.active) return 0
    if (this.active.kind === 'goldenRain') return 25
    if (this.active.kind === 'merchant') return 40
    return 0
  }

  hydrate(kind: EmpireEventKind | null, timer: number): void {
    if (kind && timer > 0) this.active = { kind, timer, duration: timer }
  }
}
