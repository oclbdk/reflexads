------------------------------------------------------------------------
-- Reflexads — shared prelude
--
-- Re-exports the pieces of the standard library used throughout the
-- book, so each chapter can `open import Reflexads.Prelude` and get a
-- consistent vocabulary.
------------------------------------------------------------------------

{-# OPTIONS --safe #-}

module Reflexads.Prelude where

open import Data.Nat public using (ℕ; zero; suc; _+_; _*_)
open import Relation.Binary.PropositionalEquality public
  using (_≡_; refl; sym; trans; cong)
