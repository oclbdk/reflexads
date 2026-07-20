#import "lib/template.typ": book

#show: book.with(
  title: "Reflexads Book",
)

#include "chapters/01-introduction.typ"
#include "chapters/02-contextualized-ownership.typ"
#include "chapters/03-situated-on-shared-ground.typ"

// Add each new chapter here as it is written:
// #include "chapters/04-....typ"
