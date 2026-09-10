import { expect, test } from "./fixtures";
import { seededPostSnapshots } from "./data/seededPostSnapshots";
import { e2eSeedPostSnapshots } from "./extension-integration/storage/e2eSeedPostSnapshots";
import { AppPageObject } from "./po/AppPageObject";

test.beforeEach(async ({ context, extensionId }) => {
  expect(extensionId).not.toBe("");
  await e2eSeedPostSnapshots(context, seededPostSnapshots);
});

test("browse the overview page with seeded publication statistics", async ({
  context,
  extensionId,
}) => {
  const postsApp = await AppPageObject.open(extensionId, context);

  await postsApp.browseTo("Vue d'ensemble");

  await expect(
    postsApp.page.getByRole("heading", { name: "Vue d'ensemble" }),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText(
      "Publications analysées pour la période sélectionnée : 2",
    ),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText("Part des commentaires malveillants"),
  ).toBeVisible();
  await expect(postsApp.page.getByText("75.00%")).toBeVisible();
  await expect(
    postsApp.page.getByText("Principaux auteurs de commentaires malveillants"),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText("Répartition par catégories"),
  ).toBeVisible();
});
