import Link from 'next/link'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/16/solid'
import { chapterBySlug, prevNext } from '@/data/chapters'

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

      <div className="pt-4">{children}</div>

      <nav className="mt-20 flex items-stretch justify-between gap-4 border-t border-zinc-950/5 pt-8 dark:border-white/10">
        {prev ? (
          <Link
            href={`/chapters/${prev.slug}/`}
            className="group flex flex-1 flex-col gap-1 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              <ArrowLongLeftIcon className="size-4" /> Chapter {prev.number}
            </span>
            <span className="font-medium text-zinc-950 dark:text-white">{prev.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/chapters/${next.slug}/`}
            className="group flex flex-1 flex-col items-end gap-1 rounded-lg p-3 text-right hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              Chapter {next.number} <ArrowLongRightIcon className="size-4" />
            </span>
            <span className="font-medium text-zinc-950 dark:text-white">{next.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </article>
  )
}
