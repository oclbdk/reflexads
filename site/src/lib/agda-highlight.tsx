import { Fragment } from 'react'

// A small, corpus-tuned Agda highlighter. Shiki ships no Agda grammar, and our
// snippets are a controlled set, so we color just what aids reading: comments,
// keywords, the Set universe, and the unicode/arrow operators. Everything else
// renders default. Runs in a server component, so this is build-time only.

const KEYWORDS = new Set([
  'module', 'where', 'record', 'field', 'data', 'postulate', 'open', 'import',
  'public', 'using', 'renaming', 'hiding', 'private', 'infixl', 'infixr', 'infix',
  'mutual', 'abstract', 'instance', 'let', 'in', 'with', 'rewrite', 'constructor',
  'pattern', 'variable', 'syntax', 'do', 'forall',
])

// comment | Set-universe | word | operator
const TOKEN = /(--[^\n]*)|(Set(?:[₀₁₂₃₄₅₆₇₈₉ₙω])*)|([A-Za-z_][A-Za-z0-9_']*)|([→←λ∀≡×∘∙⊔⊓∷⟨⟩]|->)/gu

const CLS = {
  comment: 'text-zinc-400 italic dark:text-zinc-500',
  type: 'text-emerald-600 dark:text-emerald-400',
  keyword: 'text-violet-600 dark:text-violet-400',
  op: 'text-sky-600 dark:text-sky-400',
}

export function highlightAgda(code: string) {
  const out: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null

  while ((m = TOKEN.exec(code)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{code.slice(last, m.index)}</Fragment>)
    const [full, comment, setType, word, op] = m
    if (comment) {
      out.push(<span key={key++} className={CLS.comment}>{comment}</span>)
    } else if (setType) {
      out.push(<span key={key++} className={CLS.type}>{setType}</span>)
    } else if (word) {
      out.push(
        KEYWORDS.has(word) ? (
          <span key={key++} className={CLS.keyword}>{word}</span>
        ) : (
          <Fragment key={key++}>{word}</Fragment>
        ),
      )
    } else if (op) {
      out.push(<span key={key++} className={CLS.op}>{op}</span>)
    }
    last = m.index + full.length
  }
  if (last < code.length) out.push(<Fragment key={key++}>{code.slice(last)}</Fragment>)
  return out
}
