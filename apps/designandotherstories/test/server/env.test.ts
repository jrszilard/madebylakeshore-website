import { describe, it, expect } from 'vitest';
import { requireServerEnv } from '../../src/lib/server/env';

describe('requireServerEnv', () => {
  it('returns a present env var', () => {
    process.env.DAOS_TEST_ENV = 'hello';
    expect(requireServerEnv('DAOS_TEST_ENV')).toBe('hello');
  });
  it('throws on a missing env var', () => {
    delete process.env.DAOS_TEST_MISSING;
    expect(() => requireServerEnv('DAOS_TEST_MISSING')).toThrow(/Missing required server env var/);
  });
});
