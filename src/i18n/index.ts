import en, { type Strings } from './en';

const LANGS: Record<string, Strings> = { en };

let current: Strings = en;

export const setLanguage = (lang: string) => {
  current = LANGS[lang] ?? en;
};

export const languages = Object.keys(LANGS);

/** Read a string, filling in {placeholders}. */
export const fmt = (text: string, vars: Record<string, string | number> = {}) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

export const strings = () => current;
