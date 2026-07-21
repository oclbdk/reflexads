# Reflexads

![status: under open development](https://img.shields.io/badge/status-under%20open%20development-c98a3b)

> [!NOTE]
> **Under open development.** This is an exploratory framework, not a finished
> product or documentation yet. The Agda keeps the reasoning _consistent_, not
> _proven correct_. Expect gaps, revisions, and reframings. Feedback and
> discussion welcome.

An exploration of systems that contextually host their own conditions:
structures whose interactions feed back into the contexts that produce their
later behavior. The motivating case is the design of reliable AI harnesses,
where an engineer, a language model, and a processor condition each other
through one shared record of interactions.

## One source, three artifacts

This repository is three views of the same body of work:

| Artifact | What it is | Where |
| --- | --- | --- |
| **Agda library** | The machine-checked spine: definitions, laws, and universal properties, one standalone module per chapter | [`src/Reflexads/`](src/Reflexads/) |
| **Book** | The linear development, written in [Typst](https://typst.app); compiles to a PDF | [`book/`](book/) |
| **Site** | The interactive explainer, live at <https://oclbdk.github.io/reflexads> | [`site/`](site/) |

The Agda sources are the single source of truth for every piece of code on
display. Regions are delimited in the sources with `-- >>> name` /
`-- <<< name` markers; the book's `#agda()` helper and the site's
`extract-agda.mjs` both quote those exact regions at build time. Neither the
PDF nor the site can drift from code that type-checks.

The book and the site differ in register and in currency:

- **The book** develops the theory linearly across seven chapters, from
  contextualized ownership through to the reflexad synthesis. It is the
  archival, citable form.
- **The site** is where the framing is actively evolving. Its
  [chapter 1](https://oclbdk.github.io/reflexads/chapters/introduction/the-ai-harness-system/)
  is a standalone interactive short book on the **AI Harness system**: seven
  sections of live diagrams that build from a single button press up to a
  precise ownership model of how a harness's interactions influence its own
  later behavior. The site's remaining chapters are legacy placeholders from
  the book's framing, marked as such on the page, and are being reworked one
  at a time to match chapter 1.

If you are new here, start with the site's chapter 1.

## The Agda library

Each chapter module is **standalone**: it defines everything it needs,
including primitives like propositional equality, and imports nothing from
other chapters or a shared prelude, so a chapter can be read on its own. The
one deliberate exception is Chapter 7, the finale, which imports Chapter 6 and
enriches it without reopening it: the compositional layering it is about.

Chapters 1, 2, and 5 are individually `--safe`. Chapters 3, 4, and 6 step out
of `--safe` to postulate function extensionality (the hosting face reads
functions of the ground). Chapter 6 is the climax module: it carries the full
Reflad, Flexad, and Reflexad with their three universal properties and relates
them, which brings the hosting face, and its funext, back in.

## Layout

```
reflexads.agda-lib          Agda library manifest (self-contained)
src/
  Everything.agda           imports every chapter module; check this to check all
  Reflexads/
    Chapter01.agda ...      one standalone module per chapter (07 layers on 06)
book/
  book.typ                  book entry point; includes each chapter
  lib/template.typ          styling + the agda() source-inclusion helper
  chapters/                 one .typ prose file per chapter
site/
  scripts/extract-agda.mjs  pulls the tagged Agda regions into src/generated/
  src/app/                  Next.js pages; chapter 1 lives on section subpages
  src/components/site/flow/ the interactive widget library (@xyflow/react)
  src/data/chapters.ts      chapter progression; legacy flags live here
Makefile                    check / book / watch / clean
.github/workflows/          deploys the site to GitHub Pages on push to main
```

## Building

**Agda and book** (requires `agda` 2.8 and `typst` 0.15+; the Agda library has
no external dependencies):

```sh
make check   # type-check the whole Agda library
make book    # type-check, then compile build/reflexads-book.pdf
make watch   # live-recompile the PDF while writing
```

**Site** (requires Node; the Agda extraction runs automatically before dev and
build):

```sh
cd site
npm install
npm run dev     # local dev server
npm run build   # static export to site/out/
```

Pushes to `main` deploy the site to GitHub Pages.

## Adding a chapter

1. Create `src/Reflexads/ChapterNN.agda` (standalone: define what it needs,
   import nothing from other chapters) and add `import Reflexads.ChapterNN` to
   `src/Everything.agda`.
2. Create `book/chapters/NN-title.typ` and add
   `#include "chapters/NN-title.typ"` to `book/book.typ`.
3. Delimit quotable regions in the Agda source with `-- >>> name` /
   `-- <<< name`. The book quotes one with
   `#agda("../../src/Reflexads/ChapterNN.agda", tag: "name")`; the site picks
   up every tagged region automatically and renders one with
   `<CodeCard module="ChapterNN" tag="name" />`.
