'use client'

import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon, TrashIcon } from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { DemoFrame } from '../demo-frame'

// Section 2.4, second demo: the base application grows a return path — and
// not a single new channel. The lesson is a SEPARATION: staging context is
// one act, driving a response is another, and this loop keeps them apart.
// The app's request chips STAGE — they persist a wish into steer.md through
// the same buffered save handler (a true no-op reload: requests render
// nothing), where it sits in the filesystem, inspectable and replaceable, waking
// no one. The prompt DRIVES — the LLM reads the filesystem, finds whatever is
// staged, honors it, and consumes it (rm steer.md in the same patch,
// exactly-once). Press a chip ten times before prompting: one consumption.
// A naive harness fuses the two acts and every UI twitch becomes a model
// call; here the site steers without ever touching the wheel mid-turn. The
// refladic loop takes its first step.

const GRID = 8

type Stratum = 'code' | 'prose' | 'data'
type FileKey = 'page' | 'px' | 'steer'

const STRATUM_DOT: Record<Stratum, string> = {
  code: 'bg-amber-500/80',
  prose: 'bg-violet-500/80',
  data: 'bg-sky-500/80',
}
const FILE_META: { key: FileKey; name: string; stratum: Stratum }[] = [
  { key: 'page', name: 'page.tsx', stratum: 'code' },
  { key: 'px', name: 'sketch.px', stratum: 'data' },
  { key: 'steer', name: 'steer.md', stratum: 'prose' },
]

// The repertoire, carried over from the base application.
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

// The requests the app can raise. Each is honored by a patch, then consumed.
// The chips aren't there at first: where the base application grew cosmetic
// features (amber, scanlines), this one grows its own steering controls.
const REQUESTS = ['toggle frame', 'surprise me'] as const
type Request = (typeof REQUESTS)[number]
const REQ_FEATURE: Record<Request, string> = {
  'toggle frame': 'req-frame',
  'surprise me': 'req-surprise',
}

type Files = {
  page: { present: boolean; mtime: string | null; features: string[] }
  px: { present: boolean; mtime: string | null; pixels: string[]; face: Face | null }
  steer: { present: boolean; mtime: string | null; requests: Request[] }
}

const now = () => new Date().toLocaleTimeString([], { hour12: false })

// This demo picks up where the base application left off: a developed filesystem.
const SEED: Files = {
  page: { present: true, mtime: 'earlier', features: ['status'] },
  px: {
    present: true,
    mtime: 'earlier',
    pixels: FACE_PX.smiley.map(([x, y]) => key(x, y)),
    face: 'smiley',
  },
  steer: { present: false, mtime: null, requests: [] },
}

// The view is a pure function of file contents. steer.md renders NOTHING —
// which is exactly why its save round-trips as a true no-op.
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

type Step = { file: FileKey; log: string; mutate: (f: Files) => Files }
type Plan = { intent: string; steps: Step[] }

const write = (file: FileKey, log: string, mutate: (f: Files) => Files): Step => ({ file, log, mutate })
const writePx = (log: string, px: (p: Files['px']) => Partial<Files['px']>): Step =>
  write('px', log, (g) => ({ ...g, px: { ...g.px, present: true, mtime: now(), ...px(g.px) } }))

// Consumption: the requests leave the filesystem in the same patch that honors them.
const consume: Step = write('steer', '✎ rm steer.md (consumed)', (g) => ({
  ...g,
  steer: { present: false, mtime: null, requests: [] },
}))

const setFace = (face: Face): Step =>
  writePx('✎ write sketch.px', (p) => ({
    pixels: union(p.face ? minus(p.pixels, FACE_PX[p.face]) : p.pixels, FACE_PX[face]),
    face,
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

// The LLM reads the filesystem; a pending request outranks everything.
// Without one, "keep going" grows the page's own steering controls — the
// features here are self-steering, not cosmetic — then walks the repertoire.
function decide(f: Files): Plan {
  if (f.steer.present && f.steer.requests.length > 0) {
    // Every staged request is honored, in the order staged, in one patch —
    // then the whole set is consumed together.
    const steps: Step[] = f.steer.requests.map((req) => {
      if (req === 'toggle frame')
        return writePx('✎ write sketch.px', (p) => {
          const framed = BORDER.every(([x, y]) => p.pixels.includes(key(x, y)))
          return { pixels: framed ? minus(p.pixels, BORDER) : union(p.pixels, BORDER) }
        })
      const options = FACE_CYCLE.filter((fc) => fc !== f.px.face)
      return setFace(options[Math.floor(Math.random() * options.length)])
    })
    return { intent: `steer: ${f.steer.requests.join(' + ')}`, steps: [...steps, consume] }
  }
  const has = (k: string) => f.page.features.includes(k)
  if (!f.page.present)
    return {
      intent: 'scaffold /sketch',
      steps: [
        write('page', '✎ write page.tsx', (g) => ({
          ...g,
          page: { ...g.page, present: true, mtime: now(), features: [] },
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
  if (!has('req-frame')) return addFeature('req-frame', 'add “toggle frame” to the page')
  if (!has('req-surprise')) return addFeature('req-surprise', 'add “surprise me” to the page')
  if (!has('status')) return addFeature('status', 'add a status bar')
  const next = FACE_CYCLE[(FACE_CYCLE.indexOf(f.px.face as Face) + 1 + FACE_CYCLE.length) % FACE_CYCLE.length]
  return { intent: FACE_INTENT[next], steps: [setFace(next)] }
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
        the words never steer — the filesystem does
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
        a request in the filesystem outranks chance
      </div>
      <Handle id="ctx" type="target" position={Position.Top} className={handleCls} />
      <Handle id="out" type="source" position={Position.Right} className={handleCls} />
    </div>
  )
}

function SaveNode({ data }: NodeProps) {
  const { buffered, hasRequest, writing } = data as {
    buffered: number
    hasRequest: boolean
    writing: boolean
  }
  const active = buffered > 0 || hasRequest || writing
  const body =
    buffered > 0 && hasRequest
      ? `buffering ${buffered} px + request…`
      : buffered > 0
        ? `buffering ${buffered} px…`
        : hasRequest
          ? 'buffering request…'
          : writing
            ? 'POST /save'
            : 'idle'
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
          buffered > 0 || hasRequest
            ? 'animate-pulse bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
            : writing
              ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {body}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        draws and requests, one buffered path
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
        staged context — inspectable until driven
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
        no-ops guard the loop from itself
      </div>
      <Handle type="target" position={Position.Left} className={handleCls} />
      <Handle id="hmr" type="source" position={Position.Top} className={handleCls} />
    </div>
  )
}

function BrowserNode({ data }: NodeProps) {
  const { built, overlay, steerReqs, onDraw, onRequest } = data as {
    built: Files
    overlay: string[]
    steerReqs: Request[]
    onDraw: (x: number, y: number) => void
    onRequest: (r: Request) => void
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
          // No route, no app: the 404 is the whole page — controls included.
          <div className="flex flex-col items-center justify-center gap-0.5 py-9">
            <span className="font-mono text-xl font-semibold text-zinc-400">404</span>
            <span className="font-mono text-[8px] text-zinc-500">nothing at /sketch — the route is gone</span>
            <span className="font-mono text-[8px] text-zinc-600">(its state is not)</span>
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
            {/* the app raises requests — into a file. Each chip exists only
                once the LLM has grown it into page.tsx. */}
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
        the app stages its wishes — into a file
      </div>
      <Handle type="target" position={Position.Bottom} className={handleCls} />
      <Handle id="persist" type="source" position={Position.Left} className={handleCls} />
    </div>
  )
}

const nodeTypes = {
  steerHistory: HistoryNode,
  steerLlm: LlmNode,
  steerSave: SaveNode,
  steerFiles: FilesNode,
  steerTerminal: TerminalNode,
  steerBrowser: BrowserNode,
}

// ---- the demo -----------------------------------------------------------

export function SteerLoopDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [drawBuf, setDrawBuf] = useState<string[]>([])
  const [inflight, setInflight] = useState<string[]>([])
  const [reqBuf, setReqBuf] = useState<Request[] | null>(null)
  const [handActive, setHandActive] = useState(false)
  const drawBufRef = useRef(drawBuf)
  drawBufRef.current = drawBuf
  const reqBufRef = useRef(reqBuf)
  reqBufRef.current = reqBuf
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
        plan: decide(s.files),
        step: 0,
        phase: 'prompt',
        msgs: [...s.msgs, { role: 'prompt', text: 'keep going' }],
      }
    })
  }

  // The app's gestures — draws and requests — share one buffered save path.
  function scheduleSave() {
    if (!saveTimer.current) saveTimer.current = window.setTimeout(fireSave, SAVE_MS)
  }

  function drawPixel(x: number, y: number) {
    const k = key(x, y)
    setDrawBuf((b) => (b.includes(k) ? b.filter((p) => p !== k) : [...b, k]))
    scheduleSave()
  }

  // Chips toggle, multi-select: the buffer holds the full desired set, and
  // the save writes it (or rm's the file when the set empties).
  function requestChip(r: Request) {
    const current = reqBufRef.current ?? (sim.files.steer.present ? sim.files.steer.requests : [])
    setReqBuf(current.includes(r) ? current.filter((x) => x !== r) : [...current, r])
    scheduleSave()
  }

  function fireSave() {
    saveTimer.current = null
    const toggles = drawBufRef.current
    const reqs = reqBufRef.current
    if (toggles.length === 0 && reqs === null) return
    setDrawBuf([])
    setReqBuf(null)
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

  // The rm levers are the engineer's hand at the terminal, as in the base
  // application: immediate writes, and a real (not no-op) reload.
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
    setHandActive(false)
    setSim(INITIAL)
  }

  const writing = sim.phase === 'write'
  const building = sim.phase === 'build'
  const patchFile = writing && sim.plan ? sim.plan.steps[sim.step].file : null
  const steerReqs = reqBuf ?? (sim.files.steer.present ? sim.files.steer.requests : [])

  const nodes: Node[] = [
    {
      id: 'history',
      type: 'steerHistory',
      position: { x: -20, y: 20 },
      data: { msgs: sim.msgs, reading: sim.phase === 'prompt' },
    },
    {
      id: 'llm',
      type: 'steerLlm',
      position: { x: 0, y: 260 },
      data: { phase: sim.phase, stepLog: writing && sim.plan ? sim.plan.steps[sim.step].log : null },
    },
    {
      id: 'save',
      type: 'steerSave',
      position: { x: 290, y: 60 },
      data: { buffered: drawBuf.length, hasRequest: reqBuf !== null, writing: inflight.length > 0 },
    },
    {
      id: 'files',
      type: 'steerFiles',
      position: { x: 230, y: 230 },
      data: { files: sim.files, patchFile, saving: inflight.length > 0 || handActive },
    },
    {
      id: 'terminal',
      type: 'steerTerminal',
      position: { x: 470, y: 290 },
      data: { log: sim.log, building },
    },
    {
      id: 'browser',
      type: 'steerBrowser',
      position: { x: 500, y: 0 },
      data: {
        built: sim.built,
        overlay: [...drawBuf, ...inflight],
        steerReqs,
        onDraw: drawPixel,
        onRequest: requestChip,
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
      label: 'patch — honor · consume',
      animated: writing,
      style: writing ? { stroke: violet, strokeWidth: 1.5 } : undefined,
      ...label,
    },
    {
      id: 'draws',
      source: 'browser',
      sourceHandle: 'persist',
      target: 'save',
      label: 'draws · requests',
      animated: drawBuf.length > 0 || reqBuf !== null,
      style:
        drawBuf.length > 0 || reqBuf !== null
          ? { stroke: teal, strokeWidth: 1.5 }
          : { opacity: 0.5, stroke: teal },
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
      title="Steering through the filesystem"
      hint={
        <>
          <span className="block">
            The base application, one feature later: the page has request chips. Press one and
            watch what does <em>not</em> happen — no message is sent, no model wakes. The wish
            persists into <code className="font-mono text-xs">steer.md</code> through the same
            buffered save handler (a true no-op reload: requests render nothing), and sits in
            the filesystem, inspectable, doing nothing. Then press Prompt: the LLM reads the
            filesystem, finds the request, honors it — and <em>consumes</em> it, rm&rsquo;ing{' '}
            <code className="font-mono text-xs">steer.md</code> in the same patch. Press a chip
            ten times before prompting: still one consumption. And the chips are not given —
            where the base application grew cosmetic features, here &ldquo;keep going&rdquo;
            grows the page&rsquo;s own <em>steering controls</em>, one code patch at a time,
            before walking the repertoire. The rm buttons below work as before — your hand at
            the terminal, immediate, a real reload — and rm{' '}
            <code className="font-mono text-xs">page.tsx</code> takes the steering controls
            down with it, because they lived in the deleted file: the page loses the ability to
            wish until the loop grows it back.
          </span>
          <span className="mt-2 block">
            The lesson is a separation: <em>staging context</em> and <em>driving a response</em>{' '}
            are two different acts, and this loop keeps them apart. The chips stage — intent
            lands in the filesystem, buffered, inspectable, replaceable, waking no one. The prompt
            drives — it pulls whatever is staged into exactly one response. Compare the diagram
            with the previous demo&rsquo;s: same nodes, same edges; the site steers the LLM with
            no new channel, because the steering is a file. A naive harness fuses the two acts,
            and every flicker of UI becomes a model call; here the UI can stage all day and the
            model runs only when driven. The message history stays clean; the filesystem carries the
            intent. This is the refladic loop taking its first step.
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
          {sim.prompts} prompts · {sim.writes} writes · {sim.steered} steered
        </span>
      </div>
    </DemoFrame>
  )
}
