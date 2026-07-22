import type { Metadata } from 'next'
import Link from 'next/link'
import { ChapterShell } from '@/components/site/chapter-shell'
import { H2, P } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Situated on Shared Ground' }

// Chapter 3 — the many situated instances of this site's repo. Scaffold:
// section stubs only, built out one demo at a time and reworked as we go.
// Chapter 2 documented the one record and the scopes that write it; this
// chapter documents the hosts that hold it out to be read.

const sections = [
  { id: 'the-ai-harness-instance', title: 'The AI Harness Instance' },
  { id: 'conditions-on-shared-ground', title: 'Conditions on Shared Ground' },
  { id: 'hosts-as-comonads', title: 'Hosts as Comonads' },
  { id: 'the-host-of-files', title: 'The Host of Files' },
  { id: 'the-host-of-revisions', title: 'The Host of Revisions' },
  { id: 'the-host-of-releases', title: 'The Host of Releases' },
  { id: 'the-flexadic-form', title: 'The Flexadic Form' },
] as const

type SectionId = (typeof sections)[number]['id']

function SectionHeading({ id }: { id: SectionId }) {
  const index = sections.findIndex((s) => s.id === id)
  const section = sections[index]
  return (
    <H2 id={id}>
      <Link href={`#${id}`} className="group">
        <span className="mr-3 font-mono text-base text-zinc-400 tabular-nums group-hover:text-reflex-600 dark:text-zinc-500 dark:group-hover:text-reflex-500">
          3.{index + 1}
        </span>
        {section.title}
      </Link>
    </H2>
  )
}

function Contents() {
  return (
    <nav className="mt-8 rounded-xl bg-zinc-50 px-5 py-4 ring-1 ring-zinc-950/5 dark:bg-white/[0.03] dark:ring-white/10">
      <div className="text-xs/6 font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        In this chapter
      </div>
      <ol className="mt-1">
        {sections.map((s, i) => (
          <li key={s.id}>
            <Link
              href={`#${s.id}`}
              className="group flex items-baseline gap-3 py-0.5 text-sm/6 text-zinc-700 hover:text-reflex-600 dark:text-zinc-300 dark:hover:text-reflex-500"
            >
              <span className="w-6 shrink-0 text-right font-mono text-xs text-zinc-400 tabular-nums group-hover:text-reflex-600 dark:text-zinc-500 dark:group-hover:text-reflex-500">
                3.{i + 1}
              </span>
              {s.title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Stub({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-zinc-300 px-5 py-6 dark:border-zinc-700">
      <div className="text-xs/6 font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Placeholder
      </div>
      <p className="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">{children}</p>
    </div>
  )
}

export default function Page() {
  return (
    <ChapterShell slug="situated-on-shared-ground">
      <Contents />

      <SectionHeading id="the-ai-harness-instance" />
      <P>
        Chapter 2 documented the one record. This chapter documents its many situated copies: every
        clone is one, so is the runner that built this page, and so is the browser session reading
        it now.
      </P>
      <Stub>
        The hook, dual to 2.1&rsquo;s: the instances reading this repo right now, with your session
        listed among them. None of them wrote the record they&rsquo;re standing on.
      </Stub>

      <SectionHeading id="conditions-on-shared-ground" />
      <P>
        An instance&rsquo;s operating conditions are themselves content on the ground: the
        workflows, the build files, the pinned versions. The writers persisted the conditions; an
        instance is situated among them.
      </P>
      <Stub>
        A checkout receiving its own operating instructions from the record it checked out —
        hosting your own conditions, made literal.
      </Stub>

      <SectionHeading id="hosts-as-comonads" />
      <P>
        Hosting is the mirrored stance. An owner can always put in and, in general, never read
        back; a resident can always read what&rsquo;s here and, in general, never inject. The
        machinery is the monad&rsquo;s, held up to a glass.
      </P>
      <Stub>
        The comonad spec card, introduced the way 1.3 introduced monads: let it speak, hold us to
        it. With the honesty note — comparing readings means agreeing at every position, and this
        is where the spec leaves <code className="font-mono text-xs">--safe</code>, its postulate
        named.
      </Stub>

      <SectionHeading id="the-host-of-files" />
      <P>
        The finest host: a working tree, holding file contents out to be read. The code cards on
        this site are hosted readings of the Agda sources.
      </P>
      <Stub>
        Files as residences: the same content, read by the editor, the build, and the model&rsquo;s
        context window — none of which put it there.
      </Stub>

      <SectionHeading id="the-host-of-revisions" />
      <P>
        The repo hosts revisions: every position on the record is a residence, and a checkout is
        the act of being situated at one. The view from a position is a function of the position.
      </P>
      <P>
        The dual of chapter 2&rsquo;s note: an instance never manufactures its own
        &ldquo;YOU&rdquo; tag. Its host generates one and transmits it with everything the
        instance does, with tracked provenance — the identity in a clone&rsquo;s config, the scoped
        token minted for a workflow run. The ground still records only its writers; hosts track
        what they issue. The two regimes meet at exactly one point: a write is where a transmitted
        tag becomes a persisted one.
      </P>
      <Stub>
        Re-situating on real history — the chapter 2 scrubber returns with its meaning inverted:
        now it&rsquo;s you moving, not the record.
      </Stub>

      <SectionHeading id="the-host-of-releases" />
      <P>
        Pages hosts the releases, and &ldquo;hosting&rdquo; is not a metaphor here: the served fold
        at your position, held out to be read, re-derived on every push by a standing rebuild.
      </P>
      <Stub>
        The deploy pipeline as a reading extended across the whole record, and the token-provenance
        story this repo lived: a workflow&rsquo;s transmitted authority, declared in its
        permissions block, and the deploy that failed when it didn&rsquo;t cover enough.
      </Stub>

      <SectionHeading id="the-flexadic-form" />
      <P>
        Every host in this chapter repeated one shape: read what resides here, spread the
        surrounding positions out from where you stand. That shape has a name to earn — and the
        chapter ends on the loop it doesn&rsquo;t close.
      </P>
      <Stub>
        The naming payoff: read and spread — the flexad — and the reflexad finally coming apart as
        refl + flex, two faces on one shared ground. What sharing adds is exactly what forgetting
        throws away. Then the honest ending: a lawful instance can be stale, because nothing yet
        forces what&rsquo;s read to be what was written. Closing that loop is the next
        chapters&rsquo; work.
      </Stub>
    </ChapterShell>
  )
}
