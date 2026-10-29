// Browsing today's quests by swiping the card. Jumping to a quest moves it
// to the front of the queue, so the quest icons keep a steady order of their
// own: known quests keep their place, new ones (a swap) take the place of the
// quest they replaced or go at the end.

/** Keys in the order they were first shown, without the ones that are gone. */
export const stableOrder = (prev: readonly string[], keys: readonly string[]): string[] => {
  const now = new Set(keys);
  const kept = prev.filter((k) => now.has(k));
  const known = new Set(kept);
  const added = keys.filter((k) => !known.has(k));
  // A swap replaces one quest with one new quest: keep it in the same spot.
  const gone = prev.filter((k) => !now.has(k));
  if (gone.length === 1 && added.length === 1) {
    const out = prev.slice();
    out[out.indexOf(gone[0])] = added[0];
    return out;
  }
  return [...kept, ...added];
};

/**
 * The quest a swipe goes to: `dir` 1 is the next quest, -1 the previous one,
 * wrapping around at the ends. Null when there is nowhere else to go.
 */
export const browseTarget = (order: readonly string[], current: string, dir: 1 | -1): string | null => {
  const i = order.indexOf(current);
  if (order.length < 2 || i < 0) return null;
  return order[(i + dir + order.length) % order.length];
};
