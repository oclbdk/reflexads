// Book-wide styling and helpers.

#let book(title: "", author: "", status: "", body) = {
  set document(title: title, author: author)
  set page(
    paper: "a4",
    margin: (x: 3.5cm, y: 3.5cm),
    numbering: "1",
    number-align: center,
    footer: context {
      set text(size: 8pt, fill: luma(140))
      grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        if status != "" { status } else { [] },
        counter(page).display("1"),
        [],
      )
    },
  )
  set text(font: "New Computer Modern", size: 11pt, lang: "en")
  set par(justify: true, leading: 0.7em)
  set heading(numbering: "1.1")

  // Chapter headings start a new page.
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    v(2em)
    text(size: 22pt, weight: "bold", it)
    v(1em)
  }

  // Title page.
  align(center + horizon)[
    #text(size: 30pt, weight: "bold", title)
    #if status != "" [
      #v(1.2em)
      #text(size: 12pt, style: "italic", fill: luma(90), status)
    ]
    #if author != "" [
      #v(1em)
      #text(size: 14pt, author)
    ]
  ]
  pagebreak()

  outline(title: "Contents", depth: 2)

  body
}

// Include an Agda source file verbatim, optionally a named region between
//   -- >>> tag
//   ...
//   -- <<< tag
// markers, so prose can quote exactly the code that is machine-checked.
#let agda(path, tag: none) = {
  let src = read(path)
  let shown = if tag == none {
    src
  } else {
    let start = "-- >>> " + tag
    let end = "-- <<< " + tag
    let after = src.split(start).at(1)
    after.split(end).at(0).trim("\n")
  }
  block(
    fill: luma(245),
    inset: 10pt,
    radius: 4pt,
    width: 100%,
    raw(shown, lang: "agda", block: true),
  )
}
