import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLanguage, getLanguage, t, applyTranslations } from '../src/i18n.js';

describe('resolveLanguage', () => {
  it('defaults to Russian when there is no SDK instance (local dev, Artifact preview)', () => {
    expect(resolveLanguage(null)).toBe('ru');
    expect(getLanguage()).toBe('ru');
  });

  it('reads ysdk.environment.i18n.lang when present', () => {
    const ysdk = { environment: { i18n: { lang: 'en' } } };
    expect(resolveLanguage(ysdk)).toBe('en');
    expect(getLanguage()).toBe('en');
  });

  it('falls back to Russian if lang is explicitly "ru"', () => {
    const ysdk = { environment: { i18n: { lang: 'ru' } } };
    expect(resolveLanguage(ysdk)).toBe('ru');
  });

  it('falls back to English for any unsupported language code', () => {
    const ysdk = { environment: { i18n: { lang: 'tr' } } };
    expect(resolveLanguage(ysdk)).toBe('en');
  });

  it('defaults to Russian if the SDK instance has no environment info', () => {
    expect(resolveLanguage({})).toBe('ru');
  });
});

describe('t', () => {
  it('returns the string in the currently resolved language', () => {
    resolveLanguage(null);
    expect(t('play')).toBe('Играть');

    resolveLanguage({ environment: { i18n: { lang: 'en' } } });
    expect(t('play')).toBe('Play');
  });

  it('returns every key used by index.html for both supported languages', () => {
    const keys = [
      'score',
      'bestScore',
      'play',
      'settings',
      'pauseAriaLabel',
      'pausedHeading',
      'resume',
      'restart',
      'back',
      'soundOn',
      'soundOff',
      'gameOverHeading',
      'playAgain',
    ];
    for (const lang of ['ru', 'en']) {
      resolveLanguage(lang === 'en' ? { environment: { i18n: { lang: 'en' } } } : null);
      for (const key of keys) {
        expect(t(key)).toBeTruthy();
      }
    }
  });
});

describe('applyTranslations', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="a" data-i18n="play">placeholder</button>
      <button id="b" data-i18n-aria="pauseAriaLabel" aria-label="placeholder"></button>
      <div id="c"><span data-i18n="score">placeholder</span> <span id="value">0</span></div>
    `;
  });

  it('sets textContent for every [data-i18n] element without touching siblings', () => {
    resolveLanguage(null);
    applyTranslations();
    expect(document.getElementById('a').textContent).toBe('Играть');
    expect(document.getElementById('value').textContent).toBe('0'); // untouched dynamic sibling
    expect(document.documentElement.lang).toBe('ru');
  });

  it('sets aria-label for every [data-i18n-aria] element', () => {
    resolveLanguage({ environment: { i18n: { lang: 'en' } } });
    applyTranslations();
    expect(document.getElementById('b').getAttribute('aria-label')).toBe('Pause');
    expect(document.documentElement.lang).toBe('en');
  });
});
