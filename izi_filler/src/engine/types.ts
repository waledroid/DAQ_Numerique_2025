export type Lang = 'fr' | 'en';
export type Confidence = 'high' | 'low';

export interface FieldSnapshot {
  ref: string;
  tag: 'input' | 'select' | 'textarea';
  type: string; // input type ('' for select/textarea)
  name: string;
  id: string;
  autocomplete: string;
  placeholder: string;
  ariaLabel: string;
  label: string;
  context: string; // fieldset legend text
  options: { value: string; text: string }[];
  required: boolean;
}

export interface FieldMatch {
  ref: string;
  key?: string; // profile dot-path, or 'files.cv'
  value?: string;
  confidence?: Confidence;
  source: 'profile' | 'learned' | 'unknown';
}

export interface ExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  year: string;
}

export interface Profile {
  identity: { firstName: string; lastName: string; birthDate: string; nationality: string };
  contact: { email: string; phone: string };
  address: { street: string; city: string; postalCode: string; country: string };
  eligibility: { workPermit: string; drivingLicence: string };
  links: { linkedin: string; portfolio: string };
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: string;
  skills: string;
  standardAnswers: { salary: string; noticePeriod: string; remotePreference: string; coverLetter: string };
}

export interface LearnedAnswer {
  questionText: string;
  normalizedKey: string;
  answer: string;
  lang: Lang;
  timesUsed: number;
  lastUsed: string;
}

export interface ApplicationEntry {
  company: string;
  title: string;
  url: string;
  domain: string;
  date: string;
  status: 'applied' | 'interview' | 'rejected' | 'offer';
}

export interface Settings {
  locale?: Lang;
  disabledDomains: string[];
  fillUncertain: boolean;
}
