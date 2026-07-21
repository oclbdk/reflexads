#import "../lib/template.typ": agda

= Buffering Itself

Chapter 4 gave the hosting face its fixed point; Chapter 5 gave the owning face
its own, dual to the first; and Chapter 5's last line proved the two are one
condition: the reading settles if and only if the writing does. But a shared
condition is not yet a shared _structure_. This chapter puts the two faces in
one room and finds what they build together.

Strip each face to the ground and it comes down to a single move. The owning
face _combines_: two stretches of context become one, `merge : (x, y) ↦ x ∙ y`,
the down-move, the writing. The hosting face _duplicates_: one becomes a pair,
`copy : x ↦ (x, x)`, the up-move, the reading. Mirror arrows, `M × M → M` and
`M → M × M`, on the one ground.

== The split

Compose them. Send a ground element up and back down (`merge ∘ copy`) and you
get `x ∙ x`; over a band that is `x` again, so `merge ∘ copy = id`. Send a pair
down and back up (`copy ∘ merge`) and you get an operation on the context
itself:

#agda("../../src/Reflexads/Chapter06.agda", tag: "split")

That composite, `buffer = copy ∘ merge`, is a _split idempotent_, and it is
worth knowing the name, because the structure is old and exact. An idempotent is
a map that does no more the second time than the first; it _splits_ when it
factors cleanly through a smaller object by a way down and a way up that undo
each other there. Here the smaller object is the flat ground, the way down is
`merge`, the way up is `copy`, and the undoing is `merge ∘ copy = id`. The two
faces are the two halves of one projection: the reading lifts the ground into
the context, the writing folds the context back onto the ground, and each
completes the other's round trip. They _reflect each other_, and that mutual
reflection is the self-duality of the last two chapters, made concrete. Not a
metaphor now. A retract.

== Floor and ceiling

There is a cleaner way to say what the split _is_, and it is the property this
chapter turns on. The two faces pull opposite ways. Chapter 4's reading lowers a
context toward the flat form it settles onto; Chapter 5's writing raises one
toward the canonical form it completes to. (What each does with a context that
does _not_ already settle, the single best form to reach, those chapters left
for later. Here we stand over a band, where every context settles, so the two
directions have somewhere definite to arrive.)

That somewhere is the retract, and it plays both parts at once. It is the _floor_
the reading settles down onto and the _ceiling_ the writing completes up to: the
same form, reached from either side. Neither move can push off it: `merge` sends
a divergent context down to it, `copy` holds it there, and `merge ∘ copy = id`.
Floor and ceiling are one. That is the self-dual universal property the chapter
turns on: the single form both moves agree on and neither can leave, unchanged
when you swap `copy` for `merge`, up for down, reading for writing, because it
names the axis the whole mirror turns around. Chapter 4 leaned down and Chapter 5
up; the split is _self_-dual, the still point where both faces have nowhere left
to go.

== One flush into the flat

We have met this shape before, twice, and it is worth naming what is new. Chapter
4 called it _one step into a flat space_: the hosting face going up a level and
settling flat again in a single move. Chapter 5 found the same on the owning
side. Here it is the whole bound structure at once. And the plainest name for it
is a _buffer_.

Read the split as one. The context is the raised, two-level thing, holding more
than the ground can; `merge` flushes it down to the flat ground; `copy`
re-presents the settled result. The flat ground is the retract: the buffer's
canonical held state. And over a band the buffer settles in _one flush_, and
holds:

#agda("../../src/Reflexads/Chapter06.agda", tag: "holds")

That is the significance for the reflexad, and it is larger than either face
alone. Chapter 4 tamed the reading's spiral; Chapter 5 tamed the writing's
bloat; each on its own, one face at a time. Bound into the buffer, over a band,
both are tamed _together_, and in the _same_ step: one flush lands the entire
context (reading and writing at once) on the flat ground, and re-flushing moves
nothing. The reflexad does not approach its stable form over many steps; it
arrives in a single flush and never moves again. That flat retract, reached and
held, is the still point Chapter 1 promised, the place a cycle rests when it
holds itself up, now for the whole structure rather than a face. This is what it
means, at last, for a reflexad to be one-step idempotent into a flat space.

And it is one condition wearing a third face. The flexad self-hosts, the reflad
self-selects, the reflexad self-buffers, and the companion module carries all
three, full, and relates them in a breath: over an idempotent ground, every one
of them holds, at once.

#agda("../../src/Reflexads/Chapter06.agda", tag: "coincide")

Three universal properties, one condition on the ground. The reflexad
self-buffers if and only if its flexad self-hosts if and only if its reflad
self-selects, because all three are `x ∙ x = x`, read from three sides.

Step back and feel the size of that. Six chapters, a hosting face and an owning
face, a monad and a comonad, a ground, a pair, a binding, and they have folded
into a single equation about how two interactions compose. Everything the book
built was one condition, turned to face us from as many sides as we had patience
to turn it. That is not a loss of content; it is what a synthesis is. The
elaboration was the road. The condition was always the town.

== CRDTs as self-buffers

If this sounds like something you have built, it is. Read the two halves as
distributed operations: `copy` is _replication_ (a state sent out to replicas)
and `merge` is _reconciliation_ (two replica states joined back to one). Then
every piece of the buffer is a piece of a CRDT. `merge ∘ copy = id` (replicate
a state and reconcile it back and nothing changes) is the conflict-free type's
whole guarantee: duplicate delivery, re-gossip, merging with a copy of yourself,
all no-ops. The flat retract is the space of _converged_ states; the context is
divergent replicas; and the buffer being a split idempotent over a band is
exactly why the system settles onto a converged value and stays there. A CRDT is
a self-buffer: replication and reconciliation reflecting each other until the
divergence flushes onto a shared ground.

That is also the recipe, if you are building one. To make something that
converges without a coordinator, no lock, no consensus round, you do not
orchestrate the replicas; you make the merge _reconcile_ them onto a shared
ground and make it _idempotent_, so that duplicated and re-delivered updates
cannot break it. Convergence becomes a property of the structure, not of the
schedule.

One honest line of scope, the same knife as Chapter 5. A _classic_ CRDT, where
any merge schedule reaches the same value, needs the band to be commutative:
order-free convergence. The general, non-commutative band buffers just as safely
against duplication, but stays order-sensitive: a last-writer-wins register
rather than a grow-only set. Idempotence buys duplicate-safety; commutativity on
top buys schedule-independence. Which is the seam this chapter stops at.

== Two directions, one arrow

There is one thing the self-duality does _not_ do, and it is the thing that keeps
the ending honest. Self-dual means unchanged when you swap the two faces:
reading for writing, up for down. It does not mean unchanged when you swap
forward for backward in time. Those are different symmetries, and the still point
keeps only the first. Because self-buffering is idempotence and not commutativity,
Chapter 5's knife again, the ground beneath the still point may be as ordered,
as causal, as non-commutative as it likes. The two faces fuse into a single act,
and the arrow of that act still points somewhere. The present, if we may risk the
word, faces two directions at once (the forward of the writing, the backward of
the reading) and holds them consistent without collapsing either into the other,
and without surrendering which way time runs. That the binding leaves the arrow
intact is the whole reason the next chapter has anything to read forward and
back.

It is not free, and the cost is the one Chapter 5 named, now charged to the whole
structure. To stand at the still point a ground must be a band; it must forget
how many times. A reflexad holds itself up in one flush only over a ground
willing to give up its count. Keep the count and you keep the richer, tallying
history, but you lose the single-step stillness, and you are back to a structure
that must _work_ to stay coherent rather than one that simply _is_. The still
point is a place a ground can reach, not a place every ground sits.

And notice, last, what the buffer has quietly put down. It reconciles _to_ a
stable ground; it never asks in _what order_ the interactions that built that
ground arrived. Idempotence is the stability; order is a separate thing entirely,
the ground's non-commutativity, and the buffer has said nothing about it. That
was deliberate. Buffering is the ground's _stability_ face; sequencing is its
_order_ face, and they are not the same chapter. This one spent the stability. The
order is still whole.

For a last look, let the buffer suggest what it resembles, and no more. A
structure with two halves that reflect each other, one projecting outward, one
folding back, settling in a single step onto a stable form it then holds: that
is the shape of a feedback loop that has found its rest, a thing that conditions
itself to a stable state. We will not lean on the resemblance here. But the next
chapter takes it up in earnest: the order this one set aside, the causal
dependency cycles from the very first pages, and why a self-reflecting buffer
that stabilizes itself is worth reading as a model of how an expectation and an
explanation meet in a present. The still point, it turns out, has a physics. That
is where we end.
