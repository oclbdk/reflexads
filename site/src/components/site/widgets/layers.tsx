'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowPathIcon, BoltIcon } from '@heroicons/react/16/solid'

// Home centerpiece: three layers of interaction at their own rates —
// conditions (coarse, slow), operations (prompts/calls/edits, mixing code,
// prose, and data), instructions (the fast raw stream). Operations compile
// DOWN into instruction ticks and accrue UP toward the conditions; shift a
// condition and every earlier operation beneath it goes stale — the
// cross-layer, cross-domain feedback that makes these workflows hard to reason about.

type Domain = 'prose' | 'code' | 'data'
type Op = { id: number; domain: Domain; label: string; rev: number }

const LABELS: Record<Domain, string[]> = {
  prose: ['prompt: summarize', 'prompt: classify', 'prompt: draft reply'],
  code: ['call search()', 'invoke tool', 'call fetch()'],
  data: ['edit config', 'write record', 'update index'],
}

const DOMAIN_STYLE: Record<Domain, string> = {
  prose: 'bg-violet-100 text-violet-800 ring-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200',
  code: 'bg-sky-100 text-sky-800 ring-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200',
  data: 'bg-emerald-100 text-emerald-800 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200',
}

const DOMAIN_DOT: Record<Domain, string> = {
  prose: 'bg-violet-500',
  code: 'bg-sky-500',
  data: 'bg-emerald-500',
}

let nextId = 1

function LaneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-24 shrink-0 pr-3 text-right text-xs/5 font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
      {children}
    </div>
  )
}

export function LayersWidget() {
  const [ops, setOps] = useState<Op[]>([
    { id: nextId++, domain: 'prose', label: 'prompt: summarize', rev: 2 },
    { id: nextId++, domain: 'code', label: 'call search()', rev: 2 },
    { id: nextId++, domain: 'data', label: 'edit config', rev: 2 },
  ])
  const [rev, setRev] = useState(2) // schema revision — the shifting requirement
  const [ticks, setTicks] = useState<number[]>(() => Array.from({ length: 18 }, (_, i) => i))
  const [load, setLoad] = useState(3)
  const [staleShown, setStaleShown] = useState(false)

  const staleCount = useMemo(() => ops.filter((o) => o.rev < rev).length, [ops, rev])
  const budgetTight = load >= 8

  function issue(domain: Domain) {
    const seq = LABELS[domain]
    const label = seq[ops.filter((o) => o.domain === domain).length % seq.length]
    setOps((o) => [...o, { id: nextId++, domain, label, rev }])
    // compiles down into a burst of instructions
    const burst = 4 + ((nextId * 7) % 4)
    setTicks((t) => [...t, ...Array.from({ length: burst }, (_, i) => t.length + i)])
    // accrues up toward the conditions
    setLoad((l) => l + 1)
  }

  function shift() {
    setRev((r) => r + 1) // every earlier operation now predates the requirement
  }

  function reset() {
    setOps([])
    setRev(2)
    setTicks(Array.from({ length: 18 }, (_, i) => i))
    setLoad(0)
    setStaleShown(false)
  }

  const visibleOps = ops.slice(-8)
  const visibleTicks = ticks.slice(-34)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {(['prose', 'code', 'data'] as Domain[]).map((d) => (
          <button
            key={d}
            onClick={() => issue(d)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm ring-1',
              DOMAIN_STYLE[d],
              'hover:brightness-95',
            )}
          >
            <span className={clsx('size-1.5 rounded-full', DOMAIN_DOT[d])} />+{' '}
            {d === 'prose' ? 'prompt' : d === 'code' ? 'call' : 'data edit'}
          </button>
        ))}
        <button
          onClick={() => {
            shift()
            setStaleShown(true)
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-sm text-amber-800 ring-1 ring-amber-500/30 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200"
        >
          <BoltIcon className="size-3.5" /> shift a requirement
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-500 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-3.5" />
        </button>
      </div>

      {/* Lanes */}
      <div className="space-y-2 rounded-lg border border-zinc-950/5 p-3 dark:border-white/10">
        {/* Conditions */}
        <div className="flex items-center">
          <LaneLabel>conditions</LaneLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            <Condition label="auth: on" />
            <Condition label={budgetTight ? 'budget: tight' : 'budget: ok'} warn={budgetTight} />
            <Condition label={`schema v${rev}`} accent />
          </div>
        </div>

        <div className="flex items-center pl-24 text-[0.65rem] text-zinc-400">
          <span>↑ operations accrue up</span>
          <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
          <span>a shift ripples down ↓</span>
        </div>

        {/* Operations */}
        <div className="flex items-center">
          <LaneLabel>operations</LaneLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleOps.length === 0 && <span className="font-mono text-xs text-zinc-400">—</span>}
            {visibleOps.map((o) => {
              const stale = o.rev < rev
              return (
                <span
                  key={o.id}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs ring-1',
                    stale
                      ? 'border border-dashed border-amber-500/60 bg-transparent text-zinc-400 line-through ring-transparent'
                      : DOMAIN_STYLE[o.domain],
                  )}
                >
                  {o.label}
                  {stale && <span className="text-[0.6rem] text-amber-600 no-underline dark:text-amber-400">stale</span>}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex items-center pl-24 text-[0.65rem] text-zinc-400">
          <span>↓ each operation compiles to instructions</span>
        </div>

        {/* Instructions */}
        <div className="flex items-center">
          <LaneLabel>instructions</LaneLabel>
          <div className="flex h-6 items-end gap-[2px] overflow-hidden">
            {visibleTicks.map((n) => (
              <span
                key={n}
                className="w-[3px] shrink-0 rounded-sm bg-zinc-300 dark:bg-white/20"
                style={{ height: 5 + ((n * 37) % 12) }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Verdict */}
      {staleShown && staleCount > 0 ? (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm/6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          A requirement moved, and {staleCount} operation{staleCount === 1 ? '' : 's'} you already
          issued now mean something different. Nothing re-ran — the meaning shifted underneath them.
          That is the loop that is hard to reason about.
        </div>
      ) : (
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm/6 text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
          Issue operations across code, prose, and data — each compiles down and accrues up. Then
          shift a requirement and watch what your earlier operations become.
        </div>
      )}
    </div>
  )
}

function Condition({ label, accent, warn }: { label: string; accent?: boolean; warn?: boolean }) {
  return (
    <span
      className={clsx(
        'rounded-md px-2 py-1 font-mono text-xs ring-1',
        warn
          ? 'bg-amber-100 text-amber-800 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200'
          : accent
            ? 'bg-reflex-500/10 text-reflex-600 ring-reflex-500/25 dark:text-reflex-500'
            : 'bg-white text-zinc-600 ring-zinc-950/10 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10',
      )}
    >
      {label}
    </span>
  )
}
