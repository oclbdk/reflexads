#import "../lib/template.typ": agda

= Situated on Shared Ground

Chapter 2 built a structure that _owns_ its ground. The Reflad writes it,
forward, step after step — every value carrying the history it has piled up,
`own` starting the pile from nothing. It possesses what it produces. But
_owning_ is only half of what the title of this book asks for. To _host_ your
own conditions is more than to produce them: it is to _provide_ them — to hold
the ground out as the place a value resides, where it can be read back. And
Chapter 2's structure only ever wrote. Its ground was owned and never hosted:
laid down, never held out; produced, never read. One-way. Not yet a cycle.

This chapter builds the other face — the one that _hosts_. And with it the
book's own word finally lands: a structure that both owns and hosts its ground
is one that hosts its own conditions.

== The other stance

Owning a context and hosting one are different stances, and the difference is
worth feeling before we name the structure.

To _own_ a context is to produce it and possess it. A monad is the owning
structure: you can always put a value in — `own`, `return` — and it accumulates
what you build; what you cannot do, in general, is get a value back out. You
make context. That was Chapter 2.

To _host_ a context is the other stance: not to produce it but to _provide_ it —
to be the place a value resides, and to hold that place out to be read. You did
not build this context; you are the one that offers it. What can you do? You can
always read the value that resides here, at this position — and lay out the
whole surrounding context from where you stand. What you cannot do, in general,
is inject. You do not make context; you _host_ it. That stance has a structure
too, the exact mirror of the monad, and it is called a *comonad*.

#agda("../../src/Reflexads/Chapter03.agda", tag: "comonad")

Its two operations are the monad's, dualized. Where the monad had `return` —
put a value in — the comonad has `extract`: read the value residing here. Where
the monad had bind — sequence a step onto the context it owns — the comonad has
`_=>>_`: extend a reading across the context it hosts, recomputing a value at
every position. The laws are the monad's laws mirrored: the same coherence, read
backwards. This is not a new thing to fear; it is the owning stance held up to a
glass. And it is exactly the faculty a step needs to read the conditions it
resides among.

== Hosting the ground

So we do for the hosting face what Chapter 2 did for the owning one. A *Flexad*
wraps a comonad the way a Reflad wraps a monad — the hosting face, its two
operations named for what they do: `read` the value residing here, and `spread`
the hosted context out from this position.

#agda("../../src/Reflexads/Chapter03.agda", tag: "flexad")

Now put it on the ground. The Reflad _owned_ its ground by accumulating — a
value beside the history piled up so far. The Flexad _hosts_ that same ground:
it provides the accumulated ground as the context a value resides in, indexed by
_position_. `read` looks at the origin — the empty ground, here and now — and
`spread` re-bases by the very same `∙` the Reflad wrote with. It hosts values
exactly where the owning face wrote them.

And its coherence comes from the same place the Reflad's did. The hosting face's
co-associativity is nothing but the ground's associativity, handed up:

#agda("../../src/Reflexads/Chapter03.agda", tag: "co-inherited")

With one difference, honest and worth stating. A hosted value is a _function_ of
the ground — the residence differs at every position — so to call two such
hostings equal you must say they agree everywhere, an assumption about functions
Chapter 2 never needed. The hosting face rents a richer equality than the owning
one: to provide a context asks more of the ambient than to produce one. We take
this chapter out of Agda's `--safe` fragment for exactly that reason, and say so
plainly — the assumption is a postulate, named and visible, not smuggled in.

== Owning and hosting, one ground

Now both faces exist, and they stand on the same ground. The Reflad owns it; the
Flexad hosts it. Bring them together on one Ground and you get the structure
this book is named for:

#agda("../../src/Reflexads/Chapter03.agda", tag: "reflexad")

Read the two fields. `reflad` owns the ground — a value paired with the history
so far. `flexad` hosts it — a value residing at a position on that same history.
One ground, owned by one face and held out by the other. This is the _shape_ the
one-way street was missing: a return path, a face that holds the written ground
out to be read.

But look closely at what is, and is not, yet here. The two faces share a ground;
they do not yet _reach_ across it. The reflad writes `Carrier × A`, the flexad
reads `Carrier → A` — they stand on the same ground algebra without one
consulting the other. Sharing a ground lets them meet; it does not yet force the
hosting to hand back what the owning wrote. The loop is _drawn_, not closed.
Closing it — the law that binds owning to hosting, so the conditions laid down
are the conditions read — is the next chapter's work.

Still, the name has come apart, and that is no small thing. It was never just a
longer word for "reflad." It is _refl_ + _flex_ — the owning face and the
hosting face, standing on a common ground. Contextualized ownership, of shared
ground.

== The layer, and why

Step back, because we have quietly built a second structure alongside the first,
and it pays to see both at once. Underneath everything are the bare notions — a
monoid, a monad, a comonad, and their pairing, a *bimonad*. On top of each, we
have put a variant of our own:

#table(
  columns: (auto, auto, auto),
  align: left,
  table.header([*bare notion*], [*our variant*], [*what the variant adds*]),
  [Monoid],  [Ground],   [a _shared_ substrate, not just an algebra],
  [Monad],   [Reflad],   [the owning face — writes the ground],
  [Comonad], [Flexad],   [the hosting face — holds it out to be read],
  [Bimonad], [Reflexad], [both faces on _one_ shared ground],
)

A bimonad is the bare pairing: a monad and a comonad, side by side. Forget the
ground a reflexad stands on, and that is all that is left —

#agda("../../src/Reflexads/Chapter03.agda", tag: "forget")

— a monad and a comonad sharing nothing. So ask what the layer adds, because
that forgetful map throws away exactly what the layer adds — and it adds two
things.

First, a _shared ground_. Bare, a monad and a comonad have no common substrate;
they are two structures that happen to sit in the same place. Our layer makes
the ground first-class and stands both faces on it — so there is something to
point at that they share, and something for the owning to hand to the hosting.

Second, _orientation_. The bare notions are neutral machinery: operations and
laws, no point of view. Our variants arrive with the reading attached — the
Reflad _owns_, the Flexad _hosts_, and the Reflexad stands them on one shared
ground. Without the layer, a comonad is just a monad with its arrows reversed, a
formal mirror; with it, owning-and-hosting on one irreversible ground is the
makings of a genuine cycle.

That is the whole of what we have earned so far: the layer is worth having,
because it turns bare machinery into a structure that can host the conditions it
owns. What we have _not_ done is say precisely what makes something a Reflad, a
Flexad, a Reflexad — the defining properties each variant keeps over the ground,
and the law that actually _binds_ the owning to the hosting rather than merely
setting them side by side. The concrete Writer and Exponent of this chapter
illustrate the shapes; they are not the definitions of the abstractions. Pinning
those down — and finding the law that closes the two faces into one bound thing
— is where we turn next.
