import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionShell } from '@/components/site/section-shell'
import { CodeCard } from '@/components/site/code-card'
import { P, Term } from '@/components/site/prose'
import { WidgetBoundary } from '@/components/site/widget-boundary'
import { ReflexadShapeWidget } from '@/components/site/flow/reflexad-shape'
import { ReflexadFoldWidget } from '@/components/site/flow/reflexad-fold'
import { ReflexadPairWidget } from '@/components/site/flow/reflexad-pair'
import { ReflexadCareWidget } from '@/components/site/flow/reflexad-care'
import { ReflexadYouWidget } from '@/components/site/flow/reflexad-you'

export const metadata: Metadata = { title: 'The Reflexadic Form' }

export default function Page() {
  return (
    <SectionShell slug="the-reflexadic-form">
      <P>
        By now you may have noticed that all three roles have the same shape. Here it is at three
        scales, braided into one sequence:
      </P>

      <WidgetBoundary>
        <ReflexadShapeWidget />
      </WidgetBoundary>

      <P>
        A monad only ever extends. The <Term>reflex</Term>{' '}is the move it&rsquo;s missing, and
        here it&rsquo;s in your hands:
      </P>

      <WidgetBoundary>
        <ReflexadFoldWidget />
      </WidgetBoundary>

      <P>Two systems that can&rsquo;t see each other get exactly one bridge, and it&rsquo;s the reflexive controller:</P>

      <WidgetBoundary>
        <ReflexadPairWidget />
      </WidgetBoundary>

      <P>A controller is itself a system, though, with loops of its own to keep alive:</P>

      <WidgetBoundary>
        <ReflexadCareWidget />
      </WidgetBoundary>

      <P>And the widest instance of the shape is the one happening right now:</P>

      <WidgetBoundary>
        <ReflexadYouWidget />
      </WidgetBoundary>

      <P>
        So here&rsquo;s the ownership model, stated as plainly as we can. Every interaction
        belongs to exactly one owned scope, a role&rsquo;s stream, and it executes in whatever
        context that stream has accumulated. Influence has one mechanism only: an interaction lands
        in a context that some later interaction reads. A file conditions what a model generates;
        the generation conditions what the processor executes; what executes conditions what the
        engineer observes; and the observation conditions the next decision. Each of those
        hand-offs is itself an interaction in some owned stream. A <Term>monad</Term>{' '}is one such
        scope. A <Term>reflexad</Term>{' '}is the whole thing: one composite stream whose accumulated
        context contains the very sources producing it. That&rsquo;s how a harness&rsquo;s
        interactions come to influence its own later behavior, and it&rsquo;s why the record of
        them is always enough to trace it.
      </P>

      <CodeCard
        module="Chapter01"
        tag="reflexad"
        caption="The spec — a reflexad is a monad, its two reflexive operations named out front. Hold us to it."
      />

      <P>
        Go back to{' '}
        <Link
          href="/chapters/introduction/the-ai-harness-system/"
          className="font-medium text-reflex-600 hover:text-reflex-700 dark:text-reflex-500"
        >
          the first page
        </Link>{' '}
        and press the button again. This time you know what happens.
      </P>
    </SectionShell>
  )
}
