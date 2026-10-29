import { describe, expect, it } from 'vitest';
import { addDays } from './date';
import { dayNumber, pickTip } from './tips';
import en from '../i18n/en';

const general = en.tips.general;
const slip = en.tips.slip;

describe('habit tips', () => {
  it('gives the same tip for the same day and moment', () => {
    expect(pickTip(general, '2026-11-02', 'cleared')).toBe(pickTip(general, '2026-11-02', 'cleared'));
  });

  it('never repeats a tip within one pass of the list', () => {
    for (const pool of [general, slip]) {
      const seen = new Set<string>();
      for (let i = 0; i < pool.length; i++) seen.add(pickTip(pool, addDays('2026-10-01', i), 'cleared'));
      expect(seen.size).toBe(pool.length);
    }
  });

  it('shows different tips for day cleared and level-up on the same day', () => {
    for (let i = 0; i < 40; i++) {
      const day = addDays('2026-10-01', i);
      expect(pickTip(general, day, 'cleared')).not.toBe(pickTip(general, day, 'levelUp'));
    }
  });

  it('works across month and year ends', () => {
    expect(dayNumber('2027-01-01') - dayNumber('2026-12-31')).toBe(1);
    expect(pickTip(general, '2026-12-31', 'cleared')).toBeTruthy();
    expect(pickTip([], '2026-12-31', 'cleared')).toBe('');
  });

  it('keeps every tip short, with no guilt words', () => {
    for (const tip of [...general, ...slip]) {
      expect(tip.split(/\s+/).length).toBeLessThan(15);
      expect(tip).not.toMatch(/\b(fail|failure|lazy|shame|guilt|should have)\b/i);
    }
    expect(general.length).toBeGreaterThanOrEqual(30);
  });
});
