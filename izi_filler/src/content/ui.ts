import { t } from '../lib/i18n';
import type { Lang } from '../engine/types';

const HOST_ID = 'izifill-root';

const CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.launcher {
  position: fixed; right: 0; top: 40%; z-index: 2147483647;
  width: 48px; height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-right: 0;
  border-radius: 14px 0 0 14px;
  background: rgba(18, 24, 34, 0.82);
  backdrop-filter: blur(24px) saturate(190%) contrast(105%);
  -webkit-backdrop-filter: blur(24px) saturate(190%) contrast(105%);
  color: #f8fafc;
  font: 700 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  cursor: grab;
  box-shadow: -4px 6px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  touch-action: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  user-select: none;
}
.launcher:hover {
  width: 54px;
  background: rgba(22, 30, 42, 0.92);
  box-shadow: -6px 8px 28px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.launcher:active { cursor: grabbing; transform: scale(0.96); }
.launcher .iz-logo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff; font-weight: 800; font-size: 12px; letter-spacing: -0.5px;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.launcher.pulse { animation: izpulse 1.4s cubic-bezier(0.4, 0, 0.2, 1) 3; }
@keyframes izpulse {
  0%, 100% {
    box-shadow: -4px 6px 24px rgba(0, 0, 0, 0.35), 0 0 0 0 rgba(16, 185, 129, 0.8);
  }
  50% {
    transform: scale(1.1);
    border-color: rgba(52, 211, 153, 0.7);
    box-shadow: -6px 8px 30px rgba(16, 185, 129, 0.55), 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

.sidebar {
  position: fixed; right: 0; top: 0; height: 100vh; width: 336px; z-index: 2147483647;
  background: rgba(15, 23, 34, 0.84);
  backdrop-filter: blur(32px) saturate(200%) contrast(105%);
  -webkit-backdrop-filter: blur(32px) saturate(200%) contrast(105%);
  color: #f1f5f9;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: -16px 0 44px rgba(0, 0, 0, 0.5), inset 1px 0 0 rgba(255, 255, 255, 0.08);
  padding: 16px 14px; box-sizing: border-box;
  transform: translateX(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto; overflow-x: hidden;
}
.sidebar.open { transform: translateX(0); }

.sidebar::-webkit-scrollbar { width: 5px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 9999px; }
.sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.22); }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.header .brand-wrap {
  display: flex; align-items: center; gap: 8px;
}
.header .brand-icon {
  width: 22px; height: 22px; border-radius: 7px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}
.header .brand {
  font-weight: 700; font-size: 15px; letter-spacing: -0.3px; color: #f8fafc;
}
.header .brand-badge {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; padding: 2px 7px; border-radius: 12px;
  background: rgba(16, 185, 129, 0.14); color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.25);
}
button.close {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
button.close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #f8fafc; transform: scale(1.08);
}
button.close:active { transform: scale(0.92); }

select.profiles {
  width: 100%; padding: 8px 12px; border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc; font: 500 13px -apple-system, BlinkMacSystemFont, sans-serif;
  outline: none; cursor: pointer; box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
select.profiles:hover {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}
select.profiles:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}
select.profiles option {
  background: #0f172a;
  color: #f8fafc;
}

.question {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 34, 0.65));
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 12px; padding: 12px 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  animation: izfadein 0.25s ease-out;
}
@keyframes izfadein { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.question > div:first-child {
  font-weight: 600; font-size: 13px; color: #f8fafc; margin-bottom: 10px; line-height: 1.4;
}

.sidebar button.primary {
  padding: 9px 14px; border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff; font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer; margin: 4px 6px 0 0;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.sidebar button.primary:hover {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}
.sidebar button.primary:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.sidebar button.secondary {
  padding: 9px 12px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1; font: 500 13px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer; margin: 4px 0 0 0;
  transition: all 0.18s ease;
  display: inline-flex; align-items: center; justify-content: center;
}
.sidebar button.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.18);
}
.sidebar button.secondary:active {
  transform: scale(0.98);
}

button.fill {
  width: 100%; margin: 0;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.2px;
  border-radius: 11px;
}

.summary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.45;
  min-height: 1.4em;
}
.summary:empty { display: none; }

.footer {
  margin-top: auto;
  display: flex; gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.footer button {
  flex: 1; padding: 9px 8px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  font: 500 12px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}
.footer button:active {
  transform: translateY(1px) scale(0.98);
}

.izifill-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647;
  background: rgba(15, 23, 34, 0.9);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  color: #f8fafc;
  border: 1px solid rgba(52, 211, 153, 0.4);
  border-radius: 9999px;
  padding: 10px 20px;
  font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(16, 185, 129, 0.25);
  display: flex; align-items: center; gap: 8px;
  animation: iztoastin 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes iztoastin {
  from { opacity: 0; transform: translate(-50%, 14px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

.izifill-chip {
  margin: 4px; padding: 4px 10px;
  font: 600 12px -apple-system, BlinkMacSystemFont, sans-serif;
  background: rgba(16, 185, 129, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 9999px; cursor: pointer;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
  transition: all 0.16s ease;
  display: inline-flex; align-items: center; gap: 4px;
}
.izifill-chip:hover {
  background: rgba(5, 150, 105, 0.95);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
  transform: scale(1.03);
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
    launcher.title = 'izifill';
    const logoBadge = document.createElement('span');
    logoBadge.className = 'iz-logo';
    logoBadge.textContent = 'iz';
    launcher.appendChild(logoBadge);
    makeDraggable(launcher);
    r.appendChild(launcher);

    sidebar = document.createElement('div');
    sidebar.className = 'sidebar';

    const header = document.createElement('div');
    header.className = 'header';
    const brandWrap = document.createElement('div');
    brandWrap.className = 'brand-wrap';
    const brandIcon = document.createElement('span');
    brandIcon.className = 'brand-icon';
    brandIcon.textContent = '⚡';
    const brand = document.createElement('span');
    brand.className = 'brand';
    brand.textContent = 'izifill';
    const brandBadge = document.createElement('span');
    brandBadge.className = 'brand-badge';
    brandBadge.textContent = 'AI';
    brandWrap.append(brandIcon, brand, brandBadge);

    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '✕';
    close.title = lang === 'fr' ? 'Fermer' : 'Close';
    close.addEventListener('click', collapseSidebar);
    header.append(brandWrap, close);

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

  fill.textContent = lang === 'fr' ? '⚡ Remplir cette page' : '⚡ Fill this page';
  openProfile.textContent = lang === 'fr' ? '👤 Mon profil' : '👤 My profile';
  openTracker.textContent = lang === 'fr' ? '📋 Mes candidatures' : '📋 Applications';

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
  filled: '2px solid #10b981',
  uncertain: '2px solid #f59e0b',
  unknown: '2px solid #dc2626',
};

export function highlightField(el: HTMLElement, status: keyof typeof OUTLINE): void {
  el.style.outline = OUTLINE[status];
  el.style.outlineOffset = '2px';
  el.style.transition = 'outline 0.2s ease';
}

export function showSaveChip(el: HTMLElement, lang: Lang, onSave: () => void): void {
  if (el.nextElementSibling?.classList.contains('izifill-chip')) return;
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'izifill-chip';
  chip.textContent = t('saveAnswer', lang);
  chip.style.cssText =
    'margin:4px;padding:4px 10px;font:600 12px -apple-system,BlinkMacSystemFont,sans-serif;background:rgba(16,185,129,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:9999px;cursor:pointer;box-shadow:0 2px 10px rgba(16,185,129,0.35);';
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
