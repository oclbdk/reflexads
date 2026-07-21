import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { WidgetFrame } from '@/components/site/widget-frame'
import { CrdtWidget } from '@/components/site/widgets/crdt'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Buffering Itself' }

export default function Page() {
  return (
    <ChapterShell slug="buffering-itself">
      <Lead>
        Strip each face to the ground and it is a single move: the owning face <Em>combines</Em> two
        stretches into one; the hosting face <Em>duplicates</Em> one into a pair. Compose them and
        you get a <Em>split idempotent</Em> — a retract.
      </Lead>

      <CodeCard module="Chapter06" tag="split" caption="buffer = copy ∘ merge, factoring through the flat ground." />

      <H2>One flush into the flat</H2>
      <P>
        Read the split as one thing: a <Em>buffer</Em>. Over a band it settles in a single flush and
        holds — both faces tamed together, in the same step. That flat retract, reached and held, is
        the still point Chapter 1 promised, now for the whole structure.
      </P>

      <CodeCard module="Chapter06" tag="coincide" caption="Three self-properties, one condition on the ground." />

      <P>
        The reflexad self-buffers if and only if its flexad self-hosts if and only if its reflad
        self-selects — because all three are <InlineCode>x ∙ x = x</InlineCode>, read from three
        sides. Six chapters fold into one equation about how two interactions compose.
      </P>

      <H2>CRDTs, exactly</H2>
      <P>
        Read the halves as distributed operations: <InlineCode>copy</InlineCode> is replication,{' '}
        <InlineCode>merge</InlineCode> is reconciliation. Then <InlineCode>merge ∘ copy = id</InlineCode>{' '}
        — replicate a state and reconcile it back and nothing changes — is a conflict-free
        type&rsquo;s whole guarantee. To build one, you do not orchestrate the replicas; you make the
        merge reconcile onto a shared ground and make it idempotent. Convergence becomes a property
        of the structure, not the schedule.
      </P>

      <WidgetFrame
        title="A grow-only set converges"
        hint="Add elements to either replica, gossip in either direction, re-deliver a message to itself — duplicates and order never break it, and both replicas land on the same ground."
      >
        <CrdtWidget />
      </WidgetFrame>

      <P>
        One honest line of scope: a <Em>classic</Em> CRDT, where any schedule reaches the same
        value, needs the band commutative. The general non-commutative band buffers just as safely
        against duplication but stays order-sensitive — a last-writer-wins register rather than a
        grow-only set. Idempotence buys duplicate-safety; commutativity on top buys
        schedule-independence.
      </P>
    </ChapterShell>
  )
}
