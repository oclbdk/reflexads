'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { WidgetFrame } from '../widget-frame'

// The chapter's hook, and deliberately the smallest widget on the page: one
// button, one display. Each press lights the next pixel — a stream, one unit
// at a time, filling the legible surface. The button is labeled "the first
// press" so that the reader can find this exact act again in §7's trace,
// where every press across the chapter is on the record.

const GRID = 8

export function HookPressWidget() {
  const [count, setCount] = useState(0)

  const litCount = count === 0 ? 0 : ((count - 1) % (GRID * GRID)) + 1
  const last = count > 0 ? (count - 1) % (GRID * GRID) : null

  return (
    <WidgetFrame
      title="The press"
      hint={
        <>
          That&rsquo;s the whole widget. The rest of this chapter is the anatomy of what you just did.
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:justify-center sm:gap-10">
        <button
          onClick={() => setCount((c) => c + 1)}
          aria-label="the first press"
          className="rounded-xl bg-zinc-900 px-8 py-4 text-base font-medium text-white shadow-sm hover:bg-zinc-700 active:translate-y-px dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Press
        </button>
        <div className="rounded-md bg-zinc-950 p-1.5">
          <div className="mx-auto grid w-fit grid-cols-8 gap-px">
            {Array.from({ length: GRID * GRID }, (_, i) => (
              <div
                key={i}
                className={clsx(
                  'size-2.5 rounded-[1px] transition-colors duration-200',
                  i < litCount ? 'bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400/60' : 'bg-zinc-800',
                )}
              />
            ))}
          </div>
        </div>
        <div className="min-w-40 text-center font-mono text-xs text-zinc-500 tabular-nums sm:text-left dark:text-zinc-400">
          {count === 0 ? (
            <>unit 0 awaits</>
          ) : (
            <>
              unit {count - 1}: press → PX {last! % GRID},{Math.floor(last! / GRID)}
              <br />
              <span className="text-zinc-400 dark:text-zinc-500">a stream, one unit at a time</span>
            </>
          )}
        </div>
      </div>
    </WidgetFrame>
  )
}
