import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadPilot, savePilot, clearPilot, findApplyCta, findNextButton, findSubmitCandidate,
  findAccountSubmit, hasCaptcha, looksEmailVerification, clickOnce, fillPasswords,
  tickConsentBoxes, findConsentAccept,
  type PilotState,
} from '../../src/content/pilot';

function freshState(): PilotState {
  return { active: true, paused: false, stage: 'starting', startedAt: Date.now(), lastClickAt: 0, clicked: [] };
}

beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('pilot state storage', () => {
  it('round-trips and clears', () => {
    expect(loadPilot()).toBeNull();
    savePilot(freshState());
    expect(loadPilot()?.active).toBe(true);
    clearPilot();
    expect(loadPilot()).toBeNull();
  });
});

describe('findApplyCta', () => {
  it('finds the apply button among other controls', () => {
    document.body.innerHTML = `
      <a href="/jobs">Voir toutes les offres</a>
      <button id="go">Postuler</button>`;
    expect(findApplyCta(document)?.id).toBe('go');
  });
  it('returns null when there is none', () => {
    document.body.innerHTML = '<button>En savoir plus</button>';
    expect(findApplyCta(document)).toBeNull();
  });
});

describe('findNextButton / findSubmitCandidate / findAccountSubmit', () => {
  it('distinguishes next from submit buttons', () => {
    document.body.innerHTML = `
      <button id="n">Suivant</button>
      <button id="s">Envoyer ma candidature</button>`;
    expect(findNextButton(document)?.id).toBe('n');
    expect(findSubmitCandidate(document)?.id).toBe('s');
  });
  it('returns null for next when only submit exists', () => {
    document.body.innerHTML = '<button>Envoyer</button>';
    expect(findNextButton(document)).toBeNull();
  });
  it('finds account creation buttons', () => {
    document.body.innerHTML = '<button id="c">Créer mon compte</button>';
    expect(findAccountSubmit(document)?.id).toBe('c');
  });
});

describe('hasCaptcha', () => {
  it('detects recaptcha frames and captcha classes', () => {
    document.body.innerHTML = '<iframe src="https://www.google.com/recaptcha/api2/anchor"></iframe>';
    expect(hasCaptcha(document)).toBe(true);
    document.body.innerHTML = '<div class="g-recaptcha"></div>';
    expect(hasCaptcha(document)).toBe(true);
    document.body.innerHTML = '<div>rien</div>';
    expect(hasCaptcha(document)).toBe(false);
  });
});

describe('looksEmailVerification', () => {
  it('detects verification screens in FR and EN', () => {
    expect(looksEmailVerification('Vérifiez votre boîte mail pour confirmer votre compte.')).toBe(true);
    expect(looksEmailVerification('Please check your inbox to verify your email.')).toBe(true);
    expect(looksEmailVerification('Bienvenue sur votre espace candidat.')).toBe(false);
  });
});

describe('clickOnce', () => {
  it('clicks a button only once per id', () => {
    document.body.innerHTML = '<button id="b">Go</button>';
    const btn = document.getElementById('b')!;
    const spy = vi.fn();
    btn.addEventListener('click', spy);
    const state = freshState();
    expect(clickOnce(btn, state, 'go')).toBe(true);
    expect(clickOnce(btn, state, 'go')).toBe(false);
    expect(spy).toHaveBeenCalledOnce();
    expect(loadPilot()?.clicked).toContain('go');
  });
});

describe('tickConsentBoxes', () => {
  it('ticks required terms/privacy checkboxes but not marketing ones', () => {
    document.body.innerHTML = `
      <label><input type="checkbox" id="terms">J'accepte les conditions générales d'utilisation</label>
      <label><input type="checkbox" id="privacy">I have read and agree to the privacy policy</label>
      <label><input type="checkbox" id="news">Send me the newsletter and marketing offers</label>`;
    const n = tickConsentBoxes(document);
    expect(n).toBe(2);
    expect((document.getElementById('terms') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('privacy') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('news') as HTMLInputElement).checked).toBe(false);
  });
  it('does not re-tick an already-checked box and ignores unrelated ones', () => {
    document.body.innerHTML = `
      <label><input type="checkbox" id="a" checked>I agree to the terms</label>
      <label><input type="checkbox" id="b">Remember me</label>`;
    expect(tickConsentBoxes(document)).toBe(0);
    expect((document.getElementById('b') as HTMLInputElement).checked).toBe(false);
  });
});

describe('findConsentAccept', () => {
  it('finds accept / agree / j-accepte buttons', () => {
    document.body.innerHTML = `
      <button id="cancel">Refuser</button>
      <button id="ok">Tout accepter</button>`;
    expect(findConsentAccept(document)?.id).toBe('ok');
    document.body.innerHTML = `<span role="button" id="agree">I Agree</span>`;
    expect(findConsentAccept(document)?.id).toBe('agree');
  });
  it('returns null when there is no accept control', () => {
    document.body.innerHTML = '<button>Suivant</button>';
    expect(findConsentAccept(document)).toBeNull();
  });
});

describe('fillPasswords', () => {
  it('fills every enabled password field and returns the count', () => {
    document.body.innerHTML = `
      <input type="password" id="p1">
      <input type="password" id="p2">
      <input type="password" disabled>`;
    expect(fillPasswords(document, 'S3cret!x')).toBe(2);
    expect((document.getElementById('p1') as HTMLInputElement).value).toBe('S3cret!x');
    expect((document.getElementById('p2') as HTMLInputElement).value).toBe('S3cret!x');
  });
});
