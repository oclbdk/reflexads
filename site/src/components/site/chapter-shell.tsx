import Link from 'next/link'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/16/solid'
import { chapterBySlug, chapterHref, prevNext } from '@/data/chapters'

// Shared chapter chrome: arc badge + number + title + tagline header, the
// authored body, and prev/next pagination — all driven by the chapters data.

export function ChapterShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const chapter = chapterBySlug(slug)!
  const { prev, next } = prevNext(slug)

  return (
    <article className="mx-auto max-w-2xl">
      <header className="border-b border-zinc-950/5 pb-8 dark:border-white/10">
        <div className="text-sm/6 font-medium text-reflex-600 dark:text-reflex-500">
          Chapter {chapter.number}
        </div>
        <h1 className="mt-3 text-3xl/10 font-semibold tracking-tight text-zinc-950 dark:text-white">
          {chapter.title}
        </h1>
        <p className="mt-3 text-lg/8 text-zinc-600 dark:text-zinc-300">{chapter.tagline}</p>
      </header>

      {chapter.legacy && (
        <div className="mt-6 rounded-xl bg-amber-500/5 px-5 py-4 text-sm/6 text-zinc-600 ring-1 ring-amber-500/20 dark:text-zinc-300">
          <span className="font-semibold text-amber-700 dark:text-amber-500">
            Legacy placeholder.
          </span>{' '}
          This chapter predates the framing{' '}
          <Link
            href="/chapters/introduction/the-ai-harness-system/"
            className="font-medium text-reflex-600 hover:text-reflex-700 dark:text-reflex-500"
          >
            chapter 1
          </Link>{' '}
          now sets. It will be reworked, incrementally, to match — until then, its terms and
          figures don&rsquo;t line up with the introduction.
        </div>
      )}

      <div className="pt-4">{children}</div>

      <nav className="mt-20 flex items-stretch justify-between gap-4 border-t border-zinc-950/5 pt-8 dark:border-white/10">
        {prev ? (
          <Link
            href={chapterHref(prev.slug)}
            className="group flex flex-1 flex-col gap-1 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              <ArrowLongLeftIcon className="size-4" /> Chapter {prev.number}
            </span>
            <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">{prev.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={chapterHref(next.slug)}
            className="group flex flex-1 flex-col items-end gap-1 rounded-lg p-3 text-right hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              Chapter {next.number} <ArrowLongRightIcon className="size-4" />
            </span>
            <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">{next.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </article>
  )
}
