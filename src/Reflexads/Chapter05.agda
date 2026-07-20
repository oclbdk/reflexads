------------------------------------------------------------------------
-- Chapter 5 — Pinning Itself Down
--
-- The companion module to book/chapters/05-pinning-itself-down.typ.
--
-- Standalone. This chapter uncovers the dual of Chapter 4's self-hosting on
-- the owning (Refladic) face. Where self-hosting added a `consolidate` whose
-- round trip with the hosting face's `spread` is the identity, self-selecting
-- adds an `expand` whose round trip with the owning face's `flatten` is the
-- identity — settling flat in one step, the other way. The Writer reflad
-- self-selects (by its canonical expand) exactly when the ground is idempotent
-- — the same condition Chapter 4 needed for self-hosting.
--
-- Unlike Chapters 3-4, this stays inside --safe: the owning side is pair-based,
-- so there are no functions of the ground to compare, and no funext to rent.
------------------------------------------------------------------------

{-# OPTIONS --safe #-}

module Reflexads.Chapter05 where

-- Local primitives.
data _≡_ {A : Set} (x : A) : A → Set where
  refl : x ≡ x

cong : {A B : Set} (f : A → B) {x y : A} → x ≡ y → f x ≡ f y
cong f refl = refl

record _×_ (P Q : Set) : Set where
  constructor _,_
  field
    fst : P
    snd : Q
open _×_

private
  variable
    A B C : Set

-- A monad (Chapter 2): producing and sequencing context.
record Monad (M : Set → Set) : Set₁ where
  field
    return : A → M A
    _>>=_  : M A → (A → M B) → M B

    left-id  : (a : A) (f : A → M B) → (return a >>= f) ≡ f a
    right-id : (m : M A)             → (m >>= return) ≡ m
    assoc    : (m : M A) (f : A → M B) (g : B → M C)
             → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)

-- A Reflad (Chapter 2): the owning face. `flatten` collapses a nested context
-- down one level — the mirror of the hosting face's `spread`, which grew it.
-- >>> reflad
record Reflad (M : Set → Set) : Set₁ where
  field
    monad : Monad M
  open Monad monad public

  own : A → M A
  own = return

  flatten : M (M A) → M A
  flatten mm = mm >>= λ m → m
-- <<< reflad

-- Self-selecting is a property of a reflad — the exact dual of self-hosting.
-- Self-hosting added a `consolidate` whose round trip with `spread` was the
-- identity. Self-selecting adds an `expand` whose round trip with `flatten` is
-- the identity: expand a value, collapse it back, and land where you began, in
-- one step.
-- >>> selfselecting
record SelfSelecting {M : Set → Set} (R : Reflad M) : Set₁ where
  open Reflad R
  field
    expand  : M A → M (M A)
    selects : (m : M A) → flatten (expand m) ≡ m
-- <<< selfselecting

-- The ground: an interaction space. This chapter turns on idempotence.
record Monoid : Set₁ where
  field
    Carrier   : Set
    ε         : Carrier
    _∙_       : Carrier → Carrier → Carrier
    assoc     : (x y z : Carrier) → ((x ∙ y) ∙ z) ≡ (x ∙ (y ∙ z))
    identityˡ : (x : Carrier) → (ε ∙ x) ≡ x
    identityʳ : (x : Carrier) → (x ∙ ε) ≡ x

-- The corresponding stack: the Writer reflad over a ground (Chapter 2).
module _ (G : Monoid) where
  open Monoid G

  Writer : Set → Set
  Writer A = Carrier × A

  pure : A → Writer A
  pure a = ε , a

  _>>=_ : Writer A → (A → Writer B) → Writer B
  (w , a) >>= f = (w ∙ fst (f a)) , snd (f a)

  >>=-left : (a : A) (f : A → Writer B) → (pure a >>= f) ≡ f a
  >>=-left a f = cong (λ z → z , snd (f a)) (identityˡ (fst (f a)))

  >>=-right : (m : Writer A) → (m >>= pure) ≡ m
  >>=-right (w , a) = cong (λ z → z , a) (identityʳ w)

  >>=-assoc : (m : Writer A) (f : A → Writer B) (g : B → Writer C)
            → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)
  >>=-assoc (w , a) f g =
    cong (λ z → z , snd (g (snd (f a)))) (assoc w (fst (f a)) (fst (g (snd (f a)))))

  writerReflad : Reflad Writer
  writerReflad = record
    { monad = record
        { return = pure ; _>>=_ = _>>=_
        ; left-id = >>=-left ; right-id = >>=-right ; assoc = >>=-assoc
        }
    }

  -- `flatten` recombines a nested Writer by ∙ (this is writerReflad's own).
  flatten : Writer (Writer A) → Writer A
  flatten mm = mm >>= λ m → m

  -- The canonical expand duplicates a value's ground alongside it.
  expandDiag : Writer A → Writer (Writer A)
  expandDiag (m , a) = m , (m , a)

  -- Expand-then-flatten lands on (m ∙ m , a). So the Writer self-selects by its
  -- canonical expand EXACTLY WHEN the ground is idempotent — both directions.
  -- This is the same condition Chapter 4 needed for self-hosting, so the reading
  -- settles in one step if and only if the writing does.
  -- >>> equivalence
  selects→idempotent : ((m : Writer Carrier) → flatten (expandDiag m) ≡ m)
                     → (x : Carrier) → (x ∙ x) ≡ x
  selects→idempotent sel x = cong fst (sel (x , ε))

  idempotent→selects : ((x : Carrier) → (x ∙ x) ≡ x)
                     → (m : Writer A) → flatten (expandDiag m) ≡ m
  idempotent→selects idem (m , a) = cong (λ z → z , a) (idem m)
  -- <<< equivalence

  -- And so the Writer reflad self-selects over any idempotent ground.
  writer-self-selecting : ((x : Carrier) → (x ∙ x) ≡ x) → SelfSelecting writerReflad
  writer-self-selecting idem = record
    { expand  = expandDiag
    ; selects = idempotent→selects idem
    }
