'use client'

import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { clsx } from 'clsx'

// Chapter 5 flagship: the same write stream into two grounds. Modeled as state
// (a set) it self-selects — replaying a write is a no-op. Modeled as history
// (a counted log) the replay double-counts. Idempotence forgets multiplicity.

const PALETTE = ['x', 'y', 'z']

export function StateHistoryWidget() {
  const [log, setLog] = useState<string[]>(['x', 'y'])

  const stateSet = Array.from(new Set(log)).sort()
  const counts = log.reduce<Record<string, number>>((acc, w) => {
    acc[w] = (acc[w] ?? 0) + 1
    return acc
  }, {})
  const last = log[log.length - 1]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((w) => (
          <button
            key={w}
            onClick={() => setLog((l) => [...l, w])}
            className="rounded-md bg-reflex-500/10 px-2.5 py-1 font-mono text-sm text-reflex-600 ring-1 ring-reflex-500/20 hover:bg-reflex-500/20 dark:text-reflex-500"
          >
            write {w}
          </button>
        ))}
        <button
          onClick={() => last && setLog((l) => [...l, last])}
          disabled={!last}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm text-zinc-700 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-3.5" /> replay {last ?? ''}
        </button>
        <button
          onClick={() => setLog([])}
          className="ml-auto rounded-md px-2.5 py-1 text-sm text-zinc-500 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/5"
        >
          clear
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* State */}
        <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
          <p className="text-sm/6 font-semibold text-zinc-700 dark:text-zinc-300">State — a set</p>
          <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Self-selects: replay is a no-op.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stateSet.length === 0 && <span className="font-mono text-sm text-zinc-400">∅</span>}
            {stateSet.map((w) => (
              <span
                key={w}
                className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-sm text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {w}
              </span>
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-zinc-500">{`{ ${stateSet.join(', ')} }`}</p>
        </div>

        {/* History */}
        <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
          <p className="text-sm/6 font-semibold text-zinc-700 dark:text-zinc-300">History — a counted log</p>
          <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Counts: replay increments the tally.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(counts).length === 0 && <span className="font-mono text-sm text-zinc-400">—</span>}
            {Object.entries(counts).map(([w, n]) => (
              <span
                key={w}
                className={clsx(
                  'rounded-md px-2 py-0.5 font-mono text-sm ring-1',
                  n > 1
                    ? 'bg-amber-50 text-amber-800 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'bg-white text-zinc-700 ring-zinc-950/10 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-white/10',
                )}
              >
                {w}×{n}
              </span>
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-zinc-500">[ {log.join(', ')} ]</p>
        </div>
      </div>

      <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">
        Ask whether your domain needs to <span className="font-mono">count</span>. If it only needs
        what is currently the case, the set is enough and replays are free. If the tally carries
        meaning, you must keep the log — and the self-properties are not yours.
      </p>
    </div>
  )
}
