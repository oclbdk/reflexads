'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, PencilIcon, PlayIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { FlowCanvas } from './flow-canvas'
import { WidgetFrame } from '../widget-frame'

// The Role of Engineer, final flow. Three sources condition every run: the
// brief (prose — what to draw), the notes (data — what came before), and the
// render routine (code — how it lands, streaming in as asm ops right after
// the model's tokens in the same run). Both hands can rewrite all three, and
// both writes take the same route: a WR op on the one stream, executed by the
// CPU. The engineer's edit is typed and deterministic; the model's is read,
// sampled, and generated. The stream's provenance column tells them apart,
// and each file's badge shows whose hand moved it last.

const GRID = 8

type OpKind = 'clr' | 'px' | 'bor' | 'inv' | 'wr'
type TagKind = 'asm' | 'tok' | 'eng'
type Target = 'code' | 'prose' | 'data'
type By = 'e' | 'm'
type Op = {
  text: string
  kind: OpKind
  x?: number
  y?: number
  target?: Target
  payload?: string
  hand?: By
  tag: string
  tagKind: TagKind
}

const px = (x: number, y: number) => ({ text: `PX ${x},${y}`, kind: 'px' as const, x, y })

const FACES: { name: string; ops: ReturnType<typeof px>[] }[] = [
  { name: 'smiley', ops: [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
  { name: 'wink', ops: [px(2, 2), px(4, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)] },
  { name: 'grin', ops: [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)] },
  { name: 'wow', ops: [px(2, 2), px(5, 2), px(3, 4), px(4, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)] },
]
const SHAPES: { name: string; ops: ReturnType<typeof px>[] }[] = [
  {
    name: 'heart',
    ops: [
      [1, 1], [2, 1], [5, 1], [6, 1],
      [0, 2], [3, 2], [4, 2], [7, 2],
      [0, 3], [7, 3],
      [1, 4], [6, 4],
      [2, 5], [5, 5],
      [3, 6], [4, 6],
    ].map(([x, y]) => px(x, y)),
  },
  {
    name: 'star',
    ops: [
      [3, 0], [4, 0], [3, 1], [4, 1],
      [2, 2], [3, 2], [4, 2], [5, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
      [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
      [2, 5], [3, 5], [4, 5], [5, 5],
      [3, 6], [4, 6], [3, 7], [4, 7],
    ].map(([x, y]) => px(x, y)),
  },
  {
    name: 'ring',
    ops: [
      [2, 1], [3, 1], [4, 1], [5, 1],
      [1, 2], [6, 2], [1, 3], [6, 3], [1, 4], [6, 4], [1, 5], [6, 5],
      [2, 6], [3, 6], [4, 6], [5, 6],
    ].map(([x, y]) => px(x, y)),
  },
]

const BRIEFS: { text: string; label: string; reps: typeof FACES }[] = [
  { text: '“draw faces”', label: 'faces', reps: FACES },
  { text: '“draw shapes”', label: 'shapes', reps: SHAPES },
]

type Routine = 'plain' | 'border' | 'invert'
const ROUTINES: Record<Routine, { text: string; kind: OpKind }[]> = {
  plain: [],
  border: [{ text: 'BOR', kind: 'bor' }],
  invert: [{ text: 'INV', kind: 'inv' }],
}
const ROUTINE_KEYS = Object.keys(ROUTINES) as Routine[]

const BORDER_PIXELS: [number, number][] = Array.from({ length: GRID * GRID }, (_, i) => [
  i % GRID,
  Math.floor(i / GRID),
] as [number, number]).filter(([x, y]) => x === 0 || x === 7 || y === 0 || y === 7)

function sample<T>(options: readonly T[], current: T): T {
  const rest = options.filter((o) => o !== current)
  return rest[Math.floor(Math.random() * rest.length)]
}

const READ_MS = 650
const TOKEN_MS = 700
const OP_MS = 220
const NOTE_WINDOW = 4
const STREAM_WINDOW = 13

const FILES: Record<Target, string> = { code: 'frame.asm', prose: 'brief.txt', data: 'notes.dat' }

type TokenPlan = { text: string; ops: Omit<Op, 'tag' | 'tagKind'>[] }[]
type Sim = {
  runs: number
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  routine: Routine
  routineV: number
  routineBy: By
  brief: number
  briefV: number
  briefBy: By
  notes: string[]
  run: { phase: 'read' | 'gen' | null; plan: TokenPlan; idx: number; d: number; pendingAsm: Op[] }
  edit: { phase: 'read' | 'gen' | null; plan: TokenPlan; idx: number; d: number; target: Target | null }
}
const INITIAL: Sim = {
  runs: 0,
  ops: [],
  pc: 0,
  lit: new Set(),
  routine: 'plain',
  routineV: 1,
  routineBy: 'e',
  brief: 0,
  briefV: 1,
  briefBy: 'e',
  notes: [],
  run: { phase: null, plan: [], idx: 0, d: 0, pendingAsm: [] },
  edit: { phase: null, plan: [], idx: 0, d: 0, target: null },
}

// ---- custom nodes -------------------------------------------------------

function ByBadge({ v, by }: { v: number; by: By }) {
  return (
    <span
      className={clsx(
        'rounded-sm px-1 text-[9px]',
        v > 1
          ? by === 'e'
            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
            : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
          : 'text-zinc-400',
      )}
    >
      {v > 1 ? `${by}·v${v}` : `v${v}`}
    </span>
  )
}

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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">types ops — or delegates</div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CodeNode({ data }: NodeProps) {
  const { routine, v, by, written, streaming } = data as {
    routine: Routine
    v: number
    by: By
    written: boolean
    streaming: boolean
  }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : streaming ? 'ring-2 ring-amber-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        frame.asm
        <span className="rounded-sm bg-amber-500/10 px-1 text-[9px] text-amber-700 dark:text-amber-400">code</span>
        <ByBadge v={v} by={by} />
      </div>
      <div className="text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        render routine: {routine} — runs after every generation
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ProseNode({ data }: NodeProps) {
  const { brief, v, by, reading, written } = data as {
    brief: number
    v: number
    by: By
    reading: boolean
    written: boolean
  }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : reading ? 'ring-2 ring-violet-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        brief.txt
        <span className="rounded-sm bg-violet-500/10 px-1 text-[9px] text-violet-700 dark:text-violet-400">prose</span>
        <ByBadge v={v} by={by} />
      </div>
      <div className="font-mono text-[9px]/4 text-zinc-400 italic dark:text-zinc-500">
        {BRIEFS[brief].text} — sets the repertoire
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DataNode({ data }: NodeProps) {
  const { notes, reading, written } = data as {
    notes: string[]
    reading: boolean
    written: boolean
  }
  const start = Math.max(0, notes.length - NOTE_WINDOW)
  const window = notes.slice(start)
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : reading ? 'ring-2 ring-violet-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        notes.dat
        <span className="rounded-sm bg-sky-500/10 px-1 text-[9px] text-sky-700 dark:text-sky-400">data</span>
        <span className="rounded-sm px-1 text-[9px] text-zinc-400">{notes.length}</span>
      </div>
      <ol className="mt-0.5 font-mono text-[9px]/4">
        {window.map((n, i) => (
          <li key={start + i} className="truncate text-violet-600 dark:text-violet-400">
            m· {n}
          </li>
        ))}
        {Array.from({ length: NOTE_WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <div className="text-[9px]/4 text-zinc-400 dark:text-zinc-500">history — steers the next pick</div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { current, reading, editTarget } = data as {
    current: string | null
    reading: boolean
    editTarget: Target | null
  }
  return (
    <div className="w-44 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-center gap-1.5 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
        {editTarget && (
          <span className="rounded-sm bg-teal-500/10 px-1 font-mono text-[9px] text-teal-600 normal-case dark:text-teal-400">
            editing {editTarget}
          </span>
        )}
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
        {current ?? (reading ? 'reading brief + notes…' : 'idle')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">conditioned by all three files</div>
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
              <span className={clsx('w-20 shrink-0 truncate', op.kind === 'wr' && gi >= pc && 'text-amber-600 dark:text-amber-400')}>
                {op.text}
              </span>
              <span
                className={clsx(
                  'text-[9px]',
                  op.tagKind === 'asm'
                    ? 'text-amber-500/80'
                    : op.tagKind === 'eng'
                      ? 'text-teal-500/90'
                      : 'text-violet-400/80',
                )}
              >
                {op.tag}
              </span>
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">lands every hand&rsquo;s work</div>
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
        subject × routine × history
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  cndEngineer: EngineerNode,
  cndCode: CodeNode,
  cndProse: ProseNode,
  cndData: DataNode,
  cndLlm: LlmNode,
  cndStream: StreamNode,
  cndCpu: CpuNode,
  cndDisplay: DisplayNode,
}

// ---- the widget ---------------------------------------------------------

export function EngineerConditionWidget() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // Run and edit routes share the token machinery (and the LLM). A run's last
  // token also lands the render routine — asm ops, same stream, same span.
  function useTokenRoute(key: 'run' | 'edit') {
    const route = sim[key]
    useEffect(() => {
      if (!route.phase) return
      const ms = route.phase === 'read' ? READ_MS : TOKEN_MS
      const t = setInterval(() => {
        setSim((s) => {
          const r = s[key]
          if (r.phase === 'read') return { ...s, [key]: { ...r, phase: 'gen' } }
          if (r.phase === 'gen') {
            const tok = r.plan[r.idx]
            if (!tok) return { ...s, [key]: { ...r, phase: null } }
            const tagged = tok.ops.map((o) => ({
              ...o,
              tag: `d${r.d}·t${r.idx}`,
              tagKind: 'tok' as TagKind,
            }))
            const last = r.idx + 1 >= r.plan.length
            const pendingAsm = key === 'run' && last ? (r as Sim['run']).pendingAsm : []
            return {
              ...s,
              ops: [...s.ops, ...tagged, ...pendingAsm],
              [key]: { ...r, idx: r.idx + 1, phase: last ? null : 'gen' },
            }
          }
          return s
        })
      }, ms)
      return () => clearInterval(t)
    }, [route.phase, route.idx])
  }
  useTokenRoute('run')
  useTokenRoute('edit')

  // The one consumer — where drawings, routines, and edits all land.
  const cpuBusy = sim.pc < sim.ops.length
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        let lit = new Set(s.lit)
        let { routine, routineV, routineBy, brief, briefV, briefBy } = s
        let notes = s.notes
        switch (op.kind) {
          case 'clr':
            lit.clear()
            break
          case 'px':
            if (op.x !== undefined) lit.add(`${op.x},${op.y}`)
            break
          case 'bor':
            for (const [x, y] of BORDER_PIXELS) lit.add(`${x},${y}`)
            break
          case 'inv': {
            const inv = new Set<string>()
            for (let i = 0; i < GRID * GRID; i++) {
              const key = `${i % GRID},${Math.floor(i / GRID)}`
              if (!lit.has(key)) inv.add(key)
            }
            lit = inv
            break
          }
          case 'wr':
            if (op.payload !== undefined) {
              const hand = op.hand ?? 'm'
              if (op.target === 'code') {
                routine = op.payload as Routine
                routineV += 1
                routineBy = hand
              }
              if (op.target === 'prose') {
                brief = Number(op.payload)
                briefV += 1
                briefBy = hand
              }
              if (op.target === 'data') notes = op.payload === '∅' ? [] : [...notes, op.payload]
            }
            break
        }
        return { ...s, pc: s.pc + 1, lit, routine, routineV, routineBy, brief, briefV, briefBy, notes }
      })
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  const running = sim.run.phase !== null
  const editing = sim.edit.phase !== null
  const llmBusy = running || editing

  function run() {
    setSim((s) => {
      if (llmBusy) return s
      const reps = BRIEFS[s.brief].reps
      const subject = reps[s.notes.length % reps.length]
      const d = s.runs
      const plan: TokenPlan = [
        { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
        { text: subject.name, ops: subject.ops },
        {
          text: `note: ${subject.name} ✓`,
          ops: [{ text: 'WR notes.dat', kind: 'wr', target: 'data', payload: `${subject.name} ✓`, hand: 'm' }],
        },
      ]
      const pendingAsm: Op[] = ROUTINES[s.routine].map((o) => ({
        ...o,
        tag: `d${d}·asm`,
        tagKind: 'asm',
      }))
      return { ...s, runs: s.runs + 1, run: { phase: 'read', plan, idx: 0, d, pendingAsm } }
    })
  }

  // Engineer edits: typed and deterministic — but no shortcut. The keystroke
  // becomes a WR op appended to the one stream, and the file changes when the
  // CPU executes it, exactly like everything else.
  function engineerEdit(target: Target) {
    setSim((s) => {
      const payload =
        target === 'code'
          ? ROUTINE_KEYS[(ROUTINE_KEYS.indexOf(s.routine) + 1) % ROUTINE_KEYS.length]
          : target === 'prose'
            ? String((s.brief + 1) % BRIEFS.length)
            : '∅'
      const op: Op = {
        text: `WR ${FILES[target]}`,
        kind: 'wr',
        target,
        payload,
        hand: 'e',
        tag: 'e·wr',
        tagKind: 'eng',
      }
      return { ...s, ops: [...s.ops, op] }
    })
  }

  // LLM edits: sampled, streamed — read, decide, and a WR on the one stream.
  function llmEdit(target: Target) {
    setSim((s) => {
      if (llmBusy) return s
      let note: string
      let payload: string
      if (target === 'code') {
        const next = sample(ROUTINE_KEYS, s.routine)
        note = `routine → ${next}`
        payload = next
      } else if (target === 'prose') {
        const idx = sample(
          BRIEFS.map((_, i) => i),
          s.brief,
        )
        note = `brief → ${BRIEFS[idx].label}`
        payload = String(idx)
      } else {
        const reps = BRIEFS[s.brief].reps
        const claim = reps[Math.floor(Math.random() * reps.length)].name
        note = `claim: ${claim} ✓`
        payload = `${claim} ✓ (claimed)`
      }
      const file = FILES[target]
      const plan: TokenPlan = [
        { text: `read ${file.split('.')[0]}`, ops: [] },
        { text: note, ops: [] },
        { text: 'write', ops: [{ text: `WR ${file}`, kind: 'wr', target, payload, hand: 'm' }] },
      ]
      return { ...s, edit: { phase: 'read', plan, idx: 0, d: s.runs, target } }
    })
  }

  function reset() {
    setSim(INITIAL)
  }

  const reading = sim.run.phase === 'read' || sim.edit.phase === 'read'
  const current =
    sim.run.phase === 'gen'
      ? (sim.run.plan[sim.run.idx]?.text ?? null)
      : sim.edit.phase === 'gen'
        ? (sim.edit.plan[sim.edit.idx]?.text ?? null)
        : null
  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const writing = currentOp?.kind === 'wr' ? currentOp.target : null
  const asmPending = sim.ops.slice(sim.pc).some((o) => o.tagKind === 'asm')
  const engPending = sim.ops.slice(sim.pc).some((o) => o.tagKind === 'eng')
  const editReading = sim.edit.phase === 'read' ? sim.edit.target : null

  const nodes: Node[] = [
    { id: 'engineer', type: 'cndEngineer', position: { x: 0, y: 190 }, data: { runs: sim.runs } },
    {
      id: 'code',
      type: 'cndCode',
      position: { x: 210, y: 0 },
      data: { routine: sim.routine, v: sim.routineV, by: sim.routineBy, written: writing === 'code', streaming: asmPending },
    },
    {
      id: 'prose',
      type: 'cndProse',
      position: { x: 210, y: 115 },
      data: { brief: sim.brief, v: sim.briefV, by: sim.briefBy, reading: sim.run.phase === 'read', written: writing === 'prose' },
    },
    {
      id: 'data',
      type: 'cndData',
      position: { x: 210, y: 230 },
      data: { notes: sim.notes, reading: sim.run.phase === 'read', written: writing === 'data' },
    },
    {
      id: 'llm',
      type: 'cndLlm',
      position: { x: 210, y: 385 },
      data: { current, reading, editTarget: sim.edit.phase ? sim.edit.target : null },
    },
    { id: 'stream', type: 'cndStream', position: { x: 470, y: 100 }, data: { ops: sim.ops, pc: sim.pc } },
    { id: 'cpu', type: 'cndCpu', position: { x: 700, y: 130 }, data: { op: currentOp?.text ?? null } },
    { id: 'display', type: 'cndDisplay', position: { x: 685, y: 290 }, data: { lit: sim.lit } },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'e-stream',
      source: 'engineer',
      target: 'stream',
      targetHandle: 'in',
      label: 'edits → ops',
      animated: engPending,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: engPending ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5, stroke: teal },
    },
    {
      id: 'e-llm',
      source: 'engineer',
      target: 'llm',
      targetHandle: 'run',
      label: 'run · directive',
      animated: llmBusy,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: llmBusy ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5 },
    },
    {
      id: 'brief-llm',
      source: 'prose',
      sourceHandle: 'out',
      target: 'llm',
      label: 'brief',
      animated: sim.run.phase === 'read' || editReading === 'prose',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style:
        sim.run.phase === 'read' || editReading === 'prose'
          ? { stroke: violet, strokeWidth: 1.5 }
          : undefined,
    },
    {
      id: 'notes-llm',
      source: 'data',
      sourceHandle: 'out',
      target: 'llm',
      label: 'its past',
      animated: sim.run.phase === 'read' || editReading === 'data',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style:
        sim.run.phase === 'read' || editReading === 'data'
          ? { stroke: violet, strokeWidth: 1.5 }
          : undefined,
    },
    {
      id: 'code-llm',
      source: 'code',
      sourceHandle: 'out',
      target: 'llm',
      animated: editReading === 'code',
      style:
        editReading === 'code'
          ? { stroke: violet, strokeWidth: 1.5 }
          : { opacity: 0.15, strokeDasharray: '4 4' },
    },
    {
      id: 'routine-in',
      source: 'code',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      label: 'routine',
      animated: asmPending,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: asmPending ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'llm-in',
      source: 'llm',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      label: 'tokens → opcodes',
      animated: sim.run.phase === 'gen' || sim.edit.phase === 'gen',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style:
        sim.run.phase === 'gen' || sim.edit.phase === 'gen'
          ? { stroke: violet, strokeWidth: 1.5 }
          : undefined,
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
    ...(['code', 'prose', 'data'] as Target[]).map(
      (t): Edge => ({
        id: `wr-${t}`,
        source: 'cpu',
        sourceHandle: 'wr',
        target: t,
        targetHandle: 'wr',
        label: writing === t ? 'WR' : undefined,
        animated: writing === t,
        labelStyle: { fontSize: 9 },
        labelBgStyle: { fillOpacity: 0 },
        style:
          writing === t
            ? { stroke: amber, strokeWidth: 1.5 }
            : { opacity: 0.15, strokeDasharray: '4 4' },
      }),
    ),
  ]

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5'

  return (
    <WidgetFrame
      title="Two hands, one stream"
      hint={
        <>
          <span className="block">
            Every run is conditioned by three files: the brief (what to draw), the notes (what came
            before), the render routine (how it lands). Each has two edit buttons — the pencil is
            you-the-engineer, the sparkle asks the model.
          </span>
          <span className="mt-2 block">
            Watch the stream when you edit. The engineer&rsquo;s edit arrives as a teal{' '}
            <span className="font-mono text-xs text-teal-500">e·wr</span>{' '}op: typed, deterministic,
            exactly what you asked. The model&rsquo;s arrives as violet tokens that end in a WR: it
            reads the file, samples a choice, and you find out which one when it lands. Either way
            the file only changes when the CPU executes the write. Two hands, one stream, one
            record — the badge on each file remembers whose hand moved it last,{' '}
            <span className="font-mono text-xs text-teal-500">e·</span>{' '}or{' '}
            <span className="font-mono text-xs text-violet-500">m·</span>, and the provenance
            column holds the full history: typed, sampled, or compiled (
            <span className="font-mono text-xs text-amber-500">asm</span>).
          </span>
        </>
      }
    >
      <FlowCanvas
        className="h-120"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.08 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={llmBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlayIcon className="size-4" /> Run
        </button>
        {(['code', 'prose', 'data'] as Target[]).map((t) => (
          <span
            key={t}
            className="inline-flex items-stretch overflow-hidden rounded-lg ring-1 ring-zinc-950/10 dark:ring-white/10"
          >
            <span className="flex items-center px-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              {FILES[t]}
            </span>
            <button
              onClick={() => engineerEdit(t)}
              aria-label={`engineer: edit ${FILES[t]}`}
              title={
                t === 'data'
                  ? 'engineer: clear the notes — typed, lands as a WR op'
                  : `engineer: cycle the ${t === 'code' ? 'routine' : 'brief'} — typed, lands as a WR op`
              }
              className="border-l border-zinc-950/10 px-2.5 py-1.5 text-teal-600 hover:bg-teal-500/10 dark:border-white/10 dark:text-teal-400"
            >
              <PencilIcon className="size-4" />
            </button>
            <button
              onClick={() => llmEdit(t)}
              disabled={llmBusy}
              aria-label={`model: edit ${FILES[t]}`}
              title={
                t === 'data'
                  ? 'model: append a claim — sampled, lands as a WR op'
                  : `model: pick a ${t === 'code' ? 'routine' : 'brief'} — sampled, lands as a WR op`
              }
              className="border-l border-zinc-950/10 px-2.5 py-1.5 text-violet-600 hover:bg-violet-500/10 disabled:opacity-40 dark:border-white/10 dark:text-violet-400"
            >
              <SparklesIcon className="size-4" />
            </button>
          </span>
        ))}
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
