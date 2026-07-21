import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { WidgetFrame } from '@/components/site/widget-frame'
import { SettleWidget } from '@/components/site/widgets/settle'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Holding Itself Up' }

export default function Page() {
  return (
    <ChapterShell slug="holding-itself-up">
      <Lead>
        Chapter 1 promised that some self-reference spirals and some holds itself up. Here is the
        difference, made precise: a hosting face <Em>settles</Em> when growing a level and
        regrounding it returns you exactly where you began — flat, in a single step.
      </Lead>

      <H2>Once, not eventually</H2>
      <P>
        A self-reference could <Em>converge</Em>: settle a little more each time, finished only in
        the limit, with a &ldquo;have we stabilized yet?&rdquo; test to run. One-step idempotence
        refuses the grind. Grow once, reground once, and you are done — and done for good, because
        doing it again moves nothing. Inside a sequence, that deletes the stall: reground once, and
        continue.
      </P>

      <CodeCard module="Chapter04" tag="selfhosting" caption="Self-hosting: the round trip with spread is the identity." />

      <H2>It comes from the ground</H2>
      <P>
        Where does the tolerance come from? The ground. Grow a host and reground it and one line of
        arithmetic says what returns — the host, read at each position <Em>composed with itself</Em>.
        So the round trip is the identity exactly when the ground is <Em>idempotent</Em>,{' '}
        <InlineCode>x ∙ x = x</InlineCode>.
      </P>

      <CodeCard module="Chapter04" tag="from-ground" caption="Self-hosting holds exactly when the ground is idempotent." />

      <P>
        An idempotent ground is a ground of interactions <Em>safe to repeat</Em> — which is why, in
        any system where the same thing may happen twice, you reach for operations built to be
        idempotent, and buy safety by construction rather than by hoping the duplicate never arrives.
      </P>

      <WidgetFrame
        title="Safe to repeat?"
        hint="Over an idempotent ground, consulting the context settles flat after one step and never moves again. Over one that compounds, every consult adds a level — the difference between a re-read you can trust and one you must count."
      >
        <SettleWidget />
      </WidgetFrame>
    </ChapterShell>
  )
}
