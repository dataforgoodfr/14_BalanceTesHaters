// @vitest-environment happy-dom

import { beforeEach, describe, expect, test } from "vitest";
import {
  assertYoutubeLanguageIsSupported,
  getYoutubeLanguage,
} from "../youtubeLanguage";

describe("YouTube language", () => {
  beforeEach(() => {
    document.documentElement.lang = "";
  });

  test.each([
    ["fr-FR", "fr"],
    ["en-US", "en"],
    ["de-DE", "de"],
    ["pt-BR", "pt"],
    ["zh-Hans", "zh"],
  ])("normalizes %s to %s", (locale, expectedLanguage) => {
    document.documentElement.lang = locale;

    expect(getYoutubeLanguage(document)).toBe(expectedLanguage);
  });

  test("does not use the browser language when YouTube is in French", () => {
    document.documentElement.lang = "fr-FR";
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "en-US",
    });

    expect(getYoutubeLanguage(document)).toBe("fr");
    expect(() => assertYoutubeLanguageIsSupported(document)).not.toThrow();
  });

  test.each(["fr-FR", "en-US", "en-GB"])(
    "accepts the supported locale %s",
    (locale) => {
      document.documentElement.lang = locale;

      expect(() => assertYoutubeLanguageIsSupported(document)).not.toThrow();
    },
  );

  test("rejects an unsupported YouTube locale with an actionable message", () => {
    document.documentElement.lang = "de-DE";

    expect(() => assertYoutubeLanguageIsSupported(document)).toThrow(
      "La langue actuelle de YouTube (de-DE) n'est pas prise en charge. Passez YouTube en français ou en anglais, puis relancez la capture.",
    );
  });

  test("rejects a missing YouTube locale", () => {
    expect(() => assertYoutubeLanguageIsSupported(document)).toThrow(
      "La langue actuelle de YouTube (inconnue) n'est pas prise en charge.",
    );
  });
});
