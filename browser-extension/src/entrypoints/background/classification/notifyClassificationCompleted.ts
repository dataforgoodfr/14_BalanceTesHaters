import { PostSnapshot } from "@/shared/model/PostSnapshot";

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
  const message = `Tu peux consulter les résultats.`;

  const resultsUrl =
    nbPublications === 1 ? postUrl(dedupedByPostIds[0]) : postListUrl();
  const openResultsButtonTitle =
    nbPublications === 1 ? `Accéder à l'analyse` : `Accéder aux analyse`;

  createNotification({
    title: title,
    message,
    buttons: [
      {
        title: openResultsButtonTitle,
        onClick: () => {
          browser.tabs.create({ url: resultsUrl, active: true });
        },
      },
    ],
    onClick: () => {
      browser.tabs.create({ url: resultsUrl, active: true });
    },
  });
}

type ButtonWithHandler = Browser.notifications.NotificationButton & {
  onClick: () => void;
};

function createNotification({
  title,
  message,
  buttons,
  onClick,
}: {
  title: string;
  message: string;
  buttons: ButtonWithHandler[];
  onClick?: () => void;
}) {
  const id = "classification-completed-" + crypto.randomUUID();
  const onNotificationClicked = (clickedNotificationId: string) => {
    if (clickedNotificationId === id && onClick) {
      removeListeners();
      onClick();
    }
  };
  const onButtonClicked = (
    clickedNotificationId: string,
    buttonIndex: number,
  ) => {
    if (clickedNotificationId === id && buttons.length > buttonIndex) {
      removeListeners();
      buttons[buttonIndex].onClick();
    }
  };

  const onClosedListener = (closedNotificationId: string) => {
    if (closedNotificationId === id) {
      removeListeners();
    }
  };
  browser.notifications.onClosed.addListener(onClosedListener);
  browser.notifications.onClicked.addListener(onNotificationClicked);
  browser.notifications.onButtonClicked.addListener(onButtonClicked);
  function removeListeners() {
    browser.notifications.onClosed.removeListener(onClosedListener);
    browser.notifications.onClicked.removeListener(onNotificationClicked);
    browser.notifications.onButtonClicked.removeListener(onButtonClicked);
  }
  const buttonsWithoutExtraOnClick = buttons.map(
    ({ onClick: _, ...withoutOnClick }) => withoutOnClick,
  );
  browser.notifications.create(id, {
    type: "basic",
    title,
    message,
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    buttons: buttonsWithoutExtraOnClick,
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

export const notificaitonId = "classificaiton_completed";
