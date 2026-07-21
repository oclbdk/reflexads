'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

// Chapter 3 flagship: one ground, two faces. The owning face writes the whole
// history; the hosting face reads it from a position. Move the reader and the
// ground does not change — they share it without one reaching across to the other.

type Token = { id: number; label: string }
const PALETTE = ['open', 'write', 'read', 'close']
let nextId = 1

export function GroundWidget() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: nextId++, label: 'open' },
    { id: nextId++, label: 'write' },
    { id: nextId++, label: 'close' },
  ])
  const [pos, setPos] = useState(1)

  const cursor = Math.min(pos, Math.max(0, tokens.length - 1))
  const owned = tokens.length === 0 ? 'ε' : tokens.map((t) => t.label).join(' ∙ ')
  const here = tokens[cursor]?.label ?? 'ε'

  return (
    <div className="space-y-6">
      {/* Build the ground */}
      <div>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((label) => (
            <button
              key={label}
              onClick={() => setTokens((t) => [...t, { id: nextId++, label }])}
              className="rounded-md bg-reflex-500/10 px-2.5 py-1 font-mono text-sm text-reflex-600 ring-1 ring-reflex-500/20 hover:bg-reflex-500/20 dark:text-reflex-500"
            >
              + {label}
            </button>
          ))}
          {tokens.length > 0 && (
            <button
              onClick={() => setTokens((t) => t.slice(0, -1))}
              className="ml-auto rounded-md px-2 py-1 text-sm text-zinc-500 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/5"
            >
              remove last
            </button>
          )}
        </div>

        {/* The one ground: chips, click to place the reader */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {tokens.map((t, i) => (
            <span key={t.id} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">∙</span>}
              <button
                onClick={() => setPos(i)}
                className={clsx(
                  'rounded-md px-2 py-1 font-mono text-sm ring-1',
                  i === cursor
                    ? 'bg-sky-100 text-sky-800 ring-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200'
                    : 'bg-white text-zinc-700 ring-zinc-950/10 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-white/10',
                )}
              >
                {t.label}
              </button>
            </span>
          ))}
          {tokens.length === 0 && <span className="font-mono text-sm text-zinc-400">ε</span>}
        </div>
      </div>

      {/* Owning */}
      <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
        <p className="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
          Owning face — <span className="font-mono">own</span> then accumulate
        </p>
        <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">
          Writes the whole history, forward, step after step.
        </p>
        <p className="mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200">ground = {owned}</p>
      </div>

      {/* Hosting */}
      <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
        <p className="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
          Hosting face — <span className="font-mono">read</span> / <span className="font-mono">spread</span> from a position
        </p>
        <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">
          Provides the same ground, read from where the cursor sits (click a chip).
        </p>
        <p className="mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200">
          read = {here}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm text-zinc-500">spread =</span>
          {tokens.map((t, i) => (
            <span
              key={t.id}
              className={clsx(
                'rounded px-1.5 py-0.5 font-mono text-xs',
                i === cursor
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200'
                  : 'text-zinc-400',
              )}
            >
              {t.label}
              <span className="ml-0.5 text-[0.65rem] text-zinc-400">
                {i === cursor ? '·here' : i < cursor ? `−${cursor - i}` : `+${i - cursor}`}
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">
        Same ground, two faces. Moving the reader changes nothing about what was written — sharing a
        ground lets them meet, but the hosting is not yet made to hand back what the owning wrote.
      </p>
    </div>
  )
}
