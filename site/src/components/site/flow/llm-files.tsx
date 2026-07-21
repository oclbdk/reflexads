'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// Code and prose, from the same filesystem. smiley.asm executes as written —
// the same ten opcodes, every run. smiley.txt is read by the LLM and
// interpreted — the stream it becomes varies run to run. Both routes end as
// opcodes in the one instruction sequence; the difference is the route, and
// the guarantees that come with it.

const GRID = 8

type OpKind = 'clr' | 'px' | 'hlt'
type Op = { text: string; kind: OpKind; x?: number; y?: number; src: string }

const px = (x: number, y: number): Omit<Op, 'src'> => ({ text: `PX ${x},${y}`, kind: 'px', x, y })

const ASM_OPS: Omit<Op, 'src'>[] = [
  { text: 'CLR', kind: 'clr' },
  px(2, 2), px(5, 2),
  px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5),
  { text: 'HLT', kind: 'hlt' },
]

// Three readings of the same prose — the LLM's interpretation varies.
const VARIANTS: { name: string; tokens: { text: string; ops: Omit<Op, 'src'>[] }[] }[] = [
  {
    name: 'classic',
    tokens: [
      { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
      { text: 'eyes', ops: [px(2, 2), px(5, 2)] },
      { text: 'smile', ops: [px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
      { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
    ],
  },
  {
    name: 'wink',
    tokens: [
      { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
      { text: 'wink', ops: [px(2, 2), px(4, 2), px(5, 2)] },
      { text: 'smile', ops: [px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
      { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
    ],
  },
  {
    name: 'grin',
    tokens: [
      { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
      { text: 'eyes', ops: [px(2, 2), px(5, 2)] },
      { text: 'grin', ops: [px(1, 4), px(6, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)] },
      { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
    ],
  },
]

const LOAD_MS = 140
const READ_MS = 600
const TOKEN_MS = 700
const OP_MS = 250
const MAX_ROWS = 10

type Phase = 'idle' | 'loadCode' | 'readProse' | 'generating'
type Sim = {
  phase: Phase
  codePlan: Omit<Op, 'src'>[]
  tokPlan: { text: string; ops: Omit<Op, 'src'>[] }[]
  tokIdx: number
  variant: number
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  halted: boolean
  codeRuns: number
  proseRuns: number
  lastRun: 'code' | 'prose' | null
}
const INITIAL: Sim = {
  phase: 'idle',
  codePlan: [],
  tokPlan: [],
  tokIdx: 0,
  variant: 0,
  ops: [],
  pc: 0,
  lit: new Set(),
  halted: false,
  codeRuns: 0,
  proseRuns: 0,
  lastRun: null,
}

// ---- custom nodes -------------------------------------------------------

function FsNode({ data }: NodeProps) {
  const { active } = data as { active: 'code' | 'prose' | null }
  return (
    <div className="w-48 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Filesystem
      </div>
      <div
        className={clsx(
          'rounded-md px-2 py-1.5 ring-1 transition-shadow',
          active === 'code' ? 'ring-amber-400/80' : 'ring-transparent',
        )}
      >
        <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
          smiley.asm
          <span className="rounded-sm bg-zinc-100 px-1 text-[9px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            code
          </span>
        </div>
        <div className="font-mono text-[9px]/4 text-zinc-400 dark:text-zinc-500">
          CLR · PX 2,2 · PX 5,2 · … · HLT
        </div>
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 ring-1 transition-shadow',
          active === 'prose' ? 'ring-violet-400/80' : 'ring-transparent',
        )}
      >
        <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
          smiley.txt
          <span className="rounded-sm bg-violet-500/10 px-1 text-[9px] text-violet-500 dark:text-violet-400">
            prose
          </span>
        </div>
        <div className="font-mono text-[9px]/4 text-zinc-400 italic dark:text-zinc-500">
          &ldquo;draw a smiley&rdquo;
        </div>
      </div>
      <Handle id="code" type="source" position={Position.Right} style={{ top: '32%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="prose" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { phase, current, variant } = data as {
    phase: Phase
    current: string | null
    variant: string | null
  }
  const generating = phase === 'generating'
  return (
    <div className="w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          generating && current
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : phase === 'readProse'
              ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {generating && current ? current : phase === 'readProse' ? 'reading…' : 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        {variant ? `interpretation: ${variant}` : 'interprets prose — may vary'}
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="gen" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function StreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  const start = Math.max(0, ops.length - MAX_ROWS)
  const window = ops.slice(start)
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Instruction sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {window.map((op, i) => {
          const gi = start + i
          return (
            <li
              key={gi}
              className={clsx(
                'flex items-baseline gap-2 rounded-sm px-1.5',
                gi < pc && 'text-zinc-300 dark:text-zinc-600',
                gi === pc && 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
                gi > pc && 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              <span className="w-4 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
                {gi}
              </span>
              <span className="w-16 shrink-0">{op.text}</span>
              <span
                className={clsx(
                  'text-[9px]',
                  op.src === 'asm' ? 'text-amber-500/80' : 'text-violet-400/70',
                )}
              >
                {op.src}
              </span>
            </li>
          )
        })}
        {Array.from({ length: MAX_ROWS - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <Handle id="in" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="gen" type="target" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        can&rsquo;t tell the routes apart
      </div>
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
        exact, or interpreted
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  filesFs: FsNode,
  filesLlm: LlmNode,
  filesStream: StreamNode,
  filesCpu: CpuNode,
  filesDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function LlmFilesWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // The route clock: code loads op by op; prose is read, then generated
  // token by token, each token expanding into its opcode span.
  useEffect(() => {
    if (sim.phase === 'idle') return
    const ms = sim.phase === 'loadCode' ? LOAD_MS : sim.phase === 'readProse' ? READ_MS : TOKEN_MS
    const t = setInterval(() => {
      setSim((s) => {
        switch (s.phase) {
          case 'loadCode': {
            const [op, ...rest] = s.codePlan
            if (!op) return { ...s, phase: 'idle' }
            return {
              ...s,
              ops: [...s.ops, { ...op, src: 'asm' }],
              codePlan: rest,
              phase: rest.length > 0 ? 'loadCode' : 'idle',
            }
          }
          case 'readProse':
            return { ...s, phase: 'generating' }
          case 'generating': {
            const tok = s.tokPlan[s.tokIdx]
            if (!tok) return { ...s, phase: 'idle' }
            const ops = [...s.ops, ...tok.ops.map((o) => ({ ...o, src: `t${s.tokIdx}` }))]
            return {
              ...s,
              ops,
              tokIdx: s.tokIdx + 1,
              phase: s.tokIdx + 1 < s.tokPlan.length ? 'generating' : 'idle',
            }
          }
          default:
            return s
        }
      })
    }, ms)
    return () => clearInterval(t)
  }, [sim.phase])

  // The CPU clock, as ever.
  const cpuBusy = !sim.halted && sim.pc < sim.ops.length
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

  function runCode() {
    setSim((s) => ({
      ...s,
      ops: [],
      pc: 0,
      halted: false,
      codePlan: ASM_OPS,
      tokPlan: [],
      tokIdx: 0,
      phase: 'loadCode',
      codeRuns: s.codeRuns + 1,
      lastRun: 'code',
    }))
  }

  function runProse() {
    setSim((s) => {
      const variant = s.proseRuns % VARIANTS.length
      return {
        ...s,
        ops: [],
        pc: 0,
        halted: false,
        codePlan: [],
        tokPlan: VARIANTS[variant].tokens,
        tokIdx: 0,
        variant,
        phase: 'readProse',
        proseRuns: s.proseRuns + 1,
        lastRun: 'prose',
      }
    })
  }

  function reset() {
    setSim(INITIAL)
  }

  const loading = sim.phase === 'loadCode'
  const readingProse = sim.phase === 'readProse'
  const generating = sim.phase === 'generating'
  const proseActive = readingProse || generating
  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const currentToken = generating ? (sim.tokPlan[sim.tokIdx]?.text ?? null) : null
  const variantName =
    sim.lastRun === 'prose' && !readingProse ? VARIANTS[sim.variant].name : null

  const nodes: Node[] = [
    {
      id: 'fs',
      type: 'filesFs',
      position: { x: 0, y: 0 },
      data: { active: loading ? 'code' : proseActive ? 'prose' : null },
    },
    {
      id: 'llm',
      type: 'filesLlm',
      position: { x: 55, y: 230 },
      data: { phase: sim.phase, current: currentToken, variant: variantName },
    },
    { id: 'stream', type: 'filesStream', position: { x: 300, y: 0 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'filesCpu', position: { x: 545, y: 45 }, data: { op: currentOp?.text ?? null } },
    { id: 'display', type: 'filesDisplay', position: { x: 545, y: 200 }, data: { lit: sim.lit } },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'code',
      source: 'fs',
      sourceHandle: 'code',
      target: 'stream',
      targetHandle: 'in',
      label: 'code — executed as written',
      animated: loading,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: loading ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'read',
      source: 'fs',
      sourceHandle: 'prose',
      target: 'llm',
      label: 'prose — read',
      animated: readingProse,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: proseActive ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'interpret',
      source: 'llm',
      sourceHandle: 'gen',
      target: 'stream',
      targetHandle: 'gen',
      label: 'interpreted — tokens → opcodes',
      animated: generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: generating ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'fetch',
      source: 'stream',
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

  const busy = sim.phase !== 'idle' || cpuBusy
  const statusLabel =
    sim.phase === 'idle'
      ? cpuBusy
        ? 'executing'
        : sim.lastRun
          ? `${sim.lastRun === 'code' ? 'code — identical every run' : `prose — “${VARIANTS[sim.variant].name}”`}`
          : 'idle'
      : sim.phase === 'loadCode'
        ? 'loading smiley.asm'
        : sim.phase === 'readProse'
          ? 'reading smiley.txt'
          : 'interpreting'

  return (
    <WidgetFrame
      title="Code and prose, one filesystem"
      hint={
        <>
          Two files, two routes. <code className="font-mono text-xs">smiley.asm</code>{' '}streams
          straight into the instruction sequence — the same ten opcodes, every run.{' '}
          <code className="font-mono text-xs">smiley.txt</code>{' '}routes through the LLM: read,
          interpreted, and expanded into opcodes that differ run to run — classic, wink, grin. Check
          the provenance column: <span className="font-mono text-xs text-amber-500">asm</span> ops
          were written; <span className="font-mono text-xs text-violet-500">t·</span> ops were
          meant. The CPU executes both without knowing the difference.
        </>
      }
    >
      <FlowCanvas
        className="h-104"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={runCode}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <PlayIcon className="size-4" /> Run smiley.asm
        </button>
        <button
          onClick={runProse}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <SparklesIcon className="size-4" /> Run smiley.txt
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {statusLabel} · asm ×{sim.codeRuns} · txt ×{sim.proseRuns}
        </span>
      </div>
    </WidgetFrame>
  )
}
