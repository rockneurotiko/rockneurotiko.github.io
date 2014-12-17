{-# OPTIONS_GHC -fglasgow-exts #-}
-----------------------------------------------------------------------------
-- |
-- Module     : Data.Vector.Dense.Operations
-- Copyright  : Copyright (c) 2008, Patrick Perry <patperry@stanford.edu>
-- License    : BSD3
-- Maintainer : Patrick Perry <patperry@stanford.edu>
-- Stability  : experimental
--

module Data.Vector.Dense.Operations (
    -- * Copy and swap
    copyVector,
    swapVectors,

    -- * Vector norms and inner products
    -- ** Pure
    sumAbs,
    norm2,
    whichMaxAbs,
    (<.>),

    getSumAbs,
    getNorm2,
    getWhichMaxAbs,
    getDot,

    -- * Vector arithmetic
    -- ** Pure
    shift,
    scale,
    invScale,
    add,
    plus,
    minus,
    times,
    divide,

    -- ** Impure
    getConj,
    getShifted,
    getScaled,
    getInvScaled,
    getSum,
    getDiff,
    getProduct,
    getRatio,

    -- * In-place arithmetic
    doConj,
    scaleBy,
    shiftBy,
    invScaleBy,
    (+=),
    (-=),
    (*=),
    (//=),

    -- * BLAS calls
    axpy,

    -- * Unsafe operations
    unsafeCopyVector,
    unsafeSwapVectors,
    unsafeGetDot,
    unsafeAxpy,
    unsafePlusEquals,
    unsafeMinusEquals,
    unsafeTimesEquals,
    unsafeDivideEquals,

    ) where

import Control.Monad ( forM_ )
import Data.Vector.Dense.Internal
import BLAS.Tensor
import BLAS.Elem.Base ( Elem )
import qualified BLAS.Elem.Base as E

import Foreign ( Ptr )
import System.IO.Unsafe
import Unsafe.Coerce

import BLAS.Internal  ( inlinePerformIO, checkVecVecOp )
import BLAS.C hiding ( copy, swap, iamax, conj, axpy, acxpy )
import qualified BLAS.C as BLAS
import qualified BLAS.C.Types as T

infixl 7 <.>, `times`, `divide`, `scale`, `invScale`
infixl 6 `plus`, `minus`, `shift`
infixl 1 +=, -=, *=, //=



-- | Create a new vector by scaling every element by a value.  @scale'k x@
-- is equal to @newCopy' (scale k x)@.
getScaled :: (BLAS1 e) => e -> DVector t n e -> IO (DVector r n e)
getScaled k x = do
    y <- newCopy x
    scaleBy k (unsafeThaw y)
    return (unsafeCoerce y)

-- | Create a new vector by dividing every element by a value.
getInvScaled :: (BLAS1 e) => e -> DVector t n e -> IO (DVector r n e)
getInvScaled k x = do
    y <- newCopy x
    invScaleBy k (unsafeThaw y)
    return (unsafeCoerce y)


-- | Computes the elementwise ratio of two vectors.
getRatio :: (BLAS2 e) => DVector s n e -> DVector t n e -> IO (DVector r n e)
getRatio = binaryOp "getRatio" (//=)

-- | Divide every element by a value.
invScaleBy :: (BLAS1 e) => e -> IOVector n e -> IO ()
invScaleBy k x | isConj x  = invScaleBy (E.conj k) (conj x)
               | otherwise = modifyWith (/k) x

-- | @y //= x@ replaces @y@ by @y / x@, the elementwise ratio.
(//=) :: (BLAS2 e) => IOVector n e -> DVector t n e -> IO ()
(//=) y x = checkVecVecOp "(//=)" (dim y) (dim x) $ unsafeDivideEquals y x

unsafeDivideEquals :: (BLAS2 e) => IOVector n e -> DVector t n e -> IO ()
unsafeDivideEquals y x
    | isConj y =
        unsafeDivideEquals (conj y) (conj x)
    | isConj x =
        call2 (flip (tbsv T.colMajor T.upper T.conjTrans T.nonUnit) 0) x y
    | otherwise =
        call2 (flip (tbsv T.colMajor T.upper T.noTrans T.nonUnit) 0) x y


call2 :: (Elem e) =>
       (Int -> Ptr e -> Int -> Ptr e -> Int -> IO a)
    -> DVector s n e -> DVector t m e -> IO a
call2 f x y =
    let n    = dim x
        incX = strideOf x
        incY = strideOf y
    in unsafeWithElemPtr x 0 $ \pX ->
           unsafeWithElemPtr y 0 $ \pY ->
               f n pX incX pY incY


binaryOp :: (BLAS1 e) => String -> (IOVector n e -> DVector t n e -> IO ())
    -> DVector s n e -> DVector t n e -> IO (DVector r n e)
binaryOp name f x y =
    checkVecVecOp name (dim x) (dim y) $ do
        x' <- newCopy x >>= return . unsafeThaw
        f x' y
        return $! (unsafeCoerce x')


