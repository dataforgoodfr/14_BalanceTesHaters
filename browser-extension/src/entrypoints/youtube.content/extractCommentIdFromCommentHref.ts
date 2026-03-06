/**
 * Extract comment id from youtube link url.
 * Example for https://www.youtube.com/watch?v=0eHZRPzbiJ0&lc=Ugwfqc-ST80r1oLPzFh4AaABAg
 * @param href
 */
export function extractCommentIdFromCommentHref(href: string): string {
  const parsed = URL.parse(href);
  const lc = parsed?.searchParams.get("lc");
  if (lc == undefined) {
    throw new Error("Cannot find comment id on link");
  }
  return lc;
}
