import { BeakerIcon } from '@heroicons/react/16/solid'

// The frame every demo sits in: a labeled, visually distinct card so the
// "you can touch this" moments read differently from prose and code.

export function DemoFrame({
  title,
  hint,
  children,
}: {
  title: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl bg-reflex-50/60 ring-1 ring-reflex-500/20 dark:bg-reflex-500/5 dark:ring-reflex-500/20">
      <div className="flex items-center gap-2 border-b border-reflex-500/15 px-4 py-2.5">
        <BeakerIcon className="size-4 text-reflex-600 dark:text-reflex-500" />
        <span className="text-sm/6 font-semibold text-reflex-600 dark:text-reflex-500">{title}</span>
        <span className="ml-auto text-xs/5 text-zinc-500 dark:text-zinc-400">demo</span>
      </div>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      {hint && (
        <div className="border-t border-reflex-500/15 px-4 py-3 text-sm/6 text-zinc-600 dark:text-zinc-400">
          {hint}
        </div>
      )}
    </div>
  )
}

// Emphasis tuned for demo hint text (slightly stronger than prose Em).
export function Em({ children }: { children: React.ReactNode }) {
  return <em className="text-zinc-700 italic dark:text-zinc-200">{children}</em>
}
