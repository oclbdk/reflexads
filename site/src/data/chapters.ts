// The book's progression, grouped by its internal arc. The sidebar, the
// chapter chrome, and prev/next pagination are all driven from this list.

export type Arc =
  | 'The Setup'
  | 'The Two Faces'
  | 'The Fixed Points'
  | 'The Synthesis'
  | 'The Reintroduction'

export const ARC_ORDER: Arc[] = [
  'The Setup',
  'The Two Faces',
  'The Fixed Points',
  'The Synthesis',
  'The Reintroduction',
]

export interface Chapter {
  number: number
  slug: string
  title: string
  /** One-line framing shown under the title and in the sidebar tooltip. */
  tagline: string
  arc: Arc
  /** Which extracted Agda module the live code cards read from. */
  module: string
}

export const chapters: Chapter[] = [
  {
    number: 1,
    slug: 'introduction',
    title: 'Introduction',
    tagline: 'Contextualized sequencing, and why it bends back on itself.',
    arc: 'The Setup',
    module: 'Chapter01',
  },
  {
    number: 2,
    slug: 'contextualized-ownership',
    title: 'Contextualized Ownership',
    tagline: 'The ground made concrete: a monoid a structure owns by accruing it.',
    arc: 'The Two Faces',
    module: 'Chapter02',
  },
  {
    number: 3,
    slug: 'situated-on-shared-ground',
    title: 'Situated on Shared Ground',
    tagline: 'The hosting face: reading a ground rather than writing it.',
    arc: 'The Two Faces',
    module: 'Chapter03',
  },
  {
    number: 4,
    slug: 'holding-itself-up',
    title: 'Holding Itself Up',
    tagline: 'Self-hosting: settling flat in a single step, not in the limit.',
    arc: 'The Fixed Points',
    module: 'Chapter04',
  },
  {
    number: 5,
    slug: 'pinning-itself-down',
    title: 'Pinning Itself Down',
    tagline: 'Self-selection: the owning face pinned to one condition.',
    arc: 'The Fixed Points',
    module: 'Chapter05',
  },
  {
    number: 6,
    slug: 'buffering-itself',
    title: 'Buffering Itself',
    tagline: 'The split idempotent: both faces settle together. CRDTs, exactly.',
    arc: 'The Synthesis',
    module: 'Chapter06',
  },
  {
    number: 7,
    slug: 'reintroduction',
    title: 'Reintroduction',
    tagline: 'The flat space is an instruction stream. Code and prompts, one shape.',
    arc: 'The Reintroduction',
    module: 'Chapter07',
  },
]

export function chapterBySlug(slug: string): Chapter | undefined {
  return chapters.find((c) => c.slug === slug)
}

export function chaptersByArc(): { arc: Arc; items: Chapter[] }[] {
  return ARC_ORDER.map((arc) => ({
    arc,
    items: chapters.filter((c) => c.arc === arc),
  }))
}

export function prevNext(slug: string): { prev?: Chapter; next?: Chapter } {
  const i = chapters.findIndex((c) => c.slug === slug)
  return {
    prev: i > 0 ? chapters[i - 1] : undefined,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : undefined,
  }
}
