import type { Profile } from './types';

export function emptyProfile(): Profile {
  return {
    identity: { firstName: '', lastName: '', birthDate: '', nationality: '' },
    contact: { email: '', phone: '' },
    address: { street: '', city: '', postalCode: '', country: '' },
    eligibility: { workPermit: '', drivingLicence: '' },
    links: { linkedin: '', portfolio: '', github: '' },
    experience: [],
    education: [],
    languages: '',
    skills: '',
    standardAnswers: { salary: '', noticePeriod: '', remotePreference: '', coverLetter: '' },
    eeo: {
      usWorkAuthorization: '', requiresSponsorship: '', disability: '', gender: '',
      lgbtq: '', veteran: '', race: '', hispanic: '', sexualOrientation: '', pronouns: '',
    },
  };
}

function mergeSection(target: Record<string, string>, value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  for (const k of Object.keys(target)) {
    const v = (value as Record<string, unknown>)[k];
    if (typeof v === 'string') target[k] = v;
  }
}

function mapItems<T extends Record<string, string>>(value: unknown, template: T): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const out = { ...template };
    mergeSection(out, item);
    return out;
  });
}

// Builds a well-shaped Profile from untrusted imported JSON: known string
// fields are copied, everything else is dropped.
export function mergeImportedProfile(input: unknown): Profile {
  const profile = emptyProfile();
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return profile;
  const src = input as Record<string, unknown>;
  const sections: [Record<string, string>, unknown][] = [
    [profile.identity, src.identity],
    [profile.contact, src.contact],
    [profile.address, src.address],
    [profile.eligibility, src.eligibility],
    [profile.links, src.links],
    [profile.standardAnswers, src.standardAnswers],
    [profile.eeo as unknown as Record<string, string>, src.eeo],
  ];
  for (const [target, value] of sections) mergeSection(target, value);
  if (typeof src.languages === 'string') profile.languages = src.languages;
  if (typeof src.skills === 'string') profile.skills = src.skills;
  profile.experience = mapItems(src.experience, {
    title: '', company: '', startDate: '', endDate: '', description: '',
  });
  profile.education = mapItems(src.education, { degree: '', school: '', year: '' });
  return profile;
}

export function getProfileValue(profile: Profile, key: string): string {
  if (key === 'identity.fullName') {
    return [profile.identity.firstName, profile.identity.lastName].filter(Boolean).join(' ');
  }
  let cur: unknown = profile;
  for (const part of key.split('.')) {
    if (cur !== null && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  return typeof cur === 'string' ? cur : '';
}

export function completionPercent(profile: Profile): number {
  const leaves: string[] = [];
  const walk = (o: unknown): void => {
    if (typeof o === 'string') leaves.push(o);
    else if (Array.isArray(o)) return; // arrays don't count toward completion
    else if (o !== null && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(profile);
  if (leaves.length === 0) return 0;
  return Math.round((100 * leaves.filter((v) => v.trim() !== '').length) / leaves.length);
}
