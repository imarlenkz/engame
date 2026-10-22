import { describe, expect, it } from 'vitest';
import { safeNext } from '@/components/auth';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/parent')).toBe('/parent');
    expect(safeNext('/lesson/abc?offline=1')).toBe('/lesson/abc?offline=1');
  });
  it('drops anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/ x', null, '']) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});
