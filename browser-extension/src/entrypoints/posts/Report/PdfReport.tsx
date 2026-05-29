import {
  Document,
  Font,
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
import { getNumberOfHatefulAuthors } from "@/shared/utils/report-stats";
import { ReportQueryData } from "./BuildReport";
import { NOTICE_UTILISATION_DATA } from "./noticeUtilisationData";
import redHatText from "@/assets/fonts/RedHatText-Regular.ttf";
import redHatTextMedium from "@/assets/fonts/RedHatText-Medium.ttf";
import redHatTextSemiBold from "@/assets/fonts/RedHatText-SemiBold.ttf";
import redHatTextBold from "@/assets/fonts/RedHatText-Bold.ttf";
import bthLogo from "@/assets/bth-logo.png";

const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const INDIGO_BRAND_950 = "#2F33A4";

const BORDER = "#e5e7eb";

// A4 Portrait
//   72 dpi (défaut) ==> 595 x 842 px
//   ? dpi (maquettes) ==> 1440 x 1983 px
// Chaque pixel de la maquette correspond donc à 1140 / 595 = 2.42 pixels pdf
const pxToPt = (pixels: number) => pixels / 2.42;
const CARD_RADIUS = pxToPt(12);

Font.register({
  family: "Red Hat Text",
  fonts: [
    { src: redHatText },
    { src: redHatTextMedium, fontWeight: 500 },
    { src: redHatTextSemiBold, fontWeight: 600 },
    { src: redHatTextBold, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingVertical: pxToPt(46),
    paddingHorizontal: pxToPt(96),
    fontFamily: "Red Hat Text",
    fontSize: pxToPt(20),
    color: "#171717",
  },
  repeatedHeader: {
    top: 0,
    right: 0,
    position: "absolute",
    paddingVertical: pxToPt(23),
    paddingHorizontal: pxToPt(96),
    fontSize: pxToPt(20),
    color: GRAY_500,
  },
  pageNumber: {
    bottom: 0,
    right: 0,
    position: "absolute",
    paddingVertical: pxToPt(23),
    paddingHorizontal: pxToPt(96),
    fontSize: pxToPt(20),
    color: GRAY_500,
  },
  bthImage: {
    height: pxToPt(55),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: pxToPt(46),
  },
  metaBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  metaLine: { fontSize: pxToPt(20), marginBottom: pxToPt(12) },
  metaBold: { fontWeight: 700 },

  pageTitle: {
    fontSize: pxToPt(45),
    fontWeight: 700,
    textAlign: "center",
    marginBottom: pxToPt(16),
  },

  kpiRow: { flexDirection: "row", gap: pxToPt(16), marginBottom: pxToPt(16) },
  kpiCard: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
    padding: pxToPt(12),
  },
  kpiLabel: {
    fontSize: pxToPt(17),
    color: GRAY_500,
    marginBottom: pxToPt(4),
  },
  kpiValue: { fontSize: pxToPt(40), fontWeight: 600 },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: GRAY_200,
    minHeight: pxToPt(120),
    padding: `${pxToPt(20)}px ${pxToPt(30)}px`,
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
  screenshotImage: { maxWidth: "100%" },
  naText: { color: "#9ca3af" },
  pagination: { fontSize: pxToPt(10), color: GRAY_500 },
  categoryDescription: { fontSize: pxToPt(10), lineHeight: 1.4 },
  noticeCard: {
    margin: pxToPt(96),
    padding: pxToPt(16),
    fontFamily: "Red Hat Text",
    backgroundColor: "#EEEDFF",
    color: INDIGO_BRAND_950,
    border: `1px solid #DDDEF9`,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: pxToPt(30),
    fontWeight: 500,
    borderBottom: `1px solid #DDDEF9`,
    paddingBottom: pxToPt(8),
  },
  noticeSubtitle: {
    fontWeight: 500,
    fontSize: pxToPt(25),
    marginTop: pxToPt(12),
    marginBottom: pxToPt(8),
  },
  noticeContent: {
    fontSize: pxToPt(20),
    paddingLeft: pxToPt(12),
    marginBottom: pxToPt(4),
  },
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

const FixedContent = () => {
  return (
    <>
      <Text
        style={styles.repeatedHeader}
        render={({ pageNumber }) =>
          pageNumber > 1 && "Rapport des commentaires malveillants"
        }
        fixed
      />
      <Text
        style={styles.pageNumber}
        render={({ pageNumber }) => `${pageNumber}`}
        fixed
      />
    </>
  );
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
  const numberOfHatefulAuthors = getNumberOfHatefulAuthors(postCommentList);

  const groupedCommentsByPost = getEntriesGroupedByPostKey(postCommentList);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <FixedContent />
        <View style={styles.metaRow}>
          <Image src={bthLogo} style={styles.bthImage} />
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>
              Généré le :{formatAnalysisDate(new Date().toISOString())}
            </Text>
            <Text style={styles.metaLine}>
              Publications analysées : {reportQueryData.postIdList.length}
            </Text>
            <Text style={styles.metaLine}>
              Plateforme :{" "}
              {reportQueryData.socialNetworkList
                .map((n) => getSocialNetworkName(n as SocialNetworkName))
                .join(", ")}
            </Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>
          Rapport des commentaires malveillants
        </Text>

        <View style={styles.kpiRow}>
          <KpiCard
            label="Auteurs de commentaires malveillants"
            value={String(numberOfHatefulAuthors)}
          />
          <KpiCard label="Score juridique moyen" value="N/A" />
          <KpiCard
            label="Nombre de commentaires malveillants"
            value={String(numberOfHatefulComments)}
          />
          <KpiCard label="Alerte sécurité" value="N/A" />
        </View>

        {groupedCommentsByPost.map(([postKey, commentList], index) => {
          const post = posts.find(
            (p) => `${p.postId}|${p.socialNetwork}` === postKey,
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
      <Page wrap>
        <FixedContent />

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>
            {NOTICE_UTILISATION_DATA.mainTitle}
          </Text>
          {NOTICE_UTILISATION_DATA.sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.noticeSubtitle}>{section.title}</Text>
              {section.items.map((item) => (
                <Text key={item.text} style={styles.noticeContent}>
                  • {item.text}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
