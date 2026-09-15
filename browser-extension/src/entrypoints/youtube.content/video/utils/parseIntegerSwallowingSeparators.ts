export function parseIntegerSwallowingSeparators(text: string): number {
  const textWithoutSeparators = text.replaceAll(",", "").replaceAll(/\s/g, "");
  const parsed = Number.parseInt(textWithoutSeparators);
  if (Number.isNaN(parsed)) {
    throw new Error("Cannot parse text: invalid integer : " + text);
  }
  return parsed;
}
