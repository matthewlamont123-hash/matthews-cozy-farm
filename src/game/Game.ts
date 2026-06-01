import { CROPS, getCrop, sellPriceWithBonus, type CropId, type GameCropId } from '../data/crops'
import { findDiscoveryRecipe } from '../data/discoveries'
import { FIELDS, type FieldId } from '../data/fields'
import { TRACTORS, type TractorId } from '../data/tractors'
import { BASE_PLOT_SIZE } from '../data/upgrades'
import { getNode } from '../data/upgrades'
import { Sfx } from './Audio'
import { ParticleSystem } from './Particles'
import {
  type DecoDraw,
  type RenderFrame,
  computeFarmLayout,
  drawSceneLayers,
  renderFarm,
  screenToGrid,
  tilePixelPos,
  type FarmLayout,
} from './Renderer'
import type { ToolMode } from './types'
import { AchievementSystem } from '../systems/Achievements'
import { AutomationSystem } from '../systems/Automation'
import {
  canClaimDaily,
  comboBonus,
  computeDailyReward,
  goldenWindfallChance,
  nextStreak,
  registerHarvestCombo,
  rollRareBonus,
  tickCombo,
} from '../systems/Economy'
import { Farm } from '../systems/Farm'
import { Inventory } from '../systems/Inventory'
import { activePets } from '../systems/Pets'
import {
  canPrestige,
  prestigeCoinMult,
  prestigeGrowthMult,
  prestigeRewardCoins,
} from '../systems/Prestige'
import { QuestSystem } from '../systems/Quests'
import { activeSeason, seasonSellMult } from '../systems/Seasons'
import type { ActiveSeason } from '../systems/Seasons'
import { Shop } from '../systems/Shop'
import { UpgradesSystem } from '../systems/UpgradesSystem'
import { applyLoadedFields, loadGame, saveGame } from '../systems/SaveSystem'
import { WeatherSystem, weatherGrowthMult, weatherWaterMult } from '../systems/Weather'
import { FieldManager } from '../systems/FieldManager'
import { DiscoveryJournal } from '../systems/DiscoveryJournal'
import { WorldEventSystem, EVENT_EMOJI, EVENT_LABEL, type EmpireEventKind } from '../systems/WorldEvents'
import { mutationSellMult, MUTATION_EMOJI, type MutationKind } from '../systems/Mutations'
import {
  fertilizerMutationMult,
  fertilizerSellMult,
  irrigationGrowthMult,
} from '../data/fields'

const DEFAULT_UPGRADES = ['water_1', 'pack_1'] as const
/** Base growth boost so crops feel snappy and cozy, not grindy. */
const COZY_GROWTH_BOOST = 1.45

export type PanelId = 'none' | 'shop' | 'upgrades' | 'inventory' | 'journal' | 'empire'

export interface GameUICallbacks {
  onToast: (msg: string) => void
  onCoins: (n: number) => void
  onBackpack: (used: number, cap: number) => void
  onPanelState: (panel: PanelId) => void
  onToolMode: (t: ToolMode) => void
  onSelectedCrop: (c: string) => void
  onShopRefresh: () => void
  onUpgradesRefresh: () => void
  onInventoryRefresh: () => void
  onJournalRefresh?: () => void
  onEmpireRefresh?: () => void
  onAutomationStatus?: (line: string) => void
  onDailyReady?: (ready: boolean, streak: number) => void
  onCombo?: (count: number) => void
  onSeasonWeather?: (season: ActiveSeason, weather: string) => void
  onAchievement?: (name: string) => void
  onDiscovery?: (emoji: string, name: string) => void
  onWorldEvent?: (label: string) => void
  onFieldChange?: (name: string) => void
}

export class GameLoop {
  fieldManager = new FieldManager()
  get farm(): Farm {
    return this.fieldManager.activeFarm()
  }

  inventory: Inventory
  coins = { value: 180 }
  shop: Shop
  upgrades: UpgradesSystem
  automation = new AutomationSystem()
  weather = new WeatherSystem()
  worldEvents = new WorldEventSystem()
  quests = new QuestSystem()
  achievements = new AchievementSystem()
  journal = new DiscoveryJournal()
  discoveredCrops = new Set<string>()
  /** @deprecated alias */
  get discoveredHybrids(): Set<string> {
    return this.discoveredCrops
  }
  ownedTractors = new Set<TractorId>(['rusty'])
  prestigeLevel = 0
  useRealSeason = true
  gameDay = 0
  particles = new ParticleSystem()
  celebration: { emoji: string; name: string; t: number } | null = null
  tool: ToolMode = 'hoe'
  selectedCrop: CropId = 'turnip'
  panel: PanelId = 'none'
  time = 0
  tractorPulse = 0
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  ui: GameUICallbacks

  combo = { count: 0, timer: 0 }
  dailyStreak = 0
  lastDailyClaim = -1

  private accumulator = 0
  private saveTimer = 0
  private dragging = false
  private dragVisited = new Set<string>()
  private dragHighlight: { gx: number; gy: number } | null = null
  hoverHighlight: { gx: number; gy: number } | null = null
  clickHighlight: { gx: number; gy: number; t: number } | null = null
  private activePointerId: number | null = null
  private shake = 0
  private expansionAnim = 0
  private seasonTimer = 0

  constructor(canvas: HTMLCanvasElement, ui: GameUICallbacks) {
    this.canvas = canvas
    const c = canvas.getContext('2d')
    if (!c) throw new Error('2d context')
    this.ctx = c
    this.ui = ui
    this.inventory = new Inventory()
    this.upgrades = new UpgradesSystem(this.inventory, this.farm)
    this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredCrops)

    const loaded = loadGame()
    if (loaded) {
      this.coins.value = loaded.coins
      applyLoadedFields(this.fieldManager, loaded)
      this.inventory = Inventory.fromJSON({
        seeds: loaded.seeds,
        harvest: loaded.harvest,
        capacity: loaded.capacity,
      })
      this.upgrades = new UpgradesSystem(this.inventory, this.farm)
      loaded.upgrades.forEach((id) => this.upgrades.owned.add(id))
      this.upgrades.hydrateFromOwned()
      this.fieldManager.starterExpansions = loaded.starterExpansions
      this.fieldManager.applyStarterExpansion()
      this.automation.hydrate(loaded.automation)
      for (const [kind, lvl] of Object.entries(this.upgrades.automation)) {
        if (lvl > 0) this.automation.setLevel(kind as keyof typeof this.upgrades.automation, lvl)
      }
      this.prestigeLevel = loaded.prestigeLevel
      this.discoveredCrops = new Set(loaded.discoveredCrops)
      this.ownedTractors = new Set(loaded.ownedTractors as TractorId[])
      this.useRealSeason = loaded.useRealSeason
      this.gameDay = loaded.gameDay
      this.weather.hydrate(loaded.weather)
      this.worldEvents.hydrate(loaded.activeEvent as EmpireEventKind | null, loaded.eventTimer)
      this.achievements.hydrate(loaded.unlockedAchievements, loaded.stats)
      this.journal.hydrate(loaded.journal as Parameters<DiscoveryJournal['hydrate']>[0])
      this.quests.hydrate(loaded.activeQuestId, loaded.questProgress, loaded.completedQuestIds)
      this.upgrades.setFarm(this.farm)
      this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredCrops)
      this.selectedCrop = loaded.selectedCrop as CropId
      this.tool = loaded.tool
      this.combo.count = loaded.comboCount
      this.combo.timer = loaded.comboTimer
      this.dailyStreak = loaded.dailyStreak
      this.lastDailyClaim = loaded.lastDailyClaim
    } else {
      DEFAULT_UPGRADES.forEach((id) => this.upgrades.owned.add(id))
      this.upgrades.hydrateFromOwned()
      this.inventory.addSeeds('turnip', 10)
      this.inventory.addSeeds('carrot', 8)
      this.inventory.addSeeds('corn', 5)
      const firstQuest = this.quests.pickNext()
      if (firstQuest) this.quests.startQuest(firstQuest)
    }

    this.refreshShopBinding()
    if (!loaded) saveGame(this.snapshot())
    this.pushHud()
    this.pushDailyStatus()
    this.pushSeasonWeather()
    this.ui.onAutomationStatus?.(this.automation.statusLine())
    this.resize()
  }

  currentSeason(): ActiveSeason {
    return activeSeason(this.useRealSeason, this.gameDay)
  }

  unitSellPrice(cropId: string, mutation?: MutationKind): number {
    const def = getCrop(cropId)
    const eq = this.fieldManager.activeEquipment()
    const fieldDef = FIELDS[this.fieldManager.activeId]
    let price = sellPriceWithBonus(def.sellPrice, this.upgrades.cropValueMult)
    price = Math.floor(
      price *
        seasonSellMult(def, this.currentSeason()) *
        prestigeCoinMult(this.prestigeLevel) *
        (fieldDef.bonuses.sell ?? 1) *
        fertilizerSellMult(eq.fertilizer) *
        mutationSellMult(mutation),
    )
    const tractor = eq.tractorId ? TRACTORS[eq.tractorId] : null
    if (tractor) price = Math.floor(price * (1 + tractor.sellBonus))
    return Math.max(1, price)
  }

  growthMult(): number {
    const eq = this.fieldManager.activeEquipment()
    const fieldDef = FIELDS[this.fieldManager.activeId]
    return (
      this.upgrades.growthSpeedMult *
      COZY_GROWTH_BOOST *
      prestigeGrowthMult(this.prestigeLevel) *
      (fieldDef.bonuses.growth ?? 1) *
      irrigationGrowthMult(eq.irrigation) *
      this.worldEvents.growthMult()
    )
  }

  mutationMult(): number {
    const eq = this.fieldManager.activeEquipment()
    const fieldDef = FIELDS[this.fieldManager.activeId]
    const tractor = eq.tractorId ? TRACTORS[eq.tractorId] : null
    return (
      (fieldDef.bonuses.mutation ?? 1) *
      fertilizerMutationMult(eq.fertilizer) *
      this.worldEvents.mutationMult() *
      (1 + (tractor?.mutationBonus ?? 0))
    )
  }

  harvestRadius(): number {
    const eq = this.fieldManager.activeEquipment()
    const tractorR = eq.tractorId ? TRACTORS[eq.tractorId].harvestRadius : 0
    return Math.max(this.upgrades.tractorRadius, tractorR)
  }

  private trackCoinsEarned(amount: number): void {
    if (amount <= 0) return
    this.achievements.stats.totalCoinsEarned += amount
    this.quests.addSellProgress(amount)
    this.checkAchievements()
  }

  private checkAchievements(): void {
    for (const a of this.achievements.checkNew()) {
      this.ui.onAchievement?.(a.name)
      this.ui.onToast(`${a.emoji} Achievement: ${a.name}`)
      Sfx.unlock()
    }
  }

  private refreshShopBinding(): void {
    this.shop = new Shop(this.coins, this.inventory, this.upgrades.owned, this.discoveredCrops)
  }

  snapshot() {
    return {
      coins: this.coins.value,
      fieldManager: this.fieldManager,
      inventory: this.inventory,
      upgrades: this.upgrades.owned,
      decors: this.upgrades.unlockedDecors,
      selectedCrop: this.selectedCrop,
      tool: this.tool,
      automation: this.automation.levels,
      dailyStreak: this.dailyStreak,
      lastDailyClaim: this.lastDailyClaim,
      comboCount: this.combo.count,
      comboTimer: this.combo.timer,
      prestigeLevel: this.prestigeLevel,
      stats: this.achievements.stats,
      unlockedAchievements: this.achievements.unlocked,
      activeQuestId: this.quests.activeId,
      questProgress: this.quests.progress,
      completedQuestIds: [...this.quests.completed],
      discoveredCrops: this.discoveredCrops,
      gameDay: this.gameDay,
      useRealSeason: this.useRealSeason,
      weather: this.weather.kind,
      ownedTractors: this.ownedTractors,
      journal: this.journal,
      activeEvent: this.worldEvents.active?.kind ?? null,
      eventTimer: this.worldEvents.active?.timer ?? 0,
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    this.canvas.width = Math.floor(rect.width * dpr)
    this.canvas.height = Math.floor(rect.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  tileSizePx(): number {
    const rect = this.canvas.getBoundingClientRect()
    return computeFarmLayout(this.farm, rect.width, rect.height).tileSize
  }

  private farmLayout(vw: number, vh: number): FarmLayout {
    return computeFarmLayout(this.farm, vw, vh)
  }

  private canvasCoords(clientX: number, clientY: number): { sx: number; sy: number; vw: number; vh: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      sx: clientX - rect.left,
      sy: clientY - rect.top,
      vw: rect.width,
      vh: rect.height,
    }
  }

  private cellCenter(gx: number, gy: number, vw: number, vh: number): { x: number; y: number } {
    const layout = this.farmLayout(vw, vh)
    const { cx, cy } = tilePixelPos(layout.ox, layout.oy, gx, gy, layout.tileSize, layout.gap)
    return { x: cx, y: cy - 8 }
  }

  private decoLayout(vw: number, vh: number, ox: number, oy: number): DecoDraw[] {
    const spots: DecoDraw[] = []
    const d = this.upgrades.unlockedDecors
    if (d.has('pinwheel')) {
      spots.push({ id: 'pinwheel', x: Math.max(24, ox - 54), y: oy + this.farm.h * 52, phase: 0.2 })
    }
    if (d.has('scarecrow')) {
      spots.push({ id: 'scarecrow', x: vw - 110, y: oy + 50, phase: 1 })
    }
    if (d.has('cloud')) {
      spots.push({ id: 'cloud', x: vw * 0.18, y: vh * 0.22, phase: 2.1 })
    }
    return spots
  }

  pointerDown(clientX: number, clientY: number, pointerId: number): void {
    const { sx, sy, vw, vh } = this.canvasCoords(clientX, clientY)
    const layout = this.farmLayout(vw, vh)
    const hit = screenToGrid(sx, sy, this.farm, layout, vw, vh)
    if (!hit || hit.locked) return

    this.clickHighlight = { gx: hit.gx, gy: hit.gy, t: 1 }

    this.activePointerId = pointerId
    try {
      this.canvas.setPointerCapture(pointerId)
    } catch {
      /* ignore */
    }

    if (['hoe', 'water', 'plant', 'harvest'].includes(this.tool)) {
      this.dragging = true
      this.dragVisited.clear()
    }
    this.applyAt(hit.gx, hit.gy, sx, sy, vw, vh, true)
  }

  pointerMove(clientX: number, clientY: number): void {
    const { sx, sy, vw, vh } = this.canvasCoords(clientX, clientY)
    const layout = this.farmLayout(vw, vh)
    const hit = screenToGrid(sx, sy, this.farm, layout, vw, vh)
    this.hoverHighlight = hit && !hit.locked ? { gx: hit.gx, gy: hit.gy } : null
    this.dragHighlight = hit && !hit.locked ? { gx: hit.gx, gy: hit.gy } : null

    if (!this.dragging) return
    if (!hit || hit.locked) return
    this.applyAt(hit.gx, hit.gy, sx, sy, vw, vh, true)
  }

  pointerUp(): void {
    this.endPointer()
  }

  endPointer(): void {
    this.dragging = false
    this.dragVisited.clear()
    this.dragHighlight = null
    if (this.activePointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId)
      } catch {
        /* ignore */
      }
      this.activePointerId = null
    }
  }

  private applyAt(
    gx: number,
    gy: number,
    sx: number,
    sy: number,
    vw: number,
    vh: number,
    isDrag: boolean,
  ): void {
    if (isDrag) {
      const key = `${gx},${gy}`
      if (this.dragVisited.has(key)) return
      this.dragVisited.add(key)
    }

    if (this.tool === 'hoe') {
      if (this.farm.hoe(gx, gy)) this.tractorPulse = 0.15
      return
    }
    if (this.tool === 'water') {
      if (this.farm.water(gx, gy)) {
        this.particles.sparkles(sx, sy, 6)
        Sfx.water()
      }
      return
    }
    if (this.tool === 'plant') {
      if (!this.inventory.tryConsumeSeed(this.selectedCrop)) {
        this.ui.onToast('Need seeds — open Shop')
        return
      }
      const tile = this.farm.get(gx, gy)
      if (tile?.kind === 'grass') {
        this.farm.hoe(gx, gy)
      }
      if (this.farm.plant(gx, gy, this.selectedCrop)) {
        this.farm.water(gx, gy)
        this.particles.sparkles(sx, sy, 3)
        Sfx.plant()
        return
      }
      this.inventory.addSeeds(this.selectedCrop, 1)
      this.ui.onToast('Can\'t plant here')
      return
    }
    if (this.tool === 'harvest') {
      this.harvestAt(gx, gy, vw, vh)
    }
  }

  private harvestAt(gx: number, gy: number, vw: number, vh: number): void {
    const radius = this.harvestRadius()
    const candidates = this.farm.collectMatureInRadius(gx, gy, radius)
    if (candidates.length === 0) return

    const free = this.inventory.freeSlots
    if (free <= 0) {
      this.ui.onToast('Satchel full')
      return
    }

    const toPick = candidates.slice(0, free)
    const overflow = candidates.length > free
    const harvested: GameCropId[] = []
    let bonusCoins = 0

    for (const { gx: cx, gy: cy } of toPick) {
      const tile = this.farm.get(cx, cy)
      const mutation = tile?.mutation
      const id = this.farm.pickCrop(cx, cy)
      if (!id) continue
      harvested.push(id)
      const p = this.cellCenter(cx, cy, vw, vh)
      const def = getCrop(id)
      this.particles.harvestJuice(p.x, p.y, def.top, def.emoji)
      if (mutation) {
        this.journal.discoverMutation(mutation)
        const extra = Math.floor(this.unitSellPrice(id, mutation) * 0.5)
        bonusCoins += extra
        this.particles.floatText(p.x, p.y - 20, `${MUTATION_EMOJI[mutation]} +${extra}`)
      }
    }

    if (harvested.length === 0) return

    Sfx.harvest()
    this.shake = Math.min(0.18, this.shake + 0.06)
    registerHarvestCombo(this.combo, 0, this.upgrades.harvestSpeedMult)
    this.ui.onCombo?.(this.combo.count)
    this.achievements.stats.totalHarvests += harvested.length
    this.achievements.stats.maxCombo = Math.max(this.achievements.stats.maxCombo, this.combo.count)
    this.quests.addHarvestProgress(harvested.length)
    this.checkAchievements()

    const comboMult = 1 + comboBonus(this.combo, this.upgrades.harvestSpeedMult)

    for (const id of harvested) {
      this.inventory.addHarvest(id, 1)
      if (this.upgrades.owned.has('crop_tier_5') && Math.random() < goldenWindfallChance(id)) {
        bonusCoins += Math.floor(this.unitSellPrice(id) * 0.45)
      }
      const rare = rollRareBonus(id, this.upgrades.owned)
      if (rare?.type === 'coins') {
        bonusCoins += rare.amount
        const p = this.cellCenter(gx, gy, vw, vh)
        this.particles.floatText(p.x, p.y - 50, `✨ +${rare.amount}`)
      } else if (rare?.type === 'seed') {
        this.inventory.addSeeds(rare.cropId, 1)
        this.ui.onToast(`Lucky seed! ${CROPS[rare.cropId].emoji}`)
      }
    }

    if (comboMult > 1 && harvested.length >= 2) {
      const comboExtra = Math.floor(
        harvested.reduce((s, id) => s + this.unitSellPrice(id), 0) * (comboMult - 1),
      )
      if (comboExtra > 0) {
        bonusCoins += comboExtra
        const p = this.cellCenter(gx, gy, vw, vh)
        this.particles.floatText(p.x, p.y - 24, `×${this.combo.count} combo!`)
      }
    }

    if (bonusCoins > 0) {
      this.coins.value += bonusCoins
      this.trackCoinsEarned(bonusCoins)
      this.ui.onToast(`Bonus harvest! +${bonusCoins} coins`)
      const p = this.cellCenter(gx, gy, vw, vh)
      this.particles.floatText(p.x, p.y - 40, `+${bonusCoins}`)
    }

    if (overflow) this.ui.onToast('Satchel full')
    this.tractorPulse = 0.9
    this.pushHud(true)
  }

  private autoSell(): number {
    if (this.inventory.usedSlots <= 0) return 0
    const sum = this.inventory.sellAll((id, qty) => this.unitSellPrice(id) * qty)
    if (sum <= 0) return 0
    this.coins.value += sum
    this.trackCoinsEarned(sum)
    this.achievements.stats.totalSells += 1
    Sfx.sell()
    const rect = this.canvas.getBoundingClientRect()
    this.particles.burstCoins(rect.width / 2, rect.height / 4, 8)
    this.particles.floatText(rect.width / 2, rect.height / 4 - 20, `+${sum}`)
    this.pushHud(true)
    return sum
  }

  setTool(t: ToolMode): void {
    this.tool = t
    this.ui.onToolMode(t)
  }

  setCrop(c: CropId | string): void {
    this.selectedCrop = c as CropId
    this.ui.onSelectedCrop(c)
  }

  openPanel(p: PanelId): void {
    this.panel = p
    this.ui.onPanelState(p)
    if (p === 'shop') this.ui.onShopRefresh()
    if (p === 'upgrades') this.ui.onUpgradesRefresh()
    if (p === 'inventory') {
      this.inventory.autoSort()
      this.ui.onInventoryRefresh()
    }
    if (p === 'journal') this.ui.onJournalRefresh?.()
    if (p === 'empire') this.ui.onEmpireRefresh?.()
  }

  switchField(id: FieldId): void {
    if (!this.fieldManager.switchField(id)) return
    this.upgrades.setFarm(this.farm)
    this.ui.onFieldChange?.(FIELDS[id].name)
    this.ui.onToast(`${FIELDS[id].emoji} ${FIELDS[id].name}`)
    saveGame(this.snapshot())
  }

  unlockField(id: FieldId): boolean {
    if (this.fieldManager.unlockField(id, this.coins)) {
      this.journal.discoverField(id)
      this.ui.onToast(`${FIELDS[id].emoji} ${FIELDS[id].name} unlocked!`)
      this.switchField(id)
      this.ui.onEmpireRefresh?.()
      saveGame(this.snapshot())
      return true
    }
    this.ui.onToast(`Need ${FIELDS[id].unlockCost}¢ to unlock ${FIELDS[id].name}`)
    return false
  }

  buyTractor(id: TractorId): boolean {
    const t = TRACTORS[id]
    if (this.ownedTractors.has(id)) return false
    if (this.coins.value < t.unlockCost) {
      this.ui.onToast('Not enough coins')
      return false
    }
    this.coins.value -= t.unlockCost
    this.ownedTractors.add(id)
    this.journal.discoverTractor(id)
    this.celebrate(t.emoji, t.name)
    this.ui.onToast(`Assign ${t.name} to a field in Empire ↑`)
    this.tractorPulse = 1.5
    this.ui.onEmpireRefresh?.()
    saveGame(this.snapshot())
    return true
  }

  assignTractor(fieldId: FieldId, tractorId: TractorId | null): void {
    if (tractorId && !this.ownedTractors.has(tractorId)) return
    this.fieldManager.assignTractor(fieldId, tractorId)
    const t = tractorId ? TRACTORS[tractorId] : null
    if (t) this.ui.onToast(`${t.emoji} ${t.name} → ${FIELDS[fieldId].name}`)
    else this.ui.onToast(`No tractor on ${FIELDS[fieldId].name}`)
    this.ui.onEmpireRefresh?.()
    saveGame(this.snapshot())
  }

  upgradeFieldIrrigation(fieldId: FieldId): boolean {
    if (this.fieldManager.upgradeIrrigation(fieldId, this.coins)) {
      this.ui.onToast('Irrigation upgraded!')
      this.ui.onEmpireRefresh?.()
      saveGame(this.snapshot())
      return true
    }
    return false
  }

  upgradeFieldFertilizer(fieldId: FieldId): boolean {
    if (this.fieldManager.upgradeFertilizer(fieldId, this.coins)) {
      this.ui.onToast('Fertilizer upgraded!')
      this.ui.onEmpireRefresh?.()
      saveGame(this.snapshot())
      return true
    }
    return false
  }

  buySeed(id: CropId): void {
    this.refreshShopBinding()
    if (this.shop.buySeed(id)) {
      this.ui.onToast(`Snagged ${CROPS[id].name} seeds`)
      this.pushHud()
      this.ui.onShopRefresh()
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Not enough coins or locked crop')
  }

  buySeedBundle(id: CropId): void {
    this.refreshShopBinding()
    const n = this.shop.buySeedBulk(id, 10)
    if (n > 0) {
      this.ui.onToast(`Bought ×${n} ${CROPS[id].name}`)
      this.pushHud()
      this.ui.onShopRefresh()
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Cannot buy bundle right now')
  }

  tryBuyUpgrade(nodeId: string): void {
    const node = getNode(nodeId)
    if (!node) return
    this.refreshShopBinding()
    const prevSize = this.farm.w
    const ok = this.upgrades.tryPurchase(node, this.coins)
    if (ok) {
      this.upgrades.applyPendingLandExpansion()
      if (this.fieldManager.activeId === 'starter') {
        this.fieldManager.starterExpansions = this.upgrades.expansionsPurchased
        this.fieldManager.applyStarterExpansion()
      }
      if (this.farm.w > prevSize) {
        this.expansionAnim = 1
        Sfx.unlock()
      }
      for (const [kind, lvl] of Object.entries(this.upgrades.automation)) {
        if (lvl > 0) this.automation.setLevel(kind as keyof typeof this.upgrades.automation, lvl)
      }
      this.refreshShopBinding()
      this.ui.onToast(`${node.name} unlocked`)
      if (node.category === 'tractor' || node.category === 'automation') {
        this.tractorPulse = 1.2
        Sfx.unlock()
      }
      this.pushHud()
      this.ui.onUpgradesRefresh()
      this.ui.onAutomationStatus?.(this.automation.statusLine())
      saveGame(this.snapshot())
      return
    }
    this.ui.onToast('Requirements or coins blocking upgrade')
  }

  claimDaily(): void {
    if (!canClaimDaily(this.lastDailyClaim)) {
      this.ui.onToast('Daily gift already claimed')
      return
    }
    const streak = nextStreak(this.lastDailyClaim, this.dailyStreak)
    const reward = computeDailyReward(streak)
    this.dailyStreak = streak
    this.lastDailyClaim = Math.floor(Date.now() / 86_400_000)
    this.achievements.stats.dailyStreakBest = Math.max(this.achievements.stats.dailyStreakBest, streak)
    this.coins.value += reward.coins
    this.trackCoinsEarned(reward.coins)
    for (const [id, qty] of Object.entries(reward.seeds)) {
      if (qty) this.inventory.addSeeds(id as CropId, qty)
    }
    Sfx.unlock()
    this.ui.onToast(`Day ${streak} gift! +${reward.coins} coins`)
    this.pushHud()
    this.pushDailyStatus()
    saveGame(this.snapshot())
  }

  tryBreed(parentA: string, parentB: string): boolean {
    const recipe = findDiscoveryRecipe(parentA, parentB)
    if (!recipe) {
      this.ui.onToast('Those crops cannot combine')
      return false
    }
    if (this.coins.value < recipe.cost) {
      this.ui.onToast('Need more coins for discovery')
      return false
    }
    const seedsA = this.inventory.seeds.get(parentA) ?? 0
    const seedsB = this.inventory.seeds.get(parentB) ?? 0
    if (seedsA < 1 || seedsB < 1) {
      this.ui.onToast('Need 1 seed of each parent crop')
      return false
    }
    this.coins.value -= recipe.cost
    this.inventory.seeds.set(parentA, seedsA - 1)
    this.inventory.seeds.set(parentB, seedsB - 1)
    if (this.inventory.seeds.get(parentA) === 0) this.inventory.seeds.delete(parentA)
    if (this.inventory.seeds.get(parentB) === 0) this.inventory.seeds.delete(parentB)
    this.inventory.addSeeds(recipe.result, 3)
    const wasNew = !this.discoveredCrops.has(recipe.result)
    this.discoveredCrops.add(recipe.result)
    if (wasNew && this.journal.discoverCrop(recipe.result)) {
      this.achievements.stats.hybridsDiscovered += 1
      this.celebrate(recipe.emoji, recipe.name)
      this.checkAchievements()
    }
    Sfx.plant()
    this.ui.onToast(`Discovered ${recipe.emoji} ${recipe.name}!`)
    this.refreshShopBinding()
    this.pushHud()
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
    return true
  }

  private celebrate(emoji: string, name: string): void {
    this.celebration = { emoji, name, t: 2.2 }
    this.ui.onDiscovery?.(emoji, name)
    Sfx.unlock()
    this.shake = 0.25
  }

  deliverQuest(): void {
    const q = this.quests.activeQuest()
    if (!q || q.type !== 'deliver' || !q.crop) {
      this.ui.onToast('No delivery quest active')
      return
    }
    const delivered = this.quests.tryDeliver(q.crop, this.inventory.harvest)
    if (delivered <= 0) {
      this.ui.onToast(`Need ${q.crop} in satchel`)
      return
    }
    this.ui.onToast(`Delivered ${delivered} ${CROPS[q.crop].name}`)
    if (this.quests.isComplete()) this.finishQuest()
    else {
      this.pushHud(true)
      this.ui.onJournalRefresh?.()
    }
    saveGame(this.snapshot())
  }

  private finishQuest(): void {
    const q = this.quests.complete()
    if (!q) return
    this.achievements.stats.questsCompleted += 1
    if (q.reward.coins) {
      this.coins.value += q.reward.coins
      this.trackCoinsEarned(q.reward.coins)
    }
    if (q.reward.seeds) {
      for (const [id, qty] of Object.entries(q.reward.seeds)) {
        if (qty) this.inventory.addSeeds(id as CropId, qty)
      }
    }
    Sfx.unlock()
    this.ui.onToast(`${q.npc} thanks you! Quest complete.`)
    const next = this.quests.pickNext()
    if (next) this.quests.startQuest(next)
    this.checkAchievements()
    this.pushHud(true)
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
  }

  toggleSeasonMode(): void {
    this.useRealSeason = !this.useRealSeason
    this.ui.onToast(this.useRealSeason ? 'Seasons follow calendar' : 'Seasons rotate in-game')
    this.pushSeasonWeather()
    saveGame(this.snapshot())
  }

  doPrestige(): boolean {
    if (!canPrestige(this.coins.value, this.achievements.stats.totalCoinsEarned, this.prestigeLevel)) {
      this.ui.onToast(`Need ${800} coins or ${4000} total earned`)
      return false
    }
    const decor = [...this.upgrades.owned].filter((id) => id.startsWith('decor_'))
    this.prestigeLevel += 1
    this.achievements.stats.prestiges = this.prestigeLevel
    const bonus = prestigeRewardCoins(this.prestigeLevel)
    this.coins.value = 120 + bonus
    const starter = this.fieldManager.fields.get('starter')!
    starter.reset(BASE_PLOT_SIZE, BASE_PLOT_SIZE)
    this.fieldManager.starterExpansions = 0
    this.fieldManager.activeId = 'starter'
    this.inventory.harvest.clear()
    this.upgrades = new UpgradesSystem(this.inventory, this.farm)
    this.upgrades.setFarm(this.farm)
    this.upgrades.owned.clear()
    decor.forEach((id) => this.upgrades.owned.add(id))
    DEFAULT_UPGRADES.forEach((id) => this.upgrades.owned.add(id))
    this.upgrades.hydrateFromOwned()
    this.automation.levels = { till: 0, plant: 0, water: 0, harvest: 0, sell: 0 }
    this.selectedCrop = 'turnip'
    this.checkAchievements()
    Sfx.unlock()
    this.ui.onToast(`Prestige ${this.prestigeLevel}! Permanent bonuses increased.`)
    this.refreshShopBinding()
    this.pushHud(true)
    this.ui.onUpgradesRefresh()
    this.ui.onJournalRefresh?.()
    saveGame(this.snapshot())
    return true
  }

  sellHarvest(): void {
    const sum = this.inventory.sellAll((id, qty) => this.unitSellPrice(id) * qty)
    if (sum <= 0) {
      this.ui.onToast('Satchel is empty')
      return
    }
    this.coins.value += sum
    this.trackCoinsEarned(sum)
    this.achievements.stats.totalSells += 1
    if (this.quests.isComplete()) this.finishQuest()
    this.checkAchievements()
    const rect = this.canvas.getBoundingClientRect()
    this.particles.burstCoins(
      rect.width / 2,
      rect.height / 3,
      Math.min(20, 5 + Math.floor(sum / 10)),
    )
    Sfx.sell()
    this.ui.onToast(`+${sum} coins`)
    this.pushHud(true)
    saveGame(this.snapshot())
  }

  pushHud(refreshInventory = false): void {
    this.ui.onCoins(this.coins.value)
    this.ui.onBackpack(this.inventory.usedSlots, this.inventory.capacity)
    if (refreshInventory) this.ui.onInventoryRefresh()
  }

  pushDailyStatus(): void {
    this.ui.onDailyReady?.(canClaimDaily(this.lastDailyClaim), this.dailyStreak)
  }

  pushSeasonWeather(): void {
    const season = this.currentSeason()
    this.ui.onSeasonWeather?.(season, this.weather.kind)
  }

  tick(dt: number): void {
    this.time += dt
    this.accumulator += dt
    this.saveTimer += dt
    this.particles.update(dt)
    tickCombo(this.combo, dt)
    if (this.combo.count === 0) this.ui.onCombo?.(0)

    if (!this.useRealSeason) {
      this.seasonTimer += dt
      if (this.seasonTimer >= 180) {
        this.seasonTimer = 0
        this.gameDay += 1
        this.pushSeasonWeather()
      }
    }

    if (this.weather.tick(dt)) this.pushSeasonWeather()
    const newEvent = this.worldEvents.tick(dt)
    if (newEvent) {
      const bonus = this.worldEvents.coinBonus()
      if (bonus > 0) {
        this.coins.value += bonus
        this.trackCoinsEarned(bonus)
      }
      this.ui.onWorldEvent?.(`${EVENT_EMOJI[newEvent]} ${EVENT_LABEL[newEvent]}!`)
      this.ui.onToast(`${EVENT_EMOJI[newEvent]} ${EVENT_LABEL[newEvent]}!`)
    }

    if (this.celebration && this.celebration.t > 0) {
      this.celebration.t = Math.max(0, this.celebration.t - dt)
      if (this.celebration.t <= 0) this.celebration = null
    }

    const season = this.currentSeason()
    const wGrowth = weatherGrowthMult(this.weather.kind)
    const wWater = weatherWaterMult(this.weather.kind)

    while (this.accumulator >= 1 / 20) {
      this.accumulator -= 1 / 20
      this.farm.tickGrowth(1 / 20, this.growthMult(), season, wGrowth * this.worldEvents.growthMult(), this.mutationMult())
    }

    const autoActions = this.automation.tick(
      dt,
      this.farm,
      this.inventory,
      this.selectedCrop,
      () => this.autoSell(),
      wWater,
    )
    if (autoActions.length > 0) {
      let autoHarvests = 0
      for (const a of autoActions) {
        if (a.kind === 'harvest') autoHarvests += 1
        if (a.gx !== undefined && a.gy !== undefined) {
          const rect = this.canvas.getBoundingClientRect()
          const p = this.cellCenter(a.gx, a.gy, rect.width, rect.height)
          if (a.kind === 'water') this.particles.sparkles(p.x, p.y, 3)
          if (a.kind === 'harvest' && a.cropId) {
            this.particles.sparkles(p.x, p.y, 4)
            Sfx.harvest()
          }
          if (a.kind === 'plant') Sfx.plant()
        }
        if (a.kind === 'sell' && a.sold) {
          this.ui.onToast(`Auto-sold +${a.sold} coins`)
        }
      }
      if (autoHarvests > 0) {
        this.achievements.stats.totalHarvests += autoHarvests
        this.quests.addHarvestProgress(autoHarvests)
        if (this.quests.isComplete()) this.finishQuest()
        this.checkAchievements()
      }
      this.ui.onAutomationStatus?.(this.automation.statusLine())
      this.pushHud(autoActions.some((a) => a.kind === 'harvest' || a.kind === 'sell'))
    }

    if (this.tractorPulse > 0) this.tractorPulse = Math.max(0, this.tractorPulse - dt * 1.6)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.4)
    if (this.expansionAnim > 0) this.expansionAnim = Math.max(0, this.expansionAnim - dt * 0.8)
    if (this.clickHighlight && this.clickHighlight.t > 0) {
      this.clickHighlight.t = Math.max(0, this.clickHighlight.t - dt * 5)
      if (this.clickHighlight.t <= 0) this.clickHighlight = null
    }

    if (this.saveTimer >= 12) {
      this.saveTimer = 0
      saveGame(this.snapshot())
    }

    const rect = this.canvas.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height

    this.ctx.save()
    if (this.shake > 0) {
      const mag = this.shake * 5
      this.ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag)
    }

    const fieldDef = FIELDS[this.fieldManager.activeId]

    drawSceneLayers(this.ctx, vw, vh, this.time, fieldDef.theme)
    this.particles.tickAmbient(vw, vh, dt)

    const layout = this.farmLayout(vw, vh)
    const eq = this.fieldManager.activeEquipment()
    const tractorDef = eq.tractorId ? TRACTORS[eq.tractorId] : undefined

    const frame: RenderFrame = {
      farm: this.farm,
      maxPlotSize: layout.plot,
      gridGap: layout.gap,
      tileSize: layout.tileSize,
      fieldTheme: fieldDef.theme,
      decoSpots: this.decoLayout(vw, vh, layout.ox, layout.oy),
      tractorPulse: this.tractorPulse,
      tractorRadius: this.harvestRadius(),
      hasTractor: Boolean(eq.tractorId),
      tractorDef,
      growthSpeedMult: this.growthMult(),
      dragHighlight: this.dragHighlight,
      hoverHighlight: this.hoverHighlight,
      clickHighlight: this.clickHighlight,
      expansionAnim: this.expansionAnim,
      autoFlashes: this.automation.recentFlashes,
      weather: this.weather.kind,
      petSpots: activePets(this.automation.levels, layout.ox, layout.oy, layout.tw),
    }
    renderFarm(this.ctx, frame, this.time, vw, vh)

    this.ctx.restore()

    this.ctx.save()
    this.particles.draw(this.ctx)
    this.ctx.restore()
  }
}
