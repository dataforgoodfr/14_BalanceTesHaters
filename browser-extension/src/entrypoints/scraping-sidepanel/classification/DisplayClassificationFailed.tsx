import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabInfoClassificationFailed } from "../useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { AlertCircleIcon, CircleAlertIcon } from "lucide-react";

export function DisplayClassificationFailed({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationFailed;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <CircleAlertIcon />
          Échec de la classification
        </SidePanelTitle>
      </SidePanelHeader>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Une erreur inattendue s&apos;est produite.</AlertTitle>
        <AlertDescription>
          Une erreur s&apos;est produite pendant l&apos;exécution du job de
          classification: {tabInfo.snapshot.classificationJobId}
        </AlertDescription>
      </Alert>

      <SidePanelActions>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
