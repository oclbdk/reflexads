#import "lib/template.typ": book

#show: book.with(
  title: "Reflexads Book",
)

#include "chapters/01-introduction.typ"
#include "chapters/02-chapter-two.typ"

// Add each new chapter here as it is written:
// #include "chapters/03-....typ"
