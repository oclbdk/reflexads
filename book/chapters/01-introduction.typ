#import "../lib/template.typ": agda

= Introduction

Almost every program you write is one step after another. But in code,
"after" is quietly doing an enormous amount of work. The second line doesn't
just run later than the first; it runs *inside what the first one left
behind*: the value it computed, the connection it opened, the error state it
might already be in. Each step is written against a context the steps before
it built up. We write code like this so constantly it feels like nothing.

It stops feeling like nothing the moment you try to say, precisely, what
such a sequence *is*. The context is made by the steps. The steps are
defined against the context. Pin either one down and it reaches back for the
other, and you find you can't define the sequence a piece at a time. The
definition bends around and refers to itself. That bend is not a mistake you
made. It's the unavoidable price of letting steps depend on the context they
land in.

== The cycle is only the symptom

That bend has a familiar face. It's the promise that resolves to another
promise, the optional that holds an optional: a context showing up inside a
context, the structure having to mention itself just to say what it is. And
it's the import that loops, the two services that each need the other
standing first, the initialization order no one can untangle. These look
like different problems at different scales, but they're the same shape: a
set of parts each defined relative to a context the others produce. Let
something depend on the context it lands in, and it will, sooner or later,
depend on itself.

So the self-reference isn't a quirk of any one design. It's what
contextualized sequencing *does*. The moment you commit to steps that mean
something only in the context their predecessors built, you've committed to
a definition that turns back on itself, and every cyclic dependency chain
you've ever fought is that turn, made concrete.

We're trained to read that shape as trouble. A cycle is a smell; find it,
break it. Often that's the right call: plenty of cyclic dependencies really
are two things tangled that had no business touching. But notice what the
advice is aimed at. It's aimed at the cycle, which is the shadow. The thing
casting the shadow is the contextualized sequencing underneath, and that we
rarely question, because we can't give it up: contextual steps are most of
what our programs are.

So the interesting question was never "is there a cycle." It's whether the
structure that induced the cycle also carries what the cycle needs to stay
standing. Some don't. The import loop has nothing in it that grounds out;
each half borrows its meaning from the other and neither has any to lend, so
the whole thing collapses. Some do, and one of them is a structure a great
many programs already lean on.

== The familiar case

A monad is one of those structures, the shape underneath promises,
optionals, result types, streams, whatever your language happens to call
them. It's built on exactly the self-reference we just described: a context
that can wrap another copy of itself, and flatten that nesting back down to
a single layer. A promise of a promise, collapsed to one promise. And it
never spins out, for two reasons the structure supplies itself. There is
always a plain value you can start from, carrying no context at all: a
place to stand. And every flatten strictly removes a layer, so the nesting
winds *down* toward that starting point instead of spiralling away from it.

That's why sequences like these are so easy to trust. You'll regroup a run of
steps, or lift a few of them out into a helper, and never check that the
meaning survived — even while you'd never dream of *reordering* them,
because each one is standing on the context the last one left. Without ever
thinking about it, you know exactly which liberties the structure protects
and which it doesn't. The cycle is right there in the middle of it. It just
holds itself up.

== What the standing structure carries

Go back to that liberty: regrouping a chain without checking it. What let
you get away with it was a rule: how you group the steps doesn't change how
their contexts compose. And notice where that rule lives. You didn't look it
up, import it, or test it. It was simply *there*, held by the same structure
you were computing in, phrased in that structure's own terms, its own
wrapping and its own flattening, and it turned up exactly when you leaned on
it.

That's more than the structure *satisfying* a rule. It's the structure
*keeping* the rule: supplying the vocabulary the rule is stated in, the
setting in which the rule is even meaningful, and the guarantee that it
holds, all three at once, from one place. In the ordinary way of thinking
about structure, those three live on separate floors: the object is one
thing, the language you describe it in is another, and the rules that
constrain it are a third, handed down from above. Here they collapse
together. The structure carries its own conditions, and the conditions that
carry the weight are exactly the ones about how its context composes along a
sequence.

That is the idea this whole book turns on, so let's give it a name. A
structure that keeps, from its own resources, the rules for how its context
composes, and so defines its own contextual sequences without borrowing
coherence from anywhere outside, is one that *hosts its own conditions*, in
context. The monad is where the pattern is easiest to see first, because
it's so familiar. Most of the rest of the book is about how much further the
pattern reaches.

== The reflexad

We'll be working with monads throughout, but with one emphasis held steady,
and that emphasis is worth its own name. A monad is usually introduced for
what it lets you *do*: sequence effects, chain fallible steps, thread state
without carrying it by hand. We are going to look at the same structure for
what it *is*: a context that contextualizes itself, and that carries the
rules for doing so. A monad held up that way, foregrounding the reflexive
turn where it folds its own context back into itself and the bare value it
can always take as its own, is what we'll call a *reflexad*. The name is just
that: *reflex-* for the turn back on itself, *-ad* from the monad it never
stops being.

Nothing about the machinery changes. A reflexad is not a weaker or a
stronger monad; it's an ordinary monad, looked at from the angle this book
takes. Written out as code, that's the whole of the claim: a reflexad *is* a
monad, with the two operations this book cares about named out front:

#agda("../../src/Reflexads/Chapter01.agda", tag: "reflexad")

The `monad` it's built on (and the laws that monad keeps about itself) sits
right beside this in the same module. `own` and `flatten` add nothing to it
but a change of angle. They are two names for what that angle brings forward:
how the structure takes a bare value as its own, and how it folds a context
nested in itself back to a single layer. This is our working instrument
throughout. Whenever we want to probe how a structure can host its own
conditions, how it can sequence itself in its own context start to finish,
we'll reach for the reflexad, because it's the smallest and most familiar
place that self-contextualization already lives.

== Holding ourselves precise

You just saw a scrap of Agda, and there will be more of it, so it's worth
being clear, up front and without hedging, about *why* it's here. If you
know Agda, you'll assume the usual contract, and the usual contract is not
the one we're signing.

We are not using Agda to prove theorems, and we are not using it to certify
that any of this is correct. That would be a different and more ambitious
book. We're using it for something smaller and, for our purposes, more
useful: to hold our own reasoning to a consistent line as it develops. When
a train of thought is written out in Agda, we can tell whether it still
hangs together or whether it quietly stopped making sense a few steps back.
It's a discipline for keeping ourselves honest, not a machine that stamps
our conclusions as true.

That definition of a reflexad, for instance, asserts nothing about the world
and proves no theorem. It just fixes what we mean, precisely enough that
later chapters can lean on the same words without them shifting underfoot.
That is the whole job Agda does for us here: it holds the meaning still.

== What this book is for

If you take one thing from this chapter, take the correction to that
instinct. The cyclic dependency chains you fight aren't the disease; they're
what contextualized sequencing looks like when the structure inducing it
can't hold itself up. So the fix is not a blanket "break the cycle." It's to
see the sequencing underneath, and then to build or recognize structures
that carry what their own cycles need: a place to stand, a direction to
settle, and their own rules for how context composes. Once you can see that,
you have a way to reason about self-dependence instead of only fearing it.

We start from that familiar footing, and walk outward from there.
