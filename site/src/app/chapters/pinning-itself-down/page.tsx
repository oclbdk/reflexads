import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Pinning Itself Down' }

export default function Page() {
  return (
    <ChapterShell slug="pinning-itself-down">
      <Lead>
        Self-hosting was not special to hosting. Reflect every arrow and the owning face has had a
        dual property all along: <Em>self-selection</Em> — expand a value, collapse it back, and
        land exactly where you began.
      </Lead>

      <CodeCard module="Chapter05" tag="selfselecting" caption="Self-selection: flatten ∘ expand is the identity." />

      <H2>Where the mirror bends</H2>
      <P>
        The two say different things. Self-hosting buys <Em>re-consultation</Em>: sameness you can
        return to. Self-selection buys a <Em>constraint you can reason from</Em>: it holds the
        accumulated strain to an explicit, legible condition. Reading equates; writing constrains.
      </P>

      <H2>One condition, two faces</H2>
      <P>
        And yet they hold at the same time. Each face settles, by its canonical witness, if and only
        if the ground is idempotent — so the reading settles <Em>if and only if</Em> the writing
        does. They are one condition, read forward and read back.
      </P>

      <CodeCard module="Chapter05" tag="equivalence" caption="The Writer self-selects exactly when the ground is idempotent." />

      <P>
        The price is specific. Idempotence forgets <Em>multiplicity</Em> — a multiset becomes a set
        — while leaving order alone. So the self-properties are native to <Em>state</Em> and hostile
        to <Em>history</Em>. Ask whether your domain needs to <InlineCode>count</InlineCode>: if it
        only needs what is currently the case, model it as state and the idempotent merges, safe
        replays, and conflict-free convergence are yours. If it needs the tally, keep the log.
      </P>

    </ChapterShell>
  )
}
