import { CheckBadgeIcon } from '@heroicons/react/16/solid'
import { agdaRegion } from '@/lib/agda'
import { highlightAgda } from '@/lib/agda-highlight'

// A live Agda card: the exact region quoted from the machine-checked source,
// the same `>>> tag` the book quotes. Caption above, "type-checks" mark noted.

export function CodeCard({
  module,
  tag,
  caption,
}: {
  module: string
  tag: string
  caption?: React.ReactNode
}) {
  const code = agdaRegion(module, tag)
  return (
    <figure className="mt-8 overflow-hidden rounded-xl ring-1 ring-zinc-950/10 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-950/5 bg-zinc-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/5">
        <figcaption className="text-sm/6 text-zinc-600 dark:text-zinc-400">
          {caption ?? (
            <span>
              from <span className="font-mono text-xs">{module}.agda</span>
            </span>
          )}
        </figcaption>
        <span className="inline-flex items-center gap-1 text-xs/5 font-medium text-emerald-700 dark:text-emerald-400">
          <CheckBadgeIcon className="size-4" />
          type-checks
        </span>
      </div>
      <pre className="overflow-x-auto bg-white px-4 py-4 text-[0.8125rem]/6 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        <code className="font-mono">{highlightAgda(code)}</code>
      </pre>
    </figure>
  )
}
