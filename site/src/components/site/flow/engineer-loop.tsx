'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { Em, WidgetFrame } from '../widget-frame'

// The Role of Engineer, first flow. The slowest stream of all: decisions, one
// at a time, each expanding into LLM and CPU flows at faster clocks. And the
// one edge no other role has — observe: the engineer reads the display,
// evaluates the output against intent, and refines. Write, run, evaluate,
// refine, run, ship. The engineering loop, closed through the legible surface.

const GRID = 8

type OpKind = 'clr' | 'px' | 'hlt'
type Op = { text: string; kind: OpKind; x?: number; y?: number }
const px = (x: number, y: number): Op => ({ text: `PX ${x},${y}`, kind: 'px', x, y })

const TOKEN_OPS: Record<string, Op[]> = {
  clear: [{ text: 'CLR', kind: 'clr' }],
  wink: [px(2, 2), px(4, 2), px(5, 2)],
  eyes: [px(2, 2), px(5, 2)],
  smile: [px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)],
  done: [{ text: 'HLT', kind: 'hlt' }],
}

// The underspecified prompt gets the wink; the refined one gets the intent.
const RUNS: string[][] = [
  ['clear', 'wink', 'smile', 'done'],
  ['clear', 'eyes', 'smile', 'done'],
]

const FILE_VERSIONS = ['(empty)', '“draw a smiley”', '“draw a smiley,\nboth eyes open”']

type Decision =
  | { type: 'edit'; label: string; note: string; fileV: number }
  | { type: 'run'; label: string; note: string; variant: number }
  | { type: 'eval'; label: string; verdict: string }

const DECISIONS: Decision[] = [
  { type: 'edit', label: 'write smiley.txt', note: '“draw a smiley”', fileV: 1 },
  { type: 'run', label: 'run it', note: 'LLM → CPU → display', variant: 0 },
  { type: 'eval', label: 'evaluate the display', verdict: '✗ winked — prompt underspecified' },
  { type: 'edit', label: 'refine smiley.txt', note: '+ “both eyes open”', fileV: 2 },
  { type: 'run', label: 'run it again', note: 'LLM → CPU → display', variant: 1 },
  { type: 'eval', label: 'evaluate the display', verdict: '✓ matches intent — ship it' },
]

const EDIT_MS = 1400
const READ_MS = 600
const TOKEN_MS = 700
const OP_MS = 250
const OBSERVE_MS = 1700

type Phase = 'edit' | 'read' | 'gen' | 'drain' | 'observe' | null
type Sim = {
  started: boolean
  dIdx: number
  phase: Phase
  fileV: number
  tokPlan: string[]
  tokIdx: number
  currentTok: string | null
  opQueue: Op[]
  currentOp: string | null
  lit: ReadonlySet<string>
  tokens: number
  opsCount: number
  verdicts: Record<number, string>
}
const INITIAL: Sim = {
  started: false,
  dIdx: 0,
  phase: null,
  fileV: 0,
  tokPlan: [],
  tokIdx: 0,
  currentTok: null,
  opQueue: [],
  currentOp: null,
  lit: new Set(),
  tokens: 0,
  opsCount: 0,
  verdicts: {},
}

// Advance to the next decision, arming its opening phase.
function nextDecision(s: Sim): Sim {
  const nd = s.dIdx + 1
  if (nd >= DECISIONS.length) return { ...s, dIdx: nd, phase: null, currentTok: null }
  const d = DECISIONS[nd]
  return {
    ...s,
    dIdx: nd,
    currentTok: null,
    phase: d.type === 'edit' ? 'edit' : d.type === 'run' ? 'read' : 'observe',
    tokPlan: d.type === 'run' ? RUNS[d.variant] : s.tokPlan,
    tokIdx: d.type === 'run' ? 0 : s.tokIdx,
  }
}

// ---- custom nodes -------------------------------------------------------

function EngineerNode({ data }: NodeProps) {
  const { label, active, done } = data as { label: string | null; active: boolean; done: boolean }
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Engineer
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1.5 font-mono text-xs',
          done
            ? 'bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-400'
            : active && label
              ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {done ? 'shipped ✓' : active && label ? label : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">one decision at a time</div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="obs" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DecisionsNode({ data }: NodeProps) {
  const { dIdx, phase, verdicts } = data as {
    dIdx: number
    phase: Phase
    verdicts: Record<number, string>
  }
  return (
    <div className="w-64 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Decision sequence
      </div>
      <ol className="font-mono text-[10px]/4">
        {DECISIONS.map((d, i) => {
          const emitted = i < dIdx
          const current = i === dIdx && phase !== null
          if (!emitted && !current) {
            return (
              <li key={i} className="px-1.5 py-0.5 text-zinc-200 select-none dark:text-zinc-700">
                ·
              </li>
            )
          }
          const note = d.type === 'eval' ? (verdicts[i] ?? '…') : d.note
          return (
            <li
              key={i}
              className={clsx(
                'flex items-baseline gap-1.5 rounded-sm px-1.5 py-0.5',
                current
                  ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
                  : 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              <span className="w-5 shrink-0 text-[9px] text-teal-500/70">d{i}</span>
              <span className="shrink-0">{d.label}</span>
              <span
                className={clsx(
                  'truncate text-[9px] italic',
                  verdicts[i]?.startsWith('✓')
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : verdicts[i]?.startsWith('✗')
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-zinc-400 dark:text-zinc-500',
                )}
              >
                {note}
              </span>
            </li>
          )
        })}
      </ol>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="edit" type="source" position={Position.Bottom} style={{ left: '25%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="run" type="source" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function FileNode({ data }: NodeProps) {
  const { fileV, editing } = data as { fileV: number; editing: boolean }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        editing ? 'ring-2 ring-teal-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline justify-center gap-1.5 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        smiley.txt
        {fileV > 0 && (
          <span className="rounded-sm bg-teal-500/10 px-1 font-mono text-[9px] text-teal-600 normal-case dark:text-teal-400">
            v{fileV}
          </span>
        )}
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1.5 text-center font-mono text-[10px]/4 whitespace-pre-line text-zinc-600 italic dark:bg-white/5 dark:text-zinc-300">
        {FILE_VERSIONS[fileV]}
      </div>
      <div className="mt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        prose — authored by decision
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { phase, current } = data as { phase: Phase; current: string | null }
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          phase === 'gen' && current
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : phase === 'read'
              ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {phase === 'gen' && current ? current : phase === 'read' ? 'reading…' : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">token stream implied</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="cmd" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="gen" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CpuNode({ data }: NodeProps) {
  const { op } = data as { op: string | null }
  return (
    <div className="w-28 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        CPU
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          op
            ? 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {op ?? 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">opcode stream implied</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DisplayNode({ data }: NodeProps) {
  const { lit, observing } = data as { lit: ReadonlySet<string>; observing: boolean }
  return (
    <div
      className={clsx(
        'rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        observing ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
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
      <div className="pt-1 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        where the engineer reads back
      </div>
      <Handle type="target" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="obs" type="source" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  engEngineer: EngineerNode,
  engDecisions: DecisionsNode,
  engFile: FileNode,
  engLlm: LlmNode,
  engCpu: CpuNode,
  engDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function EngineerLoopWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // Phase driver: each decision expands at its own cadence.
  useEffect(() => {
    if (!sim.phase || sim.phase === 'drain') return
    const ms =
      sim.phase === 'edit'
        ? EDIT_MS
        : sim.phase === 'read'
          ? READ_MS
          : sim.phase === 'gen'
            ? TOKEN_MS
            : OBSERVE_MS
    const t = setInterval(() => {
      setSim((s) => {
        const d = DECISIONS[s.dIdx]
        switch (s.phase) {
          case 'edit':
            return nextDecision({ ...s, fileV: d.type === 'edit' ? d.fileV : s.fileV })
          case 'read':
            return { ...s, phase: 'gen' }
          case 'gen': {
            const tok = s.tokPlan[s.tokIdx]
            if (!tok) return { ...s, phase: 'drain', currentTok: null }
            return {
              ...s,
              currentTok: tok,
              tokens: s.tokens + 1,
              opQueue: [...s.opQueue, ...TOKEN_OPS[tok]],
              tokIdx: s.tokIdx + 1,
              phase: s.tokIdx + 1 < s.tokPlan.length ? 'gen' : 'drain',
            }
          }
          case 'observe':
            return nextDecision({
              ...s,
              verdicts: d.type === 'eval' ? { ...s.verdicts, [s.dIdx]: d.verdict } : s.verdicts,
            })
          default:
            return s
        }
      })
    }, ms)
    return () => clearInterval(t)
  }, [sim.phase])

  // CPU clock: drains whatever the run expanded into.
  const cpuBusy = sim.opQueue.length > 0 || sim.currentOp !== null
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        const [op, ...rest] = s.opQueue
        if (!op) return { ...s, currentOp: null }
        const lit = new Set(s.lit)
        if (op.kind === 'clr') lit.clear()
        if (op.kind === 'px') lit.add(`${op.x},${op.y}`)
        return { ...s, opQueue: rest, currentOp: op.text, lit, opsCount: s.opsCount + 1 }
      })
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  // A run decision completes only when its whole expansion has landed.
  useEffect(() => {
    if (sim.phase !== 'drain' || cpuBusy) return
    const t = setTimeout(() => setSim((s) => (s.phase === 'drain' ? nextDecision(s) : s)), 400)
    return () => clearTimeout(t)
  }, [sim.phase, cpuBusy])

  function start() {
    setSim({ ...INITIAL, started: true, phase: 'edit' })
  }

  function reset() {
    setSim(INITIAL)
  }

  const done = sim.started && sim.dIdx >= DECISIONS.length
  const acting = sim.phase !== null
  const editing = sim.phase === 'edit'
  const running = sim.phase === 'read' || sim.phase === 'gen' || sim.phase === 'drain'
  const observing = sim.phase === 'observe'
  const currentDecision = acting ? DECISIONS[sim.dIdx] : null

  const nodes: Node[] = [
    {
      id: 'engineer',
      type: 'engEngineer',
      position: { x: 0, y: 30 },
      data: { label: currentDecision?.label ?? null, active: acting, done },
    },
    {
      id: 'decisions',
      type: 'engDecisions',
      position: { x: 200, y: 0 },
      data: { dIdx: sim.dIdx, phase: sim.phase, verdicts: sim.verdicts },
    },
    { id: 'display', type: 'engDisplay', position: { x: 600, y: 20 }, data: { lit: sim.lit, observing } },
    { id: 'file', type: 'engFile', position: { x: 20, y: 250 }, data: { fileV: sim.fileV, editing } },
    { id: 'llm', type: 'engLlm', position: { x: 260, y: 260 }, data: { phase: sim.phase, current: sim.currentTok } },
    { id: 'cpu', type: 'engCpu', position: { x: 455, y: 260 }, data: { op: sim.currentOp } },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'decide',
      source: 'engineer',
      target: 'decisions',
      label: 'decisions',
      animated: acting,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: acting ? { stroke: teal, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'edit',
      source: 'decisions',
      sourceHandle: 'edit',
      target: 'file',
      label: 'author prose',
      animated: editing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: editing ? { stroke: teal, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'run',
      source: 'decisions',
      sourceHandle: 'run',
      target: 'llm',
      targetHandle: 'cmd',
      label: 'run',
      animated: running,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: running ? { stroke: teal, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'prose',
      source: 'file',
      sourceHandle: 'out',
      target: 'llm',
      label: 'prose',
      animated: sim.phase === 'read',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.phase === 'read' ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'expand',
      source: 'llm',
      sourceHandle: 'gen',
      target: 'cpu',
      label: 'tokens → opcodes',
      animated: sim.phase === 'gen',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.phase === 'gen' ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'fx',
      source: 'cpu',
      sourceHandle: 'fx',
      target: 'display',
      label: 'effects',
      animated: cpuBusy,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: cpuBusy ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'observe',
      source: 'display',
      sourceHandle: 'obs',
      target: 'engineer',
      targetHandle: 'obs',
      label: 'observe',
      animated: observing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: observing ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
  ]

  const statusLabel = done
    ? 'shipped'
    : !sim.started
      ? 'idle — start the session'
      : sim.phase === 'edit'
        ? 'editing prose'
        : sim.phase === 'read'
          ? 'LLM reading'
          : sim.phase === 'gen'
            ? 'generating'
            : sim.phase === 'drain'
              ? 'executing'
              : sim.phase === 'observe'
                ? 'evaluating output'
                : 'working'

  return (
    <WidgetFrame
      title="One decision, many streams"
      hint={
        <>
          The engineer&rsquo;s stream is the slowest and steers everything: six decisions expand
          into tokens and opcodes at faster clocks below. The first run comes back wrong — the
          prompt was underspecified, and the LLM winked. The <Em>observe</Em>{' '}edge is the one only
          the engineer has: read the display, judge it against intent, refine the prose, run again,
          ship. Write, run, evaluate — the engineering loop, closed through the same surface
          everything else renders to.
        </>
      }
    >
      <FlowCanvas
        className="h-108"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={start}
          disabled={sim.started && !done}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> {done ? 'Run session again' : 'Start the session'}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {statusLabel} · {Math.min(sim.dIdx, DECISIONS.length)} decisions · {sim.tokens} tokens ·{' '}
          {sim.opsCount} opcodes
        </span>
      </div>
    </WidgetFrame>
  )
}
