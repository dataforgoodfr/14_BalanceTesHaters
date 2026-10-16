import type { ScreenshotCommentIdsByPostSnapshotId } from "../model/post/buildCommentsFromSnapshots";
import { buildPostFromSnapshots } from "../model/post/buildPostFromSnapshots";
import { buildPostsFromSnapshots } from "../model/post/buildPostsFromSnapshots";
import type { Post } from "../model/post/Post";
import type { SocialNetworkName } from "../model/SocialNetworkName";
import { getPostHateFlagsList, type PostHateFlags } from "./hate-flags-storage";
import {
  getPostSnapshotRecordsByPostIdList,
  getPostSnapshotRecordsBySocialNetworkAndPeriod,
  getPostSnapshotRecordsForPostId,
} from "./post-snapshot-storage/post-snapshot-storage";
import type { PostSnapshotRecord } from "./post-snapshot-storage/post-snapshot-storage-format";

export async function getPostsBySocialNetworkAndPeriod(
  socialNetworkFilter: string[] = [],
  from?: Date,
  to?: Date,
): Promise<Post[]> {
  const records = await getPostSnapshotRecordsBySocialNetworkAndPeriod(
    socialNetworkFilter,
    from,
    to,
  );
  const postIdList = records.map((record) => record.postSnapshot.id);
  const hateFlags = await getPostHateFlagsList(postIdList);
  return buildPostsFromRecords(records, hateFlags);
}

export async function getPostsByPostIdList(
  postIdList: string[],
): Promise<Post[]> {
  return buildPostsFromRecords(
    await getPostSnapshotRecordsByPostIdList(postIdList),
    await getPostHateFlagsList(postIdList),
  );
}

export async function getPostByPostId(
  socialNetwork: SocialNetworkName,
  postId: string,
): Promise<Post | undefined> {
  const records = await getPostSnapshotRecordsForPostId(socialNetwork, postId);
  if (records.length === 0) {
    return undefined;
  }

  const postSnapshotIds = records.map((record) => record.postSnapshot.id);

  return buildPostFromSnapshots(
    records.map((record) => record.postSnapshot),
    await getPostHateFlagsList(postSnapshotIds),
    buildScreenshotCommentIdsByPostSnapshotId(records),
  );
}

function buildPostsFromRecords(
  records: PostSnapshotRecord[],
  hateFlags: PostHateFlags[],
): Post[] {
  return buildPostsFromSnapshots(
    records.map((record) => record.postSnapshot),
    hateFlags,
    buildScreenshotCommentIdsByPostSnapshotId(records),
  );
}

function buildScreenshotCommentIdsByPostSnapshotId(
  records: PostSnapshotRecord[],
): ScreenshotCommentIdsByPostSnapshotId {
  return new Map(
    records.map((record) => [
      record.postSnapshot.id,
      new Set(Object.keys(record.screenshotChunkIndexByCommentSnapshotId)),
    ]),
  );
}
