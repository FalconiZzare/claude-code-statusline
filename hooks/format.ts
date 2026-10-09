// List input prices in USD per million tokens, matched by model id prefix
// (first match wins, so more specific prefixes come first).
const INPUT_USD_PER_MTOK: readonly (readonly [string, number])[] = [
  ['claude-fable', 10],
  ['claude-mythos', 10],
  ['claude-opus-5-5', 4],
  ['claude-opus', 5],
  ['claude-sonnet-5', 2],
  ['claude-sonnet', 3],
  ['claude-haiku-5-5', 0.1],
  ['claude-haiku', 1],
]

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export type Tone = 'success' | 'warning' | 'error' | 'inactive'

// "/model" shows "Opus 5.5"; the API reports "claude-opus-5-5".
export function modelId(name: string): string {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return id.startsWith('claude-') ? id : `claude-${id}`
}

// Re-caching the whole context costs 1.25x input on the 5m TTL, 2x on 1h.
export function rewriteUsd(tokens: number, model: string, ttlMs: number): number | null {
  const id = modelId(model)
  const price = INPUT_USD_PER_MTOK.find(([prefix]) => id.startsWith(prefix))?.[1]
  if (price === undefined) return null
  return (tokens / 1e6) * price * (ttlMs > 5 * MINUTE ? 2 : 1.25)
}

// "claude-opus-5-5[1m]", "Claude Opus 5.5 (1M context)" -> "OPUS 5.5"
export function modelName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, ' ')
    .split(/[\s\-_]+/)
    .filter(w => w && w !== 'claude')
  const family = words.find(w => /^[a-z]+$/.test(w))
  if (!family) return name.toUpperCase()
  const version = words.filter(w => /^\d{1,2}(\.\d{1,2})?$/.test(w)).join('.')
  return version ? `${family.toUpperCase()} ${version}` : family.toUpperCase()
}

export function bar(percent: number, cells = 10): { filled: string; empty: string } {
  const n = Math.max(0, Math.min(cells, Math.round((percent / 100) * cells)))
  return { filled: '▓'.repeat(n), empty: '░'.repeat(cells - n) }
}

export function tokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(n)
}

export function usd(n: number): string {
  return `$${n.toFixed(2)}`
}

// 42M, 1H 05M, 3D 4H
export function duration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / MINUTE))
  if (m < 60) return `${m}M`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}H ${String(m % 60).padStart(2, '0')}M`
  return `${Math.floor(h / 24)}D ${h % 24}H`
}

// Counts up to the next whole minute so a fresh 1h cache reads 60M; the last
// minute counts seconds.
export function countdown(ms: number): string {
  if (ms < MINUTE) return `${Math.ceil(ms / 1000)}S`
  return `${Math.ceil(ms / MINUTE)}M`
}

export function cacheTone(remainingMs: number, ttlMs: number): Tone {
  if (remainingMs <= 0) return 'inactive'
  const left = remainingMs / ttlMs
  return left > 0.5 ? 'success' : left > 0.2 ? 'warning' : 'error'
}

export function ttlMs(setting: unknown, onSubscription: boolean): number {
  if (setting === '5m') return 5 * MINUTE
  if (setting === '1h') return HOUR
  return onSubscription ? HOUR : 5 * MINUTE
}

export function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}
