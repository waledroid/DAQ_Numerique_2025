import type { Profile } from './types';

export function emptyProfile(): Profile {
  return {
    identity: { firstName: '', lastName: '', birthDate: '', nationality: '' },
    contact: { email: '', phone: '' },
    address: { street: '', city: '', postalCode: '', country: '' },
    eligibility: { workPermit: '', drivingLicence: '' },
    links: { linkedin: '', portfolio: '' },
    experience: [],
    education: [],
    languages: '',
    skills: '',
    standardAnswers: { salary: '', noticePeriod: '', remotePreference: '', coverLetter: '' },
  };
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
