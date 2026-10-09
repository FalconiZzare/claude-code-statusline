import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { AccountLimit, AccountLimits, CacheMark, Session, Usage } from '../types'
import {
  bar,
  basename,
  cacheTone,
  countdown,
  duration,
  modelName,
  rewriteUsd,
  ttlMs,
  usd,
} from './format'

const usage = atom({ plugin: 'usage-statusline', key: 'usage' } as const, {
  contextTokens: null,
  window: null,
  limits: [],
} as Usage)
const cache = atom({ plugin: 'usage-statusline', key: 'cache' } as const, null as CacheMark | null)
const now = atom({ plugin: 'usage-statusline', key: 'now' } as const, 0)
const session = atom({ plugin: 'usage-statusline', key: 'session' } as const, null as Session | null)
const account = atom({ plugin: 'usage-statusline', key: 'account' } as const, null as AccountLimits | null)

// Mods get five_hour and seven_day, never a model's own weekly limit, so that
// one comes from the endpoint /usage reads, with the session's own login.
const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
const ACCOUNT_EVERY_MS = 5 * 60_000
const ACCOUNT_STALE_MS = 30 * 60_000

const SEP = ' │ '
// The footer's indent on both sides; the width assumed before the surface
// has measured.
const GUTTER = 4
const DEFAULT_COLUMNS = 120
const ALERT_PERCENT = 80

// One run of text in one style; a segment is the runs between separators.
type Run = { text: string; color?: string; bold?: boolean; dim?: boolean }
type Segment = Run[]

const width = (seg: Segment) => seg.reduce((n, run) => n + [...run.text].length, 0)

// Packs segments into as few rows as the band's width allows, breaking only
// between segments.
function rows(segments: Segment[], columns: number): Segment[][] {
  const out: Segment[][] = []
  let row: Segment[] = []
  let used = 0
  for (const seg of segments) {
    const w = width(seg)
    if (row.length > 0 && used + SEP.length + w > columns) {
      out.push(row)
      row = []
      used = 0
    }
    used += (row.length > 0 ? SEP.length : 0) + w
    row.push(seg)
  }
  if (row.length > 0) out.push(row)
  return out
}

function toUsage(context: SessionContextUsage, limits: readonly SessionRateLimit[]): Usage {
  return {
    contextTokens: context.tokens ?? null,
    window: context.window,
    limits: limits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt ?? null })),
  }
}

async function branchOf($: EngineInterface): Promise<string | null> {
  for (const argv of [
    ['git', 'symbolic-ref', '--short', 'HEAD'],
    ['git', 'rev-parse', '--short', 'HEAD'],
  ]) {
    try {
      const { exitCode, stdout } = await $.process.run(argv, { timeoutMs: 2000 })
      if (exitCode === 0 && stdout.trim()) return stdout.trim()
    } catch {
      // No git, or no host commands on this surface.
    }
  }
  return null
}

async function refreshSession($: EngineInterface): Promise<void> {
  const [model, cwd, branch, { startedAt }] = await Promise.all([
    $.session.model(),
    $.session.cwd(),
    branchOf($),
    $.session.usage(),
  ])
  await update($, session, () => ({ model, branch, folder: basename(cwd), startedAt }))
}

async function refreshAccount($: EngineInterface): Promise<void> {
  const auth = await $.session.authorize()
  if (!auth) return
  const res = await $.http.fetch(USAGE_URL, {
    auth: auth.handle,
    headers: { 'anthropic-beta': 'oauth-2025-04-20' },
  })
  if (!res.ok) return
  const rows: unknown = JSON.parse(res.text)?.limits
  if (!Array.isArray(rows)) return
  const limits: AccountLimit[] = rows.flatMap(row => {
    if (typeof row?.kind !== 'string' || typeof row.percent !== 'number') return []
    return [{
      kind: row.kind,
      name: row.scope?.model?.display_name ?? null,
      percent: row.percent,
      resetsAt: typeof row.resets_at === 'string' ? row.resets_at : null,
    }]
  })
  const fetchedAt = await $.clock.now()
  await update($, account, () => ({ fetchedAt, limits }))
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await update($, usage, () => toUsage(u.context, u.rateLimits))
    await update($, now, () => Date.now())
    await refreshSession($)
    $.clock.every(1000, () => void $.clock.now().then(t => update($, now, () => t)))
    $.clock.every(ACCOUNT_EVERY_MS, () => void refreshAccount($).catch(() => {}))
    void refreshAccount($).catch(() => {})
    return result
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, cache, () => null)
      await refreshSession($)
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.context, e.rateLimits))
    return next(e)
  })

  // Every main-thread response re-arms the prompt cache for its TTL.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId === undefined && result.usage) {
      const u = result.usage
      const at = await $.clock.now()
      const sent = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens + u.output_tokens
      await update($, cache, () => ({ at, model: u.model, tokens: sent }))
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refreshSession($)
    return result
  })

  // Drawn under the prompt, above the engine's own hint line (modes, "esc to
  // interrupt"), which stays as the engine draws it. The Python status line's
  // order, styles and colors, with the cache appended.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const [hint, u, mark, t, s, acct] = await Promise.all([
      next(e),
      read($, usage),
      read($, cache),
      read($, now),
      read($, session),
      read($, account),
    ])
    const at = t || Date.now()
    const ttl = ttlMs(options.cacheTtl, u.limits.length > 0 || acct !== null)
    const isStale = acct !== null && at - acct.fetchedAt > ACCOUNT_STALE_MS
    const limitColor = (percent: number, color: string) => (percent >= ALERT_PERCENT ? 'red' : color)

    const segments: Segment[] = []

    if (s) segments.push([{ text: modelName(s.model), color: 'yellow', bold: true }])

    const ctx = u.contextTokens ?? mark?.tokens ?? null
    if (ctx !== null && u.window) {
      const percent = (ctx / u.window) * 100
      const { filled, empty } = bar(percent)
      const color = limitColor(percent, 'green')
      segments.push([
        { text: '[', color },
        { text: filled, color },
        { text: empty, dim: true },
        { text: ']', color },
        { text: ` ${Math.round(percent)}%`, color: 'gray' },
      ])
    }

    const windows: [string, string, string, string][] = [
      ['five_hour', 'session', '5H', 'yellow'],
      ['seven_day', 'weekly_all', '7D', 'green'],
    ]
    for (const [kind, accountKind, label, color] of windows) {
      const percent = u.limits.find(l => l.kind === kind)?.percentUsed
        ?? acct?.limits.find(l => l.kind === accountKind)?.percent
      if (percent === undefined) continue
      segments.push([{ text: `${label} ${Math.round(percent)}%`, color: limitColor(percent, color) }])
    }

    for (const l of acct?.limits ?? []) {
      if (l.kind !== 'weekly_scoped' || (l.resetsAt && Date.parse(l.resetsAt) < at)) continue
      const text = `${(l.name ?? 'MODEL').toUpperCase()} ${Math.round(l.percent)}%`
      segments.push([isStale ? { text, dim: true } : { text, color: limitColor(l.percent, 'magenta') }])
    }

    if (s) {
      segments.push([{ text: duration(at - s.startedAt), dim: true }])
      segments.push([{ text: s.folder, color: 'cyan', bold: true }])
      if (s.branch) segments.push([{ text: s.branch, color: 'green' }])
    }

    const remaining = mark ? mark.at + ttl - at : 0
    segments.push(
      remaining > 0
        ? [{ text: `● ${countdown(remaining)}`, color: cacheTone(remaining, ttl) }]
        : [{ text: '○', dim: true }],
    )

    if (ctx !== null) {
      const cost = rewriteUsd(ctx, mark?.model ?? s?.model ?? '', ttl)
      if (cost !== null) {
        segments.push([remaining > 0
          ? { text: `≈${usd(cost)}`, dim: true }
          : { text: `≈${usd(cost)}`, color: 'warning' }])
      }
    }

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" marginTop={1}>
        {rows(segments, (e.viewport?.columns ?? DEFAULT_COLUMNS) - GUTTER).map((row, r) => (
          <Box key={`row-${r}`}>
            <Text wrap="truncate-end">
              {row.flatMap((seg, i) => [
                i > 0 ? <Text dimColor>{SEP}</Text> : null,
                ...seg.map(run => (
                  <Text color={run.color} bold={run.bold} dimColor={run.dim}>{run.text}</Text>
                )),
              ])}
            </Text>
          </Box>
        ))}
        {hint}
      </Box>
    )
  })
}
