------------------------------------------------------------------------
-- Chapter 4 — Holding Itself Up
--
-- The companion module to book/chapters/04-holding-itself-up.typ.
--
-- Standalone. Chapter 3's hosting face (Flexad) can grow — `spread` turns a
-- host into a host of hosts. Self-hosting is a PROPERTY of a flexad: it comes
-- equipped with a regrounding that undoes that growth, settling flat in one
-- step. The concrete exponent flexad has this property exactly when its ground
-- is idempotent.
--
-- Not --safe: like Chapter 3, the hosting face reads functions of the ground,
-- so we postulate function extensionality.
------------------------------------------------------------------------

module Reflexads.Chapter04 where

-- Local primitives.
data _≡_ {A : Set} (x : A) : A → Set where
  refl : x ≡ x

cong : {A B : Set} (f : A → B) {x y : A} → x ≡ y → f x ≡ f y
cong f refl = refl

postulate
  funext : {A : Set} {B : A → Set} {f g : (x : A) → B x}
         → (∀ x → f x ≡ g x) → f ≡ g

private
  variable
    A B C : Set

-- The comonad (Chapter 3): being situated, and reading.
record Comonad (W : Set → Set) : Set₁ where
  field
    extract : W A → A
    _=>>_   : W A → (W A → B) → W B

    left-counit  : (w : W A) → (w =>> extract) ≡ w
    right-counit : (w : W A) (f : W A → B) → extract (w =>> f) ≡ f w
    co-assoc     : (w : W A) (f : W A → B) (g : W B → C)
                 → ((w =>> f) =>> g) ≡ (w =>> λ w′ → g (w′ =>> f))

-- The Flexad (Chapter 3): the hosting face. `spread` grows a host into a host
-- of hosts, one level up.
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

-- Self-hosting is a property of a flexad: it settles flat in one step. There is
-- a regrounding, `consolidate`, that folds the extra level `spread` grows back
-- down — and the round trip is the identity, landing exactly where it began.
-- >>> selfhosting
record SelfHosting {W : Set → Set} (F : Flexad W) : Set₁ where
  open Flexad F
  field
    consolidate : W (W A) → W A
    settles     : (w : W A) → consolidate (spread w) ≡ w
-- <<< selfhosting

-- The ground: an interaction space. This chapter turns on one property it may
-- or may not have — idempotence.
record Monoid : Set₁ where
  field
    Carrier   : Set
    ε         : Carrier
    _∙_       : Carrier → Carrier → Carrier
    assoc     : (x y z : Carrier) → ((x ∙ y) ∙ z) ≡ (x ∙ (y ∙ z))
    identityˡ : (x : Carrier) → (ε ∙ x) ≡ x
    identityʳ : (x : Carrier) → (x ∙ ε) ≡ x

-- The corresponding stack: the exponent flexad over a ground (Chapter 3), and
-- its self-hosting exactly when the ground is idempotent.
module _ (G : Monoid) where
  open Monoid G

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

  expAssoc : (f : Exp A) (g : Exp A → B) (h : Exp B → C)
           → ((f =>>ᴱ g) =>>ᴱ h) ≡ (f =>>ᴱ λ f′ → h (f′ =>>ᴱ g))
  expAssoc f g h =
    funext (λ m → cong h (funext (λ n → cong g (funext (λ p → cong f (assoc m n p))))))

  expFlexad : Flexad Exp
  expFlexad = record
    { comonad = record
        { extract = extractᴱ ; _=>>_ = _=>>ᴱ_
        ; left-counit = expLeft ; right-counit = expRight ; co-assoc = expAssoc
        }
    }

  -- Grow (spread) then reground (the diagonal) lands on λ m → f (m ∙ m), so the
  -- round trip is the identity exactly when x ∙ x = x. The flexad self-hosts
  -- precisely when its ground is idempotent — the ground's own idempotence,
  -- handed up.
  -- >>> from-ground
  exp-self-hosting : ((x : Carrier) → (x ∙ x) ≡ x) → SelfHosting expFlexad
  exp-self-hosting idem = record
    { consolidate = λ F m → F m m
    ; settles     = λ f → funext (λ m → cong f (idem m))
    }
  -- <<< from-ground
