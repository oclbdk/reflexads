'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, BoltIcon, CheckIcon, PlayIcon, XMarkIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { Em, WidgetFrame } from '../widget-frame'

// The Reflexadic Form, finale — and the reader is the reflexive control.
// Press Reflex mid-session: everything pauses while you sample a span of the
// past and choose which roles it feeds back into. Consolidation always seals
// (reads re-base at the fold), but only what you route survives as knowledge:
// withhold the fold from the LLM — or sample a span that misses its tokens —
// and the system redraws what it already drew. Fold well and the loops speed
// up with no repeats; never fold and reads sweep the whole growing prefix.

const GRID = 8

type Role = 'eng' | 'llm' | 'cpu' | 'ref'
type Unit = { role: Role; label: string }

const CHIP: Record<Role, string> = {
  eng: 'bg-teal-400',
  llm: 'bg-violet-400',
  cpu: 'bg-reflex-500',
  ref: 'bg-amber-400',
}
const TEXT: Record<Role, string> = {
  eng: 'text-teal-600 dark:text-teal-400',
  llm: 'text-violet-600 dark:text-violet-400',
  cpu: 'text-reflex-600 dark:text-reflex-500',
  ref: 'text-amber-600 dark:text-amber-400',
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
const ROUNDS = 4

function artsIn(units: Unit[]): string[] {
  const found: string[] = []
  for (const art of REPERTOIRE) {
    if (units.some((u) => (u.role === 'llm' || u.role === 'eng') && u.label.includes(art.name)))
      found.push(art.name)
  }
  return found
}

const BRIEF_MS = 1200
const READ_PER_UNIT = 150
const TOKEN_MS = 600
const OP_MS_START = 210
const OP_MS_MIN = 80
const OP_MS_STEP = 60
const OBSERVE_MS_START = 1500
const OBSERVE_MS_FOLDED = 700

type Digests = { eng: string | null; llm: string | null; cpu: string | null }
type Feed = { eng: boolean; llm: boolean; cpu: boolean }
type Phase = 'brief' | 'read' | 'gen' | 'drain' | 'observe' | null
type Sim = {
  started: boolean
  round: number
  phase: Phase
  currentArt: string | null
  tokIdx: number
  cpuQueue: Op[]
  currentOp: string | null
  lit: ReadonlySet<string>
  timeline: Unit[]
  seal: number | null
  knownArts: string[]
  drawnAll: string[]
  digests: Digests
  opMs: number
  observeMs: number
  totalRead: number
  lastReadSize: number
  readWindow: { from: number; to: number } | null
  repeats: number
}
const INITIAL: Sim = {
  started: false,
  round: 0,
  phase: null,
  currentArt: null,
  tokIdx: 0,
  cpuQueue: [],
  currentOp: null,
  lit: new Set(),
  timeline: [],
  seal: null,
  knownArts: [],
  drawnAll: [],
  digests: { eng: null, llm: null, cpu: null },
  opMs: OP_MS_START,
  observeMs: OBSERVE_MS_START,
  totalRead: 0,
  lastReadSize: 0,
  readWindow: null,
  repeats: 0,
}

function replayLit(units: Unit[]): ReadonlySet<string> {
  const lit = new Set<string>()
  for (const u of units) {
    if (u.role !== 'cpu') continue
    if (u.label === 'CLR') lit.clear()
    const m = u.label.match(/^PX (\d+),(\d+)$/)
    if (m) lit.add(`${m[1]},${m[2]}`)
  }
  return lit
}

function enterRead(s: Sim, round: number): Sim {
  const timeline = [...s.timeline, { role: 'eng' as Role, label: `run round ${round}` }]
  const from = s.seal ?? 0
  const size = timeline.length - from
  return {
    ...s,
    round,
    timeline,
    tokIdx: 0,
    phase: 'read',
    readWindow: { from, to: timeline.length - 1 },
    totalRead: s.totalRead + size,
    lastReadSize: size,
  }
}

// ---- custom nodes -------------------------------------------------------

function LoopNode({ data }: NodeProps) {
  const { role, title, clock, current, active, caption, digest, folded } = data as {
    role: Role
    title: string
    clock: string
    current: string | null
    active: boolean
    caption: string
    digest: string | null
    folded: boolean
  }
  return (
    <div
      className={clsx(
        'w-52 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        folded ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className={clsx('text-[10px]/4 font-semibold tracking-wide uppercase', TEXT[role])}>{title}</span>
        <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">{clock}</span>
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1 text-center font-mono text-[11px]',
          active && current
            ? clsx(
                'font-semibold',
                TEXT[role],
                role === 'eng' ? 'bg-teal-500/15' : role === 'llm' ? 'bg-violet-500/15' : 'bg-reflex-500/15',
              )
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {current ?? 'idle'}
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-0.5 text-center font-mono text-[9px]/4',
          digest
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-zinc-50 text-zinc-300 dark:bg-white/[0.03] dark:text-zinc-600',
        )}
      >
        {digest ?? 'no folded past'}
      </div>
      <div className="mt-1 truncate text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">{caption}</div>
      <Handle id="emit" type="source" position={Position.Bottom} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ctx" type="target" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fold" type="target" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ReflexNode({ data }: NodeProps) {
  const { selecting } = data as { selecting: boolean }
  return (
    <div
      className={clsx(
        'w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
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
        {selecting ? 'sampling the past…' : 'standing by'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the reader is the reflexive
        <br />
        control: sample a span, choose
        <br />
        who receives it
      </div>
      <Handle id="span" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TimelineNode({ data }: NodeProps) {
  const { timeline, selecting, selStart, selEnd, selected, onCell, readWindow, seal } = data as {
    timeline: Unit[]
    selecting: boolean
    selStart: number | null
    selEnd: number | null
    selected: number | null
    onCell: (i: number) => void
    readWindow: { from: number; to: number } | null
    seal: number | null
  }
  const span =
    selStart !== null && selEnd !== null
      ? ([Math.min(selStart, selEnd), Math.max(selStart, selEnd)] as [number, number])
      : null
  const sel = selected !== null ? timeline[selected] : null
  let caption: React.ReactNode
  if (selecting) {
    if (span) {
      const units = timeline.slice(span[0], span[1] + 1)
      const c = { eng: 0, llm: 0, cpu: 0, ref: 0 }
      for (const u of units) c[u.role]++
      const arts = artsIn(units)
      caption = (
        <>
          <span className="text-amber-600 dark:text-amber-400">
            sampling units {span[0]}–{span[1]}
          </span>
          : {c.eng} d · {c.llm} t{arts.length > 0 ? ` (${arts.join(' · ')})` : ' (no art named)'} ·{' '}
          {c.cpu} op — now choose who receives it
        </>
      )
    } else if (selStart !== null) {
      caption = <span className="text-amber-600 dark:text-amber-400">start set — click an end unit</span>
    } else {
      caption = (
        <span className="text-amber-600 dark:text-amber-400">
          select the span to sample: click a start unit, then an end unit
        </span>
      )
    }
  } else if (readWindow) {
    caption = (
      <>
        <span className="text-violet-600 dark:text-violet-400">
          reading {readWindow.to - readWindow.from + 1} units
        </span>
        {seal !== null && readWindow.from === seal ? ' — from your fold, not the origin' : ' — the whole prefix'}
      </>
    )
  } else if (sel) {
    caption = (
      <>
        <span className={TEXT[sel.role]}>{sel.label}</span>
        {' — context: the '}
        {selected} unit{selected === 1 ? '' : 's'} before it; sealed history still replays
      </>
    )
  } else {
    caption = 'sealed units return only through your folds — never re-read raw'
  }
  return (
    <div className="w-[590px] rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between px-0.5 pb-2">
        <span className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          The one sequence
        </span>
        <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">{timeline.length} units</span>
      </div>
      <div className="flex min-h-8 flex-wrap content-start gap-[3px]">
        {timeline.map((u, i) => {
          const inWindow = readWindow !== null && i >= readWindow.from && i <= readWindow.to
          const sealed = seal !== null && i < seal
          const inSpan = span !== null && i >= span[0] && i <= span[1]
          const isEndpoint = i === selStart || i === selEnd
          return (
            <button
              key={i}
              onClick={() => onCell(i)}
              title={u.label}
              className={clsx(
                'size-3 cursor-pointer rounded-[2px] transition-opacity',
                CHIP[u.role],
                u.role === 'ref' && 'ring-1 ring-amber-500/60',
                sealed && !inWindow && !inSpan && 'opacity-30',
                !selecting && selected !== null && i > selected && 'opacity-20',
                inWindow && 'ring-2 ring-violet-400/70',
                selecting && inSpan && 'ring-2 ring-amber-400/80',
                selecting && isEndpoint && 'ring-2 ring-amber-500',
                !selecting && selected === i && 'ring-2 ring-zinc-950/60 dark:ring-white/80',
              )}
            />
          )
        })}
        {timeline.length === 0 && (
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
            run the session — then press Reflex and take the loop into your own hands
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-zinc-950/5 pt-1.5 font-mono text-[10px]/4 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        {caption}
      </div>
      <Handle id="in" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="span" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DisplayNode({ data }: NodeProps) {
  const { lit, rewound } = data as { lit: ReadonlySet<string>; rewound: number | null }
  return (
    <div
      className={clsx(
        'rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        rewound !== null ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="pb-1 text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Display
      </div>
      <div className="rounded-md bg-zinc-950 p-1.5">
        <div className="mx-auto grid w-fit grid-cols-8 gap-px">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const on = lit.has(`${i % GRID},${Math.floor(i / GRID)}`)
            return (
              <div
                key={i}
                className={clsx(
                  'size-2.5 rounded-[1px] transition-colors duration-200',
                  on ? 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400/60' : 'bg-zinc-800',
                )}
              />
            )
          })}
        </div>
      </div>
      <div
        className={clsx(
          'pt-1 text-center text-[9px]/4',
          rewound !== null ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500',
        )}
      >
        {rewound !== null ? 'rewound — replayed from sealed history' : 'a repeat here means the fold forgot'}
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  foldLoop: LoopNode,
  foldReflex: ReflexNode,
  foldTimeline: TimelineNode,
  foldDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function ReflexadFoldWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [mode, setMode] = useState<'live' | 'selecting'>('live')
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)
  const [feed, setFeed] = useState<Feed>({ eng: true, llm: true, cpu: true })
  const [foldFlash, setFoldFlash] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  const paused = mode === 'selecting'

  // One-shot phase transitions (variable-length read is the demonstration).
  useEffect(() => {
    if (paused || !sim.phase || sim.phase === 'gen' || sim.phase === 'drain') return
    const ms =
      sim.phase === 'brief'
        ? BRIEF_MS
        : sim.phase === 'read'
          ? Math.max(500, sim.lastReadSize * READ_PER_UNIT)
          : sim.observeMs
    const t = setTimeout(() => {
      setSim((s) => {
        switch (s.phase) {
          case 'brief':
            return enterRead(s, 1)
          case 'read': {
            // The pick: first art neither visible in the readable window nor
            // carried by a fold. Consolidate badly and it repeats.
            const windowUnits = s.timeline.slice(s.seal ?? 0)
            const known = new Set([...s.knownArts, ...artsIn(windowUnits)])
            const art = REPERTOIRE.find((a) => !known.has(a.name))?.name ?? REPERTOIRE[0].name
            const isRepeat = s.drawnAll.includes(art)
            return {
              ...s,
              phase: 'gen',
              readWindow: null,
              currentArt: art,
              drawnAll: [...s.drawnAll, art],
              repeats: s.repeats + (isRepeat ? 1 : 0),
              tokIdx: 0,
            }
          }
          case 'observe':
            return s.round >= ROUNDS ? { ...s, phase: null } : enterRead(s, s.round + 1)
          default:
            return s
        }
      })
    }, ms)
    return () => clearTimeout(t)
  }, [sim.phase, paused])

  // Token generation.
  useEffect(() => {
    if (paused || sim.phase !== 'gen') return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.phase !== 'gen' || !s.currentArt) return s
        const art = REPERTOIRE.find((a) => a.name === s.currentArt)!
        const tokens = [
          { text: 'clear', ops: [CLR] },
          { text: art.name, ops: art.ops },
        ]
        const tok = tokens[s.tokIdx]
        if (!tok) return { ...s, phase: 'drain' }
        return {
          ...s,
          timeline: [...s.timeline, { role: 'llm', label: `t${s.tokIdx} ${tok.text}` }],
          cpuQueue: [...s.cpuQueue, ...tok.ops],
          tokIdx: s.tokIdx + 1,
          phase: s.tokIdx + 1 < tokens.length ? 'gen' : 'drain',
        }
      })
    }, TOKEN_MS)
    return () => clearInterval(t)
  }, [sim.phase, paused])

  // CPU clock — warmed only if you fed it.
  const cpuBusy = sim.cpuQueue.length > 0 || sim.currentOp !== null
  useEffect(() => {
    if (paused || !cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        const [op, ...rest] = s.cpuQueue
        if (!op) return { ...s, currentOp: null }
        const lit = new Set(s.lit)
        if (op.kind === 'clr') lit.clear()
        if (op.kind === 'px' && op.x !== undefined) lit.add(`${op.x},${op.y}`)
        return {
          ...s,
          cpuQueue: rest,
          currentOp: op.text,
          lit,
          timeline: [...s.timeline, { role: 'cpu', label: op.text }],
        }
      })
    }, sim.opMs)
    return () => clearInterval(t)
  }, [cpuBusy, sim.opMs, paused])

  // Drain complete → the engineer observes.
  useEffect(() => {
    if (paused || sim.phase !== 'drain' || cpuBusy) return
    const t = setTimeout(
      () =>
        setSim((s) =>
          s.phase === 'drain'
            ? {
                ...s,
                phase: 'observe',
                timeline: [...s.timeline, { role: 'eng', label: `observe: ${s.currentArt} ✓` }],
              }
            : s,
        ),
      300,
    )
    return () => clearTimeout(t)
  }, [sim.phase, cpuBusy, paused])

  // Fold flash: the three feedback edges light briefly after your fold.
  useEffect(() => {
    if (!foldFlash) return
    const t = setTimeout(() => setFoldFlash(false), 1200)
    return () => clearTimeout(t)
  }, [foldFlash])

  function start() {
    setSelected(null)
    setMode('live')
    setSelStart(null)
    setSelEnd(null)
    setSim({
      ...INITIAL,
      started: true,
      phase: 'brief',
      timeline: [{ role: 'eng', label: 'd0 brief: keep making new art' }],
    })
  }

  function reset() {
    setSelected(null)
    setMode('live')
    setSelStart(null)
    setSelEnd(null)
    setSim(INITIAL)
  }

  function beginReflex() {
    setSelected(null)
    setSelStart(null)
    setSelEnd(null)
    setFeed({ eng: true, llm: true, cpu: true })
    setMode('selecting')
  }

  function cancelReflex() {
    setSelStart(null)
    setSelEnd(null)
    setMode('live')
  }

  function onCell(i: number) {
    if (mode === 'selecting') {
      if (selStart === null || selEnd !== null) {
        setSelStart(i)
        setSelEnd(null)
      } else {
        setSelEnd(i)
      }
    } else {
      setSelected((cur) => (cur === i ? null : i))
    }
  }

  // The fold: your span, your routing — recorded in the sequence, applied to
  // the roles, sealed for every future read.
  function applyFold() {
    if (selStart === null || selEnd === null) return
    const [a, b] = [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
    const roles = (['eng', 'llm', 'cpu'] as const).filter((r) => feed[r])
    if (roles.length === 0) return
    setSim((s) => {
      const spanUnits = s.timeline.slice(a, b + 1)
      const arts = artsIn(spanUnits)
      const opCount = spanUnits.filter((u) => u.role === 'cpu').length
      const timeline = [
        ...s.timeline,
        { role: 'ref' as Role, label: `⟲ you: units ${a}–${b} → ${roles.join(' · ')}` },
      ]
      const knownArts = feed.llm ? [...new Set([...s.knownArts, ...arts])] : s.knownArts
      return {
        ...s,
        timeline,
        seal: timeline.length - 1,
        knownArts,
        digests: {
          eng: feed.eng ? `briefed: ${arts.length > 0 ? arts.join(' · ') : 'span held no names'}` : s.digests.eng,
          llm: feed.llm
            ? `knows: ${knownArts.length > 0 ? knownArts.join(' · ') : 'nothing — span held no art'}`
            : s.digests.llm,
          cpu: feed.cpu ? `${opCount} ops traced — paths warm` : s.digests.cpu,
        },
        opMs: feed.cpu ? Math.max(OP_MS_MIN, s.opMs - OP_MS_STEP) : s.opMs,
        observeMs: feed.eng ? OBSERVE_MS_FOLDED : s.observeMs,
      }
    })
    setFoldFlash(true)
    setSelStart(null)
    setSelEnd(null)
    setMode('live')
  }

  const done = sim.started && sim.phase === null && !cpuBusy
  const reading = sim.phase === 'read'
  const engActive = sim.phase === 'brief' || sim.phase === 'observe'
  const llmActive = reading || sim.phase === 'gen'
  const selecting = mode === 'selecting'
  const spanReady = selStart !== null && selEnd !== null
  const anyFeed = feed.eng || feed.llm || feed.cpu

  const rewound = !selecting && selected !== null
  const view = rewound ? sim.timeline.slice(0, selected! + 1) : null
  const litView = view ? replayLit(view) : sim.lit

  const engCurrent = engActive
    ? sim.phase === 'brief'
      ? 'brief'
      : `observe: ${sim.currentArt} ✓`
    : null
  const llmCurrent = reading
    ? `reading ${sim.lastReadSize} units`
    : sim.phase === 'gen'
      ? sim.currentArt
      : null

  const nodes: Node[] = [
    {
      id: 'eng',
      type: 'foldLoop',
      position: { x: 0, y: 0 },
      data: {
        role: 'eng',
        title: 'Engineer',
        clock: '~seconds',
        current: engCurrent,
        active: engActive,
        caption: sim.digests.eng ? 'observes quickly — already briefed' : 'decides · observes',
        digest: sim.digests.eng,
        folded: foldFlash && feed.eng,
      },
    },
    {
      id: 'llm',
      type: 'foldLoop',
      position: { x: 235, y: 0 },
      data: {
        role: 'llm',
        title: 'LLM',
        clock: '~100 ms/token',
        current: llmCurrent,
        active: llmActive,
        caption: reading
          ? sim.seal !== null
            ? 'context re-based at your fold'
            : 'context is the whole prefix'
          : 'draws what it doesn’t know it drew',
        digest: sim.digests.llm,
        folded: foldFlash && feed.llm,
      },
    },
    {
      id: 'cpu',
      type: 'foldLoop',
      position: { x: 470, y: 0 },
      data: {
        role: 'cpu',
        title: 'CPU',
        clock: `${sim.opMs} ms/op`,
        current: cpuBusy ? sim.currentOp : null,
        active: cpuBusy,
        caption: sim.digests.cpu ? 'executes faster — paths are warm' : 'executes',
        digest: sim.digests.cpu,
        folded: foldFlash && feed.cpu,
      },
    },
    {
      id: 'timeline',
      type: 'foldTimeline',
      position: { x: 20, y: 205 },
      style: { pointerEvents: 'all' },
      data: {
        timeline: sim.timeline,
        selecting,
        selStart,
        selEnd,
        selected: rewound ? selected : null,
        onCell,
        readWindow: sim.readWindow,
        seal: sim.seal,
      },
    },
    { id: 'reflex', type: 'foldReflex', position: { x: 655, y: 215 }, data: { selecting } },
    {
      id: 'display',
      type: 'foldDisplay',
      position: { x: 270, y: 460 },
      data: { lit: litView, rewound: rewound ? selected : null },
    },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const clay = 'oklch(0.58 0.082 48)'
  const amber = 'oklch(0.769 0.188 70.08)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    ...(
      [
        ['eng', engActive, teal],
        ['llm', llmActive, violet],
        ['cpu', cpuBusy, clay],
      ] as const
    ).flatMap(([id, active, color]): Edge[] => [
      {
        id: `emit-${id}`,
        source: id,
        sourceHandle: 'emit',
        target: 'timeline',
        targetHandle: 'in',
        animated: active && !paused,
        style: active ? { stroke: color, strokeWidth: 1.5 } : { opacity: 0.4 },
      },
      {
        id: `ctx-${id}`,
        source: 'timeline',
        sourceHandle: 'in',
        target: id,
        targetHandle: 'ctx',
        animated: active && !paused,
        style: active
          ? { stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }
          : { opacity: 0.25, strokeDasharray: '4 4' },
      },
    ]),
    {
      id: 'span',
      source: 'timeline',
      sourceHandle: 'span',
      target: 'reflex',
      targetHandle: 'span',
      label: selecting ? 'your span — sampled as one value' : undefined,
      animated: selecting && spanReady,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: selecting ? { stroke: amber, strokeWidth: 1.5 } : { opacity: 0.4 },
    },
    ...(['eng', 'llm', 'cpu'] as const).map(
      (id): Edge => ({
        id: `fold-${id}`,
        source: 'reflex',
        sourceHandle: 'out',
        target: id,
        targetHandle: 'fold',
        label: id === 'llm' && foldFlash ? 'your routing, fed back' : undefined,
        animated: (foldFlash && feed[id]) || (selecting && feed[id]),
        labelStyle: { fontSize: 9 },
        labelBgStyle: { fillOpacity: 0 },
        style:
          foldFlash && feed[id]
            ? { stroke: amber, strokeWidth: 1.5 }
            : selecting && feed[id]
              ? { stroke: amber, strokeWidth: 1, strokeDasharray: '4 4' }
              : { opacity: 0.15, strokeDasharray: '4 4' },
      }),
    ),
    {
      id: 'fx',
      source: 'timeline',
      sourceHandle: 'fx',
      target: 'display',
      animated: cpuBusy && !paused,
      style: cpuBusy ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'
  const roleChip = (r: keyof Feed, label: string, color: string) => (
    <button
      key={r}
      onClick={() => setFeed((f) => ({ ...f, [r]: !f[r] }))}
      className={clsx(
        'rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
        feed[r]
          ? clsx('font-semibold ring-transparent', color)
          : 'text-zinc-400 ring-zinc-950/10 dark:text-zinc-500 dark:ring-white/10',
      )}
    >
      {feed[r] ? '✓ ' : ''}
      {label}
    </button>
  )

  return (
    <WidgetFrame
      title="The reflex: your hands on the loop"
      hint={
        <>
          <span className="block">
            You are the reflexive control here. Press <Em>Reflex</Em>{' '}mid-session and everything
            pauses while you sample a span of the past and choose which roles it feeds.
          </span>
          <span className="mt-2 block">
            Consolidation always seals (reads re-base at your fold), but only what you route
            survives. Withhold the fold from the LLM, or sample a span that misses its tokens, and
            the system <Em>redraws what it already drew</Em>. Fold well and the loops accelerate
            with no repeats. Never fold and reads sweep the whole growing prefix.
          </span>
          <span className="mt-2 block">
            So the reflexad&rsquo;s question is in your hands: what must the system retain about
            itself, and through whose context?
          </span>
        </>
      }
    >
      <FlowCanvas
        className="h-140"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.08 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">feed into:</span>
            {roleChip('eng', 'engineer', 'bg-teal-500/15 text-teal-600 dark:text-teal-400')}
            {roleChip('llm', 'llm', 'bg-violet-500/15 text-violet-600 dark:text-violet-400')}
            {roleChip('cpu', 'cpu', 'bg-reflex-500/15 text-reflex-600 dark:text-reflex-500')}
            <button onClick={applyFold} disabled={!spanReady || !anyFeed} className={btn}>
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
              <PlayIcon className="size-4" /> {done ? 'Run again' : 'Run the session'}
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
          round {Math.min(sim.round, ROUNDS)}/{ROUNDS} · reads: {sim.totalRead} · repeats:{' '}
          {sim.repeats}
        </span>
      </div>
    </WidgetFrame>
  )
}
