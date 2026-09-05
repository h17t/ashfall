import { describe, it, expect } from 'vitest';
import { scan } from './banned-terms';

describe('banned terms (the rename cannot come back)', () => {
  it('no borrowed vocabulary anywhere in source, content, tools or docs', () => {
    const hits = scan();
    const report = hits.slice(0, 60).map((h) => `${h.file}:${h.line} [${h.term}] ${h.text}`).join('\n');
    expect(hits.length, report).toBe(0);
  });
});
