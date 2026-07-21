'use client'

import { useEffect } from 'react'
import { loadStream, recordEvent } from '@/lib/you-stream'

// Mounted once per section page: records the section visit and every button
// press on the page into the session's You-stream. Buttons inside a
// [data-you-skip] container opt out (their handlers record semantically).

export function YouRecorder({ label }: { label: string }) {
  useEffect(() => {
    const s = loadStream()
    if (s.length === 0 || s[s.length - 1].label !== label) {
      recordEvent({ kind: 'read', label, t: Date.now() })
    }
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('button')
      if (!btn || btn.closest('[data-you-skip]')) return
      const l =
        (btn.getAttribute('aria-label') ?? btn.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28) ||
        '(button)'
      recordEvent({ kind: 'press', label: l, t: Date.now() })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [label])
  return null
}
