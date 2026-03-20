import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabInfoClassificationInProgess } from "./useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import { AlertCircleIcon } from "lucide-react";

export function DisplayClassificationInProgress({
  tabInfo: _,
}: {
  tabInfo: TabInfoClassificationInProgess;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2>Analyse en cours (2/2) </h2>
        <Alert variant="default" className="max-w-md">
          <AlertCircleIcon />
          <AlertTitle>
            Tu peux fermer cet onglet: l&apos;analyse continue en arrière-plan.
          </AlertTitle>
          <AlertDescription>
            Suis son avancement dans &quot;Publications analysées&quot;. Tu
            recevras une notification dès que les résultats sont prêts.
          </AlertDescription>
        </Alert>

        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
