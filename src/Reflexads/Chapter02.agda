------------------------------------------------------------------------
-- Chapter 2 — Contextualized Ownership
--
-- The companion module to book/chapters/02-contextualized-ownership.typ.
--
-- Standalone. We name our own variants of the bare notions:
--
--   Ground   wraps  Monoid   (the interaction space a context composes on)
--   Reflad   wraps  Monad    (a monad seen as an owning face)
--
-- and a Reflexad is a Reflad standing on a Ground — parameterized by the
-- ground it owns. The owning face over a ground is the Writer, whose monad
-- laws are all inherited from the ground.
------------------------------------------------------------------------

{-# OPTIONS --safe #-}

module Reflexads.Chapter02 where

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

-- A bare monad says nothing about what context it carries.
record Monad (M : Set → Set) : Set₁ where
  field
    return : A → M A
    _>>=_  : M A → (A → M B) → M B

    left-id  : (a : A) (f : A → M B) → (return a >>= f) ≡ f a
    right-id : (m : M A)             → (m >>= return) ≡ m
    assoc    : (m : M A) (f : A → M B) (g : B → M C)
             → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)

-- The interaction space where contexts compose. Associative, so a chain of
-- context regroups freely; pointedly NOT commutative, because causal order is
-- irreversible. The unit is the empty, starting context.
-- >>> monoid
record Monoid : Set₁ where
  field
    Carrier   : Set
    ε         : Carrier
    _∙_       : Carrier → Carrier → Carrier
    assoc     : (x y z : Carrier) → ((x ∙ y) ∙ z) ≡ (x ∙ (y ∙ z))
    identityˡ : (x : Carrier) → (ε ∙ x) ≡ x
    identityʳ : (x : Carrier) → (x ∙ ε) ≡ x
-- <<< monoid

-- A Ground wraps a Monoid — our name for the interaction space, the way a
-- Reflad (below) is our name for an owning monad.
-- >>> ground
record Ground : Set₁ where
  field
    monoid : Monoid
  open Monoid monoid public
-- <<< ground

-- A Reflad wraps a Monad: a monad seen as an owning face, carrying Chapter 1's
-- reflexive operations `own` and `flatten`.
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

-- A Reflexad is a Reflad standing on a Ground: parameterized by the ground it
-- owns, its owning face's context IS that ground (a value paired with the
-- ground accrued so far). One face for now; a second joins later.
-- >>> reflexad
record Reflexad (G : Ground) : Set₁ where
  open Ground G
  field
    reflad : Reflad (λ A → Carrier × A)
-- <<< reflexad

-- The owning face over a ground: the Writer. Its monad is built from the
-- ground's monoid, so the monad's coherence is the monoid's, handed up. This
-- is where the Ground does its work.
module _ (G : Ground) where
  open Ground G

  Writer : Set → Set
  Writer A = Carrier × A

  pure : A → Writer A
  pure a = ε , a

  _>>=_ : Writer A → (A → Writer B) → Writer B
  (w , a) >>= f = (w ∙ fst (f a)) , snd (f a)

  -- The reflad's associativity — the monad law — is exactly the ground's
  -- (monoid's) associativity, handed up.
  -- >>> inherited
  >>=-assoc : (m : Writer A) (f : A → Writer B) (g : B → Writer C)
            → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)
  >>=-assoc (w , a) f g =
    cong (λ z → z , snd (g (snd (f a)))) (assoc w (fst (f a)) (fst (g (snd (f a)))))
  -- <<< inherited

  >>=-left : (a : A) (f : A → Writer B) → (pure a >>= f) ≡ f a
  >>=-left a f = cong (λ z → z , snd (f a)) (identityˡ (fst (f a)))

  >>=-right : (m : Writer A) → (m >>= pure) ≡ m
  >>=-right (w , a) = cong (λ z → z , a) (identityʳ w)

  writerMonad : Monad Writer
  writerMonad = record
    { return   = pure
    ; _>>=_    = _>>=_
    ; left-id  = >>=-left
    ; right-id = >>=-right
    ; assoc    = >>=-assoc
    }

  writerReflad : Reflad Writer
  writerReflad = record { monad = writerMonad }

  -- A ground is all it takes to build a reflexad — standing its owning face on
  -- exactly that ground.
  reflexad : Reflexad G
  reflexad = record { reflad = writerReflad }
