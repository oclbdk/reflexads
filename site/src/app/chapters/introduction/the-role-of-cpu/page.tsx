import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { CpuRoleDemo } from '@/components/site/demos/cpu-role'
import { CpuLoopDemo } from '@/components/site/demos/cpu-loop'
import { CpuSystemDemo } from '@/components/site/demos/cpu-system'
import { CpuConfigDemo } from '@/components/site/demos/cpu-config'

export const metadata: Metadata = { title: 'The Role of CPU' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-cpu">
      <P>
        The first of the harness&rsquo;s three roles. A CPU eats one stream of opcodes, one at a
        time, and everything it ever does is reachable through that stream. Its most visible effect
        is a display:
      </P>

      <DemoBoundary>
        <CpuRoleDemo />
      </DemoBoundary>

      <P>Input doesn&rsquo;t get to skip the stream. It has to enter it, on the stream&rsquo;s own schedule:</P>

      <DemoBoundary>
        <CpuLoopDemo />
      </DemoBoundary>

      <P>Parallel hardware and persistent storage go through it too:</P>

      <DemoBoundary>
        <CpuSystemDemo />
      </DemoBoundary>

      <P>Even application state lives behind it, and can steer the whole loop:</P>

      <DemoBoundary>
        <CpuConfigDemo />
      </DemoBoundary>
    </SectionShell>
  )
}
