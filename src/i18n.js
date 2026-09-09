// Minimal i18n: detects the player's language from the Yandex Games SDK
// environment (ysdk.environment.i18n.lang) and swaps every static UI string
// accordingly. Required by Yandex Games moderation whenever a game declares
// support for more than one language in its store listing — the platform
// checks that the declared languages are actually reflected in the game
// itself, not just the store page text.

const DICTIONARIES = {
  ru: {
    score: 'Счёт:',
    bestScore: 'Лучший счёт:',
    play: 'Играть',
    settings: 'Настройки',
    pauseAriaLabel: 'Пауза',
    pausedHeading: 'Пауза',
    resume: 'Продолжить',
    restart: 'Начать заново',
    back: 'Назад',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
    gameOverHeading: 'Игра окончена',
    playAgain: 'Играть снова',
  },
  en: {
    score: 'Score:',
    bestScore: 'Best score:',
    play: 'Play',
    settings: 'Settings',
    pauseAriaLabel: 'Pause',
    pausedHeading: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    back: 'Back',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    gameOverHeading: 'Game Over',
    playAgain: 'Play again',
  },
};

const SUPPORTED_LANGS = Object.keys(DICTIONARIES); // ['ru', 'en']
const DEFAULT_LANG = 'ru';

let currentLang = DEFAULT_LANG;

/** Narrows any SDK/browser language code down to one of our supported dictionaries. */
function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

/**
 * Resolves the language to use from the Yandex SDK instance (falls back to
 * 'ru' outside the platform, e.g. local dev or the Claude Artifact preview,
 * where `ysdk` is null and there's no environment to read).
 */
export function resolveLanguage(ysdk) {
  const rawLang = ysdk?.environment?.i18n?.lang;
  currentLang = rawLang ? normalizeLang(rawLang) : DEFAULT_LANG;
  return currentLang;
}

export function getLanguage() {
  return currentLang;
}

/** Looks up `key` in the current language's dictionary. */
export function t(key) {
  return DICTIONARIES[currentLang][key] ?? DICTIONARIES[DEFAULT_LANG][key] ?? key;
}

/**
 * Applies the current language to every element carrying a `data-i18n`
 * (text content) or `data-i18n-aria` (aria-label) attribute, plus the
 * document's own language tag. Call once after resolveLanguage(), and again
 * any time the language could plausibly change (it can't mid-session here,
 * but this keeps the function safe to call defensively).
 */
export function applyTranslations() {
  document.documentElement.lang = currentLang;

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
}
