import { getCrop, cropStage, secondsRemaining } from '../data/crops'
import type { AutomationKind } from './types'
import type { WeatherKind } from '../systems/Weather'
import type { PetSpot } from '../systems/Pets'
import type { UpgradeNode } from '../data/upgrades'
import type { Farm } from '../systems/Farm'
import type { TileState } from './types'

const FENCE_WOOD = '#b8956a'
const FENCE_DARK = '#8a6848'

const GRASS_LIGHT = '#9ed87f'
const GRASS_MID = '#7ec86a'
const GRASS_SHADOW = '#4f9a52'
const SOIL_TOP = '#c48a58'
const SOIL_MID = '#a9744a'
const SOIL_SIDE = '#6d4528'

const AUTO_ICON: Record<AutomationKind, string> = {
  till: '🪓',
  plant: '🌱',
  water: '💧',
  harvest: '🧺',
  sell: '🪙',
}

import type { TractorDef } from '../data/tractors'

export interface FieldTheme {
  grass: string
  grassLight: string
  soil: string
  sky: string
}

export interface DecoDraw {
  id: string
  x: number
  y: number
  phase: number
}

export interface RenderFrame {
  farm: Farm
  maxPlotSize: number
  gridGap: number
  tileSize: number
  fieldTheme?: FieldTheme
  decoSpots: DecoDraw[]
  tractorPulse: number
  tractorRadius: number
  hasTractor: boolean
  tractorDef?: TractorDef
  growthSpeedMult: number
  dragHighlight: { gx: number; gy: number } | null
  hoverHighlight: { gx: number; gy: number } | null
  /** Brief flash when a tile is clicked */
  clickHighlight: { gx: number; gy: number; t: number } | null
  expansionAnim: number
  autoFlashes: { gx: number; gy: number; kind: AutomationKind; t: number }[]
  weather: WeatherKind
  petSpots: PetSpot[]
}

export interface BlockedRegion {
  x: number
  y: number
  w: number
  h: number
}

/** Screen-space bounds for the parked tractor (non-interactive). */
export function tractorHitBox(
  ox: number,
  oy: number,
  th: number,
): BlockedRegion {
  const cx = ox - 98
  const cy = oy + th * 0.55
  return { x: cx - 52, y: cy - 42, w: 104, h: 78 }
}

/** Decorative scenery that should not pass clicks through to farm tiles. */
export function sceneryHitBoxes(ox: number, oy: number, tw: number, th: number): BlockedRegion[] {
  return [
    tractorHitBox(ox, oy, th),
    { x: ox + tw + 6, y: oy + th - 34, w: 56, h: 52 },
    { x: ox - 58, y: oy + th - 38, w: 36, h: 44 },
  ]
}

export function pointInRegion(sx: number, sy: number, r: BlockedRegion): boolean {
  return sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h
}

export function pointHitsScenery(
  sx: number,
  sy: number,
  farm: Farm,
  _tileSize: number,
  vw: number,
  vh: number,
): boolean {
  const layout = computeFarmLayout(farm, vw, vh)
  const { ox, oy, tw, th } = layout
  return sceneryHitBoxes(ox, oy, tw, th).some((r) => pointInRegion(sx, sy, r))
}

export interface TileJitter {
  ox: number
  oy: number
  rot: number
  scale: number
}

export function tileJitter(gx: number, gy: number): TileJitter {
  const h = (gx * 928371 + gy * 689287) >>> 0
  return {
    ox: ((h % 9) - 4) * 0.65,
    oy: (((h >> 4) % 9) - 4) * 0.5,
    rot: ((h % 7) - 3) * 0.014,
    scale: 0.945 + (h % 6) * 0.012,
  }
}

export interface FarmLayout {
  tileSize: number
  gap: number
  ox: number
  oy: number
  tw: number
  th: number
  plot: number
}

const LAYOUT_PAD = { top: 28, bottom: 112, left: 92, right: 28 }

/** Size and position the farm grid so every field fits on screen. */
export function computeFarmLayout(farm: Farm, vw: number, vh: number): FarmLayout {
  const plot = farm.w
  const availW = Math.max(80, vw - LAYOUT_PAD.left - LAYOUT_PAD.right)
  const availH = Math.max(80, vh - LAYOUT_PAD.top - LAYOUT_PAD.bottom)

  let gap = plot >= 7 ? 5 : plot >= 5 ? 6 : 8
  let tileSize = Math.floor(
    Math.min((availW - (plot - 1) * gap) / plot, (availH - (plot - 1) * gap) / plot),
  )

  if (tileSize < 24 && gap > 4) {
    gap = 4
    tileSize = Math.floor(
      Math.min((availW - (plot - 1) * gap) / plot, (availH - (plot - 1) * gap) / plot),
    )
  }

  tileSize = Math.max(24, Math.min(64, tileSize))
  const tw = plot * tileSize + (plot - 1) * gap
  const th = plot * tileSize + (plot - 1) * gap
  const ox = LAYOUT_PAD.left + (availW - tw) / 2
  const oy = LAYOUT_PAD.top + (availH - th) / 2

  return { tileSize, gap, ox, oy, tw, th, plot }
}

export function farmScreenOffset(
  _farm: Farm,
  maxPlot: number,
  tileSize: number,
  vw: number,
  vh: number,
  gap = 8,
): { ox: number; oy: number; tw: number; th: number } {
  const layout = computeFarmLayout(_farm, vw, vh)
  if (maxPlot === _farm.w && Math.abs(tileSize - layout.tileSize) < 2) {
    return { ox: layout.ox, oy: layout.oy, tw: layout.tw, th: layout.th }
  }
  const tw = maxPlot * tileSize + (maxPlot - 1) * gap
  const th = maxPlot * tileSize + (maxPlot - 1) * gap
  const ox = (vw - tw) / 2
  const oy = (vh - th) / 2 - 8
  return { ox, oy, tw, th }
}

export function tilePixelPos(
  ox: number,
  oy: number,
  gx: number,
  gy: number,
  tileSize: number,
  gap = 8,
): { px: number; py: number; cx: number; cy: number } {
  const j = tileJitter(gx, gy)
  const jitterScale = tileSize < 36 ? 0.35 : tileSize < 48 ? 0.6 : 1
  const px = ox + gx * (tileSize + gap) + j.ox * jitterScale
  const py = oy + gy * (tileSize + gap) + j.oy * jitterScale
  return { px, py, cx: px + tileSize / 2, cy: py + tileSize / 2 }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function hash01(gx: number, gy: number, salt: number): number {
  return (((gx * 374761 + gy * 668265 + salt * 982451) >>> 0) % 1000) / 1000
}

/** Restrained sky — warm top, cool horizon, tinted per field */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  theme?: FieldTheme,
): void {
  const skyTop = theme?.sky ?? '#f5dcc4'
  const skyMid = theme?.grassLight ?? '#dceef8'
  const skyBot = theme?.grass ?? '#c8e4b4'
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, skyTop)
  sky.addColorStop(0.55, skyMid)
  sky.addColorStop(1, skyBot)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const sunX = w * 0.82
  const sunY = h * 0.12 + Math.sin(time * 0.25) * 2
  ctx.fillStyle = 'rgba(255, 244, 210, 0.95)'
  ctx.beginPath()
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fillRect(0, h * 0.5, w, h * 0.5)
}

function drawDriftingClouds(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const clouds = [
    { x: 0.12, y: 0.16, s: 1, sp: 6 },
    { x: 0.45, y: 0.1, s: 0.75, sp: 4 },
    { x: 0.72, y: 0.2, s: 0.9, sp: 5 },
  ]
  for (const c of clouds) {
    const drift = ((time * c.sp + c.x * 200) % (w + 200)) - 100
    const cx = drift
    const cy = h * c.y + Math.sin(time * 0.8 + c.x * 10) * 4
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(c.s, c.s)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
    ctx.beginPath()
    ctx.arc(-22, 0, 18, 0, Math.PI * 2)
    ctx.arc(8, -8, 24, 0, Math.PI * 2)
    ctx.arc(36, 0, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(200, 220, 240, 0.35)'
    ctx.beginPath()
    ctx.arc(0, 6, 5, 0, Math.PI * 2)
    ctx.arc(18, 8, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawScenery(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tw: number,
  th: number,
  time: number,
): void {
  const fenceY = oy + th + 18
  const fenceL = ox - 36
  const fenceW = tw + 72

  ctx.save()
  ctx.fillStyle = 'rgba(60, 40, 25, 0.08)'
  ctx.fillRect(fenceL + 4, fenceY + 4, fenceW, 34)

  for (let i = 0; i <= Math.floor(fenceW / 22); i++) {
    const fx = fenceL + i * 22
    ctx.fillStyle = '#c4956a'
    roundRect(ctx, fx, fenceY, 8, 28, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(80, 50, 30, 0.2)'
    ctx.stroke()
  }
  ctx.fillStyle = '#d4a574'
  ctx.fillRect(fenceL, fenceY + 8, fenceW, 6)
  ctx.fillRect(fenceL, fenceY + 18, fenceW, 5)
  ctx.restore()

  const wbX = ox + tw + 28
  const wbY = oy + th - 8
  ctx.save()
  ctx.translate(wbX, wbY)
  ctx.fillStyle = 'rgba(50, 30, 20, 0.1)'
  ctx.beginPath()
  ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e84b6a'
  ctx.beginPath()
  ctx.moveTo(-24, 0)
  ctx.quadraticCurveTo(-24, -16, -8, -16)
  ctx.lineTo(16, -16)
  ctx.quadraticCurveTo(28, -16, 28, 0)
  ctx.lineTo(28, 10)
  ctx.lineTo(-24, 10)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#37474f'
  ctx.beginPath()
  ctx.arc(-14, 12, 7, 0, Math.PI * 2)
  ctx.arc(14, 12, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5d4037'
  ctx.fillRect(22, -22, 6, 28)
  ctx.restore()

  const canX = ox - 42
  const canY = oy + th - 20
  ctx.save()
  ctx.translate(canX, canY + Math.sin(time * 1.2) * 1)
  ctx.fillStyle = '#4b6cb7'
  roundRect(ctx, -10, -8, 20, 22, 6)
  ctx.fill()
  ctx.fillStyle = '#6c8ae4'
  ctx.beginPath()
  ctx.moveTo(-6, -8)
  ctx.quadraticCurveTo(0, -22, 8, -8)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  roundRect(ctx, -4, 2, 6, 10, 2)
  ctx.fill()
  ctx.restore()

  const flowerSpots = [
    { x: ox - 18, y: oy + th + 6 },
    { x: ox + tw + 8, y: oy + th + 4 },
    { x: ox + tw * 0.3, y: oy - 14 },
  ]
  for (let i = 0; i < flowerSpots.length; i++) {
    const f = flowerSpots[i]
    const sway = Math.sin(time * 2.5 + i) * 3
    ctx.save()
    ctx.translate(f.x + sway, f.y)
    ctx.fillStyle = '#5d9c4b'
    ctx.fillRect(-1, 0, 2, 12)
    const petal = ['#ff6b81', '#ffe066', '#6c8ae4'][i % 3]
    for (let p = 0; p < 5; p++) {
      ctx.fillStyle = petal
      ctx.beginPath()
      ctx.arc(Math.cos(p * 1.25) * 5, Math.sin(p * 1.25) * 5 - 4, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ffe066'
    ctx.beginPath()
    ctx.arc(0, -4, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawPlotBorderFence(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  farmW: number,
  farmH: number,
  tileSize: number,
  anim: number,
): void {
  if (farmW <= 0) return
  const gap = 10
  const pad = 14
  const x0 = ox - pad
  const y0 = oy - pad
  const x1 = ox + farmW * tileSize + (farmW - 1) * gap + pad
  const y1 = oy + farmH * tileSize + (farmH - 1) * gap + pad
  const pulse = anim > 0 ? Math.sin(anim * Math.PI) * 4 : 0

  ctx.save()
  ctx.strokeStyle = FENCE_WOOD
  ctx.lineWidth = 5 + pulse * 0.3
  ctx.setLineDash([])
  roundRect(ctx, x0, y0, x1 - x0, y1 - y0, 20)
  ctx.stroke()
  ctx.strokeStyle = FENCE_DARK
  ctx.lineWidth = 2
  roundRect(ctx, x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 18)
  ctx.stroke()

  for (let i = 0; i < Math.ceil((x1 - x0) / 28); i++) {
    const fx = x0 + i * 28
    ctx.fillStyle = FENCE_WOOD
    roundRect(ctx, fx, y1 - 6, 7, 14, 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawAutoFlashIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: AutomationKind,
  alpha: number,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '14px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(AUTO_ICON[kind], cx, cy - 28)
  ctx.restore()
}

function drawRaisedPlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: TileState,
  gx: number,
  gy: number,
  time: number,
  theme?: FieldTheme,
): void {
  const grassMid = theme?.grass ?? GRASS_MID
  const grassLight = theme?.grassLight ?? GRASS_LIGHT
  const soilTop = theme?.soil ?? SOIL_TOP
  const j = tileJitter(gx, gy)
  const squash = t.bounce > 0 ? 1 - Math.sin((1 - t.bounce) * Math.PI) * 0.1 : 1
  const lift = t.bounce > 0 ? -Math.sin((1 - t.bounce) * Math.PI) * 7 : 0
  const depth = t.kind === 'grass' ? 7 : 9
  const r = 16 + hash01(gx, gy, 1) * 4

  ctx.save()
  ctx.translate(x + s / 2, y + s / 2 + lift)
  ctx.rotate(j.rot)
  ctx.scale(j.scale * squash, j.scale * (2 - squash))
  ctx.translate(-s / 2, -s / 2)

  ctx.shadowColor = 'rgba(30, 45, 30, 0.28)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 6

  if (t.kind === 'grass') {
    roundRect(ctx, 0, depth, s, s, r)
    ctx.fillStyle = GRASS_SHADOW
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    roundRect(ctx, 0, 0, s, s, r)
    ctx.fillStyle = grassMid
    ctx.fill()
    ctx.fillStyle = grassLight
    roundRect(ctx, 0, 0, s, s * 0.55, r)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 2.5
    ctx.stroke()

    const bladeN = 4 + Math.floor(hash01(gx, gy, 2) * 3)
    for (let b = 0; b < bladeN; b++) {
      const bx = 8 + b * ((s - 16) / bladeN)
      const sway = Math.sin(time * 1.6 + gx * 0.4 + gy * 0.3 + b) * 2
      ctx.strokeStyle = 'rgba(70, 130, 60, 0.45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bx, s - 6)
      ctx.quadraticCurveTo(bx + sway, s - 18 - b * 2, bx + sway * 0.5, s - 24 - b * 3)
      ctx.stroke()
    }
  } else {
    roundRect(ctx, 0, depth, s, s, r)
    ctx.fillStyle = SOIL_SIDE
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    roundRect(ctx, 0, 0, s, s, r)
    ctx.fillStyle = SOIL_MID
    ctx.fill()
    ctx.fillStyle = soilTop
    roundRect(ctx, 0, 0, s, s * 0.42, r)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 220, 180, 0.25)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.strokeStyle = 'rgba(60, 35, 20, 0.12)'
    ctx.lineWidth = 1.5
    for (let cl = 0; cl < 3; cl++) {
      const cy = 12 + cl * (s / 4) + hash01(gx, gy, cl + 3) * 4
      ctx.beginPath()
      ctx.moveTo(6, cy)
      ctx.quadraticCurveTo(s / 2, cy + 3, s - 6, cy - 2)
      ctx.stroke()
    }

    const lumpN = 3
    for (let l = 0; l < lumpN; l++) {
      ctx.fillStyle = 'rgba(80, 45, 25, 0.08)'
      ctx.beginPath()
      ctx.ellipse(
        10 + hash01(gx, gy, l + 10) * (s - 20),
        10 + hash01(gx, gy, l + 20) * (s - 20),
        6 + l * 2,
        4,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawCropSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cropId: string,
  growth: number,
  time: number,
  pop: number,
  mutation?: TileState['mutation'],
): void {
  const def = getCrop(cropId)
  const stage = cropStage(growth)
  const stageScale = 0.72 + stage * 0.1 + growth * 0.06
  const popY = pop > 0 ? -Math.sin((1 - pop) * Math.PI) * 26 * pop : 0
  const popScale = pop > 0 ? 1 + Math.sin((1 - pop) * Math.PI) * 0.2 : 1
  const sway = Math.sin(time * 1.8 + cx * 0.008) * 2

  ctx.save()
  ctx.translate(cx + sway, cy + popY)
  ctx.scale(stageScale * popScale, stageScale * popScale)

  if (stage === 0) {
    ctx.fillStyle = def.stalk
    ctx.beginPath()
    ctx.arc(0, 2, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(-1, 0, 1.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (stage === 1) {
    const stemH = 14
    ctx.fillStyle = def.stalk
    roundRect(ctx, -3, -stemH, 6, stemH, 3)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-8, -stemH * 0.5, 7, 4, -0.6, 0, Math.PI * 2)
    ctx.ellipse(8, -stemH * 0.45, 6, 3.5, 0.6, 0, Math.PI * 2)
    ctx.fill()
  } else if (stage === 2) {
    const stemH = 22
    ctx.fillStyle = def.stalk
    roundRect(ctx, -4, -stemH, 8, stemH, 4)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-10, -stemH * 0.55, 9, 5, -0.5, 0, Math.PI * 2)
    ctx.ellipse(10, -stemH * 0.5, 8, 4.5, 0.5, 0, Math.PI * 2)
    ctx.fill()
    const budR = 8
    ctx.fillStyle = def.accent
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.arc(0, -stemH - 4, budR, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  } else {
    const stemH = 26
    ctx.fillStyle = def.stalk
    roundRect(ctx, -4, -stemH, 8, stemH, 4)
    ctx.fill()

    if (cropId === 'carrot') {
      ctx.fillStyle = def.top
      ctx.beginPath()
      ctx.moveTo(0, 6)
      ctx.quadraticCurveTo(-10, -stemH, 0, -stemH - 18)
      ctx.quadraticCurveTo(10, -stemH, 0, 6)
      ctx.fill()
    } else if (cropId === 'corn') {
      ctx.fillStyle = def.top
      roundRect(ctx, -7, -stemH - 20, 14, 22, 5)
      ctx.fill()
      ctx.fillStyle = def.accent
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          ctx.beginPath()
          ctx.ellipse(-4 + col * 8, -stemH - 16 + row * 5, 2.5, 4, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (cropId === 'pumpkin') {
      ctx.fillStyle = def.top
      ctx.beginPath()
      ctx.ellipse(0, -stemH - 8, 16, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(180, 90, 20, 0.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-8, -stemH - 8)
      ctx.lineTo(8, -stemH - 8)
      ctx.stroke()
    } else {
      const fruitR = cropId === 'goldenApple' ? 15 : 13
      ctx.fillStyle = def.top
      ctx.beginPath()
      ctx.arc(0, -stemH - fruitR * 0.3, fruitR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = def.accent
      ctx.beginPath()
      ctx.arc(-fruitR * 0.25, -stemH - fruitR * 0.55, fruitR * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (growth >= 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, -stemH - 14, 20, -Math.PI * 0.3, -Math.PI * 0.7, true)
      ctx.stroke()
    }

    if (def.rarity === 'rainbow' || def.rarity === 'gold' || mutation === 'rainbow') {
      ctx.shadowColor = mutation === 'crystal' ? '#6c8ae4' : '#ffd54f'
      ctx.shadowBlur = 14 + Math.sin(time * 4) * 5
    }
    if (mutation === 'golden') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)'
      ctx.beginPath()
      ctx.arc(0, -stemH - 14, 22, 0, Math.PI * 2)
      ctx.fill()
    }
    if (mutation === 'giant') {
      ctx.scale(1.15, 1.15)
    }
  }

  ctx.restore()
}

function drawGrowthTimer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  t: TileState,
  growthSpeedMult: number,
): void {
  if (t.kind !== 'crop' || !t.cropId || t.growth >= 1) return
  const def = getCrop(t.cropId)
  const secs = secondsRemaining(t.growth, def.baseGrowSeconds, growthSpeedMult, t.watered)
  if (secs <= 0) return

  const barW = s * 0.55
  const barH = 4
  const bx = cx - barW / 2
  const by = cy + s * 0.32

  ctx.save()
  roundRect(ctx, bx, by, barW, barH, 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fill()
  roundRect(ctx, bx, by, barW * t.growth, barH, 2)
  ctx.fillStyle = t.watered ? 'rgba(100, 180, 240, 0.75)' : 'rgba(240, 200, 100, 0.7)'
  ctx.fill()
  if (secs <= 8 || t.growth > 0.7) {
    ctx.fillStyle = 'rgba(40, 40, 50, 0.5)'
    ctx.font = '600 10px Nunito, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`${secs}s`, cx, by + 6)
  }
  ctx.restore()
}

function drawParkedTractor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hasTractor: boolean,
  pulse: number,
  time: number,
  tractorDef?: TractorDef,
): void {
  ctx.save()
  ctx.translate(x, y)
  const bob = tractorDef?.hover ? Math.sin(time * 1.8) * 6 : Math.sin(time * 1.2) * 2
  ctx.translate(0, bob)
  const s = 1 + pulse * 0.08

  if (!hasTractor) {
    ctx.globalAlpha = 0.45
    ctx.fillStyle = 'rgba(60, 50, 70, 0.15)'
    ctx.beginPath()
    ctx.ellipse(0, 28, 48, 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.scale(s, s)
  const body = hasTractor ? (tractorDef?.bodyColor ?? '#e84b6a') : '#9aa0ab'
  const cab = hasTractor ? (tractorDef?.cabColor ?? '#4b6cb7') : '#7a8494'

  ctx.fillStyle = body
  roundRect(ctx, -44, -6, 78, 32, 12)
  ctx.fill()
  ctx.fillStyle = cab
  roundRect(ctx, 4, -28, 34, 28, 10)
  ctx.fill()
  ctx.fillStyle = hasTractor ? '#ffe9b3' : '#c8cdd6'
  roundRect(ctx, 12, -20, 18, 14, 4)
  ctx.fill()

  const wheel = (wx: number, wy: number) => {
    ctx.fillStyle = '#2d3436'
    ctx.beginPath()
    ctx.arc(wx, wy, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  wheel(-30, 26)
  wheel(30, 26)

  if (!hasTractor) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '700 11px Nunito, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🔒', 0, -38)
    ctx.fillStyle = 'rgba(60, 55, 80, 0.65)'
    ctx.font = '600 10px Nunito, system-ui, sans-serif'
    ctx.fillText('tractor', 0, -24)
  } else {
    ctx.fillStyle = '#f4c430'
    ctx.font = '700 12px Nunito, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(tractorDef?.hover ? 'zoom' : 'vroom', 0, -34)
  }
  ctx.restore()
}

function drawDeco(ctx: CanvasRenderingContext2D, d: DecoDraw, time: number): void {
  ctx.save()
  ctx.translate(d.x, d.y)
  if (d.id === 'pinwheel') {
    const rot = time * 2.2 + d.phase
    ctx.fillStyle = '#f2c14e'
    ctx.strokeStyle = 'rgba(80,50,20,0.25)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 40)
    ctx.lineTo(0, 0)
    ctx.stroke()
    for (let i = 0; i < 4; i++) {
      ctx.save()
      ctx.rotate(rot + (Math.PI / 2) * i)
      ctx.fillStyle = i % 2 === 0 ? '#ff6b81' : '#6c8ae4'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(18, -8, 28, 0)
      ctx.quadraticCurveTo(18, 8, 0, 0)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#ffe9b3'
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, Math.PI * 2)
    ctx.fill()
  } else if (d.id === 'scarecrow') {
    ctx.fillStyle = '#6d4c41'
    ctx.fillRect(-6, 8, 12, 28)
    ctx.fillStyle = '#8d6e63'
    ctx.beginPath()
    ctx.arc(0, -8, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5c6bc0'
    ctx.fillRect(-22, -2, 44, 8)
    ctx.fillStyle = '#37474f'
    ctx.fillRect(-4, -24, 8, 10)
  } else if (d.id === 'cloud') {
    const bob = Math.sin(time * 1.5 + d.phase) * 4
    ctx.translate(0, bob)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.arc(-18, 0, 16, 0, Math.PI * 2)
    ctx.arc(10, -6, 20, 0, Math.PI * 2)
    ctx.arc(32, 0, 14, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawWeatherOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, kind: WeatherKind, time: number): void {
  ctx.save()
  if (kind === 'rainy') {
    ctx.fillStyle = 'rgba(80, 120, 180, 0.12)'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.35)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 18; i++) {
      const x = ((time * 120 + i * 47) % (w + 40)) - 20
      const y = ((time * 200 + i * 63) % (h + 40)) - 20
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 4, y + 12)
      ctx.stroke()
    }
  } else if (kind === 'sunny') {
    ctx.fillStyle = 'rgba(255, 230, 150, 0.08)'
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = 'rgba(200, 210, 230, 0.06)'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

function drawPets(ctx: CanvasRenderingContext2D, pets: PetSpot[], time: number): void {
  for (const p of pets) {
    ctx.save()
    const bob = Math.sin(time * 2 + p.phase) * 4
    ctx.translate(p.x, p.y + bob)
    ctx.font = '22px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.emoji, 0, 0)
    ctx.restore()
  }
}

export function renderFarm(
  ctx: CanvasRenderingContext2D,
  frame: RenderFrame,
  time: number,
  vw: number,
  vh: number,
): { ox: number; oy: number; tileSize: number } {
  const { farm, tileSize, gridGap } = frame
  const plot = farm.w
  const { ox, oy, tw, th } = farmScreenOffset(farm, plot, tileSize, vw, vh, gridGap)

  drawScenery(ctx, ox, oy, tw, th, time)

  for (let gy = 0; gy < plot; gy++) {
    for (let gx = 0; gx < plot; gx++) {
      const { px, py, cx, cy } = tilePixelPos(ox, oy, gx, gy, tileSize, gridGap)
      drawRaisedPlot(ctx, px, py, tileSize, farm.tiles[gy][gx], gx, gy, time, frame.fieldTheme)
      const t = farm.tiles[gy][gx]
      if (t.kind === 'crop' && t.cropId) {
        drawCropSprite(ctx, cx, cy - 4, t.cropId, t.growth, time, t.pop, t.mutation)
        drawGrowthTimer(ctx, cx, cy, tileSize, t, frame.growthSpeedMult)
      }
      const isClick =
        frame.clickHighlight?.gx === gx &&
        frame.clickHighlight.gy === gy &&
        frame.clickHighlight.t > 0
      const isDrag =
        frame.dragHighlight?.gx === gx && frame.dragHighlight.gy === gy
      const isHover =
        frame.hoverHighlight?.gx === gx && frame.hoverHighlight.gy === gy

      if (isClick) {
        const pulse = frame.clickHighlight!.t
        ctx.save()
        ctx.fillStyle = `rgba(255, 230, 140, ${0.22 * pulse})`
        roundRect(ctx, px - 3, py - 3, tileSize + 6, tileSize + 6, 18)
        ctx.fill()
        ctx.strokeStyle = `rgba(255, 200, 80, ${0.75 * pulse})`
        ctx.lineWidth = 3
        roundRect(ctx, px - 3, py - 3, tileSize + 6, tileSize + 6, 18)
        ctx.stroke()
        ctx.restore()
      } else if (isDrag) {
        ctx.save()
        ctx.fillStyle = 'rgba(255, 220, 100, 0.18)'
        roundRect(ctx, px - 2, py - 2, tileSize + 4, tileSize + 4, 18)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.85)'
        ctx.lineWidth = 3
        roundRect(ctx, px - 2, py - 2, tileSize + 4, tileSize + 4, 18)
        ctx.stroke()
        ctx.restore()
      } else if (isHover) {
        ctx.save()
        ctx.fillStyle = 'rgba(120, 200, 255, 0.12)'
        roundRect(ctx, px - 2, py - 2, tileSize + 4, tileSize + 4, 17)
        ctx.fill()
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.65)'
        ctx.lineWidth = 2.5
        roundRect(ctx, px - 2, py - 2, tileSize + 4, tileSize + 4, 17)
        ctx.stroke()
        ctx.restore()
      }
      if (t.autoFlash && t.autoFlash > 0) {
        ctx.save()
        ctx.fillStyle = `rgba(180, 220, 255, ${0.25 * t.autoFlash})`
        roundRect(ctx, px - 2, py - 2, tileSize + 4, tileSize + 4, 17)
        ctx.fill()
        ctx.restore()
      }
    }
  }

  for (const flash of frame.autoFlashes) {
    if (flash.gx >= farm.w || flash.gy >= farm.h) continue
    const { cx, cy } = tilePixelPos(ox, oy, flash.gx, flash.gy, tileSize, gridGap)
    drawAutoFlashIcon(ctx, cx, cy, flash.kind, flash.t / 0.6)
  }

  if (frame.expansionAnim > 0) {
    drawPlotBorderFence(ctx, ox, oy, farm.w, farm.h, tileSize, frame.expansionAnim)
  }

  for (const d of frame.decoSpots) drawDeco(ctx, d, time)

  drawPets(ctx, frame.petSpots, time)

  drawParkedTractor(
    ctx,
    ox - 98,
    oy + farm.h * (tileSize + gridGap) * 0.42,
    frame.hasTractor,
    frame.tractorPulse,
    time,
    frame.tractorDef,
  )

  drawWeatherOverlay(ctx, vw, vh, frame.weather, time)

  return { ox, oy, tileSize }
}

export function drawSceneLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  theme?: FieldTheme,
): void {
  drawBackground(ctx, w, h, time, theme)
  drawDriftingClouds(ctx, w, h, time)
}

export function screenToGrid(
  sx: number,
  sy: number,
  _farm: Farm,
  layout: FarmLayout,
  _vw: number,
  _vh: number,
): { gx: number; gy: number; locked: boolean } | null {
  const { ox, oy, tw, th, tileSize, gap, plot } = layout
  if (sx < ox - 12 || sy < oy - 12 || sx > ox + tw + 12 || sy > oy + th + 12) {
    return null
  }

  for (let gy = 0; gy < plot; gy++) {
    for (let gx = 0; gx < plot; gx++) {
      const { px, py } = tilePixelPos(ox, oy, gx, gy, tileSize, gap)
      const pad = Math.max(4, tileSize * 0.12)
      if (
        sx >= px - pad &&
        sx <= px + tileSize + pad &&
        sy >= py - pad &&
        sy <= py + tileSize + pad
      ) {
        return { gx, gy, locked: false }
      }
    }
  }
  return null
}

export function formatUpgradeLine(node: UpgradeNode, owned: boolean): string {
  const st = owned ? '✓' : '○'
  return `${st} ${node.name} — ${node.cost === 0 ? 'free' : `${node.cost} coins`}`
}
