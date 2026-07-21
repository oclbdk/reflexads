'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ForwardIcon } from '@heroicons/react/16/solid'

// Chapter 7 flagship: the loop runs as a linear stream, and a human never reads
// the whole thing — only a window of it, legible for a span. Slide the window to
// read a stretch; let the machine run on and a held window's content flows away.

const OPS = ['read ctx', 'predict', 'call tool', 'merge', 'explain', 'commit']
const LEN = 14
const WIDTH = 4

export function WindowsWidget() {
  const [start, setStart] = useState(5)
  const [tick, setTick] = useState(0)

  const maxStart = LEN - WIDTH
  const winStart = Math.min(start, maxStart)

  return (
    <div className="space-y-5">
      <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">
        The self-referential loop compiles to one ordered stream. You cannot watch the loop; you
        read the stream, and only ever a window of it at once.
      </p>

      {/* The stream */}
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {Array.from({ length: LEN }).map((_, i) => {
            const inWindow = i >= winStart && i < winStart + WIDTH
            const op = OPS[(i + tick) % OPS.length]
            return (
              <div
                key={i}
                className={clsx(
                  'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md text-center',
                  inWindow
                    ? 'bg-sky-50 ring-1 ring-sky-500/30 dark:bg-sky-500/10'
                    : 'bg-zinc-100 dark:bg-white/5',
                )}
              >
                <span className="font-mono text-[0.65rem] text-zinc-400 tabular-nums">{i}</span>
                {inWindow ? (
                  <span className="mt-1 px-1 text-[0.7rem]/tight font-medium text-sky-800 dark:text-sky-200">
                    {op}
                  </span>
                ) : (
                  <span className="mt-2 h-1.5 w-6 rounded-full bg-zinc-300 dark:bg-white/15" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-1 items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="shrink-0">Window</span>
          <input
            type="range"
            min={0}
            max={maxStart}
            value={winStart}
            onChange={(e) => setStart(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
        </label>
        <button
          onClick={() => setTick((t) => t + 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <ForwardIcon className="size-4" /> Machine runs on
        </button>
      </div>

      <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">
        Slide the window and coherence forms where you look, closing behind you. Let the machine run
        on and a window you were holding fills with new operations — the two presents passing each
        other. Time is in the sequence, not the loop.
      </p>
    </div>
  )
}
