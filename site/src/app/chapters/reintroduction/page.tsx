import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Reintroduction' }

export default function Page() {
  return (
    <ChapterShell slug="reintroduction">
      <Lead>
        Read the flat space computationally and it has a familiar shape: an <Em>instruction
        sequence</Em>. Regrounding a tangled loop flat is what compiling it means, and the flat space
        it lands on is the code.
      </Lead>

      <H2>Instructions and prompts</H2>
      <P>
        An instruction acts on a machine&rsquo;s state; a <Em>prompt</Em> acts on a model&rsquo;s
        context. Both are contextualized interactions over a ground; both compose into a program;
        both fold each result back in. One stream executed by silicon, the other by a model — the
        same shape underneath.
      </P>

      <H2>The sequence keeps time</H2>
      <P>
        So where is time? Not in the loop. The reflexad is a fixed shape that holds itself up; the
        clock is the <Em>sequence</Em>, the counter that advances. A cycle is a relation — if it
        holds itself up it is done — and what moves is the ordered stream beneath it. Data flows; the
        loop stays still; the sequence keeps time.
      </P>

      <H2>The stream is the anchor</H2>
      <P>
        This last module is the first that is not self-contained, on purpose: it imports Chapter 6
        untouched and lays an ordering over its ground, two clean layers that interlock without
        either reaching into the other.
      </P>

      <CodeCard module="Chapter07" tag="interlock" caption="The clock is defined on the very operation the buffer already uses." />

      <P>
        The stream is where a machine&rsquo;s causal order becomes synchronizable with human-run
        systems — code review, logs, audit trails — because a sequence is the one form both a
        processor and a person can share and be held accountable to. But that anchoring is not
        continuous: what a person gets is a <Em>window</Em>, a bounded span where the machine&rsquo;s
        order lines up, for a while, with something a human can interpret.
      </P>

    </ChapterShell>
  )
}
