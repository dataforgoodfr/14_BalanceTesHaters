import { AnnotatedCategory } from "@/shared/model/AnnotatedCategory";
import type {
  CommentSnapshot,
  PostSnapshot,
} from "@/shared/model/PostSnapshot";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

const SCREENSHOT_DATA =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function comment(
  overrides: Partial<CommentSnapshot> &
    Pick<CommentSnapshot, "id" | "commentId" | "textContent">,
): CommentSnapshot {
  return {
    author: {
      name: "Compte témoin",
      accountHref: "https://www.youtube.com/@compte-temoin",
    },
    publishedAt: {
      type: "absolute",
      date: "2026-08-19T08:00:00.000Z",
    },
    screenshotData: SCREENSHOT_DATA,
    scrapedAt: "2026-08-20T10:00:00.000Z",
    nbLikes: 0,
    replies: [],
    ...overrides,
  };
}

export const seededPostSnapshots: PostSnapshot[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    postId: "video-equilibre",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=video-equilibre",
    publishedAt: {
      type: "absolute",
      date: "2026-08-18T12:00:00.000Z",
    },
    author: {
      name: "Chaîne Équilibre",
      accountHref: "https://www.youtube.com/@chaine-equilibre",
    },
    title: "Comprendre le cyberharcèlement",
    textContent: "Une publication utilisée par les tests de navigation.",
    scrapedAt: "2026-08-20T10:00:00.000Z",
    classificationJobId: "job-video-equilibre",
    classificationStatus: "COMPLETED",
    comments: [
      comment({
        id: "21111111-1111-4111-8111-111111111111",
        commentId: "threat-comment",
        textContent: "Message de menace utilisé uniquement pour ce test.",
        author: {
          name: "Auteur menaçant",
          accountHref: "https://www.youtube.com/@auteur-menacant",
        },
        classification: [AnnotatedCategory.MENACES],
        classifiedAt: "2026-08-20T10:05:00.000Z",
        nbLikes: 4,
        url: "https://www.youtube.com/watch?v=video-equilibre&lc=threat-comment",
      }),
      comment({
        id: "31111111-1111-4111-8111-111111111111",
        commentId: "insult-comment",
        textContent: "Insulte synthétique réservée au scénario E2E.",
        author: {
          name: "Auteur insultant",
          accountHref: "https://www.youtube.com/@auteur-insultant",
        },
        classification: [AnnotatedCategory.INJURE_ET_DIFFAMATION_PUBLIQUE],
        classifiedAt: "2026-08-20T10:05:00.000Z",
        nbLikes: 2,
        url: "https://www.youtube.com/watch?v=video-equilibre&lc=insult-comment",
      }),
      comment({
        id: "41111111-1111-4111-8111-111111111111",
        commentId: "support-comment",
        textContent: "Merci pour cette publication utile.",
        classification: [AnnotatedCategory.ABSENCE_DE_CYBERHARCELEMENT],
        classifiedAt: "2026-08-20T10:05:00.000Z",
        url: "https://www.youtube.com/watch?v=video-equilibre&lc=support-comment",
      }),
    ],
  },
  {
    id: "51111111-1111-4111-8111-111111111111",
    postId: "video-prevention",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=video-prevention",
    publishedAt: {
      type: "absolute",
      date: "2026-08-17T12:00:00.000Z",
    },
    author: {
      name: "Chaîne Prévention",
      accountHref: "https://www.youtube.com/@chaine-prevention",
    },
    title: "Agir face aux messages haineux",
    scrapedAt: "2026-08-21T10:00:00.000Z",
    classificationJobId: "job-video-prevention",
    classificationStatus: "COMPLETED",
    comments: [
      comment({
        id: "61111111-1111-4111-8111-111111111111",
        commentId: "hate-comment",
        textContent: "Message haineux synthétique réservé au scénario E2E.",
        author: {
          name: "Auteur haineux",
          accountHref: "https://www.youtube.com/@auteur-haineux",
        },
        classification: [AnnotatedCategory.INCITATION_A_LA_HAINE],
        classifiedAt: "2026-08-21T10:05:00.000Z",
        scrapedAt: "2026-08-21T10:00:00.000Z",
        nbLikes: 1,
        url: "https://www.youtube.com/watch?v=video-prevention&lc=hate-comment",
      }),
    ],
  },
];
