'use client'

import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon, TrashIcon } from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { DemoFrame } from '../demo-frame'

// Section 2.4: the BASE APPLICATION of an AI harness, driven by the reader
// — who IS the engineer, so no engineer node appears; and the whole system
// is the harness, so no node is called that either. The flow is
// deliberately unidirectional: LLM → filesystem → dev server → browser,
// with the site's own draws returning only through a buffered save handler.
// Two guards make it safe: every effect must land in the filesystem as a coherent
// snapshot before anything downstream sees it (the dev server no-ops writes
// that change nothing it renders), and the site has no channel to the LLM —
// the loop closes only through the reader. Naive versions of this loop
// thrash: displays re-triggering builds, models re-prompted by their own
// uncommitted output, noise compounding into the working context. The seed
// of the refladic loop is planted here — persistent effects in the filesystem,
// write-loops guarded at the fold — and the next demo grows it: the site
// steering the LLM, safely, through the same filesystem.

const GRID = 8

type Stratum = 'code' | 'prose' | 'data'
type FileKey = 'page' | 'px'

const STRATUM_DOT: Record<Stratum, string> = {
  code: 'bg-amber-500/80',
  prose: 'bg-violet-500/80',
  data: 'bg-sky-500/80',
}
const FILE_META: { key: FileKey; name: string; stratum: Stratum }[] = [
  { key: 'page', name: 'page.tsx', stratum: 'code' },
  { key: 'px', name: 'sketch.px', stratum: 'data' },
]

// Chapter 1's repertoire, verbatim — the same faces the smiley toy drew.
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

// The filesystem: three files, presence + mtime + content. sketch.px is
// a real pixel set — the app's draws and the LLM's patches share the bytes.
// mtimes are what a real filesystem carries: local wall-clock, in-memory.
type Files = {
  // gen counts scaffolds: 1 on the first run, 2+ once rebuilt after an rm.
  page: { present: boolean; mtime: string | null; features: string[]; gen: number }
  px: { present: boolean; mtime: string | null; pixels: string[]; face: Face | null }
}
const EMPTY: Files = {
  page: { present: false, mtime: null, features: [], gen: 0 },
  px: { present: false, mtime: null, pixels: [], face: null },
}

// What a code patch can add to page.tsx: features of the app itself. They
// change how the same data renders — and they live in the code file, so
// rm page.tsx loses them even though the drawing survives.
const FEATURES: { key: string; intent: string }[] = [
  { key: 'amber', intent: 'amber phosphor mode' },
  { key: 'status', intent: 'add a status bar' },
  { key: 'scanlines', intent: 'scanlines' },
]
const now = () => new Date().toLocaleTimeString([], { hour12: false })

// The view is a pure function of file contents — nothing else feeds it.
function viewOf(f: Files): { lit: Set<string>; missing: boolean } {
  return {
    lit: f.px.present ? new Set(f.px.pixels) : new Set(),
    missing: !f.page.present,
  }
}

const hasFrame = (f: Files) =>
  f.px.present && BORDER.every(([x, y]) => f.px.pixels.includes(key(x, y)))

const union = (pixels: string[], add: [number, number][]) => [
  ...new Set([...pixels, ...add.map(([x, y]) => key(x, y))]),
]
const minus = (pixels: string[], del: [number, number][]) => {
  const gone = new Set(del.map(([x, y]) => key(x, y)))
  return pixels.filter((p) => !gone.has(p))
}

// One write of a patch: which file it touches, and how.
type Step = { file: FileKey; log: string; mutate: (f: Files) => Files }
type Plan = { intent: string; steps: Step[] }

const write = (file: FileKey, log: string, mutate: (f: Files) => Files): Step => ({ file, log, mutate })
const writePx = (log: string, px: (p: Files['px']) => Partial<Files['px']>): Step =>
  write('px', log, (g) => ({ ...g, px: { ...g.px, present: true, mtime: now(), ...px(g.px) } }))

const featurePlan = (ft: { key: string; intent: string }): Plan => ({
  intent: ft.intent,
  steps: [
    write('page', '✎ write page.tsx', (g) => ({
      ...g,
      page: { ...g.page, present: true, mtime: now(), features: [...g.page.features, ft.key] },
    })),
  ],
})

const feature = (key: string) => featurePlan(FEATURES.find((ft) => ft.key === key)!)

// The LLM's whole intelligence: read the filesystem, decide the next patch.
// Same prompt every time — the filesystem is what changed.
function decide(f: Files): Plan {
  if (!f.page.present)
    return {
      intent: 'scaffold /sketch',
      steps: [
        write('page', '✎ write page.tsx', (g) => ({
          ...g,
          page: { ...g.page, present: true, mtime: now(), gen: g.page.gen + 1 },
        })),
      ],
    }
  if (!f.px.present || f.px.pixels.length === 0)
    return {
      intent: 'draw the smiley',
      steps: [
        writePx('✎ write sketch.px', (p) => ({
          pixels: union(p.pixels, FACE_PX.smiley),
          face: 'smiley',
        })),
      ],
    }
  const has = (k: string) => f.page.features.includes(k)
  const framePlan: Plan = {
    intent: 'frame it',
    steps: [writePx('✎ write sketch.px', (p) => ({ pixels: union(p.pixels, BORDER) }))],
  }
  const next = FACE_CYCLE[(FACE_CYCLE.indexOf(f.px.face as Face) + 1 + FACE_CYCLE.length) % FACE_CYCLE.length]
  const facePlan: Plan = {
    intent: FACE_INTENT[next],
    steps: [
      writePx('✎ write sketch.px', (p) => ({
        pixels: union(p.face ? minus(p.pixels, FACE_PX[p.face]) : p.pixels, FACE_PX[next]),
        face: next,
      })),
    ],
  }
  if (f.page.gen <= 1) {
    // The first run is a curated interleave: code patches woven between the
    // data ones, so the strata mix shows before chance takes over.
    if (!has('status')) return feature('status')
    if (!hasFrame(f)) return framePlan
    if (!has('amber')) return feature('amber')
    if (!has('scanlines')) return feature('scanlines')
    return facePlan
  }
  if (!hasFrame(f)) return framePlan
  // After a recovery, the same two words underdetermine the next move: the
  // LLM picks nondeterministically among data and code patches — minimal
  // context, disambiguated by nothing but the filesystem and chance.
  const candidates: Plan[] = [facePlan, facePlan]
  const missing = FEATURES.filter((ft) => !has(ft.key))
  if (missing.length > 0) {
    const ft = missing[Math.floor(Math.random() * missing.length)]
    // Code-leaning mix: while features remain, page.tsx patches dominate.
    candidates.push(featurePlan(ft), featurePlan(ft), featurePlan(ft))
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

const PROMPT_MS = 700
const WRITE_MS = 450
const BUILD_MS = 450
const SAVE_MS = 600
const HAND_HMR_MS = 300
const HAND_FLASH_MS = 800
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
  prompts: number
  writes: number
  hmr: number
}
const INITIAL: Sim = {
  files: EMPTY,
  built: EMPTY,
  plan: null,
  step: 0,
  phase: null,
  log: ['▲ next dev — watching pages/'],
  msgs: [],
  prompts: 0,
  writes: 0,
  hmr: 0,
}

function pushLog(log: string[], line: string): string[] {
  return [...log.slice(-(LOG_CAP - 1)), line]
}

// Apply one step of the active plan: the file changes and the log says so.
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
        every exchange, in order — the model&rsquo;s own past
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
        reads the filesystem, then patches
      </div>
      <Handle id="ctx" type="target" position={Position.Top} className={handleCls} />
      <Handle id="out" type="source" position={Position.Right} className={handleCls} />
    </div>
  )
}

function SaveNode({ data }: NodeProps) {
  const { buffered, writing } = data as { buffered: number; writing: boolean }
  const active = buffered > 0 || writing
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
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          buffered > 0
            ? 'animate-pulse bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
            : writing
              ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {buffered > 0 ? `buffering ${buffered} px…` : writing ? 'POST /save' : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the app persisting its own state
      </div>
      <Handle type="target" position={Position.Right} className={handleCls} />
      <Handle id="out" type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}

function FilesNode({ data }: NodeProps) {
  const { files, patchFile, handActive } = data as {
    files: Files
    patchFile: FileKey | null
    handActive: boolean
  }
  const pxSet = files.px.present ? new Set(files.px.pixels) : new Set<string>()
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        patchFile
          ? 'ring-2 ring-violet-400/80'
          : handActive
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
                  : handActive && f.key === 'px'
                    ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
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
        the context — working state, recoverable
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
        view one: the fold, narrated
      </div>
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle id="hmr" type="source" position={Position.Top} className={handleCls} />
    </div>
  )
}

function BrowserNode({ data }: NodeProps) {
  const { built, overlay, onDraw } = data as {
    built: Files
    overlay: string[]
    onDraw: (x: number, y: number) => void
  }
  const view = viewOf(built)
  const feats = new Set(built.page.features)
  const amber = feats.has('amber')
  // The app's client-side state: draws show immediately, before any file
  // write lands. An odd number of pending toggles flips the built pixel.
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
          // No route, no app: the 404 is the whole page.
          <div className="flex flex-col items-center justify-center gap-0.5 py-9">
            <span className="font-mono text-xl font-semibold text-zinc-400">404</span>
            <span className="font-mono text-[8px] text-zinc-500">nothing at /sketch — the route is gone</span>
            <span className="font-mono text-[8px] text-zinc-600">(its state is not)</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between px-0.5 pb-1">
              <span
                className={clsx(
                  'font-mono text-[8px] font-semibold',
                  amber ? 'text-amber-400' : 'text-emerald-400',
                )}
              >
                ▦ sketch.px
              </span>
              <span
                className={clsx(
                  'animate-pulse font-mono text-[8px]',
                  amber ? 'text-amber-500/70' : 'text-emerald-500/70',
                )}
              >
                ✎ click to draw
              </span>
            </div>
            {/* xyflow disables pointer events on non-interactive nodes;
                re-enable them on the one surface that IS interactive */}
            <div className="pointer-events-auto relative mx-auto w-fit">
              <div className="grid cursor-crosshair grid-cols-8 gap-px">
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
                          ? amber
                            ? 'bg-amber-400 shadow-[0_0_5px] shadow-amber-400/60 hover:bg-amber-300'
                            : 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400/60 hover:bg-emerald-300'
                          : amber
                            ? 'bg-zinc-800 hover:bg-amber-900'
                            : 'bg-zinc-800 hover:bg-emerald-900',
                      )}
                    />
                  )
                })}
              </div>
              {feats.has('scanlines') && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 3px)',
                  }}
                />
              )}
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
        {view.missing
          ? 'the candidate is gone — the state is not'
          : 'the drawing app, live — what persists is the file'}
      </div>
      <Handle type="target" position={Position.Bottom} className={handleCls} />
      <Handle id="persist" type="source" position={Position.Left} className={handleCls} />
    </div>
  )
}

const nodeTypes = {
  devHistory: HistoryNode,
  devLlm: LlmNode,
  devSave: SaveNode,
  devFiles: FilesNode,
  devTerminal: TerminalNode,
  devBrowser: BrowserNode,
}

// ---- the demo -----------------------------------------------------------

export function DevLoopDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  // The hand path is immediate: no phases, just a flash and a fast rebuild.
  const [handActive, setHandActive] = useState(false)
  // The draw path: toggles buffer in the app (drawBuf), the save handler
  // writes them after a beat (inflight until the dev server confirms).
  const [drawBuf, setDrawBuf] = useState<string[]>([])
  const [inflight, setInflight] = useState<string[]>([])
  const drawBufRef = useRef(drawBuf)
  drawBufRef.current = drawBuf
  const handTimer = useRef<number | null>(null)
  const hmrTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const noopTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      for (const t of [handTimer, hmrTimer, saveTimer, noopTimer]) {
        if (t.current) clearTimeout(t.current)
      }
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
            // The decided intent lands in the message history as the reply.
            return land({ ...s, msgs: [...s.msgs, { role: 'response', text: s.plan.intent }] }, 0)
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

  // The one prompt. The LLM reads the filesystem and answers with a patch.
  function prompt() {
    setSim((s) => {
      if (s.phase) return s
      return {
        ...s,
        prompts: s.prompts + 1,
        plan: decide(s.files),
        step: 0,
        phase: 'prompt',
        msgs: [...s.msgs, { role: 'prompt', text: 'keep going' }],
      }
    })
  }

  // Hand writes: the page's own interactions, persisted straight into the
  // filesystem — then the same rebuild. Rebuilds coalesce (leading debounce), so
  // steady drawing syncs every beat instead of once per pixel.
  function handWrite(logLine: string, mutate: (f: Files) => Files) {
    setSim((s) => ({
      ...s,
      files: mutate(s.files),
      log: pushLog(s.log, logLine),
      writes: s.writes + 1,
    }))
    setHandActive(true)
    if (handTimer.current) clearTimeout(handTimer.current)
    handTimer.current = window.setTimeout(() => setHandActive(false), HAND_FLASH_MS)
    if (!hmrTimer.current) {
      hmrTimer.current = window.setTimeout(() => {
        hmrTimer.current = null
        setSim((s) => ({
          ...s,
          built: s.files,
          log: pushLog(s.log, `✓ hmr /sketch ${HMR_TIMES[s.hmr % HMR_TIMES.length]}ms`),
          hmr: s.hmr + 1,
        }))
      }, HAND_HMR_MS)
    }
  }

  // Drawing is the app's own gesture: the pixel shows instantly (client
  // state), the save handler writes the file after a beat, and the dev
  // server's reload is a no-op — the page already looked like this. The
  // write is what made it real.
  function drawPixel(x: number, y: number) {
    const k = key(x, y)
    setDrawBuf((b) => (b.includes(k) ? b.filter((p) => p !== k) : [...b, k]))
    if (!saveTimer.current) saveTimer.current = window.setTimeout(fireSave, SAVE_MS)
  }

  function fireSave() {
    saveTimer.current = null
    const toggles = drawBufRef.current
    if (toggles.length === 0) return
    setDrawBuf([])
    setInflight((f) => [...f, ...toggles])
    setSim((s) => {
      let pixels = s.files.px.present ? [...s.files.px.pixels] : []
      for (const k of toggles) {
        pixels = pixels.includes(k) ? pixels.filter((p) => p !== k) : [...pixels, k]
      }
      return {
        ...s,
        files: { ...s.files, px: { ...s.files.px, present: true, mtime: now(), pixels } },
        log: pushLog(s.log, '✎ write sketch.px (app save)'),
        writes: s.writes + 1,
      }
    })
    if (!noopTimer.current) noopTimer.current = window.setTimeout(fireNoop, HAND_HMR_MS)
  }

  function fireNoop() {
    noopTimer.current = null
    // built := files covers every completed write, so nothing stays inflight.
    setInflight([])
    setSim((s) => ({
      ...s,
      built: s.files,
      log: pushLog(s.log, '✓ hmr /sketch — no-op'),
      hmr: s.hmr + 1,
    }))
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
    for (const t of [handTimer, hmrTimer, saveTimer, noopTimer]) {
      if (t.current) {
        clearTimeout(t.current)
        t.current = null
      }
    }
    setHandActive(false)
    setDrawBuf([])
    setInflight([])
    setSim(INITIAL)
  }

  const writing = sim.phase === 'write'
  const building = sim.phase === 'build'
  const patchFile = writing && sim.plan ? sim.plan.steps[sim.step].file : null

  const nodes: Node[] = [
    {
      id: 'history',
      type: 'devHistory',
      position: { x: -20, y: 20 },
      data: { msgs: sim.msgs, reading: sim.phase === 'prompt' },
    },
    {
      id: 'llm',
      type: 'devLlm',
      position: { x: 0, y: 260 },
      data: { phase: sim.phase, stepLog: writing && sim.plan ? sim.plan.steps[sim.step].log : null },
    },
    {
      id: 'save',
      type: 'devSave',
      position: { x: 290, y: 60 },
      data: { buffered: drawBuf.length, writing: inflight.length > 0 },
    },
    {
      id: 'files',
      type: 'devFiles',
      position: { x: 230, y: 230 },
      data: { files: sim.files, patchFile, handActive: handActive || inflight.length > 0 },
    },
    {
      id: 'terminal',
      type: 'devTerminal',
      position: { x: 470, y: 290 },
      data: { log: sim.log, building },
    },
    {
      id: 'browser',
      type: 'devBrowser',
      position: { x: 500, y: 0 },
      data: { built: sim.built, overlay: [...drawBuf, ...inflight], onDraw: drawPixel },
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
      label: 'patch — code · data',
      animated: writing,
      style: writing ? { stroke: violet, strokeWidth: 1.5 } : undefined,
      ...label,
    },
    {
      id: 'draws',
      source: 'browser',
      sourceHandle: 'persist',
      target: 'save',
      label: 'draws',
      animated: drawBuf.length > 0,
      style: drawBuf.length > 0 ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5, stroke: teal },
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
      animated: writing || building || handActive || inflight.length > 0,
      style:
        writing || building || handActive || inflight.length > 0
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
      animated: building || handActive || inflight.length > 0,
      style:
        building || handActive || inflight.length > 0
          ? { stroke: emerald, strokeWidth: 1.5 }
          : undefined,
      ...label,
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <DemoFrame
      title="Same prompt, new patch"
      hint={
        <>
          <span className="block">
            This whole system is the harness, and you are its engineer: the prompt button and the
            page itself are your two hands. Press Prompt repeatedly — &ldquo;keep going&rdquo;
            every time, a different patch every time, because the LLM reads the <em>filesystem</em>,
            not your intent. The first run interleaves the strata: pixel patches (data) woven
            with app features in{' '}
            <code className="font-mono text-xs">page.tsx</code> (code). Draw directly on the
            page and the pixel shows instantly — the app&rsquo;s own client state — then the
            save handler writes <code className="font-mono text-xs">sketch.px</code> a beat
            later, and the dev server&rsquo;s reload is a <em>no-op</em>: nothing you could see
            changed, but the write made the drawing real. rm{' '}
            <code className="font-mono text-xs">page.tsx</code> and one prompt recovers the
            route with your art intact; the features are gone with the deleted file, and the
            rebuild runs nondeterministically — the same two words, disambiguated by nothing but
            the filesystem and chance.
          </span>
          <span className="mt-2 block">
            Notice what keeps this loop clean. Every effect — the LLM&rsquo;s patches, your
            draws — must land in the filesystem as a coherent snapshot before anything
            downstream sees it; write-bursts buffer and fold into no-ops; and the site has no
            channel to the LLM at all — the loop closes only through you. A naive harness skips
            these guards and thrashes: the dev server rebuilding mid-write, the model re-prompted
            by its own uncommitted output, noise compounding into the very context it works from.
            Persistent effects, guarded at the fold: that is the seed of the refladic loop, and
            the next demo grows it — the site steering the LLM, safely, through the same filesystem.
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
          {sim.prompts} prompts · {sim.writes} writes
        </span>
      </div>
    </DemoFrame>
  )
}
