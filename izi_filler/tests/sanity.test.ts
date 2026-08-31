import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs tests under happy-dom', () => {
    document.body.innerHTML = '<p>ok</p>';
    expect(document.querySelector('p')?.textContent).toBe('ok');
  });
});
