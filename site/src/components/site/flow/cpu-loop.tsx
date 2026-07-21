'use client'

import { useCallback, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// Extends the CPU widget: the display is now a touch surface, and the program
// is a real event loop. WFI blocks until input arrives; a click travels through
// the touch controller into the CPU registers as coordinates; TGL consumes the
// registers; JMP loops back to WFI. Drawing is blocked until the program is
// ready to wait again — data flows back into the sequence on the sequence's
// own terms.

const PROGRAM = [
  { text: 'CLR', note: 'clear display' },
  { text: 'WFI', note: 'wait for input' },
  { text: 'TGL R0,R1', note: 'toggle pixel at registers' },
  { text: 'JMP 1', note: 'loop back to WFI' },
] as const

const GRID = 8
const TICK_MS = 400

type Regs = { x: number; y: number } | null
type Sim = {
  pc: number
  cycles: number
  lit: ReadonlySet<string>
  regs: Regs
  /** A click was captured and its coordinates are in flight to the registers. */
  delivering: boolean
}
const INITIAL: Sim = { pc: 0, cycles: 0, lit: new Set(), regs: null, delivering: false }

// ---- custom nodes -------------------------------------------------------

function StreamNode({ data }: NodeProps) {
  const { pc, waiting } = data as { pc: number; waiting: boolean }
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Instruction sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {PROGRAM.map((op, i) => (
          <li
            key={i}
            className={clsx(
              'flex items-baseline gap-2 rounded-sm px-1.5',
              i === pc
                ? clsx(
                    'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
                    waiting && 'animate-pulse',
                  )
                : 'text-zinc-600 dark:text-zinc-300',
            )}
          >
            <span className="w-3 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
              {i}
            </span>
            <span className="w-20 shrink-0">{op.text}</span>
            <span className="truncate text-[9px] text-zinc-400 normal-case italic dark:text-zinc-500">
              {op.note}
            </span>
          </li>
        ))}
      </ol>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CpuNode({ data }: NodeProps) {
  const { pc, waiting, regs, regsActive } = data as {
    pc: number
    waiting: boolean
    regs: Regs
    regsActive: boolean
  }
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        CPU
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          waiting
            ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
            : 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500',
        )}
      >
        {waiting ? 'WFI — waiting…' : PROGRAM[pc].text}
      </div>
      <div
        className={clsx(
          'mx-auto mt-1 flex w-fit justify-center gap-1 rounded-md p-0.5 font-mono text-[10px] ring-1 transition-shadow',
          regsActive ? 'ring-amber-400/80' : 'ring-transparent',
        )}
      >
        <span className="rounded-sm bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
          R0 {regs ? regs.x : '—'}
        </span>
        <span className="rounded-sm bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
          R1 {regs ? regs.y : '—'}
        </span>
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        registers · memory implied
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ops" type="target" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ControllerNode({ data }: NodeProps) {
  const { coords, active } = data as { coords: Regs; active: boolean }
  return (
    <div
      className={clsx(
        'rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active
          ? 'ring-2 ring-amber-400/80'
          : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Touch controller
      </div>
      <div className="mt-1 w-32 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
        {coords ? `event (${coords.x},${coords.y})` : 'no event'}
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TouchDisplayNode({ data }: NodeProps) {
  const { lit, pendingCell, blocked, onTouch } = data as {
    lit: ReadonlySet<string>
    pendingCell: string | null
    blocked: boolean
    onTouch: (x: number, y: number) => void
  }
  return (
    <div className="w-36 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="pb-1 text-center text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Display · touch
      </div>
      <div className={clsx('rounded-md bg-zinc-950 p-1.5', blocked && 'opacity-80')}>
        <div className="mx-auto grid w-fit grid-cols-8 gap-px">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID
            const y = Math.floor(i / GRID)
            const key = `${x},${y}`
            const on = lit.has(key)
            return (
              <button
                key={i}
                onClick={() => onTouch(x, y)}
                disabled={blocked}
                aria-label={`pixel ${x},${y}`}
                className={clsx(
                  'size-3 rounded-[1px] transition-colors duration-200',
                  on
                    ? 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400/60'
                    : 'bg-zinc-800',
                  blocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-600',
                  pendingCell === key && 'ring-1 ring-amber-400/80',
                )}
              />
            )
          })}
        </div>
      </div>
      <div
        className={clsx(
          'pt-1 text-center text-[9px]/4',
          blocked ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500',
        )}
      >
        {blocked ? 'input blocked until WFI' : 'ready — tap to draw'}
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="touch" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  loopStream: StreamNode,
  loopCpu: CpuNode,
  loopController: ControllerNode,
  loopDisplay: TouchDisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function CpuLoopWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  const waiting = sim.pc === 1 && !sim.delivering
  const busy = !waiting

  // The clock ticks whenever there is work: boot, a delivery in flight, or an
  // instruction mid-execution. At WFI with no event, everything is still.
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => {
      setSim((s) => {
        // Beat 1 after a click: the coordinates land in the registers; the WFI
        // consumes the event and execution moves on.
        if (s.delivering) return { ...s, delivering: false, pc: 2, cycles: s.cycles + 1 }
        const lit = new Set(s.lit)
        switch (s.pc) {
          case 0: // CLR
            lit.clear()
            return { ...s, lit, pc: 1, cycles: s.cycles + 1 }
          case 2: { // TGL R0,R1
            if (s.regs) {
              const key = `${s.regs.x},${s.regs.y}`
              if (lit.has(key)) lit.delete(key)
              else lit.add(key)
            }
            return { ...s, lit, pc: 3, cycles: s.cycles + 1 }
          }
          case 3: // JMP 1
            return { ...s, pc: 1, cycles: s.cycles + 1 }
          default:
            return s
        }
      })
    }, TICK_MS)
    return () => clearInterval(t)
  }, [busy])

  const onTouch = useCallback((x: number, y: number) => {
    setSim((s) => {
      if (s.pc !== 1 || s.delivering) return s
      return { ...s, regs: { x, y }, delivering: true }
    })
  }, [])

  function reset() {
    setSim(INITIAL)
  }

  const executing = sim.pc === 2
  const pendingCell =
    sim.regs && (sim.delivering || executing) ? `${sim.regs.x},${sim.regs.y}` : null

  const nodes: Node[] = [
    {
      id: 'stream',
      type: 'loopStream',
      position: { x: 0, y: 30 },
      data: { pc: sim.pc, waiting },
    },
    {
      id: 'cpu',
      type: 'loopCpu',
      position: { x: 250, y: 55 },
      data: { pc: sim.pc, waiting, regs: sim.regs, regsActive: sim.delivering || executing },
    },
    {
      id: 'display',
      type: 'loopDisplay',
      position: { x: 460, y: 0 },
      // xyflow turns off pointer events for non-draggable, non-selectable
      // nodes; this node hosts real buttons, so force them back on.
      style: { pointerEvents: 'all' },
      data: { lit: sim.lit, pendingCell, blocked: busy, onTouch },
    },
    {
      id: 'controller',
      type: 'loopController',
      position: { x: 465, y: 225 },
      data: { coords: sim.regs, active: sim.delivering },
    },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
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
      id: 'write',
      source: 'cpu',
      sourceHandle: 'fx',
      target: 'display',
      label: 'effects',
      animated: executing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: executing ? { stroke: 'oklch(0.765 0.177 163.223)', strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'touch',
      source: 'display',
      sourceHandle: 'touch',
      target: 'controller',
      label: 'input event',
      animated: sim.delivering,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { stroke: amber, strokeWidth: 1.5 },
    },
    {
      id: 'load',
      source: 'controller',
      sourceHandle: 'out',
      target: 'cpu',
      targetHandle: 'ops',
      label: 'coords → R0,R1',
      animated: sim.delivering,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { stroke: amber, strokeWidth: 1.5 },
    },
  ]

  return (
    <WidgetFrame
      title="Drawing data back into the stream"
      hint={
        <>
          The program is a four-instruction event loop.{' '}
          <code className="font-mono text-xs">WFI</code>{' '}blocks until you tap the display; the touch
          controller feeds your coordinates into the CPU registers;{' '}
          <code className="font-mono text-xs">TGL R0,R1</code>{' '}consumes them; and{' '}
          <code className="font-mono text-xs">JMP</code>{' '}loops back to wait again. While the loop is
          mid-flight the display refuses input — data flows back into the sequence only when the
          sequence is ready to receive it.
        </>
      }
    >
      <FlowCanvas
        className="h-88"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.12 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {waiting ? 'WFI — waiting for input' : `executing ${PROGRAM[sim.pc].text}`} · {sim.cycles}{' '}
          cycles
        </span>
      </div>
    </WidgetFrame>
  )
}
