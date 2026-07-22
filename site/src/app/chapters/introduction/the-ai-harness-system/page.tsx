import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P, Em, Term } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { HookPressDemo } from '@/components/site/demos/hook-press'

export const metadata: Metadata = { title: 'The AI Harness System' }

export default function Page() {
  return (
    <SectionShell slug="the-ai-harness-system">
      <P>
        <Em>What actually happens when you press a button?</Em>{' '}In an ordinary program that
        question has a boring answer. In an <Term>AI harness</Term>{' '}it doesn&rsquo;t, because the
        press doesn&rsquo;t just hit a processor: somewhere in the loop there&rsquo;s a language
        model, and behind both of them an engineer who set the whole thing up. Try it:
      </P>

      <DemoBoundary>
        <HookPressDemo />
      </DemoBoundary>

      <P>
        That&rsquo;s one press: a single unit, appended to a stream. Every idea in this chapter is
        built out of streams like that.
      </P>
    </SectionShell>
  )
}
