import { CROPS, type CropId } from '../data/crops'
import type { ActiveSeason } from './Seasons'
import { seasonGrowthMult as cropSeasonGrowth } from './Seasons'
import type { SerialTile, TileState } from '../game/types'

function emptyTile(): TileState {
  return { kind: 'grass', growth: 0, watered: false, bounce: 0, pop: 0 }
}

export class Farm {
  w: number
  h: number
  tiles: TileState[][]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.tiles = []
    for (let y = 0; y < h; y++) {
      const row: TileState[] = []
      for (let x = 0; x < w; x++) row.push(emptyTile())
      this.tiles.push(row)
    }
  }

  resize(newW: number, newH: number): void {
    const next: TileState[][] = []
    for (let y = 0; y < newH; y++) {
      const row: TileState[] = []
      for (let x = 0; x < newW; x++) {
        row.push(y < this.h && x < this.w ? this.tiles[y][x] : emptyTile())
      }
      next.push(row)
    }
    this.w = newW
    this.h = newH
    this.tiles = next
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }

  get(x: number, y: number): TileState | undefined {
    return this.tiles[y]?.[x]
  }

  flashTile(x: number, y: number): void {
    const t = this.get(x, y)
    if (t) t.autoFlash = 1
  }

  hoe(x: number, y: number): boolean {
    const t = this.get(x, y)
    if (!t || t.kind !== 'grass') return false
    t.kind = 'soil'
    t.cropId = undefined
    t.growth = 0
    t.watered = false
    t.harvestsLeft = undefined
    return true
  }

  plant(x: number, y: number, cropId: CropId): boolean {
    const t = this.get(x, y)
    if (!t || t.kind !== 'soil') return false
    const def = CROPS[cropId]
    t.kind = 'crop'
    t.cropId = cropId
    t.growth = 0
    t.watered = false
    t.harvestsLeft = def.maxHarvests ?? 1
    return true
  }

  water(x: number, y: number): boolean {
    const t = this.get(x, y)
    if (!t || t.kind !== 'crop' || t.watered) return false
    t.watered = true
    return true
  }

  isMature(t: TileState): boolean {
    return t.kind === 'crop' && t.cropId !== undefined && t.growth >= 1
  }

  /** Mature crops within harvest radius (does not mutate tiles). */
  collectMatureInRadius(
    x: number,
    y: number,
    radius: number,
  ): { gx: number; gy: number; cropId: CropId }[] {
    const found: { gx: number; gy: number; cropId: CropId }[] = []
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = x + dx
        const gy = y + dy
        if (!this.inBounds(gx, gy)) continue
        const t = this.tiles[gy][gx]
        if (!this.isMature(t) || !t.cropId) continue
        found.push({ gx, gy, cropId: t.cropId })
      }
    }
    return found
  }

  /** All mature crops on the farm. */
  collectAllMature(): { gx: number; gy: number; cropId: CropId }[] {
    const found: { gx: number; gy: number; cropId: CropId }[] = []
    for (let gy = 0; gy < this.h; gy++) {
      for (let gx = 0; gx < this.w; gx++) {
        const t = this.tiles[gy][gx]
        if (this.isMature(t) && t.cropId) found.push({ gx, gy, cropId: t.cropId })
      }
    }
    return found
  }

  /** First grass tile for auto-till. */
  findGrassTile(): { gx: number; gy: number } | null {
    for (let gy = 0; gy < this.h; gy++) {
      for (let gx = 0; gx < this.w; gx++) {
        if (this.tiles[gy][gx].kind === 'grass') return { gx, gy }
      }
    }
    return null
  }

  /** First untilled-ready soil for auto-plant. */
  findSoilTile(): { gx: number; gy: number } | null {
    for (let gy = 0; gy < this.h; gy++) {
      for (let gx = 0; gx < this.w; gx++) {
        if (this.tiles[gy][gx].kind === 'soil') return { gx, gy }
      }
    }
    return null
  }

  /** First unwatered growing crop. */
  findUnwateredCrop(): { gx: number; gy: number } | null {
    for (let gy = 0; gy < this.h; gy++) {
      for (let gx = 0; gx < this.w; gx++) {
        const t = this.tiles[gy][gx]
        if (t.kind === 'crop' && !t.watered && t.growth < 1) return { gx, gy }
      }
    }
    return null
  }

  /** Remove a mature crop from one tile; returns its id or null. Handles multi-harvest. */
  pickCrop(gx: number, gy: number): CropId | null {
    if (!this.inBounds(gx, gy)) return null
    const t = this.tiles[gy][gx]
    if (!this.isMature(t) || !t.cropId) return null
    const id = t.cropId
    const def = CROPS[id]
    const remaining = (t.harvestsLeft ?? 1) - 1

    if (remaining > 0 && (def.maxHarvests ?? 1) > 1) {
      t.harvestsLeft = remaining
      t.growth = 0
      t.watered = false
      t.bounce = 0.6
      t.pop = 0.8
    } else {
      t.kind = 'soil'
      t.cropId = undefined
      t.growth = 0
      t.watered = false
      t.harvestsLeft = undefined
      t.bounce = 1
      t.pop = 1
    }
    return id
  }

  /**
   * @param growthSpeedMult from watering-can upgrades (>1 = faster)
   * @param dtSeconds delta time
   */
  tickGrowth(dtSeconds: number, growthSpeedMult: number, season: ActiveSeason, weatherGrowth: number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const t = this.tiles[y][x]
        if (t.autoFlash && t.autoFlash > 0) {
          t.autoFlash = Math.max(0, t.autoFlash - dtSeconds * 2.5)
        }
        if (t.kind !== 'crop' || !t.cropId || t.growth >= 1) {
          if (t.bounce > 0) t.bounce = Math.max(0, t.bounce - dtSeconds * 2.2)
          if (t.pop > 0) t.pop = Math.max(0, t.pop - dtSeconds * 2.8)
          continue
        }
        const def = CROPS[t.cropId]
        const waterBoost = t.watered ? 1.35 : 1
        const isRegrow = t.growth === 0 && (t.harvestsLeft ?? 1) < (def.maxHarvests ?? 1)
        const growBase = isRegrow
          ? def.baseGrowSeconds * (def.regrowRatio ?? 0.5)
          : def.baseGrowSeconds
        const seasonMult = cropSeasonGrowth(def, season)
        const inc =
          (dtSeconds * growthSpeedMult * weatherGrowth * seasonMult * waterBoost) /
          Math.max(0.5, growBase)
        t.growth = Math.min(1, t.growth + inc)
        if (t.bounce > 0) t.bounce = Math.max(0, t.bounce - dtSeconds * 2.2)
        if (t.pop > 0) t.pop = Math.max(0, t.pop - dtSeconds * 2.8)
      }
    }
  }

  serializeTiles(): SerialTile[][] {
    return this.tiles.map((row) =>
      row.map((t) => {
        if (t.kind === 'grass') return { k: 'g' }
        if (t.kind === 'soil') return { k: 's' }
        return {
          k: 'c',
          c: t.cropId,
          g: Math.round(t.growth * 1000) / 1000,
          w: t.watered || undefined,
          h: t.harvestsLeft,
        }
      }),
    )
  }

  loadTiles(data: SerialTile[][]): void {
    for (let y = 0; y < this.h && y < data.length; y++) {
      const row = data[y]
      for (let x = 0; x < this.w && x < row.length; x++) {
        const s = row[x]
        const t = emptyTile()
        if (s.k === 'g') t.kind = 'grass'
        else if (s.k === 's') t.kind = 'soil'
        else {
          t.kind = 'crop'
          t.cropId = s.c as CropId
          t.growth = s.g ?? 0
          t.watered = !!s.w
          if (s.h !== undefined) t.harvestsLeft = s.h
          else if (t.cropId) t.harvestsLeft = CROPS[t.cropId].maxHarvests ?? 1
        }
        this.tiles[y][x] = t
      }
    }
  }
}
