import { useEffect, useMemo } from "react";

import { usePDF } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { PdfReport } from "./PdfReport";
import { Post } from "@/shared/model/post/Post";
import { REPORT_PDF_FILE_NAME } from "@/shared/utils/report-data";
import { ReportQueryData } from "./BuildReport";

interface DownloadPdfButtonProps {
  reportQueryData: ReportQueryData;
  posts: Post[];
}

export const DownloadPdfButton = ({
  reportQueryData,
  posts,
}: DownloadPdfButtonProps) => {
  const pdfDocument = useMemo(
    () => <PdfReport reportQueryData={reportQueryData} posts={posts} />,
    [posts, reportQueryData],
  );
  const [instance, updateInstance] = usePDF();

  useEffect(() => {
    updateInstance(pdfDocument);
  }, [pdfDocument, updateInstance]);

  if (instance.loading || !instance.url || instance.error) {
    return (
      <Button disabled>
        {instance.loading ? "Génération..." : "Télécharger le PDF"}
      </Button>
    );
  }

  return (
    <Button
      render={
        <a
          href={instance.url}
          download={REPORT_PDF_FILE_NAME}
          target="_blank"
          rel="noreferrer"
        >
          Télécharger le PDF
        </a>
      }
    />
  );
};
