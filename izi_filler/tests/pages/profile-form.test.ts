import { describe, it, expect, beforeEach } from 'vitest';
import { renderProfileForm, readProfileForm } from '../../src/pages/profile-form';
import { emptyProfile } from '../../src/engine/profile';

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="c"></div>';
  container = document.getElementById('c')!;
});

describe('renderProfileForm', () => {
  it('renders scalar fields with existing values', () => {
    const p = emptyProfile();
    p.identity.firstName = 'Ada';
    renderProfileForm(container, p, 'fr');
    const input = container.querySelector<HTMLInputElement>('[data-key="identity.firstName"]')!;
    expect(input.value).toBe('Ada');
  });
  it('renders French labels', () => {
    renderProfileForm(container, emptyProfile(), 'fr');
    expect(container.textContent).toContain('Prénom');
  });
  it('renders existing experience items', () => {
    const p = emptyProfile();
    p.experience.push({ title: 'Dev', company: 'ACME', startDate: '2024', endDate: '2026', description: '' });
    renderProfileForm(container, p, 'en');
    const item = container.querySelector('[data-repeat="experience"] .iz-item')!;
    expect(item.querySelector<HTMLInputElement>('[data-item-key="title"]')!.value).toBe('Dev');
  });
});

describe('readProfileForm', () => {
  it('round-trips scalar edits', () => {
    renderProfileForm(container, emptyProfile(), 'en');
    container.querySelector<HTMLInputElement>('[data-key="contact.email"]')!.value = 'a@b.fr';
    expect(readProfileForm(container).contact.email).toBe('a@b.fr');
  });
  it('adds a repeat item via the add button and reads it back', () => {
    renderProfileForm(container, emptyProfile(), 'en');
    container.querySelector<HTMLButtonElement>('[data-add="education"]')!.click();
    const item = container.querySelector('[data-repeat="education"] .iz-item')!;
    item.querySelector<HTMLInputElement>('[data-item-key="degree"]')!.value = 'Master';
    const p = readProfileForm(container);
    expect(p.education).toHaveLength(1);
    expect(p.education[0].degree).toBe('Master');
  });
});
