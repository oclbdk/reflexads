'use client'

import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { DemoFrame } from '../demo-frame'

// Section 2.4, third demo: steering the steering. The difference between
// first- and second-order steering is a difference in LIFETIME. steer.md is
// a queue: staged, pulled, consumed exactly once. policy.md is a
// disposition: written rarely, never consumed, read by the LLM on EVERY
// drive. And each disposition here is CONDITIONED on a different memory
// rather than doing a constant thing: `fresh` (never repeat) reads the
// conversation — a memory that is not a file, wiped by New session while
// every file stands; `symmetric` (keep it symmetric) reads the canvas
// bytes — a condition stated once, maintained at every step by a repair
// computed from exactly what's there, the reader's doodles included. The
// meta-chips that write policy.md are grown by the loop like everything
// else; no new node, no new channel. Dispositions outlive the app (rm
// page.tsx kills every control, policy.md stands) — but a disposition is
// only as durable as the memory it reads.

const GRID = 8

type Stratum = 'code' | 'prose' | 'data'
type FileKey = 'page' | 'px' | 'steer' | 'policy'

const STRATUM_DOT: Record<Stratum, string> = {
  code: 'bg-amber-500/80',
  prose: 'bg-violet-500/80',
  data: 'bg-sky-500/80',
}
const FILE_META: { key: FileKey; name: string; stratum: Stratum }[] = [
  { key: 'page', name: 'page.tsx', stratum: 'code' },
  { key: 'px', name: 'sketch.px', stratum: 'data' },
  { key: 'steer', name: 'steer.md', stratum: 'prose' },
  { key: 'policy', name: 'policy.md', stratum: 'prose' },
]

// The repertoire, carried over.
type Face = 'smiley' | 'wink' | 'grin' | 'wow' | 'heart'
const EYES: [number, number][] = [[2, 2], [5, 2]]
const WINK_EYES: [number, number][] = [[2, 2], [4, 2], [5, 2]]
const SMILE: [number, number][] = [[1, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5]]
const OPEN: [number, number][] = [[3, 4], [4, 4], [2, 5], [5, 5], [3, 6], [4, 6]]
const GRIN: [number, number][] = [[2, 2], [5, 2], [1, 4], [6, 4], [2, 5], [5, 5], [3, 6], [4, 6]]
const HEART: [number, number][] = [
  [1, 1], [2, 1], [5, 1], [6, 1],
  [0, 2], [3, 2], [4, 2], [7, 2],
  [0, 3], [7, 3],
  [1, 4], [6, 4],
  [2, 5], [5, 5],
  [3, 6], [4, 6],
]
const FACE_PX: Record<Face, [number, number][]> = {
  smiley: [...EYES, ...SMILE],
  wink: [...WINK_EYES, ...SMILE],
  grin: GRIN,
  wow: [...EYES, ...OPEN],
  heart: HEART,
}
const FACE_CYCLE: Face[] = ['wink', 'grin', 'wow', 'heart', 'smiley']
const FACE_INTENT: Record<Face, string> = {
  smiley: 'back to the smiley',
  wink: 'wink it',
  grin: 'grin',
  wow: 'wow',
  heart: 'a heart',
}
const BORDER: [number, number][] = Array.from({ length: GRID }, (_, i) => i).flatMap((i) => [
  [i, 0], [i, 7], [0, i], [7, i] as [number, number],
])

const key = (x: number, y: number) => `${x},${y}`

// First-order steering: consumed requests (as in the previous demo).
const REQUESTS = ['toggle frame', 'surprise me'] as const
type Request = (typeof REQUESTS)[number]
const REQ_FEATURE: Record<Request, string> = {
  'toggle frame': 'req-frame',
  'surprise me': 'req-surprise',
}

// Second-order steering: persistent dispositions, each conditioned on a
// different memory. `fresh` reads the conversation (not a file); `symmetric`
// reads the canvas bytes (very much a file). Neither does a constant thing:
// what they do is computed from context on every drive.
const POLICIES = ['fresh', 'symmetric'] as const
type Policy = (typeof POLICIES)[number]
const POLICY_CHIP: Record<Policy, string> = { fresh: 'never repeat', symmetric: 'keep it symmetric' }
const POLICY_FEATURE: Record<Policy, string> = { fresh: 'pol-fresh', symmetric: 'pol-symmetric' }

type Files = {
  page: { present: boolean; mtime: string | null; features: string[] }
  px: { present: boolean; mtime: string | null; pixels: string[]; face: Face | null }
  steer: { present: boolean; mtime: string | null; requests: Request[] }
  policy: { present: boolean; mtime: string | null; flags: Policy[] }
}

const now = () => new Date().toLocaleTimeString([], { hour12: false })

// Picks up at the previous demo's end: both steering chips already grown.
const SEED: Files = {
  page: { present: true, mtime: 'earlier', features: ['status', 'req-frame', 'req-surprise'] },
  px: {
    present: true,
    mtime: 'earlier',
    pixels: FACE_PX.smiley.map(([x, y]) => key(x, y)),
    face: 'smiley',
  },
  steer: { present: false, mtime: null, requests: [] },
  policy: { present: false, mtime: null, flags: [] },
}

function viewOf(f: Files): { lit: Set<string>; missing: boolean } {
  return {
    lit: f.px.present ? new Set(f.px.pixels) : new Set(),
    missing: !f.page.present,
  }
}

const union = (pixels: string[], add: [number, number][]) => [
  ...new Set([...pixels, ...add.map(([x, y]) => key(x, y))]),
]
const minus = (pixels: string[], del: [number, number][]) => {
  const gone = new Set(del.map(([x, y]) => key(x, y)))
  return pixels.filter((p) => !gone.has(p))
}
const isFramed = (pixels: string[]) => BORDER.every(([x, y]) => pixels.includes(key(x, y)))

type Step = { file: FileKey; log: string; mutate: (f: Files) => Files }
type Plan = { intent: string; steps: Step[]; faces?: Face[] }

const write = (file: FileKey, log: string, mutate: (f: Files) => Files): Step => ({ file, log, mutate })
const writePx = (log: string, px: (p: Files['px']) => Partial<Files['px']>): Step =>
  write('px', log, (g) => ({ ...g, px: { ...g.px, present: true, mtime: now(), ...px(g.px) } }))

const consume: Step = write('steer', '✎ rm steer.md (consumed)', (g) => ({
  ...g,
  steer: { present: false, mtime: null, requests: [] },
}))

const setFace = (face: Face): Step =>
  writePx('✎ write sketch.px', (p) => ({
    pixels: union(p.face ? minus(p.pixels, FACE_PX[p.face]) : p.pixels, FACE_PX[face]),
    face,
  }))

const toggleFrameStep: Step = writePx('✎ write sketch.px', (p) => ({
  pixels: isFramed(p.pixels) ? minus(p.pixels, BORDER) : union(p.pixels, BORDER),
}))

// Symmetry across the vertical axis: the condition `symmetric` maintains.
const mirrorKey = (k: string) => {
  const [x, y] = k.split(',').map(Number)
  return key(GRID - 1 - x, y)
}
const isSymmetric = (pixels: string[]) => pixels.every((p) => pixels.includes(mirrorKey(p)))

// The invariant's hand: never staged, never consumed, appended by policy —
// and what it writes depends entirely on what the canvas holds.
const symmetrize: Step = writePx('✎ write sketch.px (policy: symmetric)', (p) => ({
  pixels: [...new Set([...p.pixels, ...p.pixels.map(mirrorKey)])],
}))

const addFeature = (k: string, intent: string): Plan => ({
  intent,
  steps: [
    write('page', '✎ write page.tsx', (g) => ({
      ...g,
      page: { ...g.page, present: true, mtime: now(), features: [...g.page.features, k] },
    })),
  ],
})

// The LLM reads requests once, policy every time — and each policy reads a
// different memory. `fresh` consults the message history (not a file):
// faces already drawn this session are avoided until the pool runs dry
// (then "(again)"). `symmetric` consults the canvas bytes: every plan is
// simulated against the filesystem, and if the result wouldn't mirror
// itself, a repair computed from exactly what's there — the reader's
// doodles included — is appended. The queue proposes, the dispositions
// dispose, and neither disposition does the same thing twice.
function decide(f: Files, seen: Face[]): Plan {
  const pol = f.policy.present ? f.policy.flags : []
  const pool = FACE_CYCLE

  const pickFace = (): { face: Face; again: boolean } => {
    const avoid = pol.includes('fresh') ? seen : []
    const unseen = pool.filter((fc) => fc !== f.px.face && !avoid.includes(fc))
    const options = unseen.length > 0 ? unseen : pool.filter((fc) => fc !== f.px.face)
    return {
      face: options[Math.floor(Math.random() * options.length)],
      again: pol.includes('fresh') && unseen.length === 0,
    }
  }

  const enforce = (plan: Plan): Plan => {
    if (!pol.includes('symmetric')) return plan
    const final = plan.steps.reduce((acc, s) => s.mutate(acc), f)
    if (!final.page.present || !final.px.present || final.px.pixels.length === 0) return plan
    if (isSymmetric(final.px.pixels)) return plan
    return { ...plan, steps: [...plan.steps, symmetrize] }
  }

  if (f.steer.present && f.steer.requests.length > 0) {
    const faces: Face[] = []
    let repeat = false
    const steps: Step[] = f.steer.requests.map((req) => {
      if (req === 'toggle frame') return toggleFrameStep
      const { face, again } = pickFace()
      faces.push(face)
      repeat = repeat || again
      return setFace(face)
    })
    return enforce({
      intent: `steer: ${f.steer.requests.join(' + ')}${repeat ? ' (again)' : ''}`,
      steps: [...steps, consume],
      faces,
    })
  }
  const has = (k: string) => f.page.features.includes(k)
  if (!f.page.present)
    return enforce({
      intent: 'scaffold /sketch',
      steps: [
        write('page', '✎ write page.tsx', (g) => ({
          ...g,
          page: { ...g.page, present: true, mtime: now(), features: [] },
        })),
      ],
    })
  if (!f.px.present || f.px.pixels.length === 0)
    return enforce({
      intent: 'draw the smiley',
      steps: [
        writePx('✎ write sketch.px', (p) => ({
          pixels: union(p.pixels, FACE_PX.smiley),
          face: 'smiley',
        })),
      ],
    })
  if (!has('req-frame')) return enforce(addFeature('req-frame', 'add “toggle frame” to the page'))
  if (!has('req-surprise'))
    return enforce(addFeature('req-surprise', 'add “surprise me” to the page'))
  if (!has('pol-fresh')) return enforce(addFeature('pol-fresh', 'add “never repeat” to the page'))
  if (!has('pol-symmetric'))
    return enforce(addFeature('pol-symmetric', 'add “keep it symmetric” to the page'))
  if (!has('status')) return enforce(addFeature('status', 'add a status bar'))
  const { face, again } = pickFace()
  return enforce({
    intent: `${FACE_INTENT[face]}${again ? ' (again)' : ''}`,
    steps: [setFace(face)],
    faces: [face],
  })
}

const PROMPT_MS = 700
const WRITE_MS = 450
const BUILD_MS = 450
const SAVE_MS = 600
const NOOP_MS = 300
const LOG_CAP = 5
const HMR_TIMES = [31, 24, 27, 22, 35, 19]

type Phase = 'prompt' | 'write' | 'build' | null
type Msg = { role: 'prompt' | 'response'; text: string }
type Sim = {
  files: Files
  built: Files
  plan: Plan | null
  step: number
  phase: Phase
  log: string[]
  msgs: Msg[]
  // Session memory: faces drawn this conversation. Not a file — and that is
  // the point: it does not survive a new session.
  seen: Face[]
  prompts: number
  writes: number
  steered: number
  hmr: number
}
const INITIAL: Sim = {
  files: SEED,
  built: SEED,
  plan: null,
  step: 0,
  phase: null,
  log: ['▲ next dev — watching pages/'],
  msgs: [],
  seen: [],
  prompts: 0,
  writes: 0,
  steered: 0,
  hmr: 0,
}

function pushLog(log: string[], line: string): string[] {
  return [...log.slice(-(LOG_CAP - 1)), line]
}

function land(s: Sim, idx: number): Sim {
  const step = s.plan!.steps[idx]
  return {
    ...s,
    step: idx,
    phase: 'write',
    files: step.mutate(s.files),
    log: pushLog(s.log, step.log),
    writes: s.writes + 1,
  }
}

// ---- custom nodes -------------------------------------------------------

const handleCls = '!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600'

const MSG_WINDOW = 6

function HistoryNode({ data }: NodeProps) {
  const { msgs, reading } = data as { msgs: Msg[]; reading: boolean }
  const start = Math.max(0, msgs.length - MSG_WINDOW)
  const window = msgs.slice(start)
  return (
    <div
      className={clsx(
        'w-48 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        reading ? 'ring-2 ring-violet-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Message history
      </div>
      <ol className="mt-1 font-mono text-[10px]/4">
        {window.map((m, i) => (
          <li
            key={start + i}
            className={clsx(
              'flex items-baseline gap-1.5 truncate px-1',
              m.role === 'prompt'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-violet-600 dark:text-violet-400',
            )}
          >
            <span className="opacity-60">{m.role === 'prompt' ? '»' : '«'}</span>
            {m.text}
          </li>
        ))}
        {Array.from({ length: MSG_WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <div className="mt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the only memory that isn&rsquo;t a file
      </div>
      <Handle id="ctx" type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { phase, stepLog } = data as { phase: Phase; stepLog: string | null }
  return (
    <div className="w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1.5 font-mono text-xs',
          phase === 'write' && stepLog
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : phase === 'prompt'
              ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {phase === 'write' && stepLog ? stepLog : phase === 'prompt' ? 'reading the filesystem…' : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        reads requests once — policy every time
      </div>
      <Handle id="ctx" type="target" position={Position.Top} className={handleCls} />
      <Handle id="out" type="source" position={Position.Right} className={handleCls} />
    </div>
  )
}

function SaveNode({ data }: NodeProps) {
  const { buffered, hasRequest, hasPolicy, writing } = data as {
    buffered: number
    hasRequest: boolean
    hasPolicy: boolean
    writing: boolean
  }
  const parts = [
    buffered > 0 ? `${buffered} px` : null,
    hasRequest ? 'request' : null,
    hasPolicy ? 'policy' : null,
  ].filter(Boolean)
  const active = parts.length > 0 || writing
  const body = parts.length > 0 ? `buffering ${parts.join(' + ')}…` : writing ? 'POST /save' : 'idle'
  return (
    <div
      className={clsx(
        'w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? 'ring-2 ring-teal-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Save handler
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1.5 font-mono text-xs',
          parts.length > 0
            ? 'animate-pulse bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
            : writing
              ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {body}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        one buffered path for every gesture
      </div>
      <Handle type="target" position={Position.Right} className={handleCls} />
      <Handle id="out" type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}

function FilesNode({ data }: NodeProps) {
  const { files, patchFile, saving } = data as {
    files: Files
    patchFile: FileKey | null
    saving: boolean
  }
  const pxSet = files.px.present ? new Set(files.px.pixels) : new Set<string>()
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        patchFile
          ? 'ring-2 ring-violet-400/80'
          : saving
            ? 'ring-2 ring-teal-400/80'
            : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Filesystem
      </div>
      <ul className="mt-1 font-mono text-[10px]/4">
        {FILE_META.map((f) => {
          const st = files[f.key]
          return (
            <li
              key={f.key}
              className={clsx(
                'flex items-baseline gap-1.5 rounded-sm px-1 py-0.5',
                patchFile === f.key
                  ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
                  : st.present
                    ? 'text-zinc-600 dark:text-zinc-300'
                    : 'text-zinc-300 dark:text-zinc-600',
              )}
            >
              <span className={clsx('inline-block size-1.5 shrink-0 rounded-full', STRATUM_DOT[f.stratum])} />
              <span>{f.name}</span>
              <span className="ml-auto text-[9px] text-zinc-400 tabular-nums dark:text-zinc-500">
                {st.present ? st.mtime : '—'}
              </span>
            </li>
          )
        })}
      </ul>
      {files.steer.present && files.steer.requests.length > 0 && (
        <div className="truncate px-1 font-mono text-[9px] text-violet-600 italic dark:text-violet-400">
          staged · steer.md: &ldquo;{files.steer.requests.join(', ')}&rdquo;
        </div>
      )}
      {files.policy.present && files.policy.flags.length > 0 && (
        <div className="truncate px-1 font-mono text-[9px] font-semibold text-violet-600 dark:text-violet-400">
          standing · policy.md: &ldquo;{files.policy.flags.join(' · ')}&rdquo;
        </div>
      )}
      {/* sketch.px, raw: the file's actual bytes — the state itself */}
      <div className="mt-1.5 rounded-md bg-zinc-100 p-1.5 dark:bg-white/5">
        <div className="mx-auto grid w-fit grid-cols-8 gap-px">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const on = pxSet.has(key(i % GRID, Math.floor(i / GRID)))
            return (
              <div
                key={i}
                className={clsx(
                  'size-2 rounded-[1px] transition-colors duration-150',
                  on ? 'bg-sky-500' : 'bg-white dark:bg-zinc-800',
                )}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        wishes come and go — dispositions stand
      </div>
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle id="hand" type="target" position={Position.Top} className={handleCls} />
      <Handle id="out" type="source" position={Position.Right} className={handleCls} />
    </div>
  )
}

function TerminalNode({ data }: NodeProps) {
  const { log, building } = data as { log: string[]; building: boolean }
  return (
    <div className="w-52 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Terminal · dev server
      </div>
      <div className="mt-1 rounded-md bg-zinc-950 px-2 py-1.5 font-mono text-[9px]/4">
        {log.map((line, i) => (
          <div
            key={`${i}-${line}`}
            className={clsx(
              'truncate',
              line.startsWith('✓')
                ? 'text-emerald-400'
                : line.startsWith('✎')
                  ? 'text-zinc-300'
                  : 'text-zinc-500',
            )}
          >
            {line}
          </div>
        ))}
        {building && <div className="animate-pulse text-zinc-400">compiling…</div>}
      </div>
      <div className="mt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the repair writes are policy&rsquo;s hand
      </div>
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle id="hmr" type="source" position={Position.Top} className={handleCls} />
    </div>
  )
}

function BrowserNode({ data }: NodeProps) {
  const { built, overlay, steerReqs, policyFlags, onDraw, onRequest, onPolicy } = data as {
    built: Files
    overlay: string[]
    steerReqs: Request[]
    policyFlags: Policy[]
    onDraw: (x: number, y: number) => void
    onRequest: (r: Request) => void
    onPolicy: (p: Policy) => void
  }
  const view = viewOf(built)
  const feats = new Set(built.page.features)
  const flipped = (k: string) => overlay.filter((p) => p === k).length % 2 === 1
  return (
    <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="pb-1 text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Browser
      </div>
      <div className="flex items-center gap-1 rounded-t-md bg-zinc-100 px-1.5 py-1 dark:bg-white/5">
        <span className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <span className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <span className="ml-1 font-mono text-[8px] text-zinc-500 dark:text-zinc-400">
          localhost:3000/sketch
        </span>
      </div>
      <div className="rounded-b-md bg-zinc-950 p-1.5">
        {view.missing ? (
          <div className="flex flex-col items-center justify-center gap-0.5 py-9">
            <span className="font-mono text-xl font-semibold text-zinc-400">404</span>
            <span className="font-mono text-[8px] text-zinc-500">nothing at /sketch — the route is gone</span>
            <span className="font-mono text-[8px] text-zinc-600">(its state — and its policy — are not)</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between px-0.5 pb-1">
              <span className="font-mono text-[8px] font-semibold text-emerald-400">▦ sketch.px</span>
              <span className="animate-pulse font-mono text-[8px] text-emerald-500/70">
                ✎ click to draw
              </span>
            </div>
            {/* xyflow disables pointer events on non-interactive nodes;
                re-enable them on the surfaces that ARE interactive */}
            <div className="pointer-events-auto mx-auto grid w-fit cursor-crosshair grid-cols-8 gap-px">
              {Array.from({ length: GRID * GRID }, (_, i) => {
                const x = i % GRID
                const y = Math.floor(i / GRID)
                const k = key(x, y)
                const on = view.lit.has(k) !== flipped(k)
                return (
                  <button
                    key={i}
                    onClick={() => onDraw(x, y)}
                    aria-label={`draw pixel ${x},${y}`}
                    className={clsx(
                      'nodrag size-3 cursor-crosshair rounded-[1px] transition-colors duration-200',
                      on
                        ? 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400/60 hover:bg-emerald-300'
                        : 'bg-zinc-800 hover:bg-emerald-900',
                    )}
                  />
                )
              })}
            </div>
            {/* requests (emerald, consumed) above dispositions (violet,
                persistent) — each chip exists only once grown into page.tsx */}
            <div className="pointer-events-auto mx-auto mt-2 flex w-fit flex-col items-stretch gap-1">
              {REQUESTS.filter((r) => feats.has(REQ_FEATURE[r])).map((r) => (
                <button
                  key={r}
                  onClick={() => onRequest(r)}
                  className={clsx(
                    'nodrag rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
                    steerReqs.includes(r)
                      ? 'bg-emerald-500/15 font-semibold text-emerald-400 ring-emerald-500/40'
                      : 'text-emerald-500/80 ring-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-400',
                  )}
                >
                  {r}
                </button>
              ))}
              {POLICIES.filter((p) => feats.has(POLICY_FEATURE[p])).map((p) => (
                <button
                  key={p}
                  onClick={() => onPolicy(p)}
                  className={clsx(
                    'nodrag rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
                    policyFlags.includes(p)
                      ? 'bg-violet-500/15 font-semibold text-violet-400 ring-violet-500/40'
                      : 'text-violet-500/80 ring-violet-500/25 hover:bg-violet-500/10 hover:text-violet-400',
                  )}
                >
                  {POLICY_CHIP[p]}
                </button>
              ))}
            </div>
            {feats.has('status') && (
              <div className="mt-1 flex justify-between px-0.5 font-mono text-[7px] text-zinc-500">
                <span>{built.px.present ? built.px.pixels.length : 0} px</span>
                <span>saved {built.px.mtime ?? '—'}</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="pt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        wishes are consumed — dispositions persist
      </div>
      <Handle type="target" position={Position.Bottom} className={handleCls} />
      <Handle id="persist" type="source" position={Position.Left} className={handleCls} />
    </div>
  )
}

const nodeTypes = {
  polHistory: HistoryNode,
  polLlm: LlmNode,
  polSave: SaveNode,
  polFiles: FilesNode,
  polTerminal: TerminalNode,
  polBrowser: BrowserNode,
}

// ---- the demo -----------------------------------------------------------

export function PolicyLoopDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [drawBuf, setDrawBuf] = useState<string[]>([])
  const [inflight, setInflight] = useState<string[]>([])
  const [reqBuf, setReqBuf] = useState<Request[] | null>(null)
  const [polBuf, setPolBuf] = useState<Policy[] | null>(null)
  const [handActive, setHandActive] = useState(false)
  const drawBufRef = useRef(drawBuf)
  drawBufRef.current = drawBuf
  const reqBufRef = useRef(reqBuf)
  reqBufRef.current = reqBuf
  const polBufRef = useRef(polBuf)
  polBufRef.current = polBuf
  const saveTimer = useRef<number | null>(null)
  const noopTimer = useRef<number | null>(null)
  const handTimer = useRef<number | null>(null)
  const rmTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      for (const t of [saveTimer, noopTimer, handTimer, rmTimer]) if (t.current) clearTimeout(t.current)
    },
    [],
  )

  // The prompt's round trip: read the filesystem, land the patch, fold.
  useEffect(() => {
    if (!sim.phase) return
    const ms = sim.phase === 'prompt' ? PROMPT_MS : sim.phase === 'write' ? WRITE_MS : BUILD_MS
    const t = setTimeout(() => {
      setSim((s) => {
        if (!s.phase || !s.plan) return s
        switch (s.phase) {
          case 'prompt':
            return land(
              {
                ...s,
                msgs: [...s.msgs, { role: 'response', text: s.plan.intent }],
                seen: [...s.seen, ...(s.plan.faces ?? [])],
                steered: s.steered + (s.plan.intent.startsWith('steer') ? 1 : 0),
              },
              0,
            )
          case 'write':
            return s.step + 1 < s.plan.steps.length ? land(s, s.step + 1) : { ...s, phase: 'build' }
          case 'build':
            return {
              ...s,
              phase: null,
              plan: null,
              built: s.files,
              log: pushLog(s.log, `✓ hmr /sketch ${HMR_TIMES[s.hmr % HMR_TIMES.length]}ms`),
              hmr: s.hmr + 1,
            }
        }
      })
    }, ms)
    return () => clearTimeout(t)
  }, [sim.phase, sim.step])

  const busy = sim.phase !== null

  function prompt() {
    setSim((s) => {
      if (s.phase) return s
      return {
        ...s,
        prompts: s.prompts + 1,
        plan: decide(s.files, s.seen),
        step: 0,
        phase: 'prompt',
        msgs: [...s.msgs, { role: 'prompt', text: 'keep going' }],
      }
    })
  }

  // A new session: the conversation forgets, the filesystem does not.
  function newSession() {
    setSim((s) =>
      s.phase ? s : { ...s, msgs: [], seen: [], plan: null, prompts: 0, steered: 0 },
    )
  }

  // The app's gestures — draws, requests, dispositions — share one buffered
  // save path.
  function scheduleSave() {
    if (!saveTimer.current) saveTimer.current = window.setTimeout(fireSave, SAVE_MS)
  }

  function drawPixel(x: number, y: number) {
    const k = key(x, y)
    setDrawBuf((b) => (b.includes(k) ? b.filter((p) => p !== k) : [...b, k]))
    scheduleSave()
  }

  function requestChip(r: Request) {
    const current = reqBufRef.current ?? (sim.files.steer.present ? sim.files.steer.requests : [])
    setReqBuf(current.includes(r) ? current.filter((x) => x !== r) : [...current, r])
    scheduleSave()
  }

  function policyChip(p: Policy) {
    const current = polBufRef.current ?? (sim.files.policy.present ? sim.files.policy.flags : [])
    setPolBuf(current.includes(p) ? current.filter((x) => x !== p) : [...current, p])
    scheduleSave()
  }

  function fireSave() {
    saveTimer.current = null
    const toggles = drawBufRef.current
    const reqs = reqBufRef.current
    const pols = polBufRef.current
    if (toggles.length === 0 && reqs === null && pols === null) return
    setDrawBuf([])
    setReqBuf(null)
    setPolBuf(null)
    setInflight((f) => [...f, ...toggles])
    setSim((s) => {
      let files = s.files
      let log = s.log
      let writes = s.writes
      if (toggles.length > 0) {
        let pixels = files.px.present ? [...files.px.pixels] : []
        for (const k of toggles) {
          pixels = pixels.includes(k) ? pixels.filter((p) => p !== k) : [...pixels, k]
        }
        files = { ...files, px: { ...files.px, present: true, mtime: now(), pixels } }
        log = pushLog(log, '✎ write sketch.px (app save)')
        writes += 1
      }
      if (reqs !== null) {
        if (reqs.length > 0) {
          files = { ...files, steer: { present: true, mtime: now(), requests: reqs } }
          log = pushLog(log, '✎ write steer.md (app save)')
          writes += 1
        } else if (files.steer.present) {
          files = { ...files, steer: { present: false, mtime: null, requests: [] } }
          log = pushLog(log, '✎ rm steer.md (app save)')
          writes += 1
        }
      }
      if (pols !== null) {
        if (pols.length > 0) {
          files = { ...files, policy: { present: true, mtime: now(), flags: pols } }
          log = pushLog(log, '✎ write policy.md (app save)')
          writes += 1
        } else if (files.policy.present) {
          files = { ...files, policy: { present: false, mtime: null, flags: [] } }
          log = pushLog(log, '✎ rm policy.md (app save)')
          writes += 1
        }
      }
      return { ...s, files, log, writes }
    })
    if (!noopTimer.current) noopTimer.current = window.setTimeout(fireNoop, NOOP_MS)
  }

  function fireNoop() {
    noopTimer.current = null
    setInflight([])
    setSim((s) => ({
      ...s,
      built: s.files,
      log: pushLog(s.log, '✓ hmr /sketch — no-op'),
      hmr: s.hmr + 1,
    }))
  }

  // The rm levers: the engineer's hand at the terminal — immediate writes,
  // and a real (not no-op) reload. Note what they can never touch: policy.md.
  function handWrite(logLine: string, mutate: (f: Files) => Files) {
    setSim((s) => ({
      ...s,
      files: mutate(s.files),
      log: pushLog(s.log, logLine),
      writes: s.writes + 1,
    }))
    setHandActive(true)
    if (handTimer.current) clearTimeout(handTimer.current)
    handTimer.current = window.setTimeout(() => setHandActive(false), 800)
    if (!rmTimer.current) {
      rmTimer.current = window.setTimeout(() => {
        rmTimer.current = null
        setSim((s) => ({
          ...s,
          built: s.files,
          log: pushLog(s.log, `✓ hmr /sketch ${HMR_TIMES[s.hmr % HMR_TIMES.length]}ms`),
          hmr: s.hmr + 1,
        }))
      }, NOOP_MS)
    }
  }

  const rmPx = () =>
    handWrite('✎ rm sketch.px', (g) => ({
      ...g,
      px: { ...g.px, present: false, mtime: null, pixels: [], face: null },
    }))
  const rmPage = () =>
    handWrite('✎ rm page.tsx', (g) => ({
      ...g,
      page: { ...g.page, present: false, mtime: null, features: [] },
    }))

  function reset() {
    for (const t of [saveTimer, noopTimer, handTimer, rmTimer]) {
      if (t.current) {
        clearTimeout(t.current)
        t.current = null
      }
    }
    setDrawBuf([])
    setInflight([])
    setReqBuf(null)
    setPolBuf(null)
    setHandActive(false)
    setSim(INITIAL)
  }

  const writing = sim.phase === 'write'
  const building = sim.phase === 'build'
  const patchFile = writing && sim.plan ? sim.plan.steps[sim.step].file : null
  const steerReqs = reqBuf ?? (sim.files.steer.present ? sim.files.steer.requests : [])
  const policyFlags = polBuf ?? (sim.files.policy.present ? sim.files.policy.flags : [])
  const appBuffering = drawBuf.length > 0 || reqBuf !== null || polBuf !== null

  const nodes: Node[] = [
    {
      id: 'history',
      type: 'polHistory',
      position: { x: -20, y: 20 },
      data: { msgs: sim.msgs, reading: sim.phase === 'prompt' },
    },
    {
      id: 'llm',
      type: 'polLlm',
      position: { x: 0, y: 260 },
      data: { phase: sim.phase, stepLog: writing && sim.plan ? sim.plan.steps[sim.step].log : null },
    },
    {
      id: 'save',
      type: 'polSave',
      position: { x: 290, y: 60 },
      data: {
        buffered: drawBuf.length,
        hasRequest: reqBuf !== null,
        hasPolicy: polBuf !== null,
        writing: inflight.length > 0,
      },
    },
    {
      id: 'files',
      type: 'polFiles',
      position: { x: 230, y: 230 },
      data: { files: sim.files, patchFile, saving: inflight.length > 0 || handActive },
    },
    {
      id: 'terminal',
      type: 'polTerminal',
      position: { x: 470, y: 290 },
      data: { log: sim.log, building },
    },
    {
      id: 'browser',
      type: 'polBrowser',
      position: { x: 500, y: 0 },
      data: {
        built: sim.built,
        overlay: [...drawBuf, ...inflight],
        steerReqs,
        policyFlags,
        onDraw: drawPixel,
        onRequest: requestChip,
        onPolicy: policyChip,
      },
    },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const label = { labelStyle: { fontSize: 9 }, labelBgStyle: { fillOpacity: 0 } }
  const edges: Edge[] = [
    {
      id: 'ctx',
      source: 'history',
      sourceHandle: 'ctx',
      target: 'llm',
      targetHandle: 'ctx',
      label: 'context',
      animated: sim.phase === 'prompt',
      style: sim.phase === 'prompt' ? { stroke: violet, strokeWidth: 1.5 } : { opacity: 0.5 },
      ...label,
    },
    {
      id: 'patch',
      source: 'llm',
      sourceHandle: 'out',
      target: 'files',
      label: 'patch — honor · consume · maintain',
      animated: writing,
      style: writing ? { stroke: violet, strokeWidth: 1.5 } : undefined,
      ...label,
    },
    {
      id: 'draws',
      source: 'browser',
      sourceHandle: 'persist',
      target: 'save',
      label: 'draws · wishes · dispositions',
      animated: appBuffering,
      style: appBuffering ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5, stroke: teal },
      ...label,
    },
    {
      id: 'save-write',
      source: 'save',
      sourceHandle: 'out',
      target: 'files',
      targetHandle: 'hand',
      label: 'write — delayed',
      animated: inflight.length > 0,
      style: inflight.length > 0 ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5, stroke: teal },
      ...label,
    },
    {
      id: 'watch',
      source: 'files',
      sourceHandle: 'out',
      target: 'terminal',
      label: 'watched',
      animated: writing || building || inflight.length > 0 || handActive,
      style:
        writing || building || inflight.length > 0 || handActive
          ? { stroke: violet, strokeWidth: 1.5 }
          : undefined,
      ...label,
    },
    {
      id: 'hmr',
      source: 'terminal',
      sourceHandle: 'hmr',
      target: 'browser',
      label: 'hot reload',
      animated: building || inflight.length > 0 || handActive,
      style:
        building || inflight.length > 0 || handActive
          ? { stroke: emerald, strokeWidth: 1.5 }
          : undefined,
      ...label,
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <DemoFrame
      title="Steering the steering"
      hint={
        <>
          <span className="block">
            Second-order steering is a difference in <em>lifetime</em>.{' '}
            <code className="font-mono text-xs">steer.md</code> is a queue: staged, pulled,
            consumed exactly once. <code className="font-mono text-xs">policy.md</code> is a
            disposition: written rarely, never consumed, read on <em>every</em> drive. And
            neither disposition here does a constant thing — each is conditioned on a different
            memory. <code className="font-mono text-xs">never repeat</code> reads the{' '}
            <em>conversation</em>: with it standing, no face returns until the repertoire runs
            dry (then the intent admits <em>(again)</em>).{' '}
            <code className="font-mono text-xs">keep it symmetric</code> reads the{' '}
            <em>canvas bytes</em>: every patch is simulated first, and if the picture
            wouldn&rsquo;t mirror itself, a repair computed from exactly what&rsquo;s there is
            appended — draw half a doodle and drive, and its twin appears; land on the wink and
            watch the policy even it out in the same patch.
          </span>
          <span className="mt-2 block">
            The two conditions live in different places, and that is the experiment. Press{' '}
            <em>New session</em>: the page, the drawing, and{' '}
            <code className="font-mono text-xs">policy.md</code> all stand — but{' '}
            <code className="font-mono text-xs">never repeat</code>&rsquo;s material, the
            session&rsquo;s memory of what was drawn, is gone, so the standing policy forgets
            what &ldquo;repeat&rdquo; means and happily returns to old faces.{' '}
            <code className="font-mono text-xs">keep it symmetric</code> is untouched — its
            condition lives in the filesystem, and it goes on repairing. Three lifetimes: the
            context window, gone at session&rsquo;s end; the queue, gone when consumed; the
            disposition, standing until changed — but a disposition can only be as durable as
            the memory it reads. Whatever should outlive the conversation has to land in a
            file.
          </span>
        </>
      }
    >
      <DemoCanvas
        className="h-112"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={prompt}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> Prompt: &ldquo;keep going&rdquo;
        </button>
        <button onClick={newSession} disabled={busy || sim.msgs.length === 0} className={btn}>
          <PlusIcon className="size-4" /> New session
        </button>
        <button onClick={rmPx} disabled={!sim.files.px.present} className={btn}>
          <TrashIcon className="size-4" /> rm sketch.px
        </button>
        <button onClick={rmPage} disabled={!sim.files.page.present} className={btn}>
          <TrashIcon className="size-4" /> rm page.tsx
        </button>
        <button onClick={reset} className={btn}>
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {sim.prompts} prompts · {sim.writes} writes · {sim.steered} steered
        </span>
      </div>
    </DemoFrame>
  )
}
