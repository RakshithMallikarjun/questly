import { describe, expect, it } from 'vitest';
import { healthStale } from './HealthSetup';

describe('healthStale', () => {
  it('is quiet until Health is set up', () => {
    expect(healthStale(undefined, {}, '2026-10-27')).toBe(false);
  });
  it('nudges when nothing has arrived yet', () => {
    expect(healthStale('k', {}, '2026-10-27')).toBe(true);
  });
  it('is quiet with data from today or yesterday', () => {
    expect(healthStale('k', { '2026-10-26': {} }, '2026-10-27')).toBe(false);
    expect(healthStale('k', { '2026-10-27': {} }, '2026-10-27')).toBe(false);
  });
  it('nudges after 2 days without data', () => {
    expect(healthStale('k', { '2026-10-25': {} }, '2026-10-27')).toBe(true);
  });
});
