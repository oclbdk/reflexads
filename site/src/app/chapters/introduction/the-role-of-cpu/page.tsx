import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { WidgetBoundary } from '@/components/site/widget-boundary'
import { CpuRoleWidget } from '@/components/site/flow/cpu-role'
import { CpuLoopWidget } from '@/components/site/flow/cpu-loop'
import { CpuSystemWidget } from '@/components/site/flow/cpu-system'
import { CpuConfigWidget } from '@/components/site/flow/cpu-config'

export const metadata: Metadata = { title: 'The Role of CPU' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-cpu">
      <P>
        The first of the harness&rsquo;s three roles. A CPU eats one stream of opcodes, one at a
        time, and everything it ever does is reachable through that stream. Its most visible effect
        is a display:
      </P>

      <WidgetBoundary>
        <CpuRoleWidget />
      </WidgetBoundary>

      <P>Input doesn&rsquo;t get to skip the stream. It has to enter it, on the stream&rsquo;s own schedule:</P>

      <WidgetBoundary>
        <CpuLoopWidget />
      </WidgetBoundary>

      <P>Parallel hardware and persistent storage go through it too:</P>

      <WidgetBoundary>
        <CpuSystemWidget />
      </WidgetBoundary>

      <P>Even application state lives behind it, and can steer the whole loop:</P>

      <WidgetBoundary>
        <CpuConfigWidget />
      </WidgetBoundary>
    </SectionShell>
  )
}
