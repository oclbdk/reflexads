import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { HookTangleDemo } from '@/components/site/demos/hook-tangle'

export const metadata: Metadata = { title: 'Interactions as Sequences' }

export default function Page() {
  return (
    <SectionShell slug="interactions-as-sequences">
      <P>
        The pixel was the polite version. Under the hood, a press kicks off work in half a dozen
        places at once (input handling, state updates, rendering, network calls, timers), and each
        of those runs at its own pace. All of it gets serialized into one record:
      </P>

      <DemoBoundary>
        <HookTangleDemo />
      </DemoBoundary>

      <P>
        A few quick presses and you have hundreds of units, badly interleaved: effects of the
        first press landing after causes of the third. When something breaks in a system like
        this, that merged record is usually all you get.
      </P>
    </SectionShell>
  )
}
