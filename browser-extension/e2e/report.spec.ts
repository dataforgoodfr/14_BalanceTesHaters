import { readFile } from "node:fs/promises";
import { REPORT_PDF_FILE_NAME } from "@/shared/utils/report-data";
import { expect, test } from "./fixtures";
import { seededPostSnapshots } from "./data/seededPostSnapshots";
import { e2eSeedPostSnapshots } from "./extension-integration/storage/e2eSeedPostSnapshots";
import { AppPageObject } from "./po/AppPageObject";

test.beforeEach(async ({ context, extensionId }) => {
  expect(extensionId).not.toBe("");
  await e2eSeedPostSnapshots(context, seededPostSnapshots);
});

test("create and download a PDF report from the side navigation", async ({
  context,
  extensionId,
}) => {
  const postsApp = await AppPageObject.open(extensionId, context);

  await postsApp.page
    .getByRole("link", { name: "Créer un rapport", exact: true })
    .click();
  await expect(
    postsApp.page.getByRole("heading", {
      name: "Sélectionne une plateforme",
    }),
  ).toBeVisible();

  await postsApp.page.getByText("YouTube", { exact: true }).click();
  await postsApp.page.getByRole("button", { name: "Suivant" }).click();
  await expect(
    postsApp.page.getByRole("heading", {
      name: "Sélectionne les publications",
    }),
  ).toBeVisible();

  await postsApp.page
    .getByRole("button", { name: "Tout sélectionner" })
    .click();
  await postsApp.page.getByRole("button", { name: "Suivant" }).click();
  await expect(
    postsApp.page.getByRole("heading", {
      name: "Sélectionne les commentaires",
    }),
  ).toBeVisible();

  await postsApp.page
    .getByRole("button", { name: "Tout sélectionner" })
    .click();
  await postsApp.page.getByRole("button", { name: "Suivant" }).click();
  await expect(
    postsApp.page.getByRole("heading", {
      name: "Choisis l’organisation du rapport",
    }),
  ).toBeVisible();

  await postsApp.page
    .getByRole("button", { name: "Générer le rapport" })
    .click();
  await expect(
    postsApp.page.getByRole("heading", {
      name: "Rapport des commentaires malveillants",
    }),
  ).toBeVisible();
  await expect(
    postsApp.page.getByText("Publications analysées : 2"),
  ).toBeVisible();

  const pdfLink = postsApp.page.getByRole("link", {
    name: "Télécharger le PDF",
  });
  await expect(pdfLink).toBeVisible({ timeout: 60_000 });

  const downloadPromise = postsApp.page.waitForEvent("download");
  await pdfLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(REPORT_PDF_FILE_NAME);

  const downloadPath = await download.path();
  if (!downloadPath) {
    throw new Error("Playwright did not provide a path for the PDF download");
  }
  const pdf = await readFile(downloadPath);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.byteLength).toBeGreaterThan(1_000);
});
