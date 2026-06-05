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
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getNumberOfHatefulAuthors } from "@/shared/utils/report-stats";
import {
  ReportOrganizationType,
  ReportQueryData,
} from "../Stepper/BuildReport";
import { NOTICE_UTILISATION_DATA } from "../Notice/noticeUtilisationData";
import redHatTextMedium from "@/assets/fonts/RedHatText-Medium.ttf";
import redHatTextSemiBold from "@/assets/fonts/RedHatText-SemiBold.ttf";
import redHatTextRegular from "@/assets/fonts/RedHatText-Regular.ttf";
import bthLogo from "@/assets/bth-logo.png";
import {
  getLabelAnalysisComment,
  getLabelPublishedComment,
  getSecondTextAuthorHeader,
  getTitlePublicationHeader,
  LABEL_PSEUDO_AUTEUR,
  LABEL_SCORE_JURIDIQUE,
  LABEL_URL,
} from "../reportData";
import {
  getAuthorGroups,
  getPublicationGroups,
  GroupedData,
} from "../ReportGroupingUtils";

const GRAY_500 = "#6b7280";
const NEUTRAL_50 = "#FAFAFA";
const GENERAL_SECONDARY_FOREGROUND = "#171717";
const UNOFFICIAL_FOREGROUND_ALT = "#404040";
const INDIGO_BRAND_50 = "#EEEDFF";
const INDIGO_BRAND_950 = "#2F33A4";
const BORDER = "#e5e7eb";
const TEXT_DESTRUCTIVE = "#e7000b";

// A4 Portrait
//   72 dpi (défaut) ==> 595 x 842 px
//   ? dpi (maquettes) ==> 1440 x 1983 px
// Chaque pixel de la maquette correspond donc à 1140 / 595 = 2.42 pixels pdf
const pxToPt = (pixels: number) => pixels / 2.42;
const CARD_RADIUS = pxToPt(12);

Font.register({
  family: "Red Hat Text",
  fonts: [
    { src: redHatTextRegular },
    { src: redHatTextRegular, fontWeight: 500 },
    { src: redHatTextMedium, fontWeight: 600 },
    { src: redHatTextSemiBold, fontWeight: 700 },
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

  pageTitle: {
    fontSize: pxToPt(45),
    fontWeight: 600,
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
  kpiValue: { fontSize: pxToPt(40) },
  groupSection: {
    marginBottom: pxToPt(16),
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
  },
  groupHeader: {
    backgroundColor: INDIGO_BRAND_50,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    borderBottom: `1px solid ${BORDER}`,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    padding: `${pxToPt(20)}px ${pxToPt(30)}px`,
  },
  groupHeaderTitle: {
    fontSize: pxToPt(25),
    color: GENERAL_SECONDARY_FOREGROUND,
  },
  groupHeaderContent: {
    fontSize: pxToPt(20),
    color: UNOFFICIAL_FOREGROUND_ALT,
  },
  commentsList: {
    margin: pxToPt(15),
    border: `1px solid ${BORDER}`,
    borderRadius: CARD_RADIUS,
    backgroundColor: NEUTRAL_50,
  },
  commentCard: {
    borderBottom: `1px solid ${BORDER}`,
    padding: pxToPt(20),
  },
  commentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: pxToPt(8),
  },
  commentBadgeClassification: {
    paddingHorizontal: pxToPt(4),
    border: `1px solid ${BORDER}`,
    borderRadius: pxToPt(20),
    color: TEXT_DESTRUCTIVE,
    marginRight: pxToPt(4),
    fontSize: pxToPt(15),
    marginBottom: pxToPt(20),
  },
  commentContent: { fontSize: pxToPt(15), color: UNOFFICIAL_FOREGROUND_ALT },
  commentRightBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "18%",
  },
  screenshotImage: { maxWidth: "100%" },
  noticeCard: {
    margin: pxToPt(96),
    padding: pxToPt(16),
    fontFamily: "Red Hat Text",
    backgroundColor: INDIGO_BRAND_50,
    color: INDIGO_BRAND_950,
    border: `1px solid #DDDEF9`,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: pxToPt(30),
    borderBottom: `1px solid #DDDEF9`,
    paddingBottom: pxToPt(8),
  },
  noticeSubtitle: {
    fontSize: pxToPt(25),
    marginTop: pxToPt(12),
    marginBottom: pxToPt(8),
  },
  noticeContent: {
    fontSize: pxToPt(20),
    paddingLeft: pxToPt(12),
    marginBottom: pxToPt(4),
  },
  fontWeightMedium: { fontWeight: 500 },
  fontWeightSemiBold: { fontWeight: 600 },
  fontWeightBold: { fontWeight: 700 },
});

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
      <Text style={[styles.kpiValue, styles.fontWeightSemiBold]}>{value}</Text>
    </View>
  );
};

interface PdfReportProps {
  reportQueryData: ReportQueryData;
  posts: Post[];
}

export const PdfReport = ({ reportQueryData, posts }: PdfReportProps) => {
  const { postCommentList, reportOrganizationType } = reportQueryData;

  const numberOfHatefulComments = postCommentList.length;
  const numberOfHatefulAuthors = getNumberOfHatefulAuthors(postCommentList);

  const comments = reportQueryData.postCommentList;
  const organizationType = reportQueryData.reportOrganizationType;

  let groupedData: GroupedData[] = [];

  if (organizationType === ReportOrganizationType.BY_PUBLICATION) {
    groupedData = getPublicationGroups(posts, comments);
  } else if (organizationType === ReportOrganizationType.BY_AUTHOR) {
    const latestAnalysisDate = posts?.[0]?.latestAnalysisDate
      ? new Date(posts[0].latestAnalysisDate)
      : new Date();
    groupedData = getAuthorGroups(comments, latestAnalysisDate, posts);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <FixedContent />
        <View style={styles.metaRow}>
          <Image src={bthLogo} style={styles.bthImage} />
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>
              Généré le : {formatAnalysisDate(new Date().toISOString())}
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

        {groupedData.map((group) => {
          return (
            <View key={group.groupKey} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text
                  style={[styles.groupHeaderTitle, styles.fontWeightMedium]}
                >
                  {reportOrganizationType ===
                  ReportOrganizationType.BY_PUBLICATION
                    ? getTitlePublicationHeader(group.post?.publishedAt)
                    : group.comments[0]?.author.name || "Auteur inconnu"}
                </Text>
                {reportOrganizationType ===
                  ReportOrganizationType.BY_PUBLICATION && (
                  <>
                    <Text style={styles.groupHeaderContent}>
                      {group.post?.title}
                    </Text>
                    <Text style={styles.groupHeaderContent}>
                      {LABEL_URL}
                      {group.post?.url}
                    </Text>
                  </>
                )}
                {reportOrganizationType ===
                  ReportOrganizationType.BY_AUTHOR && (
                  <Text style={styles.groupHeaderContent}>
                    {getSecondTextAuthorHeader(group.comments.length)}
                  </Text>
                )}
              </View>
              <View style={styles.commentsList} >
                {group.comments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard} wrap={false}>
                    <View style={styles.commentRow}>
                      <View>
                        {comment.classification?.map((label) => (
                          <Text
                            key={label}
                            style={[styles.commentBadgeClassification]}
                          >
                            {label}
                          </Text>
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.commentContent,
                          styles.fontWeightSemiBold,
                        ]}
                      >
                        {LABEL_SCORE_JURIDIQUE}
                      </Text>
                    </View>
                    <View style={styles.commentRow}>
                      <Image
                        src={buildDataUrl(
                          comment.screenshotData,
                          PNG_MIME_TYPE,
                        )}
                        style={styles.screenshotImage}
                      />
                      <View style={styles.commentRightBlock}>
                        <Text style={[styles.commentContent]}>
                          {getLabelPublishedComment(comment.publishedAt)}
                        </Text>
                        <Text style={[styles.commentContent]}>
                          {getLabelAnalysisComment(
                            group.post?.latestAnalysisDate,
                          )}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentContent}>
                      {reportQueryData.reportOrganizationType ===
                      ReportOrganizationType.BY_AUTHOR ? (
                        <>
                          {LABEL_URL} {group.post?.url}
                          {"  "}•{" "}
                          {getTitlePublicationHeader(group.post?.publishedAt)} :
                          &quot;
                          {group.post?.title}&quot;
                        </>
                      ) : (
                        <>
                          {LABEL_PSEUDO_AUTEUR}
                          {comment.author.name}
                        </>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </Page>
      <Page wrap>
        <FixedContent />

        <View style={styles.noticeCard}>
          <Text style={[styles.noticeTitle, styles.fontWeightMedium]}>
            {NOTICE_UTILISATION_DATA.mainTitle}
          </Text>
          {NOTICE_UTILISATION_DATA.sections.map((section) => (
            <View key={section.title}>
              <Text style={[styles.noticeSubtitle, styles.fontWeightMedium]}>
                {section.title}
              </Text>
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
