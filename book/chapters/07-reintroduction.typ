#import "../lib/template.typ": agda

= Reintroduction

A book about cycles ought to end where it began, and this one can. Chapter 1
opened on a worry, cyclic dependency, the loop that eats its own tail, and a
promise, that some loops hold themselves up. Six chapters built the structure
that keeps the promise. This last one reintroduces it, now that we can say what
it is _for_: not a new idea, but the first one, read again through the thing it
was quietly a theory of all along: a running machine, and the stream of
instructions it runs. What follows reaches from that stream outward: to prompts
as well as code, to what a machine that reflected on itself would structurally
have to be, and to the narrow windows in which we ever read one at all.

== The flat space is an instruction sequence

Start with the flat space, because that is where the reintroduction turns.
Chapter 6's reflexad settled its whole context onto a flat retract in a single
flush and held it there. Read that computationally and the retract has a
familiar shape: it is an _instruction sequence_. A regrounding loop is a cyclic,
self-referential, contextual thing (dependencies leaning on dependencies) and
there is exactly one way to _run_ it: flatten it onto a linear, ordered stream of
operations, and step through them. Regrounding a loop flat is what compiling it
means; the flat space it lands on is the code.

Each operation in that stream is a _contextualized interaction_: it reads and
writes a shared state, the ground (registers, memory, whatever the machine
holds). The operations compose _structurally_ (in sequence, in branches, in
loops) into a program. So the reflexad's flat space, made concrete, is a program
of contextualized interactions, and the buffering that produced it is the act of
laying a tangled dependency structure down flat enough to execute.

== Instructions and prompts

And here the two languages of this book turn out to be one thing. An instruction
acts on a machine's state; a _prompt_ acts on a model's context: the running
state of a language model, its window, its accumulated conversation. A prompt is
a contextualized interaction over a ground exactly as an instruction is; a
sequence of prompts composes into a prose program exactly as instructions compose
into code; and the model folds each result back into its context exactly as a
processor folds each result back into its state. Instructions are to programs as
prompts are to prose: one stream executed by silicon, the other by a model, the
same shape underneath.

The two directions of either stream are the reflad and the flexad, wearing
computation. Forward, the stream is a _prediction_: the next operation, the
expected continuation, what the accumulated state projects onward: a branch
predictor is this literally, and a misprediction is a residual to reconcile.
Backward, each value is an _explanation_: the operation that produced it, its
provenance, the dependency it answers to, and that direction is _irreversible_,
which is the oldest word in the book. You cannot un-retire an instruction,
un-send a message, un-say a turn. What Chapter 2 called causal irreversibility,
the ground that is associative but not commutative, is the arrow the stream
runs along.

And a prompt does one thing worth dwelling on, because it sharpens the whole
reading: it does not pass through and vanish. A prompt, and the response it draws,
are _semantic tokens_ (units of meaning, not merely of syntax) and once
processed they are _buffered_, folded into the running context and re-settled the
way any interaction is reconciled onto the ground. Buffered, a token stops being a
transient input and becomes part of the context itself: a stable piece of the
shared ground that everything after it reads from. It has _causally integrated_.
The exchange you just had is now a cause the next must explain; a retrieved fact,
a tool result, a correction, once buffered, is no longer a message that was sent
but a condition of the context surrounding what follows. This is the forward face
becoming the backward one in a single step: a prediction emitted, buffered, and
thereby committed, irreversibly, into the causal context as an explanation the
rest of the computation inherits.

== The sequence keeps time

So where, in all this, is time? Not in the loop. The reflexad, the dependency
structure, the relation of prediction to explanation, has no clock; it is
Chapter 6's still point, a fixed shape that holds itself up. The clock is the
_sequence_: program order, the counter that advances, the turn that follows the
turn. The loop is not the clock; the stream is.

This is why cyclic dependency was never the paradox it looked like. A cycle is a
relation (you ask whether it holds itself up, and if it does it is _done_, no
motion required) and what moves is not the cycle but the ordered stream the
machine steps through beneath it. Data flows; the loop stays still; the sequence
keeps time. To reason about a self-interacting computation, then, is to separate
the two: find the loop's fixed point and check that it holds itself up, and let
the stream carry the rest.

Concretely, that is a short list of questions: worth asking of any tangled flow,
and sharply of an agent looping over its own output. Does its context reground,
or does the residual keep growing until it drifts? Is the loop well-founded, a
fixed point it settles onto, or a spiral with no floor? What has committed
irreversibly, and what is still a revisable prediction? Which pieces are sealed
enough to lift out and reuse? The framework answers none of these for you. It
tells you they are the questions.

== What self-reflection requires

Now push it one turn further, to the conclusion the whole structure has been
bending toward. Ask what a machine would have to be, structurally, to reflect on
_itself_.

To reflect on itself a system must model itself, and a self-model runs in two
directions: the hinge the whole conclusion turns on. Grant those two and the
rest is forced. Forward, it must predict itself: _what I will do_, the reflad, a
forward model of its own behaviour. Backward, it must explain itself: _what
produced this state of me_, the flexad, introspection. Those two self-models are
worse than useless if they disagree; a system that predicts one thing about
itself and explains another is not self-reflective, only confused. So they must
_bind_ into a self-consistent present, the reflexad, and the binding must _hold
itself up_ rather than spiral or drift, which is the buffer, the
self-consolidation. And it must _sequence_ what it does, or there is no
persistence and no next.

Predict forward, explain backward, bind consistent, buffer stable, sequence in
time. Grant the two directions and the rest is not a design we chose but one the
structure forces: what self-reflection comes to _be_. A self-reflective machine
intelligence would have to organize its instruction stream by this decomposition,
whether or not anyone built it to, the way a standing structure obeys statics
whether or not its builder did the arithmetic. The book has been describing the
skeleton of self-reflection since the first page. It only now admits it.

== Inspectable, transferable modules

The decomposition does not only constrain; it pays, and the payment is the reason
to care. Because it settles behaviour onto a flat, sealed, sequenced form, an
instruction stream, a buffered module, that behaviour becomes two things at
once: _inspectable_, because a flat ordered sequence is something you can read and
trace, and _transferable_, because a sealed unit composes by being enriched, not
by being cracked open.

That is what lets you navigate and move reusable modules of inspectable
behaviour, which is the difference between a system you can audit and compose and
one that is an opaque tangle. And it is something you can do, not only say. This
chapter's code does it. And it is the first module in the book that is not
self-contained, on purpose. It imports Chapter 6 untouched, and lays an ordering
over its ground:

#agda("../../src/Reflexads/Chapter07.agda", tag: "temporal")

The buffered structure and the ordering then sit over one ground as two clean
layers:

#agda("../../src/Reflexads/Chapter07.agda", tag: "layered")

They interlock without either reaching into the other: composing
interactions, the buffer's `merge`, is a step forward along the ordering. The
clock is defined on the very operation the buffer already uses.

#agda("../../src/Reflexads/Chapter07.agda", tag: "interlock")

Nothing in Chapter 6 was reopened to say any of this. A sealed module, enriched
by a layer that never has to learn how the module works, that is a reusable
behaviour, transferred and composed: legible because the structure laid it flat,
safe to compose because the structure left it sealed.

== The instruction stream is the anchor

There is one more thing the stream is, and it is the most important, because it
is where all of this touches the world that is not a machine.

The stream is the _anchor_. It is the single place where a machine's causal order
and temporal flow become synchronizable with human-run systems: because a
sequence is the one form both a processor and a person can share, read, put in
order, and be held accountable to. You cannot review the internal loops of a
running intelligence; you can review its stream. Code review, logs, audit trails,
turn-taking, the record of who did what and when: every human-facing handle on a
computational system reaches it through the sequence, not through the loops
directly. And it is the same surface twice over: the stream a machine would read
to reflect on itself is the stream we read to observe it: introspection from the
inside, review from the outside, one sequence between them. A machine legible to
itself and a machine legible to us stand or fall on the same ground. So the causal
and temporal flow of any such system gets ultimately anchored to human-synchronized
systems _at the instruction stream_, recognized as such or not. The framework's
contribution is small and exact: that the anchor is real, that it is the stream,
and that a self-reflective machine's legibility to us lives or dies there.

== Windows of coherence

Say plainly what that anchoring is like, though, because it is not continuous.
And pretending it is may be where much of our confusion about machines begins.

A machine's stream runs faster and vaster than any watcher, and its loops are
opaque between the moments they settle. What a person gets, engaging or
observing, is not a running transparency but a _window_: a bounded span of the
stream in which the machine's causal order lines up, for a while, with something a
human can interpret. Ask a question and the context settles into a turn you can
read; step a debugger and the machine holds at a state you can name; scan a log
and a stretch of the sequence becomes a story. Each is a window where the ordering
is _transiently coherent_: coherent to human interpretation, and only for as long
as the window holds open.

And the window is not found so much as _made_, in the engaging. To observe is
itself to interact (a prompt, a breakpoint, a query) settling the buffer to a
flat, readable moment and aligning it, briefly, with the one who reached in. It is
the reflexad's still point caught in the act: the machine's present, buffered flat
enough to be legible, meeting a human present that came to look. But the ground
keeps time. The stream moves on, the settled moment regrounds, the window closes:
coherence forming and dissolving, span after span, as the two presents pass each
other. To interpret a machine is not to hold it still and see it whole. It is to
catch it, again and again, in the transient windows where its order and ours
agree.

== The book, reintroduced

There is one last instance of all this, and it has been in your hands the whole
time. This book is built out of exactly the two moves it names: each chapter is a
sealed, transferable unit, self-contained, checkable and readable on its own,
liftable out, and this final chapter is the layer over the sixth, enriching it
without reopening a line.

And it was built in both streams at once. It is Agda you can run and prose you
can prompt, the same reflexadic structure encoded twice, in the two languages
this chapter just showed to be one. It does not merely contain code and prose; it
_is_ an instruction sequence and a prompt sequence, and by now you can see those
were never two things.

So this is the reintroduction. The cycle you were wary of on the first page is a
relation that holds itself up; the time you thought it needed belongs to the
stream beneath it; the way to work with such things is to build them in sealed,
transferable pieces and lay them over one another until they consolidate; and a
machine that turned this structure on itself would have to organize the very same
way, its instruction stream the place where it becomes legible to us at all. You
have been reading a program and a prompt the entire time. Now you can write your
own.
