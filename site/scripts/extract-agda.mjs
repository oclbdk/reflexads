// Build-time extractor: pulls the same `-- >>> tag` / `-- <<< tag` regions the
// book quotes out of the Agda sources, so the site quotes live from source.
// Mirrors book/lib/template.typ exactly: split on the start marker, take what
// follows, split on the end marker, keep the head, trim surrounding newlines.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const agdaDir = join(repoRoot, 'src', 'Reflexads')
const outDir = join(here, '..', 'src', 'generated')

function extract(src, tag) {
  const start = '-- >>> ' + tag
  const end = '-- <<< ' + tag
  const afterParts = src.split(start)
  if (afterParts.length < 2) return null
  const after = afterParts[1]
  return after.split(end)[0].replace(/^\n+/, '').replace(/\n+$/, '')
}

function tagsIn(src) {
  const tags = []
  for (const m of src.matchAll(/^\s*-- >>> (\S+)\s*$/gm)) tags.push(m[1])
  return tags
}

const result = {}
for (const file of readdirSync(agdaDir).filter((f) => /^Chapter\d+\.agda$/.test(f))) {
  const key = file.replace(/\.agda$/, '') // e.g. "Chapter02"
  const src = readFileSync(join(agdaDir, file), 'utf8')
  const regions = {}
  for (const tag of tagsIn(src)) {
    const code = extract(src, tag)
    if (code != null) regions[tag] = code
  }
  result[key] = regions
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'agda.json'), JSON.stringify(result, null, 2) + '\n')

const count = Object.values(result).reduce((n, r) => n + Object.keys(r).length, 0)
console.log(`extract-agda: ${count} regions across ${Object.keys(result).length} chapters`)
