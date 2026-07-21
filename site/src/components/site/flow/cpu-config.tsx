'use client'

import { useCallback, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The filesystem now tracks application-level state: the pen color, stored in
// cfg. Picking a swatch writes it (WR); every boot re-reads it (RD); drawing
// renders with it. Power-cycle and the drawing — volatile VRAM — is gone, but
// your color survives. Application state, persistent, visibly steering GPU
// output, all through the one opcode stream.

const PROGRAM = [
  { text: 'RD', note: 'pen ← cfg' },
  { text: 'WFI', note: 'wait for input' },
  { text: 'BRC 5', note: 'color event? jump to 5' },
  { text: 'PX R0,R1', note: 'draw with pen' },
  { text: 'JMP 1', note: '' },
  { text: 'WR cfg', note: 'store new pen' },
  { text: 'JMP 0', note: 'reload cfg' },
] as const

const GRID = 8
const TICK_MS = 300

type ColorKey = 'emerald' | 'sky' | 'amber' | 'rose'
const COLORS: Record<ColorKey, { chip: string; pixel: string }> = {
  emerald: { chip: 'bg-emerald-400', pixel: 'bg-emerald-400 shadow-emerald-400/60' },
  sky: { chip: 'bg-sky-400', pixel: 'bg-sky-400 shadow-sky-400/60' },
  amber: { chip: 'bg-amber-400', pixel: 'bg-amber-400 shadow-amber-400/60' },
  rose: { chip: 'bg-rose-400', pixel: 'bg-rose-400 shadow-rose-400/60' },
}
const COLOR_KEYS = Object.keys(COLORS) as ColorKey[]

type Coords = { x: number; y: number } | null
type Sim = {
  pc: number
  penFile: ColorKey // persistent — lives in cfg
  penReg: ColorKey | null // R2 — volatile
  vram: ReadonlyMap<string, ColorKey> // volatile
  coords: Coords // R0, R1
  picked: ColorKey | null
  eventType: 'draw' | 'color' | null
  delivering: boolean
  pending: boolean
  cycles: number
}
const INITIAL: Sim = {
  pc: 0,
  penFile: 'emerald',
  penReg: null,
  vram: new Map(),
  coords: null,
  picked: null,
  eventType: null,
  delivering: false,
  pending: false,
  cycles: 0,
}

// ---- custom nodes -------------------------------------------------------

function StreamNode({ data }: NodeProps) {
  const { pc, waiting } = data as { pc: number; waiting: boolean }
  return (
    <div className="w-52 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
            <span className="w-18 shrink-0">{op.text}</span>
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
  const { pc, waiting, coords, pen, regsActive } = data as {
    pc: number
    waiting: boolean
    coords: Coords
    pen: ColorKey | null
    regsActive: boolean
  }
  return (
    <div className="w-40 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
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
          R0 {coords ? coords.x : '—'}
        </span>
        <span className="rounded-sm bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
          R1 {coords ? coords.y : '—'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-sm bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
          R2{' '}
          {pen ? (
            <span className={clsx('inline-block size-2 rounded-sm', COLORS[pen].chip)} />
          ) : (
            '—'
          )}
        </span>
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        registers · memory implied
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="cmd" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fsw" type="source" position={Position.Bottom} style={{ left: '30%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fsr" type="target" position={Position.Bottom} style={{ left: '50%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ops" type="target" position={Position.Bottom} style={{ left: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ConfigNode({ data }: NodeProps) {
  const { pen, active } = data as { pen: ColorKey; active: boolean }
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
      <div className="mt-1 flex items-center justify-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1.5 font-mono text-[11px] text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
        cfg: pen =
        <span className={clsx('inline-block size-2.5 rounded-sm', COLORS[pen].chip)} />
        {pen}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        application state — persistent
      </div>
      <Handle type="target" position={Position.Top} style={{ left: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Top} style={{ left: '65%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function GpuNode({ data }: NodeProps) {
  const { active, pen } = data as { active: boolean; pen: ColorKey | null }
  return (
    <div
      className={clsx(
        'w-32 rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? 'ring-2 ring-sky-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        GPU
      </div>
      <div
        className={clsx(
          'mt-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs',
          active
            ? 'bg-sky-500/15 font-semibold text-sky-600 dark:text-sky-400'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {active && pen ? (
          <>
            PX
            <span className={clsx('inline-block size-2.5 rounded-sm', COLORS[pen].chip)} />
          </>
        ) : (
          'idle'
        )}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        renders with the cfg pen
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="scan" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ControllerNode({ data }: NodeProps) {
  const { label, active } = data as { label: string; active: boolean }
  return (
    <div
      className={clsx(
        'rounded-lg bg-white p-2 text-center shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? 'ring-2 ring-amber-400/80' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Touch controller
      </div>
      <div className="mt-1 w-32 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">{label}</div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TouchDisplayNode({ data }: NodeProps) {
  const { vram, pen, pendingCell, blocked, onDraw, onPick } = data as {
    vram: ReadonlyMap<string, ColorKey>
    pen: ColorKey
    pendingCell: string | null
    blocked: boolean
    onDraw: (x: number, y: number) => void
    onPick: (c: ColorKey) => void
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
            const cell = vram.get(key)
            return (
              <button
                key={i}
                onClick={() => onDraw(x, y)}
                disabled={blocked}
                aria-label={`pixel ${x},${y}`}
                className={clsx(
                  'size-3 rounded-[1px] transition-colors duration-200',
                  cell ? clsx('shadow-[0_0_5px]', COLORS[cell].pixel) : 'bg-zinc-800',
                  blocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-600',
                  pendingCell === key && 'ring-1 ring-amber-400/80',
                )}
              />
            )
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 border-t border-white/10 pt-1.5">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              disabled={blocked}
              aria-label={`pen ${c}`}
              className={clsx(
                'size-3.5 rounded-sm transition-transform',
                COLORS[c].chip,
                blocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110',
                pen === c && 'ring-2 ring-white/80',
              )}
            />
          ))}
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
  cfgStream: StreamNode,
  cfgCpu: CpuNode,
  cfgFile: ConfigNode,
  cfgGpu: GpuNode,
  cfgController: ControllerNode,
  cfgDisplay: TouchDisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function CpuConfigWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  const waiting = sim.pc === 1 && !sim.delivering
  const busy = !waiting

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.delivering) return { ...s, delivering: false, pc: 2, cycles: s.cycles + 1 }
        switch (s.pc) {
          case 0: // RD — pen register loads from cfg
            return { ...s, penReg: s.penFile, pc: 1, cycles: s.cycles + 1 }
          case 2: // BRC 5 — dispatch on the event type
            return { ...s, pc: s.eventType === 'color' ? 5 : 3, cycles: s.cycles + 1 }
          case 3: { // PX R0,R1 — draw with the pen
            const vram = new Map(s.vram)
            if (s.coords && s.penReg) vram.set(`${s.coords.x},${s.coords.y}`, s.penReg)
            return { ...s, vram, pending: false, pc: 4, cycles: s.cycles + 1 }
          }
          case 4: // JMP 1
            return { ...s, pc: 1, cycles: s.cycles + 1 }
          case 5: // WR cfg — persist the picked pen
            return { ...s, penFile: s.picked ?? s.penFile, pc: 6, cycles: s.cycles + 1 }
          case 6: // JMP 0 — reload cfg
            return { ...s, pc: 0, cycles: s.cycles + 1 }
          default:
            return s
        }
      })
    }, TICK_MS)
    return () => clearInterval(t)
  }, [busy])

  const onDraw = useCallback((x: number, y: number) => {
    setSim((s) => {
      if (s.pc !== 1 || s.delivering) return s
      return { ...s, coords: { x, y }, eventType: 'draw', delivering: true, pending: true }
    })
  }, [])

  const onPick = useCallback((c: ColorKey) => {
    setSim((s) => {
      if (s.pc !== 1 || s.delivering) return s
      return { ...s, picked: c, penReg: c, eventType: 'color', delivering: true }
    })
  }, [])

  // Power cycle: VRAM and registers die — the drawing is gone. cfg survives,
  // and the boot pass reloads your pen.
  function powerCycle() {
    setSim((s) => ({ ...INITIAL, penFile: s.penFile }))
  }

  function factoryReset() {
    setSim(INITIAL)
  }

  const reading = sim.pc === 0
  const drawing = sim.pc === 3
  const storing = sim.pc === 5
  const pendingCell = sim.pending && sim.coords ? `${sim.coords.x},${sim.coords.y}` : null
  const controllerLabel = sim.delivering
    ? sim.eventType === 'color'
      ? `pen ← ${sim.picked}`
      : `draw (${sim.coords?.x},${sim.coords?.y})`
    : sim.eventType
      ? sim.eventType === 'color'
        ? `pen ← ${sim.picked}`
        : `draw (${sim.coords?.x},${sim.coords?.y})`
      : 'no event'

  const nodes: Node[] = [
    { id: 'stream', type: 'cfgStream', position: { x: 0, y: 10 }, data: { pc: sim.pc, waiting } },
    {
      id: 'cpu',
      type: 'cfgCpu',
      position: { x: 280, y: 55 },
      data: {
        pc: sim.pc,
        waiting,
        coords: sim.coords,
        pen: sim.penReg,
        regsActive: sim.delivering || drawing || storing || reading,
      },
    },
    { id: 'gpu', type: 'cfgGpu', position: { x: 470, y: 55 }, data: { active: drawing, pen: sim.penReg } },
    {
      id: 'display',
      type: 'cfgDisplay',
      position: { x: 660, y: 0 },
      // xyflow disables pointer events on non-interactive nodes; this one
      // hosts real buttons.
      style: { pointerEvents: 'all' },
      data: {
        vram: sim.vram,
        pen: sim.penReg ?? sim.penFile,
        pendingCell,
        blocked: busy,
        onDraw,
        onPick,
      },
    },
    { id: 'file', type: 'cfgFile', position: { x: 150, y: 255 }, data: { pen: sim.penFile, active: reading || storing } },
    { id: 'controller', type: 'cfgController', position: { x: 490, y: 255 }, data: { label: controllerLabel, active: sim.delivering } },
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
      animated: drawing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: drawing ? { stroke: sky, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'scan',
      source: 'gpu',
      sourceHandle: 'scan',
      target: 'display',
      label: 'scanout',
      animated: drawing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: drawing ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'wr',
      source: 'cpu',
      sourceHandle: 'fsw',
      target: 'file',
      label: 'WR ← R2',
      animated: storing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: storing ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'rd',
      source: 'file',
      sourceHandle: 'out',
      target: 'cpu',
      targetHandle: 'fsr',
      label: 'RD → R2',
      animated: reading,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: reading ? { stroke: amber, strokeWidth: 1.5 } : undefined,
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
      id: 'coords',
      source: 'controller',
      sourceHandle: 'out',
      target: 'cpu',
      targetHandle: 'ops',
      label: 'event data → R0,R1,R2',
      animated: sim.delivering,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { stroke: amber, strokeWidth: 1.5 },
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <WidgetFrame
      title="Application state in the filesystem"
      hint={
        <>
          The pen color is application-level state, stored in{' '}
          <code className="font-mono text-xs">cfg</code>. Pick a swatch and the loop branches to{' '}
          <code className="font-mono text-xs">WR cfg</code>{' '}— watch the filesystem chip change —
          then reloads it with <code className="font-mono text-xs">RD</code>{' '}before the next stroke.
          Power cycle: the drawing dies with VRAM, but your color survives in the file, and the boot
          pass reads it right back. Persistent application state, steering GPU output, through the
          one stream.
        </>
      }
    >
      <FlowCanvas
        className="h-96"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={powerCycle} className={btn}>
          <ArrowPathIcon className="size-4" /> Power cycle
        </button>
        <button onClick={factoryReset} className={btn}>
          <TrashIcon className="size-4" /> Factory reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {waiting ? 'WFI — waiting for input' : `executing ${PROGRAM[sim.pc].text}`} · {sim.cycles}{' '}
          cycles
        </span>
      </div>
    </WidgetFrame>
  )
}
