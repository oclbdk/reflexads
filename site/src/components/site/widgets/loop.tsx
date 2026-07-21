'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'

// Chapter 1 flagship: a context that nests inside itself. Flattening winds a
// grounded self-reference down to a bare value in finite steps; an ungrounded
// one has no floor, so every flatten just uncovers another layer — the spiral.

type Mode = 'grounded' | 'ungrounded'

const START = 3

export function LoopWidget() {
  const [mode, setMode] = useState<Mode>('grounded')
  const [depth, setDepth] = useState(START)
  const [steps, setSteps] = useState(0)

  const settled = mode === 'grounded' && depth === 0

  function flatten() {
    setSteps((s) => s + 1)
    if (mode === 'grounded') {
      setDepth((d) => Math.max(0, d - 1))
    }
    // ungrounded: removing a layer uncovers another — depth never falls
  }

  function reset(next: Mode = mode) {
    setMode(next)
    setDepth(START)
    setSteps(0)
  }

  // Render the nesting as concentric frames, innermost last.
  const layers = Array.from({ length: Math.max(depth, 0) })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['grounded', 'ungrounded'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => reset(m)}
            className={clsx(
              'rounded-md px-3 py-1 text-sm ring-1',
              mode === m
                ? 'bg-reflex-500/15 text-reflex-600 ring-reflex-500/30 dark:text-reflex-500'
                : 'text-zinc-600 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            {m === 'grounded' ? 'Grounded (has a base value)' : 'Ungrounded (no base)'}
          </button>
        ))}
      </div>

      {/* The tower */}
      <div className="flex justify-center py-2">
        <div className="w-full max-w-sm">
          {layers.reduceRight<React.ReactNode>((inner, _, i) => {
            const isOutermost = i === 0
            return (
              <div
                key={i}
                className={clsx(
                  'rounded-lg border p-3',
                  'border-zinc-300 bg-zinc-50/60 dark:border-white/15 dark:bg-white/5',
                  !isOutermost && 'mt-0',
                )}
              >
                <div className="mb-2 font-mono text-xs text-zinc-400">context</div>
                {inner}
              </div>
            )
          }, /* core */ mode === 'grounded' ? (
            <div className="rounded-md bg-emerald-100 px-3 py-2 text-center font-mono text-sm text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              value
            </div>
          ) : (
            <div className="rounded-md bg-rose-100 px-3 py-2 text-center font-mono text-sm text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
              loops back to the top ↑
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={flatten}
          disabled={settled}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Flatten a layer
        </button>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {steps} step{steps === 1 ? '' : 's'} · depth {depth}
        </span>
      </div>

      {/* Verdict */}
      {settled ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm/6 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircleIcon className="size-4 shrink-0" />
          Wound down to a bare value in {steps} steps. The self-reference held itself up.
        </div>
      ) : mode === 'ungrounded' && steps > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm/6 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          {steps} flattens and still no value — every layer removed uncovers another. No floor: it spins.
        </div>
      ) : (
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm/6 text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
          Flatten the nesting and see whether it reaches a value or never bottoms out.
        </div>
      )}
    </div>
  )
}
