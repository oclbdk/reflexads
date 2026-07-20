# Reflexads — book & Agda library

A book (written in [Typst](https://typst.app)) developed hand-in-hand with
a machine-checked [Agda](https://agda.readthedocs.io) library. Each chapter
is a pair: a prose file under `book/chapters/` and a companion module under
`src/Reflexads/`. The book quotes its code directly from the Agda sources at
build time, so the two never drift apart.

## Layout

```
reflexads.agda-lib        Agda library manifest (depends on standard-library)
src/
  Everything.agda         imports every chapter module; check this to check all
  Reflexads/
    Prelude.agda          shared stdlib re-exports
    Chapter01.agda        companion code for chapter 1
book/
  book.typ                book entry point; includes each chapter
  lib/template.typ        styling + the `agda()` source-inclusion helper
  chapters/
    01-introduction.typ   chapter 1 prose
Makefile                  check / book / watch / clean
```

## Building

```sh
make check   # type-check the whole Agda library
make book    # type-check, then compile build/reflexads-book.pdf
make watch   # live-recompile the PDF while writing
```

Requires `agda` (2.8) with `standard-library` registered, and `typst` (0.15+).

## Adding a chapter

1. Create `src/Reflexads/ChapterNN.agda` and add `import Reflexads.ChapterNN`
   to `src/Everything.agda`.
2. Create `book/chapters/NN-title.typ` and add
   `#include "chapters/NN-title.typ"` to `book/book.typ`.
3. Quote checked code into the prose with
   `#agda("../../src/Reflexads/ChapterNN.agda", tag: "name")`, delimiting the
   region in the Agda source with `-- >>> name` / `-- <<< name`.
```
