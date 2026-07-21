'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, BoltIcon, CheckIcon, PlayIcon, XMarkIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { Em, WidgetFrame } from '../widget-frame'

// Two reflexad stacks, one reflexive controller — you, in the center. The
// systems share a brief and a repertoire but cannot see each other: left
// alone they duplicate each other's work. Press Reflex, sample a span from
// either sequence, and inject it back into itself or into the other system's
// roles. Cross-system learning exists exactly where the controller carries it.

const GRID = 8

type Role = 'eng' | 'llm' | 'cpu' | 'ref'
type Unit = { role: Role; label: string }
type SysKey = 'a' | 'b'

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
      [1, 1], [2, 1], [5, 1], [6, 1],
      [0, 2], [3, 2], [4, 2], [7, 2],
      [0, 3], [7, 3], [1, 4], [6, 4],
      [2, 5], [5, 5], [3, 6], [4, 6],
    ].map(([x, y]) => px(x, y)),
  },
]
const ROUNDS = 2

function artsIn(units: Unit[]): string[] {
  const found: string[] = []
  for (const art of REPERTOIRE) {
    if (units.some((u) => (u.role === 'llm' || u.role === 'eng') && u.label.includes(art.name)))
      found.push(art.name)
  }
  return found
}

const BRIEF_MS: Record<SysKey, number> = { a: 1200, b: 8000 }
const READ_PER_UNIT = 120
const TOKEN_MS = 600
const OP_MS_START = 210
const OP_MS_MIN = 80
const OP_MS_STEP = 60
const OBSERVE_MS_START = 1400
const OBSERVE_MS_FOLDED = 700

type Digests = { eng: string | null; llm: string | null; cpu: string | null }
type Phase = 'brief' | 'read' | 'gen' | 'drain' | 'observe' | null
type Sys = {
  round: number
  phase: Phase
  currentArt: string | null
  tokIdx: number
  cpuQueue: Op[]
  currentOp: string | null
  lit: ReadonlySet<string>
  timeline: Unit[]
  knownArts: string[]
  drawnAll: string[]
  digests: Digests
  opMs: number
  observeMs: number
  lastReadSize: number
  readWindow: { from: number; to: number } | null
}
const initialSys = (): Sys => ({
  round: 0,
  phase: null,
  currentArt: null,
  tokIdx: 0,
  cpuQueue: [],
  currentOp: null,
  lit: new Set(),
  timeline: [],
  knownArts: [],
  drawnAll: [],
  digests: { eng: null, llm: null, cpu: null },
  opMs: OP_MS_START,
  observeMs: OBSERVE_MS_START,
  lastReadSize: 0,
  readWindow: null,
})

type Sim = { started: boolean; a: Sys; b: Sys }
const INITIAL: Sim = { started: false, a: initialSys(), b: initialSys() }

function enterRead(sys: Sys, round: number): Sys {
  const timeline = [...sys.timeline, { role: 'eng' as Role, label: `run round ${round}` }]
  return {
    ...sys,
    round,
    timeline,
    tokIdx: 0,
    phase: 'read',
    readWindow: { from: 0, to: timeline.length - 1 },
    lastReadSize: timeline.length,
  }
}

// ---- custom nodes -------------------------------------------------------

function RolesNode({ data }: NodeProps) {
  const { title, rows, folded } = data as {
    title: string
    rows: { role: 'eng' | 'llm' | 'cpu'; current: string | null; active: boolean; digest: string | null }[]
    folded: boolean
  }
  return (
    <div
      className={clsx(
        'w-56 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
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
            <span
              className={clsx(
                'size-2 shrink-0 rounded-full',
                r.digest ? 'bg-amber-400' : 'bg-zinc-200 dark:bg-zinc-700',
              )}
              title={r.digest ?? 'no folded past'}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 truncate px-1 text-center font-mono text-[9px]/4 text-amber-600/80 dark:text-amber-400/80">
        {rows.find((r) => r.role === 'llm')?.digest ?? ' '}
      </div>
      <Handle id="emit" type="source" position={Position.Bottom} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ctx" type="target" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fold" type="target" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="foldL" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ReflexNode({ data }: NodeProps) {
  const { selecting } = data as { selecting: boolean }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        selecting ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
        Reflex — you
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1 font-mono text-[11px]',
          selecting
            ? 'bg-amber-500/15 font-semibold text-amber-600 dark:text-amber-400'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {selecting ? 'sampling…' : 'standing by'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the systems cannot see each
        <br />
        other — you are the only
        <br />
        channel between the loops
      </div>
      <Handle id="spanA" type="target" position={Position.Left} style={{ top: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="outA" type="source" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="spanB" type="target" position={Position.Right} style={{ top: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="outB" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TimelineNode({ data }: NodeProps) {
  const { sys, timeline, selecting, selStart, selEnd, isSource, readWindow, onCell } = data as {
    sys: SysKey
    timeline: Unit[]
    selecting: boolean
    selStart: number | null
    selEnd: number | null
    isSource: boolean
    readWindow: { from: number; to: number } | null
    onCell: (sys: SysKey, i: number) => void
  }
  const span =
    isSource && selStart !== null && selEnd !== null
      ? ([Math.min(selStart, selEnd), Math.max(selStart, selEnd)] as [number, number])
      : null
  let caption: React.ReactNode
  if (selecting && isSource) {
    if (span) {
      const units = timeline.slice(span[0], span[1] + 1)
      const arts = artsIn(units)
      caption = (
        <span className="text-amber-600 dark:text-amber-400">
          units {span[0]}–{span[1]}: {arts.length > 0 ? arts.join(' · ') : 'no art named'}
        </span>
      )
    } else if (selStart !== null) {
      caption = <span className="text-amber-600 dark:text-amber-400">now click an end unit</span>
    } else {
      caption = <span className="text-amber-600 dark:text-amber-400">click a start unit</span>
    }
  } else if (selecting) {
    caption = <span className="text-zinc-400 dark:text-zinc-500">…or sample from here</span>
  } else if (readWindow) {
    caption = (
      <span className="text-violet-600 dark:text-violet-400">
        reading {readWindow.to - readWindow.from + 1} units — its own past only
      </span>
    )
  } else {
    caption = `${timeline.length} units`
  }
  return (
    <div className="w-64 rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between px-0.5 pb-1.5">
        <span className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          Sequence {sys.toUpperCase()}
        </span>
      </div>
      <div className="flex min-h-7 flex-wrap content-start gap-[3px]">
        {timeline.map((u, i) => {
          const inWindow = readWindow !== null && i >= readWindow.from && i <= readWindow.to
          const inSpan = span !== null && i >= span[0] && i <= span[1]
          const isEndpoint = isSource && (i === selStart || i === selEnd)
          return (
            <button
              key={i}
              onClick={() => onCell(sys, i)}
              title={u.label}
              className={clsx(
                'size-2.5 rounded-[2px] transition-opacity',
                CHIP[u.role],
                u.role === 'ref' && 'ring-1 ring-amber-500/60',
                selecting ? 'cursor-pointer' : 'cursor-default',
                inWindow && 'ring-2 ring-violet-400/70',
                inSpan && 'ring-2 ring-amber-400/80',
                isEndpoint && 'ring-2 ring-amber-500',
              )}
            />
          )
        })}
        {timeline.length === 0 && (
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">booting…</span>
        )}
      </div>
      <div className="mt-1.5 border-t border-zinc-950/5 pt-1 font-mono text-[9px]/4 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        {caption}
      </div>
      <Handle id="in" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="span" type="source" position={sys === 'a' ? Position.Right : Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DisplayNode({ data }: NodeProps) {
  const { lit, label } = data as { lit: ReadonlySet<string>; label: string }
  return (
    <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="pb-1 text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        {label}
      </div>
      <div className="rounded-md bg-zinc-950 p-1.5">
        <div className="mx-auto grid w-fit grid-cols-8 gap-px">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const on = lit.has(`${i % GRID},${Math.floor(i / GRID)}`)
            return (
              <div
                key={i}
                className={clsx(
                  'size-2 rounded-[1px] transition-colors duration-200',
                  on ? 'bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60' : 'bg-zinc-800',
                )}
              />
            )
          })}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  pairRoles: RolesNode,
  pairReflex: ReflexNode,
  pairTimeline: TimelineNode,
  pairDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function ReflexadPairWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [mode, setMode] = useState<'live' | 'selecting'>('live')
  const [selSys, setSelSys] = useState<SysKey | null>(null)
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)
  const [targets, setTargets] = useState<{ a: boolean; b: boolean }>({ a: false, b: false })
  const [foldTargets, setFoldTargets] = useState<{ a: boolean; b: boolean }>({ a: false, b: false })

  const paused = mode === 'selecting'

  // Per-system clocks — identical machinery, staggered boot.
  function useSystemClocks(key: SysKey) {
    const sys = sim[key]

    // Phase transitions.
    useEffect(() => {
      if (paused || !sys.phase || sys.phase === 'gen' || sys.phase === 'drain') return
      const ms =
        sys.phase === 'brief'
          ? BRIEF_MS[key]
          : sys.phase === 'read'
            ? Math.max(400, sys.lastReadSize * READ_PER_UNIT)
            : sys.observeMs
      const t = setTimeout(() => {
        setSim((s) => {
          const cur = s[key]
          switch (cur.phase) {
            case 'brief':
              return { ...s, [key]: enterRead(cur, 1) }
            case 'read': {
              const known = new Set([...cur.knownArts, ...artsIn(cur.timeline)])
              const art = REPERTOIRE.find((a) => !known.has(a.name))?.name ?? REPERTOIRE[0].name
              return {
                ...s,
                [key]: {
                  ...cur,
                  phase: 'gen',
                  readWindow: null,
                  currentArt: art,
                  drawnAll: [...cur.drawnAll, art],
                  tokIdx: 0,
                },
              }
            }
            case 'observe':
              return {
                ...s,
                [key]: cur.round >= ROUNDS ? { ...cur, phase: null } : enterRead(cur, cur.round + 1),
              }
            default:
              return s
          }
        })
      }, ms)
      return () => clearTimeout(t)
    }, [sys.phase, paused])

    // Token generation.
    useEffect(() => {
      if (paused || sys.phase !== 'gen') return
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
    }, [sys.phase, paused])

    // CPU clock.
    const busy = sys.cpuQueue.length > 0 || sys.currentOp !== null
    useEffect(() => {
      if (paused || !busy) return
      const t = setInterval(() => {
        setSim((s) => {
          const cur = s[key]
          const [op, ...rest] = cur.cpuQueue
          if (!op) return { ...s, [key]: { ...cur, currentOp: null } }
          const lit = new Set(cur.lit)
          if (op.kind === 'clr') lit.clear()
          if (op.kind === 'px' && op.x !== undefined) lit.add(`${op.x},${op.y}`)
          return {
            ...s,
            [key]: {
              ...cur,
              cpuQueue: rest,
              currentOp: op.text,
              lit,
              timeline: [...cur.timeline, { role: 'cpu' as Role, label: op.text }],
            },
          }
        })
      }, sys.opMs)
      return () => clearInterval(t)
    }, [busy, sys.opMs, paused])

    // Drain → observe.
    useEffect(() => {
      if (paused || sys.phase !== 'drain' || busy) return
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
    }, [sys.phase, busy, paused])

    return busy
  }

  const busyA = useSystemClocks('a')
  const busyB = useSystemClocks('b')

  // Feedback edge flash after a fold.
  useEffect(() => {
    if (!foldTargets.a && !foldTargets.b) return
    const t = setTimeout(() => setFoldTargets({ a: false, b: false }), 1200)
    return () => clearTimeout(t)
  }, [foldTargets])

  function start() {
    setMode('live')
    setSelSys(null)
    setSelStart(null)
    setSelEnd(null)
    setSim({
      started: true,
      a: {
        ...initialSys(),
        phase: 'brief',
        timeline: [{ role: 'eng', label: 'brief: keep making new art' }],
      },
      b: {
        ...initialSys(),
        phase: 'brief',
        timeline: [{ role: 'eng', label: 'brief: keep making new art' }],
      },
    })
  }

  function reset() {
    setMode('live')
    setSelSys(null)
    setSelStart(null)
    setSelEnd(null)
    setSim(INITIAL)
  }

  function beginReflex() {
    setSelSys(null)
    setSelStart(null)
    setSelEnd(null)
    setTargets({ a: false, b: false })
    setMode('selecting')
  }

  function cancelReflex() {
    setMode('live')
  }

  function onCell(sys: SysKey, i: number) {
    if (mode !== 'selecting') return
    if (selSys !== sys || selStart === null || selEnd !== null) {
      setSelSys(sys)
      setSelStart(i)
      setSelEnd(null)
      setTargets({ a: sys === 'a', b: sys === 'b' })
    } else {
      setSelEnd(i)
    }
  }

  // The fold: sample from the source, inject into the chosen systems. The
  // source records your sampling; a crossed target records the arrival.
  function applyFold() {
    if (selSys === null || selStart === null || selEnd === null) return
    const [a0, b0] = [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
    const tgts = (['a', 'b'] as SysKey[]).filter((k) => targets[k])
    if (tgts.length === 0) return
    const src = selSys
    setSim((s) => {
      const units = s[src].timeline.slice(a0, b0 + 1)
      const arts = artsIn(units)
      const opCount = units.filter((u) => u.role === 'cpu').length
      const next = { ...s }
      const tgtLabel = tgts.map((k) => (k === src ? 'self' : k.toUpperCase())).join(' · ')
      next[src] = {
        ...next[src],
        timeline: [
          ...next[src].timeline,
          { role: 'ref' as Role, label: `⟲ you: units ${a0}–${b0} → ${tgtLabel}` },
        ],
      }
      for (const k of tgts) {
        const sys = next[k]
        const knownArts = [...new Set([...sys.knownArts, ...arts])]
        const arrival =
          k === src
            ? null
            : {
                role: 'ref' as Role,
                label: `⟲ inject ← ${src.toUpperCase()}: ${arts.join(' · ') || 'no names'}`,
              }
        next[k] = {
          ...sys,
          timeline: arrival ? [...sys.timeline, arrival] : sys.timeline,
          knownArts,
          digests: {
            eng: `briefed: ${arts.join(' · ') || '—'}`,
            llm: `knows: ${knownArts.join(' · ') || '—'}`,
            cpu: `${opCount} ops traced — warm`,
          },
          opMs: Math.max(OP_MS_MIN, sys.opMs - OP_MS_STEP),
          observeMs: OBSERVE_MS_FOLDED,
        }
      }
      return next
    })
    setFoldTargets({ a: targets.a, b: targets.b })
    setSelSys(null)
    setSelStart(null)
    setSelEnd(null)
    setMode('live')
  }

  const selecting = mode === 'selecting'
  const spanReady = selSys !== null && selStart !== null && selEnd !== null
  const anyTarget = targets.a || targets.b
  const doneA = sim.started && sim.a.phase === null && !busyA
  const doneB = sim.started && sim.b.phase === null && !busyB
  const done = doneA && doneB

  const allDrawn = [...sim.a.drawnAll, ...sim.b.drawnAll]
  const coverage = new Set(allDrawn).size
  const duplicates = allDrawn.length - coverage

  const sysRows = (key: SysKey, busy: boolean) => {
    const sys = sim[key]
    const engActive = sys.phase === 'brief' || sys.phase === 'observe'
    const llmActive = sys.phase === 'read' || sys.phase === 'gen'
    return [
      {
        role: 'eng' as const,
        current: engActive ? (sys.phase === 'brief' ? 'brief' : `observe: ${sys.currentArt} ✓`) : null,
        active: engActive,
        digest: sys.digests.eng,
      },
      {
        role: 'llm' as const,
        current:
          sys.phase === 'read'
            ? `reading ${sys.lastReadSize}`
            : sys.phase === 'gen'
              ? sys.currentArt
              : null,
        active: llmActive,
        digest: sys.digests.llm,
      },
      {
        role: 'cpu' as const,
        current: busy ? sys.currentOp : null,
        active: busy,
        digest: sys.digests.cpu,
      },
    ]
  }

  const nodes: Node[] = [
    {
      id: 'rolesA',
      type: 'pairRoles',
      position: { x: 0, y: 0 },
      data: { title: 'System A', rows: sysRows('a', busyA), folded: foldTargets.a },
    },
    {
      id: 'rolesB',
      type: 'pairRoles',
      position: { x: 640, y: 0 },
      data: { title: 'System B', rows: sysRows('b', busyB), folded: foldTargets.b },
    },
    { id: 'reflex', type: 'pairReflex', position: { x: 340, y: 30 }, data: { selecting } },
    {
      id: 'tlA',
      type: 'pairTimeline',
      position: { x: 0, y: 180 },
      style: { pointerEvents: 'all' },
      data: {
        sys: 'a',
        timeline: sim.a.timeline,
        selecting,
        selStart: selSys === 'a' ? selStart : null,
        selEnd: selSys === 'a' ? selEnd : null,
        isSource: selSys === 'a',
        readWindow: sim.a.readWindow,
        onCell,
      },
    },
    {
      id: 'tlB',
      type: 'pairTimeline',
      position: { x: 610, y: 180 },
      style: { pointerEvents: 'all' },
      data: {
        sys: 'b',
        timeline: sim.b.timeline,
        selecting,
        selStart: selSys === 'b' ? selStart : null,
        selEnd: selSys === 'b' ? selEnd : null,
        isSource: selSys === 'b',
        readWindow: sim.b.readWindow,
        onCell,
      },
    },
    { id: 'dispA', type: 'pairDisplay', position: { x: 55, y: 420 }, data: { lit: sim.a.lit, label: 'Display A' } },
    { id: 'dispB', type: 'pairDisplay', position: { x: 665, y: 420 }, data: { lit: sim.b.lit, label: 'Display B' } },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const sysEdges = (key: SysKey, busy: boolean): Edge[] => {
    const sys = sim[key]
    const active = sys.phase !== null || busy
    const roles = key === 'a' ? 'rolesA' : 'rolesB'
    const tl = key === 'a' ? 'tlA' : 'tlB'
    const disp = key === 'a' ? 'dispA' : 'dispB'
    return [
      {
        id: `emit-${key}`,
        source: roles,
        sourceHandle: 'emit',
        target: tl,
        targetHandle: 'in',
        animated: active && !paused,
        style: active ? { stroke: violet, strokeWidth: 1 } : { opacity: 0.35 },
      },
      {
        id: `ctx-${key}`,
        source: tl,
        sourceHandle: 'in',
        target: roles,
        targetHandle: 'ctx',
        animated: sys.phase === 'read' && !paused,
        style:
          sys.phase === 'read'
            ? { stroke: violet, strokeWidth: 1, strokeDasharray: '4 4' }
            : { opacity: 0.25, strokeDasharray: '4 4' },
      },
      {
        id: `fx-${key}`,
        source: tl,
        sourceHandle: 'fx',
        target: disp,
        animated: busy && !paused,
        style: busy ? { stroke: emerald, strokeWidth: 1.5 } : { opacity: 0.4 },
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
      target: 'reflex',
      targetHandle: 'spanA',
      label: selecting && selSys === 'a' ? 'your span' : undefined,
      animated: selecting && selSys === 'a',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: selecting && selSys === 'a' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.3 },
    },
    {
      id: 'span-b',
      source: 'tlB',
      sourceHandle: 'span',
      target: 'reflex',
      targetHandle: 'spanB',
      label: selecting && selSys === 'b' ? 'your span' : undefined,
      animated: selecting && selSys === 'b',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: selecting && selSys === 'b' ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.3 },
    },
    {
      id: 'inject-a',
      source: 'reflex',
      sourceHandle: 'outA',
      target: 'rolesA',
      targetHandle: 'fold',
      label: foldTargets.a ? 'inject' : undefined,
      animated: foldTargets.a || (selecting && targets.a),
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: foldTargets.a
        ? { stroke: amber, strokeWidth: 1.5 }
        : selecting && targets.a
          ? { stroke: amber, strokeWidth: 1, strokeDasharray: '4 4' }
          : { opacity: 0.15, strokeDasharray: '4 4' },
    },
    {
      id: 'inject-b',
      source: 'reflex',
      sourceHandle: 'outB',
      target: 'rolesB',
      targetHandle: 'foldL',
      label: foldTargets.b ? 'inject' : undefined,
      animated: foldTargets.b || (selecting && targets.b),
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: foldTargets.b
        ? { stroke: amber, strokeWidth: 1.5 }
        : selecting && targets.b
          ? { stroke: amber, strokeWidth: 1, strokeDasharray: '4 4' }
          : { opacity: 0.15, strokeDasharray: '4 4' },
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <WidgetFrame
      title="Two systems, one controller"
      hint={
        <>
          <span className="block">
            Two reflexad stacks with the same brief and the same repertoire, and no way to see each
            other. Left alone, both draw the smiley, then both draw the wink:{' '}
            <span className="font-mono text-xs">duplicates: 2</span>.
          </span>
          <span className="mt-2 block">
            You are the only channel between the loops. Press <Em>Reflex</Em>, sample a span from
            either sequence, and inject it into itself or into the other system. Fold A&rsquo;s
            round into B before B picks and B skips what A already drew. System B boots late, so
            there&rsquo;s time to save even its first round.
          </span>
          <span className="mt-2 block">
            Perfect play covers all four artworks with zero duplicates, and it&rsquo;s only
            reachable through you.
          </span>
        </>
      }
    >
      <FlowCanvas
        className="h-140"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.06 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">inject into:</span>
            <button
              onClick={() => setTargets((t) => ({ ...t, a: !t.a }))}
              className={clsx(
                'rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
                targets.a
                  ? 'bg-amber-500/15 font-semibold text-amber-600 ring-transparent dark:text-amber-400'
                  : 'text-zinc-400 ring-zinc-950/10 dark:text-zinc-500 dark:ring-white/10',
              )}
            >
              {targets.a ? '✓ ' : ''}System A{selSys === 'a' ? ' (self)' : ''}
            </button>
            <button
              onClick={() => setTargets((t) => ({ ...t, b: !t.b }))}
              className={clsx(
                'rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
                targets.b
                  ? 'bg-amber-500/15 font-semibold text-amber-600 ring-transparent dark:text-amber-400'
                  : 'text-zinc-400 ring-zinc-950/10 dark:text-zinc-500 dark:ring-white/10',
              )}
            >
              {targets.b ? '✓ ' : ''}System B{selSys === 'b' ? ' (self)' : ''}
            </button>
            <button onClick={applyFold} disabled={!spanReady || !anyTarget} className={btn}>
              <CheckIcon className="size-4" /> Fold &amp; resume
            </button>
            <button onClick={cancelReflex} className={btn}>
              <XMarkIcon className="size-4" /> Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={start}
              disabled={sim.started && !done}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <PlayIcon className="size-4" /> {done ? 'Run again' : 'Run both systems'}
            </button>
            <button onClick={beginReflex} disabled={!sim.started || done} className={btn}>
              <BoltIcon className="size-4" /> Reflex
            </button>
            <button onClick={reset} className={btn}>
              <ArrowPathIcon className="size-4" /> Reset
            </button>
          </>
        )}
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          A {Math.min(sim.a.round, ROUNDS)}/{ROUNDS} · B {Math.min(sim.b.round, ROUNDS)}/{ROUNDS} ·
          coverage {coverage}/4 · duplicates {duplicates}
        </span>
      </div>
    </WidgetFrame>
  )
}
