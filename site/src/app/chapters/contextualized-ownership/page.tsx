import type { Metadata } from 'next'
import Link from 'next/link'
import { ChapterShell } from '@/components/site/chapter-shell'
import { H2, P, Unit } from '@/components/site/prose'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { RepoRecordDemo } from '@/components/site/demos/repo-record'
import { DevLoopDemo } from '@/components/site/demos/dev-loop'
import { SteerLoopDemo } from '@/components/site/demos/steer-loop'
import { PolicyLoopDemo } from '@/components/site/demos/policy-loop'

export const metadata: Metadata = { title: 'Contextualized Ownership' }

// Chapter 2 — this repository, documented as its own AI harness. Scaffold:
// section stubs only, built out one demo at a time the way chapter 1 was.
// The ground is the git record; the display surface is the rendered site.
// The spine: each section shows a reflex the reader already performs in
// version control — select a subsequence, consolidate it, feed it back —
// unnamed until 2.7 generalizes the pattern and states its canonical
// instance: learn from subsequences of commit history.

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
      <DemoBoundary>
        <RepoRecordDemo />
      </DemoBoundary>

      <P>
        That&rsquo;s the primal reflex: sampling your own past. Every demo in this chapter runs on
        this record, and the rest of the chapter is the anatomy of how it gets written.
      </P>

      <SectionHeading id="repo-as-shared-ground" />
      <P>
        One record under every hand. Engineer, model, and pipeline all write into the same history,
        and everything any of them ever did is reachable through it.
      </P>
      <Stub>
        Rewind as a reflex: replay a prefix of real history and watch the site rebuild from empty
        to the page you&rsquo;re on. State is a fold, and the record suffices.
      </Stub>

      <SectionHeading id="ground-as-monoidal-persistence" />
      <P>
        The record carries an algebra: spans compose in sequence, regrouping is free, order is
        meaning, and nothing unhappens.
      </P>
      <Stub>
        The laws as what licenses each reflex: squash a real span and the fold is identical
        (regrouping is free); reorder it and the fold diverges (order is meaning); undoing turns
        out to append (nothing unhappens). The spec card lands here.
      </Stub>

      <SectionHeading id="writing-files" />
      <P>
        Interactions at the finest grain: file writes landing in a filesystem — the tangle
        before anything is serialized. Every write touches one of three strata:{' '}
        <Unit kind="code" />, <Unit kind="prose" />, <Unit kind="data" />.
      </P>
      <P>
        Here is that loop at chapter 1&rsquo;s scale — the base application this chapter will
        keep extending, with you in the engineer&rsquo;s seat and the whole system as the
        harness. The flow runs one way: patches land in the filesystem, the dev server folds
        the filesystem the moment it changes, and the page is reconstructed from the files, every
        time, from nothing else. Even drawing on the page persists through a buffered save
        handler into the same filesystem, and comes back as a no-op reload. Those constraints are not
        incidental — they are what keeps the loop from thrashing. A harness that lets its
        display re-trigger builds, or its model read its own uncommitted output, garbles the
        very context it works from; here every effect must land coherently in the filesystem before
        anything downstream sees it, and the site has no way to steer the model at all. The
        context carries the working state, the write-loops are guarded at the fold — and that
        is the seed of the refladic loop, planted. Growing it safely is where this chapter goes
        next.
      </P>
      <DemoBoundary>
        <DevLoopDemo />
      </DemoBoundary>

      <P>
        Now grow the loop — carefully. The application below is the same system one feature
        later: the page has learned to <em>wish</em>. And the lesson it carries is a separation:
        <em> staging context</em> is one act, <em>driving a response</em> is another. The
        request chips stage — they persist intent into{' '}
        <code className="font-mono text-[0.9em]">steer.md</code> through the same buffered save
        handler, where it sits in the filesystem, inspectable and replaceable, waking no one. The
        prompt drives — it pulls whatever is staged into exactly one response, honored and
        consumed. Notice what did not grow: no new channel, no new edge, and the message history
        never changes shape. A harness that fuses these two acts turns every flicker of UI into
        a model call; one that separates them lets the site steer the model without ever
        touching the wheel mid-turn. The refladic loop takes its first step.
      </P>
      <DemoBoundary>
        <SteerLoopDemo />
      </DemoBoundary>

      <P>
        One more turn: steer the steering. The difference between first- and second-order
        steering is a difference in <em>lifetime</em>. A request is a queue entry — staged,
        pulled, consumed exactly once. A <em>disposition</em> is a standing fact the model reads
        on every drive:{' '}
        <code className="font-mono text-[0.9em]">policy.md</code>, written rarely, never
        consumed. The demo below grows meta-chips that edit it — and these dispositions are
        conditioned, not constant: each one reads a memory and computes its action from it.
        &ldquo;Never repeat&rdquo; reads the conversation — a memory that is deliberately not a
        file, so a new session wipes it while every file stands, and the standing policy
        forgets what &ldquo;repeat&rdquo; means. &ldquo;Keep it symmetric&rdquo; reads the
        canvas bytes — a condition maintained at every step by a repair computed from exactly
        what&rsquo;s there, your own doodles included. Nothing new was built to make this
        possible — same save handler, same fold, one more file — and the dispositions outlive
        the app that set them: kill the page and its controls, and the policy still stands in
        the filesystem, governing the rebuild. The context now carries not just the working
        state but the conditions on it, and every lifetime sorts itself by where it lives —
        which is the chapter&rsquo;s whole argument in one loop.
      </P>
      <DemoBoundary>
        <PolicyLoopDemo />
      </DemoBoundary>

      <SectionHeading id="committing-revisions" />
      <P>
        Serialization as an act. A commit picks a span of writes, names it, and assigns its owner.
      </P>
      <P>
        A note worth carrying through the rest of this chapter: the &ldquo;YOU&rdquo; tags are
        not bookkeeping anyone does by hand. The system tags them automatically, alongside the
        content, in the same record — every span lands already wearing its owner, the way every op
        in chapter 1 carried its provenance. Ownership is never a side channel to reconcile
        against; it persists with what it owns.
      </P>
      <Stub>
        The consolidation reflex every engineer already runs: a commit message is a subsequence
        folded into prose that conditions future readers. Real subjects, shown beside the spans
        they consolidate — interleaved authors, one history.
      </Stub>

      <SectionHeading id="publishing-releases" />
      <P>
        A push executes the record, and the site follows. The display is derived and disposable;
        the record is the truth.
      </P>
      <Stub>
        The fold made public, twice: release notes (the span since last release, consolidated for
        humans) and the deploy itself (the record, executed). Nobody edits the deployed site.
      </Stub>

      <SectionHeading id="the-refladic-form" />
      <P>
        Every section in this chapter ran the same pattern: select a subsequence of the record,
        consolidate it, feed it back. That pattern has a name to earn.
      </P>
      <Stub>
        The naming payoff, the way chapter 1 earned &ldquo;reflexad&rdquo;: own, accrue, resolve —
        the reflad, the machinery that keeps a scope&rsquo;s spans extractable with their
        ownership intact. And the canonical instance, stated plainly: learn from subsequences of
        commit history — the harness-wide optimization reflex. Spec cards hold us to it.
      </Stub>
    </ChapterShell>
  )
}
