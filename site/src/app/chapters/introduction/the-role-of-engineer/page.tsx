import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { WidgetBoundary } from '@/components/site/widget-boundary'
import { EngineerLoopWidget } from '@/components/site/flow/engineer-loop'
import { EngineerOrientWidget } from '@/components/site/flow/engineer-orient'
import { EngineerSteerWidget } from '@/components/site/flow/engineer-steer'
import { EngineerConditionWidget } from '@/components/site/flow/engineer-condition'

export const metadata: Metadata = { title: 'The Role of Engineer' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-engineer">
      <P>
        The third role is the slowest stream of all: decisions. It writes what the other two run,
        and it closes its loop the only way it can, by looking at the display:
      </P>

      <WidgetBoundary>
        <EngineerLoopWidget />
      </WidgetBoundary>

      <P>Its real lever is choosing where to point its attention. Every choice ends up in the same place:</P>

      <WidgetBoundary>
        <EngineerOrientWidget />
      </WidgetBoundary>

      <P>And influence loops. Outputs can condition the outputs that come after them:</P>

      <WidgetBoundary>
        <EngineerSteerWidget />
      </WidgetBoundary>

      <P>
        Taken to its logical end, every file that conditions the system has two hands on it, and
        both write through the same stream:
      </P>

      <WidgetBoundary>
        <EngineerConditionWidget />
      </WidgetBoundary>
    </SectionShell>
  )
}
