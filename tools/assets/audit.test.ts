import { describe, it, expect } from 'vitest';
import { auditAssets, auditSource } from './audit';

describe('asset audit (the no-placeholder rule)', () => {
  it('every entity has a real illustration on disk', async () => {
    expect(await auditAssets()).toEqual([]);
  }, 120000);
  it('the UI source has no banned text, emoji, or off-palette colours', () => {
    expect(auditSource()).toEqual([]);
  });
});
