import { expect, mock, test } from 'claude-code/testing'
import type { Engine, On } from 'claude-code'

const MIN = 60 * 1000

function engine(on: On, tokens: number) {
  const forks: string[] = []
  const writes: string[] = []
  const statuses: (string | undefined)[] = []
  const logs: string[] = []
  on('model.fork', async (_$, e) => {
    forks.push(e.prompt)
    return { value: { isAnswered: true, text: '# Handoff', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } as never
  })
  on('session.usage', async () => ({ value: { startedAt: 0, context: { tokens, window: 1_000_000, percent: (tokens / 1_000_000) * 100 }, rateLimits: [] } }))
  on('session.cwd', async () => ({ value: '/tmp/proj' }))
  on('session.id', async () => ({ value: 'abcdef1234' }))
  on('process.run', async () => ({ value: { code: 0, stdout: '', stderr: '' } }) as never)
  on('fs.write', async (_$, e) => {
    writes.push(e.path)
    return { value: undefined } as never
  })
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.status', async (_$, e) => {
    statuses.push(e.text)
    return { value: undefined } as never
  })
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('ui.log', async (_$, e) => {
    logs.push(e.text)
    return { value: undefined } as never
  })
  on('command.run', async () => ({ text: '' }))
  on('turn.complete', async () => ({ text: '' }))
  on('session.start', async e => ({ cwd: '/tmp/proj' }))
  return { forks, writes, statuses, logs }
}

async function finishTurn($: Engine) {
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
}

test('off by default: no fork however long it idles', async ($, on) => {
  const clock = mock.clock(on)
  const { forks } = engine(on, 200_000)
  await $.session.start({ cwd: '/tmp/proj', surface: 'terminal', isInteractive: true })
  await finishTurn($)
  await clock.advance(5 * 60 * MIN)
  expect(forks.length).toBe(0)
})

test('on: ping at 50m, handoff at 100m, then stops', async ($, on) => {
  const clock = mock.clock(on)
  const { forks, writes } = engine(on, 200_000)
  await $.session.start({ cwd: '/tmp/proj', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'keepalive', args: 'on' } as never)
  await finishTurn($)
  await clock.advance(49 * MIN)
  expect(forks.length).toBe(0)
  await clock.advance(1 * MIN)
  expect(forks.length).toBe(1)
  expect(forks[0]).toBe('Reply with exactly: ok')
  expect(writes.length).toBe(0)
  await clock.advance(50 * MIN)
  expect(forks.length).toBe(2)
  expect(writes[0]).toBe('/tmp/claude-handoffs/proj-abcdef12.md')
  await clock.advance(5 * 60 * MIN)
  expect(forks.length).toBe(2)
})

test('on but small conversation: skips the fork', async ($, on) => {
  const clock = mock.clock(on)
  const { forks } = engine(on, 10_000)
  await $.session.start({ cwd: '/tmp/proj', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'keepalive', args: 'on' } as never)
  await finishTurn($)
  await clock.advance(3 * 60 * MIN)
  expect(forks.length).toBe(0)
})

test('handoff path stays visible: status line, transcript link and /keepalive status', async ($, on) => {
  const clock = mock.clock(on)
  const { statuses, logs } = engine(on, 200_000)
  await $.session.start({ cwd: '/tmp/proj', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'keepalive', args: 'on' } as never)
  await finishTurn($)
  await clock.advance(100 * MIN)
  const path = '/tmp/claude-handoffs/proj-abcdef12.md'
  expect(statuses.at(-1)).toBe(`keep-alive 2/2 · handoff: ${path}`)
  expect(logs).toContain(`Handoff saved: file://${path}`)
  const r = await $.command.run({ command: 'keepalive', args: 'status' } as never)
  expect((r as { text: string }).text).toContain(`Last handoff: ${path}`)
})
