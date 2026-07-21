import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Introduction' }

export default function Page() {
  return (
    <ChapterShell slug="introduction">
      <Lead>
        Almost every program is one step after another — but &ldquo;after&rdquo; is quietly doing
        enormous work. The second line runs <Em>inside what the first left behind</Em>: the value it
        computed, the connection it opened, the error it may already be in.
      </Lead>

      <P>
        The moment you try to say precisely what such a sequence <Em>is</Em>, the definition bends
        back on itself. The context is made by the steps; the steps are defined against the context.
        Pin either down and it reaches for the other. That bend is not a mistake — it is the price
        of letting steps depend on the context they land in.
      </P>

      <H2>The cycle is only the symptom</H2>
      <P>
        The promise that resolves to another promise, the import that loops, the two services that
        each need the other first: these look like different problems, but they are one shape — parts
        each defined relative to a context the others produce. The interesting question was never
        &ldquo;is there a cycle.&rdquo; It is whether the structure that induced the cycle also
        carries what the cycle needs to stay standing.
      </P>

      <H2>The familiar case</H2>
      <P>
        A monad is one structure that does. It is built on exactly this self-reference — a context
        that can wrap another copy of itself, and flatten that nesting back to one layer — and it
        never spins out, because there is always a plain value to start from and every flatten winds
        the nesting <Em>down</Em>. That is why you regroup a chain of steps without checking it, yet
        never dream of reordering them.
      </P>

      <H2>The reflexad</H2>
      <P>
        We look at that same structure for what it <Em>is</Em>: a context that contextualizes
        itself and holds the rules for doing so. A monad held up that way — foregrounding the turn
        where it folds its own context back in — is what we call a <Em>reflexad</Em>.{' '}
        <InlineCode>own</InlineCode> takes a bare value as its own; <InlineCode>flatten</InlineCode>{' '}
        collapses a nested context to one layer. Nothing about the machinery changes.
      </P>

      <CodeCard module="Chapter01" tag="reflexad" caption="A reflexad is a monad, two operations named out front." />

      <P>
        The Agda here is not proving theorems. It holds our reasoning to a consistent line as it
        develops, and fixes what we mean precisely enough that later chapters can lean on the same
        words. That is the whole job it does throughout.
      </P>

    </ChapterShell>
  )
}
