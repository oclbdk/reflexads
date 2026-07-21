import type { Metadata } from 'next'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'The Agda library' }

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="border-b border-zinc-950/5 pb-8 dark:border-white/10">
        <h1 className="text-3xl/10 font-semibold tracking-tight text-zinc-950 dark:text-white">
          The Agda library
        </h1>
        <Lead>
          Every code card on this site is quoted <Em>live</Em> from the machine-checked Agda
          sources — the same tagged regions the printed book quotes, extracted at build time so the
          site can never drift from what type-checks.
        </Lead>
      </header>

      <div className="pt-4">
        <H2>Not a proof of correctness</H2>
        <P>
          The Agda is not here to certify that any claim is true. It holds the reasoning to a
          consistent line as it develops, and fixes what each word means precisely enough that later
          chapters lean on the same definitions. Each chapter has a companion module; most are
          self-contained by design, redefining everything they use, so a chapter reads on its own.
        </P>

        <H2>Quoted from source</H2>
        <P>
          A region between <InlineCode>-- &gt;&gt;&gt; tag</InlineCode> and{' '}
          <InlineCode>-- &lt;&lt;&lt; tag</InlineCode> markers in a module is pulled verbatim into
          the page. Here is the reflexad, the whole stack brought together over one shared ground:
        </P>

        <CodeCard module="Chapter06" tag="holds" caption="Chapter06.agda — the buffer settles in one flush." />

        <H2>Building it yourself</H2>
        <P>
          The library type-checks with Agda 2.8, and the book compiles with{' '}
          <InlineCode>make book</InlineCode>. The site&rsquo;s extractor re-reads the same files, so
          editing an Agda source and rebuilding updates both the PDF and this site from one source
          of truth.
        </P>
      </div>
    </div>
  )
}
