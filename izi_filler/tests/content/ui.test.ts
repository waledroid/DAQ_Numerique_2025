import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showPrompt, showSummary, showToast, highlightField, showSaveChip, clearUi } from '../../src/content/ui';

beforeEach(() => {
  clearUi();
  document.body.innerHTML = '';
});

function root(): ShadowRoot {
  return document.getElementById('izifill-root')!.shadowRoot!;
}

describe('showPrompt', () => {
  it('renders two buttons and wires callbacks', () => {
    const onYes = vi.fn();
    const onNever = vi.fn();
    showPrompt('fr', onYes, onNever);
    const buttons = root().querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    (buttons[0] as HTMLButtonElement).click();
    expect(onYes).toHaveBeenCalledOnce();
    expect(onNever).not.toHaveBeenCalled();
  });
});

describe('showSummary', () => {
  it('shows the counts', () => {
    showSummary('en', { filled: 3, uncertain: 1, unknown: 2 });
    expect(root().textContent).toContain('3');
    expect(root().textContent).toContain('left for you');
  });
});

describe('highlightField', () => {
  it('outlines by status', () => {
    document.body.innerHTML = '<input>';
    const el = document.querySelector('input')!;
    highlightField(el, 'unknown');
    expect(el.style.outline).toContain('#dc2626');
  });
});

describe('showSaveChip', () => {
  it('inserts a chip that saves and removes itself', () => {
    document.body.innerHTML = '<input id="q">';
    const el = document.getElementById('q')!;
    const onSave = vi.fn();
    showSaveChip(el, 'en', onSave);
    const chip = document.querySelector('button.izifill-chip') as HTMLButtonElement;
    expect(chip.textContent).toBe('Save this answer');
    chip.click();
    expect(onSave).toHaveBeenCalledOnce();
    expect(document.querySelector('button.izifill-chip')).toBeNull();
  });
  it('does not duplicate chips on the same element', () => {
    document.body.innerHTML = '<input id="q">';
    const el = document.getElementById('q')!;
    showSaveChip(el, 'en', vi.fn());
    showSaveChip(el, 'en', vi.fn());
    expect(document.querySelectorAll('button.izifill-chip')).toHaveLength(1);
  });
});

describe('showToast', () => {
  it('auto-removes after 4 seconds', () => {
    vi.useFakeTimers();
    showToast('done');
    expect(root().querySelector('.izifill-toast')).not.toBeNull();
    vi.advanceTimersByTime(4100);
    expect(root().querySelector('.izifill-toast')).toBeNull();
    vi.useRealTimers();
  });
});
