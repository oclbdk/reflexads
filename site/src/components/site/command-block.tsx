'use client'

import { useState } from 'react'
import { CheckIcon, ClipboardIcon } from '@heroicons/react/16/solid'

// A copy-pasteable command block: terminal-dark, one copy button, no chrome.

export function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative mt-3 rounded-lg bg-zinc-950 dark:ring-1 dark:ring-white/10">
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px]/6 text-zinc-100">{command}</pre>
      <button
        onClick={copy}
        aria-label="Copy commands"
        className="absolute top-2 right-2 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? <CheckIcon className="size-4 text-emerald-400" /> : <ClipboardIcon className="size-4" />}
      </button>
    </div>
  )
}
