const UI_LABELS = new Set([
  "like",
  "likes",
  "liked",
  "j'aime",
  "j’aime",
  "reply",
  "replies",
  "répondre",
  "options de commentaire",
  "see translation",
  "voir la traduction",
  "follow",
  "following",
  "suivre",
  "ago",
]);

const RESERVED_INSTAGRAM_PATH_SEGMENTS = new Set([
  "about",
  "accounts",
  "api",
  "direct",
  "explore",
  "legal",
  "p",
  "privacy",
  "reel",
  "reels",
  "stories",
]);

export function normalizeInstagramText(
  text: string | null | undefined,
): string | undefined {
  const normalized = text?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

export function looksLikeInstagramUiLabel(text: string): boolean {
  const normalizedText = text.toLowerCase();
  if (
    /^\d+[.,]?\d*[km]?$/i.test(normalizedText) ||
    /^\d+\s*(?:h|min|j|s|sem)\d*$/i.test(normalizedText)
  ) {
    return true;
  }

  return UI_LABELS.has(normalizedText);
}

export function sanitizeInstagramCommentText(
  text: string | null | undefined,
): string | undefined {
  const normalized = normalizeInstagramText(text);
  if (!normalized) {
    return undefined;
  }

  const cleaned = normalized
    .replace(/\s*(?:j['’]aime|like)\s*options de commentaire\s*$/i, "")
    .replace(/\s*options de commentaire\s*$/i, "")
    .trim();
  if (!cleaned || looksLikeInstagramUiLabel(cleaned)) {
    return undefined;
  }

  return cleaned;
}

export function isLikelyInstagramAccountPath(pathSegment: string): boolean {
  const normalizedPathSegment = pathSegment.toLowerCase();
  if (RESERVED_INSTAGRAM_PATH_SEGMENTS.has(normalizedPathSegment)) {
    return false;
  }
  return /^[a-z0-9._]{1,30}$/i.test(pathSegment);
}
