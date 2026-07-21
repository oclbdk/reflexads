'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ArrowPathIcon, CheckCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/16/solid'

// Chapter 4 flagship (also the home teaser): one-step idempotence. Consulting an
// idempotent ground settles flat after a single step and never moves again;
// consulting one that compounds climbs a level every time. Same action, two grounds.

type Ground = 'idempotent' | 'compounds'

const PAYLOAD = ['a', 'b']

export function SettleWidget() {
  const [ground, setGround] = useState<Ground>('idempotent')
  const [items, setItems] = useState<string[]>([])
  const [presses, setPresses] = useState(0)

  function consult() {
    setPresses((p) => p + 1)
    setItems((cur) =>
      ground === 'idempotent'
        ? Array.from(new Set([...cur, ...PAYLOAD])).sort() // union — safe to repeat
        : [...cur, ...PAYLOAD], // append — compounds
    )
  }

  function reset(next: Ground = ground) {
    setGround(next)
    setItems([])
    setPresses(0)
  }

  const size = items.length
  // Settled once an idempotent ground has been consulted at least once.
  const settled = ground === 'idempotent' && presses >= 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['idempotent', 'compounds'] as Ground[]).map((g) => (
          <button
            key={g}
            onClick={() => reset(g)}
            className={clsx(
              'rounded-md px-3 py-1 text-sm ring-1',
              ground === g
                ? 'bg-reflex-500/15 text-reflex-600 ring-reflex-500/30 dark:text-reflex-500'
                : 'text-zinc-600 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            {g === 'idempotent' ? 'Idempotent — set union' : 'Compounds — list append'}
          </button>
        ))}
      </div>

      {/* Level meter */}
      <div>
        <div className="flex items-end gap-1" style={{ minHeight: '3rem' }}>
          {items.length === 0 && (
            <span className="self-center font-mono text-sm text-zinc-400">flat — nothing consulted yet</span>
          )}
          {items.map((it, i) => (
            <span
              key={i}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded font-mono text-sm',
                ground === 'idempotent'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
              )}
            >
              {it}
            </span>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          ground = {size === 0 ? 'ε' : items.join(' ∙ ')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={consult}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Consult the context
        </button>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          consulted {presses}× · size {size}
        </span>
      </div>

      {settled ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm/6 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircleIcon className="size-4 shrink-0" />
          Settled flat after the first step. Consult it again and nothing moves — safe to repeat.
        </div>
      ) : ground === 'compounds' && presses > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm/6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <ArrowTrendingUpIcon className="size-4 shrink-0" />
          Every consult adds another level. No flat form to land on — re-reading is not free.
        </div>
      ) : (
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm/6 text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
          Consult the context a few times and watch whether it settles or climbs.
        </div>
      )}
    </div>
  )
}
