import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mountSidebar, showPrompt, showSummary, showToast, highlightField, showSaveChip, clearUi,
  showApplyButton, showSubmitConfirm, showPilotStatus, showPilotControls,
} from '../../src/content/ui';

beforeEach(() => {
  clearUi();
  document.body.innerHTML = '';
});

function root(): ShadowRoot {
  return document.getElementById('izifill-root')!.shadowRoot!;
}

describe('mountSidebar', () => {
  it('renders a collapsed launcher and a sidebar with profile options', () => {
    const onProfileChange = vi.fn();
    mountSidebar('en', {
      profiles: [{ id: 'a', name: 'Engineer' }, { id: 'b', name: 'Hotel' }],
      activeId: 'b',
      onProfileChange,
      onFill: vi.fn(),
      onOpenProfile: vi.fn(),
      onOpenTracker: vi.fn(),
    });
    expect(root().querySelector('.launcher')).not.toBeNull();
    const sidebar = root().querySelector('.sidebar')!;
    expect(sidebar.classList.contains('open')).toBe(false);
    const select = root().querySelector<HTMLSelectElement>('select.profiles')!;
    expect([...select.options].map((o) => o.textContent)).toEqual(['Engineer', 'Hotel']);
    expect(select.value).toBe('b');
    select.value = 'a';
    select.dispatchEvent(new Event('change'));
    expect(onProfileChange).toHaveBeenCalledWith('a');
  });

  it('toggles open on launcher click and fires onFill from the fill button', () => {
    const onFill = vi.fn();
    mountSidebar('fr', {
      profiles: [{ id: 'a', name: 'P' }], activeId: 'a',
      onProfileChange: vi.fn(), onFill, onOpenProfile: vi.fn(), onOpenTracker: vi.fn(),
    });
    const launcher = root().querySelector<HTMLButtonElement>('.launcher')!;
    launcher.click();
    expect(root().querySelector('.sidebar')!.classList.contains('open')).toBe(true);
    root().querySelector<HTMLButtonElement>('button.fill')!.click();
    expect(onFill).toHaveBeenCalledOnce();
    root().querySelector<HTMLButtonElement>('button.close')!.click();
    expect(root().querySelector('.sidebar')!.classList.contains('open')).toBe(false);
  });
});

describe('showPrompt', () => {
  it('expands the sidebar with a question and wires callbacks', () => {
    const onYes = vi.fn();
    const onNever = vi.fn();
    showPrompt('fr', onYes, onNever);
    const sidebar = root().querySelector('.sidebar')!;
    expect(sidebar.classList.contains('open')).toBe(true);
    const buttons = root().querySelectorAll<HTMLButtonElement>('.question button');
    expect(buttons).toHaveLength(2);
    buttons[0].click();
    expect(onYes).toHaveBeenCalledOnce();
    expect(onNever).not.toHaveBeenCalled();
  });
});

describe('showSummary', () => {
  it('shows the counts in the sidebar', () => {
    showSummary('en', { filled: 3, uncertain: 1, unknown: 2 });
    expect(root().querySelector('.summary')!.textContent).toContain('3');
    expect(root().textContent).toContain('left for you');
  });
});

describe('pilot UI', () => {
  it('showApplyButton expands the sidebar and fires onStart', () => {
    const onStart = vi.fn();
    showApplyButton('fr', onStart);
    const sidebar = root().querySelector('.sidebar')!;
    expect(sidebar.classList.contains('open')).toBe(true);
    const btn = root().querySelector<HTMLButtonElement>('.question button.apply')!;
    expect(btn.textContent).toBe('Postuler avec izifill');
    btn.click();
    expect(onStart).toHaveBeenCalledOnce();
  });
  it('showSubmitConfirm offers both submit choices', () => {
    const onIzifill = vi.fn();
    const onSelf = vi.fn();
    showSubmitConfirm('en', onIzifill, onSelf);
    const buttons = root().querySelectorAll<HTMLButtonElement>('.question button');
    expect(buttons).toHaveLength(2);
    buttons[0].click();
    expect(onIzifill).toHaveBeenCalledOnce();
    expect(onSelf).not.toHaveBeenCalled();
  });
  it('showPilotStatus displays the status line', () => {
    showPilotStatus('fr', 'Création du compte…');
    expect(root().querySelector('.pilot-status')!.textContent).toBe('Création du compte…');
  });
  it('showPilotControls wires pause and stop', () => {
    const onPause = vi.fn();
    const onStop = vi.fn();
    showPilotControls('en', { paused: false, onPause, onResume: vi.fn(), onStop });
    const row = root().querySelector('.pilot-controls')!;
    const buttons = row.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons).toHaveLength(2);
    buttons[0].click();
    expect(onPause).toHaveBeenCalledOnce();
    buttons[1].click();
    expect(onStop).toHaveBeenCalledOnce();
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
