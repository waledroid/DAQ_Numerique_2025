import { t } from '../lib/i18n';
import type { Lang } from '../engine/types';

const HOST_ID = 'izifill-root';

const CSS = `
.panel {
  position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
  background: #1f2937; color: #f9fafb; border-radius: 10px; padding: 12px 16px;
  font: 13px/1.5 system-ui, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,.35);
  max-width: 300px;
}
.panel button {
  margin: 8px 8px 0 0; padding: 6px 12px; border: 0; border-radius: 6px;
  cursor: pointer; font: inherit;
}
.panel button.primary { background: #16a34a; color: white; }
.panel button.secondary { background: #4b5563; color: #e5e7eb; }
.izifill-toast {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; background: #16a34a; color: white; border-radius: 8px;
  padding: 10px 18px; font: 13px system-ui, sans-serif;
}
`;

let host: HTMLElement | null = null;

function root(): ShadowRoot {
  if (host?.isConnected) return host.shadowRoot!;
  host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);
  document.documentElement.appendChild(host);
  return shadow;
}

function panel(): HTMLElement {
  const r = root();
  let p = r.querySelector<HTMLElement>('.panel');
  if (!p) {
    p = document.createElement('div');
    p.className = 'panel';
    r.appendChild(p);
  }
  return p;
}

export function showPrompt(lang: Lang, onYes: () => void, onNever: () => void): void {
  const p = panel();
  p.textContent = '';
  const title = document.createElement('div');
  title.textContent = t('promptTitle', lang);
  const yes = document.createElement('button');
  yes.className = 'primary';
  yes.textContent = t('yes', lang);
  yes.addEventListener('click', onYes);
  const never = document.createElement('button');
  never.className = 'secondary';
  never.textContent = t('notThisSite', lang);
  never.addEventListener('click', onNever);
  p.append(title, yes, never);
}

export function showSummary(lang: Lang, counts: { filled: number; uncertain: number; unknown: number }): void {
  const p = panel();
  p.textContent = '';
  const line = document.createElement('div');
  line.textContent = 'izifill · ' + t('summary', lang, counts);
  p.append(line);
}

export function showToast(message: string): void {
  const r = root();
  const toast = document.createElement('div');
  toast.className = 'izifill-toast';
  toast.textContent = message;
  r.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

const OUTLINE = {
  filled: '2px solid #16a34a',
  uncertain: '2px solid #f59e0b',
  unknown: '2px solid #dc2626',
};

export function highlightField(el: HTMLElement, status: keyof typeof OUTLINE): void {
  el.style.outline = OUTLINE[status];
  el.style.outlineOffset = '1px';
}

export function showSaveChip(el: HTMLElement, lang: Lang, onSave: () => void): void {
  if (el.nextElementSibling?.classList.contains('izifill-chip')) return;
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'izifill-chip';
  chip.textContent = t('saveAnswer', lang);
  chip.style.cssText =
    'margin:4px;padding:2px 8px;font:12px system-ui,sans-serif;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer;';
  chip.addEventListener('click', () => {
    chip.remove();
    onSave();
  });
  el.insertAdjacentElement('afterend', chip);
}

export function clearUi(): void {
  document.getElementById(HOST_ID)?.remove();
  host = null;
}
