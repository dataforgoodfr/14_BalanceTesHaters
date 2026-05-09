import { PostSnapshot } from "@/shared/model/PostSnapshot";
import iconUrl from "~/assets/notification-icon.png";
export function notifyClassificationCompleted(
  snapshotsWithCompletedClassifications: PostSnapshot[],
) {
  // Dedupe snapshots of same posts
  const dedupedByPostIds = Object.values(
    Object.groupBy(
      snapshotsWithCompletedClassifications,
      (s) => s.socialNetwork + "_" + s.postId,
    ),
  )
    .filter((v) => v != undefined)
    .map((dupes) => dupes[0]);

  const nbPublications = dedupedByPostIds.length;

  // Display a single notification if several analyses
  const title =
    nbPublications === 1
      ? `Analyse terminée`
      : `${nbPublications} analyses terminées`;
  const message = `Clique sur la notification pour consulter les résultats.`;

  const resultsUrl =
    nbPublications === 1 ? postUrl(dedupedByPostIds[0]) : postListUrl();

  createNotification({
    title: title,
    message,
    onClick: () => {
      void browser.tabs.create({ url: resultsUrl, active: true });
    },
  });
}

function createNotification({
  title,
  message,
  onClick,
}: {
  title: string;
  message: string;
  onClick?: () => void;
}) {
  const id = "classification-completed-" + crypto.randomUUID();
  const onNotificationClicked = (clickedNotificationId: string) => {
    if (clickedNotificationId === id && onClick) {
      removeListeners();
      onClick();
    }
  };
  const onClosedListener = (closedNotificationId: string) => {
    if (closedNotificationId === id) {
      removeListeners();
    }
  };
  browser.notifications.onClosed.addListener(onClosedListener);
  browser.notifications.onClicked.addListener(onNotificationClicked);
  function removeListeners() {
    browser.notifications.onClosed.removeListener(onClosedListener);
    browser.notifications.onClicked.removeListener(onNotificationClicked);
  }
  //Create notification and don't wait for the result
  void browser.notifications.create(id, {
    type: "basic",
    title,
    message,
    iconUrl: iconUrl,
  });
}

export function postUrl(postSnapshot: PostSnapshot): string {
  const baseUrl = browser.runtime.getURL("/posts.html");
  return `${baseUrl}#/posts/${postSnapshot.socialNetwork}/${postSnapshot.postId}`;
}
export function postListUrl() {
  const baseUrl = browser.runtime.getURL("/posts.html");
  return baseUrl + "#/posts";
}

export const notificaitonId = "classification_completed";
