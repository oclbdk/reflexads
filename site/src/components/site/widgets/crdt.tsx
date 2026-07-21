'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowLongLeftIcon, ArrowLongRightIcon, CheckCircleIcon } from '@heroicons/react/16/solid'

// Chapter 6 flagship: a grow-only set as a self-buffer. copy = replicate a
// state; merge = reconcile by union. merge ∘ copy = id (re-delivering a message
// is a no-op), and gossip drives both replicas onto the same converged ground.

const PALETTE = ['a', 'b', 'c', 'd']

type Replica = 'A' | 'B'

function union(x: string[], y: string[]): string[] {
  return Array.from(new Set([...x, ...y])).sort()
}

function SetChips({ items, tone }: { items: string[]; tone: string }) {
  return (
    <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
      {items.length === 0 && <span className="font-mono text-sm text-zinc-400">∅</span>}
      {items.map((it) => (
        <span
          key={it}
          className={clsx('rounded-md px-2 py-0.5 font-mono text-sm ring-1', tone)}
        >
          {it}
        </span>
      ))}
    </div>
  )
}

export function CrdtWidget() {
  const [a, setA] = useState<string[]>(['a'])
  const [b, setB] = useState<string[]>(['c'])
  const [flash, setFlash] = useState<string | null>(null)

  const converged = useMemo(
    () => a.length === b.length && a.every((x, i) => x === b[i]),
    [a, b],
  )

  function addTo(r: Replica, el: string) {
    if (r === 'A') setA((s) => union(s, [el]))
    else setB((s) => union(s, [el]))
  }

  function gossip(from: Replica) {
    // copy the sender's state, merge it into the receiver by union
    if (from === 'A') setB((s) => union(s, a))
    else setA((s) => union(s, b))
  }

  function redeliver(into: Replica) {
    // merge a replica with a copy of itself: merge ∘ copy = id
    const before = into === 'A' ? a : b
    if (into === 'A') setA((s) => union(s, s))
    else setB((s) => union(s, s))
    setFlash(`merge(${into}, copy(${into})) = ${into} — unchanged`)
    // clear the flash after the render tick via state, no timers needed for correctness
    void before
  }

  const toneA = 'bg-sky-50 text-sky-800 ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
  const toneB = 'bg-violet-50 text-violet-800 ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300'

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(['A', 'B'] as Replica[]).map((r) => (
          <div key={r} className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm/6 font-semibold text-zinc-700 dark:text-zinc-300">
                Replica {r}
              </span>
              <button
                onClick={() => redeliver(r)}
                className="rounded-md px-2 py-0.5 text-xs text-zinc-500 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/5"
              >
                re-deliver to self
              </button>
            </div>
            <SetChips items={r === 'A' ? a : b} tone={r === 'A' ? toneA : toneB} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PALETTE.map((el) => (
                <button
                  key={el}
                  onClick={() => {
                    addTo(r, el)
                    setFlash(null)
                  }}
                  className="rounded-md bg-reflex-500/10 px-2 py-0.5 font-mono text-xs text-reflex-600 ring-1 ring-reflex-500/20 hover:bg-reflex-500/20 dark:text-reflex-500"
                >
                  + {el}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Gossip */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            gossip('B')
            setFlash(null)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <ArrowLongLeftIcon className="size-4" /> send B→A
        </button>
        <button
          onClick={() => {
            gossip('A')
            setFlash(null)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          send A→B <ArrowLongRightIcon className="size-4" />
        </button>
      </div>

      {/* Status */}
      <div
        className={clsx(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm/6',
          converged
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
        )}
      >
        {converged ? (
          <>
            <CheckCircleIcon className="size-4 shrink-0" />
            Converged — both replicas hold the same ground {`{ ${a.join(', ')} }`}.
          </>
        ) : (
          <>Divergent — gossip in either direction to reconcile. Order and duplicates are safe.</>
        )}
      </div>

      {flash && (
        <p className="text-center font-mono text-xs text-emerald-700 dark:text-emerald-400">{flash}</p>
      )}
    </div>
  )
}
