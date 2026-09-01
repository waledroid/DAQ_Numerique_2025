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
  width: 48px; height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-right: 0;
  border-radius: 16px 0 0 16px;
  background: rgba(10, 15, 24, 0.82);
  backdrop-filter: blur(28px) saturate(210%) contrast(110%);
  -webkit-backdrop-filter: blur(28px) saturate(210%) contrast(110%);
  color: #f8fafc;
  font: 700 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  cursor: grab;
  box-shadow: -6px 8px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  touch-action: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  user-select: none;
}
.launcher:hover {
  width: 56px;
  background: rgba(14, 21, 33, 0.9);
  border-color: rgba(52, 211, 153, 0.45);
  box-shadow: -8px 10px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.launcher:active { cursor: grabbing; transform: scale(0.95); }
.launcher .iz-logo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 9px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
  color: #ffffff; font-weight: 800; font-size: 12px; letter-spacing: -0.5px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.launcher.ready {
  background: rgba(30, 22, 6, 0.86);
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow: -6px 8px 32px rgba(0, 0, 0, 0.55), 0 0 20px rgba(251, 191, 36, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.launcher.ready .iz-logo {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.launcher.active .iz-logo {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  animation: izlogopulse 1.6s ease-in-out infinite;
}
@keyframes izlogopulse {
  50% { box-shadow: 0 0 14px 3px rgba(16, 185, 129, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
}
.launcher.pulse { animation: izpulse 1.4s cubic-bezier(0.4, 0, 0.2, 1) 3; }
@keyframes izpulse {
  0%, 100% {
    box-shadow: -6px 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 0 rgba(16, 185, 129, 0.8);
  }
  50% {
    transform: scale(1.08);
    border-color: rgba(52, 211, 153, 0.7);
    box-shadow: -8px 10px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(16, 185, 129, 0.6), 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

.sidebar {
  position: fixed; right: 0; top: 0; height: 100vh; width: 340px; z-index: 2147483647;
  background: rgba(8, 12, 19, 0.85);
  backdrop-filter: blur(36px) saturate(220%) contrast(110%);
  -webkit-backdrop-filter: blur(36px) saturate(220%) contrast(110%);
  color: #f1f5f9;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -20px 0 56px rgba(0, 0, 0, 0.65), inset 1px 0 0 rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  padding: 18px 16px; box-sizing: border-box;
  transform: translateX(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto; overflow-x: hidden;
}
.sidebar.open { transform: translateX(0); }

.sidebar::-webkit-scrollbar { width: 5px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 9999px; }
.sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.22); }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: rgba(18, 26, 38, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.header .brand-wrap {
  display: flex; align-items: center; gap: 8px;
}
.header .brand-icon {
  width: 24px; height: 24px; border-radius: 8px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.header .brand {
  font-weight: 700; font-size: 15px; letter-spacing: -0.3px; color: #f8fafc;
}
.header .brand-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; padding: 2px 7px; border-radius: 12px;
  background: rgba(16, 185, 129, 0.15); color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.28);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
}
button.close {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
button.close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #f8fafc; transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.2);
}
button.close:active { transform: scale(0.92); }

select.profiles {
  width: 100%; padding: 10px 14px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 22, 33, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #f8fafc; font: 500 13px -apple-system, BlinkMacSystemFont, sans-serif;
  outline: none; cursor: pointer; box-sizing: border-box;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2334d399' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
select.profiles:hover {
  background-color: rgba(20, 30, 45, 0.75);
  border-color: rgba(52, 211, 153, 0.35);
}
select.profiles:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25), 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
select.profiles option {
  background: #0b111a;
  color: #f8fafc;
}

.question {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.12), rgba(10, 15, 24, 0.8));
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(52, 211, 153, 0.28);
  border-radius: 14px; padding: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  animation: izfadein 0.25s ease-out;
}
@keyframes izfadein { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.question > div:first-child {
  font-weight: 600; font-size: 13px; color: #f8fafc; margin-bottom: 12px; line-height: 1.45;
}

.sidebar button.primary {
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #ffffff; font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer; margin: 4px 6px 0 0;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.sidebar button.primary:hover {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.98) 0%, rgba(16, 185, 129, 0.98) 100%);
  box-shadow: 0 8px 26px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transform: translateY(-1px);
}
.sidebar button.primary:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.sidebar button.secondary {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #cbd5e1; font: 500 13px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer; margin: 4px 0 0 0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: all 0.18s ease;
  display: inline-flex; align-items: center; justify-content: center;
}
.sidebar button.secondary:hover {
  background: rgba(255, 255, 255, 0.11);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}
.sidebar button.secondary:active {
  transform: scale(0.98);
}

button.fill {
  width: 100%; margin: 0;
  padding: 13px 18px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.2px;
  border-radius: 13px;
}

.summary {
  background: rgba(14, 20, 30, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  color: #cbd5e1;
  font-size: 12.5px;
  line-height: 1.5;
  min-height: 1.4em;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.summary:empty { display: none; }

.footer {
  margin-top: auto;
  display: flex; gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.footer button {
  flex: 1; padding: 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 11px;
  background: rgba(16, 24, 36, 0.65);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #cbd5e1;
  font: 500 12px -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer button:hover {
  background: rgba(24, 34, 50, 0.8);
  color: #f8fafc;
  border-color: rgba(52, 211, 153, 0.35);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3), 0 0 12px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}
.footer button:active {
  transform: translateY(1px) scale(0.98);
}

.pilot-status { color: #a7f3d0; font-size: 12.5px; min-height: 1.2em; }
.pilot-controls { display: flex; gap: 8px; }
.pilot-controls button { flex: 1; }
.izifill-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647;
  background: rgba(8, 14, 22, 0.92);
  backdrop-filter: blur(28px) saturate(220%);
  -webkit-backdrop-filter: blur(28px) saturate(220%);
  color: #f8fafc;
  border: 1px solid rgba(52, 211, 153, 0.45);
  border-radius: 9999px;
  padding: 10px 22px;
  font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.65), 0 0 24px rgba(16, 185, 129, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  display: flex; align-items: center; gap: 8px;
  animation: iztoastin 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes iztoastin {
  from { opacity: 0; transform: translate(-50%, 14px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

.izifill-chip {
  margin: 4px; padding: 4px 12px;
  font: 600 12px -apple-system, BlinkMacSystemFont, sans-serif;
  background: rgba(16, 185, 129, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 9999px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: all 0.16s ease;
  display: inline-flex; align-items: center; gap: 4px;
}
.izifill-chip:hover {
  background: rgba(5, 150, 105, 0.95);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
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

// idle = nothing to do; ready (amber) = izifill found an apply/fill action;
// active (green pulse) = a fill session is running.
export function setLauncherState(state: 'idle' | 'ready' | 'active'): void {
  const launcher = root().querySelector<HTMLElement>('.launcher');
  if (!launcher) return;
  launcher.classList.remove('ready', 'active');
  if (state !== 'idle') launcher.classList.add(state);
}

// The sidebar auto-closes after this long without activity while open.
const INACTIVITY_MS = 5000;
let inactivityTimer: ReturnType<typeof setTimeout> | undefined;

function clearInactivity(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = undefined;
  }
}

// (Re)start the 5s auto-close countdown, but only while the sidebar is open.
function armInactivity(): void {
  clearInactivity();
  if (sidebarEl()?.classList.contains('open')) {
    inactivityTimer = setTimeout(collapseSidebar, INACTIVITY_MS);
  }
}

// Any activity (sidebar interaction, autofill, status update) resets the timer.
export function keepSidebarAlive(): void {
  armInactivity();
}

export function expandSidebar(): void {
  const sidebar = sidebarEl();
  if (!sidebar) return;
  sidebar.classList.add('open');
  armInactivity();
}

export function collapseSidebar(): void {
  clearInactivity();
  sidebarEl()?.classList.remove('open');
}

export function isSidebarOpen(): boolean {
  return sidebarEl()?.classList.contains('open') ?? false;
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
    logoBadge.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" style="display:block">
      <path d="M13.5 2.5L7 12.5H12L9.5 21.5L18 10.5H13L16 2.5H13.5Z" fill="#ffffff"/>
      <circle cx="18" cy="4.5" r="1.8" fill="#6ee7b7"/>
    </svg>`;
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
    brandIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" style="display:block">
      <path d="M13.5 2.5L7 12.5H12L9.5 21.5L18 10.5H13L16 2.5H13.5Z" fill="#ffffff"/>
      <circle cx="18" cy="4.5" r="1.8" fill="#6ee7b7"/>
    </svg>`;
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

    // The pin is the only way to open the sidebar; clicking it toggles.
    launcher.addEventListener('click', () => {
      if (sidebar!.classList.contains('open')) collapseSidebar();
      else expandSidebar();
    });

    // Any interaction inside the sidebar keeps it open (resets the 5s timer).
    ['pointerdown', 'click', 'input', 'change', 'keydown', 'wheel', 'focusin'].forEach((ev) =>
      sidebar!.addEventListener(ev, keepSidebarAlive, true));
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
  keepSidebarAlive();
}

export function showApplyButton(lang: Lang, onStart: () => void): void {
  const sidebar = ensureSidebar(lang);
  const question = sidebar.querySelector<HTMLElement>('.question')!;
  question.textContent = '';
  question.hidden = false;
  const title = document.createElement('div');
  title.textContent = lang === 'fr' ? 'Offre d’emploi détectée' : 'Job posting detected';
  const apply = document.createElement('button');
  apply.className = 'primary apply';
  apply.textContent = lang === 'fr' ? 'Postuler avec izifill' : 'Apply with izifill';
  apply.addEventListener('click', () => {
    question.hidden = true;
    onStart();
  });
  question.append(title, apply);
  root().querySelector('.launcher')?.classList.add('pulse');
  keepSidebarAlive();
}

export function showSubmitConfirm(lang: Lang, onIzifill: () => void, onSelf: () => void): void {
  const sidebar = ensureSidebar(lang);
  const question = sidebar.querySelector<HTMLElement>('.question')!;
  question.textContent = '';
  question.hidden = false;
  const title = document.createElement('div');
  title.textContent = lang === 'fr' ? 'Envoyer la candidature ?' : 'Send the application?';
  const go = document.createElement('button');
  go.className = 'primary submit-go';
  go.textContent = lang === 'fr' ? 'Envoyer avec izifill' : 'Submit with izifill';
  go.addEventListener('click', () => {
    question.hidden = true;
    onIzifill();
  });
  const self = document.createElement('button');
  self.className = 'secondary submit-self';
  self.textContent = lang === 'fr' ? 'Je l’envoie moi-même' : 'I’ll submit myself';
  self.addEventListener('click', () => {
    question.hidden = true;
    onSelf();
  });
  question.append(title, go, self);
  root().querySelector('.launcher')?.classList.add('pulse');
  keepSidebarAlive();
}

export function showPilotStatus(lang: Lang, text: string): void {
  const sidebar = ensureSidebar(lang);
  let status = sidebar.querySelector<HTMLElement>('.pilot-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'pilot-status';
    sidebar.insertBefore(status, sidebar.querySelector('.summary'));
  }
  status.textContent = text;
  keepSidebarAlive();
}

export function showPilotControls(
  lang: Lang,
  opts: { paused: boolean; onPause: () => void; onResume: () => void; onStop: () => void },
): void {
  const sidebar = ensureSidebar(lang);
  let row = sidebar.querySelector<HTMLElement>('.pilot-controls');
  if (!row) {
    row = document.createElement('div');
    row.className = 'pilot-controls';
    const header = sidebar.querySelector('.header')!;
    header.insertAdjacentElement('afterend', row);
  }
  row.textContent = '';
  const toggle = document.createElement('button');
  toggle.className = 'secondary pilot-toggle';
  toggle.textContent = opts.paused
    ? (lang === 'fr' ? '▶ Reprendre' : '▶ Resume')
    : (lang === 'fr' ? '⏸ Pause' : '⏸ Pause');
  toggle.addEventListener('click', opts.paused ? opts.onResume : opts.onPause);
  const stop = document.createElement('button');
  stop.className = 'secondary pilot-stop';
  stop.textContent = lang === 'fr' ? '✕ Stop' : '✕ Stop';
  stop.addEventListener('click', opts.onStop);
  row.append(toggle, stop);
}

export function hidePilotUi(): void {
  const sidebar = sidebarEl();
  sidebar?.querySelector('.pilot-controls')?.remove();
  sidebar?.querySelector('.pilot-status')?.remove();
}

export function showSummary(lang: Lang, counts: { filled: number; uncertain: number; unknown: number }): void {
  const sidebar = ensureSidebar(lang);
  sidebar.querySelector<HTMLElement>('.summary')!.textContent = t('summary', lang, counts);
  keepSidebarAlive();
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
