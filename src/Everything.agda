------------------------------------------------------------------------
-- Reflexads — everything
--
-- Imports every chapter module. Type-checking this file type-checks the
-- whole library; add a line here as each chapter is written. Each chapter
-- module is standalone — it imports nothing from the others.
--
-- Not --safe overall, because Chapter 3 postulates function extensionality.
-- Chapters 1 and 2 are individually --safe.
------------------------------------------------------------------------

module Everything where

import Reflexads.Chapter01
import Reflexads.Chapter02
import Reflexads.Chapter03
import Reflexads.Chapter04
import Reflexads.Chapter05
import Reflexads.Chapter06
