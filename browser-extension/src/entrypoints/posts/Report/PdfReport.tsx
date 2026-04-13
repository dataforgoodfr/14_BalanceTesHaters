import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Post } from "@/shared/model/post/Post";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import {
  formatAnalysisDate,
  getSocialNetworkName,
} from "@/shared/utils/post-util";
import { PublicationDate, RelativeDate } from "@/shared/model/PublicationDate";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getEntriesGroupedByPostKey } from "@/shared/utils/report-data";
import {
  getAuthorStatsList,
  getNumberOfHatefulAuthors,
} from "@/shared/utils/report-stats";
import { getPercentage } from "@/shared/utils/maths";
import { ReportQueryData } from "./BuildReport";

const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const BORDER = "#e5e7eb";
const pxToPt = (pixels: number) => pixels * 0.75;
const CARD_RADIUS = pxToPt(12);

const styles = StyleSheet.create({
  page: {
    padding: pxToPt(28),
    fontSize: pxToPt(14),
    color: "#171717",
  },

  metaBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginBottom: pxToPt(8),
  },
  metaLine: { fontSize: pxToPt(12), marginBottom: pxToPt(2) },
  metaBold: { fontWeight: 700 },

  pageTitle: {
    fontSize: pxToPt(20),
    fontWeight: 700,
    textAlign: "center",
    marginBottom: pxToPt(16),
  },

  kpiRow: { flexDirection: "row", gap: pxToPt(16), marginBottom: pxToPt(16) },
  kpiCard: {
    flex: 1,
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
    padding: pxToPt(12),
  },
  kpiLabel: {
    fontSize: pxToPt(14),
    color: GRAY_500,
    marginBottom: pxToPt(4),
  },
  kpiValue: { fontSize: pxToPt(18), fontWeight: 700 },

  twoColRow: {
    flexDirection: "row",
    gap: pxToPt(24),
    marginBottom: pxToPt(16),
  },
  twoColCard: {
    flex: 1,
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
  },
  cardHeader: {
    padding: `${pxToPt(24)}px ${pxToPt(24)}px ${pxToPt(8)}px`,
    fontSize: pxToPt(12),
    fontWeight: 400,
  },
  cardContent: { padding: `0 ${pxToPt(16)}px ${pxToPt(16)}px` },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: GRAY_200,
    minHeight: pxToPt(40),
    padding: `${pxToPt(8)}px ${pxToPt(8)}px`,
    alignItems: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    padding: `${pxToPt(8)}px`,
    borderBottom: `1px solid ${BORDER}`,
    alignItems: "center",
  },
  tableHeaderCell: { fontWeight: 500, fontSize: pxToPt(10) },
  tableCell: { fontSize: pxToPt(10) },
  colAuthorName: { width: "40%" },
  colRatio: { width: "30%" },
  colCount: { width: "30%" },

  postSection: { marginBottom: pxToPt(16) },
  postSummaryCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
    padding: pxToPt(20),
    marginBottom: pxToPt(8),
    flexDirection: "row",
  },
  postCoverImage: {
    width: pxToPt(192),
    height: pxToPt(128),
    marginRight: pxToPt(16),
    borderRadius: pxToPt(4),
    objectFit: "cover",
  },
  postInfoBlock: { flex: 1 },
  postTitle: { fontSize: pxToPt(14), fontWeight: 600, marginBottom: pxToPt(4) },
  postMeta: { fontSize: pxToPt(10), marginBottom: pxToPt(4) },

  commentsTable: {
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  colCommentAuthor: { width: "22%" },
  colCommentScreenshot: { width: "58%" },
  colCommentDate: { width: "20%" },
  screenshotImage: { maxWidth: "100%", maxHeight: pxToPt(140) },
  naText: { color: "#9ca3af" },
  pagination: { fontSize: pxToPt(10), color: GRAY_500 },
  categoryDescription: { fontSize: pxToPt(10), lineHeight: 1.4 },
});

const formatPublicationDate = (publishedAt: PublicationDate): string => {
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

const KpiCard = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
};

interface PdfReportProps {
  reportQueryData: ReportQueryData;
  posts: Post[];
}

export const PdfReport = ({ reportQueryData, posts }: PdfReportProps) => {
  const { postCommentList } = reportQueryData;

  const numberOfHatefulComments = postCommentList.length;
  const numberOfComments = posts.flatMap((p) => p.comments).length;
  const percentageHateful = getPercentage(
    numberOfHatefulComments,
    numberOfComments,
  ).toFixed(2);
  const numberOfHatefulAuthors = getNumberOfHatefulAuthors(postCommentList);
  const authorStatsList = getAuthorStatsList(postCommentList);

  const groupedCommentsByPost = getEntriesGroupedByPostKey(postCommentList);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLine}>
            Généré le{" "}
            <Text style={styles.metaBold}>
              {formatAnalysisDate(new Date().toISOString())}
            </Text>
          </Text>
          <Text style={styles.metaLine}>
            Publications analysées :{" "}
            <Text style={styles.metaBold}>
              {reportQueryData.postIdList.length}
            </Text>
          </Text>
          <Text style={styles.metaLine}>
            Plateforme :{" "}
            <Text style={styles.metaBold}>
              {reportQueryData.socialNetworkList
                .map((n) => getSocialNetworkName(n as SocialNetworkName))
                .join(", ")}
            </Text>
          </Text>
        </View>

        <Text style={styles.pageTitle}>
          Rapport des commentaires malveillants
        </Text>

        <View style={styles.kpiRow}>
          <KpiCard
            label="Nombre de commentaires malveillants"
            value={`${numberOfHatefulComments}/${numberOfComments}`}
          />
          <KpiCard
            label="Part des commentaires malveillants"
            value={`${percentageHateful}%`}
          />
          <KpiCard
            label="Auteurs de commentaires malveillants"
            value={String(numberOfHatefulAuthors)}
          />
          <KpiCard label="Gravité" value="Modérée" />
        </View>

        <View style={styles.twoColRow}>
          <View style={styles.twoColCard}>
            <Text style={styles.cardHeader}>Auteurs actifs</Text>
            <View style={styles.cardContent}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colAuthorName]}>
                  Auteur
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colRatio]}>
                  % haineux
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>
                  Commentaires
                </Text>
              </View>
              {authorStatsList.map((author) => (
                <View key={author.name} style={styles.tableDataRow}>
                  <Text style={[styles.tableCell, styles.colAuthorName]}>
                    {author.name}
                  </Text>
                  <Text style={[styles.tableCell, styles.colRatio]}>
                    {getPercentage(
                      author.numberOfHatefulComments,
                      author.numberOfComments,
                    ).toFixed(2)}
                    %
                  </Text>
                  <Text style={[styles.tableCell, styles.colCount]}>
                    {author.numberOfComments} commentaire
                    {author.numberOfComments > 1 ? "s" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.twoColCard}>
            <Text style={styles.cardHeader}>Répartition par catégories</Text>
            <View style={styles.cardContent}>
              <Text style={styles.categoryDescription}>
                Graphique circulaire présentant la répartition des commentaires
                par catégorie.
              </Text>
            </View>
          </View>
        </View>

        {groupedCommentsByPost.map(([postKey, commentList], index) => {
          const post = posts.find(
            (p) => `${p.postId}-${p.socialNetwork}` === postKey,
          );
          if (!post) return null;

          return (
            <View key={postKey} style={styles.postSection}>
              <View style={styles.postSummaryCard}>
                {post.coverImageUrl && (
                  <Image
                    src={post.coverImageUrl}
                    style={styles.postCoverImage}
                  />
                )}
                <View style={styles.postInfoBlock}>
                  {post.title && (
                    <Text style={styles.postTitle}>{post.title}</Text>
                  )}
                  <Text style={styles.postMeta}>URL : {post.url}</Text>
                  <Text style={styles.postMeta}>
                    Publié le {formatPublicationDate(post.publishedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.commentsTable}>
                <View style={styles.tableHeaderRow}>
                  <Text
                    style={[styles.tableHeaderCell, styles.colCommentAuthor]}
                  >
                    Auteur
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      styles.colCommentScreenshot,
                    ]}
                  >
                    Capture du commentaire
                  </Text>
                  <Text style={[styles.tableHeaderCell, styles.colCommentDate]}>
                    Date
                  </Text>
                </View>
                {commentList?.map((comment) => (
                  <View key={comment.id} style={styles.tableDataRow}>
                    <Text style={[styles.tableCell, styles.colCommentAuthor]}>
                      {comment.author.name}
                    </Text>
                    <View style={styles.colCommentScreenshot}>
                      {comment.screenshotData ? (
                        <Image
                          src={buildDataUrl(
                            comment.screenshotData,
                            PNG_MIME_TYPE,
                          )}
                          style={styles.screenshotImage}
                        />
                      ) : (
                        <Text style={[styles.tableCell, styles.naText]}>
                          N/A
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.tableCell, styles.colCommentDate]}>
                      {formatPublicationDate(comment.publishedAt)}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.pagination}>
                {index + 1}/{reportQueryData.postIdList.length} publications
              </Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
};
