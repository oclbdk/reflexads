'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { Unit } from '../prose'
import { Em, WidgetFrame } from '../widget-frame'

// REFLEXAD your digital pet — the care stack as a continuous game, with the
// site's own trinity as its economy. The pet bridges both systems on its own;
// original artworks earn supplies that cycle through code, prose, and data;
// and each type cares for the facet it governs: code feeds its energy, prose
// briefs its focus (low focus and it misroutes folds), data curates its
// hygiene (dirty memory garbles what it carries). Duplicates earn nothing —
// a neglected pet starves the very economy that feeds it.

const GRID = 8

type Role = 'eng' | 'llm' | 'cpu' | 'ref'
type Unit = { role: Role; label: string }
type SysKey = 'a' | 'b'
type Resource = 'code' | 'prose' | 'data'

const CHIP: Record<Role, string> = {
  eng: 'bg-teal-400',
  llm: 'bg-violet-400',
  cpu: 'bg-reflex-500',
  ref: 'bg-amber-400',
}
const ROLE_TEXT: Record<'eng' | 'llm' | 'cpu', string> = {
  eng: 'text-teal-600 dark:text-teal-400',
  llm: 'text-violet-600 dark:text-violet-400',
  cpu: 'text-reflex-600 dark:text-reflex-500',
}
const RES_TEXT: Record<Resource, string> = {
  code: 'text-amber-600 dark:text-amber-400',
  prose: 'text-violet-600 dark:text-violet-400',
  data: 'text-sky-600 dark:text-sky-400',
}
const RES_BG: Record<Resource, string> = {
  code: 'bg-amber-500/15',
  prose: 'bg-violet-500/15',
  data: 'bg-sky-500/15',
}

type Op = { text: string; kind: 'clr' | 'px'; x?: number; y?: number }
const px = (x: number, y: number): Op => ({ text: `PX ${x},${y}`, kind: 'px', x, y })
const CLR: Op = { text: 'CLR', kind: 'clr' }

const REPERTOIRE: { name: string; ops: Op[] }[] = [
  { name: 'smiley', ops: [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
  { name: 'wink', ops: [px(2, 2), px(4, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
  { name: 'grin', ops: [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)] },
  {
    name: 'heart',
    ops: [
      [1, 1], [2, 1], [5, 1], [6, 1], [0, 2], [3, 2], [4, 2], [7, 2],
      [0, 3], [7, 3], [1, 4], [6, 4], [2, 5], [5, 5], [3, 6], [4, 6],
    ].map(([x, y]) => px(x, y)),
  },
  {
    name: 'star',
    ops: [
      [3, 0], [4, 0], [3, 1], [4, 1], [2, 2], [3, 2], [4, 2], [5, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
      [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
      [2, 5], [3, 5], [4, 5], [5, 5], [3, 6], [4, 6], [3, 7], [4, 7],
    ].map(([x, y]) => px(x, y)),
  },
  {
    name: 'ring',
    ops: [
      [2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [6, 2], [1, 3], [6, 3],
      [1, 4], [6, 4], [1, 5], [6, 5], [2, 6], [3, 6], [4, 6], [5, 6],
    ].map(([x, y]) => px(x, y)),
  },
]

function artsIn(units: Unit[]): string[] {
  const found: string[] = []
  for (const art of REPERTOIRE) {
    if (units.some((u) => (u.role === 'llm' || u.role === 'eng') && u.label.includes(art.name)))
      found.push(art.name)
  }
  return found
}

const BRIEF_MS = 1200
const TOKEN_MS = 550
const OP_MS = 200
const OBSERVE_MS = 1200
const READ_MS = 700

const FOLD_ENERGY = 15
const FOLD_FOCUS = 8
const FOLD_RESIDUE = 12
const FEED_GAIN = 35
const BRIEF_GAIN = 40
const DECAY_ENERGY = 0.5
const DECAY_FOCUS = 0.4
const DECAY_HYGIENE = 0.35
const TIMELINE_WINDOW = 36

type Phase = 'brief' | 'read' | 'gen' | 'drain' | 'observe' | null
type Sys = {
  round: number
  roundStart: number
  phase: Phase
  currentArt: string | null
  wasOriginal: boolean
  tokIdx: number
  cpuQueue: Op[]
  currentOp: string | null
  timeline: Unit[]
  knownArts: string[]
  drawnAll: string[]
}
const initialSys = (): Sys => ({
  round: 0,
  roundStart: 0,
  phase: null,
  currentArt: null,
  wasOriginal: false,
  tokIdx: 0,
  cpuQueue: [],
  currentOp: null,
  timeline: [],
  knownArts: [],
  drawnAll: [],
})

type CareKind = Resource | 'fold' | 'skip' | 'star'
type CareUnit = { kind: CareKind; label: string }
type Flash = { from: SysKey; to: SysKey; id: number } | null
type Sim = {
  started: boolean
  a: Sys
  b: Sys
  energy: number
  focus: number
  hygiene: number
  supplies: Record<Resource, number>
  yieldCount: number
  galleries: number
  dupes: number
  careSeq: CareUnit[]
  flash: Flash
}
const INITIAL: Sim = {
  started: false,
  a: initialSys(),
  b: initialSys(),
  energy: 100,
  focus: 100,
  hygiene: 100,
  supplies: { code: 2, prose: 1, data: 1 },
  yieldCount: 0,
  galleries: 0,
  dupes: 0,
  careSeq: [],
  flash: null,
}

// The game runs forever, so storage must not: trim history at round
// boundaries (the render already windows; this bounds memory too).
const MAX_STORED = 240
const TRIM_TO = 160

function enterRead(sys: Sys, round: number): Sys {
  const base = sys.timeline.length > MAX_STORED ? sys.timeline.slice(-TRIM_TO) : sys.timeline
  const timeline = [...base, { role: 'eng' as Role, label: `run round ${round}` }]
  return { ...sys, round, roundStart: timeline.length - 1, timeline, tokIdx: 0, phase: 'read' }
}

function careAppend(seq: CareUnit[], unit: CareUnit): CareUnit[] {
  const next = [...seq, unit]
  return next.length > 80 ? next.slice(-40) : next
}

// The pet's move: sample the just-finished round and inject it onward — if it
// has the energy; toward the right system only if it has the focus; carrying
// the payload only as well as its memory is clean.
function petFold(s: Sim, key: SysKey): Sim {
  const K = key.toUpperCase()
  if (s.energy < FOLD_ENERGY) {
    return { ...s, careSeq: careAppend(s.careSeq, { kind: 'skip', label: `✗ skipped fold from ${K} — too hungry` }) }
  }
  const confused = s.focus < 40
  const other: SysKey = confused ? key : key === 'a' ? 'b' : 'a'
  const O = other.toUpperCase()
  const cur = s[key]
  const span = cur.timeline.slice(cur.roundStart)
  const arts = artsIn(span)
  const q = s.hygiene
  const carried = q >= 60 ? arts : q >= 30 ? (Math.random() < 0.5 ? arts : []) : []
  const tag = confused
    ? ' (confused — fed it back to its maker)'
    : q >= 60
      ? ''
      : q >= 30
        ? ' (sloppy)'
        : ' (garbled)'
  const tgt = s[other]
  const knownArts = [...new Set([...tgt.knownArts, ...carried])]
  const base = {
    ...s,
    energy: Math.max(0, s.energy - FOLD_ENERGY),
    focus: Math.max(0, s.focus - FOLD_FOCUS),
    hygiene: Math.max(0, s.hygiene - FOLD_RESIDUE),
    careSeq: careAppend(s.careSeq, {
      kind: 'fold' as CareKind,
      label: `⟲ ${K}→${O}: ${carried.join(' · ') || 'nothing carried'}${tag}`,
    }),
    flash: { from: key, to: other, id: (s.flash?.id ?? 0) + 1 },
  }
  if (other === key) {
    // A confused fold lands back where it came from — recorded, useless.
    return {
      ...base,
      [key]: {
        ...cur,
        timeline: [
          ...cur.timeline,
          { role: 'ref' as Role, label: `⟲ pet sampled r${cur.round}` },
          { role: 'ref' as Role, label: `⟲ inject ← ${K} (itself)${tag}` },
        ],
      },
    }
  }
  return {
    ...base,
    [key]: {
      ...cur,
      timeline: [...cur.timeline, { role: 'ref' as Role, label: `⟲ pet sampled r${cur.round}` }],
    },
    [other]: {
      ...tgt,
      timeline: [
        ...tgt.timeline,
        { role: 'ref' as Role, label: `⟲ inject ← ${K}: ${carried.join(' · ') || 'nothing'}${tag}` },
      ],
      knownArts,
    },
  }
}

// ---- custom nodes -------------------------------------------------------

function RolesNode({ data }: NodeProps) {
  const { title, rows, folded } = data as {
    title: string
    rows: { role: 'eng' | 'llm' | 'cpu'; current: string | null; active: boolean }[]
    folded: boolean
  }
  return (
    <div
      className={clsx(
        'w-52 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        folded ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        {title}
      </div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.role} className="flex items-center gap-1.5">
            <span className={clsx('w-7 shrink-0 font-mono text-[9px] uppercase', ROLE_TEXT[r.role])}>
              {r.role}
            </span>
            <span
              className={clsx(
                'min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 font-mono text-[10px]',
                r.active && r.current
                  ? clsx(
                      'font-semibold',
                      ROLE_TEXT[r.role],
                      r.role === 'eng' ? 'bg-teal-500/15' : r.role === 'llm' ? 'bg-violet-500/15' : 'bg-reflex-500/15',
                    )
                  : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
              )}
            >
              {r.current ?? 'idle'}
            </span>
          </div>
        ))}
      </div>
      <Handle id="emit" type="source" position={Position.Bottom} style={{ left: '50%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fold" type="target" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="foldL" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const EYES: [number, number][] = [[2, 2], [5, 2]]
const FAINT_EYES: [number, number][] = [[1, 2], [2, 2], [4, 2], [5, 2]]
const MOUTHS: Record<'happy' | 'weary' | 'distressed', [number, number][]> = {
  happy: [[1, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5]],
  weary: [[2, 5], [3, 5], [4, 5], [5, 5]],
  distressed: [[2, 4], [3, 4], [4, 4], [5, 4], [1, 5], [6, 5]],
}
const GRIME: [number, number][] = [[0, 0], [7, 1], [0, 6], [6, 7], [7, 4]]

function PetNode({ data }: NodeProps) {
  const { energy, focus, hygiene, working } = data as {
    energy: number
    focus: number
    hygiene: number
    working: boolean
  }
  const vitality = Math.min(energy, focus, hygiene)
  const mood = vitality > 60 ? 'happy' : vitality > 30 ? 'weary' : 'distressed'
  const fainted = energy <= 1
  const face = new Set<string>()
  for (const [x, y] of fainted ? FAINT_EYES : EYES) face.add(`${x},${y}`)
  for (const [x, y] of MOUTHS[fainted ? 'distressed' : mood]) face.add(`${x},${y}`)
  const grime = new Set<string>()
  if (hygiene < 50) for (const [x, y] of GRIME) grime.add(`${x},${y}`)
  const bar = (label: string, v: number, base: string) => (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-left font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', v > 30 ? base : 'bg-rose-400')}
          style={{ width: `${Math.round(v)}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[9px] text-zinc-400 tabular-nums dark:text-zinc-500">
        {Math.round(v)}
      </span>
    </div>
  )
  return (
    <div
      className={clsx(
        'w-52 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        working ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-center text-[10px]/4 font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
        REFLEXAD
      </div>
      <div className="text-center font-mono text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        your digital pet
      </div>
      <div className="mx-auto mt-1 w-fit rounded-md bg-zinc-950 p-1.5">
        <div className="grid grid-cols-8 gap-px">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const key = `${i % GRID},${Math.floor(i / GRID)}`
            const on = face.has(key)
            const dirty = grime.has(key)
            return (
              <div
                key={i}
                className={clsx(
                  'size-2 rounded-[1px] transition-colors duration-300',
                  on
                    ? mood === 'distressed' || fainted
                      ? 'bg-rose-400 shadow-[0_0_4px] shadow-rose-400/60'
                      : 'bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60'
                    : dirty
                      ? 'bg-amber-600/70'
                      : 'bg-zinc-800',
                )}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 space-y-1">
        {bar('energy', energy, 'bg-amber-400')}
        {bar('focus', focus, 'bg-violet-400')}
        {bar('hygiene', hygiene, 'bg-sky-400')}
      </div>
      <div className="mt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        fed by code · briefed by prose · curated by data
      </div>
      <Handle id="spanA" type="target" position={Position.Left} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="outA" type="source" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="spanB" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="outB" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const CARE_STYLE: Record<CareKind, string> = {
  code: 'text-amber-600 dark:text-amber-400',
  prose: 'text-violet-600 dark:text-violet-400',
  data: 'text-sky-600 dark:text-sky-400',
  fold: 'text-amber-600 dark:text-amber-400',
  skip: 'text-rose-600 dark:text-rose-400',
  star: 'text-emerald-600 dark:text-emerald-400',
}

function CareSeqNode({ data }: NodeProps) {
  const { careSeq } = data as { careSeq: CareUnit[] }
  const WINDOW = 6
  const start = Math.max(0, careSeq.length - WINDOW)
  const window = careSeq.slice(start)
  return (
    <div className="w-52 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        The care sequence
      </div>
      <ol className="font-mono text-[9px]/4">
        {window.map((u, i) => (
          <li key={start + i} className={clsx('truncate px-1', CARE_STYLE[u.kind])}>
            {u.label}
          </li>
        ))}
        {Array.from({ length: WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <div className="mt-1 px-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        your care and its work — one stream
      </div>
    </div>
  )
}

function TimelineNode({ data }: NodeProps) {
  const { sys, timeline } = data as { sys: SysKey; timeline: Unit[] }
  const start = Math.max(0, timeline.length - TIMELINE_WINDOW)
  const window = timeline.slice(start)
  return (
    <div className="w-60 rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-0.5 pb-1.5 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Sequence {sys.toUpperCase()}
      </div>
      <div className="flex min-h-6 flex-wrap content-start gap-[3px]">
        {window.map((u, i) => (
          <span
            key={start + i}
            title={u.label}
            className={clsx('size-2.5 rounded-[2px]', CHIP[u.role], u.role === 'ref' && 'ring-1 ring-amber-500/60')}
          />
        ))}
        {timeline.length === 0 && (
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">awaiting the baton…</span>
        )}
      </div>
      <div className="mt-1.5 border-t border-zinc-950/5 pt-1 font-mono text-[9px]/4 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        {timeline.length} units
      </div>
      <Handle id="in" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="span" type="source" position={sys === 'a' ? Position.Right : Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function SuppliesNode({ data }: NodeProps) {
  const { supplies } = data as { supplies: Record<Resource, number> }
  return (
    <div className="w-52 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Supplies
      </div>
      <div className="mt-1 flex justify-center gap-1.5">
        {(['code', 'prose', 'data'] as Resource[]).map((r) => (
          <span
            key={r}
            className={clsx(
              'rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold',
              supplies[r] > 0 ? clsx(RES_BG[r], RES_TEXT[r]) : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
            )}
          >
            {r} ×{supplies[r]}
          </span>
        ))}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        original work becomes code, prose, and data — duplicates earn nothing
      </div>
      <Handle id="inA" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="inB" type="target" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  careRoles: RolesNode,
  carePet: PetNode,
  careSeq: CareSeqNode,
  careTimeline: TimelineNode,
  careSupplies: SuppliesNode,
}

// ---- the widget ---------------------------------------------------------

export function ReflexadCareWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // The pet naps while the tab is hidden: no timers run in the background, so
  // browser throttling can never burst-replay a backlog of game transitions —
  // and it isn't fair to let it starve while nobody can care for it.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    onChange()
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  function useSystemClocks(key: SysKey) {
    const sys = sim[key]

    useEffect(() => {
      if (!visible || !sys.phase || sys.phase === 'gen' || sys.phase === 'drain') return
      const ms = sys.phase === 'brief' ? BRIEF_MS : sys.phase === 'read' ? READ_MS : OBSERVE_MS
      const t = setTimeout(() => {
        setSim((s) => {
          const cur = s[key]
          switch (cur.phase) {
            case 'brief':
              return { ...s, [key]: enterRead(cur, 1) }
            case 'read': {
              const known = new Set([...cur.knownArts, ...cur.drawnAll])
              const art = REPERTOIRE.find((a) => !known.has(a.name))?.name ?? REPERTOIRE[0].name
              const combined = new Set([...s.a.drawnAll, ...s.b.drawnAll])
              const original = !combined.has(art)
              return {
                ...s,
                dupes: s.dupes + (original ? 0 : 1),
                [key]: {
                  ...cur,
                  phase: 'gen',
                  currentArt: art,
                  wasOriginal: original,
                  drawnAll: [...cur.drawnAll, art],
                  tokIdx: 0,
                },
              }
            }
            case 'observe': {
              // Original work earns the next supply in the cycle; the pet
              // folds; an exhibition resets the gallery; the baton passes.
              let s2: Sim = s
              if (cur.wasOriginal) {
                const type = (['code', 'prose', 'data'] as Resource[])[s.yieldCount % 3]
                s2 = {
                  ...s2,
                  yieldCount: s2.yieldCount + 1,
                  supplies: { ...s2.supplies, [type]: s2.supplies[type] + 1 },
                }
              }
              s2 = petFold(s2, key)
              const unique = new Set([...s2.a.drawnAll, ...s2.b.drawnAll])
              if (unique.size >= REPERTOIRE.length) {
                s2 = {
                  ...s2,
                  galleries: s2.galleries + 1,
                  supplies: {
                    code: s2.supplies.code + 1,
                    prose: s2.supplies.prose + 1,
                    data: s2.supplies.data + 1,
                  },
                  careSeq: careAppend(s2.careSeq, { kind: 'star', label: '★ exhibition! +1 of each supply' }),
                  a: { ...s2.a, drawnAll: [], knownArts: [] },
                  b: { ...s2.b, drawnAll: [], knownArts: [] },
                }
              }
              const cur2 = s2[key]
              const other: SysKey = key === 'a' ? 'b' : 'a'
              let oth = s2[other]
              let next: Sim = { ...s2, [key]: { ...cur2, phase: null } }
              // Baton guard: only hand off if the other system is truly idle
              // (a throttled-timer burst must never double-run a system).
              if (oth.phase === null) {
                if (oth.round === 0) {
                  oth = { ...oth, timeline: [{ role: 'eng', label: 'brief: keep making new art' }] }
                }
                next = { ...next, [other]: enterRead(oth, oth.round + 1) }
              }
              return next
            }
            default:
              return s
          }
        })
      }, ms)
      return () => clearTimeout(t)
    }, [sys.phase, visible])

    useEffect(() => {
      if (!visible || sys.phase !== 'gen') return
      const t = setInterval(() => {
        setSim((s) => {
          const cur = s[key]
          if (cur.phase !== 'gen' || !cur.currentArt) return s
          const art = REPERTOIRE.find((a) => a.name === cur.currentArt)!
          const tokens = [
            { text: 'clear', ops: [CLR] },
            { text: art.name, ops: art.ops },
          ]
          const tok = tokens[cur.tokIdx]
          if (!tok) return { ...s, [key]: { ...cur, phase: 'drain' } }
          return {
            ...s,
            [key]: {
              ...cur,
              timeline: [...cur.timeline, { role: 'llm' as Role, label: `t${cur.tokIdx} ${tok.text}` }],
              cpuQueue: [...cur.cpuQueue, ...tok.ops],
              tokIdx: cur.tokIdx + 1,
              phase: cur.tokIdx + 1 < tokens.length ? 'gen' : 'drain',
            },
          }
        })
      }, TOKEN_MS)
      return () => clearInterval(t)
    }, [sys.phase, visible])

    const busy = sys.cpuQueue.length > 0 || sys.currentOp !== null
    useEffect(() => {
      if (!visible || !busy) return
      const t = setInterval(() => {
        setSim((s) => {
          const cur = s[key]
          const [op, ...rest] = cur.cpuQueue
          if (!op) return { ...s, [key]: { ...cur, currentOp: null } }
          return {
            ...s,
            [key]: {
              ...cur,
              cpuQueue: rest,
              currentOp: op.text,
              timeline: [...cur.timeline, { role: 'cpu' as Role, label: op.text }],
            },
          }
        })
      }, OP_MS)
      return () => clearInterval(t)
    }, [busy, visible])

    useEffect(() => {
      if (!visible || sys.phase !== 'drain' || busy) return
      const t = setTimeout(
        () =>
          setSim((s) => {
            const cur = s[key]
            return cur.phase === 'drain'
              ? {
                  ...s,
                  [key]: {
                    ...cur,
                    phase: 'observe',
                    timeline: [...cur.timeline, { role: 'eng' as Role, label: `observe: ${cur.currentArt} ✓` }],
                  },
                }
              : s
          }),
        300,
      )
      return () => clearTimeout(t)
    }, [sys.phase, busy, visible])

    return busy
  }

  const busyA = useSystemClocks('a')
  const busyB = useSystemClocks('b')
  const running = sim.started

  // The pet's metabolism, always on while the game runs.
  useEffect(() => {
    if (!running || !visible) return
    const t = setInterval(() => {
      setSim((s) => ({
        ...s,
        energy: Math.max(0, s.energy - DECAY_ENERGY),
        focus: Math.max(0, s.focus - DECAY_FOCUS),
        hygiene: Math.max(0, s.hygiene - DECAY_HYGIENE),
      }))
    }, 1000)
    return () => clearInterval(t)
  }, [running, visible])

  useEffect(() => {
    if (!sim.flash) return
    const t = setTimeout(() => setSim((s) => ({ ...s, flash: null })), 1200)
    return () => clearTimeout(t)
  }, [sim.flash?.id])

  function start() {
    setSim({
      ...INITIAL,
      started: true,
      a: { ...initialSys(), phase: 'brief', timeline: [{ role: 'eng', label: 'brief: keep making new art' }] },
      b: initialSys(),
    })
  }

  function reset() {
    setSim(INITIAL)
  }

  function spend(type: Resource) {
    setSim((s) => {
      if (s.supplies[type] < 1) return s
      const supplies = { ...s.supplies, [type]: s.supplies[type] - 1 }
      if (type === 'code')
        return {
          ...s,
          supplies,
          energy: Math.min(100, s.energy + FEED_GAIN),
          careSeq: careAppend(s.careSeq, { kind: 'code', label: `you: fed code (+${FEED_GAIN} energy)` }),
        }
      if (type === 'prose')
        return {
          ...s,
          supplies,
          focus: Math.min(100, s.focus + BRIEF_GAIN),
          careSeq: careAppend(s.careSeq, { kind: 'prose', label: `you: briefed prose (+${BRIEF_GAIN} focus)` }),
        }
      return {
        ...s,
        supplies,
        hygiene: 100,
        careSeq: careAppend(s.careSeq, { kind: 'data', label: 'you: curated data (memory → 100)' }),
      }
    })
  }

  const coverage = new Set([...sim.a.drawnAll, ...sim.b.drawnAll]).size
  const vitality = Math.min(sim.energy, sim.focus, sim.hygiene)
  const mood = sim.energy <= 1 ? 'fainted' : vitality > 60 ? 'happy' : vitality > 30 ? 'weary' : 'distressed'

  const sysRows = (key: SysKey, busy: boolean) => {
    const sys = sim[key]
    const engActive = sys.phase === 'brief' || sys.phase === 'observe'
    const llmActive = sys.phase === 'read' || sys.phase === 'gen'
    return [
      {
        role: 'eng' as const,
        current: engActive ? (sys.phase === 'brief' ? 'brief' : `observe: ${sys.currentArt} ✓`) : null,
        active: engActive,
      },
      {
        role: 'llm' as const,
        current: sys.phase === 'read' ? 'reading' : sys.phase === 'gen' ? sys.currentArt : null,
        active: llmActive,
      },
      { role: 'cpu' as const, current: busy ? sys.currentOp : null, active: busy },
    ]
  }

  const nodes: Node[] = [
    {
      id: 'rolesA',
      type: 'careRoles',
      position: { x: 0, y: 0 },
      data: { title: 'System A', rows: sysRows('a', busyA), folded: sim.flash?.to === 'a' },
    },
    {
      id: 'rolesB',
      type: 'careRoles',
      position: { x: 640, y: 0 },
      data: { title: 'System B', rows: sysRows('b', busyB), folded: sim.flash?.to === 'b' },
    },
    {
      id: 'pet',
      type: 'carePet',
      position: { x: 320, y: 0 },
      data: { energy: sim.energy, focus: sim.focus, hygiene: sim.hygiene, working: sim.flash !== null },
    },
    { id: 'careSeq', type: 'careSeq', position: { x: 320, y: 330 }, data: { careSeq: sim.careSeq } },
    { id: 'tlA', type: 'careTimeline', position: { x: 0, y: 140 }, data: { sys: 'a', timeline: sim.a.timeline } },
    { id: 'tlB', type: 'careTimeline', position: { x: 655, y: 140 }, data: { sys: 'b', timeline: sim.b.timeline } },
    {
      id: 'supplies',
      type: 'careSupplies',
      position: { x: 320, y: 490 },
      data: { supplies: sim.supplies },
    },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const sysEdges = (key: SysKey, busy: boolean): Edge[] => {
    const sys = sim[key]
    const active = sys.phase !== null || busy
    const roles = key === 'a' ? 'rolesA' : 'rolesB'
    const tl = key === 'a' ? 'tlA' : 'tlB'
    const yielding = sys.phase === 'observe' && sys.wasOriginal
    return [
      {
        id: `emit-${key}`,
        source: roles,
        sourceHandle: 'emit',
        target: tl,
        targetHandle: 'in',
        animated: active,
        style: active ? { stroke: violet, strokeWidth: 1 } : { opacity: 0.35 },
      },
      {
        id: `yield-${key}`,
        source: tl,
        sourceHandle: 'fx',
        target: 'supplies',
        targetHandle: key === 'a' ? 'inA' : 'inB',
        label: yielding ? '+1 supply' : undefined,
        animated: yielding,
        labelStyle: { fontSize: 9 },
        labelBgStyle: { fillOpacity: 0 },
        style: yielding ? { stroke: emerald, strokeWidth: 1.5 } : { opacity: 0.3 },
      },
    ]
  }
  const edges: Edge[] = [
    ...sysEdges('a', busyA),
    ...sysEdges('b', busyB),
    {
      id: 'span-a',
      source: 'tlA',
      sourceHandle: 'span',
      target: 'pet',
      targetHandle: 'spanA',
      label: sim.flash?.from === 'a' ? 'sampled' : undefined,
      animated: sim.flash?.from === 'a',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.flash?.from === 'a' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.3 },
    },
    {
      id: 'span-b',
      source: 'tlB',
      sourceHandle: 'span',
      target: 'pet',
      targetHandle: 'spanB',
      label: sim.flash?.from === 'b' ? 'sampled' : undefined,
      animated: sim.flash?.from === 'b',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.flash?.from === 'b' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.3 },
    },
    {
      id: 'inject-a',
      source: 'pet',
      sourceHandle: 'outA',
      target: 'rolesA',
      targetHandle: 'fold',
      label: sim.flash?.to === 'a' ? 'inject' : undefined,
      animated: sim.flash?.to === 'a',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.flash?.to === 'a' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.15, strokeDasharray: '4 4' },
    },
    {
      id: 'inject-b',
      source: 'pet',
      sourceHandle: 'outB',
      target: 'rolesB',
      targetHandle: 'foldL',
      label: sim.flash?.to === 'b' ? 'inject' : undefined,
      animated: sim.flash?.to === 'b',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.flash?.to === 'b' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.15, strokeDasharray: '4 4' },
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <WidgetFrame
      title="Reflexad: your digital pet"
      hint={
        <>
          <span className="block">
            The controller is now your digital pet, and the loop is an economy in the site&rsquo;s
            own currency. It bridges the two systems by itself, but folding drains it.
          </span>
          <span className="mt-2 block">
            Each supply type cares for the facet it governs. <Unit kind="code" />{' '}feeds its energy (too
            hungry, it skips folds). <Unit kind="prose" />{' '}briefs its focus (unfocused, it folds
            knowledge back to the system that already had it). <Unit kind="data" />{' '}curates its memory
            (dirty, its folds go sloppy, then garbled).
          </span>
          <span className="mt-2 block">
            Original artworks earn supplies and duplicates earn nothing, so neglect starves the
            very economy that feeds your pet. Six on the walls is an exhibition and a bonus.
            There&rsquo;s no ending, only how long you can keep the loop alive.
          </span>
        </>
      }
    >
      <FlowCanvas
        className="h-152"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.06 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={start}
          disabled={sim.started}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> Adopt
        </button>
        <button onClick={() => spend('code')} disabled={!running || sim.supplies.code < 1} className={btn}>
          <span className="font-mono text-xs text-amber-700 dark:text-amber-400">code</span> Feed (
        {sim.supplies.code})
        </button>
        <button onClick={() => spend('prose')} disabled={!running || sim.supplies.prose < 1} className={btn}>
          <span className="font-mono text-xs text-violet-700 dark:text-violet-400">prose</span> Brief (
        {sim.supplies.prose})
        </button>
        <button onClick={() => spend('data')} disabled={!running || sim.supplies.data < 1} className={btn}>
          <span className="font-mono text-xs text-sky-700 dark:text-sky-400">data</span> Curate (
        {sim.supplies.data})
        </button>
        <button onClick={reset} className={btn}>
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          gallery {coverage}/6 · exhibitions {sim.galleries} · dupes {sim.dupes} · {mood}
        </span>
      </div>
    </WidgetFrame>
  )
}
