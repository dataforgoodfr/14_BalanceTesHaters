import { SocialNetworkName } from "./model/SocialNetworkName";

export function getPostsListUrl() {
  return browser.runtime.getURL("/posts.html#/posts");
}

export function getPostDetailsUrl(
  socialNetwork: SocialNetworkName,
  postId: string,
): string {
  return browser.runtime.getURL(`/posts.html#posts/${socialNetwork}/${postId}`);
}
