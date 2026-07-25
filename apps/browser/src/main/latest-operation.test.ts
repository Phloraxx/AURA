import { describe, expect, it } from 'vitest';

import { LatestOperation } from './latest-operation';

describe('LatestOperation', () => {
  it('invalidates an older model response when a newer request starts', () => {
    const operations = new LatestOperation();
    const first = operations.begin();
    const second = operations.begin();

    expect(operations.isCurrent(first)).toBe(false);
    expect(operations.isCurrent(second)).toBe(true);
  });
});
