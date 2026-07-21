'use client'

import { useCallback, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, ForwardIcon, PauseIcon, PlayIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The Role of CPU — an instruction sequence streams opcodes, one at a time,
// through the CPU and out into real-world effects. Registers and memory stay
// implied; the stream is primary, and the display is the legible surface where
// symbolic state becomes something a person actually experiences.

// A display-oriented mini-ISA: clear the framebuffer, set a pixel, halt.
type OpKind = 'clr' | 'px' | 'hlt'
type Op = { text: string; kind: OpKind; x?: number; y?: number }

const PROGRAM: Op[] = [
  { text: 'CLR', kind: 'clr' },
  { text: 'PX 2,2', kind: 'px', x: 2, y: 2 },
  { text: 'PX 5,2', kind: 'px', x: 5, y: 2 },
  { text: 'PX 1,4', kind: 'px', x: 1, y: 4 },
  { text: 'PX 6,4', kind: 'px', x: 6, y: 4 },
  { text: 'PX 2,5', kind: 'px', x: 2, y: 5 },
  { text: 'PX 3,5', kind: 'px', x: 3, y: 5 },
  { text: 'PX 4,5', kind: 'px', x: 4, y: 5 },
  { text: 'PX 5,5', kind: 'px', x: 5, y: 5 },
  { text: 'HLT', kind: 'hlt' },
]

const GRID = 8
const TICK_MS = 450

type Sim = { pc: number; lit: ReadonlySet<string>; last: OpKind | null }
const INITIAL: Sim = { pc: 0, lit: new Set(), last: null }

// ---- custom nodes -------------------------------------------------------

function StreamNode({ data }: NodeProps) {
  const { pc } = data as { pc: number }
  return (
    <div className="w-40 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Instruction sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {PROGRAM.map((op, i) => (
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
            {op.text}
          </li>
        ))}
      </ol>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CpuNode({ data }: NodeProps) {
  const { op, halted } = data as { op: string | null; halted: boolean }
  return (
    <div className="w-32 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        CPU
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          halted
            ? 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500'
            : 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
        )}
      >
        {halted ? 'halted' : (op ?? 'ready')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        registers &amp; memory implied
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="io" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        the real-world effect
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function IoStubNode() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-center dark:border-zinc-600">
      <div className="text-[10px]/4 font-medium text-zinc-400 dark:text-zinc-500">
        other I/O — speaker · storage · network
      </div>
      <div className="text-[9px]/4 text-zinc-300 dark:text-zinc-600">(left implied)</div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  stream: StreamNode,
  cpu: CpuNode,
  display: DisplayNode,
  ioStub: IoStubNode,
}

// ---- the widget ---------------------------------------------------------

export function CpuRoleWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [running, setRunning] = useState(false)

  const halted = sim.pc >= PROGRAM.length
  const current = halted ? null : PROGRAM[sim.pc]

  const step = useCallback(() => {
    setSim((s) => {
      if (s.pc >= PROGRAM.length) return s
      const op = PROGRAM[s.pc]
      const lit = new Set(s.lit)
      if (op.kind === 'clr') lit.clear()
      if (op.kind === 'px') lit.add(`${op.x},${op.y}`)
      return { pc: s.pc + 1, lit, last: op.kind }
    })
  }, [])

  useEffect(() => {
    if (!running) return
    const t = setInterval(step, TICK_MS)
    return () => clearInterval(t)
  }, [running, step])

  useEffect(() => {
    if (halted) setRunning(false)
  }, [halted])

  function reset() {
    setRunning(false)
    setSim(INITIAL)
  }

  const writing = !halted && sim.last !== null && sim.last !== 'hlt'

  const nodes: Node[] = [
    { id: 'stream', type: 'stream', position: { x: 0, y: 0 }, data: { pc: sim.pc } },
    { id: 'cpu', type: 'cpu', position: { x: 235, y: 60 }, data: { op: current?.text ?? null, halted } },
    { id: 'display', type: 'display', position: { x: 435, y: 20 }, data: { lit: sim.lit } },
    { id: 'io', type: 'ioStub', position: { x: 400, y: 205 }, data: {} },
  ]

  const edges: Edge[] = [
    {
      id: 'fetch',
      source: 'stream',
      target: 'cpu',
      label: 'opcodes',
      animated: running && !halted,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
    },
    {
      id: 'write',
      source: 'cpu',
      sourceHandle: 'fx',
      target: 'display',
      label: 'effects',
      animated: running && writing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: writing ? { stroke: 'oklch(0.765 0.177 163.223)', strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'other',
      source: 'cpu',
      sourceHandle: 'io',
      target: 'io',
      style: { strokeDasharray: '4 4', opacity: 0.4 },
    },
  ]

  return (
    <WidgetFrame
      title="From opcodes to a display"
      hint={
        <>
          One opcode at a time, the sequence mediates a computational system into a real-world
          effect. Registers and memory never appear — they stay implied by the interactions. What you
          can see is the stream, and where it lands: a display hosting an actual user experience.
        </>
      }
    >
      <FlowCanvas
        className="h-80"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => (running ? setRunning(false) : halted ? undefined : setRunning(true))}
          disabled={halted}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {running ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          {running ? 'Pause' : 'Run'}
        </button>
        <button
          onClick={step}
          disabled={running || halted}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ForwardIcon className="size-4" /> Step
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {halted ? `halted · ${sim.pc} cycles` : `cycle ${sim.pc} · pc ${sim.pc}`}
        </span>
      </div>
    </WidgetFrame>
  )
}
