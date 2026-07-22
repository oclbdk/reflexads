import { clsx } from 'clsx'

// Lightweight prose primitives tuned for the explainer's reading column.
// Deliberately hand-rolled (no typography plugin) so spacing and measure stay
// under our control and match the interactive cards sitting between paragraphs.

export function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-16 scroll-mt-24 text-xl/8 font-semibold tracking-tight text-zinc-950 first:mt-0 dark:text-white"
    >
      {children}
    </h2>
  )
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-lg/8 text-zinc-600 dark:text-zinc-300">{children}</p>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-base/7 text-zinc-700 dark:text-zinc-300">{children}</p>
}

export function Em({ children }: { children: React.ReactNode }) {
  return <em className="text-zinc-950 italic dark:text-white">{children}</em>
}

export function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-zinc-950 dark:text-white">{children}</strong>
}

// The three strata of an AI harness's material — code, prose, data — wear a
// fixed typographic identity wherever running text names them as units: mono,
// in the same colors their chips carry inside the diagrams (code amber, prose
// violet, data sky). Renders the canonical lowercase word, even mid-sentence.
const UNIT_COLOR = {
  code: 'text-amber-700 dark:text-amber-400',
  prose: 'text-violet-700 dark:text-violet-400',
  data: 'text-sky-700 dark:text-sky-400',
} as const

export function Unit({ kind }: { kind: keyof typeof UNIT_COLOR }) {
  return <span className={clsx('font-mono text-[0.9em] font-semibold', UNIT_COLOR[kind])}>{kind}</span>
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      className={clsx(
        'rounded-sm bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] text-zinc-800',
        'dark:bg-white/10 dark:text-zinc-200',
      )}
    >
      {children}
    </code>
  )
}
