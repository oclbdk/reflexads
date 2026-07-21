import type { Metadata } from 'next'
import { ChapterShell } from '@/components/site/chapter-shell'
import { CodeCard } from '@/components/site/code-card'
import { H2, Lead, P, Em, InlineCode } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Contextualized Ownership' }

export default function Page() {
  return (
    <ChapterShell slug="contextualized-ownership">
      <Lead>
        You cannot reason about a structure owning its ground while the ground stays invisible. This
        chapter makes it concrete: the interaction space a reflexad composes over has a name and a
        shape all along — a <Em>monoid</Em>, which we call the <Em>Ground</Em>.
      </Lead>

      <H2>The ground was already there</H2>
      <P>
        The one promise you leaned on — regroup a chain however you like, the meaning survives — is{' '}
        <Em>associativity</Em>. The one thing you were never allowed to do — reorder — is the{' '}
        <Em>absence of commutativity</Em>. Add a unit to start from, and that is a monoid exactly:
        an interaction space that carries its own conditions.
      </P>

      <CodeCard module="Chapter02" tag="monoid" caption="The Ground: a monoid, elements and the conditions they obey." />


      <H2>The owning tower</H2>
      <P>
        We give these structures our own names. A <Em>Reflad</Em> is a monad seen as something that{' '}
        <Em>owns</Em>; a <Em>Ground</Em> wraps the monoid the same way; and a <Em>Reflexad</Em>{' '}
        stands a Reflad on a Ground it is parameterized by — every value paired with the ground
        accrued so far.
      </P>

      <CodeCard module="Chapter02" tag="reflad" caption="A Reflad: a monad, wearing its owning operations." />

      <H2>The conditions come from the ground</H2>
      <P>
        This pairing — a value beside the accrued ground — is the <Em>Writer</Em>. Ask where its
        coherence comes from and the answer is not an axiom it keeps: it is <Em>inherited</Em>. The
        reflad&rsquo;s associativity is nothing but the ground&rsquo;s associativity, handed up.
      </P>

      <CodeCard module="Chapter02" tag="inherited" caption="Coherence is sourced from the ground, not decreed from outside." />

      <P>
        That already says where a domain&rsquo;s invariants belong: not scattered across every call
        site, but concentrated once in the algebra of the ground, where everything built on it
        inherits them for free. Get the ground right and the coherence of all that stands on it is
        settled in one place. Nothing forces the ground to be <InlineCode>accumulated</InlineCode>,
        though — a structure could <Em>read</Em> it instead of writing it, which is the next chapter.
      </P>
    </ChapterShell>
  )
}
