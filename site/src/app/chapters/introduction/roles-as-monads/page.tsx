import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { CodeCard } from '@/components/site/code-card'
import { P, Em, Term } from '@/components/site/prose'
import { WidgetBoundary } from '@/components/site/widget-boundary'
import { HookMonadWidget } from '@/components/site/flow/hook-monad'

export const metadata: Metadata = { title: 'Roles as Monads' }

export default function Page() {
  return (
    <SectionShell slug="roles-as-monads">
      <P>
        The way to get anything useful out of a record like that is to project it: pick one role
        and read only its units, in their own order. We model each of those views as a{' '}
        <Term>monad</Term>. Rather than argue for the word up front, it&rsquo;s easier to watch
        what it buys:
      </P>

      <WidgetBoundary>
        <HookMonadWidget />
      </WidgetBoundary>

      <P>
        Each view replays cleanly. Every unit lands in whatever context the earlier units built,
        and the view by itself is enough to rebuild that role&rsquo;s state, including the request
        that&rsquo;s still in flight. That&rsquo;s all we&rsquo;ll make &ldquo;monad&rdquo; mean
        here. The spec is what keeps us honest about it:
      </P>

      <CodeCard
        module="Chapter01"
        tag="monad"
        caption="The spec — what this page means, exactly, by monad. Hold us to it."
      />

      <P>
        A note on usage: we use &ldquo;monad&rdquo; loosely, as a name for an{' '}
        <Em>interpretive context</Em>{' '}that units compose within. The formal definition above is a
        reference, not a prerequisite. It pins down the laws we&rsquo;re taking for granted, so if
        we&rsquo;re ever ambiguous, there&rsquo;s a fixed place to settle what we meant.
      </P>
    </SectionShell>
  )
}
