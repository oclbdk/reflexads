'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PlayIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { Em, WidgetFrame } from '../widget-frame'

// External data sources, to and from. A weather service — whose state the
// user controls — is read by both routes, differently: code reads it at
// execution time (a GET opcode on the CPU) and traps if the response doesn't
// parse; prose reads it at interpretation time (the LLM tool-calls before
// generating) and absorbs even a garbled response. Both write back, in their
// own styles: code PUTs a status code, the LLM reports in prose.

const GRID = 8

type Cond = 'sun' | 'rain' | 'garbled'
const RESPONSES: Record<Cond, string> = {
  sun: '{"cond":"sun"}',
  rain: '{"cond":"rain"}',
  garbled: 'p@rtly cl0udy??',
}

const SUN: [number, number][] = [
  [3, 3], [4, 3], [3, 4], [4, 4],
  [1, 1], [6, 1], [1, 6], [6, 6],
  [3, 0], [4, 0], [3, 7], [4, 7],
  [0, 3], [0, 4], [7, 3], [7, 4],
]
const CLOUD: [number, number][] = [
  [2, 2], [3, 2], [4, 2], [5, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
]
const DROPS: [number, number][] = [[2, 5], [4, 5], [6, 5], [3, 6], [5, 6]]
const PARTLY: [number, number][] = [
  [5, 1], [6, 1], [5, 2], [6, 2],
  [1, 4], [2, 4], [3, 4], [4, 4],
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
]

type OpKind = 'clr' | 'spr' | 'get' | 'brc' | 'jmp' | 'put' | 'hlt'
type Op = {
  text: string
  kind: OpKind
  pixels?: [number, number][]
  jump?: number
  payload?: string
  src: string
}

const CODE_OPS: Omit<Op, 'src'>[] = [
  { text: 'CLR', kind: 'clr' },
  { text: 'GET wx', kind: 'get' },
  { text: 'BRC 5', kind: 'brc', jump: 5 },
  { text: 'SPR SUN', kind: 'spr', pixels: SUN },
  { text: 'JMP 6', kind: 'jmp', jump: 6 },
  { text: 'SPR RAIN', kind: 'spr', pixels: [...CLOUD, ...DROPS] },
  { text: 'PUT rpt', kind: 'put' },
  { text: 'HLT', kind: 'hlt' },
]

// The LLM's reading of each response, as token → opcode-span expansions.
function prosePlan(cond: Cond): { text: string; ops: Omit<Op, 'src'>[] }[] {
  switch (cond) {
    case 'sun':
      return [
        { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
        { text: 'sun', ops: [{ text: 'SPR SUN', kind: 'spr', pixels: SUN }] },
        { text: 'report', ops: [{ text: 'PUT rpt', kind: 'put', payload: 'drew the sun' }] },
        { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
      ]
    case 'rain':
      return [
        { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
        { text: 'cloud', ops: [{ text: 'SPR CLOUD', kind: 'spr', pixels: CLOUD }] },
        { text: 'rain', ops: [{ text: 'SPR DROPS', kind: 'spr', pixels: DROPS }] },
        { text: 'report', ops: [{ text: 'PUT rpt', kind: 'put', payload: 'drew the rain' }] },
        { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
      ]
    case 'garbled':
      return [
        { text: 'hmm…', ops: [] },
        { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
        { text: 'partly', ops: [{ text: 'SPR PARTLY', kind: 'spr', pixels: PARTLY }] },
        { text: 'report', ops: [{ text: 'PUT rpt', kind: 'put', payload: 'guessed: partly cloudy' }] },
        { text: 'done', ops: [{ text: 'HLT', kind: 'hlt' }] },
      ]
  }
}

const LOAD_MS = 140
const READ_MS = 600
const CALL_MS = 650
const TOKEN_MS = 700
const OP_MS = 320
const MAX_ROWS = 8

type Phase = 'idle' | 'loadCode' | 'readProse' | 'call' | 'respond' | 'generating'
type Report = { by: 'code' | 'prose'; text: string } | null
type Sim = {
  phase: Phase
  cond: Cond
  codePlan: Omit<Op, 'src'>[]
  tokPlan: { text: string; ops: Omit<Op, 'src'>[] }[]
  tokIdx: number
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  halted: boolean
  error: boolean
  report: Report
}
const INITIAL: Sim = {
  phase: 'idle',
  cond: 'sun',
  codePlan: [],
  tokPlan: [],
  tokIdx: 0,
  ops: [],
  pc: 0,
  lit: new Set(),
  halted: false,
  error: false,
  report: null,
}

// ---- custom nodes -------------------------------------------------------

function FsNode({ data }: NodeProps) {
  const { active } = data as { active: 'code' | 'prose' | null }
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Filesystem
      </div>
      <div
        className={clsx(
          'rounded-md px-2 py-1 ring-1 transition-shadow',
          active === 'code' ? 'ring-amber-400/80' : 'ring-transparent',
        )}
      >
        <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
          weather.asm
          <span className="rounded-sm bg-zinc-100 px-1 text-[9px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            code
          </span>
        </div>
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1 ring-1 transition-shadow',
          active === 'prose' ? 'ring-violet-400/80' : 'ring-transparent',
        )}
      >
        <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
          weather.txt
          <span className="rounded-sm bg-violet-500/10 px-1 text-[9px] text-violet-500 dark:text-violet-400">
            prose
          </span>
        </div>
        <div className="font-mono text-[9px]/4 text-zinc-400 italic dark:text-zinc-500">
          &ldquo;check the weather, draw it&rdquo;
        </div>
      </div>
      <Handle id="code" type="source" position={Position.Right} style={{ top: '32%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="prose" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { phase, current } = data as { phase: Phase; current: string | null }
  const generating = phase === 'generating'
  const busyLabel =
    phase === 'readProse' ? 'reading…' : phase === 'call' ? 'calling tool…' : phase === 'respond' ? 'reading response…' : null
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
            : busyLabel
              ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {generating && current ? current : (busyLabel ?? 'idle')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        reads the world before it writes the stream
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="gen" type="source" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="call" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="resp" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function StreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  const start = Math.max(0, ops.length - MAX_ROWS)
  const window = ops.slice(start)
  return (
    <div className="w-40 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
                'flex items-baseline gap-1.5 rounded-sm px-1.5',
                gi < pc && 'text-zinc-300 dark:text-zinc-600',
                gi === pc && 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
                gi > pc && 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              <span className="w-3 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
                {gi}
              </span>
              <span className="w-18 shrink-0 truncate">{op.text}</span>
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
  const { op, error } = data as { op: string | null; error: boolean }
  return (
    <div className="w-32 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        CPU
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          error
            ? 'bg-rose-500/15 font-semibold text-rose-600 dark:text-rose-400'
            : op
              ? 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {error ? 'TRAP: parse' : (op ?? 'idle')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        code reads the world at run time
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="net" type="source" position={Position.Bottom} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="netin" type="target" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ServiceNode({ data }: NodeProps) {
  const { cond, report, disabled, onSet } = data as {
    cond: Cond
    report: Report
    disabled: boolean
    onSet: (c: Cond) => void
  }
  return (
    <div className="w-48 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Weather service
      </div>
      <div className="mt-1 flex justify-center gap-1">
        {(['sun', 'rain', 'garbled'] as Cond[]).map((c) => (
          <button
            key={c}
            onClick={() => onSet(c)}
            disabled={disabled}
            className={clsx(
              'rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 transition-colors',
              cond === c
                ? 'bg-sky-500/15 font-semibold text-sky-600 ring-sky-400/50 dark:text-sky-400'
                : 'text-zinc-500 ring-zinc-950/10 dark:text-zinc-400 dark:ring-white/10',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1 text-center font-mono text-[10px] text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
        {RESPONSES[cond]}
      </div>
      <div className="mt-1 truncate rounded-md px-2 text-center font-mono text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        {report ? (
          <>
            log ← <span className={report.by === 'code' ? 'text-amber-500' : 'text-violet-400'}>{report.text}</span>
          </>
        ) : (
          'log: —'
        )}
      </div>
      <div className="mt-0.5 text-center text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        external — beyond the system boundary
      </div>
      <Handle id="tocpu" type="source" position={Position.Top} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fromcpu" type="target" position={Position.Top} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fromllm" type="target" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="tollm" type="source" position={Position.Left} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        the world, rendered
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  extFs: FsNode,
  extLlm: LlmNode,
  extStream: StreamNode,
  extCpu: CpuNode,
  extService: ServiceNode,
  extDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function LlmExternalWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // Route clock: code loads; prose reads, tool-calls, hears back, generates.
  useEffect(() => {
    if (sim.phase === 'idle') return
    const ms =
      sim.phase === 'loadCode'
        ? LOAD_MS
        : sim.phase === 'readProse'
          ? READ_MS
          : sim.phase === 'call' || sim.phase === 'respond'
            ? CALL_MS
            : TOKEN_MS
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
            return { ...s, phase: 'call' }
          case 'call':
            return { ...s, phase: 'respond' }
          case 'respond':
            return { ...s, tokPlan: prosePlan(s.cond), tokIdx: 0, phase: 'generating' }
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

  // CPU clock — executes GET/BRC/SPR/PUT/HLT, with a parse trap on the branch
  // when the response never fit the schema.
  const cpuBusy = !sim.halted && sim.pc < sim.ops.length
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.halted || s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        const lit = new Set(s.lit)
        let halted: boolean = s.halted
        let error: boolean = s.error
        let report = s.report
        let pc = s.pc + 1
        switch (op.kind) {
          case 'clr':
            lit.clear()
            break
          case 'spr':
            for (const [x, y] of op.pixels ?? []) lit.add(`${x},${y}`)
            break
          case 'get':
            break // the read itself; the edge animates
          case 'brc':
            if (s.cond === 'garbled') {
              halted = true
              error = true
            } else if (s.cond === 'rain') {
              pc = op.jump ?? pc
            }
            break
          case 'jmp':
            pc = op.jump ?? pc
            break
          case 'put':
            report = {
              by: op.src === 'asm' ? 'code' : 'prose',
              text: op.payload ?? `RPT ${s.cond === 'rain' ? '0x02' : '0x01'}`,
            }
            break
          case 'hlt':
            halted = true
            break
        }
        return { ...s, pc, lit, halted, error, report }
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
      error: false,
      codePlan: CODE_OPS,
      tokPlan: [],
      tokIdx: 0,
      phase: 'loadCode',
    }))
  }

  function runProse() {
    setSim((s) => ({
      ...s,
      ops: [],
      pc: 0,
      halted: false,
      error: false,
      codePlan: [],
      tokPlan: [],
      tokIdx: 0,
      phase: 'readProse',
    }))
  }

  function reset() {
    setSim(INITIAL)
  }

  const loading = sim.phase === 'loadCode'
  const readingProse = sim.phase === 'readProse'
  const calling = sim.phase === 'call'
  const responding = sim.phase === 'respond'
  const generating = sim.phase === 'generating'
  const proseActive = readingProse || calling || responding || generating
  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const getting = currentOp?.kind === 'get'
  const putting = currentOp?.kind === 'put'
  const currentToken = generating ? (sim.tokPlan[sim.tokIdx]?.text ?? null) : null
  const busy = sim.phase !== 'idle' || cpuBusy

  const nodes: Node[] = [
    {
      id: 'fs',
      type: 'extFs',
      position: { x: 0, y: 0 },
      data: { active: loading ? 'code' : proseActive ? 'prose' : null },
    },
    { id: 'llm', type: 'extLlm', position: { x: 20, y: 260 }, data: { phase: sim.phase, current: currentToken } },
    { id: 'stream', type: 'extStream', position: { x: 260, y: 0 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'extCpu', position: { x: 490, y: 30 }, data: { op: currentOp?.text ?? null, error: sim.error } },
    {
      id: 'service',
      type: 'extService',
      position: { x: 450, y: 250 },
      // Hosts real buttons — force pointer events back on.
      style: { pointerEvents: 'all' },
      data: {
        cond: sim.cond,
        report: sim.report,
        disabled: busy,
        onSet: (c: Cond) => setSim((s) => ({ ...s, cond: c })),
      },
    },
    { id: 'display', type: 'extDisplay', position: { x: 680, y: 20 }, data: { lit: sim.lit } },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const sky = 'oklch(0.746 0.16 232.661)'
  const edges: Edge[] = [
    {
      id: 'code',
      source: 'fs',
      sourceHandle: 'code',
      target: 'stream',
      targetHandle: 'in',
      label: 'code',
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
      label: 'prose',
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
      label: 'tokens → opcodes',
      animated: generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: generating ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'toolcall',
      source: 'llm',
      sourceHandle: 'call',
      target: 'service',
      targetHandle: 'fromllm',
      label: 'tool call',
      animated: calling,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: calling ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'toolresp',
      source: 'service',
      sourceHandle: 'tollm',
      target: 'llm',
      targetHandle: 'resp',
      label: 'response',
      animated: responding,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: responding ? { stroke: sky, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'get',
      source: 'service',
      sourceHandle: 'tocpu',
      target: 'cpu',
      targetHandle: 'netin',
      label: 'GET',
      animated: getting,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: getting ? { stroke: sky, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'put',
      source: 'cpu',
      sourceHandle: 'net',
      target: 'service',
      targetHandle: 'fromcpu',
      label: 'PUT',
      animated: putting,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: putting ? { stroke: amber, strokeWidth: 1.5 } : undefined,
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
      animated: cpuBusy && !sim.error,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: cpuBusy && !sim.error ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
  ]

  const statusLabel = sim.error
    ? 'TRAP — response did not parse'
    : sim.phase === 'idle'
      ? cpuBusy
        ? 'executing'
        : 'idle'
      : sim.phase === 'loadCode'
        ? 'loading weather.asm'
        : sim.phase === 'readProse'
          ? 'reading weather.txt'
          : sim.phase === 'call'
            ? 'tool call → weather service'
            : sim.phase === 'respond'
              ? 'reading response'
              : 'interpreting'

  return (
    <WidgetFrame
      title="External data, to and from"
      hint={
        <>
          The weather service is outside the system — you control what it returns. Code reads it at{' '}
          <Em>run time</Em>: a <code className="font-mono text-xs">GET</code>{' '}opcode, a rigid parse,
          and a trap if the response is garbled. Prose reads it at <Em>interpretation time</Em>: the
          LLM tool-calls first, absorbs even a mangled response, and only then writes the stream.
          Both write back — code <code className="font-mono text-xs">PUT</code>s a status code, the
          LLM reports in words. Check the service log after each run.
        </>
      }
    >
      <FlowCanvas
        className="h-116"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.08 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={runCode}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <PlayIcon className="size-4" /> Run weather.asm
        </button>
        <button
          onClick={runProse}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <SparklesIcon className="size-4" /> Run weather.txt
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {statusLabel}
        </span>
      </div>
    </WidgetFrame>
  )
}
