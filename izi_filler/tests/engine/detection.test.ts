import { describe, it, expect } from 'vitest';
import { scoreApplicationPage, APPLICATION_THRESHOLD } from '../../src/engine/detection';

describe('scoreApplicationPage', () => {
  it('scores a French application form above threshold', () => {
    const score = scoreApplicationPage({
      url: 'https://jobs.example.fr/candidature/1234',
      title: 'Postuler — Développeur',
      text: 'Merci de déposer votre CV et votre lettre de motivation pour postuler.',
      fieldCount: 8,
      hasFileInput: true,
    });
    expect(score).toBeGreaterThanOrEqual(APPLICATION_THRESHOLD);
  });
  it('scores an English careers form above threshold', () => {
    const score = scoreApplicationPage({
      url: 'https://boards.example.com/acme/jobs/42/application',
      title: 'Apply for Software Engineer',
      text: 'Submit your application. Attach your resume and cover letter.',
      fieldCount: 5,
      hasFileInput: true,
    });
    expect(score).toBeGreaterThanOrEqual(APPLICATION_THRESHOLD);
  });
  it('scores a blog article below threshold', () => {
    const score = scoreApplicationPage({
      url: 'https://example.com/blog/how-to-cook-pasta',
      title: 'How to cook pasta',
      text: 'Boil water. Add salt. A newsletter signup is below.',
      fieldCount: 1,
      hasFileInput: false,
    });
    expect(score).toBeLessThan(APPLICATION_THRESHOLD);
  });
  it('scores a login page below threshold', () => {
    const score = scoreApplicationPage({
      url: 'https://example.com/login',
      title: 'Sign in',
      text: 'Email. Password. Forgot password?',
      fieldCount: 2,
      hasFileInput: false,
    });
    expect(score).toBeLessThan(APPLICATION_THRESHOLD);
  });
});
