import JSBI from 'jsbi'
import invariant from 'tiny-invariant'
import { ZERO, ONE, TWO, THREE, MoveType, MOVE_TYPE_MAXIMA } from './constants'
import { Currency } from './currency'
import { CurrencyAmount, Percent, Price } from './fractions'

export function validateMoveTypeInstance(value: JSBI, moveType: MoveType): void {
  invariant(JSBI.greaterThanOrEqual(value, ZERO), `${value} is not a ${moveType}.`)
  invariant(JSBI.lessThanOrEqual(value, MOVE_TYPE_MAXIMA[moveType]), `${value} is not a ${moveType}.`)
}

// mock the on-chain sqrt function
export function sqrt(y: JSBI): JSBI {
  validateMoveTypeInstance(y, MoveType.u256)
  let z: JSBI = ZERO
  let x: JSBI
  if (JSBI.greaterThan(y, THREE)) {
    z = y
    x = JSBI.add(JSBI.divide(y, TWO), ONE)
    while (JSBI.lessThan(x, z)) {
      z = x
      x = JSBI.divide(JSBI.add(JSBI.divide(y, x), x), TWO)
    }
  } else if (JSBI.notEqual(y, ZERO)) {
    z = ONE
  }
  return z
}

/* eslint-disable */
// given an array of items sorted by `comparator`, insert an item into its sort index and constrain the size to
// `maxSize` by removing the last item
export function sortedInsert<T>(items: T[], add: T, maxSize: number, comparator: (a: T, b: T) => number): T | null {
  invariant(maxSize > 0, 'MAX_SIZE_ZERO')
  // this is an invariant because the interface cannot return multiple removed items if items.length exceeds maxSize
  invariant(items.length <= maxSize, 'ITEMS_SIZE')

  // short circuit first item add
  if (items.length === 0) {
    items.push(add)
    return null
  } else {
    const isFull = items.length === maxSize
    // short circuit if full and the additional item does not come before the last item
    if (isFull && comparator(items[items.length - 1], add) <= 0) {
      return add
    }

    let lo = 0,
      hi = items.length

    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (comparator(items[mid], add) <= 0) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    items.splice(lo, 0, add)
    return isFull ? items.pop()! : null
  }
}
/* eslint-enable */

/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
export function computePriceImpact<TBase extends Currency, TQuote extends Currency>(
  midPrice: Price<TBase, TQuote>,
  inputAmount: CurrencyAmount<TBase>,
  outputAmount: CurrencyAmount<TQuote>
): Percent {
  const quotedOutputAmount = midPrice.quote(inputAmount)
  // calculate price impact := (exactQuote - outputAmount) / exactQuote
  const priceImpact = quotedOutputAmount.subtract(outputAmount).divide(quotedOutputAmount)
  return new Percent(priceImpact.numerator, priceImpact.denominator)
}
