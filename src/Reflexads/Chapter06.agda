------------------------------------------------------------------------
-- Chapter 6 — Buffering Itself
--
-- The companion module to book/chapters/06-buffering-itself.typ.
--
-- Standalone, and the climax module: it carries the full Reflad, Flexad, and
-- Reflexad together with their three universal properties — SelfSelecting
-- (writing), SelfHosting (reading), and SelfBuffering (the split idempotent) —
-- and relates them: over a ground, each holds iff the ground is idempotent, so
-- the reflexad self-buffers iff its flexad self-hosts iff its reflad
-- self-selects. The two faces reduce to `copy` and `merge`, whose composite is
-- the split idempotent that reflects the context onto the flat ground.
--
-- Not --safe: the flexad reads functions of the ground, so we postulate funext.
------------------------------------------------------------------------

module Reflexads.Chapter06 where

-- Local primitives.
data _≡_ {A : Set} (x : A) : A → Set where
  refl : x ≡ x

cong : {A B : Set} (f : A → B) {x y : A} → x ≡ y → f x ≡ f y
cong f refl = refl

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
-- The bare notions, our variants, and the two faces' universal properties
------------------------------------------------------------------------

record Monad (M : Set → Set) : Set₁ where
  field
    return : A → M A
    _>>=_  : M A → (A → M B) → M B

    left-id  : (a : A) (f : A → M B) → (return a >>= f) ≡ f a
    right-id : (m : M A)             → (m >>= return) ≡ m
    assoc    : (m : M A) (f : A → M B) (g : B → M C)
             → ((m >>= f) >>= g) ≡ (m >>= λ x → f x >>= g)

record Comonad (W : Set → Set) : Set₁ where
  field
    extract : W A → A
    _=>>_   : W A → (W A → B) → W B

    left-counit  : (w : W A) → (w =>> extract) ≡ w
    right-counit : (w : W A) (f : W A → B) → extract (w =>> f) ≡ f w
    co-assoc     : (w : W A) (f : W A → B) (g : W B → C)
                 → ((w =>> f) =>> g) ≡ (w =>> λ w′ → g (w′ =>> f))

record Monoid : Set₁ where
  field
    Carrier   : Set
    ε         : Carrier
    _∙_       : Carrier → Carrier → Carrier
    assoc     : (x y z : Carrier) → ((x ∙ y) ∙ z) ≡ (x ∙ (y ∙ z))
    identityˡ : (x : Carrier) → (ε ∙ x) ≡ x
    identityʳ : (x : Carrier) → (x ∙ ε) ≡ x

-- The owning face.
record Reflad (M : Set → Set) : Set₁ where
  field
    monad : Monad M
  open Monad monad public

  own : A → M A
  own = return

  flatten : M (M A) → M A
  flatten mm = mm >>= λ m → m

-- The hosting face.
record Flexad (W : Set → Set) : Set₁ where
  field
    comonad : Comonad W
  open Comonad comonad public

  read : W A → A
  read = extract

  spread : W A → W (W A)
  spread w = w =>> λ w′ → w′

-- The reflad's universal property (Chapter 5).
record SelfSelecting {M : Set → Set} (R : Reflad M) : Set₁ where
  open Reflad R
  field
    expand  : M A → M (M A)
    selects : (m : M A) → flatten (expand m) ≡ m

-- The flexad's universal property (Chapter 4).
record SelfHosting {W : Set → Set} (F : Flexad W) : Set₁ where
  open Flexad F
  field
    consolidate : W (W A) → W A
    settles     : (w : W A) → consolidate (spread w) ≡ w

-- The reflexad: both faces on one ground (Chapter 3).
record Reflexad (G : Monoid) : Set₁ where
  open Monoid G
  field
    reflad : Reflad (λ A → Carrier × A)
    flexad : Flexad (λ A → Carrier → A)

------------------------------------------------------------------------
-- The corresponding stack over a ground, and the three related together
------------------------------------------------------------------------

module _ (G : Monoid) where
  open Monoid G

  Idempotent : Set
  Idempotent = (x : Carrier) → (x ∙ x) ≡ x

  ---- the owning face: the Writer reflad (Chapters 2, 5) ----
  Writer : Set → Set
  Writer A = Carrier × A

  pure : A → Writer A
  pure a = ε , a

  _>>=ᵂ_ : Writer A → (A → Writer B) → Writer B
  (w , a) >>=ᵂ f = (w ∙ fst (f a)) , snd (f a)

  writerReflad : Reflad Writer
  writerReflad = record
    { monad = record
        { return = pure ; _>>=_ = _>>=ᵂ_
        ; left-id  = λ a f → cong (λ z → z , snd (f a)) (identityˡ (fst (f a)))
        ; right-id = λ { (w , a) → cong (λ z → z , a) (identityʳ w) }
        ; assoc    = λ { (w , a) f g →
            cong (λ z → z , snd (g (snd (f a)))) (assoc w (fst (f a)) (fst (g (snd (f a))))) }
        }
    }

  ---- the hosting face: the Exponent flexad (Chapter 3) ----
  Exp : Set → Set
  Exp A = Carrier → A

  extractᴱ : Exp A → A
  extractᴱ f = f ε

  _=>>ᴱ_ : Exp A → (Exp A → B) → Exp B
  f =>>ᴱ g = λ m → g (λ n → f (m ∙ n))

  expFlexad : Flexad Exp
  expFlexad = record
    { comonad = record
        { extract = extractᴱ ; _=>>_ = _=>>ᴱ_
        ; left-counit  = λ f → funext (λ m → cong f (identityʳ m))
        ; right-counit = λ f g → cong g (funext (λ n → cong f (identityˡ n)))
        ; co-assoc     = λ f g h →
            funext (λ m → cong h (funext (λ n → cong g (funext (λ p → cong f (assoc m n p))))))
        }
    }

  ---- the reflexad: both faces on this ground ----
  reflexad : Reflexad G
  reflexad = record { reflad = writerReflad ; flexad = expFlexad }

  ---- the split idempotent: the reflexad's universal property ----
  -- >>> split
  merge : Carrier × Carrier → Carrier
  merge (x , y) = x ∙ y

  copy : Carrier → Carrier × Carrier
  copy x = (x , x)

  -- Self-buffering: reconcile a broadcast and you return, in one step. The
  -- split condition merge ∘ copy = id — on the nose, idempotence.
  SelfBuffering : Set
  SelfBuffering = (x : Carrier) → merge (copy x) ≡ x

  -- The buffer: the split idempotent e = copy ∘ merge, its image the flat ground.
  buffer : Carrier × Carrier → Carrier × Carrier
  buffer p = copy (merge p)
  -- <<< split

  -- Over a band, one flush settles and holds: the buffer is idempotent.
  -- >>> holds
  buffer-holds : Idempotent → (p : Carrier × Carrier) → buffer (buffer p) ≡ buffer p
  buffer-holds band (x , y) = cong copy (band (x ∙ y))
  -- <<< holds

  ------------------------------------------------------------------------
  -- Related all together: each of the three universal properties holds
  -- exactly when the ground is idempotent, so all three coincide.
  ------------------------------------------------------------------------

  -- >>> coincide
  idem→selecting : Idempotent → SelfSelecting writerReflad
  idem→selecting idem = record
    { expand  = λ { (m , a) → m , (m , a) }
    ; selects = λ { (m , a) → cong (λ z → z , a) (idem m) }
    }

  idem→hosting : Idempotent → SelfHosting expFlexad
  idem→hosting idem = record
    { consolidate = λ F m → F m m
    ; settles     = λ f → funext (λ m → cong f (idem m))
    }

  idem→buffering : Idempotent → SelfBuffering
  idem→buffering idem = idem

  buffering→idem : SelfBuffering → Idempotent
  buffering→idem sb = sb

  -- One idempotent ground, all three faces at once.
  record Coincide : Set₁ where
    field
      hosting   : SelfHosting expFlexad
      selecting : SelfSelecting writerReflad
      buffering : SelfBuffering

  coincide : Idempotent → Coincide
  coincide idem = record
    { hosting   = idem→hosting   idem
    ; selecting = idem→selecting idem
    ; buffering = idem→buffering idem
    }
  -- <<< coincide
