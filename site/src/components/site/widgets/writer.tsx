'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/16/solid'

// Chapter 2 flagship: feel the Ground as a monoid. Regrouping a run of
// interactions leaves the composed ground identical (associativity); reordering
// it does not (no commutativity). Both are shown as live verdicts.

type Token = { id: number; label: string }

const PALETTE = ['open', 'write', 'read', 'close']

let nextId = 1

function fold(tokens: Token[]): string {
  return tokens.length === 0 ? 'ε' : tokens.map((t) => t.label).join(' ∙ ')
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white px-2 py-1 font-mono text-sm text-zinc-800 ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10">
      {label}
    </span>
  )
}

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm/6',
        ok
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
      )}
    >
      {ok ? <CheckCircleIcon className="size-4 shrink-0" /> : <XCircleIcon className="size-4 shrink-0" />}
      {children}
    </div>
  )
}

export function WriterWidget() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: nextId++, label: 'open' },
    { id: nextId++, label: 'write' },
    { id: nextId++, label: 'close' },
  ])
  // Bracket split position for the associativity panel (0..len).
  const [split, setSplit] = useState(1)

  const groundFlat = useMemo(() => fold(tokens), [tokens])

  const left = tokens.slice(0, split)
  const right = tokens.slice(split)
  const bracketed =
    tokens.length < 2
      ? groundFlat
      : `(${fold(left)}) ∙ (${fold(right)})`

  function add(label: string) {
    setTokens((t) => [...t, { id: nextId++, label }])
  }
  function remove(id: number) {
    setTokens((t) => t.filter((x) => x.id !== id))
  }
  function swap(i: number) {
    setTokens((t) => {
      if (i < 0 || i + 1 >= t.length) return t
      const copy = [...t]
      ;[copy[i], copy[i + 1]] = [copy[i + 1], copy[i]]
      return copy
    })
  }

  const clampedSplit = Math.min(split, Math.max(1, tokens.length - 1))
  const reordered = useMemo(() => fold(tokens), [tokens]) // recomputed on swap

  return (
    <div className="space-y-6">
      {/* Build the sequence */}
      <div>
        <p className="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
          Build a run of interactions
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PALETTE.map((label) => (
            <button
              key={label}
              onClick={() => add(label)}
              className="rounded-md bg-reflex-500/10 px-2.5 py-1 font-mono text-sm text-reflex-600 ring-1 ring-reflex-500/20 hover:bg-reflex-500/20 dark:text-reflex-500"
            >
              + {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tokens.length === 0 && (
            <span className="font-mono text-sm text-zinc-400">ε (empty ground)</span>
          )}
          {tokens.map((t, i) => (
            <span key={t.id} className="inline-flex items-center gap-1">
              {i > 0 && <span className="px-0.5 text-zinc-400">∙</span>}
              <span className="group inline-flex items-center gap-1">
                <Chip label={t.label} />
                <button
                  onClick={() => remove(t.id)}
                  className="text-xs text-zinc-400 hover:text-rose-500"
                  aria-label={`remove ${t.label}`}
                >
                  ✕
                </button>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Associativity: regroup freely */}
      <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
        <p className="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
          Regroup freely — move the bracket
        </p>
        <input
          type="range"
          min={1}
          max={Math.max(1, tokens.length - 1)}
          value={clampedSplit}
          onChange={(e) => setSplit(Number(e.target.value))}
          disabled={tokens.length < 2}
          className="mt-3 w-full accent-reflex-500"
        />
        <p className="mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200">{bracketed}</p>
        <p className="mt-1 font-mono text-xs text-zinc-500">flattens to {groundFlat}</p>
        <Verdict ok>Same composed ground, wherever the bracket sits. Associativity holds.</Verdict>
      </div>

      {/* Non-commutativity: reordering changes the meaning */}
      <div className="rounded-lg border border-zinc-950/5 p-4 dark:border-white/10">
        <p className="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
          Reorder — swap two neighbours
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tokens.slice(0, -1).map((t, i) => (
            <button
              key={t.id}
              onClick={() => swap(i)}
              className="rounded-md px-2 py-1 font-mono text-xs text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
            >
              {tokens[i].label} ⇄ {tokens[i + 1].label}
            </button>
          ))}
          {tokens.length < 2 && <span className="text-sm text-zinc-400">add two to swap</span>}
        </div>
        <p className="mt-3 font-mono text-sm text-zinc-800 dark:text-zinc-200">{reordered}</p>
        <Verdict ok={false}>
          Swapping neighbours rewrites the ground. Order is part of what happened — no commutativity.
        </Verdict>
      </div>
    </div>
  )
}
