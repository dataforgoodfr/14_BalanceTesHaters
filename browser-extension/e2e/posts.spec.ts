import { expect, test } from "./fixtures";
import { seededPostSnapshots } from "./data/seededPostSnapshots";
import { e2eSeedPostSnapshots } from "./extension-integration/storage/e2eSeedPostSnapshots";
import { AppPageObject } from "./po/AppPageObject";

test.beforeEach(async ({ context, extensionId }) => {
  expect(extensionId).not.toBe("");
  await e2eSeedPostSnapshots(context, seededPostSnapshots);
});

test("browse publications and open publication details", async ({
  context,
  extensionId,
}) => {
  const postsApp = await AppPageObject.open(extensionId, context);

  await postsApp.browseTo("Publications analysées");

  await expect(
    postsApp.page.getByRole("heading", { name: "Publications analysées" }),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText("Comprendre le cyberharcèlement"),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText("Agir face aux messages haineux"),
  ).toBeVisible();

  const publication = postsApp.page
    .getByText("Comprendre le cyberharcèlement")
    .locator("xpath=ancestor::label");
  await publication.getByRole("link", { name: "Consulter" }).click();

  await expect(
    postsApp.page.getByRole("heading", {
      name: "Analyse des commentaires malveillants",
    }),
  ).toBeVisible();
  await expect(
    postsApp.page.getByRole("heading", { name: "Publication analysée" }),
  ).toBeVisible();
  await expect(postsApp.page.getByText("2/3", { exact: true })).toBeVisible();
  const commentsTable = postsApp.page.getByRole("table");
  await expect(commentsTable.getByText("Auteur menaçant")).toBeVisible();
  await expect(
    commentsTable.getByText(
      "Message de menace utilisé uniquement pour ce test.",
    ),
  ).toBeAttached();
});

test("start a report with the comments selected from a publication", async ({
  context,
  extensionId,
}) => {
  const postsApp = await AppPageObject.open(
    extensionId,
    context,
    "/posts/YOUTUBE/video-equilibre",
  );

  await postsApp.page
    .getByRole("button", { name: "Tout sélectionner" })
    .click();
  await postsApp.page.getByRole("button", { name: "Créer un rapport" }).click();

  await expect(
    postsApp.page.getByRole("heading", {
      name: "Choisis l’organisation du rapport",
    }),
  ).toBeVisible();
  await expect(postsApp.page).toHaveURL(/#\/build-report$/);
});
