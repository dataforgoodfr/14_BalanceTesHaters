export const INSTAGRAM_SCRAPING_CONTENT_SCRIPT_MATCHES = [
  "https://www.instagram.com/*",
];

export const YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES = [
  "https://www.youtube.com/*",
];

export const TIKTOK_SCRAPING_CONTENT_SCRIPT_MATCHES = [
  "https://www.tiktok.com/*",
];

export const SCRAPING_CONTENT_SCRIPT_MATCHES = [
  ...INSTAGRAM_SCRAPING_CONTENT_SCRIPT_MATCHES,
  ...YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES,
  ...TIKTOK_SCRAPING_CONTENT_SCRIPT_MATCHES,
];

export function matchesScrapingContentScriptUrl(url: string | undefined) {
  if (!url) {
    return false;
  }

  return SCRAPING_CONTENT_SCRIPT_MATCHES.some((matchPattern) =>
    matchesWebExtensionMatchPattern(url, matchPattern),
  );
}

function matchesWebExtensionMatchPattern(url: string, matchPattern: string) {
  const parsedPattern = /^(\*|http|https|file|ftp):\/\/([^/]+)(\/.*)$/.exec(
    matchPattern,
  );
  if (!parsedPattern) {
    throw new Error(`Invalid content script match pattern: ${matchPattern}`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  const [, schemePattern, hostPattern, pathPattern] = parsedPattern;
  return (
    matchesScheme(parsedUrl.protocol.slice(0, -1), schemePattern) &&
    matchesHost(parsedUrl.hostname, hostPattern) &&
    matchesPath(parsedUrl.pathname, pathPattern)
  );
}

function matchesScheme(scheme: string, schemePattern: string) {
  if (schemePattern === "*") {
    return scheme === "http" || scheme === "https";
  }
  return scheme === schemePattern;
}

function matchesHost(host: string, hostPattern: string) {
  if (hostPattern === "*") {
    return true;
  }
  if (hostPattern.startsWith("*.")) {
    const suffix = hostPattern.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === hostPattern;
}

function matchesPath(path: string, pathPattern: string) {
  return wildcardPatternToRegex(pathPattern).test(path);
}

function wildcardPatternToRegex(pattern: string) {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedPattern.replaceAll("*", ".*")}$`);
}
