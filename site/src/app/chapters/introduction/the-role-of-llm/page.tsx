import type { Metadata } from 'next'
import { SectionShell } from '@/components/site/section-shell'
import { P } from '@/components/site/prose'
import { WidgetBoundary } from '@/components/site/widget-boundary'
import { LlmMapWidget } from '@/components/site/flow/llm-map'
import { LlmChatWidget } from '@/components/site/flow/llm-chat'
import { LlmFilesWidget } from '@/components/site/flow/llm-files'
import { LlmExternalWidget } from '@/components/site/flow/llm-external'

export const metadata: Metadata = { title: 'The Role of LLM' }

export default function Page() {
  return (
    <SectionShell slug="the-role-of-llm">
      <P>
        The second role works at a higher altitude. It emits tokens, and each token expands into
        a whole span of opcodes below. Two streams, two clocks, one mapping between them:
      </P>

      <WidgetBoundary>
        <LlmMapWidget />
      </WidgetBoundary>

      <P>Conversation is the same mapping run both ways:</P>

      <WidgetBoundary>
        <LlmChatWidget />
      </WidgetBoundary>

      <P>Code and prose turn out to be two ways of authoring the same stream, with very different guarantees:</P>

      <WidgetBoundary>
        <LlmFilesWidget />
      </WidgetBoundary>

      <P>And they read the outside world differently, too:</P>

      <WidgetBoundary>
        <LlmExternalWidget />
      </WidgetBoundary>
    </SectionShell>
  )
}
