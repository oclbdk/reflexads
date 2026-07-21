#import "../lib/template.typ": agda

= Pinning Itself Down

Chapter 4 built self-hosting on the hosting face and never once looked over the
fence. But the machinery it used was not special to hosting. Every piece of it,
the growth, the regrounding, the round trip that settles flat in one step, has
a reflection on the owning face, and that reflection is a property the reflad has
had all along, waiting to be named. This chapter does not invent a dual. It
uncovers one. And the uncovering ends somewhere sharper than a resemblance.

== The reflection

Set the two faces side by side. The hosting face _grows_: `spread` takes a host
up a level, to a host of hosts. The owning face does the opposite: it
_collapses_. `flatten` takes a nested context back _down_ a level, to one. They
were mirror operations from the start; Chapter 4 leaned on one, and this chapter
leans on the other.

#agda("../../src/Reflexads/Chapter05.agda", tag: "reflad")

Self-hosting added a regrounding, `consolidate`, running the other way from
`spread`, and asked that the round trip settle flat in one step:
`consolidate ∘ spread = id`. Now reflect every arrow. The owning face's native
move is `flatten`, going _down_; its dual added move is an `expand`, going _up_;
and the dual demand is that _their_ round trip settle flat in one step:
`flatten ∘ expand = id`. Expand a value, collapse it back, and land exactly where
you began. That property is _self-selection_.

#agda("../../src/Reflexads/Chapter05.agda", tag: "selfselecting")

It is the same shape as self-hosting, arrow for arrow. Both are round trips that
return to where they started; both settle in one step. Which raises the obvious
question: if the two are mirror images down to the equation, do they differ at
all? They do, in two places: in what they _mean_, and, more surprisingly, not at
all in _when they hold_. Take those in turn.

== Where the mirror bends

Start with meaning, because an arrow-for-arrow reflection is a poor thing if the
two sides say the same. And note first what does _not_ separate them: both
properties are round trips that return you, so neither loses anything, neither
one keeps structure the other throws away. The difference is in what the settling
is _for_, and it turns on which face you stand on.

On the hosting face, settling buys _re-consultation_. If growing and regrounding
come back to the same flat host, you may consult your context, and consult it
again, and never spiral: the reading is stable under repetition. What
self-hosting gives is the freedom to _revisit_: to return to the same place
without minding how you got there. It trades in _sameness_.

On the owning face, settling buys something else. The owning face accumulates
structure that stands away from the ground, call it the _strain_, and
self-selection is the promise that the strain is held to an explicit condition it
cannot break. It does not make the strain vanish; it makes it _lawful_. What you
gain is not the freedom to revisit but a _constraint you can reason from_: a
statement of exactly what must hold of anything the owning face produces. It
trades in _legible difference_.

So reading equates, and writing constrains. One face gives you sameness you can
return to; the other, difference you can analyze. This is the owning face doing
to its conditions what Chapter 3's flexad did by hosting them, but from the other
side of the word: the flexad _hosts_ its conditions, holding them out to be read;
the reflad, self-selecting, _owns_ them explicitly, holding them to a form you
can reason about.

And that word, analyze, is not idle, which is the part worth slowing for. The
condition self-selection pins the strain to is `x ∙ x = x`, and idempotence is
never inert: the elements that satisfy it fall into a structure you can study.
Each is a fixed point of its own re-composition, and the fixed points stand in
relation (some absorbing others, some not) so the strain stops being a formless
distance from the ground and gains joints you can name. The invariant
self-selection reveals is not a bare equation; it is the start of an anatomy of
how a context may diverge.

That anatomy is sharpest in one corner. Let the band be _commutative_ as well,
and the relation among its elements straightens into a genuine order: the empty
ground at its foot, writing climbing it _monotonically_, up or nowhere, never
back. A commutative band _is_ a join-semilattice: the merge is the join,
idempotence is the merge being safe to repeat, monotonicity is convergence. It is
the lattice underneath every conflict-free replicated type, and self-selection,
stripped to the bone, is the guarantee a CRDT runs on. But that clean lattice is
bought, not given: commutativity is a ground forgetting the _order_ its
interactions came in, which the reflad was built to remember. The general
self-selecting ground keeps its order and settles for the rougher anatomy; the
climbable lattice is the reward for forgetting more, which is the trade this
chapter turns to next.

There is even a small tell in the machinery. Chapter 3 warned that the hosting
face rents a richer equality than the owning one: it reads functions of the
ground, and comparing functions cost an extra assumption. On this side there are
no functions to compare, only pairs, so the owning face pays no such rent: this
chapter's code stays inside Agda's `--safe` fragment, where Chapter 4's could
not. The reflection is not quite a mirror. The owning side is the more elementary
of the two.

== The same one step

The words _one step_ carry the same weight here, and it is worth spending them,
because it is the same word doing the same work from the other side.

Without it, how would the owning face reach a pinned, canonical form? It would
_iterate_: accumulate, and accumulate again, composing `m`, `m ∙ m`,
`m ∙ m ∙ m`, … and grinding toward a form that finally holds still: a normal
form reached only in the limit, with the same "have we stabilized yet?" question
Chapter 4 warned about. One-step self-selection refuses the grind. A single write
already lands on the pinned form; the invariant holds after one step, not after
normalizing toward it. `x ∙ x = x` is not something the accumulation approaches:
it is true the moment you write.

The engineer's mirror is exact. Chapter 4's idempotent _read_, safe to repeat,
meets Chapter 5's idempotent _write_: the upsert, the set insert, the merge that
lands on canonical state in one move, with no normalization to run afterward.
That both faces reach their rest in a single step, over the same ground, is not a
coincidence. It is the last thing to make precise.

== One condition

We have been saying the two properties share an engine. It is time to say it
exactly, because the truth is stronger than a shared example.

Chapter 4 showed that the hosting face settles flat in one step _exactly when_
the ground is idempotent, not merely that idempotence suffices, but that
self-hosting demands it. This chapter shows the same for the owning face, both
directions in a single pair of lines: the Writer self-selects by its canonical
expand exactly when the ground is idempotent.

#agda("../../src/Reflexads/Chapter05.agda", tag: "equivalence")

Now put the two together. Each face settles, by its canonical witness, if and
only if the ground is idempotent, so *the reading settles if and only if the
writing does.* These are not two
properties a ground might have one without the other. They are one condition,
wearing two faces. A ground either affords both, the reading collapsing flat and
the writing pinning its strain, each in a single step, or it affords neither.
The mirror was exact because there was never anything on the far side of it:
self-hosting and self-selection are the same demand, read forward and read back.

== The tradeoffs

One condition, then, and worth asking what it costs, because it is not free, and
the price is more specific than it first looks.

The first cost is a choice of tool between the two faces. To collapse is to gain
re-consultation and give up sight of differences; to pin is to gain a legible
constraint and keep the strain you must then carry. Self-hosting is what you want
when you mean to _revisit freely and not mind how you got there_; self-selection
is what you want when you mean to _reason about what you accumulated_. One
condition, but you lean on its two faces for opposite reasons, and rarely on both
for the same thing at once.

The second cost is the price of the condition itself, and here it pays to be
exact. A ground can forget two different things, independently. Commutativity
forgets _order_: a sequence becomes a multiset. Idempotence forgets
_multiplicity_: a multiset becomes a set. Self-hosting and self-selection demand
idempotence, and idempotence only: they cost you the count and leave the order
alone. You may still record what happened, and in what order; you may no longer
record _how many times_.

That is a sharper knife than "sacrifices richness." The band keeps a _set of what
is present_ and throws away the _log of how often_: it is the distinction
between state and history exactly. Self-selection is native to _state_: a
configuration, a set of members, a value that does not care how many writes
produced it. It is hostile to _history_: an audit trail, a retry that must count,
a sequence whose repetitions carry meaning. So it is a modeling decision worth
making on purpose, and early: ask whether your domain needs to _count_. If it
only ever needs to know what is currently the case (the present configuration,
the set of members, the latest value) you can model it as state, and the
self-properties are yours: idempotent merges, safe replays, conflict-free
convergence. If it needs the tally, how many times and in what exact succession,
you cannot have them, and you must keep the log. The reflad was invented, back in
Chapter 2, to accumulate causal history; the price of one-step self-holding is
that it must forget the part of history that counts, and keep only the part that
_orders_. Most grounds are not bands, and that is no defect: it is where the
counting lives. Self-hosting and self-selection are what a ground can reach _when
it is willing to forget how many times, but not in what order_.

== Where they meet

That leaves the two faces standing on the same narrow ground, the band, each a
single step from stillness: the hosting reading collapsing flat, the owning
writing pinned to its invariant. They have not yet been made to settle
_together_. The reflad still writes what the flexad only reads, and nothing yet
forces the flat form the one collapses onto to be the pinned form the other
selects. But over a band, both are one step from rest, and from the same place.
That coincidence, the flat and the pinned turning out to be one canonical form,
is the binding we have circled since Chapter 3, and it is the last thing left to
earn.
