# Reflexads — interactive explainer

Companion site to the Reflexads book. Next.js static export, deployed to
GitHub Pages at <https://oclbdk.github.io/reflexads>.

## Stack

- **Next.js 16** static export (`output: 'export'`, `basePath: /reflexads`)
- **Tailwind CSS v4** + the **Catalyst** UI kit (components under `src/components/`)
- **Inter** self-hosted via `next/font` · **Heroicons** · **Motion**

## Live Agda

Code cards quote the same `-- >>> tag` / `-- <<< tag` regions the book quotes,
out of `../src/Reflexads/*.agda`. `scripts/extract-agda.mjs` runs on `predev` /
`prebuild` and writes `src/generated/agda.json`; `<CodeCard module tag />` reads
it. Editing an Agda source updates both the PDF and this site from one source.

## Structure

- `src/data/chapters.ts` — the 7-chapter progression grouped by arc; drives the
  sidebar, chapter chrome, and prev/next.
- `src/app/chapters/<slug>/page.tsx` — one page per chapter (web-native prose +
  live code + one interactive).
- `src/components/site/` — prose primitives, code cards, widget frames, and the
  interactive widgets (`widgets/writer.tsx`, `widgets/crdt.tsx`).

Two flagship interactives are built (Ch 2 Writer, Ch 6 CRDT); the other five are
labeled placeholders describing the planned interaction.

## Develop

```sh
npm install
npm run dev      # http://localhost:3000  (no basePath in dev)
npm run build    # static export to ./out  (basePath /reflexads)
```

## Deploy

`.github/workflows/deploy-pages.yml` builds and publishes `site/out` to Pages on
push to `main`. Enable Pages → Source: **GitHub Actions** in repo settings once.
