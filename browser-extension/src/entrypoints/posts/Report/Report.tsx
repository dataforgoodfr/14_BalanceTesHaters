import { Link } from "react-router";
import { MoveLeft, TriangleAlert } from "lucide-react";
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
              <MoveLeft /> Revenir à la vue d&apos;ensemble
            </Link>
          }
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
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
            <Button variant="outline" disabled>
              {DOWNLOAD_PDF_LABEL}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!canExportDocx}
            onClick={() => void exportDocx()}
          >
            Télécharger le DOCX
          </Button>
        </div>
      </div>
      <div className="flex justify-center items-end text-gray-500">
        <TriangleAlert className="me-2" />
        <span>
          Ce rapport ne pourra pas être enregistré sur votre navigateur. Pensez
          à télécharger le rapport en PDF ou en DOCX, ou exporter les données du
          rapport en CSV.
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span>
          Généré le :{" "}
          <span className="font-bold">
            {formatAnalysisDate(new Date().toISOString())}
          </span>
        </span>
        <span>
          Publications analysées :{" "}
          <span className="font-bold">
            {reportQueryData?.postIdList.length}
          </span>
        </span>
        <span>
          Plateforme :{" "}
          <span className="font-bold">
            {reportQueryData?.socialNetworkList
              .map((socialNetworkName) =>
                getSocialNetworkName(socialNetworkName as SocialNetworkName),
              )
              .join(", ")}
          </span>
        </span>
      </div>

      <ReportContent
        reportQueryData={reportQueryData}
        posts={posts}
        isLoadingPosts={isLoadingPosts}
        setSelectedScreenshot={setSelectedScreenshot}
        setScreenshotDialogOpen={setScreenshotDialogOpen}
      />

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
