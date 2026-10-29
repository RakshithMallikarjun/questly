import { describe, expect, it } from 'vitest';
import { browseTarget, stableOrder } from './browse';

describe('browsing quests', () => {
  it('keeps the order steady when a quest jumps to the front', () => {
    const first = stableOrder([], ['a', 'b', 'c', 'd']);
    expect(stableOrder(first, ['c', 'a', 'b', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('puts a swapped quest where the old one was, and drops done ones', () => {
    expect(stableOrder(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual(['a', 'x', 'c']);
    expect(stableOrder(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c']);
    expect(stableOrder(['a', 'b'], ['a', 'b', 'z', 'y'])).toEqual(['a', 'b', 'z', 'y']);
  });

  it('goes to the next and previous quest, wrapping at the ends', () => {
    const o = ['a', 'b', 'c'];
    expect(browseTarget(o, 'a', 1)).toBe('b');
    expect(browseTarget(o, 'c', 1)).toBe('a');
    expect(browseTarget(o, 'a', -1)).toBe('c');
    expect(browseTarget(['a'], 'a', 1)).toBeNull();
    expect(browseTarget(o, 'zz', 1)).toBeNull();
  });
});
