import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { LlmMapDemo } from '@/components/site/demos/llm-map'
import { LlmChatDemo } from '@/components/site/demos/llm-chat'
import { LlmFilesDemo } from '@/components/site/demos/llm-files'
import { LlmExternalDemo } from '@/components/site/demos/llm-external'

export const metadata: Metadata = { title: 'The Role of LLM' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-llm">
      <P>
        The second role works at a higher altitude. It emits tokens, and each token expands into
        a whole span of opcodes below. Two streams, two clocks, one mapping between them:
      </P>

      <DemoBoundary>
        <LlmMapDemo />
      </DemoBoundary>

      <P>Conversation is the same mapping run both ways:</P>

      <DemoBoundary>
        <LlmChatDemo />
      </DemoBoundary>

      <P>Code and prose turn out to be two ways of authoring the same stream, with very different guarantees:</P>

      <DemoBoundary>
        <LlmFilesDemo />
      </DemoBoundary>

      <P>And they read the outside world differently, too:</P>

      <DemoBoundary>
        <LlmExternalDemo />
      </DemoBoundary>
    </SectionShell>
  )
}
