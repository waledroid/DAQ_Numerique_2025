import type { FieldSnapshot } from '../engine/types';

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function labelFor(el: Element, doc: Document): string {
  const id = el.id;
  if (id) {
    try {
      const l = doc.querySelector(`label[for="${id}"]`);
      if (l) return text(l);
    } catch {
      // invalid selector characters in id — ignore
    }
  }
  const wrap = el.closest('label');
  if (wrap) return text(wrap);
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    return labelledby
      .split(/\s+/)
      .map((i) => text(doc.getElementById(i)))
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function contextFor(el: Element): string {
  return text(el.closest('fieldset')?.querySelector('legend') ?? null);
}

const CONTROL_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']);

// Last-resort label: short text just before the control (many sites put the
// question in a bare <div>/<p> with no <label> association).
function precedingText(el: Element): string {
  const prev = el.previousElementSibling ?? el.parentElement?.previousElementSibling;
  if (!prev) return '';
  if (CONTROL_TAGS.has(prev.tagName)) return '';
  if (prev.querySelector('input, select, textarea')) return '';
  const value = text(prev);
  return value.length > 0 && value.length <= 120 ? value : '';
}

export function snapshotFields(doc: Document): FieldSnapshot[] {
  doc.querySelectorAll('[data-izifill-ref]').forEach((el) => el.removeAttribute('data-izifill-ref'));
  const els = Array.from(doc.querySelectorAll<HTMLElement>('input, select, textarea'));
  const out: FieldSnapshot[] = [];
  const radioGroups = new Map<string, FieldSnapshot>();
  let counter = 0;

  for (const el of els) {
    const input = el as HTMLInputElement;
    if (input.disabled) continue;
    const tag = el.tagName.toLowerCase() as FieldSnapshot['tag'];
    const type = tag === 'input' ? (input.type || 'text').toLowerCase() : '';

    if (type === 'radio') {
      const groupName = input.name || input.id;
      if (!groupName) continue;
      let group = radioGroups.get(groupName);
      if (!group) {
        group = {
          ref: String(counter++),
          tag: 'input',
          type: 'radio',
          name: groupName,
          id: '',
          autocomplete: '',
          placeholder: '',
          ariaLabel: '',
          label: contextFor(el) || groupName,
          context: contextFor(el),
          options: [],
          required: input.required,
        };
        radioGroups.set(groupName, group);
        out.push(group);
      }
      el.setAttribute('data-izifill-ref', group.ref);
      group.options.push({ value: input.value, text: labelFor(el, doc) || input.value });
      continue;
    }

    const ref = String(counter++);
    el.setAttribute('data-izifill-ref', ref);
    out.push({
      ref,
      tag,
      type,
      name: (el as HTMLInputElement).name ?? '',
      id: el.id,
      autocomplete: el.getAttribute('autocomplete') ?? '',
      placeholder: el.getAttribute('placeholder') ?? '',
      ariaLabel: el.getAttribute('aria-label') ?? '',
      label: labelFor(el, doc) || (el.getAttribute('aria-label') ? '' : precedingText(el)),
      context: contextFor(el),
      options:
        tag === 'select'
          ? Array.from((el as HTMLSelectElement).options).map((o) => ({ value: o.value, text: text(o) }))
          : [],
      required: (el as HTMLInputElement).required ?? false,
    });
  }
  return out;
}
