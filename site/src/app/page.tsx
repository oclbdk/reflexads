import Link from 'next/link'
import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid'
import { chapterHref, chapters } from '@/data/chapters'
import { Unit } from '@/components/site/prose'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="border-b border-zinc-950/5 pb-12 dark:border-white/10">
        <h1 className="text-4xl/tight font-semibold tracking-tight text-zinc-950 sm:text-5xl/tight dark:text-white">
          The Logic of AI Harnesses
        </h1>
        <p className="mt-3 text-xl/8 font-medium text-zinc-600 dark:text-zinc-300">
          Structural conditions of self-improving systems
        </p>
        <p className="mt-4 text-base/7 text-zinc-500 dark:text-zinc-400">
          An interactive study of AI harnesses: systems that feed <Unit kind="code" />,{' '}
          <Unit kind="prose" />, and <Unit kind="data" />{' '}back into their own operations, and
          the bounded scopes that let them improve themselves while staying interpretable.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={chapterHref('introduction')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start reading <ArrowRightIcon className="size-4" />
          </Link>
          <Link
            href="/contribute/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/5"
          >
            How to contribute? <ArrowTopRightOnSquareIcon className="size-3.5 text-zinc-400 dark:text-zinc-500" />
          </Link>
        </div>
      </section>

      <section className="py-12">
        <ul className="divide-y divide-zinc-950/5 dark:divide-white/10">
          {chapters.map((c) => (
            <li key={c.slug}>
              <Link
                href={chapterHref(c.slug)}
                className="group flex items-baseline gap-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5"
              >
                <span className="w-6 shrink-0 text-right font-mono text-sm text-zinc-400 tabular-nums">
                  {c.number}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">
                    {c.title}
                    {c.legacy && (
                      <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 align-middle text-[10px] font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-500">
                        legacy
                      </span>
                    )}
                  </span>
                  <span className="block text-sm/6 text-zinc-500 dark:text-zinc-400">
                    {c.tagline}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
