const SUPPORTED_YOUTUBE_LANGUAGES = new Set(["en", "fr"]);

export function getYoutubeLanguage(document: Document): string | undefined {
  const locale = document.documentElement.lang.trim();
  if (!locale) return undefined;

  try {
    return new Intl.Locale(locale).language.toLowerCase();
  } catch {
    return undefined;
  }
}

export function assertYoutubeLanguageIsSupported(document: Document): void {
  const locale = document.documentElement.lang.trim();
  const language = getYoutubeLanguage(document);

  if (language && SUPPORTED_YOUTUBE_LANGUAGES.has(language)) return;

  const detectedLocale = locale || "inconnue";
  throw new Error(
    `La langue actuelle de YouTube (${detectedLocale}) n'est pas prise en charge. Passez YouTube en français ou en anglais, puis relancez la capture.`,
  );
}
