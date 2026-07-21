// The introduction chapter's sections, one subpage each. Order drives the
// numbering, the index listing, and prev/next pagination.

export interface IntroSection {
  slug: string
  title: string
}

export const introSections: IntroSection[] = [
  { slug: 'the-ai-harness-system', title: 'The AI Harness System' },
  { slug: 'interactions-as-sequences', title: 'Interactions as Sequences' },
  { slug: 'roles-as-monads', title: 'Roles as Monads' },
  { slug: 'the-role-of-cpu', title: 'The Role of CPU' },
  { slug: 'the-role-of-llm', title: 'The Role of LLM' },
  { slug: 'the-role-of-engineer', title: 'The Role of Engineer' },
  { slug: 'the-reflexadic-form', title: 'The Reflexadic Form' },
]
