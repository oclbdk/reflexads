#import "../lib/template.typ": agda

= Contextualized Ownership

Chapter 1 asked you to believe that a reflexad _hosts its own conditions_ —
that the rule you lean on when you regroup a chain of steps is kept by the
structure itself, in the structure's own terms. That was an invitation, and
invitations get to wave their hands. But you can't actually reason about a
structure owning its ground while the ground stays invisible, and so far it
has: a reflexad carries _some_ context, and we never said what, or where the
conditions it keeps actually live. This chapter makes the ground concrete
enough to hold.

== The ground was already there

Look again at the one law Chapter 1's reflexad kept. The monad underneath it
carried exactly one promise you leaned on — regroup a chain of steps however
you like, the meaning doesn't change — and there was exactly one thing you
were never allowed to do: reorder them. Those aren't two offhand remarks.
They are the two defining conditions of a very small, very familiar algebraic
structure. Regroup-freely is _associativity_. Never-reorder is the _absence
of commutativity_. Put a unit underneath them — an empty, starting context,
the thing `own` hands you — and what you have is a _monoid_.

So the interaction space the reflexad's fold was quietly composing over has a
name and a shape all along. We'll call it the *Ground*: the place where
contexts combine.

#agda("../../src/Reflexads/Chapter02.agda", tag: "monoid")

== Interactions and their conditions

It is worth slowing down on what a monoid actually is, because two readings of
it run through the rest of this book, and the Ground is where they meet.

Read the elements first. Each one is an _interaction_ — a happening, a step's
worth of context, something the computation did. The operation `∙` composes
two of them into one: this, then that, folded into a single combined
interaction. The unit is the _null_ interaction, the one that does nothing —
the empty context you start from before anything has happened. On this reading
a monoid is just a space of interactions and a way of running them one after
another, which is already most of what a context _is_: an accumulated history
of what happened, carried along as a computation runs.

Now read the laws, because they are the second thing the Ground carries, and
the one this book cares about most. A monoid's laws are not decoration on its
interactions; they are _conditions_ the interactions must obey, and the
central one earns its keep. Associativity is what makes "a run of interactions"
a coherent idea at all: if grouping mattered, a sequence of three interactions
would have two possibly-different meanings depending on which pair you combined
first, and "the context so far" would be ambiguous. Associativity is the
condition that says the sequence alone settles the result — the bracketing is
yours to choose, the same freedom you use every time you refactor. So a monoid
is two things at once: a set of interactions, and the conditions those
interactions satisfy. That is precisely why it models the Ground — it is an
interaction space that _carries its own conditions_, bundled into a single
object, which is the property this whole book is chasing.

And it is calibrated to carry no more and no less than it should. It has a
unit, because a context needs somewhere to start — the empty history, before
anything happened. It is associative, so a sequence has an unambiguous meaning.
It is _not_ commutative — no law trades `x ∙ y` for `y ∙ x` — because the order
interactions happened in is part of what happened. And, the deliberate
omission, it has no inverses: nothing un-does an interaction, because a causal
history cannot be run backwards. Reach for less and a sequence stops being
well-defined; reach for more, all the way to a group, and you have quietly
assumed everything can be undone. The monoid sits exactly where interactions
can be composed and remembered but not reversed. It is the algebra of things
that have happened.

== The tower

A bare monad is silent about what it carries. It hands you `return` and bind
and a promise that they cohere, but the context itself stays sealed inside the
type — you can sequence it, never inspect it. That was fine for an invitation.
It is not enough for a book about structures that own their conditions,
because you cannot watch something own a thing you cannot see.

So we start giving these structures our own names, because we are not really
talking about bare monads and monoids anymore. Chapter 1's reflexad — a monad
wearing its reflexive operations — was really an owning face standing on its
own. We'll call that face a *Reflad*: a monad, seen as something that owns.

#agda("../../src/Reflexads/Chapter02.agda", tag: "reflad")

Now do the same on the other side. The monoid we uncovered is not just any
algebra; it is the interaction space our contexts compose on. So we wrap it in
the name we've been using — a *Ground* — exactly the way a Reflad wraps a monad:

#agda("../../src/Reflexads/Chapter02.agda", tag: "ground")

For now the Ground adds nothing to the monoid but a name, and the name is the
point: a Reflexad stands on it, and, later, a second face will stand on the
same one.

And a *Reflexad* is the two brought together: a Reflad standing on a Ground. It
is parameterized by the ground it owns, and its owning face carries that
ground — every value paired with the ground accrued so far.

#agda("../../src/Reflexads/Chapter02.agda", tag: "reflexad")

That is the whole tower. A monad and a monoid at the bottom — the bare notions;
a Reflad and a Ground wrapping them — our variants; and a Reflexad standing a
Reflad on a Ground. For now the reflexad has just the one face, its reflad —
the owning half. It is built to _stand on_ a ground rather than to _contain_
one for a reason: the ground is meant to be shared. A second face will stand on
the very same ground in a later chapter, and the reflexad will become the pair.
That shared ground is why the name has always run longer than "reflad."

== The conditions come from the ground

That pairing — a value beside the ground accrued so far — is a structure with a
name. `own` starts from the empty ground; binding _accumulates_, composing the
ground you had with the ground each step brings, by the monoid. It is the
*Writer*, the owning face of every reflexad over a ground.

If you've met the pattern where a computation carries a running log, or a
tally, alongside its result, this is that pattern seen for what it is: not a
logging trick, but a structure owning its context by accumulating it on a
ground it can name. And now ask where its coherence comes from — the promise
that regrouping a chain doesn't change its meaning. It is not an axiom the
structure simply keeps, the way Chapter 1's reflexad kept its laws. It is
_inherited_:

#agda("../../src/Reflexads/Chapter02.agda", tag: "inherited")

Read that line for what it says. The reflad's associativity — the monad law —
is nothing but the monoid's associativity, handed up from the Ground it stands
on. The structure does not _assume_ its central condition; it _gets_ it, from
the ground it owns. (The unit laws come the same way.) This is the first
concrete thing we can point at when we say a structure hosts its own
conditions: the condition is sourced from the ground, not decreed from
outside. It is a small instance — one law, one ground — but it is real, and it
is the shape the rest of the book keeps widening.

== One ground, more than one use

One last thing, left deliberately unfinished. Nothing about the Ground insists
it be _accumulated_. We built the Reflad to own the ground by piling it up,
step after step — but a ground is only an interaction space, and there is more
than one way to stand on one. A structure could, instead of building context,
be _situated_ in it: reading the same ground rather than accruing it. That is
a different face entirely, and it is where we turn next. For now it is enough
that the ground is concrete, and that one structure owns it.
