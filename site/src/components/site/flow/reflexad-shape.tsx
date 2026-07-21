'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, ArrowsUpDownIcon, PlayIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The Reflexadic Form, flagship. Three loops with the same three parts — a
// unit, a step that runs inside accumulated context, and the fold back into
// that context. Only the unit, the clock, and the names differ; toggle the
// labels to the monadic form and nothing structural changes. Run the session
// and every loop's units braid into one sequence — then click any unit: its
// context is everything before it, across all three roles.

type Role = 'eng' | 'llm' | 'cpu'
type Unit = { role: Role; label: string }

const ROLE_META: Record<
  Role,
  { title: string; loopTitle: string; clock: string; unit: string; ctx: string; chip: string; text: string }
> = {
  eng: {
    title: 'Engineer',
    loopTitle: 'the engineering loop',
    clock: '~seconds',
    unit: 'decision',
    ctx: 'everything observed',
    chip: 'bg-teal-400',
    text: 'text-teal-600 dark:text-teal-400',
  },
  llm: {
    title: 'LLM',
    loopTitle: 'the LLM loop',
    clock: '~100 ms/token',
    unit: 'token',
    ctx: 'the window — its whole prefix',
    chip: 'bg-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
  },
  cpu: {
    title: 'CPU',
    loopTitle: 'the CPU loop',
    clock: '~ns/op',
    unit: 'opcode',
    ctx: 'registers · files · display',
    chip: 'bg-reflex-500',
    text: 'text-reflex-600 dark:text-reflex-500',
  },
}

// A compact scripted session: write the brief, run it (smiley), observe, run
// again (wink), observe and ship.
const GRID = 8
type Op = { text: string; kind: 'clr' | 'px'; x?: number; y?: number }
const px = (x: number, y: number): Op => ({ text: `PX ${x},${y}`, kind: 'px', x, y })
const CLR: Op = { text: 'CLR', kind: 'clr' }
const SMILEY_OPS: Op[] = [CLR, px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)]
const WINK_OPS: Op[] = [CLR, px(2, 2), px(4, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)]

type Decision =
  | { type: 'act'; label: string }
  | { type: 'run'; label: string; tokens: { text: string; ops: Op[] }[] }
  | { type: 'eval'; label: string }

const DECISIONS: Decision[] = [
  { type: 'act', label: 'write brief' },
  {
    type: 'run',
    label: 'run it',
    tokens: [
      { text: 'clear', ops: [SMILEY_OPS[0]] },
      { text: 'smiley', ops: SMILEY_OPS.slice(1) },
      { text: 'done', ops: [] },
    ],
  },
  { type: 'eval', label: 'observe: smiley ✓' },
  {
    type: 'run',
    label: 'run again',
    tokens: [
      { text: 'clear', ops: [WINK_OPS[0]] },
      { text: 'wink', ops: WINK_OPS.slice(1) },
      { text: 'done', ops: [] },
    ],
  },
  { type: 'eval', label: 'observe: wink ✓ · ship' },
]

const ACT_MS = 1600
const READ_MS = 500
const TOKEN_MS = 650
const OP_MS = 180
const OBSERVE_MS = 1500

type Phase = 'act' | 'read' | 'gen' | 'drain' | 'observe' | null
type Sim = {
  started: boolean
  dIdx: number
  phase: Phase
  tokIdx: number
  cpuQueue: Op[]
  currentOp: string | null
  timeline: Unit[]
  lit: ReadonlySet<string>
}
const INITIAL: Sim = {
  started: false,
  dIdx: 0,
  phase: null,
  tokIdx: 0,
  cpuQueue: [],
  currentOp: null,
  timeline: [],
  lit: new Set(),
}

// State is a fold over the sequence: replay the prefix and you have the
// display as of that moment — reconstructed from the stream itself.
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

function lastLabel(units: Unit[], role: Role): string | null {
  for (let i = units.length - 1; i >= 0; i--) if (units[i].role === role) return units[i].label
  return null
}

function nextDecision(s: Sim): Sim {
  const nd = s.dIdx + 1
  if (nd >= DECISIONS.length) return { ...s, dIdx: nd, phase: null }
  const d = DECISIONS[nd]
  return {
    ...s,
    dIdx: nd,
    tokIdx: 0,
    phase: d.type === 'act' ? 'act' : d.type === 'run' ? 'read' : 'observe',
    timeline: [...s.timeline, { role: 'eng', label: `d${nd} ${d.label}` }],
  }
}

// ---- custom nodes -------------------------------------------------------

function LoopNode({ data }: NodeProps) {
  const { role, current, active, abstract } = data as {
    role: Role
    current: string | null
    active: boolean
    abstract: boolean
  }
  const meta = ROLE_META[role]
  return (
    <div className="w-52 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between px-1">
        <span className={clsx('text-[10px]/4 font-semibold tracking-wide uppercase', abstract ? 'text-zinc-400 dark:text-zinc-500' : meta.text)}>
          {abstract ? meta.loopTitle : meta.title}
        </span>
        <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">{meta.clock}</span>
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1 text-center font-mono text-[11px]',
          active && current
            ? clsx('font-semibold', meta.text, role === 'eng' ? 'bg-teal-500/15' : role === 'llm' ? 'bg-violet-500/15' : 'bg-reflex-500/15')
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {current ?? (abstract ? 'unit' : meta.unit)}
      </div>
      <div className="mt-0.5 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        ↓ runs inside
      </div>
      <div className="rounded-md bg-zinc-100 px-2 py-1 text-center font-mono text-[10px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        {abstract ? 'context' : meta.ctx}
      </div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        <ArrowPathIcon className="size-2.5" /> effects fold back — next unit runs enriched
      </div>
      <Handle id="emit" type="source" position={Position.Bottom} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ctx" type="target" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TimelineNode({ data }: NodeProps) {
  const { timeline, selected, onSelect } = data as {
    timeline: Unit[]
    selected: number | null
    onSelect: (i: number | null) => void
  }
  const sel = selected !== null ? timeline[selected] : null
  const prefix = selected !== null ? timeline.slice(0, selected) : []
  const counts = { eng: 0, llm: 0, cpu: 0 }
  for (const u of prefix) counts[u.role]++
  return (
    <div className="w-[590px] rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between px-0.5 pb-2">
        <span className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          The one sequence
        </span>
        <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
          {timeline.length} units
        </span>
      </div>
      <div className="flex min-h-8 flex-wrap content-start gap-[3px]">
        {timeline.map((u, i) => (
          <button
            key={i}
            onClick={() => onSelect(selected === i ? null : i)}
            title={u.label}
            className={clsx(
              'size-3 cursor-pointer rounded-[2px] transition-opacity',
              ROLE_META[u.role].chip,
              selected !== null && i > selected && 'opacity-20',
              selected === i && 'ring-2 ring-zinc-950/60 dark:ring-white/80',
            )}
          />
        ))}
        {timeline.length === 0 && (
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
            run the session — units from all three loops land here, in order
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-zinc-950/5 pt-1.5 font-mono text-[10px]/4 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        {sel ? (
          <>
            <span className={ROLE_META[sel.role].text}>{sel.label}</span>
            {' — context: the '}
            {selected} unit{selected === 1 ? '' : 's'} before it ({counts.eng} d · {counts.llm} t ·{' '}
            {counts.cpu} op), across every role
          </>
        ) : (
          'click any unit — its context is everything before it'
        )}
      </div>
      <Handle id="in" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        {rewound !== null
          ? `rewound — as of unit ${rewound}, replayed from the sequence`
          : 'the legible surface of the whole tower'}
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  shapeLoop: LoopNode,
  shapeTimeline: TimelineNode,
  shapeDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function ReflexadShapeWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [abstract, setAbstract] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  // Phase driver — the engineer's irregular clock, ticking at the speed of
  // the work below it.
  useEffect(() => {
    if (!sim.phase || sim.phase === 'drain') return
    const ms =
      sim.phase === 'act' ? ACT_MS : sim.phase === 'read' ? READ_MS : sim.phase === 'gen' ? TOKEN_MS : OBSERVE_MS
    const t = setInterval(() => {
      setSim((s) => {
        const d = DECISIONS[s.dIdx]
        switch (s.phase) {
          case 'act':
          case 'observe':
            return nextDecision(s)
          case 'read':
            return { ...s, phase: 'gen' }
          case 'gen': {
            if (d.type !== 'run') return s
            const tok = d.tokens[s.tokIdx]
            if (!tok) return { ...s, phase: 'drain' }
            return {
              ...s,
              timeline: [...s.timeline, { role: 'llm', label: `t${s.tokIdx} ${tok.text}` }],
              cpuQueue: [...s.cpuQueue, ...tok.ops],
              tokIdx: s.tokIdx + 1,
              phase: s.tokIdx + 1 < d.tokens.length ? 'gen' : 'drain',
            }
          }
          default:
            return s
        }
      })
    }, ms)
    return () => clearInterval(t)
  }, [sim.phase])

  // CPU clock.
  const cpuBusy = sim.cpuQueue.length > 0 || sim.currentOp !== null
  useEffect(() => {
    if (!cpuBusy) return
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
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  // A run decision completes only when its expansion has fully landed.
  useEffect(() => {
    if (sim.phase !== 'drain' || cpuBusy) return
    const t = setTimeout(() => setSim((s) => (s.phase === 'drain' ? nextDecision(s) : s)), 300)
    return () => clearTimeout(t)
  }, [sim.phase, cpuBusy])

  function start() {
    setSelected(null)
    setSim({
      ...INITIAL,
      started: true,
      phase: 'act',
      timeline: [{ role: 'eng', label: `d0 ${DECISIONS[0].label}` }],
    })
  }

  function reset() {
    setSelected(null)
    setSim(INITIAL)
  }

  const done = sim.started && sim.dIdx >= DECISIONS.length
  const engActive = sim.phase === 'act' || sim.phase === 'observe'
  const llmActive = sim.phase === 'read' || sim.phase === 'gen'
  const currentDecision = sim.phase ? DECISIONS[sim.dIdx] : null
  const currentToken =
    sim.phase === 'gen' && currentDecision?.type === 'run'
      ? (currentDecision.tokens[sim.tokIdx]?.text ?? null)
      : null

  const counts = { eng: 0, llm: 0, cpu: 0 }
  for (const u of sim.timeline) counts[u.role]++

  // Rewind: with a unit selected, every node shows its state as of that
  // moment — replayed purely from the prefix of the sequence.
  const rewound = selected !== null
  const view = rewound ? sim.timeline.slice(0, selected + 1) : null
  const selRole = rewound ? sim.timeline[selected].role : null
  const litView = view ? replayLit(view) : sim.lit
  const engView = view ? lastLabel(view, 'eng') : engActive ? (currentDecision?.label ?? null) : null
  const llmView = view ? lastLabel(view, 'llm') : currentToken
  const cpuView = view ? lastLabel(view, 'cpu') : cpuBusy ? sim.currentOp : null

  const nodes: Node[] = [
    {
      id: 'eng',
      type: 'shapeLoop',
      position: { x: 0, y: 0 },
      data: { role: 'eng', current: engView, active: rewound ? selRole === 'eng' : engActive, abstract },
    },
    {
      id: 'llm',
      type: 'shapeLoop',
      position: { x: 235, y: 0 },
      data: { role: 'llm', current: llmView, active: rewound ? selRole === 'llm' : llmActive, abstract },
    },
    {
      id: 'cpu',
      type: 'shapeLoop',
      position: { x: 470, y: 0 },
      data: { role: 'cpu', current: cpuView, active: rewound ? selRole === 'cpu' : cpuBusy, abstract },
    },
    {
      id: 'timeline',
      type: 'shapeTimeline',
      position: { x: 45, y: 235 },
      // Hosts real buttons — force pointer events back on.
      style: { pointerEvents: 'all' },
      data: { timeline: sim.timeline, selected, onSelect: setSelected },
    },
    {
      id: 'display',
      type: 'shapeDisplay',
      position: { x: 285, y: 470 },
      data: { lit: litView, rewound: rewound ? selected : null },
    },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const clay = 'oklch(0.58 0.082 48)'
  const roleEdges = (
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
      label: id === 'eng' ? 'emits' : undefined,
      animated: active,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: active ? { stroke: color, strokeWidth: 1.5 } : { opacity: 0.4 },
    },
    {
      id: `ctx-${id}`,
      source: 'timeline',
      sourceHandle: 'in',
      target: id,
      targetHandle: 'ctx',
      label: id === 'cpu' ? 'context — the prefix' : undefined,
      animated: active,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: active ? { stroke: color, strokeWidth: 1, strokeDasharray: '4 4' } : { opacity: 0.25, strokeDasharray: '4 4' },
    },
  ])
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    ...roleEdges,
    {
      id: 'fx',
      source: 'timeline',
      sourceHandle: 'fx',
      target: 'display',
      label: 'effects',
      animated: cpuBusy,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: cpuBusy ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
  ]

  return (
    <WidgetFrame
      title="One shape, three scales"
      hint={
        <>
          <span className="block">
            Three loops, three clocks, one structure: a unit runs inside accumulated context, and
            its effects fold back in before the next one. Toggle the labels to the monadic form and
            nothing else changes. That&rsquo;s the claim.
          </span>
          <span className="mt-2 block">
            Run the session and the loops braid into one sequence. Click any unit: its context is
            everything before it, across every role. An opcode sits downstream of the decision that
            authored it, and a decision sits downstream of a thousand opcodes it observed.
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
        <button
          onClick={start}
          disabled={sim.started && !done}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> {done ? 'Run session again' : 'Run the session'}
        </button>
        <button
          onClick={() => setAbstract((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowsUpDownIcon className="size-4" /> Labels: {abstract ? 'monadic' : 'concrete'}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {counts.eng} d · {counts.llm} t · {counts.cpu} op
        </span>
      </div>
    </WidgetFrame>
  )
}
