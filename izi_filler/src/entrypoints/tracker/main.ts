import { loadApplications, saveApplications } from '../../lib/storage';
import { detectLang } from '../../lib/i18n';
import type { ApplicationEntry } from '../../engine/types';

const lang = detectLang();
const fr = lang === 'fr';

const STATUSES: { value: ApplicationEntry['status']; fr: string; en: string }[] = [
  { value: 'applied', fr: 'Envoyée', en: 'Applied' },
  { value: 'interview', fr: 'Entretien', en: 'Interview' },
  { value: 'rejected', fr: 'Refusée', en: 'Rejected' },
  { value: 'offer', fr: 'Offre', en: 'Offer' },
];

async function render(): Promise<void> {
  const apps = await loadApplications();
  document.getElementById('title')!.textContent = fr ? 'Mes candidatures' : 'My applications';
  const empty = document.getElementById('empty')!;
  const table = document.getElementById('table')!;
  empty.textContent = fr ? 'Aucune candidature suivie pour le moment.' : 'No tracked applications yet.';
  empty.hidden = apps.length > 0;
  table.hidden = apps.length === 0;

  const head = document.getElementById('head')!;
  head.innerHTML = '';
  for (const label of fr
    ? ['Date', 'Entreprise', 'Poste', 'Lien', 'Statut', '']
    : ['Date', 'Company', 'Title', 'Link', 'Status', '']) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }

  const rows = document.getElementById('rows')!;
  rows.textContent = '';
  apps.forEach((app, i) => {
    const tr = document.createElement('tr');

    const date = document.createElement('td');
    date.textContent = app.date.slice(0, 10);
    const company = document.createElement('td');
    company.textContent = app.company;
    const title = document.createElement('td');
    title.textContent = app.title;

    const link = document.createElement('td');
    const a = document.createElement('a');
    a.href = app.url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = app.domain;
    link.appendChild(a);

    const status = document.createElement('td');
    const select = document.createElement('select');
    for (const s of STATUSES) {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = fr ? s.fr : s.en;
      opt.selected = s.value === app.status;
      select.appendChild(opt);
    }
    select.addEventListener('change', async () => {
      const current = await loadApplications();
      const idx = current.findIndex((a) => a.url === app.url && a.date === app.date);
      if (idx >= 0) {
        current[idx].status = select.value as ApplicationEntry['status'];
        await saveApplications(current);
      } else {
        await render();
      }
    });
    status.appendChild(select);

    const actions = document.createElement('td');
    const del = document.createElement('button');
    del.textContent = fr ? 'Supprimer' : 'Delete';
    del.addEventListener('click', async () => {
      const current = await loadApplications();
      const idx = current.findIndex((a) => a.url === app.url && a.date === app.date);
      if (idx >= 0) {
        current.splice(idx, 1);
        await saveApplications(current);
      }
      await render();
    });
    actions.appendChild(del);

    tr.append(date, company, title, link, status, actions);
    rows.appendChild(tr);
  });
}

void render();
