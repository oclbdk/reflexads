// Build-time extractor for the repo's own revision history — the canonical
// span records chapter 2's demos run on. The schema is deliberately the shape
// a learn-from-subsequences loop would consume: each span carries its hands
// (author + co-author trailers), its strata fingerprint (code/prose/data by
// path), and its churn, in-band. Deterministic consumers today (demos), the
// same interface for any future consumer.
//
// Writes src/generated/git.json. Generated, never committed: derived
// artifacts stay off the ground. Degrades gracefully (empty record) when git
// or full history is unavailable.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const outDir = join(here, '..', 'src', 'generated')
const outFile = join(outDir, 'git.json')

const MAX_FILES_PER_COMMIT = 12

// The strata classifier: the honest mechanical rule mapping a path to the
// stratum its churn counts toward. Site pages are .tsx and count as code even
// where they carry prose — the rule is by medium, and stated as such.
function stratumOf(path) {
  if (/\.(typ|md)$/.test(path)) return 'prose'
  if (/\.(agda|ts|tsx|js|mjs|css|agda-lib)$/.test(path) || /(^|\/)Makefile$/.test(path)) return 'code'
  return 'data'
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function extract() {
  const US = '' // field separator
  const RS = '' // trailer-value separator

  // Pass 1: one metadata line per commit, oldest first.
  const metaRaw = git([
    'log', '--reverse',
    `--format=%h${US}%H${US}%an${US}%aI${US}%s${US}%(trailers:key=Co-Authored-By,valueonly,separator=${RS})`,
  ])
  const commits = []
  const byHash = new Map()
  for (const line of metaRaw.split('\n')) {
    if (!line.trim()) continue
    const [hash, full, author, date, subject, trailers] = line.split(US)
    const coAuthors = (trailers ?? '')
      .split(RS)
      .map((t) => t.replace(/<[^>]*>/g, '').trim())
      .filter(Boolean)
    const c = {
      hash, full, author, date, subject, coAuthors,
      strata: { code: 0, prose: 0, data: 0 },
      churn: 0,
      files: [],
      moreFiles: 0,
    }
    commits.push(c)
    byHash.set(hash, c)
  }

  // Pass 2: numstat per commit.
  const statRaw = git(['log', '--reverse', '--numstat', '--format=@@%h'])
  let current = null
  for (const line of statRaw.split('\n')) {
    if (line.startsWith('@@')) {
      current = byHash.get(line.slice(2).trim()) ?? null
      continue
    }
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (!m || !current) continue
    const adds = m[1] === '-' ? 0 : Number(m[1])
    const dels = m[2] === '-' ? 0 : Number(m[2])
    const path = m[3]
    const stratum = stratumOf(path)
    current.strata[stratum] += adds + dels
    current.churn += adds + dels
    current.files.push({ path, adds, dels, stratum })
  }

  // Keep each commit's file list bounded: top files by churn.
  for (const c of commits) {
    c.files.sort((a, b) => b.adds + b.dels - (a.adds + a.dels))
    if (c.files.length > MAX_FILES_PER_COMMIT) {
      c.moreFiles = c.files.length - MAX_FILES_PER_COMMIT
      c.files = c.files.slice(0, MAX_FILES_PER_COMMIT)
    }
  }

  const builtFrom = git(['rev-parse', '--short', 'HEAD']).trim()
  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true'

  // The remote, normalized to a browsable URL, so demos can link each
  // revision to its page — and forks link to their own record for free.
  let remote = null
  try {
    remote = git(['config', '--get', 'remote.origin.url'])
      .trim()
      .replace(/^git@([^:]+):/, 'https://$1/')
      .replace(/\.git$/, '')
  } catch {
    // no remote — links degrade to plain text
  }

  return { builtFrom, shallow, remote, commits }
}

let record
try {
  record = extract()
  if (record.shallow) {
    console.warn('[extract-git] shallow clone — history is incomplete (need fetch-depth: 0 in CI)')
  }
} catch (err) {
  console.warn('[extract-git] no git history available, writing empty record:', err.message?.split('\n')[0])
  record = { builtFrom: null, shallow: true, remote: null, commits: [] }
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify(record, null, 1))
console.log(`[extract-git] ${record.commits.length} revisions -> src/generated/git.json (built from ${record.builtFrom ?? 'n/a'})`)
