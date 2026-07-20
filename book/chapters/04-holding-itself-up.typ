#import "../lib/template.typ": agda

= Holding Itself Up

Chapter 1 made a promise it never kept. It said some self-reference spirals and
some _holds itself up_, that the difference was the whole point — and then never
said what holding-itself-up actually _is_. Three chapters on, we finally have
the pieces to say it, because the hosting face has made the danger concrete.

Here is the danger. A contextual sequence reads the context its earlier steps
built. But reading a context is itself an interaction — something that can, in
turn, be read. Context of a context. The hosting face makes this literal:
`spread` takes a host and produces a host _of hosts_, one level up. Do it again
and you are two levels up, then three. Left alone, consulting your own context
pushes you higher and higher — the spiral Chapter 1 warned about, now with a
shape you can point at.

== When hosting settles

So ask the question the spiral forces: does hosting ever _settle_? Can you go up
a level and come back down — and stay down?

Recall the hosting face — the flexad of Chapter 3 — and its growth, `spread`, a
host becoming a host of hosts:

#agda("../../src/Reflexads/Chapter04.agda", tag: "flexad")

You can come back down, because the ground gives a way to _reground_: take a host
of hosts and fold the extra level back through the ground, combining its two
positions into one. It stays flat — a host, not a host of hosts — and it
aggregates, pulling the upper level down into the base rather than throwing it
away. But regrounding is only half of settling. Going up and coming back down is
worth nothing if you don't land where you started. _Settling_ is when the round
trip is the identity: grow, reground, and you are _exactly_ where you began, flat
and unchanged — and once you have settled, you stay.

That makes self-hosting a _property_ a flexad may or may not have — it settles
flat when it comes equipped with a regrounding whose round trip with `spread` is
the identity:

#agda("../../src/Reflexads/Chapter04.agda", tag: "selfhosting")

Say it plainly, because it is the definition the book has been climbing toward:

_To self-host is to be the flat form your own hosting settles onto, in a single
step._

The phrase _in a single step_ is carrying more weight than it looks. It deserves
a moment.

== Once, not eventually

There is another way a self-reference could resolve, and it is the one we are
most used to. It could _converge_: settle a little more each time it is hosted,
never quite finished in any one step, but approaching a flat form in the limit.
Fixed-point iteration resolves this way; so does retrying until nothing changes,
or grinding a process toward a steady state. It gets there — but only
eventually, only if you keep going, and only if you can tell when to stop.

One-step idempotence is the stronger, stranger thing. The self-reference is
_already_ at its flat form after a single hosting. No transient to wait out, no
convergence to detect, no stopping rule to get right. Grow once, reground once,
and you are done — and done for good, because doing it again moves nothing.

That gap is the whole of why this is interesting, and it is sharpest inside a
sequence. If hosting merely converged, then each time a step wanted to consult
its context it would first have to run the consolidation to a fixed point — an
unbounded amount of work, with a convergence test to write and a non-termination
to fear — before it could go on. The sequence would stall to settle. One-step
idempotence deletes the stall: reground once, and continue. There is never a
fixed point left to chase, because you are already standing on it.

You already trust this shape everywhere it is safe to stop watching. A `PUT` you
can send once or a hundred times for the same result; a set you add to twice with
nothing gained the second time; a `max`, an `or`, a dedup, a normalize, a
closure — do it once and it is done, do it again and nothing moves. It is what
turns _at-least-once_ delivery into _exactly-once_ meaning: an idempotent
receiver does not count its copies. The worth of these is not that they do
nothing — they do real work, the first time — but that after the first time
there is nothing left to do, and you can stop counting.

That is the interesting middle they live in, and it is easy to miss between two
duller extremes. It is not the trivial case, where hosting does nothing and
everything is flat for free. And it is not the unbounded case, where hosting
keeps doing something and you chase a limit forever. It does real work — it
aggregates, folding the grown level down through the ground — and then it stops,
flat, in one move. It aggregates new structure while staying flat.

And read back to Chapter 1, this is the difference between two ways a cycle can
hold itself up. A cycle that only converges holds itself up _eventually_: its
stability belongs to the whole endless process, and lean on it too early and it
gives. A cycle that settles in one step holds itself up _immediately_: stable
from the first move, with no process to trust but the single one you just took.
One-step idempotence is what makes "holds itself up" well-founded, and not
merely hopeful.

== Why it matters

This is not a fact about a data structure. It is the condition that decides
whether contextual sequencing works at all.

A sequence of interactions builds context, and each step consults it. Consulting
is itself context, so without something to stop it, the consulting nests —
context of a context of a context — and the sequence loses its footing in
ever-deeper dependency. That is a sequence that does not hold itself up.
Self-hosting is what stops it: over a ground where hosting settles flat, any
nesting the consulting threatens to build _consolidates back to one level in a
single step, and stays there_. The sequence stays flat. You can always work at
ground level. The self-reference that would have spiraled instead settles.

Now read the same fact from the other side, because settling is not only a
danger avoided — it is a power gained. When hosting settles flat, an interaction
can be _regrounded_ freely: re-read, re-run, merged back in, without ever
compounding. The sequence _tolerates re-consultation_ — you may revisit its
context, as often as you like, with no fear that revisiting changes it. That
tolerance is exactly what you want from a contextual sequence you mean to trust,
and self-hosting is that tolerance made precise.

== It comes from the ground

And where does the tolerance come from? The same place every condition in this
book has come from — the ground. Grow a host and reground it, and one line of
arithmetic says what returns: the host, read at each position _composed with
itself_. So the round trip is the identity exactly when composing a position
with itself gives that position back — when the ground is _idempotent_,
`x ∙ x = x`. That is the whole condition. Take the exponent flexad, the concrete
hosting face over a ground, and it carries the self-hosting property exactly when
the ground is idempotent — the settling is the ground's own idempotence, handed
up.

#agda("../../src/Reflexads/Chapter04.agda", tag: "from-ground")

An idempotent ground is a ground of interactions that are _safe to repeat_ —
where doing the same thing twice, in the same place, is the same as doing it
once. Reground, re-read, retry: all free. The flatness that keeps contextual
sequencing from spiraling is, underneath, nothing more exotic than interactions
that do not compound when repeated — which is why, in any system where the same
thing may happen twice, you reach for operations built to be idempotent, and why
doing so buys safety by construction rather than by hoping the duplicate never
arrives.

== The flat form it settles onto

One last turn, worth only a glance. We called consolidation a _regrounding_, but
look at what it is: the hosting face folding its own nesting back into the flat
thing it started from — by the one natural fold the ground allows. That fold is
_canonical_, and over a settling ground every host is already its own flat form:
it hosts itself, and lands, in one step, back on itself. (A host that did _not_
settle would still have a single best flat core it could be regrounded onto —
the universal shape beneath all of this — but that is a story for later.)

That is self-hosting, and it is the first time the book's own name describes one
of its structures outright — a hosting face that holds itself up. What it
does _not_ yet do is hold up the other face with it. The reflad still writes a
ground the flexad only reads; binding the two, so that what the one writes is
what the other settles onto, is the step we have been circling since Chapter 3.
But we have earned its shape now. To bind the pair is to make them settle flat
_together_ — the way the hosting face has just learned to settle flat alone.
