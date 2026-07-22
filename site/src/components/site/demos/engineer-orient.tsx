'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { Unit } from '../prose'
import { DemoFrame } from '../demo-frame'

// The Role of Engineer, second flow — mechanism, not workflow. The engineer's
// lever is where to orient attention: code, prose, a data source, or the model
// live. Every orientation lands in the same place — serialized opcodes on the
// one stream — differing only in signature: when the expansion happens, how
// exact it is, and what its provenance reads like. And the LLM can write the
// files too: an edit is tokens expanding into a WR opcode, serialized like
// everything else, taking effect only when the CPU executes it.

const GRID = 8

type OpKind = 'clr' | 'px' | 'blit' | 'wr'
type TagKind = 'asm' | 'tok' | 'dat'
type Target = 'code' | 'prose' | 'data'
type Op = {
  text: string
  kind: OpKind
  x?: number
  y?: number
  target?: Target
  payload?: string
  tag: string
  tagKind: TagKind
}

const px = (x: number, y: number) => ({ text: `PX ${x},${y}`, kind: 'px' as const, x, y })

const EYES = [px(2, 2), px(5, 2)]

type Mouth = 'smile' | 'frown' | 'open' | 'flat'
const MOUTHS: Record<Mouth, ReturnType<typeof px>[]> = {
  smile: [px(1, 4), px(6, 4), px(2, 5), px(3, 5), px(4, 5), px(5, 5)],
  frown: [px(2, 4), px(3, 4), px(4, 4), px(5, 4), px(1, 5), px(6, 5)],
  open: [px(3, 4), px(4, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)],
  flat: [px(2, 5), px(3, 5), px(4, 5), px(5, 5)],
}
const MOUTH_KEYS = Object.keys(MOUTHS) as Mouth[]

type TokenPlan = { text: string; ops: Omit<Op, 'tag' | 'tagKind'>[] }[]

const V_CLASSIC: TokenPlan = [
  { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
  { text: 'eyes', ops: EYES },
  { text: 'smile', ops: MOUTHS.smile },
  { text: 'done', ops: [] },
]
const V_WINK: TokenPlan = [
  { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
  { text: 'wink', ops: [px(2, 2), px(4, 2), px(5, 2)] },
  { text: 'smile', ops: MOUTHS.smile },
  { text: 'done', ops: [] },
]
const V_GRIN: TokenPlan = [
  { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
  {
    text: 'grin',
    ops: [px(2, 2), px(5, 2), px(1, 4), px(6, 4), px(2, 5), px(5, 5), px(3, 6), px(4, 6)],
  },
  { text: 'done', ops: [] },
]

const PROSE_SPECS: { text: string; label: string; pool: { name: string; tokens: TokenPlan }[] }[] = [
  {
    text: '“draw a smiley”',
    label: 'smiley',
    pool: [
      { name: 'classic', tokens: V_CLASSIC },
      { name: 'wink', tokens: V_WINK },
      { name: 'grin', tokens: V_GRIN },
    ],
  },
  {
    text: '“draw a smiley, both eyes open”',
    label: 'both eyes open',
    pool: [
      { name: 'classic', tokens: V_CLASSIC },
      { name: 'grin', tokens: V_GRIN },
    ],
  },
  {
    text: '“draw a grinning smiley”',
    label: 'grinning',
    pool: [{ name: 'grin', tokens: V_GRIN }],
  },
  {
    text: '“draw a simple smiley”',
    label: 'simple',
    pool: [{ name: 'classic', tokens: V_CLASSIC }],
  },
]

type Glyph = 'heart' | 'star' | 'ring' | 'checker'
const GLYPHS: Record<Glyph, [number, number][]> = {
  heart: [
    [1, 1], [2, 1], [5, 1], [6, 1],
    [0, 2], [3, 2], [4, 2], [7, 2],
    [0, 3], [7, 3],
    [1, 4], [6, 4],
    [2, 5], [5, 5],
    [3, 6], [4, 6],
  ],
  star: [
    [3, 0], [4, 0],
    [3, 1], [4, 1],
    [2, 2], [3, 2], [4, 2], [5, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    [2, 5], [3, 5], [4, 5], [5, 5],
    [3, 6], [4, 6],
    [3, 7], [4, 7],
  ],
  ring: [
    [2, 1], [3, 1], [4, 1], [5, 1],
    [1, 2], [6, 2],
    [1, 3], [6, 3],
    [1, 4], [6, 4],
    [1, 5], [6, 5],
    [2, 6], [3, 6], [4, 6], [5, 6],
  ],
  checker: Array.from({ length: GRID * GRID }, (_, i) => [i % GRID, Math.floor(i / GRID)] as [number, number]).filter(
    ([x, y]) => (x + y) % 2 === 0,
  ),
}
const GLYPH_KEYS = Object.keys(GLYPHS) as Glyph[]

const CHAT_TOKENS: TokenPlan = [
  { text: 'clear', ops: [{ text: 'CLR', kind: 'clr' }] },
  { text: 'star', ops: GLYPHS.star.map(([x, y]) => px(x, y)) },
  { text: 'done', ops: [] },
]

function sample<T>(options: readonly T[], current: T): T {
  const rest = options.filter((o) => o !== current)
  return rest[Math.floor(Math.random() * rest.length)]
}

const CODE_MS = 120
const READ_MS = 550
const TOKEN_MS = 700
const OP_MS = 250
const WINDOW = 13

type TokenRoute = { phase: 'read' | 'gen' | null; plan: TokenPlan; idx: number; d: number }
type Sim = {
  decisions: number
  last: string | null
  ops: Op[]
  pc: number
  lit: ReadonlySet<string>
  codeQueue: Op[]
  prose: TokenRoute
  chat: TokenRoute
  edit: TokenRoute & { target: Target | null }
  dataPhase: 'read' | null
  dataD: number
  codeMouth: Mouth
  codeV: number
  proseSpec: number
  proseV: number
  dataGlyph: Glyph
  dataV: number
  proseRuns: number
}
const INITIAL: Sim = {
  decisions: 0,
  last: null,
  ops: [],
  pc: 0,
  lit: new Set(),
  codeQueue: [],
  prose: { phase: null, plan: [], idx: 0, d: 0 },
  chat: { phase: null, plan: [], idx: 0, d: 0 },
  edit: { phase: null, plan: [], idx: 0, d: 0, target: null },
  dataPhase: null,
  dataD: 0,
  codeMouth: 'smile',
  codeV: 1,
  proseSpec: 0,
  proseV: 1,
  dataGlyph: 'heart',
  dataV: 1,
  proseRuns: 0,
}

// ---- custom nodes -------------------------------------------------------

function EngineerNode({ data }: NodeProps) {
  const { last, decisions, active } = data as { last: string | null; decisions: number; active: boolean }
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Engineer
      </div>
      <div
        className={clsx(
          'mt-1 truncate rounded-md px-2 py-1.5 font-mono text-xs',
          active && last
            ? 'bg-teal-500/15 font-semibold text-teal-600 dark:text-teal-400'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {last ?? 'choosing…'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        {decisions} decision{decisions === 1 ? '' : 's'} · where to attend
      </div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CodeNode({ data }: NodeProps) {
  const { mouth, v, active, written } = data as {
    mouth: Mouth
    v: number
    active: boolean
    written: boolean
  }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : active ? 'ring-2 ring-amber-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        smiley.asm
        <span className="rounded-sm bg-amber-500/10 px-1 text-[9px] text-amber-700 dark:text-amber-400">code</span>
        <span className={clsx('rounded-sm px-1 text-[9px]', v > 1 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-zinc-400')}>
          v{v}
        </span>
      </div>
      <div className="text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        eyes · {mouth} — authored ahead, expands exactly
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function ProseNode({ data }: NodeProps) {
  const { spec, v, active, written } = data as {
    spec: number
    v: number
    active: boolean
    written: boolean
  }
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : active ? 'ring-2 ring-violet-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
        smiley.txt
        <span className="rounded-sm bg-violet-500/10 px-1 text-[9px] text-violet-700 dark:text-violet-400">prose</span>
        <span className={clsx('rounded-sm px-1 text-[9px]', v > 1 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-zinc-400')}>
          v{v}
        </span>
      </div>
      <div className="font-mono text-[9px]/4 text-zinc-400 italic dark:text-zinc-500">
        {PROSE_SPECS[spec].text} · {PROSE_SPECS[spec].pool.length} reading
        {PROSE_SPECS[spec].pool.length === 1 ? '' : 's'}
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function DataNode({ data }: NodeProps) {
  const { glyph, v, active, written } = data as {
    glyph: Glyph
    v: number
    active: boolean
    written: boolean
  }
  const pixels = GLYPHS[glyph]
  return (
    <div
      className={clsx(
        'w-44 rounded-lg bg-white p-2 shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        written ? 'ring-2 ring-amber-400/80' : active ? 'ring-2 ring-sky-400/50' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-sm bg-zinc-950 p-0.5">
          <div className="grid grid-cols-8 gap-px">
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const on = pixels.some(([x, y]) => x === i % GRID && y === Math.floor(i / GRID))
              return <div key={i} className={clsx('size-0.5 rounded-[0.5px]', on ? 'bg-sky-400' : 'bg-zinc-800')} />
            })}
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
            frame.dat
            <span className="rounded-sm bg-sky-500/10 px-1 text-[9px] text-sky-700 dark:text-sky-400">data</span>
            <span className={clsx('rounded-sm px-1 text-[9px]', v > 1 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-zinc-400')}>
              v{v}
            </span>
          </div>
          <div className="text-[9px]/4 text-zinc-400 dark:text-zinc-500">
            recorded {glyph} — recalled whole
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="wr" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { current, reading, chatActive, editTarget } = data as {
    current: string | null
    reading: boolean
    chatActive: boolean
    editTarget: Target | null
  }
  return (
    <div className="w-44 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-center gap-1.5 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
        {chatActive && (
          <span className="rounded-sm bg-violet-500/10 px-1 font-mono text-[9px] text-violet-500 normal-case italic dark:text-violet-400">
            &ldquo;draw a star&rdquo;
          </span>
        )}
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
        {current ?? (reading ? 'reading…' : 'idle')}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        runs prose, chats — and writes files
      </div>
      <Handle type="target" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="msg" type="target" position={Position.Left} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function StreamNode({ data }: NodeProps) {
  const { ops, pc } = data as { ops: Op[]; pc: number }
  const start = Math.max(0, ops.length - WINDOW)
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
              <span className={clsx('w-18 shrink-0 truncate', op.kind === 'wr' && gi >= pc && 'text-amber-600 dark:text-amber-400')}>
                {op.text}
              </span>
              <span
                className={clsx(
                  'text-[9px]',
                  op.tagKind === 'asm' && 'text-amber-500/80',
                  op.tagKind === 'tok' && 'text-violet-400/80',
                  op.tagKind === 'dat' && 'text-sky-400/80',
                )}
              >
                {op.tag}
              </span>
            </li>
          )
        })}
        {Array.from({ length: WINDOW - window.length }, (_, i) => (
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
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">one op at a time</div>
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
        renders whatever the stream says
      </div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  oriEngineer: EngineerNode,
  oriCode: CodeNode,
  oriProse: ProseNode,
  oriData: DataNode,
  oriLlm: LlmNode,
  oriStream: StreamNode,
  oriCpu: CpuNode,
  oriDisplay: DisplayNode,
}

// ---- the demo ---------------------------------------------------------

export function EngineerOrientDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // Code route: a fast, exact burst — one op per beat, straight in.
  useEffect(() => {
    if (sim.codeQueue.length === 0) return
    const t = setInterval(() => {
      setSim((s) => {
        const [op, ...rest] = s.codeQueue
        if (!op) return s
        return { ...s, ops: [...s.ops, op], codeQueue: rest }
      })
    }, CODE_MS)
    return () => clearInterval(t)
  }, [sim.codeQueue.length > 0])

  // Prose, chat, and edit routes share the token machinery (and the LLM).
  function useTokenRoute(key: 'prose' | 'chat' | 'edit') {
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
            return {
              ...s,
              ops: [...s.ops, ...tagged],
              [key]: { ...r, idx: r.idx + 1, phase: r.idx + 1 < r.plan.length ? 'gen' : null },
            }
          }
          return s
        })
      }, ms)
      return () => clearInterval(t)
    }, [route.phase, route.idx])
  }
  useTokenRoute('prose')
  useTokenRoute('chat')
  useTokenRoute('edit')

  // Data route: one read beat, then the whole recorded frame lands at once —
  // contents resolved at execution time.
  useEffect(() => {
    if (sim.dataPhase !== 'read') return
    const t = setTimeout(() => {
      setSim((s) => ({
        ...s,
        dataPhase: null,
        ops: [
          ...s.ops,
          { text: 'CLR', kind: 'clr', tag: `d${s.dataD}·dat`, tagKind: 'dat' },
          { text: 'BLIT frame.dat', kind: 'blit', tag: `d${s.dataD}·dat`, tagKind: 'dat' },
        ],
      }))
    }, READ_MS)
    return () => clearTimeout(t)
  }, [sim.dataPhase])

  // The one consumer — and the only place a write actually lands.
  const cpuBusy = sim.pc < sim.ops.length
  useEffect(() => {
    if (!cpuBusy) return
    const t = setInterval(() => {
      setSim((s) => {
        if (s.pc >= s.ops.length) return s
        const op = s.ops[s.pc]
        const lit = new Set(s.lit)
        let { codeMouth, codeV, proseSpec, proseV, dataGlyph, dataV } = s
        if (op.kind === 'clr') lit.clear()
        if (op.kind === 'px' && op.x !== undefined) lit.add(`${op.x},${op.y}`)
        if (op.kind === 'blit') for (const [x, y] of GLYPHS[dataGlyph]) lit.add(`${x},${y}`)
        if (op.kind === 'wr' && op.payload !== undefined) {
          if (op.target === 'code') {
            codeMouth = op.payload as Mouth
            codeV += 1
          }
          if (op.target === 'prose') {
            proseSpec = Number(op.payload)
            proseV += 1
          }
          if (op.target === 'data') {
            dataGlyph = op.payload as Glyph
            dataV += 1
          }
        }
        return { ...s, pc: s.pc + 1, lit, codeMouth, codeV, proseSpec, proseV, dataGlyph, dataV }
      })
    }, OP_MS)
    return () => clearInterval(t)
  }, [cpuBusy])

  const codeActive = sim.codeQueue.length > 0
  const proseActive = sim.prose.phase !== null
  const chatActive = sim.chat.phase !== null
  const editActive = sim.edit.phase !== null
  const dataActive = sim.dataPhase !== null
  const llmBusy = proseActive || chatActive || editActive
  const anyActive = codeActive || llmBusy || dataActive

  function orientCode() {
    setSim((s) => {
      if (s.codeQueue.length > 0) return s
      const d = s.decisions
      const body = [...EYES, ...MOUTHS[s.codeMouth]]
      const ops: Op[] = [
        { text: 'CLR', kind: 'clr', tag: `d${d}·asm`, tagKind: 'asm' },
        ...body.map((o) => ({ ...o, tag: `d${d}·asm`, tagKind: 'asm' as TagKind })),
      ]
      return { ...s, decisions: d + 1, last: 'orient: code', codeQueue: ops }
    })
  }

  function orientProse() {
    setSim((s) => {
      if (llmBusy) return s
      const pool = PROSE_SPECS[s.proseSpec].pool
      const variant = pool[s.proseRuns % pool.length]
      return {
        ...s,
        decisions: s.decisions + 1,
        last: 'orient: prose',
        proseRuns: s.proseRuns + 1,
        prose: { phase: 'read', plan: variant.tokens, idx: 0, d: s.decisions },
      }
    })
  }

  function orientData() {
    setSim((s) => {
      if (s.dataPhase) return s
      return { ...s, decisions: s.decisions + 1, last: 'orient: data', dataPhase: 'read', dataD: s.decisions }
    })
  }

  function orientChat() {
    setSim((s) => {
      if (llmBusy) return s
      return {
        ...s,
        decisions: s.decisions + 1,
        last: 'orient: LLM',
        chat: { phase: 'read', plan: CHAT_TOKENS, idx: 0, d: s.decisions },
      }
    })
  }

  // The LLM writes the files: it samples a fresh choice, announces it as a
  // token, and carries it in the WR opcode's payload.
  function editTarget(target: Target) {
    setSim((s) => {
      if (llmBusy) return s
      let note: string
      let payload: string
      if (target === 'code') {
        const mouth = sample(MOUTH_KEYS, s.codeMouth)
        note = `mouth → ${mouth}`
        payload = mouth
      } else if (target === 'prose') {
        const idx = sample(
          PROSE_SPECS.map((_, i) => i),
          s.proseSpec,
        )
        note = `spec → ${PROSE_SPECS[idx].label}`
        payload = String(idx)
      } else {
        const glyph = sample(GLYPH_KEYS, s.dataGlyph)
        note = `redraw ${glyph}`
        payload = glyph
      }
      const file = target === 'code' ? 'smiley.asm' : target === 'prose' ? 'smiley.txt' : 'frame.dat'
      const plan: TokenPlan = [
        { text: `read ${file.split('.')[1]}`, ops: [] },
        { text: note, ops: [] },
        { text: 'write', ops: [{ text: `WR ${file}`, kind: 'wr', target, payload }] },
      ]
      return {
        ...s,
        decisions: s.decisions + 1,
        last: `edit: ${target}`,
        edit: { phase: 'read', plan, idx: 0, d: s.decisions, target },
      }
    })
  }

  function reset() {
    setSim(INITIAL)
  }

  const llmCurrent =
    sim.prose.phase === 'gen'
      ? (sim.prose.plan[sim.prose.idx]?.text ?? null)
      : sim.chat.phase === 'gen'
        ? (sim.chat.plan[sim.chat.idx]?.text ?? null)
        : sim.edit.phase === 'gen'
          ? (sim.edit.plan[sim.edit.idx]?.text ?? null)
          : null
  const llmReading = sim.prose.phase === 'read' || sim.chat.phase === 'read' || sim.edit.phase === 'read'
  const currentOp = cpuBusy ? sim.ops[sim.pc] : null
  const writing = currentOp?.kind === 'wr' ? currentOp.target : null

  const counts = { asm: 0, tok: 0, dat: 0 }
  for (const op of sim.ops) counts[op.tagKind]++

  const nodes: Node[] = [
    {
      id: 'engineer',
      type: 'oriEngineer',
      position: { x: 0, y: 190 },
      data: { last: sim.last, decisions: sim.decisions, active: anyActive },
    },
    { id: 'code', type: 'oriCode', position: { x: 210, y: 0 }, data: { mouth: sim.codeMouth, v: sim.codeV, active: codeActive, written: writing === 'code' } },
    { id: 'prose', type: 'oriProse', position: { x: 210, y: 120 }, data: { spec: sim.proseSpec, v: sim.proseV, active: proseActive, written: writing === 'prose' } },
    { id: 'data', type: 'oriData', position: { x: 210, y: 240 }, data: { glyph: sim.dataGlyph, v: sim.dataV, active: dataActive, written: writing === 'data' } },
    {
      id: 'llm',
      type: 'oriLlm',
      position: { x: 210, y: 370 },
      data: {
        current: llmCurrent,
        reading: llmReading,
        chatActive,
        editTarget: sim.edit.phase ? sim.edit.target : null,
      },
    },
    { id: 'stream', type: 'oriStream', position: { x: 470, y: 100 }, data: { ops: sim.ops, pc: sim.pc } },
    {
      id: 'cpu',
      type: 'oriCpu',
      position: { x: 700, y: 130 },
      data: { op: currentOp?.text ?? null },
    },
    { id: 'display', type: 'oriDisplay', position: { x: 685, y: 290 }, data: { lit: sim.lit } },
  ]

  const teal = 'oklch(0.777 0.152 181.912)'
  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const sky = 'oklch(0.746 0.16 232.661)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const orient = (id: string, target: string, active: boolean, targetHandle?: string): Edge => ({
    id,
    source: 'engineer',
    target,
    targetHandle,
    animated: active,
    style: active ? { stroke: teal, strokeWidth: 1.5 } : { opacity: 0.5 },
  })
  const edges: Edge[] = [
    orient('o-code', 'code', codeActive),
    orient('o-prose', 'prose', proseActive),
    orient('o-data', 'data', dataActive),
    {
      ...orient('o-chat', 'llm', chatActive || editActive, 'msg'),
      label: 'message · directive',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
    },
    {
      id: 'code-in',
      source: 'code',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      animated: codeActive,
      style: codeActive ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'prose-llm',
      source: 'prose',
      sourceHandle: 'out',
      target: 'llm',
      animated: sim.prose.phase === 'read',
      style: proseActive ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'llm-in',
      source: 'llm',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      label: 'tokens → opcodes',
      animated: sim.prose.phase === 'gen' || sim.chat.phase === 'gen' || sim.edit.phase === 'gen',
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style:
        sim.prose.phase === 'gen' || sim.chat.phase === 'gen' || sim.edit.phase === 'gen'
          ? { stroke: violet, strokeWidth: 1.5 }
          : undefined,
    },
    {
      id: 'data-in',
      source: 'data',
      sourceHandle: 'out',
      target: 'stream',
      targetHandle: 'in',
      animated: dataActive,
      style: dataActive ? { stroke: sky, strokeWidth: 1.5 } : undefined,
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
    <DemoFrame
      title="Four orientations, one stream"
      hint={
        <>
          The engineer&rsquo;s lever is where to orient attention — <Unit kind="code" />, <Unit kind="prose" />, recorded{' '}
          <Unit kind="data" />, or
          the model live — and each choice has a signature: code expands exactly and ahead of time;
          prose is interpreted at run time and varies; data recalls a whole recorded frame in one
          op; a live message is negotiated token by token. Every one of them lands in the same
          place, tagged with its provenance. And the LLM can write the files too: an edit is tokens
          expanding into a <code className="font-mono text-xs">WR</code>{' '}opcode on the same stream,
          landing only when the CPU executes it — then the same orientation behaves differently.
        </>
      }
    >
      <DemoCanvas
        className="h-120"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.08 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={orientCode} disabled={codeActive} className={btn}>
          Orient: code
        </button>
        <button onClick={orientProse} disabled={llmBusy} className={btn}>
          Orient: prose
        </button>
        <button onClick={orientData} disabled={dataActive} className={btn}>
          Orient: data
        </button>
        <button onClick={orientChat} disabled={llmBusy} className={btn}>
          Orient: LLM
        </button>
        <button onClick={() => editTarget('code')} disabled={llmBusy} className={btn}>
          <SparklesIcon className="size-4" /> Edit code
        </button>
        <button onClick={() => editTarget('prose')} disabled={llmBusy} className={btn}>
          <SparklesIcon className="size-4" /> Edit prose
        </button>
        <button onClick={() => editTarget('data')} disabled={llmBusy} className={btn}>
          <SparklesIcon className="size-4" /> Edit data
        </button>
        <button onClick={reset} className={btn}>
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {sim.ops.length} ops = {counts.asm} asm · {counts.tok} tok · {counts.dat} dat
        </span>
      </div>
    </DemoFrame>
  )
}
