// The book's progression, grouped by its internal arc. The sidebar, the
// chapter chrome, and prev/next pagination are all driven from this list.

import { introSections } from './intro-sections'

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
  /**
   * Predates the chapter 1 framing; kept as a placeholder until it is
   * reworked to match. Flips off chapter by chapter as the rework lands.
   */
  legacy?: boolean
}

export const chapters: Chapter[] = [
  {
    number: 1,
    slug: 'introduction',
    title: 'Introduction',
    tagline: 'From one button press to a system that steers itself.',
    arc: 'The Setup',
    module: 'Chapter01',
  },
  {
    number: 2,
    slug: 'contextualized-ownership',
    title: 'Contextualized Ownership',
    tagline: "This site's repo, documented as its own AI harness: one record, and the scopes that own it.",
    arc: 'The Two Faces',
    module: 'Chapter02',
  },
  {
    number: 3,
    slug: 'situated-on-shared-ground',
    title: 'Situated on Shared Ground',
    tagline: "This site's instances, situated on the one record: the hosts that hold it out to be read.",
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
    legacy: true,
  },
  {
    number: 5,
    slug: 'pinning-itself-down',
    title: 'Pinning Itself Down',
    tagline: 'Self-selection: the owning face pinned to one condition.',
    arc: 'The Fixed Points',
    module: 'Chapter05',
    legacy: true,
  },
  {
    number: 6,
    slug: 'buffering-itself',
    title: 'Buffering Itself',
    tagline: 'The split idempotent: both faces settle together. CRDTs, exactly.',
    arc: 'The Synthesis',
    module: 'Chapter06',
    legacy: true,
  },
  {
    number: 7,
    slug: 'reintroduction',
    title: 'Reintroduction',
    tagline: 'The flat space is an instruction stream. Code and prompts, one shape.',
    arc: 'The Reintroduction',
    module: 'Chapter07',
    legacy: true,
  },
]

export function chapterBySlug(slug: string): Chapter | undefined {
  return chapters.find((c) => c.slug === slug)
}

// The introduction has no page of its own — it opens directly on its first
// section subpage. Every link to a chapter should resolve through this.
export function chapterHref(slug: string): string {
  return slug === 'introduction'
    ? `/chapters/introduction/${introSections[0].slug}/`
    : `/chapters/${slug}/`
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
