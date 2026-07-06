export function hasClassNameWithSuffix(e: HTMLElement, suffix: string) {
  for (const className of e.classList) {
    if (className.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}
