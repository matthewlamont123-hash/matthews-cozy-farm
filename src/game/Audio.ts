/** Procedural SFX — no asset files. Web Audio unlocks on first call. */
let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
  } catch {
    return null
  }
  return ctx
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slide = 0,
): void {
  const c = ac()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noiseBurst(dur: number, gain: number): void {
  const c = ac()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const t0 = c.currentTime
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)

  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.value = 900
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  src.connect(filt)
  filt.connect(g)
  g.connect(c.destination)
  src.start(t0)
}

export const Sfx = {
  harvest(): void {
    tone(520, 0.07, 'sine', 0.12, 180)
    window.setTimeout(() => tone(880, 0.05, 'triangle', 0.08), 40)
    noiseBurst(0.04, 0.04)
  },
  plant(): void {
    tone(180, 0.09, 'triangle', 0.1, -40)
    noiseBurst(0.06, 0.03)
  },
  water(): void {
    noiseBurst(0.12, 0.06)
    tone(340, 0.14, 'sine', 0.05, -80)
  },
  sell(): void {
    tone(660, 0.06, 'square', 0.06)
    window.setTimeout(() => tone(990, 0.08, 'sine', 0.1), 70)
    window.setTimeout(() => tone(1320, 0.1, 'triangle', 0.07), 140)
  },
  ui(): void {
    tone(420, 0.04, 'sine', 0.07)
  },
  unlock(): void {
    tone(523, 0.08, 'sine', 0.09)
    window.setTimeout(() => tone(659, 0.08, 'sine', 0.09), 80)
    window.setTimeout(() => tone(784, 0.12, 'triangle', 0.1), 160)
  },
  auto(): void {
    tone(280, 0.06, 'sine', 0.06, 40)
  },
  daily(): void {
    tone(440, 0.1, 'triangle', 0.08)
    window.setTimeout(() => tone(554, 0.1, 'triangle', 0.08), 90)
    window.setTimeout(() => tone(659, 0.14, 'sine', 0.1), 180)
  },
} as const
