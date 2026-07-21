import type { Metadata } from 'next'
import Link from 'next/link'
import { ChapterShell } from '@/components/site/chapter-shell'
import { H2, P } from '@/components/site/prose'

export const metadata: Metadata = { title: 'Contextualized Ownership' }

// Chapter 2 — this repository, documented as its own AI Harness. Scaffold:
// section stubs only, built out one widget at a time the way chapter 1 was.
// The ground is the git record; the display surface is the rendered site;
// refladic scopes layer the one into the other.

const sections = [
  { id: 'the-ai-harness-repo', title: 'The AI Harness Repo' },
  { id: 'repo-as-shared-ground', title: 'Repo as Shared Ground' },
  { id: 'ground-as-monoidal-persistence', title: 'Ground as Monoidal Persistence' },
  { id: 'writing-files', title: 'Writing Files' },
  { id: 'committing-revisions', title: 'Committing Revisions' },
  { id: 'publishing-releases', title: 'Publishing Releases' },
  { id: 'the-refladic-form', title: 'The Refladic Form' },
] as const

type SectionId = (typeof sections)[number]['id']

function SectionHeading({ id }: { id: SectionId }) {
  const index = sections.findIndex((s) => s.id === id)
  const section = sections[index]
  return (
    <H2 id={id}>
      <Link href={`#${id}`} className="group">
        <span className="mr-3 font-mono text-base text-zinc-400 tabular-nums group-hover:text-reflex-600 dark:text-zinc-500 dark:group-hover:text-reflex-500">
          2.{index + 1}
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
                2.{i + 1}
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
    <ChapterShell slug="contextualized-ownership">
      <Contents />

      <SectionHeading id="the-ai-harness-repo" />
      <P>
        The system chapter 1 described is running for real: this repository develops the site
        you&rsquo;re reading, and the page in front of you was derived from its record.
      </P>
      <Stub>
        The hook — the page&rsquo;s own provenance. The repo&rsquo;s actual history, with the two
        hands from chapter 1 already on it.
      </Stub>

      <SectionHeading id="repo-as-shared-ground" />
      <P>
        One record under every hand. Engineer, model, and pipeline all write into the same history,
        and everything any of them ever did is reachable through it.
      </P>
      <Stub>
        The record as the one shared object: scrub through real history and watch the site assemble
        from empty to the page you&rsquo;re on.
      </Stub>

      <SectionHeading id="ground-as-monoidal-persistence" />
      <P>
        The record carries an algebra: spans compose in sequence, regrouping is free, order is
        meaning, and nothing unhappens.
      </P>
      <Stub>
        The laws, demonstrated where they bite: squash a real span and the fold is identical;
        reorder it and the fold diverges; undoing turns out to append. The spec card lands here.
      </Stub>

      <SectionHeading id="writing-files" />
      <P>
        Interactions at the finest grain: file writes landing in a working tree — the tangle
        before anything is serialized.
      </P>
      <Stub>
        The working tree as chapter 1&rsquo;s tangle: concurrent, unordered, half-finished — and
        not yet on the record.
      </Stub>

      <SectionHeading id="committing-revisions" />
      <P>
        Serialization as an act. A commit picks a span of writes, names it, and assigns its owner.
      </P>
      <P>
        A note worth carrying through the rest of this chapter: the &ldquo;YOU&rdquo; tokens are
        not bookkeeping anyone does by hand. The system tags them automatically, alongside the
        content, in the same record — every span lands already wearing its owner, the way every op
        in chapter 1 carried its provenance. Ownership is never a side channel to reconcile
        against; it persists with what it owns.
      </P>
      <Stub>
        Committing made tangible: staging chooses the span, the message names it, the author field
        attaches the token. Interleaved authors, one history.
      </Stub>

      <SectionHeading id="publishing-releases" />
      <P>
        A push executes the record, and the site follows. The display is derived and disposable;
        the record is the truth.
      </P>
      <Stub>
        The fold made public: the deploy pipeline as the consumer of the record, and this page as
        the state it lands on. Nobody edits the deployed site.
      </Stub>

      <SectionHeading id="the-refladic-form" />
      <P>
        Every scope in this chapter repeated one shape: open with nothing accrued, accumulate under
        an owner, resolve onto the shared record. That shape has a name to earn.
      </P>
      <Stub>
        The naming payoff, the way chapter 1 earned &ldquo;reflexad&rdquo;: own, accrue, resolve —
        the reflad, standing on the ground the whole chapter has been walking on. Spec cards hold
        us to it.
      </Stub>
    </ChapterShell>
  )
}
