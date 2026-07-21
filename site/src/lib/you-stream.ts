// The reader's session stream, shared across the chapter's subpages. Section
// visits and button presses are recorded here, in memory only: client-side
// navigation between pages keeps the stream alive, a refresh starts it fresh.

export type YouEvent = { kind: 'press' | 'read'; label: string; t: number }

const MAX = 300
const TRIM = 200

let stream: YouEvent[] = []

export function loadStream(): YouEvent[] {
  return stream.slice()
}

export function recordEvent(e: YouEvent) {
  stream.push(e)
  if (stream.length > MAX) stream = stream.slice(-TRIM)
  window.dispatchEvent(new CustomEvent('you-stream', { detail: e }))
}
