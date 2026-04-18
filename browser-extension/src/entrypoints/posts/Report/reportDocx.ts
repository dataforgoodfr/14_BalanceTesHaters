import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Table as DocxTable,
  TableCell as DocxTableCell,
  TableRow as DocxTableRow,
  TextRun,
  WidthType,
} from "docx";
import { Post } from "@/shared/model/post/Post";
import { ReportQueryData } from "./BuildReport";
import { getSocialNetworkName } from "@/shared/utils/post-util";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import {
  booleanToFrenchText,
  formatDateTimeForDocx,
  publicationDateSourceText,
  publicationDateToDocxText,
  reportOrganizationTypeToText,
} from "./reportExportShared";

export function buildReportDocx(
  reportQueryData: ReportQueryData,
  posts: Post[],
): DocxDocument {
  const postsByKey = new Map<string, Post>(
    posts.map((post) => [`${post.postId}-${post.socialNetwork}`, post]),
  );
  const generatedAt = new Date().toISOString();
  const groupedCommentsByPost = Object.entries(
    Object.groupBy(
      reportQueryData.postCommentList,
      (comment) => comment.postKey,
    ),
  );

  const children: Array<Paragraph | DocxTable> = [
    new Paragraph({
      text: "Rapport des commentaires malveillants",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Document généré automatiquement par l'extension Balance tes haters.",
        }),
      ],
    }),
    createKeyValueTable([
      ["Date de génération", formatDateTimeForDocx(generatedAt)],
      ["Date de génération (UTC brut)", generatedAt],
      [
        "Organisation du rapport",
        reportOrganizationTypeToText(reportQueryData.reportOrganizationType),
      ],
      [
        "Plateformes",
        reportQueryData.socialNetworkList
          .map((socialNetworkName) =>
            getSocialNetworkName(socialNetworkName as SocialNetworkName),
          )
          .join(", "),
      ],
      ["Publications analysées", String(reportQueryData.postIdList.length)],
      ["Commentaires retenus", String(reportQueryData.postCommentList.length)],
    ]),
    new Paragraph({
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({
          text: "Note: les dates affichées dans ce document sont formatées en français avec fuseau horaire explicite.",
        }),
      ],
    }),
  ];

  groupedCommentsByPost.forEach(([postKey, commentList], postIndex) => {
    const post = postsByKey.get(postKey);
    const comments = commentList ?? [];

    children.push(
      new Paragraph({
        text: `Publication ${postIndex + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: postIndex > 0,
        spacing: { before: 240, after: 120 },
      }),
    );

    if (post) {
      children.push(
        createKeyValueTable([
          ["Titre", post.title ?? "-"],
          ["Auteur", post.author.name],
          ["Plateforme", getSocialNetworkName(post.socialNetwork)],
          ["Identifiant publication", post.postId],
          ["URL", post.url],
          ["Date de publication", publicationDateToDocxText(post.publishedAt)],
          [
            "Date source plateforme",
            publicationDateSourceText(post.publishedAt),
          ],
          ["Dernière collecte", formatDateTimeForDocx(post.lastAnalysisDate)],
          ["Dernière collecte (UTC brut)", post.lastAnalysisDate],
        ]),
      );
    } else {
      children.push(
        new Paragraph({
          text: `Publication introuvable pour la clé : ${postKey}`,
        }),
      );
    }

    children.push(
      new Paragraph({
        text: `Nombre de commentaires retenus : ${comments.length}`,
        spacing: { before: 180, after: 180 },
      }),
    );

    if (comments.length === 0) {
      children.push(
        new Paragraph({
          text: "Aucun commentaire retenu pour cette publication.",
          spacing: { after: 180 },
        }),
      );
      return;
    }

    comments.forEach((comment, commentIndex) => {
      children.push(
        new Paragraph({
          text: `Commentaire ${commentIndex + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 120 },
        }),
        createKeyValueTable([
          ["ID", comment.id],
          ["Auteur", comment.author.name],
          ["Date", publicationDateToDocxText(comment.publishedAt)],
          [
            "Date source plateforme",
            publicationDateSourceText(comment.publishedAt),
          ],
          ["Classification", (comment.classification ?? []).join(", ") || "-"],
          [
            "Date de classification",
            comment.classifiedAt
              ? formatDateTimeForDocx(comment.classifiedAt)
              : "-",
          ],
          [
            "Capture d'écran disponible",
            booleanToFrenchText(Boolean(comment.screenshotData)),
          ],
          ["Commentaire supprimé", booleanToFrenchText(comment.isDeleted)],
          ["Commentaire nouveau", booleanToFrenchText(comment.isNew)],
        ]),
        new Paragraph({
          children: [
            new TextRun({
              text: "Capture d'écran du commentaire",
              bold: true,
            }),
          ],
          spacing: { before: 120, after: 80 },
        }),
      );

      const screenshotParagraphs = createCommentScreenshotParagraphs(
        comment.screenshotData,
      );
      screenshotParagraphs.forEach((paragraph) => {
        children.push(paragraph);
      });

      children.push(
        new Paragraph({
          thematicBreak: true,
          spacing: { before: 120, after: 120 },
        }),
      );
    });
  });

  return new DocxDocument({
    sections: [
      {
        children,
      },
    ],
  });
}

function createKeyValueTable(rows: Array<[string, string]>): DocxTable {
  return new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new DocxTableRow({
          children: [
            new DocxTableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true })],
                }),
              ],
            }),
            new DocxTableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: value || "-" })],
            }),
          ],
        }),
    ),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    },
  });
}

function createCommentScreenshotParagraphs(
  screenshotData: string,
): Paragraph[] {
  if (!screenshotData) {
    return [
      new Paragraph({
        text: "Capture non disponible.",
      }),
    ];
  }

  try {
    const bytes = base64ToUint8Array(screenshotData);
    const dimensions = getPngDimensions(bytes);
    const transformation = computeImageTransformation(dimensions);

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: bytes,
            type: "png",
            transformation,
          }),
        ],
      }),
    ];
  } catch {
    return [
      new Paragraph({
        text: "Capture non disponible (format invalide).",
      }),
    ];
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getPngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} | null {
  if (bytes.length < 24) {
    return null;
  }

  const pngSignatureMatches =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (!pngSignatureMatches) {
    return null;
  }

  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function computeImageTransformation(
  dimensions: {
    width: number;
    height: number;
  } | null,
): {
  width: number;
  height: number;
} {
  // Match table/text visual footprint in DOCX to keep screenshots readable.
  const maxWidth = 600;
  const maxHeight = 900;

  if (!dimensions) {
    return { width: maxWidth, height: 380 };
  }

  const widthScale = maxWidth / dimensions.width;
  const heightScale = maxHeight / dimensions.height;
  const scale = Math.min(widthScale, heightScale, 1);

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
}
