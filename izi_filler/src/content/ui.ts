import { t } from '../lib/i18n';
import type { Lang } from '../engine/types';

const HOST_ID = 'izifill-root';

const CSS = `
.launcher {
  position: fixed; right: 0; top: 40%; z-index: 2147483647;
  width: 44px; height: 44px; border: 0; border-radius: 10px 0 0 10px;
  background: #2563eb; color: #fff; font: 700 15px system-ui, sans-serif;
  cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,.35); touch-action: none;
}
.launcher.pulse { animation: izpulse 1.2s ease-in-out 3; }
@keyframes izpulse { 50% { transform: scale(1.15); background: #16a34a; } }
.sidebar {
  position: fixed; right: 0; top: 0; height: 100vh; width: 320px; z-index: 2147483647;
  background: #1f2937; color: #f9fafb; font: 13px/1.5 system-ui, sans-serif;
  box-shadow: -4px 0 24px rgba(0,0,0,.4); padding: 14px; box-sizing: border-box;
  transform: translateX(105%); transition: transform .2s ease; display: flex;
  flex-direction: column; gap: 12px;
}
.sidebar.open { transform: translateX(0); }
.header { display: flex; align-items: center; justify-content: space-between; }
.header .brand { font-weight: 700; font-size: 15px; }
button.close { background: none; border: 0; color: #9ca3af; font-size: 16px; cursor: pointer; }
select.profiles {
  width: 100%; padding: 7px 8px; border-radius: 8px; border: 1px solid #4b5563;
  background: #111827; color: #f9fafb; font: inherit;
}
.question { background: #111827; border-radius: 10px; padding: 10px 12px; }
.sidebar button.primary {
  padding: 8px 12px; border: 0; border-radius: 8px; background: #16a34a;
  color: #fff; font: inherit; cursor: pointer; margin: 8px 8px 0 0;
}
.sidebar button.secondary {
  padding: 8px 12px; border: 0; border-radius: 8px; background: #4b5563;
  color: #e5e7eb; font: inherit; cursor: pointer; margin: 8px 0 0 0;
}
button.fill { width: 100%; margin: 0; }
.summary { color: #d1d5db; min-height: 1.4em; }
.footer { margin-top: auto; display: flex; gap: 8px; }
.footer button {
  flex: 1; padding: 7px; border: 0; border-radius: 8px; background: #374151;
  color: #e5e7eb; font: inherit; cursor: pointer;
}
.izifill-toast {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; background: #16a34a; color: white; border-radius: 8px;
  padding: 10px 18px; font: 13px system-ui, sans-serif;
}
`;

export interface SidebarOptions {
  profiles: { id: string; name: string }[];
  activeId: string;
  onProfileChange: (id: string) => void;
  onFill: () => void;
  onOpenProfile: () => void;
  onOpenTracker: () => void;
}

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

function sidebarEl(): HTMLElement | null {
  return root().querySelector<HTMLElement>('.sidebar');
}

export function expandSidebar(): void {
  sidebarEl()?.classList.add('open');
}

export function collapseSidebar(): void {
  sidebarEl()?.classList.remove('open');
}

function makeDraggable(launcher: HTMLElement): void {
  let startY = 0;
  let startTop = 0;
  let moved = false;
  launcher.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    startTop = launcher.offsetTop;
    moved = false;
    const onMove = (ev: PointerEvent): void => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      launcher.style.top = Math.max(0, startTop + dy) + 'px';
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  launcher.addEventListener('click', (e) => {
    if (moved) e.stopImmediatePropagation();
  }, true);
}

export function mountSidebar(lang: Lang, opts?: Partial<SidebarOptions>): void {
  const r = root();
  let sidebar = r.querySelector<HTMLElement>('.sidebar');
  if (!sidebar) {
    const launcher = document.createElement('button');
    launcher.className = 'launcher';
    launcher.textContent = 'iz';
    launcher.title = 'izifill';
    makeDraggable(launcher);
    r.appendChild(launcher);

    sidebar = document.createElement('div');
    sidebar.className = 'sidebar';

    const header = document.createElement('div');
    header.className = 'header';
    const brand = document.createElement('span');
    brand.className = 'brand';
    brand.textContent = 'izifill';
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '✕';
    close.addEventListener('click', collapseSidebar);
    header.append(brand, close);

    const select = document.createElement('select');
    select.className = 'profiles';

    const question = document.createElement('div');
    question.className = 'question';
    question.hidden = true;

    const fill = document.createElement('button');
    fill.className = 'primary fill';

    const summary = document.createElement('div');
    summary.className = 'summary';

    const footer = document.createElement('div');
    footer.className = 'footer';
    const openProfile = document.createElement('button');
    openProfile.className = 'open-profile';
    const openTracker = document.createElement('button');
    openTracker.className = 'open-tracker';
    footer.append(openProfile, openTracker);

    sidebar.append(header, select, question, fill, summary, footer);
    r.appendChild(sidebar);

    launcher.addEventListener('click', () => {
      sidebar!.classList.toggle('open');
    });
  }

  const select = sidebar.querySelector<HTMLSelectElement>('select.profiles')!;
  const fill = sidebar.querySelector<HTMLButtonElement>('button.fill')!;
  const openProfile = sidebar.querySelector<HTMLButtonElement>('button.open-profile')!;
  const openTracker = sidebar.querySelector<HTMLButtonElement>('button.open-tracker')!;

  fill.textContent = lang === 'fr' ? 'Remplir cette page' : 'Fill this page';
  openProfile.textContent = lang === 'fr' ? 'Mon profil' : 'My profile';
  openTracker.textContent = lang === 'fr' ? 'Mes candidatures' : 'My applications';

  select.textContent = '';
  const profiles = opts?.profiles ?? [];
  for (const p of profiles) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    select.appendChild(o);
  }
  select.hidden = profiles.length === 0;
  if (opts?.activeId) select.value = opts.activeId;

  select.onchange = () => opts?.onProfileChange?.(select.value);
  fill.onclick = () => opts?.onFill?.();
  openProfile.onclick = () => opts?.onOpenProfile?.();
  openTracker.onclick = () => opts?.onOpenTracker?.();
}

function ensureSidebar(lang: Lang): HTMLElement {
  if (!sidebarEl()) mountSidebar(lang);
  return sidebarEl()!;
}

export function showPrompt(lang: Lang, onYes: () => void, onNever: () => void): void {
  const sidebar = ensureSidebar(lang);
  const question = sidebar.querySelector<HTMLElement>('.question')!;
  question.textContent = '';
  question.hidden = false;
  const title = document.createElement('div');
  title.textContent = t('promptTitle', lang);
  const yes = document.createElement('button');
  yes.className = 'primary';
  yes.textContent = t('yes', lang);
  yes.addEventListener('click', () => {
    question.hidden = true;
    onYes();
  });
  const never = document.createElement('button');
  never.className = 'secondary';
  never.textContent = t('notThisSite', lang);
  never.addEventListener('click', onNever);
  question.append(title, yes, never);
  root().querySelector('.launcher')?.classList.add('pulse');
  expandSidebar();
}

export function showSummary(lang: Lang, counts: { filled: number; uncertain: number; unknown: number }): void {
  const sidebar = ensureSidebar(lang);
  sidebar.querySelector<HTMLElement>('.summary')!.textContent = t('summary', lang, counts);
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
