'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import gitData from '@/generated/git.json'
import { inflections } from '@/data/inflections'
import { DemoFrame } from '../demo-frame'
import { Unit } from '../prose'

// Chapter 2's hook: the primal reflex, git log — on the real record. Every
// unit is an actual revision of the repo that builds this site: sized by
// churn (log scale — the towers are real), colored by strata fingerprint,
// two hands on every one. Press a unit to sample its span. The inflections
// overlay carries the curated annotations from src/data/inflections.ts — a
// landed consolidation whose own commit appears in this timeline.

type FileRow = { path: string; adds: number; dels: number; stratum: string }
type Commit = {
  hash: string
  full: string
  author: string
  date: string
  subject: string
  coAuthors: string[]
  strata: { code: number; prose: number; data: number }
  churn: number
  files: FileRow[]
  moreFiles: number
}

const COMMITS = gitData.commits as Commit[]
const BUILT_FROM = gitData.builtFrom as string | null

const STRATUM_BAR: Record<string, string> = {
  code: 'bg-amber-500/80',
  prose: 'bg-violet-500/80',
  data: 'bg-sky-500/80',
}
const STRATUM_TEXT: Record<string, string> = {
  code: 'text-amber-700 dark:text-amber-400',
  prose: 'text-violet-700 dark:text-violet-400',
  data: 'text-sky-700 dark:text-sky-400',
}

const BAR_MAX = 112 // px, for the largest span

function barHeight(churn: number, max: number) {
  if (churn <= 0) return 3
  return Math.max(3, Math.round((Math.log1p(churn) / Math.log1p(max)) * BAR_MAX))
}

// The model-instance eras, derived from the co-author trailers: a change in
// the m-hand is part of the record, so the band under the timeline shows it.
function instanceOf(c: Commit): string {
  return c.coAuthors[0] ?? '(none)'
}

export function RepoRecordDemo() {
  const [revealed, setRevealed] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showInflections, setShowInflections] = useState(false)

  // Units appear oldest to newest: the record is a sequence, shown as one.
  useEffect(() => {
    if (revealed >= COMMITS.length) return
    const t = setInterval(() => setRevealed((n) => Math.min(n + 1, COMMITS.length)), 55)
    return () => clearInterval(t)
  }, [revealed])

  if (COMMITS.length === 0) {
    return (
      <DemoFrame
        title="The record"
        hint="This demo runs on the repo's real revision history, which this build could not read (shallow clone or no git). Build from a full checkout to see it."
      >
        <div className="py-10 text-center font-mono text-sm text-zinc-400 dark:text-zinc-500">
          no history available in this build
        </div>
      </DemoFrame>
    )
  }

  const maxChurn = Math.max(...COMMITS.map((c) => c.churn))
  const anchors = new Set(inflections.map((i) => i.hash))
  const sel = COMMITS.find((c) => c.hash === selected) ?? null
  const selInflection = sel ? inflections.find((i) => i.hash === sel.hash) : null
  const instances = [...new Set(COMMITS.map(instanceOf))]

  return (
    <DemoFrame
      title="The record"
      hint={
        <>
          <span className="block">
            Nothing here is mocked. Every unit is a revision of the repository that builds this
            site, extracted at build time; by the time you read this, the record will have grown.
            Height is churn (log scale), the colors are each span&rsquo;s strata fingerprint
            (<Unit kind="code" /> · <Unit kind="prose" /> · <Unit kind="data" />), and every unit
            carries two hands: the engineer&rsquo;s, and a model&rsquo;s, named in the trailer.
            The band underneath tracks which model instance — the record kept the changeover.
          </span>
          <span className="mt-2 block">
            The towers are findable by arithmetic. The inflections are not all towers: toggle the
            overlay and press unit ④ — statistically invisible, and the hinge the rest of this
            project turns on. Churn finds some inflection points; judgment marks the others. Those
            annotations are themselves an extraction from this record, consolidated and committed
            back with their source span cited — and the commit that landed them appears in this
            timeline.
          </span>
          <span className="mt-2 block">
            The ringed unit is where this page came from: the deployment you&rsquo;re reading is a
            fold of the record up to that revision.
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* timeline */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-fit">
            <div className="flex items-end gap-[3px]" style={{ height: BAR_MAX + 18 }}>
              {COMMITS.map((c, i) => {
                const h = barHeight(c.churn, maxChurn)
                const isBuilt = BUILT_FROM !== null && c.hash === BUILT_FROM
                const isAnchor = anchors.has(c.hash)
                const anchorIdx = inflections.findIndex((f) => f.hash === c.hash)
                const dimmed = showInflections && !isAnchor
                const total = Math.max(1, c.churn)
                return (
                  <button
                    key={c.hash}
                    onClick={() => setSelected(c.hash === selected ? null : c.hash)}
                    aria-label={`${c.hash} ${c.subject}`}
                    title={`${c.hash} · ${c.subject}`}
                    className={clsx(
                      'group relative flex w-[18px] shrink-0 flex-col justify-end self-end rounded-sm transition-opacity sm:w-[22px]',
                      i >= revealed && 'invisible',
                      dimmed && 'opacity-30',
                    )}
                    style={{ height: BAR_MAX + 18 }}
                  >
                    {showInflections && isAnchor && (
                      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 font-mono text-[10px] font-semibold text-reflex-600 dark:text-reflex-500">
                        {['①', '②', '③', '④'][anchorIdx] ?? '•'}
                      </span>
                    )}
                    <span
                      className={clsx(
                        'flex w-full flex-col overflow-hidden rounded-sm ring-offset-1',
                        selected === c.hash && 'ring-2 ring-zinc-500 dark:ring-zinc-300',
                        isBuilt && selected !== c.hash && 'ring-2 ring-reflex-500',
                        'group-hover:ring-2 group-hover:ring-zinc-400',
                      )}
                      style={{ height: h }}
                    >
                      {(['code', 'prose', 'data'] as const)
                        .filter((s) => c.strata[s] > 0)
                        .map((s) => (
                          <span
                            key={s}
                            className={clsx('w-full', STRATUM_BAR[s])}
                            style={{ height: `${Math.max(8, (c.strata[s] / total) * 100)}%` }}
                          />
                        ))}
                      {c.churn === 0 && <span className="h-full w-full bg-zinc-300 dark:bg-zinc-600" />}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* instance band: which m-hand, per unit */}
            <div className="mt-[3px] flex gap-[3px]">
              {COMMITS.map((c, i) => (
                <span
                  key={c.hash}
                  className={clsx(
                    'h-[3px] w-[18px] shrink-0 rounded-full sm:w-[22px]',
                    i >= revealed && 'invisible',
                    instances.indexOf(instanceOf(c)) === 0 ? 'bg-violet-300 dark:bg-violet-800' : 'bg-violet-600 dark:bg-violet-400',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* controls + status */}
        <div className="flex flex-wrap items-center gap-2" data-you-skip>
          <button
            onClick={() => setShowInflections((v) => !v)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ring-1 transition-colors',
              showInflections
                ? 'bg-reflex-500/10 text-reflex-700 ring-reflex-500/30 dark:text-reflex-500'
                : 'text-zinc-600 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            Inflections
          </button>
          <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {COMMITS.length} revisions · two hands on every one
            {BUILT_FROM ? <> · built from <span className="text-reflex-600 dark:text-reflex-500">{BUILT_FROM}</span></> : null}
          </span>
        </div>

        {/* sample panel */}
        {sel ? (
          <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{sel.hash}</span>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{sel.subject}</span>
              <span className="ml-auto font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                {sel.date.slice(0, 10)}
              </span>
            </div>
            {selInflection && (
              <div className="mt-2 rounded-md bg-reflex-500/5 px-2.5 py-1.5 text-xs/5 text-zinc-600 ring-1 ring-reflex-500/20 dark:text-zinc-300">
                <span className="font-semibold text-reflex-700 dark:text-reflex-500">
                  {selInflection.title}.
                </span>{' '}
                {selInflection.why}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                hands: <span className="text-teal-700 dark:text-teal-400">e· {sel.author}</span>
                {sel.coAuthors.map((a) => (
                  <span key={a}>
                    {' '}+ <span className="text-violet-700 dark:text-violet-400">m· {a}</span>
                  </span>
                ))}
              </span>
              <span>
                {(['code', 'prose', 'data'] as const).map((s, i) => (
                  <span key={s}>
                    {i > 0 && ' · '}
                    <span className={STRATUM_TEXT[s]}>{s} {sel.strata[s]}</span>
                  </span>
                ))}
              </span>
              <span>churn {sel.churn}</span>
            </div>
            <ol className="mt-2 font-mono text-[10px]/4 text-zinc-500 dark:text-zinc-400">
              {sel.files.map((f) => (
                <li key={f.path} className="flex items-baseline gap-1.5 truncate">
                  <span className={clsx('inline-block size-1.5 shrink-0 translate-y-[-1px] rounded-full', STRATUM_BAR[f.stratum])} />
                  <span className="truncate">{f.path}</span>
                  <span className="shrink-0 text-zinc-300 dark:text-zinc-600">
                    +{f.adds} −{f.dels}
                  </span>
                </li>
              ))}
              {sel.moreFiles > 0 && (
                <li className="text-zinc-300 dark:text-zinc-600">… +{sel.moreFiles} more files</li>
              )}
            </ol>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-2.5 text-center font-mono text-[11px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            press a unit to sample its span
          </div>
        )}
      </div>
    </DemoFrame>
  )
}
