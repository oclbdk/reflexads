import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { EngineerLoopDemo } from '@/components/site/demos/engineer-loop'
import { EngineerOrientDemo } from '@/components/site/demos/engineer-orient'
import { EngineerSteerDemo } from '@/components/site/demos/engineer-steer'
import { EngineerConditionDemo } from '@/components/site/demos/engineer-condition'

export const metadata: Metadata = { title: 'The Role of Engineer' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-engineer">
      <P>
        The third role is the slowest stream of all: decisions. It writes what the other two run,
        and it closes its loop the only way it can, by looking at the display:
      </P>

      <DemoBoundary>
        <EngineerLoopDemo />
      </DemoBoundary>

      <P>Its real lever is choosing where to point its attention. Every choice ends up in the same place:</P>

      <DemoBoundary>
        <EngineerOrientDemo />
      </DemoBoundary>

      <P>And influence loops. Outputs can condition the outputs that come after them:</P>

      <DemoBoundary>
        <EngineerSteerDemo />
      </DemoBoundary>

      <P>
        Taken to its logical end, every file that conditions the system has two hands on it, and
        both write through the same stream:
      </P>

      <DemoBoundary>
        <EngineerConditionDemo />
      </DemoBoundary>
    </SectionShell>
  )
}
