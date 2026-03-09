import { Spinner } from "@/components/ui/spinner";
import { TabInfoClassificationInProgess } from "../popup/useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";

export function DisplayClassificationInProgress({
  tabInfo: _,
}: {
  tabInfo: TabInfoClassificationInProgess;
}) {
  return (
    <>
      <h2>Analyse en cours (2/2) </h2>
      <p>L&apos;analyse continue en arrière plan</p>

      <Spinner className="size-16 m-auto" />

      <ViewPreviousAnalysesButton />
    </>
  );
}
