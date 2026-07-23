import type { Metadata } from 'next'
import { clsx } from 'clsx'
import gitData from '@/generated/git.json'
import { Code, Strong, Text } from '@/components/text'
import { CommandBlock } from '@/components/site/command-block'
import { DemoBoundary } from '@/components/site/demo-boundary'
import { SandboxLoopDemo } from '@/components/site/demos/sandbox-loop'
import { Unit } from '@/components/site/prose'

export const metadata: Metadata = { title: "Contributor's Guide" }

// The orientation as a branch spine: the page is a git graph. Upstream's
// line opens at the top carrying real commits from the serving instance's
// record; your line forks off in teal and carries the seven steps. The
// spine encodes the model without a word of explanation: dashed while
// local (steps 1–4), solid and glowing once pushed live (5–7), a dashed
// arrow that reaches toward upstream and deliberately never touches it
// (the offered pull), then two parallel lines running on — co-evolution,
// no merge required — with the closing line sitting between them.

// These are revisions of the upstream repo — linked there, hardcoded.
const UPSTREAM_REPO = 'https://github.com/oclbdk/reflexads'

const recent = (gitData.commits as { hash: string; full: string; subject: string }[]).slice(-3)

// Gutter geometry: upstream line at 10px, your line at 38px, gutter 56px.
const UPSTREAM_LINE = 'absolute inset-y-0 left-[9.5px] w-px bg-zinc-300 dark:bg-zinc-700'

function YourLine({ zone, className }: { zone: 'local' | 'live'; className?: string }) {
  return (
    <div
      className={clsx(
        'absolute left-[37.5px] w-0 border-l',
        zone === 'local'
          ? 'border-dashed border-teal-500/60'
          : 'border-solid border-teal-500 shadow-[0_0_6px] shadow-teal-500/40',
        className ?? 'inset-y-0',
      )}
    />
  )
}

function Dot({ zone, armed, className }: { zone: 'local' | 'live'; armed?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'absolute left-[38px] size-2.5 -translate-x-1/2 rounded-full ring-4 ring-paper dark:ring-zinc-900',
        armed
          ? 'border border-teal-500 bg-paper dark:bg-zinc-900'
          : zone === 'local'
            ? 'bg-teal-500/80'
            : 'bg-teal-500 shadow-[0_0_8px] shadow-teal-500/60',
        className ?? 'top-6',
      )}
    />
  )
}

function Step({
  n,
  title,
  zone,
  armed,
  transition,
  badge,
  gutterExtra,
  extra,
  children,
}: {
  n: string
  title: string
  zone: 'local' | 'live'
  armed?: boolean
  /** The dash-to-solid switch happens exactly at this step's dot. */
  transition?: boolean
  badge?: React.ReactNode
  gutterExtra?: React.ReactNode
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative flex gap-4">
      <div className="relative w-14 shrink-0 self-stretch">
        <div className={clsx(UPSTREAM_LINE, 'opacity-40')} />
        {transition ? (
          <>
            <YourLine zone="local" className="top-0 h-[22px]" />
            <YourLine zone="live" className="top-[22px] bottom-0" />
          </>
        ) : (
          <YourLine zone={zone} />
        )}
        <Dot zone={zone} armed={armed} className="top-5" />
        {gutterExtra}
      </div>
      <div className="min-w-0 flex-1 pt-3 pb-12">
        <h2 className="text-base/6 font-semibold text-zinc-950 dark:text-white">
          <span className="mr-2 font-mono text-xs font-normal text-zinc-400 tabular-nums dark:text-zinc-500">
            {n}
          </span>
          {title}
          {badge}
        </h2>
        <Text className="mt-1.5">{children}</Text>
        {extra}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl/9 font-semibold tracking-tight text-zinc-950 dark:text-white">
        This repo is meant to be forked.
      </h1>
      <Text className="mt-4">
        Running your own copy is the fastest way to understand how this one is run. Everything
        comes with it, including the page you&rsquo;re reading.
      </Text>

      <div className="mt-14">
        {/* upstream: the serving instance's record, live */}
        <div className="relative flex gap-4">
          <div className="relative w-14 shrink-0 self-stretch">
            <div className={UPSTREAM_LINE} />
          </div>
          <div className="min-w-0 pb-1 font-mono text-[11px]/5 tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            this instance&rsquo;s record
          </div>
        </div>
        {(recent.length > 0 ? recent : [null, null, null]).map((c, i) => (
          <div key={c?.hash ?? i} className="relative flex gap-4">
            <div className="relative w-14 shrink-0 self-stretch">
              <div className={UPSTREAM_LINE} />
              <span className="absolute top-1.5 left-[10px] size-2 -translate-x-1/2 rounded-full bg-zinc-400 ring-4 ring-paper dark:bg-zinc-600 dark:ring-zinc-900" />
            </div>
            <div className="min-w-0 truncate pb-2 font-mono text-xs/5 text-zinc-400 dark:text-zinc-500">
              {c ? (
                <>
                  <a
                    href={`${UPSTREAM_REPO}/commit/${c.full}`}
                    target="_blank"
                    className="mr-2 text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-white"
                  >
                    {c.hash}
                  </a>
                  {c.subject}
                </>
              ) : (
                '·'
              )}
            </div>
          </div>
        ))}

        {/* step 1: the fork — your line branches off */}
        <div className="relative flex gap-4">
          <div className="relative w-14 shrink-0 self-stretch">
            <div className={UPSTREAM_LINE} />
            <svg
              className="absolute top-0 left-0"
              width="56"
              height="48"
              viewBox="0 0 56 48"
              fill="none"
              aria-hidden
            >
              <path
                d="M10 4 C 10 32, 38 16, 38 48"
                className="stroke-teal-500/60"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            </svg>
            <YourLine zone="local" className="top-12 bottom-0" />
            <Dot zone="local" className="top-[46px]" />
          </div>
          <div className="min-w-0 pt-8 pb-12">
            <h2 className="text-base/6 font-semibold text-zinc-950 dark:text-white">
              <span className="mr-2 font-mono text-xs font-normal text-zinc-400 tabular-nums dark:text-zinc-500">
                01
              </span>
              Fork and clone
            </h2>
            <Text className="mt-1.5">
              Fork{' '}
              <a
                href={UPSTREAM_REPO}
                target="_blank"
                className="text-zinc-950 underline decoration-zinc-950/30 hover:decoration-zinc-950 dark:text-white dark:decoration-white/30 dark:hover:decoration-white"
              >
                the repo on GitHub
              </a>
              , clone your fork. You get the Agda, the book, the site, and the whole git
              history.
            </Text>
          </div>
        </div>

        <Step
          n="02"
          title="Hand it to a harness"
          zone="local"
          extra={<CommandBlock command={'cd site\nnpm install\nnpm run dev'} />}
        >
          Open the checkout in an AI harness and get the Next.js dev server running. The
          exercise is to explore the methodological differences between revising{' '}
          <Unit kind="code" />, <Unit kind="prose" />, or <Unit kind="data" />. Particularly,
          at which sites they&rsquo;re revised.
        </Step>

        <Step
          n="03"
          title="Work locally"
          zone="local"
          extra={
            <>
              <Text className="mt-3">
                <Strong>A good first task:</Strong>
                {' update this Contributor’s Guide to match your fork and your tastes.'}
              </Text>
              <DemoBoundary>
                <SandboxLoopDemo />
              </DemoBoundary>
            </>
          }
        >
          It&rsquo;s a sandbox. Hot reload, experiments, dead ends. Nothing leaves your machine
          until you push, so commit whenever something feels done and take your time.
        </Step>

        <Step n="04" title="Turn on GitHub Pages (once)" zone="local" armed>
          Settings → Pages → Source: GitHub Actions. That&rsquo;s it. Nothing publishes until
          you push.
        </Step>

        <Step
          n="05"
          title="Push"
          zone="live"
          transition
          badge={
            <span className="ml-2.5 rounded-full bg-teal-500/10 px-2 py-0.5 align-[2px] font-mono text-[10px] font-medium text-teal-600 ring-1 ring-teal-500/25 dark:text-teal-400">
              live
            </span>
          }
        >
          Every push deploys. A minute or two later your fork is live at{' '}
          <Code>https://&lt;you&gt;.github.io/&lt;repo&gt;</Code>.
        </Step>

        <Step
          n="06"
          title="Open a PR if you want"
          zone="live"
          gutterExtra={
            <svg
              className="absolute top-6 left-0"
              width="56"
              height="12"
              viewBox="0 0 56 12"
              fill="none"
              aria-hidden
            >
              <path d="M34 6 H17" className="stroke-teal-500/70" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M21 2 L15 6 L21 10" className="stroke-teal-500/70" strokeWidth="1" fill="none" />
            </svg>
          }
        >
          If something&rsquo;s worth sharing, send it upstream. It might get merged, reworked,
          or never answered. Your copy is already live either way.
        </Step>

        <Step
          n="07"
          title="See what happens"
          zone="live"
          gutterExtra={
            <svg
              className="absolute top-14 left-0"
              width="56"
              height="28"
              viewBox="0 0 56 28"
              fill="none"
              aria-hidden
            >
              <path d="M13 4 H35" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1" strokeDasharray="1 4" />
              <path d="M13 18 H35" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1" strokeDasharray="1 4" />
            </svg>
          }
        >
          Instances learn from each other in public. What this one takes from yours shows up in
          its record, and what you take shows up in yours.
        </Step>

        {/* the two lines run on; no merge */}
        <div className="relative flex gap-4">
          <div className="relative h-24 w-14 shrink-0">
            <div className={clsx(UPSTREAM_LINE, 'opacity-40')} />
            <YourLine zone="live" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-paper dark:to-zinc-900" />
          </div>
          <div className="min-w-0" />
        </div>

        <p className="mt-6 pl-[72px] text-sm/6 text-zinc-600 italic dark:text-zinc-300">
          The contribution is the private learning. The public participation is a welcome but
          nonobligatory byproduct of the work.
        </p>
      </div>
    </div>
  )
}
