.PHONY: all check book watch clean

BUILD    := build
BOOK_PDF := $(BUILD)/reflexads-book.pdf

all: check book

# Type-check the whole Agda library (every chapter, via Everything).
check:
	agda src/Everything.agda

# Build the book PDF. Depends on check so no chapter is quoted unless it
# type-checks.
book: check | $(BUILD)
	typst compile --root . book/book.typ $(BOOK_PDF)

# Live-recompiling PDF for writing sessions (does not re-run Agda).
watch: | $(BUILD)
	typst watch --root . book/book.typ $(BOOK_PDF)

$(BUILD):
	mkdir -p $(BUILD)

clean:
	rm -rf $(BUILD)
	find src -name '*.agdai' -delete
