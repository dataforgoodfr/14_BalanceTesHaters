const YOUTUBE_SHORTS_PATH_SEGMENT = "/shorts/";
export function isYoutubeShortUrl(url: string) {
  return url.includes(YOUTUBE_SHORTS_PATH_SEGMENT);
}
