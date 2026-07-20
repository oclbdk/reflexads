------------------------------------------------------------------------
-- Chapter 1 — Introduction
--
-- The companion module to book/chapters/01-introduction.typ.
--
-- We pin down three things, in the same order the chapter meets them: the
-- fold that flattens a context nested inside itself (`Flatten`); the monad,
-- presented for what it lets you *do* (`Monad`); and the reflexad, that same
-- monad looked at through its reflexive turn (`Reflexad`). We are anchoring
-- our reasoning here — stating precisely what we mean — not asserting that
-- any particular structure is correct.
------------------------------------------------------------------------

{-# OPTIONS --safe #-}

module Reflexads.Chapter01 where

open import Reflexads.Prelude using (_≡_)

private
  variable
    A B C : Set

-- The shape at the heart of the chapter: a context that can wrap another
-- copy of itself, flattened back down to a single layer.
-- >>> flatten
Flatten : (Set → Set) → Set₁
Flatten M = ∀ {A : Set} → M (M A) → M A
-- <<< flatten

-- A monad, presented for what it lets you *do*: start from a value with
-- `return`, and sequence a step onto a context with `_>>=_`. The three laws
-- are conditions the structure keeps about itself — in particular `assoc`,
-- the promise that how you group a chain of steps never changes its meaning.
-- >>> monad
record Monad (M : Set → Set) : Set₁ where
  field
    return : A → M A
    _>>=_  : M A → (A → M B) → M B

    left-id  : (a : A) (f : A → M B) → (return a >>= f) ≡ f a
    right-id : (m : M A)             → (m >>= return) ≡ m
    assoc    : (m : M A) (f : A → M B) (g : B → M C)
             → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)
-- <<< monad

-- A reflexad is that same monad, looked at through its reflexive turn: how
-- it takes a bare value as its own (`own`), and how it `flatten`s a context
-- nested inside itself back down to one layer. Nothing new is required —
-- `own` and `flatten` are the monad's own operations, foregrounded.
-- >>> reflexad
record Reflexad (M : Set → Set) : Set₁ where
  field
    monad : Monad M
  open Monad monad public

  own : A → M A
  own = return

  flatten : Flatten M
  flatten mm = mm >>= λ m → m
-- <<< reflexad
