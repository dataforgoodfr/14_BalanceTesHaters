import { buildPostFromSnapshots } from "../model/post/buildPostFromSnapshots";
import { buildPostsFromSnapshots } from "../model/post/buildPostsFromSnapshots";
import { Post } from "../model/post/Post";
import { SocialNetworkName } from "../model/SocialNetworkName";
import {
  getPostSnapshotsByPostIdList,
  getPostSnapshotsBySocialNetworkAndPeriod,
  getPostSnapshotsForPostId,
} from "./post-snapshot-storage";

export async function getPostsBySocialNetworkAndPeriod(
  socialNetworkFilter: string[] = [],
  from?: Date,
  to?: Date,
): Promise<Post[]> {
  const snapshotsForFilter = await getPostSnapshotsBySocialNetworkAndPeriod(
    socialNetworkFilter,
    from,
    to,
  );
  return buildPostsFromSnapshots(snapshotsForFilter);
}

export async function getPostsByPostIdList(
  postIdList: string[],
): Promise<Post[]> {
  const snapshotsForFilter = await getPostSnapshotsByPostIdList(postIdList);
  return buildPostsFromSnapshots(snapshotsForFilter);
}

export async function getPostByPostId(
  socialNetwork: SocialNetworkName,
  postId: string,
): Promise<Post | undefined> {
  const snapshots = await getPostSnapshotsForPostId(socialNetwork, postId);
  if (snapshots.length === 0) {
    return undefined;
  }
  return buildPostFromSnapshots(snapshots);
}
