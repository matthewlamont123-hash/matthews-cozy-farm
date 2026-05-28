const GOLD = '#e8b830'
const GOLD_EDGE = '#c49220'

export type ParticleKind = 'coin' | 'spark' | 'text' | 'cropPop' | 'ambient' | 'ring'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  kind: ParticleKind
  label?: string
  size?: number
  color?: string
}

export class ParticleSystem {
  items: Particle[] = []
  ambientTimer = 0

  /** Combined harvest feedback: pop, ring, coins, dust */
  harvestJuice(cx: number, cy: number, color: string, emoji?: string): void {
    this.cropPop(cx, cy, color, emoji)
    this.items.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      life: 0.35,
      maxLife: 0.35,
      kind: 'ring',
      color,
      size: 18,
    })
    this.burstCoins(cx, cy - 6, 5)
    this.sparkles(cx, cy + 4, 5)
  }

  burstCoins(cx: number, cy: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const sp = 90 + Math.random() * 110
      this.items.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
        kind: 'coin',
        size: 9 + Math.random() * 3,
      })
    }
  }

  cropPop(cx: number, cy: number, color: string, emoji?: string): void {
    this.items.push({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 24,
      vy: -145 - Math.random() * 40,
      life: 0.48,
      maxLife: 0.48,
      kind: 'cropPop',
      color,
      label: emoji,
      size: 16 + Math.random() * 4,
    })
  }

  sparkles(cx: number, cy: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 35 + Math.random() * 70
      this.items.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.28 + Math.random() * 0.18,
        maxLife: 0.4,
        kind: 'spark',
        size: 2 + Math.random() * 3,
      })
    }
  }

  floatText(x: number, y: number, text: string): void {
    this.items.push({
      x,
      y,
      vx: 0,
      vy: -38,
      life: 0.85,
      maxLife: 0.85,
      kind: 'text',
      label: text,
    })
  }

  tickAmbient(w: number, h: number, dt: number): void {
    this.ambientTimer -= dt
    if (this.ambientTimer > 0) return
    this.ambientTimer = 1.2 + Math.random() * 2
    this.items.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.45,
      vx: 4 + Math.random() * 6,
      vy: -2 - Math.random() * 3,
      life: 1.5 + Math.random(),
      maxLife: 2,
      kind: 'ambient',
      size: 1.5 + Math.random() * 2,
    })
  }

  update(dt: number): void {
    this.items = this.items.filter((p) => {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'coin' || p.kind === 'cropPop') p.vy += 260 * dt
      else if (p.kind === 'spark') p.vy += 50 * dt
      else if (p.kind !== 'ring') p.vy += 30 * dt
      p.vx *= Math.pow(0.15, dt)
      if (p.kind === 'ring') p.size = (p.size ?? 18) + 90 * dt
      return p.life > 0
    })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const t = p.life / p.maxLife
      ctx.save()
      if (p.kind === 'ring') {
        const r = p.size ?? 18
        ctx.globalAlpha = t * 0.55
        ctx.strokeStyle = p.color ?? '#ff9f43'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.2))
        if (p.kind === 'coin') {
          const r = p.size ?? 9
          ctx.fillStyle = GOLD
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = GOLD_EDGE
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (p.kind === 'cropPop') {
          const s = (p.size ?? 14) * (0.5 + (1 - t) * 0.55)
          ctx.fillStyle = p.color ?? '#ff9f43'
          ctx.beginPath()
          ctx.arc(p.x, p.y, s, 0, Math.PI * 2)
          ctx.fill()
          if (p.label) {
            ctx.font = `${Math.floor(s * 1.5)}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(p.label, p.x, p.y - 1)
          }
        } else if (p.kind === 'spark') {
          ctx.fillStyle = `rgba(255, 240, 200, ${0.4 + t * 0.5})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size ?? 3, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.kind === 'ambient') {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + t * 0.2})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size ?? 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.kind === 'text' && p.label) {
          ctx.font = '800 17px Nunito, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = `rgba(30, 28, 40, ${0.3 + t * 0.2})`
          ctx.fillText(p.label, p.x + 1, p.y + 2)
          ctx.fillStyle = `rgba(255, 252, 245, ${t})`
          ctx.fillText(p.label, p.x, p.y)
        }
      }
      ctx.restore()
    }
  }
}
