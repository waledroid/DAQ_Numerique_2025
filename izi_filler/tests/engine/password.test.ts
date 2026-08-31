import { describe, it, expect } from 'vitest';
import { generatePassword } from '../../src/engine/password';

describe('generatePassword', () => {
  it('has the requested length (default 16)', () => {
    expect(generatePassword()).toHaveLength(16);
    expect(generatePassword(20)).toHaveLength(20);
  });
  it('contains lower, upper, digit and symbol characters', () => {
    const p = generatePassword();
    expect(p).toMatch(/[a-z]/);
    expect(p).toMatch(/[A-Z]/);
    expect(p).toMatch(/[0-9]/);
    expect(p).toMatch(/[^a-zA-Z0-9]/);
  });
  it('differs between calls', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
