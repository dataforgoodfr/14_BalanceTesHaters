import { PublicationDate, RelativeDate } from "@/shared/model/PublicationDate";

export const LABEL_RAPPORT_COMMENTAIRES_MALVEILLANTS =
  "Rapport des commentaires malveillants";
export const LABEL_URL = "URL : ";
export const LABEL_PSEUDO_AUTEUR = "Pseudo auteur : ";
export const LABEL_SCORE_JURIDIQUE = "Score juridique moyen : N/A";

export function getTitlePublicationHeader(
  date: PublicationDate | undefined,
): string {
  return `Publication du ${date ? getPostDisplayDate(date) : "Date inconnue"}`;
}

export function getSecondTextAuthorHeader(commentCount: number): string {
  return `${commentCount} commentaire${commentCount > 1 ? "s" : ""} • ${LABEL_SCORE_JURIDIQUE}`;
}

export function getLabelPublishedComment(
  date: PublicationDate | undefined,
): string {
  return `Publié le ${date ? formatCommentDate(date) : "Date inconnue"}`;
}

export function getLabelAnalysisComment(
  latestAnalysisDate: string | undefined,
): string {
  return `Capturé le ${latestAnalysisDate === undefined ? "Date inconnue" : new Date(latestAnalysisDate).toLocaleDateString("fr-FR")}`;
}

function getPostDisplayDate(date: PublicationDate): string {
  if (date.type === "absolute") {
    return new Date(date.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return "Date inconnue";
}

const formatCommentDate = (publishedAt: PublicationDate): string => {
  switch (publishedAt.type) {
    case "absolute":
      return new Date(publishedAt.date).toLocaleDateString("fr-FR");
    case "relative":
      return formatRelativeDate(publishedAt);
    case "unknown date":
      return publishedAt.dateText;
  }
};

const formatRelativeDate = (relative: RelativeDate): string => {
  const start = new Date(relative.resolvedDateRange.start).getTime();
  const end = new Date(relative.resolvedDateRange.end).getTime();
  const mid = new Date(start + Math.round((end - start) / 2));
  return `~${mid.toLocaleDateString("fr-FR")}`;
};
