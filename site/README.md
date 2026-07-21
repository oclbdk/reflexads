# Reflexads — interactive explainer

The interactive face of the Reflexads work. Next.js static export, deployed to
GitHub Pages at <https://oclbdk.github.io/reflexads>. Chapter 1 is the current
framing: a standalone interactive short book on the AI Harness system, split
into seven section subpages. Chapters 2–7 are legacy placeholders from the
book's framing (flagged in `src/data/chapters.ts`), reworked incrementally.

## Stack

- **Next.js 16** static export (`output: 'export'`, `basePath: /reflexads`)
- **Tailwind CSS v4** + the **Catalyst** UI kit (components under `src/components/`)
- **@xyflow/react** for the interactive diagrams
- **Inter** self-hosted via `next/font` · **Heroicons** · **Motion**

## Live Agda

Code cards quote the same `-- >>> tag` / `-- <<< tag` regions the book quotes,
out of `../src/Reflexads/*.agda`. `scripts/extract-agda.mjs` runs on `predev` /
`prebuild` and writes `src/generated/agda.json`; `<CodeCard module tag />` reads
it. Editing an Agda source updates both the PDF and this site from one source.

## Structure

- `src/data/chapters.ts` — the 7-chapter progression; drives the sidebar,
  chapter chrome, prev/next, and the legacy flags.
- `src/data/intro-sections.ts` — chapter 1's seven sections (1.1–1.7), one
  subpage each under `src/app/chapters/introduction/<section-slug>/`.
- `src/app/chapters/<slug>/page.tsx` — one page per legacy chapter.
- `src/components/site/flow/` — the interactive widget library: 20 xyflow
  widgets on a shared `FlowCanvas`, one file per widget.
- `src/components/site/` — prose primitives, code cards, widget frames and
  error boundaries, the section shell, and the session recorder
  (`you-recorder.tsx` + `src/lib/you-stream.ts`: in-memory only, feeds the
  Role of You widget across chapter 1's subpages).

## Develop

```sh
npm install
npm run dev      # http://localhost:3000  (no basePath in dev)
npm run build    # static export to ./out  (basePath /reflexads)
```

## Deploy

`.github/workflows/deploy-pages.yml` builds and publishes `site/out` to Pages on
push to `main`. Enable Pages → Source: **GitHub Actions** in repo settings once.
