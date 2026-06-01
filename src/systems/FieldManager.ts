import { BASE_PLOT_SIZE } from '../data/upgrades'
import {
  defaultEquipment,
  FIELDS,
  FIELD_LIST,
  type FieldEquipment,
  type FieldId,
} from '../data/fields'
import type { TractorId } from '../data/tractors'
import type { SerialTile } from '../game/types'
import { Farm } from './Farm'

export interface FieldSaveData {
  w: number
  h: number
  tiles: SerialTile[][]
  equipment: FieldEquipment
}

export class FieldManager {
  fields = new Map<FieldId, Farm>()
  unlocked = new Set<FieldId>(['starter'])
  activeId: FieldId = 'starter'
  equipment: Record<FieldId, FieldEquipment> = {} as Record<FieldId, FieldEquipment>
  /** Land expansion tiers applied to starter field only */
  starterExpansions = 0

  constructor() {
    for (const def of FIELD_LIST) {
      this.fields.set(def.id, new Farm(def.baseSize, def.baseSize))
      this.equipment[def.id] = defaultEquipment(def.id)
    }
  }

  activeFarm(): Farm {
    return this.fields.get(this.activeId)!
  }

  activeEquipment(): FieldEquipment {
    return this.equipment[this.activeId]
  }

  def(id: FieldId) {
    return FIELDS[id]
  }

  maxPlotSize(fieldId: FieldId = this.activeId): number {
    const def = FIELDS[fieldId]
    const farm = this.fields.get(fieldId)!
    if (fieldId === 'starter') return Math.max(farm.w, def.baseSize + this.starterExpansions)
    return farm.w
  }

  applyStarterExpansion(): void {
    const def = FIELDS.starter
    const size = Math.min(def.maxSize, def.baseSize + this.starterExpansions)
    const farm = this.fields.get('starter')!
    if (farm.w !== size || farm.h !== size) farm.resize(size, size)
  }

  unlockField(id: FieldId, coins: { value: number }): boolean {
    if (this.unlocked.has(id)) return false
    const cost = FIELDS[id].unlockCost
    if (coins.value < cost) return false
    coins.value -= cost
    this.unlocked.add(id)
    const def = FIELDS[id]
    const farm = this.fields.get(id)!
    if (farm.w !== def.baseSize || farm.h !== def.baseSize) {
      farm.resize(def.baseSize, def.baseSize)
    }
    return true
  }

  switchField(id: FieldId): boolean {
    if (!this.unlocked.has(id)) return false
    this.activeId = id
    return true
  }

  assignTractor(fieldId: FieldId, tractorId: TractorId | null): void {
    if (!this.unlocked.has(fieldId)) return
    this.equipment[fieldId].tractorId = tractorId
  }

  upgradeIrrigation(fieldId: FieldId, coins: { value: number }): boolean {
    const eq = this.equipment[fieldId]
    if (eq.irrigation >= 3) return false
    const next = (eq.irrigation + 1) as 1 | 2 | 3
    const costs = [0, 80, 280, 850]
    const cost = costs[next]
    if (coins.value < cost) return false
    coins.value -= cost
    eq.irrigation = next
    return true
  }

  upgradeFertilizer(fieldId: FieldId, coins: { value: number }): boolean {
    const eq = this.equipment[fieldId]
    if (eq.fertilizer >= 3) return false
    const next = (eq.fertilizer + 1) as 1 | 2 | 3
    const costs = [0, 70, 260, 780]
    const cost = costs[next]
    if (coins.value < cost) return false
    coins.value -= cost
    eq.fertilizer = next
    return true
  }

  /** Migrate v3 single-farm save into starter field */
  migrateLegacy(w: number, h: number, tiles: SerialTile[][], expansions: number): void {
    const starter = this.fields.get('starter')!
    starter.resize(w, h)
    starter.loadTiles(tiles)
    this.starterExpansions = expansions
  }

  serializeFields(): Partial<Record<FieldId, FieldSaveData>> {
    const out: Partial<Record<FieldId, FieldSaveData>> = {}
    for (const id of this.unlocked) {
      const farm = this.fields.get(id)!
      out[id] = {
        w: farm.w,
        h: farm.h,
        tiles: farm.serializeTiles(),
        equipment: { ...this.equipment[id] },
      }
    }
    return out
  }

  hydrate(
    unlocked: FieldId[],
    activeId: FieldId,
    fieldData: Partial<Record<FieldId, FieldSaveData>>,
    starterExpansions: number,
  ): void {
    this.unlocked = new Set(unlocked.length ? unlocked : ['starter'])
    this.activeId = this.unlocked.has(activeId) ? activeId : 'starter'
    this.starterExpansions = starterExpansions
    for (const id of FIELD_LIST.map((f) => f.id)) {
      const data = fieldData[id]
      const def = FIELDS[id]
      const farm = this.fields.get(id)!
      if (data && this.unlocked.has(id)) {
        farm.resize(data.w, data.h)
        farm.loadTiles(data.tiles)
        this.equipment[id] = { ...defaultEquipment(id), ...data.equipment }
      } else {
        farm.resize(def.baseSize, def.baseSize)
        this.equipment[id] = defaultEquipment(id)
      }
    }
    this.applyStarterExpansion()
  }

  static starterExpansionsFromGrid(gridW: number): number {
    return Math.max(0, gridW - BASE_PLOT_SIZE)
  }
}
