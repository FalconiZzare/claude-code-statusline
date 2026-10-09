import { expect, test } from 'claude-code/testing'

import { bar, countdown, duration, modelId, modelName, rewriteUsd, tokens } from '../hooks/format'

const HINT = { isDraft: false, isWorking: false, hint: '? for shortcuts' }
const viewport = (columns: number) => ({ columns, rows: 30 })

test('rewrite cost matches the reference screenshot (446K on Opus 5.5, 1h TTL)', () => {
  const cost = rewriteUsd(446_000, 'claude-opus-5-5', 60 * 60_000)
  expect(cost?.toFixed(2)).toBe('3.57')
  expect(rewriteUsd(100_000, 'Opus 5.5', 5 * 60_000)?.toFixed(2)).toBe('0.50')
  expect(rewriteUsd(1000, 'some-other-model', 60_000)).toBe(null)
})

test('model names drop "Claude" and dashes', () => {
  expect(modelName('claude-opus-5-5')).toBe('OPUS 5.5')
  expect(modelName('claude-opus-5-5[1m]')).toBe('OPUS 5.5')
  expect(modelName('Claude Opus 5.5 (1M context)')).toBe('OPUS 5.5')
  expect(modelName('Fable 5.1')).toBe('FABLE 5.1')
  expect(modelName('claude-haiku-4-5-20251001')).toBe('HAIKU 4.5')
})

test('formats tokens, bars, countdowns and durations', () => {
  expect(modelId('Fable 5.1')).toBe('claude-fable-5-1')
  expect(tokens(46_200)).toBe('46K')
  expect(tokens(1_000_000)).toBe('1.0M')
  expect(bar(12)).toEqual({ filled: '▓', empty: '░░░░░░░░░' })
  expect(countdown(60 * 60_000)).toBe('60M')
  expect(countdown(42_000)).toBe('42S')
  expect(duration(65 * 60_000)).toBe('1H 05M')
})

test('under the prompt: one row when it fits, more when narrow, the hint kept', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  // Stands for the engine's own hint line beneath the mod.
  on('ui.render', { component: 'PromptHint' }, (engine, e) => {
    const { Text } = engine.ui.resolve(e)
    return <Text dimColor>{e.props.hint}</Text>
  })
  await $.session.measure({
    context: { tokens: 46_000, window: 400_000, percent: 12 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 3 },
      { kind: 'seven_day', percentUsed: 62 },
    ],
    changed: ['context', 'rateLimits'],
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const wide = await $.ui.mount({
      plugin: 'usage-statusline', surface, component: 'PromptHint', props: HINT, viewport: viewport(300),
    })
    expect(await wide.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
    expect(await wide.find({ type: 'Text', text: /\[▓░{9}\] 12%/ })).toBeDefined()
    expect(await wide.find({ type: 'Text', text: /400K/ })).toBeUndefined()
    expect(await wide.find({ type: 'Text', text: '5H 3%' })).toBeDefined()
    expect(await wide.find({ type: 'Text', text: '7D 62%' })).toBeDefined()
    expect(await wide.find({ type: 'Text', text: '○' })).toBeDefined()
    expect(await wide.find({ key: 'row-1' })).toBeUndefined()
    await wide.unmount()

    const narrow = await $.ui.mount({
      plugin: 'usage-statusline', surface, component: 'PromptHint', props: HINT, viewport: viewport(34),
    })
    expect(await narrow.find({ key: 'row-1' })).toBeDefined()
    await narrow.unmount()
  }
})
