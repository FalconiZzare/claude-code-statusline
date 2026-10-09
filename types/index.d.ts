export type Limit = { kind: string; percentUsed: number; resetsAt: string | null }

export type Usage = {
  contextTokens: number | null
  window: number | null
  limits: Limit[]
}

// When the main thread last got a response, which re-arms the prompt cache.
export type CacheMark = { at: number; model: string; tokens: number }

// One row of the usage endpoint's `limits`: `session` (5h), `weekly_all`
// (week) and `weekly_scoped` (a model's own weekly, such as Fable).
export type AccountLimit = { kind: string; name: string | null; percent: number; resetsAt: string | null }

export type AccountLimits = { fetchedAt: number; limits: AccountLimit[] }

export type Session = { model: string; branch: string | null; folder: string; startedAt: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-statusline': {
      usage: Usage
      cache: CacheMark | null
      now: number
      session: Session | null
      account: AccountLimits | null
    }
  }
}
