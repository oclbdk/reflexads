'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { DemoFrame } from '../demo-frame'

// The straightening: take the tangled record and project it, one role at a
// time. Each view replays in its own order into its own state — nothing
// outside the view is needed, down to recovering the request still in
// flight. We don't argue for the word "monad"; the views speak, and the
// spec below the demo is what holds us accountable for what it means.

type StreamKey = 'input' | 'state' | 'ui' | 'net' | 'timer' | 'sys'
type Entry = { stream: StreamKey; label: string; p: number | null; t: number }

const STREAMS: Record<StreamKey, { cell: string; text: string; chipBg: string }> = {
  input: { cell: 'bg-teal-400', text: 'text-teal-600 dark:text-teal-400', chipBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
  state: { cell: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', chipBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  ui: { cell: 'bg-violet-400', text: 'text-violet-600 dark:text-violet-400', chipBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  net: { cell: 'bg-sky-400', text: 'text-sky-600 dark:text-sky-400', chipBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  timer: { cell: 'bg-rose-400', text: 'text-rose-600 dark:text-rose-400', chipBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  sys: { cell: 'bg-zinc-400', text: 'text-zinc-500 dark:text-zinc-400', chipBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' },
}
const STREAM_KEYS = Object.keys(STREAMS) as StreamKey[]

const CUTOFF = 1900

// Reweave the same three presses with fresh jitter: the record interleaves
// differently every time; the straightened views come out identical in shape.
// Press 3's network reply deliberately lands beyond the cutoff — still in
// flight, recoverable only by straightening.
function weave(): Entry[] {
  const evs: Entry[] = []
  const add = (t: number, stream: StreamKey, label: string, p: number | null) =>
    evs.push({ t, stream, label, p })
  const j = (n: number) => n + Math.random() * n * 0.5
  for (let p = 1; p <= 3; p++) {
    const b = (p - 1) * 420
    add(b, 'input', 'pointerdown', p)
    add(b + j(12), 'input', 'pointerup', p)
    add(b + j(18), 'input', 'click', p)
    add(b + j(28), 'state', 'dispatch press', p)
    for (let i = 0; i < 4; i++) add(b + j(38 + i * 8), 'state', `notify sub ${i}`, p)
    for (let i = 0; i < 3; i++) add(b + j(55 + i * 28), 'ui', `render <C${i}>`, p)
    add(b + j(150), 'ui', 'layout', p)
    add(b + j(180), 'ui', 'paint', p)
    add(b + j(205), 'ui', 'composite', p)
    add(b + j(22), 'net', 'request /act', p)
    const lat = p === 3 ? 1500 : 480 + Math.random() * 220
    add(b + lat, 'net', 'response 200', p)
    add(b + lat + j(18), 'net', 'parse json', p)
    add(b + lat + j(40), 'state', 'merge response', p)
    add(b + lat + j(70), 'ui', 'render <C0>', p)
    add(b + lat + j(100), 'ui', 'paint', p)
    add(b + j(8), 'timer', 'debounce set', p)
    add(b + j(255), 'timer', 'debounce fire', p)
    add(b + j(270), 'state', 'flush queue', p)
  }
  for (let t = 300; t < CUTOFF; t += 500) add(t, 'sys', 'heartbeat', null)
  return evs.filter((e) => e.t <= CUTOFF).sort((a, b) => a.t - b.t)
}

// Each view's state, folded from that view alone.
function fold(role: StreamKey, played: Entry[]): string[] {
  const count = (pred: (l: string) => boolean) => played.filter((e) => pred(e.label)).length
  switch (role) {
    case 'input':
      return [`pointer events: ${count((l) => l.startsWith('pointer'))}`, `clicks: ${count((l) => l === 'click')}`]
    case 'state':
      return [
        `dispatched: ${count((l) => l === 'dispatch press')} · flushed: ${count((l) => l === 'flush queue')}`,
        `notified: ${count((l) => l.startsWith('notify'))} · merged: ${count((l) => l === 'merge response')}`,
      ]
    case 'ui':
      return [
        `renders: ${count((l) => l.startsWith('render'))} · paints: ${count((l) => l === 'paint')}`,
        `last: ${played.length > 0 ? played[played.length - 1].label : '—'}`,
      ]
    case 'net': {
      const req = count((l) => l.startsWith('request'))
      const res = count((l) => l.startsWith('response'))
      return [`requests: ${req} · responses: ${res}`, `in flight: ${req - res}`]
    }
    case 'timer': {
      const set = count((l) => l.endsWith('set'))
      const fired = count((l) => l.endsWith('fire'))
      return [`set: ${set} · fired: ${fired}`, `pending: ${set - fired}`]
    }
    case 'sys':
      return [`heartbeats: ${played.length}`]
  }
}

export function HookMonadDemo() {
  const [log, setLog] = useState<Entry[]>([])
  const [role, setRole] = useState<StreamKey | null>(null)
  const [replay, setReplay] = useState(0)

  useEffect(() => {
    setLog(weave())
  }, [])

  // Selecting a view replays it, unit by unit, into its state.
  useEffect(() => {
    if (!role) return
    setReplay(0)
    const n = log.filter((e) => e.stream === role).length
    let i = 0
    const iv = setInterval(() => {
      i++
      setReplay(i)
      if (i >= n) clearInterval(iv)
    }, 55)
    return () => clearInterval(iv)
  }, [role, log])

  const view = role ? log.filter((e) => e.stream === role) : []
  const played = view.slice(0, replay)
  const lines = role ? fold(role, played) : []

  return (
    <DemoFrame
      title="Straightening the record"
      hint={
        <>
          Reweave as often as you like. The record interleaves differently every time; the
          straightened views don&rsquo;t care. Each view replays in its own order into its own
          state, needing nothing outside itself, right down to recovering the request that&rsquo;s
          still in flight. That closure is the whole claim.
        </>
      }
    >
      <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
        <div className="flex flex-wrap content-start gap-px">
          {log.map((e, i) => (
            <div
              key={i}
              title={`${e.stream}: ${e.label}${e.p !== null ? ` · press ${e.p}` : ''}`}
              className={clsx(
                'size-1.5 rounded-[1px] transition-opacity duration-150',
                STREAMS[e.stream].cell,
                role !== null && e.stream !== role && 'opacity-15',
              )}
            />
          ))}
          {log.length === 0 && (
            <span className="px-1 text-[10px] text-zinc-300 dark:text-zinc-600">weaving…</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">view as:</span>
        {STREAM_KEYS.map((s) => (
          <button
            key={s}
            onClick={() => setRole((cur) => (cur === s ? null : s))}
            className={clsx(
              'rounded-md px-2 py-0.5 font-mono text-xs ring-1 transition-colors',
              role === s
                ? clsx('font-semibold ring-transparent', STREAMS[s].chipBg)
                : 'text-zinc-400 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-500 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="min-h-16 rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
          <div className="flex flex-wrap content-start gap-1">
            {view.map((e, i) => (
              <span
                key={i}
                className={clsx(
                  'rounded-sm px-1 py-0.5 font-mono text-[9px]/3 transition-opacity duration-150',
                  STREAMS[e.stream].chipBg,
                  i >= replay && 'opacity-25',
                )}
              >
                {e.label}
                {e.p !== null && <span className="opacity-50"> p{e.p}</span>}
              </span>
            ))}
            {role === null && (
              <span className="px-1 text-[10px] text-zinc-300 dark:text-zinc-600">
                pick a view — its units lift out of the record, in order
              </span>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
          <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            view state
          </div>
          {role ? (
            <div className={clsx('px-1 font-mono text-[10px]/4', STREAMS[role].text)}>
              {lines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          ) : (
            <div className="px-1 font-mono text-[10px]/4 text-zinc-300 dark:text-zinc-600">—</div>
          )}
          <div className="mt-1 px-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
            folded from this view alone
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setLog(weave())}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Weave again
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          record: {log.length} units
          {role ? ` · view ${role}: ${view.length} units → ${lines.length} lines of state` : ''}
        </span>
      </div>
    </DemoFrame>
  )
}
