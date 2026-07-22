// The curated inflection points of this repo's own history — the spans that
// most informed the project's direction, selected by judgment, not churn.
//
// This file is itself a landed consolidation: extracted from a review of the
// record (the span its commit's Derived-From trailer names), folded into
// these annotations, and committed back. The commit that lands it appears in
// the same timeline these entries annotate. Churn found some of these spans
// on its own; the ones it missed are the reason this file exists.

export interface Inflection {
  /** Short hash of the anchor revision. */
  hash: string
  title: string
  why: string
}

export const inflections: Inflection[] = [
  {
    hash: '95795a0',
    title: 'Bootstrapping',
    why: 'The book written in one burst: seven spec-and-prose pairs landed together, and at the end of the day the first voice-rule sweep — the style guide in embryo.',
  },
  {
    hash: 'b57b168',
    title: 'The site is born',
    why: 'A third artifact opens on the same ground: the explainer face, and the first span with a heavy data stratum.',
  },
  {
    hash: '18e3683',
    title: 'The pivot',
    why: 'Chapter 1 rebuilt as the AI harness system — the largest span in the record. Inside the same revision, the co-author trailer changes: the harness swapped its model instance, and the ground kept the receipt.',
  },
  {
    hash: 'b8045ab',
    title: 'The reflexive turn',
    why: 'This repo becomes its own subject. Statistically invisible — a scaffold of stubs — and the hinge the back half of the project turns on. Churn cannot see this one.',
  },
]
