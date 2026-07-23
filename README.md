# Reflexads

![status: under open development](https://img.shields.io/badge/status-under%20open%20development-c98a3b)

> [!NOTE]
> **Under open development.** An exploratory framework, not a finished
> product. The Agda keeps the reasoning _consistent_, not _proven correct_.
> Expect gaps, revisions, and reframings.

An exploration of systems that contextually host their own conditions:
structures whose interactions feed back into the contexts that produce their
later behavior. The motivating case is the design of reliable AI harnesses,
where an engineer, a language model, and a processor condition each other
through one shared record of interactions.

## One source, three artifacts

| Artifact | What it is | Where |
| --- | --- | --- |
| **Agda library** | The machine-checked spine: definitions, laws, and universal properties, one standalone module per chapter | [`src/Reflexads/`](src/Reflexads/) |
| **Book** | The linear development, written in [Typst](https://typst.app); compiles to a PDF | [`book/`](book/) |
| **Site** | The interactive explainer, live at <https://oclbdk.github.io/reflexads> | [`site/`](site/) |

The Agda sources are the single source of truth for every piece of code on
display. Regions marked `-- >>> name` / `-- <<< name` are quoted verbatim by
the book and the site at build time, so neither can drift from code that
type-checks.

New here? Start with the site's
[chapter 1](https://oclbdk.github.io/reflexads/chapters/introduction/the-ai-harness-system/):
an interactive short book on the AI harness system, from a single button
press up to a harness that steers itself.

## Try it

Build locally (Agda 2.8, Typst 0.15+, Node):

```sh
make check                              # type-check the Agda library
make book                               # compile build/reflexads-book.pdf
cd site && npm install && npm run dev   # the site, hot-reloaded
```

This repo is meant to be forked. Running your own copy — your own record,
your own public instance — is the fastest way inside. The walkthrough lives
at [/contribute](https://oclbdk.github.io/reflexads/contribute/) and in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

```
reflexads.agda-lib          Agda library manifest (self-contained)
src/
  Everything.agda           imports every chapter module; check this to check all
  Reflexads/                one standalone module per chapter (07 layers on 06)
book/
  book.typ                  book entry point; includes each chapter
  lib/template.typ          styling + the agda() source-inclusion helper
  chapters/                 one .typ prose file per chapter
site/
  scripts/                  build-time extraction: Agda regions, git record
  src/app/                  Next.js pages
  src/components/site/demos/  the demo library (@xyflow/react)
Makefile                    check / book / watch / clean
.github/workflows/          deploys the site to GitHub Pages on push to main
```
