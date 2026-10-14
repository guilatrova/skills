import type { Engine, Register, Timer } from 'claude-code'

// Main-conversation cache TTL on a subscription within plan usage
const TTL_MS = 60 * 60 * 1000
// Fire this long before the cache would expire
const MARGIN_MS = 10 * 60 * 1000
const MAX_KEEPALIVES = 2
// Below this, re-caching is cheap: not worth a fork
const MIN_CONTEXT_TOKENS = 30_000
const HANDOFF_AT_PERCENT = 90
// Handoffs are short-lived: macOS clears /tmp on reboot
const HANDOFF_DIR = '/tmp/claude-handoffs'

const HANDOFF_PROMPT = `Write a handoff so a fresh session can continue this work without this conversation.
Markdown, at most 400 words, sections: Goal, Done so far, Current state (files, branches, commands), Next steps, Decisions and gotchas.
Answer with the handoff only.`
const PING_PROMPT = 'Reply with exactly: ok'

let isOn = false
let used = 0
let timer: Timer | null = null
let didContextHandoff = false
let lastHandoff: string | null = null
// The fork is our own request: its activity must not restart the idle stretch
let isForking = false

function cancel() {
  timer?.cancel()
  timer = null
}

function showStatus($: Engine) {
  const handoff = lastHandoff ? ` · handoff: ${lastHandoff}` : ''
  $.ui.status(isOn ? `keep-alive ${used}/${MAX_KEEPALIVES}${handoff}` : undefined)
}

async function contextTokens($: Engine) {
  return (await $.session.usage()).context.tokens ?? 0
}

async function fork($: Engine, prompt: string) {
  isForking = true
  try {
    return await $.model.fork({ prompt })
  } finally {
    isForking = false
  }
}

async function writeHandoff($: Engine, why: string): Promise<boolean> {
  const r = await fork($, HANDOFF_PROMPT)
  if (!r.isAnswered) {
    $.ui.log(`cache-keeper: handoff failed (${r.reason})`, { to: 'debug' })
    return false
  }
  const cwd = await $.session.cwd()
  const project = cwd.split('/').filter(Boolean).pop() ?? 'session'
  const id = (await $.session.id()).slice(0, 8)
  const path = `${HANDOFF_DIR}/${project}-${id}.md`
  await $.process.run(['mkdir', '-p', HANDOFF_DIR])
  await $.fs.write(path, `<!-- ${why} · ${new Date().toISOString()} · cwd: ${cwd} -->\n\n${r.text}\n`)
  lastHandoff = path
  showStatus($)
  $.ui.toast(`Handoff saved: ${path}`, { timeoutMs: 10_000 })
  // Stays in the transcript after the toast is gone; terminals make the URL clickable
  $.ui.log(`Handoff saved: file://${path}`)
  return true
}

function schedule($: Engine, delayMs: number) {
  cancel()
  timer = $.clock.after(delayMs, () => void keepAlive($))
}

async function keepAlive($: Engine) {
  timer = null
  if (!isOn || used >= MAX_KEEPALIVES) return
  if ((await contextTokens($)) < MIN_CONTEXT_TOKENS) return

  // Earlier refreshes only ping the cache; the last one, before giving up, writes the handoff
  const isLast = used === MAX_KEEPALIVES - 1
  const ok = isLast ? await writeHandoff($, 'keep-alive') : (await fork($, PING_PROMPT)).isAnswered
  if (!ok) return
  used += 1
  showStatus($)
  if (used < MAX_KEEPALIVES) schedule($, TTL_MS - MARGIN_MS)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'keepalive',
      description: 'Prompt cache keep-alive: /keepalive on | off | status (off by default)',
    })
    return next(e)
  })

  on('command.run', { command: 'keepalive' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on') {
      isOn = true
      used = 0
      schedule($, TTL_MS - MARGIN_MS)
    } else if (arg === 'off') {
      isOn = false
      cancel()
    }
    showStatus($)
    const state = isOn ? `on (${used}/${MAX_KEEPALIVES} refreshes used this idle stretch)` : 'off'
    const handoff = lastHandoff ? `\nLast handoff: ${lastHandoff}` : ''
    return { text: `Cache keep-alive: ${state}${handoff}` }
  })

  // New activity: the cache is fresh again, so the idle stretch starts over
  on('prompt.submit', async ($, e, next) => {
    if (!isForking) cancel()
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || isForking || !isOn) return done
    used = 0
    showStatus($)
    schedule($, TTL_MS - MARGIN_MS)
    if (!didContextHandoff) {
      const { context } = await $.session.usage()
      if ((context.percent ?? 0) >= HANDOFF_AT_PERCENT) {
        didContextHandoff = true
        void writeHandoff($, `context ${Math.round(context.percent ?? 0)}%`)
      }
    }
    return done
  })
}
