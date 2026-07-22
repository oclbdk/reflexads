'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  FaceSmileIcon,
  PowerIcon,
} from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { DemoFrame } from '../demo-frame'

// Extends the CPU system with a GPU (parallel, volatile VRAM) and a filesystem
// (persistent, survives power-off). The CPU draws serially, one pixel per
// opcode; the GPU touches all 64 cells in one beat; the filesystem holds a
// frame across a power cycle. Tangibly different kinds of state — and every
// one of them commanded through the single linear opcode stream.

type OpKind = 'px' | 'inv' | 'write' | 'read'
type Op = { text: string; kind: OpKind; x?: number; y?: number }

const GRID = 8
const TICK_MS = 300
const WINDOW = 9

const SMILEY: [number, number][] = [
  [2, 2], [5, 2], [1, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5],
]

type GpuCmd = { text: string; cells: number } | null
type Sim = {
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  saved: ReadonlySet<string> | null
  gpu: GpuCmd
  cycles: number
}
const INITIAL: Sim = { ops: [], pc: 0, lit: new Set(), saved: null, gpu: null, cycles: 0 }

// ---- custom nodes -------------------------------------------------------

function StreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  const start = Math.max(0, ops.length - WINDOW)
  const window = ops.slice(start)
  return (
    <div className="w-36 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
              <span className="w-5 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
                {gi}
              </span>
              {op.text}
            </li>
          )
        })}
        {Array.from({ length: WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CpuNode({ data }: NodeProps) {
  const { op } = data as { op: string | null }
  return (
    <div className="w-32 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">the one linear stream</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="cmd" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fsw" type="source" position={Position.Bottom} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fsr" type="target" position={Position.Bottom} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function GpuNode({ data }: NodeProps) {
  const { cmd, active } = data as { cmd: GpuCmd; active: boolean }
  return (
    <div
      className={clsx(
        'w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? 'ring-2 ring-sky-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        GPU
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1.5 font-mono text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
        {cmd ? cmd.text : 'idle'}
      </div>
      <div
        className={clsx(
          'mt-1 text-[9px]/4',
          cmd && cmd.cells > 1
            ? 'font-semibold text-sky-600 dark:text-sky-400'
            : 'text-zinc-400 dark:text-zinc-500',
        )}
      >
        {cmd ? `${cmd.cells} cell${cmd.cells === 1 ? '' : 's'} ${cmd.cells > 1 ? 'in parallel' : ''}` : 'VRAM · volatile'}
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="scan" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function FsNode({ data }: NodeProps) {
  const { saved, active } = data as { saved: boolean; active: boolean }
  return (
    <div
      className={clsx(
        'w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Filesystem
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1.5 font-mono text-[11px] text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
        {saved ? 'art.fb · 64 B' : '(empty)'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        persistent — survives power-off
      </div>
      <Handle type="target" position={Position.Top} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Top} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        scanout from VRAM
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  sysStream: StreamNode,
  sysCpu: CpuNode,
  sysGpu: GpuNode,
  sysFs: FsNode,
  sysDisplay: DisplayNode,
}

// ---- the demo ---------------------------------------------------------

export function CpuSystemDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  const busy = sim.pc < sim.ops.length
  const current = busy ? sim.ops[sim.pc] : null

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        let lit = new Set(s.lit)
        let saved = s.saved
        let gpu: GpuCmd = s.gpu
        switch (op.kind) {
          case 'px':
            lit.add(`${op.x},${op.y}`)
            gpu = { text: op.text, cells: 1 }
            break
          case 'inv': {
            const next = new Set<string>()
            for (let i = 0; i < GRID * GRID; i++) {
              const key = `${i % GRID},${Math.floor(i / GRID)}`
              if (!lit.has(key)) next.add(key)
            }
            lit = next
            gpu = { text: 'INV', cells: GRID * GRID }
            break
          }
          case 'write':
            saved = new Set(lit)
            break
          case 'read':
            if (saved) {
              lit = new Set(saved)
              gpu = { text: 'BLIT', cells: GRID * GRID }
            }
            break
        }
        return { ...s, pc: s.pc + 1, lit, saved, gpu, cycles: s.cycles + 1 }
      })
    }, TICK_MS)
    return () => clearInterval(t)
  }, [busy])

  function enqueue(ops: Op[]) {
    setSim((s) => ({ ...s, ops: [...s.ops, ...ops] }))
  }

  // Power cycle: every volatile thing dies — the stream, the VRAM, the screen.
  // The filesystem is what remains.
  function powerCycle() {
    setSim((s) => ({ ...INITIAL, saved: s.saved }))
  }

  const kind = current?.kind ?? null
  const gpuActive = kind === 'px' || kind === 'inv' || kind === 'read'
  const queued = sim.ops.length - sim.pc

  const nodes: Node[] = [
    { id: 'stream', type: 'sysStream', position: { x: 0, y: 20 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'sysCpu', position: { x: 215, y: 55 }, data: { op: current?.text ?? null } },
    { id: 'gpu', type: 'sysGpu', position: { x: 415, y: 55 }, data: { cmd: sim.gpu, active: gpuActive } },
    { id: 'display', type: 'sysDisplay', position: { x: 625, y: 15 }, data: { lit: sim.lit } },
    { id: 'fs', type: 'sysFs', position: { x: 225, y: 230 }, data: { saved: sim.saved !== null, active: kind === 'write' || kind === 'read' } },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const sky = 'oklch(0.746 0.16 232.661)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'fetch',
      source: 'stream',
      target: 'cpu',
      label: 'opcodes',
      animated: busy,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
    },
    {
      id: 'cmd',
      source: 'cpu',
      sourceHandle: 'cmd',
      target: 'gpu',
      label: 'commands',
      animated: gpuActive,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: gpuActive ? { stroke: sky, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'scan',
      source: 'gpu',
      sourceHandle: 'scan',
      target: 'display',
      label: 'scanout',
      animated: gpuActive,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: gpuActive ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'fswrite',
      source: 'cpu',
      sourceHandle: 'fsw',
      target: 'fs',
      label: 'WRITE',
      animated: kind === 'write',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: kind === 'write' ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'fsread',
      source: 'fs',
      sourceHandle: 'out',
      target: 'cpu',
      targetHandle: 'fsr',
      label: 'READ',
      animated: kind === 'read',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: kind === 'read' ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <DemoFrame
      title="Persistent and parallel — one stream"
      hint={
        <>
          The CPU draws serially: eight <code className="font-mono text-xs">PX</code>{' '}opcodes, one
          pixel per tick. The GPU inverts the whole frame in a single beat — 64 cells in parallel,
          from one opcode. The filesystem holds a frame across a power cycle, when everything
          volatile dies. Three very different kinds of state, and every one of them is reached the
          same way: through the linear opcode stream.
        </>
      }
    >
      <DemoCanvas
        className="h-88"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => enqueue(SMILEY.map(([x, y]) => ({ text: `PX ${x},${y}`, kind: 'px' as const, x, y })))}
          className={btn}
        >
          <FaceSmileIcon className="size-4" /> Smiley
          <span className="text-[10px] text-zinc-400">CPU · 8 ops</span>
        </button>
        <button onClick={() => enqueue([{ text: 'INV', kind: 'inv' }])} className={btn}>
          <BoltIcon className="size-4" /> Invert
          <span className="text-[10px] text-zinc-400">GPU · 1 op</span>
        </button>
        <button onClick={() => enqueue([{ text: 'WRITE', kind: 'write' }])} className={btn}>
          <ArrowDownTrayIcon className="size-4" /> Write
        </button>
        <button
          onClick={() => enqueue([{ text: 'READ', kind: 'read' }])}
          disabled={sim.saved === null}
          className={btn}
        >
          <ArrowUpTrayIcon className="size-4" /> Read
        </button>
        <button onClick={powerCycle} className={btn}>
          <PowerIcon className="size-4" /> Power cycle
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {queued > 0 ? `${queued} queued` : 'idle'} · {sim.cycles} cycles
        </span>
      </div>
    </DemoFrame>
  )
}
