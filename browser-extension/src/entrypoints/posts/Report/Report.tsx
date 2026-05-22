import { Link } from "react-router";
import { CircleAlert, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatAnalysisDate,
  getSocialNetworkName,
} from "@/shared/utils/post-util";
import { ReportQueryData } from "./BuildReport";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { useMemo, useState } from "react";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Packer } from "docx";
import { buildReportCsv } from "./reportCsv";
import { buildReportDocx } from "./reportDocx";
import { ReportContent } from "./ReportContent";
import { useReportPosts } from "@/shared/utils/report-data";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import { DOWNLOAD_PDF_LABEL } from "@/shared/constants/labels";
import ClosableAlert from "../Shared/ClosableAlert";
import { Logo } from "@/components/shared/Logo";

const Report = ({
  reportQueryData,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
}>) => {
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null,
  );

  const { data: posts, isLoading: isLoadingPosts } = useReportPosts(
    reportQueryData?.postIdList,
  );

  const queryKey = useMemo(
    () => ["posts", reportQueryData?.socialNetworkList?.join(",") ?? ""],
    [reportQueryData?.socialNetworkList?.join(",")],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsByPostIdList(reportQueryData?.postIdList ?? []),
  });

  const canExportCsv =
    !isLoading && (reportQueryData?.postCommentList.length ?? 0) > 0;
  const canExportDocx = canExportCsv;

  const exportCsv = () => {
    if (!reportQueryData) {
      return;
    }
    const csvContent = buildReportCsv(reportQueryData, data ?? []);
    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");

    void browser.downloads.download({
      url:
        "data:text/csv;charset=utf-8," +
        encodeURIComponent("\uFEFF" + csvContent),
      filename: `rapport-bth-${generatedAt}.csv`,
      saveAs: true,
    });
  };

  const exportDocx = async () => {
    if (!reportQueryData) {
      return;
    }
    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");
    const docxDocument = buildReportDocx(reportQueryData, data ?? []);
    const blob = await Packer.toBlob(docxDocument);
    const objectUrl = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url: objectUrl,
        filename: `rapport-bth-${generatedAt}.docx`,
        saveAs: true,
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  };

  return (
    <>
      <div className="flex justify-between">
        <Button
          variant="link"
          nativeButton={false}
          render={
            <Link to="/">
              <MoveLeft /> Vue d&apos;ensemble
            </Link>
          }
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            roundness="round"
            disabled={!canExportCsv}
            onClick={exportCsv}
          >
            Exporter les données en CSV
          </Button>
          {reportQueryData && posts ? (
            <DownloadPdfButton
              reportQueryData={reportQueryData}
              posts={posts}
            />
          ) : (
            <Button roundness="round" variant="outline" disabled>
              {DOWNLOAD_PDF_LABEL}
            </Button>
          )}
          <Button
            variant="outline"
            roundness="round"
            disabled={!canExportDocx}
            onClick={() => void exportDocx()}
          >
            Télécharger le DOCX
          </Button>
        </div>
      </div>

      <ClosableAlert
        title="Important"
        description="Ce rapport ne pourra pas être enregistré sur votre navigateur. Pensez à télécharger le rapport en PDF ou exporter les données du rapport en CSV"
        icon={<CircleAlert />}
      />

      <div className="max-w-5xl self-center flex flex-col gap-6">
        <div className="flex justify-between items-center ">
          <Logo className="" />

          <div className="flex flex-col items-end">
            <span>
              Généré le : {formatAnalysisDate(new Date().toISOString())}
            </span>
            <span>
              Publications analysées : {reportQueryData?.postIdList.length}
            </span>
            <span>
              Plateforme :{" "}
              {reportQueryData?.socialNetworkList
                .map((socialNetworkName) =>
                  getSocialNetworkName(socialNetworkName as SocialNetworkName),
                )
                .join(", ")}
            </span>
          </div>
        </div>

        <ReportContent
          reportQueryData={reportQueryData}
          posts={posts}
          isLoadingPosts={isLoadingPosts}
          setSelectedScreenshot={setSelectedScreenshot}
          setScreenshotDialogOpen={setScreenshotDialogOpen}
        />
      </div>

      <Dialog
        open={screenshotDialogOpen}
        onOpenChange={setScreenshotDialogOpen}
      >
        <DialogContent className="max-w-fit!">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={buildDataUrl(selectedScreenshot, PNG_MIME_TYPE)}
              alt="Capture d'écran du commentaire"
              className="max-w-fit max-h-fit"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Report;
