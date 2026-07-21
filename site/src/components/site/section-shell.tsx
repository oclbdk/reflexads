import Link from 'next/link'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/16/solid'
import { chapters } from '@/data/chapters'
import { introSections } from '@/data/intro-sections'
import { YouRecorder } from './you-recorder'

// Shared chrome for the introduction chapter's section subpages: chapter
// kicker, numbered heading, the authored body, and prev/next between sections
// (the last section hands off to chapter 2). Also mounts the session recorder
// so the reader's path through the chapter is traceable from the final page.

export function SectionShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const idx = introSections.findIndex((s) => s.slug === slug)
  const section = introSections[idx]
  const prev = introSections[idx - 1]
  const next = introSections[idx + 1]
  const nextChapter = chapters[1]

  return (
    <article className="mx-auto max-w-2xl">
      <YouRecorder label={`read §1.${idx + 1} ${section.title}`} />
      <header className="border-b border-zinc-950/5 pb-8 dark:border-white/10">
        <div className="text-sm/6 font-medium text-reflex-600 dark:text-reflex-500">
          Chapter 1 · Introduction
        </div>
        <h1 className="mt-3 text-3xl/10 font-semibold tracking-tight text-zinc-950 dark:text-white">
          <span className="mr-3 font-mono text-2xl text-zinc-400 tabular-nums dark:text-zinc-500">
            1.{idx + 1}
          </span>
          {section.title}
        </h1>
      </header>

      <div className="pt-4">{children}</div>

      <nav className="mt-20 flex items-stretch justify-between gap-4 border-t border-zinc-950/5 pt-8 dark:border-white/10">
        {prev ? (
          <Link
            href={`/chapters/introduction/${prev.slug}/`}
            className="group flex flex-1 flex-col gap-1 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              <ArrowLongLeftIcon className="size-4" /> Section 1.{idx}
            </span>
            <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/chapters/introduction/${next.slug}/`}
            className="group flex flex-1 flex-col items-end gap-1 rounded-lg p-3 text-right hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              Section 1.{idx + 2} <ArrowLongRightIcon className="size-4" />
            </span>
            <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">
              {next.title}
            </span>
          </Link>
        ) : (
          <Link
            href={`/chapters/${nextChapter.slug}/`}
            className="group flex flex-1 flex-col items-end gap-1 rounded-lg p-3 text-right hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
              Chapter {nextChapter.number} <ArrowLongRightIcon className="size-4" />
            </span>
            <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">
              {nextChapter.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
