import { ReportQueryData, ReportOrganizationType } from "./BuildReport";

import KpiCard from "../Shared/KpiCards/KpiCard";

import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";

import { Post } from "@/shared/model/post/Post";
import SecurityAlert from "../Shared/KpiCards/SecurityAlert";
import { NoticeUtilisation } from "./NoticeUtilisation";
import { ReportCommentGroup } from "./ReportCommentGroup";
import { useMemo } from "react";
import { getPublicationGroups, getAuthorGroups } from "./ReportGroupingUtils";

interface ReportContentProps {
  reportQueryData?: ReportQueryData;
  posts?: Post[];
  isLoadingPosts: boolean;
  setSelectedScreenshot: (screenshot: string | null) => void;
  setScreenshotDialogOpen: (open: boolean) => void;
}

export const ReportContent = ({
  reportQueryData,
  posts,
  isLoadingPosts,
  setSelectedScreenshot,
  setScreenshotDialogOpen,
}: ReportContentProps) => {
  const numberOfHatefulComments = reportQueryData?.postCommentList?.length ?? 0;

  const openScreenshotDialog = (screenshot: string) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialogOpen(true);
  };

  const groupedReportData = useMemo(() => {
    if (!reportQueryData?.postCommentList) return [];

    const comments = reportQueryData.postCommentList;
    const organizationType = reportQueryData.reportOrganizationType;

    if (organizationType === ReportOrganizationType.BY_PUBLICATION) {
      return getPublicationGroups(posts, comments);
    } else if (organizationType === ReportOrganizationType.BY_AUTHOR) {
      const latestAnalysisDate = posts?.[0]?.latestAnalysisDate
        ? new Date(posts[0].latestAnalysisDate)
        : new Date();
      return getAuthorGroups(comments, latestAnalysisDate, posts);
    }

    return [];
  }, [
    reportQueryData?.postCommentList,
    posts,
    reportQueryData?.reportOrganizationType,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Rapport des commentaires malveillants
      </h1>
      <div className="flex gap-4 justify-between">
        <NumberHatefulAuhorsKpiCard
          hatefulCommentList={reportQueryData?.postCommentList ?? []}
          isLoading={isLoadingPosts}
        />
        <KpiCard
          title="Score juridique moyen"
          value="N/A"
          isWorkInProgress={true}
          isLoading={isLoadingPosts}
        />
        <NumberHatefulCommentsKpiCard
          numberOfHatefulComments={numberOfHatefulComments}
          isLoading={isLoadingPosts}
        />

        <SecurityAlert isLoading={isLoadingPosts}></SecurityAlert>
      </div>

      {groupedReportData.map((group) => (
        <ReportCommentGroup
          key={group.groupKey}
          groupKey={group.groupKey}
          comments={group.comments}
          headerContent={group.headerContent}
          postLatestAnalysisDate={group.postLatestAnalysisDate}
          onScreenshotClick={openScreenshotDialog}
          reportOrganizationType={
            reportQueryData?.reportOrganizationType ??
            ReportOrganizationType.BY_AUTHOR
          }
          commentPostMap={group.commentPostMap}
        />
      ))}
      <NoticeUtilisation />
    </div>
  );
};
