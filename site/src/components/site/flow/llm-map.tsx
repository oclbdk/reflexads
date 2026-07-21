'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The Role of LLM, first flow. All machinery abstracted to CPU and display;
// what is new is the second stream. The LLM emits tokens at its own clock —
// four of them — and each token expands into a span of opcodes on the CPU
// stream — ten of them — which drain at a faster clock. One token, many
// opcodes; every opcode traceable back (t0…t3) to the token that produced it.

type OpKind = 'clr' | 'px' | 'hlt'
type Op = { text: string; kind: OpKind; x?: number; y?: number; parent: number }

const TOKENS: { text: string; ops: Omit<Op, 'parent'>[] }[] = [
  { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
  {
    text: 'eyes',
    ops: [
      { text: 'PX 2,2', kind: 'px', x: 2, y: 2 },
      { text: 'PX 5,2', kind: 'px', x: 5, y: 2 },
    ],
  },
  {
    text: 'smile',
    ops: [
      { text: 'PX 1,4', kind: 'px', x: 1, y: 4 },
      { text: 'PX 6,4', kind: 'px', x: 6, y: 4 },
      { text: 'PX 2,5', kind: 'px', x: 2, y: 5 },
      { text: 'PX 3,5', kind: 'px', x: 3, y: 5 },
      { text: 'PX 4,5', kind: 'px', x: 4, y: 5 },
      { text: 'PX 5,5', kind: 'px', x: 5, y: 5 },
    ],
  },
  { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
]

const TOTAL_OPS = TOKENS.reduce((n, t) => n + t.ops.length, 0)
const GRID = 8
const TOKEN_MS = 1000
const OP_MS = 250

type Sim = {
  tIdx: number
  generating: boolean
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  halted: boolean
}
const INITIAL: Sim = { tIdx: 0, generating: false, ops: [], pc: 0, lit: new Set(), halted: false }

// ---- custom nodes -------------------------------------------------------

function LlmNode({ data }: NodeProps) {
  const { current, generating } = data as { current: string | null; generating: boolean }
  return (
    <div className="w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1 font-mono text-[10px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        &ldquo;draw a smiley&rdquo;
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          generating && current
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {generating && current ? current : current ? '⟨eos⟩' : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">one token at a time</div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TokenStreamNode({ data }: NodeProps) {
  const { tIdx, generating } = data as { tIdx: number; generating: boolean }
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Token sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {TOKENS.map((tok, i) => {
          const emitted = i < tIdx
          const current = generating && i === tIdx
          if (!emitted && !current) {
            return (
              <li key={i} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
                ·
              </li>
            )
          }
          return (
            <li
              key={i}
              className={clsx(
                'flex items-baseline gap-2 rounded-sm px-1.5',
                current
                  ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
                  : 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              <span className="w-4 shrink-0 text-[9px] text-violet-400/70">t{i}</span>
              <span className="w-12 shrink-0">{tok.text}</span>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                → {tok.ops.length} op{tok.ops.length === 1 ? '' : 's'}
              </span>
            </li>
          )
        })}
      </ol>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="expand" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function OpStreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Instruction sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {ops.map((op, i) => (
          <li
            key={i}
            className={clsx(
              'flex items-baseline gap-2 rounded-sm px-1.5',
              i < pc && 'text-zinc-300 dark:text-zinc-600',
              i === pc && 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
              i > pc && 'text-zinc-600 dark:text-zinc-300',
            )}
          >
            <span className="w-4 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
              {i}
            </span>
            <span className="w-16 shrink-0">{op.text}</span>
            <span className="text-[9px] text-violet-400/70">t{op.parent}</span>
          </li>
        ))}
        {Array.from({ length: TOTAL_OPS - ops.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fetch" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">machinery abstracted</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DisplayNode({ data }: NodeProps) {
  const { lit } = data as { lit: ReadonlySet<string> }
  return (
    <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
        can&rsquo;t tell who authored the stream
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  mapLlm: LlmNode,
  mapTokens: TokenStreamNode,
  mapOps: OpStreamNode,
  mapCpu: CpuNode,
  mapDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function LlmMapWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  const cpuBusy = !sim.halted && sim.pc < sim.ops.length

  // The LLM's clock: slow, one token at a time. Each emission appends the
  // token's whole opcode span to the CPU stream.
  useEffect(() => {
    if (!sim.generating) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.tIdx >= TOKENS.length) return { ...s, generating: false }
        const tok = TOKENS[s.tIdx]
        const ops = [...s.ops, ...tok.ops.map((o) => ({ ...o, parent: s.tIdx }))]
        return { ...s, ops, tIdx: s.tIdx + 1, generating: s.tIdx + 1 < TOKENS.length }
      })
    }, TOKEN_MS)
    return () => clearInterval(t)
  }, [sim.generating])

  // The CPU's clock: fast, one opcode at a time, draining whatever spans the
  // tokens have expanded into so far.
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.halted || s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        const lit = new Set(s.lit)
        let halted: boolean = s.halted
        if (op.kind === 'clr') lit.clear()
        if (op.kind === 'px') lit.add(`${op.x},${op.y}`)
        if (op.kind === 'hlt') halted = true
        return { ...s, pc: s.pc + 1, lit, halted }
      })
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  function generate() {
    setSim({ ...INITIAL, generating: true })
  }

  function reset() {
    setSim(INITIAL)
  }

  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const lastToken = sim.tIdx > 0 ? TOKENS[sim.tIdx - 1].text : null
  const emittingToken = sim.generating ? (TOKENS[sim.tIdx]?.text ?? null) : null

  const nodes: Node[] = [
    {
      id: 'llm',
      type: 'mapLlm',
      position: { x: 0, y: 10 },
      data: { current: emittingToken ?? lastToken, generating: sim.generating },
    },
    {
      id: 'tokens',
      type: 'mapTokens',
      position: { x: 230, y: 0 },
      data: { tIdx: sim.tIdx, generating: sim.generating },
    },
    { id: 'ops', type: 'mapOps', position: { x: 230, y: 190 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'mapCpu', position: { x: 465, y: 250 }, data: { op: currentOp?.text ?? null } },
    { id: 'display', type: 'mapDisplay', position: { x: 640, y: 215 }, data: { lit: sim.lit } },
  ]

  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'gen',
      source: 'llm',
      target: 'tokens',
      label: 'tokens',
      animated: sim.generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: sim.generating ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'expand',
      source: 'tokens',
      sourceHandle: 'expand',
      target: 'ops',
      label: '1 token → n opcodes',
      animated: sim.generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { stroke: violet, strokeWidth: 1.5 },
    },
    {
      id: 'fetch',
      source: 'ops',
      sourceHandle: 'fetch',
      target: 'cpu',
      label: 'opcodes',
      animated: cpuBusy,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
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
  ]

  const done = !sim.generating && sim.tIdx === TOKENS.length && !cpuBusy

  return (
    <WidgetFrame
      title="One token, many opcodes"
      hint={
        <>
          Two streams, two clocks. The LLM emits four tokens, one at a time; each expands into a
          span of opcodes — ten in all — that the CPU drains at its own, faster clock. The{' '}
          <span className="font-mono text-xs">t0…t3</span> tags on the opcode stream are the mapping
          run backward: every opcode knows which token produced it. The display renders the same
          smiley as before — it cannot tell which stream authored it.
        </>
      }
    >
      <FlowCanvas
        className="h-112"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={sim.generating || cpuBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <SparklesIcon className="size-4" /> Generate
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          tokens {sim.tIdx}/{TOKENS.length} · opcodes {Math.min(sim.pc, sim.ops.length)}/{TOTAL_OPS}
          {done ? ' · halted' : ''}
        </span>
      </div>
    </WidgetFrame>
  )
}
