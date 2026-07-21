'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PencilIcon, PlayIcon, TrashIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The Role of Engineer, third flow. One mechanism, laid bare: the model's
// outputs land where its next inputs come from. Each run reads notes.txt —
// written by earlier runs — and varies accordingly; the note it writes back
// rides the one stream like any other effect. The engineer steers the loop
// with three levers: close it (self-notes off), wipe it (clear), or write
// into the very same channel (seed a note the model will obey).

const GRID = 8

type OpKind = 'clr' | 'px' | 'wr'
type Op = { text: string; kind: OpKind; x?: number; y?: number; payload?: string; tag: string }

const px = (x: number, y: number) => ({ text: `PX ${x},${y}`, kind: 'px' as const, x, y })

const EYES = [px(2, 2), px(5, 2)]
const SMILE = [px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)]
const WINK_EYES = [px(2, 2), px(4, 2), px(5, 2)]
const OPEN = [px(3, 4), px(4, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)]
const GRIN = [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)]
const HEART: ReturnType<typeof px>[] = [
  [1, 1], [2, 1], [5, 1], [6, 1],
  [0, 2], [3, 2], [4, 2], [7, 2],
  [0, 3], [7, 3],
  [1, 4], [6, 4],
  [2, 5], [5, 5],
  [3, 6], [4, 6],
].map(([x, y]) => px(x, y))

type Face = 'smiley' | 'wink' | 'grin' | 'wow' | 'heart'
const FACE_TOKENS: Record<Face, { text: string; ops: ReturnType<typeof px>[] }[]> = {
  smiley: [
    { text: 'eyes', ops: EYES },
    { text: 'smile', ops: SMILE },
  ],
  wink: [
    { text: 'wink', ops: WINK_EYES },
    { text: 'smile', ops: SMILE },
  ],
  grin: [{ text: 'grin', ops: GRIN }],
  wow: [
    { text: 'eyes', ops: EYES },
    { text: 'wow', ops: OPEN },
  ],
  heart: [{ text: 'heart', ops: HEART }],
}
// Left alone with its own notes, the model works through its repertoire.
const STAGES: Face[] = ['smiley', 'wink', 'grin', 'wow']
const SEED_TEXT = 'try a heart'

const READ_MS = 700
const TOKEN_MS = 700
const OP_MS = 250
const NOTE_WINDOW = 6
const STREAM_WINDOW = 12

type Note = { by: 'model' | 'engineer'; text: string }
type TokenPlan = { text: string; ops: Omit<Op, 'tag'>[] }[]
type Sim = {
  runs: number
  notes: Note[]
  selfNotes: boolean
  route: { phase: 'read' | 'gen' | null; plan: TokenPlan; idx: number; d: number }
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
}
const INITIAL: Sim = {
  runs: 0,
  notes: [],
  selfNotes: true,
  route: { phase: null, plan: [], idx: 0, d: 0 },
  ops: [],
  pc: 0,
  lit: new Set(),
}

// What the model will do, given what it can see of itself.
function decideFace(notes: Note[]): Face {
  const last = notes[notes.length - 1]
  if (last?.by === 'engineer') return 'heart'
  const drawn = notes.filter((n) => n.by === 'model').length
  return STAGES[drawn % STAGES.length]
}

// ---- custom nodes -------------------------------------------------------

function EngineerNode({ data }: NodeProps) {
  const { runs } = data as { runs: number }
  return (
    <div className="w-32 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Engineer
      </div>
      <div className="mt-1 rounded-md bg-zinc-100 px-2 py-1.5 font-mono text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        {runs} run{runs === 1 ? '' : 's'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">steers the loop</div>
      <Handle type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="file" type="source" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function NotesNode({ data }: NodeProps) {
  const { notes, reading, written, selfNotes } = data as {
    notes: Note[]
    reading: boolean
    written: boolean
    selfNotes: boolean
  }
  const start = Math.max(0, notes.length - NOTE_WINDOW)
  const window = notes.slice(start)
  return (
    <div
      className={clsx(
        'w-48 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : reading ? 'ring-2 ring-violet-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 px-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        notes.txt
        <span
          className={clsx(
            'rounded-sm px-1 text-[9px]',
            selfNotes
              ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/10 dark:text-zinc-500',
          )}
        >
          self-notes {selfNotes ? 'on' : 'off'}
        </span>
      </div>
      <ol className="mt-1 font-mono text-[10px]/4">
        {window.map((n, i) => (
          <li
            key={start + i}
            className={clsx(
              'flex items-baseline gap-1.5 px-1',
              n.by === 'model'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-teal-600 dark:text-teal-400',
            )}
          >
            <span className="opacity-60">{n.by === 'model' ? 'm·' : 'e·'}</span>
            {n.text}
          </li>
        ))}
        {Array.from({ length: NOTE_WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <div className="mt-1 px-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        what the model can see of itself
      </div>
      <Handle id="read" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="edit" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { current, reading } = data as { current: string | null; reading: boolean }
  return (
    <div className="w-44 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1.5 font-mono text-xs',
          current
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : reading
              ? 'animate-pulse bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
              : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {current ?? (reading ? 'reading notes…' : 'idle')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        conditioned by what it wrote before
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="run" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function StreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  const start = Math.max(0, ops.length - STREAM_WINDOW)
  const window = ops.slice(start)
  return (
    <div className="w-48 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        The one stream
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
              <span className="w-5 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
                {gi}
              </span>
              <span className={clsx('w-24 shrink-0 truncate', op.kind === 'wr' && gi >= pc && 'text-amber-600 dark:text-amber-400')}>
                {op.text}
              </span>
              <span className="text-[9px] text-violet-400/80">{op.tag}</span>
            </li>
          )
        })}
        {Array.from({ length: STREAM_WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <Handle id="in" type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">lands the note too</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fx" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="source" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        run it again — same button, new output
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  steerEngineer: EngineerNode,
  steerNotes: NotesNode,
  steerLlm: LlmNode,
  steerStream: StreamNode,
  steerCpu: CpuNode,
  steerDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function EngineerSteerWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // The run: read the notes, then generate — face tokens, then (if the loop
  // is open) the note that will condition the next run.
  useEffect(() => {
    if (!sim.route.phase) return
    const ms = sim.route.phase === 'read' ? READ_MS : TOKEN_MS
    const t = setInterval(() => {
      setSim((s) => {
        const r = s.route
        if (r.phase === 'read') return { ...s, route: { ...r, phase: 'gen' } }
        if (r.phase === 'gen') {
          const tok = r.plan[r.idx]
          if (!tok) return { ...s, route: { ...r, phase: null } }
          const tagged = tok.ops.map((o) => ({ ...o, tag: `d${r.d}·t${r.idx}` }))
          return {
            ...s,
            ops: [...s.ops, ...tagged],
            route: { ...r, idx: r.idx + 1, phase: r.idx + 1 < r.plan.length ? 'gen' : null },
          }
        }
        return s
      })
    }, ms)
    return () => clearInterval(t)
  }, [sim.route.phase, sim.route.idx])

  // The one consumer — the note only exists once the WR executes.
  const cpuBusy = sim.pc < sim.ops.length
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        const lit = new Set(s.lit)
        let notes = s.notes
        if (op.kind === 'clr') lit.clear()
        if (op.kind === 'px' && op.x !== undefined) lit.add(`${op.x},${op.y}`)
        if (op.kind === 'wr' && op.payload) notes = [...notes, { by: 'model', text: op.payload }]
        return { ...s, pc: s.pc + 1, lit, notes }
      })
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  const running = sim.route.phase !== null

  function run() {
    setSim((s) => {
      if (s.route.phase) return s
      const face = decideFace(s.notes)
      const plan: TokenPlan = [
        { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
        ...FACE_TOKENS[face],
        ...(s.selfNotes
          ? [{ text: `note: ${face} ✓`, ops: [{ text: 'WR notes.txt', kind: 'wr' as OpKind, payload: `${face} ✓` }] }]
          : []),
      ]
      return { ...s, runs: s.runs + 1, route: { phase: 'read', plan, idx: 0, d: s.runs } }
    })
  }

  // The engineer's levers act on the file directly — they own the editor.
  function toggleSelfNotes() {
    setSim((s) => ({ ...s, selfNotes: !s.selfNotes }))
  }

  function seed() {
    setSim((s) => ({ ...s, notes: [...s.notes, { by: 'engineer', text: SEED_TEXT }] }))
  }

  function clearNotes() {
    setSim((s) => ({ ...s, notes: [] }))
  }

  function reset() {
    setSim(INITIAL)
  }

  const reading = sim.route.phase === 'read'
  const generating = sim.route.phase === 'gen'
  const current = generating ? (sim.route.plan[sim.route.idx]?.text ?? null) : null
  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const writingNote = currentOp?.kind === 'wr'

  const nodes: Node[] = [
    { id: 'engineer', type: 'steerEngineer', position: { x: 0, y: 130 }, data: { runs: sim.runs } },
    {
      id: 'notes',
      type: 'steerNotes',
      position: { x: 210, y: 0 },
      data: { notes: sim.notes, reading, written: writingNote, selfNotes: sim.selfNotes },
    },
    { id: 'llm', type: 'steerLlm', position: { x: 220, y: 230 }, data: { current, reading } },
    { id: 'stream', type: 'steerStream', position: { x: 480, y: 60 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'steerCpu', position: { x: 710, y: 100 }, data: { op: currentOp?.text ?? null } },
    { id: 'display', type: 'steerDisplay', position: { x: 695, y: 250 }, data: { lit: sim.lit } },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'run',
      source: 'engineer',
      target: 'llm',
      targetHandle: 'run',
      label: 'run',
      animated: running,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: running ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5 },
    },
    {
      id: 'steer',
      source: 'engineer',
      sourceHandle: 'file',
      target: 'notes',
      targetHandle: 'edit',
      label: 'seed / clear',
      animated: false,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { opacity: 0.5, stroke: teal },
    },
    {
      id: 'read',
      source: 'notes',
      sourceHandle: 'read',
      target: 'llm',
      label: 'reads its own past',
      animated: reading,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: reading ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'gen',
      source: 'llm',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      label: 'tokens → opcodes',
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
      animated: cpuBusy,
      style: cpuBusy ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'wr',
      source: 'cpu',
      sourceHandle: 'wr',
      target: 'notes',
      targetHandle: 'wr',
      label: writingNote ? 'WR — the output returns' : undefined,
      animated: writingNote,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: writingNote
        ? { stroke: amber, strokeWidth: 1.5 }
        : sim.selfNotes
          ? { opacity: 0.3, strokeDasharray: '4 4' }
          : { opacity: 0.08, strokeDasharray: '2 6' },
    },
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <WidgetFrame
      title="Outputs that shape the next outputs"
      hint={
        <>
          Press Run repeatedly. With self-notes on, each run reads what earlier runs recorded and
          does something new — and the note it writes back is just a{' '}
          <code className="font-mono text-xs">WR</code>{' '}opcode on the one stream. Turn self-notes
          off and every run is identical: same context, same output. The engineer steers the loop
          without touching the model — close it, clear it, or seed the very same file with a note
          the model will obey.
        </>
      }
    >
      <FlowCanvas
        className="h-112"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.09 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={running || cpuBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> Run
        </button>
        <button onClick={toggleSelfNotes} className={btn}>
          Self-notes: {sim.selfNotes ? 'on' : 'off'}
        </button>
        <button onClick={seed} disabled={running} className={btn}>
          <PencilIcon className="size-4" /> Seed &ldquo;{SEED_TEXT}&rdquo;
        </button>
        <button onClick={clearNotes} disabled={running} className={btn}>
          <TrashIcon className="size-4" /> Clear notes
        </button>
        <button onClick={reset} className={btn}>
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {sim.runs} runs · {sim.notes.length} notes
        </span>
      </div>
    </WidgetFrame>
  )
}
