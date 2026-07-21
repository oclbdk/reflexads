import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/16/solid'
import { chapters } from '@/data/chapters'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="border-b border-zinc-950/5 pb-12 dark:border-white/10">
        <h1 className="text-4xl/tight font-semibold tracking-tight text-zinc-950 sm:text-5xl/tight dark:text-white">
          Structures that contextually host their own conditions
        </h1>
        <p className="mt-6 text-lg/8 text-zinc-600 dark:text-zinc-300">
          An interactive guide that explores how engineers can reason about looping effects in
          computational workflows, like AI contexts that feed code, prose, and data sources back
          into their own operations.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/chapters/introduction/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start reading <ArrowRightIcon className="size-4" />
          </Link>
          <a
            href="https://github.com/oclbdk/reflexads"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/5"
          >
            Source &amp; PDF
          </a>
        </div>
      </section>

      <section className="py-12">
        <ul className="divide-y divide-zinc-950/5 dark:divide-white/10">
          {chapters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/chapters/${c.slug}/`}
                className="group flex items-baseline gap-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5"
              >
                <span className="w-6 shrink-0 text-right font-mono text-sm text-zinc-400 tabular-nums">
                  {c.number}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-zinc-950 group-hover:text-reflex-600 dark:text-white dark:group-hover:text-reflex-500">
                    {c.title}
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
