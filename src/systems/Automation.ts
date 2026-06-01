import type { CropId, GameCropId } from '../data/crops'
import type { AutomationKind, AutomationLevels } from '../game/types'
import type { Farm } from './Farm'
import type { Inventory } from './Inventory'

export const DEFAULT_AUTOMATION: AutomationLevels = {
  till: 0,
  plant: 0,
  water: 0,
  harvest: 0,
  sell: 0,
}

/** Interval in seconds and actions per tick per automation level */
const AUTO_CONFIG: Record<
  AutomationKind,
  { interval: number[]; actions: number[]; sellThreshold: number[] }
> = {
  till: { interval: [0, 6, 4, 3], actions: [0, 1, 2, 3], sellThreshold: [1, 1, 1, 1] },
  plant: { interval: [0, 7, 5, 4], actions: [0, 1, 2, 4], sellThreshold: [1, 1, 1, 1] },
  water: { interval: [0, 5, 4, 3], actions: [0, 1, 3, 5], sellThreshold: [1, 1, 1, 1] },
  harvest: { interval: [0, 6, 4, 3], actions: [0, 1, 3, 5], sellThreshold: [1, 1, 1, 1] },
  sell: { interval: [0, 11, 8, 5], actions: [0, 1, 1, 1], sellThreshold: [1, 0.8, 0.6, 0.4] },
}

export interface AutomationAction {
  kind: AutomationKind
  gx?: number
  gy?: number
  cropId?: GameCropId
  sold?: number
}

export class AutomationSystem {
  levels: AutomationLevels = { ...DEFAULT_AUTOMATION }
  private timers: Record<AutomationKind, number> = {
    till: 0,
    plant: 0,
    water: 0,
    harvest: 0,
    sell: 0,
  }

  /** Recent auto actions for visual indicators */
  recentFlashes: { gx: number; gy: number; kind: AutomationKind; t: number }[] = []

  setLevel(kind: AutomationKind, level: number): void {
    this.levels[kind] = Math.max(this.levels[kind], level)
  }

  hydrate(levels: AutomationLevels): void {
    this.levels = { ...levels }
  }

  tick(
    dt: number,
    farm: Farm,
    inventory: Inventory,
    selectedCrop: CropId,
    sellFn: () => number,
    waterIntervalMult = 1,
  ): AutomationAction[] {
    const actions: AutomationAction[] = []

    for (const kind of ['till', 'plant', 'water', 'harvest', 'sell'] as AutomationKind[]) {
      const lvl = this.levels[kind]
      if (lvl <= 0) continue

      this.timers[kind] += dt
      const cfg = AUTO_CONFIG[kind]
      let interval = cfg.interval[lvl] ?? cfg.interval[cfg.interval.length - 1]
      if (kind === 'water') interval *= waterIntervalMult
      if (this.timers[kind] < interval) continue
      this.timers[kind] = 0

      const actionCount = cfg.actions[lvl] ?? 1

      if (kind === 'till') {
        for (let i = 0; i < actionCount; i++) {
          const spot = farm.findGrassTile()
          if (!spot) break
          if (farm.hoe(spot.gx, spot.gy)) {
            farm.flashTile(spot.gx, spot.gy)
            this.pushFlash(spot.gx, spot.gy, kind)
            actions.push({ kind, gx: spot.gx, gy: spot.gy })
          }
        }
      } else if (kind === 'plant') {
        for (let i = 0; i < actionCount; i++) {
          const spot = farm.findSoilTile()
          if (!spot) break
          const crop =
            (inventory.seeds.get(selectedCrop) ?? 0) > 0
              ? selectedCrop
              : inventory.pickAnySeed()
          if (!crop || !inventory.tryConsumeSeed(crop)) break
          if (farm.plant(spot.gx, spot.gy, crop)) {
            farm.flashTile(spot.gx, spot.gy)
            this.pushFlash(spot.gx, spot.gy, kind)
            actions.push({ kind, gx: spot.gx, gy: spot.gy, cropId: crop })
          } else {
            inventory.addSeeds(crop, 1)
          }
        }
      } else if (kind === 'water') {
        for (let i = 0; i < actionCount; i++) {
          const spot = farm.findUnwateredCrop()
          if (!spot) break
          if (farm.water(spot.gx, spot.gy)) {
            farm.flashTile(spot.gx, spot.gy)
            this.pushFlash(spot.gx, spot.gy, kind)
            actions.push({ kind, gx: spot.gx, gy: spot.gy })
          }
        }
      } else if (kind === 'harvest') {
        const mature = farm.collectAllMature()
        let picked = 0
        for (const { gx, gy } of mature) {
          if (picked >= actionCount) break
          if (inventory.freeSlots <= 0) break
          const id = farm.pickCrop(gx, gy)
          if (!id) continue
          inventory.addHarvest(id, 1)
          farm.flashTile(gx, gy)
          this.pushFlash(gx, gy, kind)
          actions.push({ kind, gx, gy, cropId: id })
          picked++
        }
      } else if (kind === 'sell') {
        const threshold = cfg.sellThreshold[lvl] ?? 0.8
        if (inventory.fillRatio >= threshold && inventory.usedSlots > 0) {
          const sold = sellFn()
          if (sold > 0) actions.push({ kind, sold })
        }
      }
    }

    this.recentFlashes = this.recentFlashes
      .map((f) => ({ ...f, t: f.t - dt }))
      .filter((f) => f.t > 0)

    return actions
  }

  private pushFlash(gx: number, gy: number, kind: AutomationKind): void {
    this.recentFlashes.push({ gx, gy, kind, t: 0.6 })
    if (this.recentFlashes.length > 12) this.recentFlashes.shift()
  }

  statusLine(): string {
    const parts: string[] = []
    if (this.levels.till > 0) parts.push(`🪓×${this.levels.till}`)
    if (this.levels.plant > 0) parts.push(`🌱×${this.levels.plant}`)
    if (this.levels.water > 0) parts.push(`💧×${this.levels.water}`)
    if (this.levels.harvest > 0) parts.push(`🧺×${this.levels.harvest}`)
    if (this.levels.sell > 0) parts.push(`🪙×${this.levels.sell}`)
    return parts.length ? parts.join(' ') : 'None yet'
  }
}
