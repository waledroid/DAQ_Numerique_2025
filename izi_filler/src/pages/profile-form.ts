import { emptyProfile, getProfileValue } from '../engine/profile';
import type { EducationEntry, ExperienceEntry, Lang, Profile } from '../engine/types';

export interface FieldDef {
  key: string;
  fr: string;
  en: string;
  type?: 'text' | 'textarea';
}

export interface GroupDef {
  id: string;
  fr: string;
  en: string;
  fields: FieldDef[];
  repeatKey?: 'experience' | 'education';
  addFr?: string;
  addEn?: string;
}

export const PROFILE_GROUPS: GroupDef[] = [
  { id: 'identity', fr: 'Identité', en: 'Identity', fields: [
    { key: 'identity.firstName', fr: 'Prénom', en: 'First name' },
    { key: 'identity.lastName', fr: 'Nom', en: 'Last name' },
    { key: 'identity.birthDate', fr: 'Date de naissance', en: 'Date of birth' },
    { key: 'identity.nationality', fr: 'Nationalité', en: 'Nationality' },
  ] },
  { id: 'contact', fr: 'Contact', en: 'Contact', fields: [
    { key: 'contact.email', fr: 'E-mail', en: 'Email' },
    { key: 'contact.phone', fr: 'Téléphone', en: 'Phone' },
  ] },
  { id: 'address', fr: 'Adresse', en: 'Address', fields: [
    { key: 'address.street', fr: 'Rue', en: 'Street' },
    { key: 'address.city', fr: 'Ville', en: 'City' },
    { key: 'address.postalCode', fr: 'Code postal', en: 'Postal code' },
    { key: 'address.country', fr: 'Pays', en: 'Country' },
  ] },
  { id: 'eligibility', fr: 'Éligibilité', en: 'Eligibility', fields: [
    { key: 'eligibility.workPermit', fr: 'Autorisé à travailler en France ? (Oui/Non)', en: 'Authorized to work? (Yes/No)' },
    { key: 'eligibility.drivingLicence', fr: 'Permis de conduire (ex : Permis B)', en: 'Driving licence' },
  ] },
  { id: 'links', fr: 'Liens', en: 'Links', fields: [
    { key: 'links.linkedin', fr: 'LinkedIn', en: 'LinkedIn' },
    { key: 'links.github', fr: 'GitHub', en: 'GitHub' },
    { key: 'links.portfolio', fr: 'Portfolio / site web', en: 'Portfolio / website' },
  ] },
  { id: 'experience', fr: 'Expériences', en: 'Experience', repeatKey: 'experience',
    addFr: '+ Ajouter une expérience', addEn: '+ Add experience', fields: [
    { key: 'title', fr: 'Poste', en: 'Job title' },
    { key: 'company', fr: 'Entreprise', en: 'Company' },
    { key: 'startDate', fr: 'Début', en: 'Start' },
    { key: 'endDate', fr: 'Fin', en: 'End' },
    { key: 'description', fr: 'Description', en: 'Description', type: 'textarea' },
  ] },
  { id: 'education', fr: 'Formation', en: 'Education', repeatKey: 'education',
    addFr: '+ Ajouter une formation', addEn: '+ Add education', fields: [
    { key: 'degree', fr: 'Diplôme', en: 'Degree' },
    { key: 'school', fr: 'École', en: 'School' },
    { key: 'year', fr: 'Année', en: 'Year' },
  ] },
  { id: 'skillsLang', fr: 'Compétences & langues', en: 'Skills & languages', fields: [
    { key: 'skills', fr: 'Compétences (séparées par des virgules)', en: 'Skills (comma-separated)' },
    { key: 'languages', fr: 'Langues parlées', en: 'Spoken languages' },
  ] },
  { id: 'standard', fr: 'Réponses standard', en: 'Standard answers', fields: [
    { key: 'standardAnswers.salary', fr: 'Prétentions salariales', en: 'Salary expectations' },
    { key: 'standardAnswers.noticePeriod', fr: 'Préavis / disponibilité', en: 'Notice period / availability' },
    { key: 'standardAnswers.remotePreference', fr: 'Télétravail souhaité', en: 'Remote preference' },
    { key: 'standardAnswers.coverLetter', fr: 'Lettre de motivation (texte)', en: 'Cover letter (text)', type: 'textarea' },
  ] },
  { id: 'eeo', fr: 'Égalité professionnelle (EEO)', en: 'Equal Employment', fields: [
    { key: 'eeo.usWorkAuthorization', fr: 'Autorisé à travailler aux États-Unis ? (Yes/No)', en: 'Authorized to work in the US? (Yes/No)' },
    { key: 'eeo.requiresSponsorship', fr: 'Besoin de sponsoring visa ? (Yes/No)', en: 'Require visa sponsorship? (Yes/No)' },
    { key: 'eeo.disability', fr: 'Situation de handicap ? (Yes/No)', en: 'Do you have a disability? (Yes/No)' },
    { key: 'eeo.gender', fr: 'Genre', en: 'Gender' },
    { key: 'eeo.lgbtq', fr: 'Vous identifiez-vous comme LGBTQ+ ? (Yes/No)', en: 'Identify as LGBTQ+? (Yes/No)' },
    { key: 'eeo.veteran', fr: 'Vétéran ? (Yes/No)', en: 'Are you a veteran? (Yes/No)' },
    { key: 'eeo.race', fr: 'Origine ethnique (libellé US)', en: 'Race' },
    { key: 'eeo.hispanic', fr: 'Hispanique ou latino ? (Yes/No)', en: 'Hispanic or Latino? (Yes/No)' },
    { key: 'eeo.sexualOrientation', fr: 'Orientation sexuelle', en: 'Sexual orientation' },
    { key: 'eeo.pronouns', fr: 'Pronoms', en: 'Pronouns' },
  ] },
];

export interface TabDef {
  id: string;
  fr: string;
  en: string;
  groupIds: string[];
}

export const TABS: TabDef[] = [
  { id: 'personal', fr: 'Personnel', en: 'Personal',
    groupIds: ['identity', 'contact', 'address', 'links', 'eligibility', 'standard'] },
  { id: 'education', fr: 'Formation', en: 'Education', groupIds: ['education'] },
  { id: 'experience', fr: 'Expériences', en: 'Work Experience', groupIds: ['experience'] },
  { id: 'skills', fr: 'Compétences', en: 'Skills', groupIds: ['skillsLang'] },
  { id: 'eeo', fr: 'EEO', en: 'Equal Employment', groupIds: ['eeo'] },
];

function makeInput(def: FieldDef, value: string, attr: 'data-key' | 'data-item-key'): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'iz-field';
  const span = document.createElement('span');
  wrap.appendChild(span);
  const input = document.createElement(def.type === 'textarea' ? 'textarea' : 'input');
  input.setAttribute(attr, def.key);
  (input as HTMLInputElement).value = value;
  wrap.appendChild(input);
  return wrap;
}

function setLabel(wrap: HTMLElement, def: FieldDef, lang: Lang): void {
  wrap.querySelector('span')!.textContent = lang === 'fr' ? def.fr : def.en;
}

function renderItem(group: GroupDef, item: Record<string, string>, lang: Lang): HTMLElement {
  const div = document.createElement('div');
  div.className = 'iz-item';
  for (const def of group.fields) {
    const wrap = makeInput(def, item[def.key] ?? '', 'data-item-key');
    setLabel(wrap, def, lang);
    div.appendChild(wrap);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'iz-remove';
  remove.textContent = lang === 'fr' ? 'Supprimer' : 'Remove';
  remove.addEventListener('click', () => div.remove());
  div.appendChild(remove);
  return div;
}

export function renderProfileForm(container: HTMLElement, profile: Profile, lang: Lang): void {
  container.textContent = '';
  for (const group of PROFILE_GROUPS) {
    const section = document.createElement('section');
    section.className = 'iz-group';
    section.setAttribute('data-group', group.id);
    const h = document.createElement('h2');
    h.textContent = lang === 'fr' ? group.fr : group.en;
    section.appendChild(h);

    if (group.repeatKey) {
      const list = document.createElement('div');
      list.setAttribute('data-repeat', group.repeatKey);
      const items = profile[group.repeatKey] as unknown as Record<string, string>[];
      for (const item of items) list.appendChild(renderItem(group, item, lang));
      section.appendChild(list);
      const add = document.createElement('button');
      add.type = 'button';
      add.setAttribute('data-add', group.repeatKey);
      add.textContent = lang === 'fr' ? (group.addFr ?? '+') : (group.addEn ?? '+');
      add.addEventListener('click', () => list.appendChild(renderItem(group, {}, lang)));
      section.appendChild(add);
    } else {
      for (const def of group.fields) {
        const wrap = makeInput(def, getProfileValue(profile, def.key), 'data-key');
        setLabel(wrap, def, lang);
        section.appendChild(wrap);
      }
    }
    container.appendChild(section);
  }
}

function setByPath(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== 'object' || cur[p] === null) return;
    cur = cur[p] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (typeof cur[last] === 'string') cur[last] = value;
}

export function readProfileForm(container: HTMLElement): Profile {
  const profile = emptyProfile();
  container.querySelectorAll<HTMLInputElement>('[data-key]').forEach((input) => {
    setByPath(profile as unknown as Record<string, unknown>, input.getAttribute('data-key')!, input.value);
  });
  for (const repeatKey of ['experience', 'education'] as const) {
    const items: Record<string, string>[] = [];
    container.querySelectorAll(`[data-repeat="${repeatKey}"] .iz-item`).forEach((div) => {
      const item: Record<string, string> = {};
      div.querySelectorAll<HTMLInputElement>('[data-item-key]').forEach((input) => {
        item[input.getAttribute('data-item-key')!] = input.value;
      });
      if (Object.values(item).some((v) => v.trim() !== '')) items.push(item);
    });
    if (repeatKey === 'experience') {
      profile.experience = items.map((i) => ({
        title: i.title ?? '', company: i.company ?? '', startDate: i.startDate ?? '',
        endDate: i.endDate ?? '', description: i.description ?? '',
      })) as ExperienceEntry[];
    } else {
      profile.education = items.map((i) => ({
        degree: i.degree ?? '', school: i.school ?? '', year: i.year ?? '',
      })) as EducationEntry[];
    }
  }
  return profile;
}
