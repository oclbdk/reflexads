import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Situated on Shared Ground' }

export default function Page() {
  return (
    <ChapterShell slug="situated-on-shared-ground">
      <Lead>
        Owning a ground is only half of the title. To <Em>host</Em> your conditions is to provide
        them — to be the place a value resides, held out to be read. That other stance is the exact
        mirror of the monad: a <Em>comonad</Em>.
      </Lead>

      <H2>The other stance</H2>
      <P>
        Where the monad puts a value in and accumulates, the comonad reads the value residing here
        and lays out the context around it. Its operations are the monad&rsquo;s, dualized — the
        same coherence, read backwards.
      </P>

      <CodeCard module="Chapter03" tag="comonad" caption="A comonad: the owning stance held up to a glass." />

      <H2>Hosting the ground</H2>
      <P>
        A <Em>Flexad</Em> wraps a comonad the way a Reflad wraps a monad, and hosts the same ground
        the Reflad wrote — indexed by position rather than accrued. Its co-associativity is, again,
        the ground&rsquo;s associativity handed up.
      </P>

      <CodeCard module="Chapter03" tag="flexad" caption="A Flexad: the hosting face, read and spread." />

      <H2>Owning and hosting, one ground</H2>
      <P>
        Bring both faces onto one Ground and the name comes apart: <Em>refl</Em> + <Em>flex</Em>,
        owning and hosting on a common ground. The loop is drawn — but not yet closed. The two share
        a ground without one consulting the other; forcing the hosting to hand back what the owning
        wrote is the next chapters&rsquo; work.
      </P>

      <CodeCard module="Chapter03" tag="reflexad" caption="Both faces, standing on one shared ground." />

    </ChapterShell>
  )
}
