------------------------------------------------------------------------
-- Chapter 7 — Reintroduction
--
-- The companion module to book/chapters/07-reintroduction.typ.
--
-- The finale, and the first module in the book that is NOT standalone — on
-- purpose. It IMPORTS Chapter 6 and enriches the reflexad's ground with an
-- ordering — the sequenced order of the instruction stream, the ground's clock
-- — without reopening a single definition. The buffered structure is a sealed,
-- transferable module; the ordering is a clean layer on top of its ground.
-- Buffering spent the ground's idempotence and left its order whole, so the
-- ordering layer slots in and the two compose: a demonstration of transferring
-- and composing a reusable module of inspectable behaviour.
------------------------------------------------------------------------

module Reflexads.Chapter07 where

open import Reflexads.Chapter06

-- A temporal ordering enriches a ground: a relation saying which interactions
-- come before which, that the ground's own composition advances. This is the
-- ground's clock — the sequenced ordering the buffer set aside.
-- >>> temporal
record Temporal (G : Monoid) : Set₁ where
  open Monoid G
  field
    _◁_     : Carrier → Carrier → Set
    advance : (x y : Carrier) → x ◁ (x ∙ y)
-- <<< temporal

-- The buffered structure (Chapter 6, imported and untouched) and a temporal
-- ordering compose over one ground, as clean layers.
-- >>> layered
record Layered (G : Monoid) : Set₁ where
  field
    buffered : Reflexad G   -- self-buffering, from Chapter 6
    temporal : Temporal G   -- the clock, added here
-- <<< layered

-- And the layers interlock without either reopening the other: reconciliation
-- — the buffer's `merge` — is a step forward on the ground's clock. Buffering
-- advances time; it does not stand outside it.
-- >>> interlock
module _ (G : Monoid) (T : Temporal G) where
  open Monoid G
  open Temporal T

  merge-advances : (x y : Carrier) → x ◁ merge G (x , y)
  merge-advances x y = advance x y
-- <<< interlock
