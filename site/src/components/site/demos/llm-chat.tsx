'use client'

import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/16/solid'
import { DemoCanvas } from './demo-canvas'
import { DemoFrame } from '../demo-frame'

// Messages map to tokens the way tokens mapped to opcodes — and this time the
// user authors the upper stream. A sent message tokenizes down into the one
// token sequence; the LLM reads that whole sequence and appends its reply one
// token at a time; the reply folds back up into a message. Both roles' spans
// live in the same stream, every token tagged with the message it belongs to.

const GRID = 8

type Role = 'user' | 'asst'
type Msg = { role: Role; text: string }
type Tok = { text: string; msg: number; role: Role }

const CHIPS: { text: string; userToks: string[]; reply: string[] }[] = [
  { text: 'draw a smiley', userToks: ['draw', 'a', 'smiley'], reply: ['clear', 'eyes', 'smile', 'done'] },
  { text: 'invert it', userToks: ['invert', 'it'], reply: ['invert', 'done'] },
  { text: 'wipe the screen', userToks: ['wipe', 'the', 'screen'], reply: ['clear', 'done'] },
]

const EYES: [number, number][] = [[2, 2], [5, 2]]
const SMILE: [number, number][] = [[1, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5]]

const TOKENIZE_MS = 300
const GENERATE_MS = 800
const FOLD_MS = 500
const CPU_MS = 450

const MSG_WINDOW = 4
const TOK_WINDOW = 10

type Phase = 'idle' | 'tokenizing' | 'generating' | 'folding'
type Sim = {
  phase: Phase
  msgs: Msg[]
  toks: Tok[]
  plan: string[]
  reply: string[]
  cpuQueue: string[]
  cpuCurrent: string | null
  lit: ReadonlySet<string>
}
const INITIAL: Sim = {
  phase: 'idle',
  msgs: [],
  toks: [],
  plan: [],
  reply: [],
  cpuQueue: [],
  cpuCurrent: null,
  lit: new Set(),
}

function applyToken(lit: ReadonlySet<string>, tok: string): ReadonlySet<string> {
  const next = new Set(lit)
  switch (tok) {
    case 'clear':
      next.clear()
      break
    case 'eyes':
      for (const [x, y] of EYES) next.add(`${x},${y}`)
      break
    case 'smile':
      for (const [x, y] of SMILE) next.add(`${x},${y}`)
      break
    case 'invert': {
      const inv = new Set<string>()
      for (let i = 0; i < GRID * GRID; i++) {
        const key = `${i % GRID},${Math.floor(i / GRID)}`
        if (!next.has(key)) inv.add(key)
      }
      return inv
    }
  }
  return next
}

// ---- custom nodes -------------------------------------------------------

function MessagesNode({ data }: NodeProps) {
  const { msgs, phase } = data as { msgs: Msg[]; phase: Phase }
  const start = Math.max(0, msgs.length - MSG_WINDOW)
  const window = msgs.slice(start)
  return (
    <div className="w-56 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Message sequence
      </div>
      <ol className="space-y-0.5 font-mono text-[10px]/4">
        {window.map((m, i) => {
          const gi = start + i
          return (
            <li
              key={gi}
              className={clsx(
                'flex items-baseline gap-1.5 rounded-sm px-1.5 py-0.5',
                m.role === 'user'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
              )}
            >
              <span className="w-5 shrink-0 opacity-60">m{gi}</span>
              <span className="w-7 shrink-0 opacity-60">{m.role === 'user' ? 'user' : 'asst'}</span>
              <span className="truncate">{m.text}</span>
            </li>
          )
        })}
        {phase === 'generating' || phase === 'folding' ? (
          <li className="flex items-baseline gap-1.5 rounded-sm bg-violet-500/10 px-1.5 py-0.5 text-violet-700 opacity-70 dark:text-violet-400">
            <span className="w-5 shrink-0 opacity-60">m{msgs.length}</span>
            <span className="w-7 shrink-0 opacity-60">asst</span>
            <span className="animate-pulse">…</span>
          </li>
        ) : null}
        {Array.from(
          {
            length:
              MSG_WINDOW +
              1 -
              window.length -
              (phase === 'generating' || phase === 'folding' ? 1 : 0),
          },
          (_, i) => (
            <li key={`pad-${i}`} className="px-1.5 py-0.5 text-zinc-200 select-none dark:text-zinc-700">
              ·
            </li>
          ),
        )}
      </ol>
      <Handle id="send" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="recv" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function TokenStreamNode({ data }: NodeProps) {
  const { toks } = data as { toks: Tok[] }
  const start = Math.max(0, toks.length - TOK_WINDOW)
  const window = toks.slice(start)
  return (
    <div className="w-44 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 pb-1 text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Token sequence
      </div>
      <ol className="font-mono text-[11px]/5">
        {window.map((t, i) => {
          const gi = start + i
          const latest = gi === toks.length - 1
          return (
            <li
              key={gi}
              className={clsx(
                'flex items-baseline gap-2 rounded-sm px-1.5',
                latest && 'bg-zinc-100 dark:bg-white/5',
                t.role === 'user'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-violet-700 dark:text-violet-400',
              )}
            >
              <span className="w-6 shrink-0 text-right text-[9px] text-zinc-300 tabular-nums dark:text-zinc-600">
                {gi}
              </span>
              <span className="w-14 shrink-0">{t.text}</span>
              <span className="text-[9px] opacity-60">m{t.msg}</span>
            </li>
          )
        })}
        {Array.from({ length: TOK_WINDOW - window.length }, (_, i) => (
          <li key={`pad-${i}`} className="px-1.5 text-zinc-200 select-none dark:text-zinc-700">
            ·
          </li>
        ))}
      </ol>
      <Handle id="in" type="target" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="fold" type="source" position={Position.Left} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="ctx" type="source" position={Position.Right} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="gen" type="target" position={Position.Right} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="exec" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function LlmNode({ data }: NodeProps) {
  const { phase, current } = data as { phase: Phase; current: string | null }
  const generating = phase === 'generating'
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        LLM
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          generating && current
            ? 'bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {generating && current ? current : phase === 'idle' ? 'idle' : '…'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        reads the whole sequence,
        <br />
        appends one token
      </div>
      <Handle id="ctxin" type="target" position={Position.Left} style={{ top: '35%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="emit" type="source" position={Position.Left} style={{ top: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function CpuNode({ data }: NodeProps) {
  const { current } = data as { current: string | null }
  return (
    <div className="w-36 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        CPU
      </div>
      <div
        className={clsx(
          'mt-1 rounded-md px-2 py-1.5 font-mono text-xs',
          current
            ? 'bg-reflex-500/15 font-semibold text-reflex-600 dark:text-reflex-500'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        {current ?? 'idle'}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">opcode spans implied</div>
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
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
        the user experience
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  chatMsgs: MessagesNode,
  chatToks: TokenStreamNode,
  chatLlm: LlmNode,
  chatCpu: CpuNode,
  chatDisplay: DisplayNode,
}

// ---- the demo ---------------------------------------------------------

export function LlmChatDemo() {
  const [sim, setSim] = useState<Sim>(INITIAL)

  // The conversation clock: tokenize fast, generate slower, fold once.
  useEffect(() => {
    if (sim.phase === 'idle') return
    const ms =
      sim.phase === 'tokenizing' ? TOKENIZE_MS : sim.phase === 'generating' ? GENERATE_MS : FOLD_MS
    const t = setInterval(() => {
      setSim((s) => {
        switch (s.phase) {
          case 'tokenizing': {
            const [tok, ...rest] = s.plan
            if (!tok) return s
            const toks = [...s.toks, { text: tok, msg: s.msgs.length - 1, role: 'user' as Role }]
            if (rest.length > 0) return { ...s, toks, plan: rest }
            const chip = CHIPS.find((c) => c.text === s.msgs[s.msgs.length - 1]?.text)
            return { ...s, toks, plan: chip?.reply ?? [], phase: 'generating' }
          }
          case 'generating': {
            const [tok, ...rest] = s.plan
            if (!tok) return { ...s, phase: 'folding' }
            const toks = [...s.toks, { text: tok, msg: s.msgs.length, role: 'asst' as Role }]
            return {
              ...s,
              toks,
              plan: rest,
              reply: [...s.reply, tok],
              cpuQueue: [...s.cpuQueue, tok],
              phase: rest.length > 0 ? 'generating' : 'folding',
            }
          }
          case 'folding': {
            const msgs = [...s.msgs, { role: 'asst' as Role, text: s.reply.join(' ') }]
            return { ...s, msgs, reply: [], phase: 'idle' }
          }
          default:
            return s
        }
      })
    }, ms)
    return () => clearInterval(t)
  }, [sim.phase])

  // The CPU clock: drains the assistant's semantic tokens into effects.
  const cpuActive = sim.cpuQueue.length > 0 || sim.cpuCurrent !== null
  useEffect(() => {
    if (!cpuActive) return
    const t = setInterval(() => {
      setSim((s) => {
        const [tok, ...rest] = s.cpuQueue
        if (!tok) return { ...s, cpuCurrent: null }
        return { ...s, cpuQueue: rest, cpuCurrent: tok, lit: applyToken(s.lit, tok) }
      })
    }, CPU_MS)
    return () => clearInterval(t)
  }, [cpuActive])

  function send(chip: (typeof CHIPS)[number]) {
    setSim((s) => {
      if (s.phase !== 'idle') return s
      return {
        ...s,
        msgs: [...s.msgs, { role: 'user', text: chip.text }],
        plan: chip.userToks,
        phase: 'tokenizing',
      }
    })
  }

  function reset() {
    setSim(INITIAL)
  }

  const tokenizing = sim.phase === 'tokenizing'
  const generating = sim.phase === 'generating'
  const folding = sim.phase === 'folding'
  const emitting = generating ? (sim.plan[0] ?? null) : null

  const nodes: Node[] = [
    { id: 'msgs', type: 'chatMsgs', position: { x: 0, y: 20 }, data: { msgs: sim.msgs, phase: sim.phase } },
    { id: 'toks', type: 'chatToks', position: { x: 310, y: 0 }, data: { toks: sim.toks } },
    { id: 'llm', type: 'chatLlm', position: { x: 545, y: 40 }, data: { phase: sim.phase, current: emitting } },
    { id: 'cpu', type: 'chatCpu', position: { x: 310, y: 265 }, data: { current: sim.cpuCurrent } },
    { id: 'display', type: 'chatDisplay', position: { x: 510, y: 240 }, data: { lit: sim.lit } },
  ]

  const amber = 'oklch(0.769 0.188 70.08)'
  const violet = 'oklch(0.702 0.183 293.541)'
  const emerald = 'oklch(0.765 0.177 163.223)'
  const edges: Edge[] = [
    {
      id: 'tokenize',
      source: 'msgs',
      sourceHandle: 'send',
      target: 'toks',
      targetHandle: 'in',
      label: '1 message → n tokens',
      animated: tokenizing,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: tokenizing ? { stroke: amber, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'detokenize',
      source: 'toks',
      sourceHandle: 'fold',
      target: 'msgs',
      targetHandle: 'recv',
      label: 'n tokens → 1 message',
      animated: folding,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: folding ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'context',
      source: 'toks',
      sourceHandle: 'ctx',
      target: 'llm',
      targetHandle: 'ctxin',
      label: 'context',
      animated: generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: generating ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'emit',
      source: 'llm',
      sourceHandle: 'emit',
      target: 'toks',
      targetHandle: 'gen',
      label: 'next token',
      animated: generating,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: generating ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'exec',
      source: 'toks',
      sourceHandle: 'exec',
      target: 'cpu',
      label: 'assistant tokens',
      animated: cpuActive,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: cpuActive ? { stroke: violet, strokeWidth: 1.5 } : undefined,
    },
    {
      id: 'fx',
      source: 'cpu',
      sourceHandle: 'fx',
      target: 'display',
      label: 'effects',
      animated: cpuActive,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: cpuActive ? { stroke: emerald, strokeWidth: 1.5 } : undefined,
    },
  ]

  const phaseLabel =
    sim.phase === 'idle'
      ? 'idle — send a message'
      : sim.phase === 'tokenizing'
        ? 'tokenizing'
        : sim.phase === 'generating'
          ? 'generating'
          : 'folding reply'

  return (
    <DemoFrame
      title="Messages to tokens — and back"
      hint={
        <>
          Send a message and watch it tokenize down into the one token sequence, tagged with its
          message (<span className="font-mono text-xs">m0</span>,{' '}
          <span className="font-mono text-xs">m1</span>, …). The LLM reads that whole sequence as
          context and appends its reply one token at a time — the same stream holds both roles —
          then the reply folds back up into a message. Meanwhile the assistant&rsquo;s tokens stream
          on into CPU flows, and the display does what it always did.
        </>
      }
    >
      <DemoCanvas
        className="h-112"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.1 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.text}
            onClick={() => send(chip)}
            disabled={sim.phase !== 'idle'}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
          >
            <ChatBubbleLeftRightIcon className="size-4" /> {chip.text}
          </button>
        ))}
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5"
        >
          <ArrowPathIcon className="size-4" /> Reset
        </button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {phaseLabel} · {sim.msgs.length} msgs · {sim.toks.length} toks
        </span>
      </div>
    </DemoFrame>
  )
}
