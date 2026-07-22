'use client'

import { useEffect, useRef, useState } from 'react'
import { loadStream, type YouEvent } from '@/lib/you-stream'
import { Handle, Position } from '@xyflow/react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import { DemoCanvas } from './demo-canvas'
import { Unit } from '../prose'
import { Em, DemoFrame } from '../demo-frame'

// The Role of You — the component architecture of the AI harness system this
// documentation specifies, as a demo. Center: the artifact
// (prose, code, data). Around it: the three roles that consume it. Attaching
// a "YOU" tag is the system's ownership model: it instantiates a reader at
// a role and traces that role's stream — its interactions with the artifact
// and the propagation of its effects along the edges the role owns. The
// technical point: the interaction web is asymmetric (units, clocks, media,
// directions all differ), yet every owned scope is a coherent sequential
// stream whose units execute in the context of their prefix — a monad; and
// when owned scopes propagate back into the conditions that produce them, a
// reflexad. That is why these shapes fit this reasoning.

type RoleKey = 'eng' | 'llm' | 'cpu'
type ReadUnit = { label: string; t: number }
type TaggedUnit = ReadUnit & { role: RoleKey }

const STORE_MAX = 240
const STORE_TRIM = 160

const ROLE_META: Record<
  RoleKey,
  {
    title: string
    tag: string
    clock: string
    verb: string
    bounds: string
    text: string
    ring: string
    chipBg: string
    youBg: string
    stroke: string
  }
> = {
  eng: {
    title: 'Engineer',
    tag: 'e',
    clock: '~seconds',
    verb: 'reads it as an explanation',
    bounds: 'this session · this scroll · your prior knowledge',
    text: 'text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-400/80',
    chipBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
    youBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    stroke: 'oklch(0.777 0.152 181.912)',
  },
  llm: {
    title: 'LLM',
    tag: 'l',
    clock: '~100 ms/token',
    verb: 'ingests it as context',
    bounds: 'this page as one window · reads its whole prefix',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-400/80',
    chipBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    youBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    stroke: 'oklch(0.702 0.183 293.541)',
  },
  cpu: {
    title: 'CPU',
    tag: 'c',
    clock: '~ns/op',
    verb: 'executes it as a program',
    bounds: 'this tab · this process · right now',
    text: 'text-reflex-600 dark:text-reflex-500',
    ring: 'ring-reflex-500/80',
    chipBg: 'bg-reflex-500/10 text-reflex-700 dark:text-reflex-500',
    youBg: 'bg-reflex-500/15 text-reflex-600 dark:text-reflex-500',
    stroke: 'oklch(0.58 0.082 48)',
  },
}
const ROLE_KEYS: RoleKey[] = ['eng', 'llm', 'cpu']

function capped(units: ReadUnit[]): ReadUnit[] {
  return units.length > STORE_MAX ? units.slice(-STORE_TRIM) : units
}

// ---- custom nodes -------------------------------------------------------

function DocNode({ data }: NodeProps) {
  const { attached } = data as { attached: RoleKey[] }
  return (
    <div className="w-56 rounded-lg bg-white p-2 text-center shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        This documentation
      </div>
      <div className="mt-1 flex justify-center gap-1.5">
        <span className="rounded-md bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-400">
          prose
        </span>
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">
          code
        </span>
        <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-400">
          data
        </span>
      </div>
      <div className="mt-1.5 flex min-h-5 items-center justify-center gap-1">
        {attached.length > 0 ? (
          attached.map((r) => (
            <span
              key={r}
              className={clsx('rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold', ROLE_META[r].youBg)}
            >
              YOU·{ROLE_META[r].tag}
            </span>
          ))
        ) : (
          <span className="font-mono text-[9px] text-zinc-300 dark:text-zinc-600">no “YOU” tags attached</span>
        )}
      </div>
      <div className="mt-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        one artifact, {attached.length} “YOU” tag{attached.length === 1 ? '' : 's'} attached —
        tracking those influences; the views commute: the source never changes, only the sequencing
      </div>
      <Handle id="toEng" type="source" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="toLlm" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="toCpu" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="authored" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

function RoleNode({ data }: NodeProps) {
  const { role, active, onToggle } = data as {
    role: RoleKey
    active: boolean
    onToggle: (r: RoleKey) => void
  }
  const meta = ROLE_META[role]
  return (
    <button
      onClick={() => onToggle(role)}
      data-you-skip
      className={clsx(
        'w-52 cursor-pointer rounded-lg bg-white p-2 text-left shadow-sm ring-1 transition-shadow dark:bg-zinc-900',
        active ? clsx('ring-2', meta.ring) : 'ring-zinc-950/10 hover:ring-zinc-950/30 dark:ring-white/10 dark:hover:ring-white/30',
      )}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className={clsx('text-[10px]/4 font-semibold tracking-wide uppercase', meta.text)}>
          {meta.title}
        </span>
        <span className="flex items-baseline gap-1.5">
          {active && (
            <span className={clsx('rounded-sm px-1 font-mono text-[9px] font-semibold', meta.youBg)}>
              YOU·{meta.tag}
            </span>
          )}
          <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">{meta.clock}</span>
        </span>
      </div>
      <div className="mt-1 truncate rounded-md bg-zinc-100 px-2 py-1 text-center font-mono text-[10px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        {meta.verb}
      </div>
      <div
        className={clsx(
          'mt-1 truncate px-1 text-center font-mono text-[9px]/4',
          active ? meta.text : 'text-zinc-300 dark:text-zinc-600',
        )}
      >
        {active ? `You := ${meta.title} · ${meta.bounds}` : 'untracked — attach a “YOU” tag to track its influence'}
      </div>
      <Handle type="target" position={role === 'eng' ? Position.Right : role === 'llm' ? Position.Left : Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      <Handle id="out" type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      {role === 'eng' && (
        <Handle id="authors" type="source" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      )}
      {role === 'llm' && (
        <Handle id="expands" type="source" position={Position.Bottom} style={{ left: '70%' }} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      )}
      {role === 'cpu' && (
        <Handle id="domain" type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
      )}
    </button>
  )
}

function ReadingNode({ data }: NodeProps) {
  const { units, activeCount } = data as { units: TaggedUnit[]; activeCount: number }
  const counts: Record<RoleKey, number> = { eng: 0, llm: 0, cpu: 0 }
  for (const u of units) counts[u.role]++
  // Consecutive units from one scope form a run, and long runs compress to a
  // counter — so every attached thread stays visible in the braid no matter
  // how fast one stream emits relative to the others.
  const groups: { role: RoleKey; units: TaggedUnit[] }[] = []
  for (const u of units.slice(-160)) {
    const g = groups[groups.length - 1]
    if (g && g.role === u.role) g.units.push(u)
    else groups.push({ role: u.role, units: [u] })
  }
  const shown = groups.slice(-16)
  return (
    <div className="w-[600px] rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between px-0.5 pb-2">
        <span className="text-[10px]/4 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          The tracked influences
        </span>
        <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
          {units.length} units — <span className={ROLE_META.eng.text}>e {counts.eng}</span> ·{' '}
          <span className={ROLE_META.llm.text}>l {counts.llm}</span> ·{' '}
          <span className={ROLE_META.cpu.text}>c {counts.cpu}</span>
        </span>
      </div>
      <div className="flex min-h-12 flex-wrap content-start gap-1">
        {shown.flatMap((g, gi) => {
          const meta = ROLE_META[g.role]
          const head = g.units.slice(0, 2)
          const rest = g.units.length - head.length
          return [
            ...head.map((u, i) => (
              <span
                key={`${gi}-${i}`}
                className={clsx('max-w-44 truncate rounded-sm px-1 py-0.5 font-mono text-[9px]/3', meta.chipBg)}
              >
                {meta.tag}· {u.label}
              </span>
            )),
            ...(rest > 0
              ? [
                  <span
                    key={`${gi}-more`}
                    className={clsx('rounded-sm px-1 py-0.5 font-mono text-[9px]/3 opacity-70', meta.chipBg)}
                  >
                    {meta.tag}·⋯×{rest}
                  </span>,
                ]
              : []),
          ]
        })}
        {units.length === 0 && (
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
            {activeCount === 0
              ? 'nothing tracked — attach a “YOU” tag to a role'
              : 'scroll, press, read — the tracked influences land here, merged in time'}
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-zinc-950/5 pt-1.5 font-mono text-[10px]/4 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        one sequence, merged in time; runs from one scope compress to ⋯×n so every thread stays
        visible — detach a tag and its thread leaves the braid; re-attach and it returns
      </div>
      <Handle id="in" type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

type Econ = { a: number; b: number; g: number }

function DomainNode({ data }: NodeProps) {
  const { econ } = data as { econ: Econ }
  const bar = (label: string, v: number) => (
    <div className="flex items-center gap-1.5">
      <span className="w-4 shrink-0 text-left font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            v > 30 ? 'bg-emerald-400' : 'bg-rose-400',
          )}
          style={{ width: `${Math.round(v)}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[9px] text-zinc-400 tabular-nums dark:text-zinc-500">
        {Math.round(v)}
      </span>
    </div>
  )
  return (
    <div className="w-52 rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="px-1 text-[10px]/4 font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
        Application domain
      </div>
      <div className="px-1 font-mono text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        abstract resource economy
      </div>
      <div className="mt-1.5 space-y-1">
        {bar('α', econ.a)}
        {bar('β', econ.b)}
        {bar('γ', econ.g)}
      </div>
      <div className="mt-1 px-1 text-[9px]/4 text-zinc-400 dark:text-zinc-500">
        the operand under operational maintenance: CPU output lands here as resource flows,
        consumption never stops — substitute any concrete domain at this extension point
      </div>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-zinc-300 dark:!bg-zinc-600" />
    </div>
  )
}

const nodeTypes = {
  youDoc: DocNode,
  youRole: RoleNode,
  youReading: ReadingNode,
  youDomain: DomainNode,
}

// ---- the demo ---------------------------------------------------------

export function ReflexadYouDemo() {
  const [active, setActive] = useState<Record<RoleKey, boolean>>({ eng: true, llm: false, cpu: false })
  const [engUnits, setEngUnits] = useState<ReadUnit[]>([])
  const [cpuUnits, setCpuUnits] = useState<ReadUnit[]>([])
  const [llmUnits, setLlmUnits] = useState<ReadUnit[]>([])
  const [econ, setEcon] = useState<Econ>({ a: 70, b: 70, g: 70 })
  const econIdx = useRef(0)
  const llmTokens = useRef<string[] | null>(null)
  const llmIdx = useRef(0)

  // The application domain runs regardless of what is tracked: execution
  // replenishes it (the page never stops running), consumption drains it.
  // Attaching YOU tags observes influence; it does not power the domain.
  useEffect(() => {
    const keys: (keyof Econ)[] = ['a', 'b', 'g']
    const pulse = setInterval(() => {
      const k = keys[econIdx.current++ % 3]
      setEcon((e) => ({ ...e, [k]: Math.min(100, e[k] + 3) }))
    }, 800)
    const drain = setInterval(() => {
      setEcon((e) => ({
        a: Math.max(0, e.a - 1.1),
        b: Math.max(0, e.b - 1.1),
        g: Math.max(0, e.g - 1.1),
      }))
    }, 1000)
    return () => {
      clearInterval(pulse)
      clearInterval(drain)
    }
  }, [])

  // Engineer scope (real): the session's You-stream — every page visit and
  // button press recorded across the chapter's subpages, not just this one.
  // CPU scope derives from the same real events, expanded to op-spans.
  useEffect(() => {
    const cpuSpan = (e: YouEvent): ReadUnit[] => [
      { label: `EVT click "${e.label.slice(0, 12)}"`, t: e.t },
      { label: 'DISPATCH setState', t: e.t + 1 },
      { label: 'RENDER commit', t: e.t + 2 },
    ]
    const seed = loadStream()
    const eng: ReadUnit[] = []
    const cpu: ReadUnit[] = []
    for (const e of seed) {
      if (e.kind === 'read') eng.push({ label: e.label, t: e.t })
      else {
        eng.push({ label: `press: ${e.label}`, t: e.t })
        cpu.push(...cpuSpan(e))
      }
    }
    setEngUnits(capped(eng))
    setCpuUnits(capped(cpu))
    const onEvent = (ev: Event) => {
      const e = (ev as CustomEvent).detail as YouEvent
      if (e.kind === 'read') {
        setEngUnits((u) => capped([...u, { label: e.label, t: e.t }]))
        return
      }
      setEngUnits((u) => capped([...u, { label: `press: ${e.label}`, t: e.t }]))
      setCpuUnits((u) => capped([...u, ...cpuSpan(e)]))
      const k = (['a', 'b', 'g'] as (keyof Econ)[])[econIdx.current++ % 3]
      setEcon((ec) => ({ ...ec, [k]: Math.min(100, ec[k] + 5) }))
    }
    window.addEventListener('you-stream', onEvent)
    return () => window.removeEventListener('you-stream', onEvent)
  }, [])

  // LLM scope (real content): the page's actual text — headings, then the
  // Agda that defines the reflexad — streams while the scope is attached.
  useEffect(() => {
    if (!active.llm) return
    if (llmTokens.current === null) {
      const headings = [...document.querySelectorAll('h1, h2')].map((h) => h.textContent ?? '')
      const agda = [...document.querySelectorAll('pre')]
        .map((p) => p.textContent ?? '')
        .find((t) => t.includes('Reflexad'))
      const text = [...headings, agda ?? ''].join(' ')
      llmTokens.current = text
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/^(\d)(?=[A-Z])/, ''))
        .slice(0, 160)
    }
    const t = setInterval(() => {
      const tokens = llmTokens.current!
      const i = llmIdx.current
      if (i >= tokens.length) return
      llmIdx.current = i + 1
      setLlmUnits((u) => capped([...u, { label: tokens[i], t: Date.now() }]))
    }, 130)
    return () => clearInterval(t)
  }, [active.llm])

  // CPU scope: the page really is executing while you read — a slow tick
  // keeps that visible while the scope is attached.
  useEffect(() => {
    if (!active.cpu) return
    const t = setInterval(() => {
      setCpuUnits((u) => capped([...u, { label: 'RAF tick · paint', t: Date.now() }]))
    }, 800)
    return () => clearInterval(t)
  }, [active.cpu])

  const toggle = (r: RoleKey) => setActive((a) => ({ ...a, [r]: !a[r] }))

  const streams: Record<RoleKey, ReadUnit[]> = { eng: engUnits, llm: llmUnits, cpu: cpuUnits }
  const attached = ROLE_KEYS.filter((r) => active[r])
  const braided: TaggedUnit[] = attached
    .flatMap((r) => streams[r].map((u) => ({ ...u, role: r })))
    .sort((a, b) => a.t - b.t)

  const nodes: Node[] = [
    { id: 'doc', type: 'youDoc', position: { x: 320, y: 60 }, data: { attached } },
    {
      id: 'eng',
      type: 'youRole',
      position: { x: 0, y: 70 },
      style: { pointerEvents: 'all' },
      data: { role: 'eng', active: active.eng, onToggle: toggle },
    },
    {
      id: 'llm',
      type: 'youRole',
      position: { x: 650, y: 70 },
      style: { pointerEvents: 'all' },
      data: { role: 'llm', active: active.llm, onToggle: toggle },
    },
    {
      id: 'cpu',
      type: 'youRole',
      position: { x: 325, y: 250 },
      style: { pointerEvents: 'all' },
      data: { role: 'cpu', active: active.cpu, onToggle: toggle },
    },
    {
      id: 'reading',
      type: 'youReading',
      position: { x: 130, y: 420 },
      data: { units: braided, activeCount: attached.length },
    },
    { id: 'domain', type: 'youDomain', position: { x: 650, y: 250 }, data: { econ } },
  ]

  const readEdge = (id: RoleKey, handle: string, label: string): Edge => ({
    id: `read-${id}`,
    source: 'doc',
    sourceHandle: handle,
    target: id,
    label,
    animated: active[id],
    labelStyle: { fontSize: 9 },
    labelBgStyle: { fillOpacity: 0 },
    style: active[id] ? { stroke: ROLE_META[id].stroke, strokeWidth: 1.5 } : { opacity: 0.3 },
  })
  const feedEdge = (id: RoleKey): Edge => ({
    id: `feed-${id}`,
    source: id,
    sourceHandle: 'out',
    target: 'reading',
    targetHandle: 'in',
    animated: active[id],
    style: active[id]
      ? { stroke: ROLE_META[id].stroke, strokeWidth: 1.5 }
      : { opacity: 0.12, strokeDasharray: '4 4' },
  })
  const edges: Edge[] = [
    readEdge('eng', 'toEng', 'as explanation'),
    readEdge('llm', 'toLlm', 'as context'),
    readEdge('cpu', 'toCpu', 'as executable'),
    // Propagation: an attached YOU flows along the edges its role owns.
    {
      id: 'authors',
      source: 'eng',
      sourceHandle: 'authors',
      target: 'doc',
      targetHandle: 'authored',
      label: 'authors',
      animated: active.eng,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: active.eng
        ? { stroke: ROLE_META.eng.stroke, strokeWidth: 1, strokeDasharray: '4 4' }
        : { opacity: 0.2, strokeDasharray: '4 4' },
    },
    {
      id: 'directs',
      source: 'eng',
      sourceHandle: 'out',
      target: 'llm',
      label: 'directs',
      animated: active.eng,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: active.eng
        ? { stroke: ROLE_META.eng.stroke, strokeWidth: 1, strokeDasharray: '4 4' }
        : { opacity: 0.2, strokeDasharray: '4 4' },
    },
    {
      id: 'expands',
      source: 'llm',
      sourceHandle: 'expands',
      target: 'cpu',
      label: 'expands',
      animated: active.llm,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: active.llm
        ? { stroke: ROLE_META.llm.stroke, strokeWidth: 1, strokeDasharray: '4 4' }
        : { opacity: 0.2, strokeDasharray: '4 4' },
    },
    feedEdge('eng'),
    feedEdge('llm'),
    feedEdge('cpu'),
    {
      id: 'operates',
      source: 'cpu',
      sourceHandle: 'domain',
      target: 'domain',
      label: 'operates',
      animated: true,
      labelStyle: { fontSize: 9 },
      labelBgStyle: { fillOpacity: 0 },
      style: { stroke: 'oklch(0.765 0.177 163.223)', strokeWidth: 1.5 },
    },
  ]

  return (
    <DemoFrame
      title="The Role of You"
      hint={
        <>
          <span className="block">
            This is the component architecture of the AI harness system this documentation
            specifies. In the center, the artifact itself: <Unit kind="prose" />, <Unit kind="code" />,{' '}
            <Unit kind="data" />. Around it, the three
            roles that consume it, each in its native medium at its native clock, with the
            CPU&rsquo;s output landing in an application domain (an abstract resource economy under
            the system&rsquo;s operational maintenance, and the extension point where a concrete
            domain plugs in).
          </span>
          <span className="mt-2 block">
            Attaching a <Em>&ldquo;YOU&rdquo; tag</Em>{' '}is the system&rsquo;s ownership model.
            It instantiates a reader at that role and traces that role&rsquo;s stream: every unit
            of its interaction with the artifact, plus the propagation of its effects along the
            edges the role owns (Engineer authors and directs, LLM expands, all three read). The
            traces are live. Engineer is your actual path through this chapter, every page visit
            and button press this session; LLM streams this page&rsquo;s text as context; CPU is
            this page executing.
          </span>
          <span className="mt-2 block">
            The technical point: this interaction web is <Em>asymmetric</Em>. Units, clocks, media,
            and edge directions all differ. Yet every owned scope is a coherent sequential stream
            whose units execute in the context of their prefix, and that shape is a monad. When
            owned scopes propagate back into the conditions producing them, as this page does, the
            shape is a reflexad; <code className="font-mono text-xs">own</code>, defined below, is
            its entry point.
          </span>
          <span className="mt-2 block">
            And if you pressed the button back at the start of this chapter, it&rsquo;s still in
            the Engineer trace as <code className="font-mono text-xs">press: the first press</code>,
            pages later.
          </span>
        </>
      }
    >
      <DemoCanvas
        className="h-160"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.07 }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2" data-you-skip>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">attach “YOU” tags:</span>
        {ROLE_KEYS.map((r) => (
          <button
            key={r}
            onClick={() => toggle(r)}
            className={clsx(
              'rounded-md px-2.5 py-1 font-mono text-xs ring-1 transition-colors',
              active[r]
                ? clsx('font-semibold ring-transparent', ROLE_META[r].chipBg)
                : 'text-zinc-400 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-500 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            {active[r] ? '✓ ' : ''}
            {ROLE_META[r].title}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          tracking: {attached.length > 0 ? attached.map((r) => ROLE_META[r].title).join(' + ') : '∅'} ·{' '}
          {braided.length} units
        </span>
      </div>
    </DemoFrame>
  )
}
