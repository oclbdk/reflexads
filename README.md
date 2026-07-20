# Reflexads — book & Agda library

A book (written in [Typst](https://typst.app)) developed hand-in-hand with
a machine-checked [Agda](https://agda.readthedocs.io) library. Each chapter
is a pair: a prose file under `book/chapters/` and a companion module under
`src/Reflexads/`. The book quotes its code directly from the Agda sources at
build time, so the two never drift apart.

Each chapter module is **standalone**: it defines everything it needs
(including primitives like propositional equality) and imports nothing from
other chapters or a shared prelude, so a chapter can be read on its own.

## Layout

```
reflexads.agda-lib        Agda library manifest (self-contained)
src/
  Everything.agda         imports every chapter module; check this to check all
  Reflexads/
    Chapter01.agda        standalone companion code for chapter 1 (--safe)
    Chapter02.agda        standalone companion code for chapter 2 (--safe)
    Chapter03.agda        standalone companion code for chapter 3 (postulates funext)
    Chapter04.agda        standalone companion code for chapter 4 (postulates funext)
book/
  book.typ                book entry point; includes each chapter
  lib/template.typ        styling + the `agda()` source-inclusion helper
  chapters/
    01-introduction.typ                 chapter 1 prose
    02-contextualized-ownership.typ     chapter 2 prose
    03-situated-on-shared-ground.typ    chapter 3 prose
    04-holding-itself-up.typ            chapter 4 prose
Makefile                  check / book / watch / clean
```

Chapters 1 and 2 are individually `--safe`; Chapters 3 and 4 step out of
`--safe` to postulate function extensionality (their hosting face reads
functions of the ground).

## Building

```sh
make check   # type-check the whole Agda library
make book    # type-check, then compile build/reflexads-book.pdf
make watch   # live-recompile the PDF while writing
```

Requires `agda` (2.8) and `typst` (0.15+). The Agda library is self-contained
— no external library dependencies.

## Adding a chapter

1. Create `src/Reflexads/ChapterNN.agda` (standalone — define what it needs,
   import nothing from other chapters) and add `import Reflexads.ChapterNN` to
   `src/Everything.agda`.
2. Create `book/chapters/NN-title.typ` and add
   `#include "chapters/NN-title.typ"` to `book/book.typ`.
3. Quote checked code into the prose with
   `#agda("../../src/Reflexads/ChapterNN.agda", tag: "name")`, delimiting the
   region in the Agda source with `-- >>> name` / `-- <<< name`.
```
