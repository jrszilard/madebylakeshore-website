import { describe, it, expect } from 'vitest';
import { optionalServerEnv, requireServerEnv } from '../../src/lib/server/env';

describe('server settings', () => {
  it('are read from process.env when asked for, so a value set after startup is seen', () => {
    process.env.FATTAMANO_TEST_ENV = 'hello';
    expect(requireServerEnv('FATTAMANO_TEST_ENV')).toBe('hello');
    expect(optionalServerEnv('FATTAMANO_TEST_ENV')).toBe('hello');
    process.env.FATTAMANO_TEST_ENV = 'changed';
    expect(optionalServerEnv('FATTAMANO_TEST_ENV')).toBe('changed');
  });

  it('throw when a required one is missing', () => {
    delete process.env.FATTAMANO_TEST_MISSING;
    expect(() => requireServerEnv('FATTAMANO_TEST_MISSING')).toThrow(/Missing required server env var/);
  });

  it('give undefined for an optional one that is missing or empty', () => {
    delete process.env.FATTAMANO_TEST_MISSING;
    expect(optionalServerEnv('FATTAMANO_TEST_MISSING')).toBeUndefined();
    process.env.FATTAMANO_TEST_EMPTY = '';
    expect(optionalServerEnv('FATTAMANO_TEST_EMPTY')).toBeUndefined();
  });
});
