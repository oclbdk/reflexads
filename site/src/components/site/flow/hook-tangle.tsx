'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { WidgetFrame } from '../widget-frame'

// The tangle: §1's single pixel was the surface. One press fans out across
// many concurrent streams — input, state, rendering, network, timers — each
// emitting at its own rate, with real latencies, all serializing into one
// record. Press a few times quickly and the interleavings cross: a network
// reply from the first press lands after the third press's input events.
// Click any cell to trace one press's footprint through the record — which
// is often the only thing you have to go by.

type StreamKey = 'input' | 'state' | 'ui' | 'net' | 'timer' | 'sys'
type Entry = { stream: StreamKey; label: string; p: number | null; t: number }

const STREAMS: Record<StreamKey, { cell: string; text: string }> = {
  input: { cell: 'bg-teal-400', text: 'text-teal-600 dark:text-teal-400' },
  state: { cell: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  ui: { cell: 'bg-violet-400', text: 'text-violet-600 dark:text-violet-400' },
  net: { cell: 'bg-sky-400', text: 'text-sky-600 dark:text-sky-400' },
  timer: { cell: 'bg-rose-400', text: 'text-rose-600 dark:text-rose-400' },
  sys: { cell: 'bg-zinc-400', text: 'text-zinc-500 dark:text-zinc-400' },
}
const STREAM_KEYS = Object.keys(STREAMS) as StreamKey[]

const STORE_MAX = 900
const RENDER_MAX = 360

export function HookTangleWidget() {
  const [log, setLog] = useState<Entry[]>([])
  const [presses, setPresses] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  const pending = useRef<{ due: number; e: Entry }[]>([])
  const t0 = useRef<number | null>(null)

  // Flush scheduled emissions in arrival order — the serializer.
  useEffect(() => {
    if (!active) return
    const iv = setInterval(() => {
      const now = Date.now()
      const due = pending.current.filter((x) => x.due <= now)
      if (due.length > 0) {
        pending.current = pending.current.filter((x) => x.due > now)
        due.sort((a, b) => a.due - b.due)
        setLog((l) => {
          const next = [...l, ...due.map((x) => ({ ...x.e, t: x.due }))]
          return next.length > STORE_MAX ? next.slice(-STORE_MAX) : next
        })
      }
      if (pending.current.length === 0) setActive(false)
    }, 45)
    return () => clearInterval(iv)
  }, [active])

  // The heartbeat: once anything has happened, the sequence never sleeps.
  useEffect(() => {
    if (t0.current === null && presses === 0) return
    const iv = setInterval(() => {
      setLog((l) => {
        const next = [...l, { stream: 'sys' as StreamKey, label: 'heartbeat', p: null, t: Date.now() }]
        return next.length > STORE_MAX ? next.slice(-STORE_MAX) : next
      })
    }, 1400)
    return () => clearInterval(iv)
  }, [presses > 0])

  function press() {
    const now = Date.now()
    if (t0.current === null) t0.current = now
    const p = presses + 1
    setPresses(p)
    const add = (offset: number, stream: StreamKey, label: string) =>
      pending.current.push({ due: now + offset, e: { stream, label, p, t: 0 } })
    const j = (n: number) => n + Math.random() * n * 0.5

    add(0, 'input', 'pointerdown')
    add(j(12), 'input', 'pointerup')
    add(j(18), 'input', 'click')
    add(j(25), 'state', 'dispatch press')
    for (let i = 0; i < 4; i++) add(j(35 + i * 8), 'state', `notify sub ${i}`)
    for (let i = 0; i < 3; i++) add(j(55 + i * 28), 'ui', `render <C${i}>`)
    add(j(150), 'ui', 'layout')
    add(j(180), 'ui', 'paint')
    add(j(205), 'ui', 'composite')
    add(j(20), 'net', 'request /act')
    const lat = 350 + Math.random() * 650
    add(lat, 'net', 'response 200')
    add(lat + j(18), 'net', 'parse json')
    add(lat + j(40), 'state', 'merge response')
    add(lat + j(70), 'ui', 'render <C0>')
    add(lat + j(100), 'ui', 'paint')
    add(j(8), 'timer', 'debounce set')
    add(j(255), 'timer', 'debounce fire')
    add(j(270), 'state', 'flush queue')
    setActive(true)
  }

  function reset() {
    pending.current = []
    t0.current = null
    setLog([])
    setPresses(0)
    setSelected(null)
    setActive(false)
  }

  const shown = log.slice(-RENDER_MAX)
  const counts: Record<StreamKey, number> = { input: 0, state: 0, ui: 0, net: 0, timer: 0, sys: 0 }
  for (const e of log) counts[e.stream]++

  // Trace stats for the selected press: its footprint, and how much foreign
  // traffic interleaved inside its own span.
  let trace: { units: number; streams: number; span: number; foreign: number } | null = null
  if (selected !== null) {
    const mine = log.filter((e) => e.p === selected)
    if (mine.length > 0) {
      const first = mine[0].t
      const last = mine[mine.length - 1].t
      const within = log.filter((e) => e.t >= first && e.t <= last)
      trace = {
        units: mine.length,
        streams: new Set(mine.map((e) => e.stream)).size,
        span: last - first,
        foreign: within.length - mine.length,
      }
    }
  }

  return (
    <WidgetFrame
      title="What the press actually did"
      hint={
        <>
          Press a few times, quickly. Six streams emit at their own rates (a network reply from
          one press can land after the next press&rsquo;s input events) and everything serializes
          into the record below. Click any cell to trace a single press through it. When something
          goes wrong, this record is often all you have to go by.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3">
        {STREAM_KEYS.map((s) => (
          <span key={s} className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className={clsx('size-2 rounded-[2px]', STREAMS[s].cell)} />
            <span className={STREAMS[s].text}>{s}</span>
            <span className="text-zinc-400 tabular-nums dark:text-zinc-500">{counts[s]}</span>
          </span>
        ))}
      </div>

      <div className="min-h-24 rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
        <div className="flex flex-wrap content-start gap-px">
          {shown.map((e, i) => (
            <div
              key={log.length - shown.length + i}
              onClick={() => e.p !== null && setSelected((cur) => (cur === e.p ? null : e.p))}
              title={`${e.stream}: ${e.label}${e.p !== null ? ` · press ${e.p}` : ''}${
                t0.current !== null ? ` · +${((e.t - t0.current) / 1000).toFixed(2)}s` : ''
              }`}
              className={clsx(
                'size-1.5 rounded-[1px] transition-opacity duration-150',
                STREAMS[e.stream].cell,
                e.p !== null && 'cursor-pointer',
                selected !== null && e.p !== selected && 'opacity-15',
              )}
            />
          ))}
          {log.length === 0 && (
            <span className="px-1 text-[10px] text-zinc-300 dark:text-zinc-600">
              the record is empty — press
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 font-mono text-[10px]/4 text-zinc-500 dark:text-zinc-400">
        {trace ? (
          <>
            press {selected}: {trace.units} units across {trace.streams} streams, spread over{' '}
            {(trace.span / 1000).toFixed(2)}s — with {trace.foreign} units from everything else
            interleaved inside its span
          </>
        ) : log.length > 0 ? (
          'click any cell to trace one press through the record'
        ) : (
          ' '
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={press}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 active:translate-y-px dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Press
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {presses} press{presses === 1 ? '' : 'es'} · {log.length} units
          {presses > 0 ? ` · ≈${Math.round(log.length / presses)}× each` : ''}
        </span>
      </div>
    </WidgetFrame>
  )
}
