// Typed accessor over the regions extracted from the Agda sources at build time.
import regions from '@/generated/agda.json'

type Regions = Record<string, Record<string, string>>

export function agdaRegion(module: string, tag: string): string {
  const code = (regions as Regions)[module]?.[tag]
  if (code == null) {
    throw new Error(`No Agda region "${tag}" in module "${module}". Run: npm run extract`)
  }
  return code
}
