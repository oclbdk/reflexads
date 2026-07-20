------------------------------------------------------------------------
-- Chapter 3 — Situated on Shared Ground
--
-- The companion module to book/chapters/03-situated-on-shared-ground.typ.
--
-- Standalone. Chapter 2 built the owning (writing) face, the Reflad. Here we
-- build its counterpart, the situated (reading) face — a Comonad wrapped as a
-- Flexad — and stand both on one shared Ground, so the Reflexad becomes the
-- pair. Concrete instances (Writer, Exponent) illustrate the shapes; their
-- defining properties as abstractions are specified in later chapters.
------------------------------------------------------------------------

-- Not --safe: reading functions of the ground needs function extensionality,
-- which this chapter postulates below. Chapters 1 and 2 stay --safe; the
-- situated face is the one that rents a richer equality.

module Reflexads.Chapter03 where

-- Local primitives.
data _≡_ {A : Set} (x : A) : A → Set where
  refl : x ≡ x

cong : {A B : Set} (f : A → B) {x y : A} → x ≡ y → f x ≡ f y
cong f refl = refl

-- Reading a ground means functions of the ground; to compare them we assume
-- functions that agree everywhere are equal. The situated face rents a richer
-- equality than the owning face did.
postulate
  funext : {A : Set} {B : A → Set} {f g : (x : A) → B x}
         → (∀ x → f x ≡ g x) → f ≡ g

record _×_ (P Q : Set) : Set where
  constructor _,_
  field
    fst : P
    snd : Q
open _×_

private
  variable
    A B C : Set

------------------------------------------------------------------------
-- The bare notions
------------------------------------------------------------------------

-- A monad: producing and sequencing context.
record Monad (M : Set → Set) : Set₁ where
  field
    return : A → M A
    _>>=_  : M A → (A → M B) → M B

    left-id  : (a : A) (f : A → M B) → (return a >>= f) ≡ f a
    right-id : (m : M A)             → (m >>= return) ≡ m
    assoc    : (m : M A) (f : A → M B) (g : B → M C)
             → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)

-- A comonad: being situated in context, and reading it — the exact dual of the
-- monad. `extract` reads the value at hand; `_=>>_` extends a reading across
-- the surrounding context; the laws are the monad's, mirrored.
-- >>> comonad
record Comonad (W : Set → Set) : Set₁ where
  field
    extract : W A → A
    _=>>_   : W A → (W A → B) → W B

    left-counit  : (w : W A) → (w =>> extract) ≡ w
    right-counit : (w : W A) (f : W A → B) → extract (w =>> f) ≡ f w
    co-assoc     : (w : W A) (f : W A → B) (g : W B → C)
                 → ((w =>> f) =>> g) ≡ (w =>> λ w′ → g (w′ =>> f))
-- <<< comonad

-- A bimonad: the bare pairing of a monad and a comonad. What binds them we
-- leave open.
-- >>> bimonad
record Bimonad (M W : Set → Set) : Set₁ where
  field
    monad   : Monad M
    comonad : Comonad W
-- <<< bimonad

-- The interaction space: associative, non-commutative, with a unit.
record Monoid : Set₁ where
  field
    Carrier   : Set
    ε         : Carrier
    _∙_       : Carrier → Carrier → Carrier
    assoc     : (x y z : Carrier) → ((x ∙ y) ∙ z) ≡ (x ∙ (y ∙ z))
    identityˡ : (x : Carrier) → (ε ∙ x) ≡ x
    identityʳ : (x : Carrier) → (x ∙ ε) ≡ x

------------------------------------------------------------------------
-- Our variants
------------------------------------------------------------------------

-- A Ground wraps a Monoid.
record Ground : Set₁ where
  field
    monoid : Monoid
  open Monoid monoid public

-- A Reflad wraps a Monad: the owning (writing) face.
record Reflad (M : Set → Set) : Set₁ where
  field
    monad : Monad M
  open Monad monad public

  own : A → M A
  own = return

  flatten : M (M A) → M A
  flatten mm = mm >>= λ m → m

-- A Flexad wraps a Comonad: the hosting face. Where the Reflad owns its ground
-- (produces and writes it), the Flexad hosts one — provides the ground as the
-- context a value resides in. `read` reads the value residing here; `spread`
-- lays the hosted context out from this position.
-- >>> flexad
record Flexad (W : Set → Set) : Set₁ where
  field
    comonad : Comonad W
  open Comonad comonad public

  read : W A → A
  read = extract

  spread : W A → W (W A)
  spread w = w =>> λ w′ → w′
-- <<< flexad

-- A Reflexad stands both faces on one shared Ground: a Reflad that writes it,
-- and a Flexad that reads it. Refl + flex.
-- >>> reflexad
record Reflexad (G : Ground) : Set₁ where
  open Ground G
  field
    reflad : Reflad (λ A → Carrier × A)
    flexad : Flexad (λ A → Carrier → A)
-- <<< reflexad

------------------------------------------------------------------------
-- Concrete instances over a ground (illustration)
------------------------------------------------------------------------

module _ (G : Ground) where
  open Ground G

  -- The owning face: the Writer. Accumulates the ground by ∙ (Chapter 2).
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

  -- The situated face: the Exponent. Reads the ground by position — `extract`
  -- at ε (here, the empty ground), `_=>>_` re-bases by ∙ — reading exactly
  -- where the Writer wrote.
  Exp : Set → Set
  Exp A = Carrier → A

  extractᴱ : Exp A → A
  extractᴱ f = f ε

  _=>>ᴱ_ : Exp A → (Exp A → B) → Exp B
  f =>>ᴱ g = λ m → g (λ n → f (m ∙ n))

  expLeft : (f : Exp A) → (f =>>ᴱ extractᴱ) ≡ f
  expLeft f = funext (λ m → cong f (identityʳ m))

  expRight : (f : Exp A) (g : Exp A → B) → extractᴱ (f =>>ᴱ g) ≡ g f
  expRight f g = cong g (funext (λ n → cong f (identityˡ n)))

  -- The reading face's co-associativity IS the ground's associativity, handed
  -- up — through funext, the price of reading functions of the ground.
  -- >>> co-inherited
  expAssoc : (f : Exp A) (g : Exp A → B) (h : Exp B → C)
           → ((f =>>ᴱ g) =>>ᴱ h) ≡ (f =>>ᴱ λ f′ → h (f′ =>>ᴱ g))
  expAssoc f g h =
    funext (λ m → cong h (funext (λ n → cong g (funext (λ p → cong f (assoc m n p))))))
  -- <<< co-inherited

  expFlexad : Flexad Exp
  expFlexad = record
    { comonad = record
        { extract = extractᴱ ; _=>>_ = _=>>ᴱ_
        ; left-counit = expLeft ; right-counit = expRight ; co-assoc = expAssoc
        }
    }

  -- The reflexad over this ground: both faces, standing on the one ground.
  reflexad : Reflexad G
  reflexad = record { reflad = writerReflad ; flexad = expFlexad }

  -- Forget the shared ground and a reflexad is just a bare bimonad — a monad
  -- and a comonad, side by side, sharing nothing. What the ground and the
  -- orientation add is exactly what this map throws away.
  -- >>> forget
  forget : Reflexad G → Bimonad Writer Exp
  forget r = record
    { monad   = Reflad.monad  (Reflexad.reflad r)
    ; comonad = Flexad.comonad (Reflexad.flexad r)
    }
  -- <<< forget
