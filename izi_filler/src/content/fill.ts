import type { FieldMatch, FieldSnapshot } from '../engine/types';
import type { StoredFile } from '../lib/storage';

export interface FillOutcome {
  ref: string;
  status: 'filled' | 'uncertain' | 'unknown' | 'skipped';
  el: HTMLElement | null;
}

export function setNativeValue(el: HTMLElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype :
    el instanceof HTMLSelectElement ? HTMLSelectElement.prototype :
    HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// The user's current answer in a form control, as text usable for learning:
// selects and radios yield the visible option label, inputs their value.
export function currentAnswer(el: HTMLElement, field: FieldSnapshot): string {
  if (field.type === 'radio') {
    const checked = el.ownerDocument.querySelector<HTMLInputElement>(
      `input[type="radio"][data-izifill-ref="${field.ref}"]:checked`,
    );
    if (!checked) return '';
    return field.options.find((o) => o.value === checked.value)?.text ?? checked.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.selectedOptions[0]?.textContent?.trim() ?? el.value;
  }
  return (el as HTMLInputElement).value ?? '';
}

export function injectFile(el: HTMLInputElement, file: StoredFile): boolean {
  try {
    const bin = atob(file.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], file.name, { type: file.mime }));
    el.files = dt.files;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

export function applyMatches(
  doc: Document,
  fields: FieldSnapshot[],
  matches: FieldMatch[],
  files?: { cv?: StoredFile },
): FillOutcome[] {
  const byRef = new Map(fields.map((f) => [f.ref, f]));
  return matches.map((m): FillOutcome => {
    const f = byRef.get(m.ref);
    const el = doc.querySelector<HTMLElement>(`[data-izifill-ref="${m.ref}"]`);
    if (!f || !el) return { ref: m.ref, status: 'skipped', el: null };
    if (m.source === 'unknown') return { ref: m.ref, status: 'unknown', el };
    if (el.dataset.izifillDone) return { ref: m.ref, status: 'skipped', el };

    if (m.key === 'files.cv') {
      if (files?.cv && injectFile(el as HTMLInputElement, files.cv)) {
        el.dataset.izifillDone = '1';
        return { ref: m.ref, status: 'filled', el };
      }
      return { ref: m.ref, status: 'unknown', el };
    }

    if (m.value === undefined) return { ref: m.ref, status: 'unknown', el };

    if (f.type === 'radio') {
      const radios = Array.from(
        doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][data-izifill-ref="${m.ref}"]`),
      );
      const chosen = radios.find((r) => r.value === m.value);
      if (!chosen) return { ref: m.ref, status: 'unknown', el };
      chosen.click();
      if (!chosen.checked) return { ref: m.ref, status: 'unknown', el };
      radios.forEach((r) => (r.dataset.izifillDone = '1'));
    } else if (f.tag === 'select') {
      setNativeValue(el, m.value);
      if ((el as HTMLSelectElement).value !== m.value) return { ref: m.ref, status: 'unknown', el };
      el.dataset.izifillDone = '1';
    } else {
      const cur = (el as HTMLInputElement).value;
      if (cur && cur !== m.value) return { ref: m.ref, status: 'skipped', el };
      setNativeValue(el, m.value);
      if ((el as HTMLInputElement).value !== m.value) return { ref: m.ref, status: 'unknown', el };
      el.dataset.izifillDone = '1';
    }
    return { ref: m.ref, status: m.confidence === 'high' ? 'filled' : 'uncertain', el };
  });
}
